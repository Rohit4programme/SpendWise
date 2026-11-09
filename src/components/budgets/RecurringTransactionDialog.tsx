import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Plus, Calendar, Repeat2 } from 'lucide-react';
import { recurringTransactionService, type RecurringTransaction, type CreateRecurringTransactionDTO } from '@/services/recurringTransactionService';

interface RecurringTransactionDialogProps {
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
  onSuccess?: () => void;
  trigger?: ReactNode;
  recurring?: RecurringTransaction;
  isEdit?: boolean;
}

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}${['st', 'nd', 'rd'][i % 3] || 'th'}`,
}));

export function RecurringTransactionDialog({
  categories,
  onSuccess,
  trigger,
  recurring,
  isEdit = false,
}: RecurringTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState(recurring?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState(recurring?.categoryId || '');
  const [description, setDescription] = useState(recurring?.description || '');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(recurring?.type || 'EXPENSE');
  const [frequency, setFrequency] = useState(recurring?.frequency || 'MONTHLY');
  const [dayOfMonth, setDayOfMonth] = useState(recurring?.dayOfMonth?.toString() || '1');
  const [dayOfWeek, setDayOfWeek] = useState(recurring?.dayOfWeek?.toString() || '1');
  const [startDate, setStartDate] = useState(recurring?.startDate.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(recurring?.endDate?.split('T')[0] || '');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!amount || !categoryId || !frequency) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const data: CreateRecurringTransactionDTO = {
        amount: parseFloat(amount),
        categoryId,
        description,
        type,
        frequency: frequency as any,
        startDate,
        endDate: endDate || undefined,
        dayOfMonth: frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'YEARLY' ? parseInt(dayOfMonth) : undefined,
        dayOfWeek: frequency === 'WEEKLY' || frequency === 'BIWEEKLY' ? parseInt(dayOfWeek) : undefined,
      };

      if (isEdit && recurring) {
        await recurringTransactionService.updateRecurringTransaction(recurring.id, data);
        toast.success('Recurring transaction updated!');
      } else {
        await recurringTransactionService.createRecurringTransaction(data);
        toast.success('Recurring transaction created!');
      }

      setOpen(false);
      onSuccess?.();
      // Reset form
      if (!isEdit) {
        setAmount('');
        setCategoryId('');
        setDescription('');
        setType('EXPENSE');
        setFrequency('MONTHLY');
        setDayOfMonth('1');
        setDayOfWeek('1');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
      }
    } catch (error) {
      toast.error('Failed to save recurring transaction');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedFrequency = FREQUENCIES.find(f => f.value === frequency);
  const nextOccurrence = recurring ? recurringTransactionService.getNextOccurrenceDate(recurring) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Set Recurring
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat2 className="w-5 h-5 text-orange-500" />
            {isEdit ? 'Edit Recurring Transaction' : 'Set Up Recurring Transaction'}
          </DialogTitle>
          <DialogDescription>
            Automatically create {type.toLowerCase()} transactions based on a schedule
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount and Category Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Type Selector */}
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="flex gap-3">
              {['EXPENSE', 'INCOME'].map((t) => (
                <motion.button
                  key={t}
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setType(t as 'INCOME' | 'EXPENSE')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    type === t
                      ? t === 'EXPENSE'
                        ? 'bg-red-500 text-white'
                        : 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t === 'EXPENSE' ? '💸 Expense' : '💰 Income'}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Frequency Selector */}
          <div className="space-y-2">
            <Label>Frequency *</Label>
            <Select value={frequency} onValueChange={(v) => v && setFrequency(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day Selectors */}
          {(frequency === 'MONTHLY' || frequency === 'QUARTERLY' || frequency === 'YEARLY') && (
            <div className="space-y-2">
              <Label>Day of Month</Label>
              <Select value={dayOfMonth} onValueChange={(v) => v && setDayOfMonth(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_MONTH.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(frequency === 'WEEKLY' || frequency === 'BIWEEKLY') && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={dayOfWeek} onValueChange={(v) => v && setDayOfWeek(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="e.g., Monthly subscription, Rent payment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Summary Preview */}
          {selectedCategory && selectedFrequency && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-orange-600" />
                <p className="font-semibold text-orange-900 dark:text-orange-100">Schedule Preview</p>
              </div>
              <p className="text-sm text-orange-800 dark:text-orange-200">
                {type === 'EXPENSE' ? 'Spend' : 'Earn'} <span className="font-bold">${parseFloat(amount || '0').toFixed(2)}</span> for {selectedCategory.name} {selectedFrequency.label.toLowerCase()}
              </p>
              {nextOccurrence && (
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  Next: {nextOccurrence.toLocaleDateString()}
                </p>
              )}
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Recurring' : 'Create Recurring'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
