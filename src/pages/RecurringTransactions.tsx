import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  DollarSign,
  Edit2,
  Trash2,
  Play,
  Pause,
  MoreVertical,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { RecurringTransactionDialog } from '@/components/budgets/RecurringTransactionDialog';
import { recurringTransactionService, type RecurringTransaction } from '@/services/recurringTransactionService';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { apiUrl } from '@/lib/api';

export default function RecurringTransactions() {
  const { user } = useAuth();
  const { currency, symbol, format } = useCurrency();
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecurringTransactions();
    fetchCategories();
  }, []);

  const fetchRecurringTransactions = async () => {
    setLoading(true);
    try {
      const data = await recurringTransactionService.getRecurringTransactions();
      setRecurring(data);
    } catch (error) {
      toast.error('Failed to load recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(apiUrl('/api/categories'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring transaction?')) return;

    try {
      const success = await recurringTransactionService.deleteRecurringTransaction(id);
      if (success) {
        setRecurring(recurring.filter(r => r.id !== id));
        toast.success('Recurring transaction deleted');
      }
    } catch (error) {
      toast.error('Failed to delete recurring transaction');
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await recurringTransactionService.updateRecurringTransaction(id, {
        isActive: !isActive,
      } as any);
      setRecurring(recurring.map(r => r.id === id ? { ...r, isActive: !isActive } : r));
      toast.success(isActive ? 'Paused' : 'Resumed');
    } catch (error) {
      toast.error('Failed to update recurring transaction');
    }
  };

  const activeRecurring = recurring.filter(r => r.isActive);
  const pausedRecurring = recurring.filter(r => !r.isActive);

  const calculateMonthlyImpact = (list: RecurringTransaction[]) => {
    return list.reduce((acc, r) => {
      let multiplier = 1;
      switch (r.frequency) {
        case 'DAILY':
          multiplier = 30;
          break;
        case 'WEEKLY':
          multiplier = 4.33;
          break;
        case 'BIWEEKLY':
          multiplier = 2.17;
          break;
        case 'MONTHLY':
          multiplier = 1;
          break;
        case 'QUARTERLY':
          multiplier = 0.33;
          break;
        case 'YEARLY':
          multiplier = 0.083;
          break;
      }
      return acc + (r.amount * multiplier);
    }, 0);
  };

  const expenseImpact = calculateMonthlyImpact(activeRecurring.filter(r => r.type === 'EXPENSE'));
  const incomeImpact = calculateMonthlyImpact(activeRecurring.filter(r => r.type === 'INCOME'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin">⚙️</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="w-8 h-8 text-orange-500" />
            Recurring Transactions
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your scheduled income and expenses
          </p>
        </div>
        <RecurringTransactionDialog
          categories={categories}
          onSuccess={fetchRecurringTransactions}
          trigger={
            <Button className="gap-2 bg-orange-500 hover:bg-orange-600">
              <Calendar className="w-4 h-4" />
              New Recurring
            </Button>
          }
        />
      </div>

      {/* Impact Cards */}
      {(expenseImpact > 0 || incomeImpact > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expenseImpact > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm text-red-700 dark:text-red-300">Monthly Expense Impact</p>
                  <p className="text-2xl font-bold text-red-600">${expenseImpact.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          )}
          {incomeImpact > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300">Monthly Income Impact</p>
                  <p className="text-2xl font-bold text-green-600">+${incomeImpact.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Tabs */}
      {recurring.length > 0 ? (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="active">
              Active ({activeRecurring.length})
            </TabsTrigger>
            <TabsTrigger value="paused">
              Paused ({pausedRecurring.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Tab */}
          <TabsContent value="active" className="space-y-4">
            {activeRecurring.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-8 text-center text-gray-500">
                  No active recurring transactions
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeRecurring.map((rec, idx) => (
                  <div key={rec.id}>
                    <RecurringTransactionCard
                      recurring={rec}
                      index={idx}
                      categories={categories}
                      onEdit={() => setEditingId(rec.id)}
                      onDelete={() => handleDelete(rec.id)}
                      onToggle={() => handleToggleActive(rec.id, rec.isActive)}
                      onSuccess={fetchRecurringTransactions}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Paused Tab */}
          <TabsContent value="paused" className="space-y-4">
            {pausedRecurring.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-8 text-center text-gray-500">
                  No paused recurring transactions
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pausedRecurring.map((rec, idx) => (
                  <div key={rec.id}>
                    <RecurringTransactionCard
                      recurring={rec}
                      index={idx}
                      categories={categories}
                      onEdit={() => setEditingId(rec.id)}
                      onDelete={() => handleDelete(rec.id)}
                      onToggle={() => handleToggleActive(rec.id, rec.isActive)}
                      onSuccess={fetchRecurringTransactions}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Recurring Transactions</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Set up recurring transactions for bills, subscriptions, and regular income
            </p>
            <RecurringTransactionDialog
              categories={categories}
              onSuccess={fetchRecurringTransactions}
              trigger={
                <Button className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Create First Recurring
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}

interface RecurringTransactionCardProps {
  recurring: RecurringTransaction;
  index: number;
  categories: any[];
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onSuccess: () => void;
}

function RecurringTransactionCard({
  recurring,
  index,
  categories,
  onEdit,
  onDelete,
  onToggle,
  onSuccess,
}: RecurringTransactionCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const category = categories.find(c => c.id === recurring.categoryId);
  const isOverdue = recurringTransactionService.isOverdue(recurring);
  const daysUntil = recurringTransactionService.daysUntilNext(recurring);
  const frequency = recurringTransactionService.getFrequencyLabel(recurring.frequency);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <Card className={recurring.isActive ? '' : 'opacity-60'}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              {/* Left: Icon, Category, Amount */}
              <div className="flex-1 flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800">
                  {category?.icon || '📁'}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{category?.name || 'Unknown'}</h3>
                    {!recurring.isActive && (
                      <Badge variant="outline" className="bg-gray-200 dark:bg-gray-700">
                        Paused
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {recurring.description || 'No description'}
                  </p>

                  {/* Amount and Frequency */}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <span className={`font-bold ${
                        recurring.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {recurring.type === 'EXPENSE' ? '-' : '+'}${recurring.amount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      {frequency}
                    </div>
                  </div>

                  {/* Next Occurrence */}
                  {recurring.isActive && (
                    <div className="mt-2 flex items-center gap-1">
                      {isOverdue ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-600 font-medium">Overdue for generation</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            In {daysUntil} day{daysUntil !== 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onToggle}
                  title={recurring.isActive ? 'Pause' : 'Resume'}
                >
                  {recurring.isActive ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Edit Dialog */}
      {showEditDialog && (
        <RecurringTransactionDialog
          categories={categories}
          recurring={recurring}
          isEdit={true}
          onSuccess={() => {
            setShowEditDialog(false);
            onSuccess();
          }}
          trigger={<div />}
        />
      )}
    </>
  );
}
