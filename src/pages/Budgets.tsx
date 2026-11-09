import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress, ProgressIndicator, ProgressTrack } from '../components/ui/progress';
import { Plus, Target, AlertCircle, Settings2, ShoppingBag, Utensils, Car, Home, Smartphone, Heart, Gamepad, Gift, Briefcase, Coffee, Zap, Music, Camera, Book, Globe, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { useCurrency } from '../hooks/useCurrency';
import CategoryDialog from '../components/budgets/CategoryDialog';
import CategoryManagerDialog from '../components/budgets/CategoryManagerDialog';

const ICON_MAP: Record<string, any> = {
  ShoppingBag, Utensils, Car, Home, Smartphone, Heart, Gamepad, Gift, Briefcase, Coffee, Zap, Music, Camera, Book, Globe, Star
};

export default function Budgets() {
  const { token } = useAuth();
  const { format } = useCurrency();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    categoryId: '',
    limit: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    rollover: false,
  });

  const fetchData = async () => {
    if (!token) return;
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        fetch(`/api/budgets?month=${currentMonth}&year=${currentYear}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (budgetsRes.ok && categoriesRes.ok) {
        const budgetsData = await budgetsRes.json();
        const categoriesData = await categoriesRes.json();
        setBudgets(budgetsData);
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: categoriesData[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, currentMonth, currentYear]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          month: currentMonth,
          year: currentYear
        }),
      });

      if (res.ok) {
        toast.success('Budget set successfully');
        fetchData();
        setIsAddDialogOpen(false);
      } else {
        toast.error('Failed to set budget');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Budgets</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Set limits for your spending categories.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-1">
            <Select 
              value={currentMonth.toString()} 
              onValueChange={(v) => v && setCurrentMonth(parseInt(v))}
            >
              <SelectTrigger className="w-[120px] border-0 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={currentYear.toString()} 
              onValueChange={(v) => v && setCurrentYear(parseInt(v))}
            >
              <SelectTrigger className="w-[100px] border-0 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsCategoryManagerOpen(true)} 
            className="gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Manage Categories
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Set New Budget
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Budgets for {new Date(0, currentMonth - 1).toLocaleString('default', { month: 'long' })} {currentYear}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-neutral-400">Loading budgets...</div>
          ) : budgets.length > 0 ? (
            budgets.map((budget) => {
              const totalLimit = budget.limit + (budget.rolloverAmount || 0);
              const percentage = Math.min((budget.spent / totalLimit) * 100, 100);
              const isOver = budget.spent > totalLimit;
              const IconComp = ICON_MAP[budget.category?.icon] || Target;

              return (
                <Card key={budget.id} className="border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: budget.category?.color || '#ccc' }}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <CardTitle className="text-base font-bold text-neutral-900 dark:text-neutral-100">{budget.category?.name || 'Unknown'}</CardTitle>
                    </div>
                    {budget.rollover && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-100">
                        Rollover Active
                      </Badge>
                    )}
                  </CardHeader>
                <CardContent className="space-y-4 pb-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{format(budget.spent)}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Spent of {format(totalLimit)}
                        {budget.rolloverAmount > 0 && (
                          <span className="text-emerald-600 ml-1">
                            (+{format(budget.rolloverAmount)} rollover)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${
                        percentage >= 100 ? 'text-red-500' : 
                        percentage >= 80 ? 'text-amber-500' : 
                        'text-emerald-600'
                      }`}>
                        {Math.round(percentage)}%
                      </div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                        {percentage >= 100 ? 'Exceeded' : percentage >= 80 ? 'Nearing Limit' : 'On Track'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Progress value={percentage} className="h-2">
                      <ProgressTrack className="bg-neutral-100 dark:bg-neutral-800">
                        <ProgressIndicator 
                          className={
                            percentage >= 100 ? 'bg-red-500' : 
                            percentage >= 80 ? 'bg-amber-500' : 
                            'bg-emerald-500'
                          } 
                        />
                      </ProgressTrack>
                    </Progress>
                    {isOver && (
                      <div className="flex items-center gap-1 text-xs text-red-500 font-medium mt-1">
                        <AlertCircle className="w-3 h-3" />
                        Budget exceeded by {format(budget.spent - totalLimit)}
                      </div>
                    )}
                    {!isOver && (
                      <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium">
                        {format(totalLimit - budget.spent)} remaining
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 bg-white dark:bg-neutral-900 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-400">
            No budgets set yet. Start by setting a limit for a category.
          </div>
        )}
      </div>
    </div>

      <CategoryManagerDialog
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onRefresh={fetchData}
      />

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Set Budget</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
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
                  {categories.map((cat) => {
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
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monthly Limit</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.limit}
                onChange={(e) => setFormData({ ...formData, limit: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-800">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Rollover Budget</Label>
                <p className="text-[10px] text-neutral-500">Add remaining amount from last month to this month's limit.</p>
              </div>
              <Switch
                checked={formData.rollover}
                onCheckedChange={(checked) => setFormData({ ...formData, rollover: checked })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white">
                Set Budget
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
