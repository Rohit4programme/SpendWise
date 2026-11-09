import { apiUrl } from '@/lib/api';

export interface RecurringTransaction {
  id: string;
  userId: string;
  amount: number;
  categoryId: string;
  category_name?: string;
  color?: string;
  icon?: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  lastGenerated?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringTransactionDTO {
  amount: number;
  categoryId: string;
  description?: string;
  type: 'INCOME' | 'EXPENSE';
  frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate?: string;
  endDate?: string;
}

export const recurringTransactionService = {
  // Get all recurring transactions
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    try {
      const response = await fetch(apiUrl('/api/recurring-transactions'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recurring transactions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      return [];
    }
  },

  // Create a new recurring transaction
  async createRecurringTransaction(data: CreateRecurringTransactionDTO): Promise<{ id: string; message: string } | null> {
    try {
      const response = await fetch(apiUrl('/api/recurring-transactions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create recurring transaction');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      return null;
    }
  },

  // Update a recurring transaction
  async updateRecurringTransaction(id: string, data: Partial<CreateRecurringTransactionDTO>): Promise<{ message: string } | null> {
    try {
      const response = await fetch(apiUrl(`/api/recurring-transactions/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update recurring transaction');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      return null;
    }
  },

  // Delete a recurring transaction
  async deleteRecurringTransaction(id: string): Promise<boolean> {
    try {
      const response = await fetch(apiUrl(`/api/recurring-transactions/${id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete recurring transaction');
      }

      return true;
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      return false;
    }
  },

  // Generate transactions from recurring patterns
  async generateRecurringTransactions(): Promise<{ generated: number } | null> {
    try {
      const response = await fetch(apiUrl('/api/recurring-transactions/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate transactions');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating recurring transactions:', error);
      return null;
    }
  },

  // Helper: Get frequency label
  getFrequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      DAILY: 'Daily',
      WEEKLY: 'Weekly',
      BIWEEKLY: 'Bi-weekly',
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      YEARLY: 'Yearly',
    };
    return labels[frequency] || frequency;
  },

  // Helper: Get next occurrence date
  getNextOccurrenceDate(recurring: RecurringTransaction): Date {
    const baseDate = recurring.lastGenerated ? new Date(recurring.lastGenerated) : new Date(recurring.startDate);
    const nextDate = new Date(baseDate);

    switch (recurring.frequency) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'BIWEEKLY':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'MONTHLY':
        nextDate.setMonth(nextDate.getMonth() + 1);
        if (recurring.dayOfMonth) {
          nextDate.setDate(recurring.dayOfMonth);
        }
        break;
      case 'QUARTERLY':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case 'YEARLY':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  },

  // Helper: Check if recurring transaction is overdue
  isOverdue(recurring: RecurringTransaction): boolean {
    if (!recurring.isActive) return false;
    const nextDate = this.getNextOccurrenceDate(recurring);
    return nextDate <= new Date();
  },

  // Helper: Days until next occurrence
  daysUntilNext(recurring: RecurringTransaction): number {
    if (!recurring.isActive) return -1;
    const nextDate = this.getNextOccurrenceDate(recurring);
    const today = new Date();
    const diff = nextDate.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },
};
