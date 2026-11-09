import { Express } from 'express';
import { prisma } from '../../lib/prisma';

interface RouteOptions {
  authenticate: (req: any, res: any, next: any) => void;
}

export function registerNotificationRoutes(app: Express, options: RouteOptions) {
  const { authenticate } = options;

  // Get notifications for user
  app.get('/api/notifications', authenticate, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit || '20');
      const page = parseInt(req.query.page || '0');
      const skip = page * limit;

      // Fetch real notifications based on user activity
      const notifications = await generateUserNotifications(userId, skip, limit);

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  app.patch('/api/notifications/:id/read', authenticate, async (req: any, res) => {
    try {
      // In a real app, you'd store this in the database
      // For now, we'll just return success
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // Mark all notifications as read
  app.patch('/api/notifications/read-all', authenticate, async (req: any, res) => {
    try {
      // In a real app, you'd update all user notifications in the database
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  });

  // Delete notification
  app.delete('/api/notifications/:id', authenticate, async (req: any, res) => {
    try {
      // In a real app, you'd delete from the database
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  });
}

// Generate notifications based on real user activity
async function generateUserNotifications(userId: string, skip: number, limit: number) {
  try {
    const notifications = [];

    // Recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { date: 'desc' },
      take: 5,
    });

    for (const transaction of recentTransactions) {
      if (transaction.type === 'EXPENSE') {
        notifications.push({
          id: `txn-${transaction.id}`,
          title: 'Transaction Recorded',
          message: `Your ${transaction.category.name} purchase of $${transaction.amount?.toFixed(2) || 'N/A'} has been recorded`,
          type: 'success',
          timestamp: transaction.date,
          read: false,
        });
      } else if (transaction.type === 'INCOME') {
        notifications.push({
          id: `income-${transaction.id}`,
          title: 'Income Deposited',
          message: `${transaction.category.name} income of $${transaction.amount?.toFixed(2) || 'N/A'} has been deposited`,
          type: 'success',
          timestamp: transaction.date,
          read: false,
        });
      }
    }

    // Budget alerts - check if user exceeded budget in any category
    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        transactions: {
          where: {
            type: 'EXPENSE',
            date: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
            },
          },
        },
      },
    });

    for (const category of categories) {
      const categoryBudget = await prisma.budget.findFirst({
        where: { userId, categoryId: category.id },
      });

      if (categoryBudget) {
        const totalSpent = category.transactions.reduce((sum, txn) => sum + (txn.amount || 0), 0);
        const percentage = (totalSpent / categoryBudget.amount) * 100;

        if (percentage >= 80) {
          notifications.push({
            id: `budget-${category.id}`,
            title: 'Budget Alert',
            message: `You've reached ${Math.round(percentage)}% of your ${category.name} budget ($${categoryBudget.amount.toFixed(2)})`,
            type: percentage > 100 ? 'error' : 'warning',
            timestamp: new Date(),
            read: false,
          });
        }
      }
    }

    // Recurring transactions due soon
    const recurringTransactions = await prisma.recurringTransaction.findMany({
      where: { userId },
      include: { category: true },
    });

    for (const recurring of recurringTransactions) {
      if (recurring.isActive) {
        const nextDueDate = calculateNextDueDate(recurring);
        const daysUntilDue = Math.ceil(
          (nextDueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilDue <= 2 && daysUntilDue >= 0) {
          notifications.push({
            id: `recurring-${recurring.id}`,
            title: 'Recurring Payment Due',
            message: `Your ${recurring.name} is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
            type: 'info',
            timestamp: new Date(),
            read: false,
          });
        }
      }
    }

    // Sort by timestamp (newest first) and paginate
    return notifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(skip, skip + limit);
  } catch (error) {
    console.error('Error generating notifications:', error);
    return [];
  }
}

// Calculate next due date for recurring transaction
function calculateNextDueDate(recurring: any): Date {
  const today = new Date();
  let nextDue = new Date(recurring.startDate);

  switch (recurring.frequency) {
    case 'DAILY':
      while (nextDue < today) {
        nextDue.setDate(nextDue.getDate() + 1);
      }
      break;
    case 'WEEKLY':
      while (nextDue < today) {
        nextDue.setDate(nextDue.getDate() + 7);
      }
      break;
    case 'MONTHLY':
      while (nextDue < today) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }
      break;
    case 'YEARLY':
      while (nextDue < today) {
        nextDue.setFullYear(nextDue.getFullYear() + 1);
      }
      break;
  }

  return nextDue;
}
