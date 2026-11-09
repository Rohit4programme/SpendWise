import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Sparkles, ShoppingBag, Utensils, Car, Home, Smartphone, Heart, Gamepad, Gift, Briefcase, Coffee, Zap, Music, Camera, Book, Globe, Star, Settings2 } from 'lucide-react';
import { aiService } from '../../services/aiService';
import CategoryManagerDialog from '../budgets/CategoryManagerDialog';

const ICON_MAP: Record<string, any> = {
  ShoppingBag, Utensils, Car, Home, Smartphone, Heart, Gamepad, Gift, Briefcase, Coffee, Zap, Music, Camera, Book, Globe, Star
};

interface AddTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction?: any;
  defaultType?: 'EXPENSE' | 'INCOME';
}

export default function AddTransactionDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  transaction,
  defaultType = 'EXPENSE'
}: AddTransactionDialogProps) {
  const { token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    categoryId: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: defaultType,
  });
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  useEffect(() => {
    if (transaction) {
      setFormData({
        amount: transaction.amount.toString(),
        categoryId: transaction.categoryId,
        description: transaction.description || '',
        date: new Date(transaction.date).toISOString().split('T')[0],
        type: transaction.type,
      });
    } else {
      setFormData({
        amount: '',
        categoryId: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        type: defaultType,
      });
    }
  }, [transaction, isOpen, defaultType]);

  const handleAICategorize = async () => {
    if (!formData.description) {
      return toast.error('Please enter a description first');
    }
    setIsCategorizing(true);
    try {
      const categoryId = await aiService.categorizeExpense(formData.description, categories);
      if (categoryId) {
        setFormData(prev => ({ ...prev, categoryId }));
        toast.success('AI categorized this expense!');
      } else {
        toast.error('AI could not determine a category');
      }
    } catch (error) {
      toast.error('AI categorization failed');
    } finally {
      setIsCategorizing(false);
    }
  };

  useEffect(() => {
    if (isOpen && token) {
      console.log('Dialog opened with token, fetching categories...');
      fetchCategories();
    } else if (isOpen && !token) {
      console.log('Dialog opened but no token yet, waiting...');
    }
  }, [isOpen, formData.type, token]);

  const fetchCategories = async () => {
    if (!token) {
      console.log('No token available, cannot fetch categories');
      return;
    }
    try {
      console.log('Fetching categories for type:', formData.type);
      const res = await fetch(`/api/categories?type=${formData.type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Categories response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Categories fetched:', data.length);
        setCategories(data);
        // Only auto-select first category if we don't have one selected or if we're not editing
        if (data.length > 0 && (!formData.categoryId || !data.find((c: any) => c.id === formData.categoryId))) {
          setFormData((prev) => ({ ...prev, categoryId: data[0].id }));
        }
      } else {
        const error = await res.json();
        console.error('Failed to fetch categories:', error);
        toast.error('Failed to load categories');
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
      toast.error('Failed to load categories');
    }
  };

  const handleCategoryManagerSuccess = () => {
    fetchCategories();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = transaction ? `/api/transactions/${transaction.id}` : '/api/transactions';
      const method = transaction ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(transaction ? 'Transaction updated' : 'Transaction added successfully');
        onSuccess();
        onClose();
        if (!transaction) {
          setFormData({
            amount: '',
            categoryId: categories[0]?.id || '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            type: 'EXPENSE',
          });
        }
      } else {
        toast.error(transaction ? 'Failed to update transaction' : 'Failed to add transaction');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => v && setFormData({ ...formData, type: v as 'EXPENSE' | 'INCOME' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="INCOME">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Category</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCategoryManagerOpen(true)}
                className="h-6 gap-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                <Settings2 className="w-3 h-3" />
                Manage
              </Button>
            </div>
            <Select
              value={formData.categoryId}
              onValueChange={(v) => v && setFormData({ ...formData, categoryId: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select category">
                  {formData.categoryId && categories.length > 0 && (() => {
                    const cat = categories.find(c => c.id === formData.categoryId);
                    const IconComp = ICON_MAP[cat?.icon] || Star;
                    return (
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full flex items-center justify-center text-white" 
                          style={{ backgroundColor: cat?.color || '#ccc' }} 
                        >
                          <IconComp className="w-2.5 h-2.5" />
                        </div>
                        {cat?.name}
                      </div>
                    );
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.length > 0 ? (
                  categories.map((cat) => {
                    const IconComp = ICON_MAP[cat.icon] || Star;
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white" 
                            style={{ backgroundColor: cat.color }}
                          >
                            <IconComp className="w-2.5 h-2.5" />
                          </div>
                          {cat.name}
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <div className="p-2 text-sm text-neutral-500 text-center">
                    No categories found
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setIsCategoryManagerOpen(true)}
                      className="text-amber-600 mt-1"
                    >
                      Create one
                    </Button>
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <div className="flex gap-2">
              <Input
                placeholder="What was this for? (e.g. Starbucks)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAICategorize}
                disabled={isCategorizing || !formData.description}
                className="shrink-0 border-amber-200 text-amber-600 hover:bg-amber-50"
                title="AI Categorize"
              >
                <Sparkles className={`w-4 h-4 ${isCategorizing ? 'animate-pulse' : ''}`} />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}>
              {loading ? (transaction ? 'Updating...' : 'Adding...') : (transaction ? 'Update Transaction' : 'Add Transaction')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <CategoryManagerDialog
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onRefresh={handleCategoryManagerSuccess}
      />
    </Dialog>
  );
}
