import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Sparkles, Lightbulb, ShoppingBag, Utensils, Car, Home, Smartphone, Heart, Gamepad, Gift, Briefcase, Coffee, Zap, Music, Camera, Book, Globe, Star, Users, Calendar, Clock, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { motion } from 'motion/react';
import AddTransactionDialog from '../components/transactions/AddTransactionDialog';
import { RecurringTransactionDialog } from '../components/budgets/RecurringTransactionDialog';
import { ExportDialog } from '../components/budgets/ExportDialog';
import AIAssistant from '../components/ai/AIAssistant';
import { aiService } from '../services/aiService';
import { recurringTransactionService, type RecurringTransaction } from '../services/recurringTransactionService';
import { useCurrency } from '../hooks/useCurrency';
import { cn } from '../lib/utils';

const ICON_MAP: Record<string, any> = {
  ShoppingBag, Utensils, Car, Home, Smartphone, Heart, Gamepad, Gift, Briefcase, Coffee, Zap, Music, Camera, Book, Globe, Star
};

export default function Dashboard() {
  const { token } = useAuth();
  const { format } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchBudgets = async () => {
    try {
      const res = await fetch('/api/budgets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBudgets(data);
      }
    } catch (error) {
      console.error('Failed to fetch budgets', error);
    }
  };

  const fetchInsights = async (currentTransactions: any[], currentBudgets: any[]) => {
    if (!token) return;
    setLoadingInsights(true);
    try {
      const data = await aiService.getSpendingInsights(currentTransactions, currentBudgets);
      setInsights(data || []);
    } catch (error) {
      console.error('Failed to fetch insights', error);
      setInsights([]);
    } finally {
      setLoadingInsights(false);
    }
  };

  const fetchAllData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [tRes, bRes, cRes, dRes] = await Promise.all([
        fetch('/api/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/budgets', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/debts', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      if (tRes.ok && bRes.ok && cRes.ok && dRes.ok) {
        const tData = await tRes.json();
        const bData = await bRes.json();
        const cData = await cRes.json();
        const dData = await dRes.json();
        setTransactions(tData);
        setBudgets(bData);
        setCategories(cData);
        setDebts(dData);
        fetchInsights(tData, bData);

        // Fetch recurring transactions separately
        const rData = await recurringTransactionService.getRecurringTransactions();
        setRecurring(rData);
      } else {
        console.error('One or more requests failed', {
          transactions: tRes.status,
          budgets: bRes.status,
          categories: cRes.status,
          debts: dRes.status
        });
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + t.amount, 0);

  const monthlyIncome = transactions
    .filter((t) => t.type === 'INCOME' && new Date(t.date).getMonth() === new Date().getMonth() && new Date(t.date).getFullYear() === new Date().getFullYear())
    .reduce((acc, t) => acc + t.amount, 0);

  const monthlyExpenses = transactions
    .filter((t) => t.type === 'EXPENSE' && new Date(t.date).getMonth() === new Date().getMonth() && new Date(t.date).getFullYear() === new Date().getFullYear())
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  // Calculate debt totals
  const lentDebts = debts.filter(d => d.type === 'LENT');
  const borrowedDebts = debts.filter(d => d.type === 'BORROWED');
  
  const totalLent = lentDebts.filter(d => d.status === 'PENDING').reduce((acc, d) => acc + d.amount, 0);
  const totalBorrowed = borrowedDebts.filter(d => d.status === 'PENDING').reduce((acc, d) => acc + d.amount, 0);

  // Prepare chart data for all categories
  const allCategorySpending = categories.map(cat => {
    const spent = transactions
      .filter(t => t.type === 'EXPENSE' && t.categoryId === cat.id)
      .reduce((acc, t) => acc + t.amount, 0);
    
    const budget = budgets.find(b => b.categoryId === cat.id);
    const limit = budget?.limit || 0;
    
    return {
      id: cat.id,
      name: cat.name,
      spent,
      limit,
      color: cat.color,
      icon: cat.icon,
      percent: limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
    };
  }).sort((a, b) => b.spent - a.spent);

  const categoryDataForChart = allCategorySpending.filter(c => c.spent > 0);

  const recentTransactions = transactions.slice(0, 5);

  // Get budget alerts (budgets over 70% or exceeded)
  const budgetAlerts = allCategorySpending
    .filter(cat => cat.limit > 0 && (cat.spent / cat.limit) * 100 >= 70)
    .sort((a, b) => (b.spent / b.limit) - (a.spent / a.limit));

  // Monthly trend data
  const monthlyData = (() => {
    const monthlyMap = new Map<string, any>();

    // Process transactions
    transactions.forEach(t => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = date.toLocaleString('default', { month: 'short' });
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month,
          income: 0,
          expense: 0,
          lent: 0,
          borrowed: 0,
          sortKey: date.getFullYear() * 100 + date.getMonth()
        });
      }
      
      const item = monthlyMap.get(key);
      if (t.type === 'INCOME') item.income += t.amount;
      else item.expense += t.amount;
    });

    // Process debts (lent and borrowed)
    debts.forEach(d => {
      const date = new Date(d.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = date.toLocaleString('default', { month: 'short' });
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month,
          income: 0,
          expense: 0,
          lent: 0,
          borrowed: 0,
          sortKey: date.getFullYear() * 100 + date.getMonth()
        });
      }
      
      const item = monthlyMap.get(key);
      if (d.type === 'LENT') item.lent += d.amount;
      else item.borrowed += d.amount;
    });

    // Convert to array and sort by date
    return Array.from(monthlyMap.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-12); // Show last 12 months
  })();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Dashboard</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Welcome back! Here's what's happening with your money.</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportDialog />
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Budget Alerts */}
      {budgetAlerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 shadow-sm overflow-hidden">
            <div className="h-1 bg-red-500" />
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-red-900 dark:text-red-100">
                <ArrowUpRight className="w-5 h-5 text-red-500" />
                Budget Alerts
              </CardTitle>
              <span className="text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-full">
                {budgetAlerts.filter(a => a.spent > a.limit).length} over limit
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {budgetAlerts.map((alert) => {
                const IconComp = ICON_MAP[alert.icon] || Star;
                const isOver = alert.spent > alert.limit;
                const remaining = Math.abs(alert.limit - alert.spent);
                const percentUsed = (alert.spent / alert.limit) * 100;
                
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-lg border-l-4 ${
                      isOver 
                        ? 'bg-red-50 dark:bg-red-900/20 border-l-red-500' 
                        : 'bg-amber-50 dark:bg-amber-900/20 border-l-amber-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" 
                          style={{ backgroundColor: alert.color }}
                        >
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-neutral-900 dark:text-neutral-100">{alert.name}</p>
                          <p className={`text-xs font-semibold ${isOver ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {isOver ? `💰 Over by ${format(remaining)}` : `⚠️ Only ${format(remaining)} left`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{percentUsed.toFixed(0)}%</p>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400">{format(alert.spent)} spent</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="h-1 bg-amber-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Balance</CardTitle>
              <Wallet className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{format(balance)}</div>
              <p className="text-xs text-neutral-400 mt-1">Current available funds</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="h-1 bg-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Monthly Income</CardTitle>
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{format(monthlyIncome)}</div>
              <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {format(totalIncome)} lifetime
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="h-1 bg-red-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Monthly Expenses</CardTitle>
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{format(monthlyExpenses)}</div>
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {format(totalExpenses)} lifetime
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10 shadow-sm overflow-hidden">
            <div className="h-1 bg-emerald-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Money You Lent</CardTitle>
              <Users className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              {totalLent > 0 ? (
                <>
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{format(totalLent)}</div>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Pending repayments from {lentDebts.length} {lentDebts.length === 1 ? 'person' : 'people'}</p>
                </>
              ) : (
                <p className="text-sm text-emerald-600/70 dark:text-emerald-400/70">No active lending records</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10 shadow-sm overflow-hidden">
            <div className="h-1 bg-amber-500" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Money You Borrowed</CardTitle>
              <Users className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {totalBorrowed > 0 ? (
                <>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{format(totalBorrowed)}</div>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">Pending repayments to {borrowedDebts.length} {borrowedDebts.length === 1 ? 'person' : 'people'}</p>
                </>
              ) : (
                <p className="text-sm text-amber-600/70 dark:text-amber-400/70">No active borrowing records</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Spending Trend</CardTitle>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-neutral-500 dark:text-neutral-400">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-neutral-500 dark:text-neutral-400">Expenses</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-neutral-500 dark:text-neutral-400">Lent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-neutral-500 dark:text-neutral-400">Borrowed</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[300px]">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" className="dark:stroke-neutral-800" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                      cursor={{ fill: 'var(--muted)' }}
                      formatter={(value: any, name: any) => {
                        const labels: Record<string, string> = {
                          income: 'Income',
                          expense: 'Expenses',
                          lent: 'Money Lent',
                          borrowed: 'Money Borrowed'
                        };
                        return [format(Number(value)), labels[name] || name];
                      }}
                    />
                    <Bar name="Income" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar name="Expense" dataKey="expense" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar name="Lent" dataKey="lent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar name="Borrowed" dataKey="borrowed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-400">
                  No trend data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Category Spending Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allCategorySpending.length > 0 ? (
                  allCategorySpending.map((cat: any) => {
                    const IconComp = ICON_MAP[cat.icon] || Star;
                    
                    return (
                      <div key={cat.id} className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white" 
                              style={{ backgroundColor: cat.color }}
                            >
                              <IconComp className="w-4 h-4" />
                            </div>
                            <span className="font-medium text-neutral-900 dark:text-neutral-100">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-neutral-900 dark:text-neutral-100">{format(cat.spent)}</div>
                            {cat.limit > 0 && (
                              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                of {format(cat.limit)} budget
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {cat.limit > 0 ? (
                          <div className="space-y-1.5">
                            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${cat.percent}%` }}
                                className={`h-full rounded-full ${
                                  cat.percent > 90 ? 'bg-red-500' : cat.percent > 70 ? 'bg-amber-500' : 'bg-amber-500'
                                }`}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-medium">
                              <span className={cat.percent > 100 ? 'text-red-500' : 'text-neutral-500 dark:text-neutral-400'}>
                                {cat.percent.toFixed(1)}% utilized
                              </span>
                              {cat.limit - cat.spent > 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400">{format(cat.limit - cat.spent)} left</span>
                              ) : cat.limit > 0 ? (
                                <span className="text-red-500">{format(cat.spent - cat.limit)} over</span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-neutral-400 italic">No budget set for this category</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-8 text-neutral-400">No expense categories found</div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px]">
                {categoryDataForChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDataForChart}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="spent"
                      >
                        {categoryDataForChart.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
                        formatter={(value: any) => format(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-neutral-400">
                    No expense data yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: t.category?.color || '#ccc' }}
                          >
                            {(() => {
                              const IconComp = ICON_MAP[t.category?.icon] || Star;
                              return <IconComp className="w-5 h-5" />;
                            })()}
                          </div>
                          <div>
                            <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[100px]">{t.description || t.category?.name || 'Unknown'}</div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">{new Date(t.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className={cn("font-bold", t.type === 'INCOME' ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-900 dark:text-neutral-100")}>
                          {t.type === 'INCOME' ? '+' : '-'}{format(t.amount)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-neutral-400">No transactions yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-8">
          <Card className="border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingInsights ? (
                <div className="space-y-3">
                  <div className="h-20 bg-amber-100/50 dark:bg-amber-900/20 animate-pulse rounded-lg" />
                  <div className="h-20 bg-amber-100/50 dark:bg-amber-900/20 animate-pulse rounded-lg" />
                </div>
              ) : insights.length > 0 ? (
                insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 bg-amber-100 dark:bg-amber-900/30 p-1.5 rounded-lg shrink-0">
                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 leading-tight">{insight.insight}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Tip: {insight.action}</p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-400 text-sm">
                  Add more transactions to get AI-powered financial insights.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Borrow & Lend Reminders */}
          <Card className="border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-red-900 dark:text-red-100">
                <Bell className="w-5 h-5 text-red-500" />
                Borrow & Lend Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {debts.length > 0 ? (
                (() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  const reminders = debts
                    .filter(d => d.status !== 'PAID')
                    .map(d => ({
                      ...d,
                      dueDate: d.dueDate ? new Date(d.dueDate) : null,
                      isOverdue: d.dueDate ? new Date(d.dueDate) < today : false,
                      daysUntilDue: d.dueDate ? Math.ceil((new Date(d.dueDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null,
                    }))
                    .filter(d => d.isOverdue || (d.daysUntilDue !== null && d.daysUntilDue <= 7))
                    .sort((a, b) => {
                      if (a.isOverdue && !b.isOverdue) return -1;
                      if (!a.isOverdue && b.isOverdue) return 1;
                      if (a.daysUntilDue === null || b.daysUntilDue === null) return 0;
                      return a.daysUntilDue - b.daysUntilDue;
                    });

                  return reminders.length > 0 ? (
                    reminders.slice(0, 4).map((reminder) => (
                      <motion.div
                        key={reminder.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "p-3 rounded-xl border shadow-sm",
                          reminder.isOverdue
                            ? "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                            : "bg-white dark:bg-neutral-900 border-red-100 dark:border-red-900/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {reminder.type === 'LENT' ? '💰' : '🔄'} {reminder.personName}
                              </p>
                              {reminder.isOverdue && (
                                <Badge className="bg-red-500 text-white text-[10px]">Overdue</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {reminder.type === 'LENT' ? 'You lent' : 'You borrowed'} {format(reminder.amount)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                              {reminder.daysUntilDue !== null && !reminder.isOverdue ? (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {reminder.daysUntilDue === 0 ? 'Due today' : `${reminder.daysUntilDue}d left`}
                                </span>
                              ) : reminder.isOverdue ? (
                                <span className="text-red-600 dark:text-red-400">
                                  {Math.abs(reminder.daysUntilDue || 0)}d overdue
                                </span>
                              ) : (
                                <span className="text-neutral-500">No date</span>
                              )}
                            </p>
                            {reminder.dueDate && (
                              <p className="text-[10px] text-neutral-400 mt-0.5">
                                {reminder.dueDate.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-neutral-400 text-sm">
                      No pending reminders
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-6 text-neutral-400 text-sm">
                  No borrow or lend records yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Budget Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {budgets.length > 0 ? (
                budgets.slice(0, 5).map((b) => {
                  const percent = Math.min(100, (b.spent / b.limit) * 100);
                  return (
                    <div key={b.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">{b.category.name}</span>
                        <span className="text-neutral-500 dark:text-neutral-400 font-mono text-xs">
                          {format(b.spent)} / {format(b.limit)}
                        </span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            percent > 90 ? 'bg-red-500' : percent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                      </div>
                      {percent > 90 && (
                        <p className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          Near or over limit!
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-neutral-400 text-sm">No budgets set yet</div>
              )}
            </CardContent>
          </Card>

          {/* Recurring Transactions Widget */}
          <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-blue-900 dark:text-blue-100">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Recurring
                </CardTitle>
                <RecurringTransactionDialog
                  categories={categories}
                  onSuccess={fetchAllData}
                  trigger={
                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                      <Plus className="w-3 h-3" />
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent>
              {recurring.length > 0 ? (
                <div className="space-y-3">
                  {recurring.slice(0, 4).map((rec) => {
                    const daysUntil = recurringTransactionService.daysUntilNext(rec);
                    const nextDate = recurringTransactionService.getNextOccurrenceDate(rec);
                    
                    return (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-2.5 rounded-lg bg-white dark:bg-neutral-900 border border-blue-100 dark:border-blue-900/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{rec.category_name || 'Unknown'}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Clock className="w-3 h-3 text-blue-500 flex-shrink-0" />
                              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                {daysUntil < 0 ? 'Today' : daysUntil === 0 ? 'Tomorrow' : `In ${daysUntil}d`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${rec.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                              {rec.type === 'INCOME' ? '+' : '-'}${rec.amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  {recurring.length > 4 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center pt-2">
                      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.location.href = '/recurring-transactions'}>
                        View All ({recurring.length})
                      </Button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-neutral-400 text-sm">
                  <p className="mb-2">No recurring transactions</p>
                  <RecurringTransactionDialog
                    categories={categories}
                    onSuccess={fetchAllData}
                    trigger={
                      <Button size="sm" variant="default" className="bg-blue-500 hover:bg-blue-600 text-white w-full">
                        <Calendar className="w-3 h-3 mr-1" />
                        Create One
                      </Button>
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AIAssistant 
        context={{ transactions, budgets, balance, totalIncome, totalExpenses }} 
        onDataChange={fetchAllData}
      />

      <AddTransactionDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSuccess={fetchAllData}
      />
    </div>
  );
}
