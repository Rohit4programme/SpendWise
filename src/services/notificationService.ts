import { apiUrl } from '../lib/api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: Date;
  read: boolean;
  icon?: string;
  actionUrl?: string;
}

interface NotificationSubscriber {
  onNotificationReceived: (notification: Notification) => void;
  onNotificationsUpdated: (notifications: Notification[]) => void;
}

class NotificationService {
  private subscribers: NotificationSubscriber[] = [];
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastFetchTime: Date = new Date();

  subscribe(subscriber: NotificationSubscriber) {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== subscriber);
    };
  }

  private notifySubscribers(notifications: Notification[]) {
    this.subscribers.forEach((sub) => sub.onNotificationsUpdated(notifications));
  }

  private notifyNewNotification(notification: Notification) {
    this.subscribers.forEach((sub) => sub.onNotificationReceived(notification));
  }

  // Fetch notifications from backend
  async fetchNotifications(token: string | null): Promise<Notification[]> {
    if (!token) return [];

    try {
      const response = await fetch(apiUrl('/api/notifications'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.map((notif: any) => ({
          ...notif,
          timestamp: new Date(notif.timestamp),
        }));
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }

    return [];
  }

  // Mark notification as read
  async markAsRead(notificationId: string, token: string | null): Promise<boolean> {
    if (!token) return false;

    try {
      const response = await fetch(apiUrl(`/api/notifications/${notificationId}/read`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(token: string | null): Promise<boolean> {
    if (!token) return false;

    try {
      const response = await fetch(apiUrl('/api/notifications/read-all'), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string, token: string | null): Promise<boolean> {
    if (!token) return false;

    try {
      const response = await fetch(apiUrl(`/api/notifications/${notificationId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete notification:', error);
      return false;
    }
  }

  // Start polling for new notifications
  startPolling(token: string | null, interval: number = 15000) {
    if (!token || this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      const notifications = await this.fetchNotifications(token);
      this.notifySubscribers(notifications);
    }, interval);
  }

  // Stop polling
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // Create a real-time notification (for internal app events)
  createNotification(
    title: string,
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      timestamp: new Date(),
      read: false,
    };

    this.notifyNewNotification(notification);
  }

  // Handle transaction notification
  notifyTransactionAdded(amount: number, category: string) {
    this.createNotification(
      'Transaction Recorded',
      `Your ${category} purchase of $${amount.toFixed(2)} has been recorded`,
      'success'
    );
  }

  // Handle income notification
  notifyIncomeAdded(amount: number, source: string) {
    this.createNotification(
      'Income Deposited',
      `${source} income of $${amount.toFixed(2)} has been deposited`,
      'success'
    );
  }

  // Handle budget alert
  notifyBudgetAlert(category: string, percentage: number) {
    this.createNotification(
      'Budget Alert',
      `You've reached ${percentage}% of your ${category} budget`,
      percentage > 100 ? 'error' : 'warning'
    );
  }

  // Handle recurring transaction notification
  notifyRecurringDue(name: string, daysUntilDue: number) {
    this.createNotification(
      'Recurring Payment Due',
      `Your ${name} subscription is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
      'info'
    );
  }
}

export const notificationService = new NotificationService();
