import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Trash2, Search, Filter, X, Download, TrendingUp, Wallet, Briefcase, Edit2, Settings2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import AddTransactionDialog from '../components/transactions/AddTransactionDialog';
import { useCurrency } from '../hooks/useCurrency';

import CategoryManagerDialog from '../components/budgets/CategoryManagerDialog';

export default function Income() {
  const { token } = useAuth();
  const { format } = useCurrency();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<any | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });
  
  const [filters, setFilters] = useState({
    categoryId: 'ALL',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });

  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const [tRes, cRes] = await Promise.all([
        fetch('/api/transactions', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/categories?type=INCOME', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      
      if (tRes.ok) {
        const allTransactions = await tRes.json();
        setTransactions(allTransactions.filter((t: any) => t.type === 'INCOME'));
      }
      if (cRes.ok) {
        setCategories(await cRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [token]);

  const handleDelete = async () => {
    if (!transactionToDelete || !token) return;

    try {
      const res = await fetch(`/api/transactions/${transactionToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Income record deleted');
        setIsDeleteConfirmOpen(false);
        setTransactionToDelete(null);
        fetchTransactions();
      } else {
        toast.error('Failed to delete income record');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = (t.description || t.category.name).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filters.categoryId === 'ALL' || t.categoryId === filters.categoryId;
    const matchesMinAmount = filters.minAmount === '' || t.amount >= parseFloat(filters.minAmount);
    const matchesMaxAmount = filters.maxAmount === '' || t.amount <= parseFloat(filters.maxAmount);
    
    const tDate = new Date(t.date);
    const matchesStartDate = filters.startDate === '' || tDate >= new Date(filters.startDate);
    const matchesEndDate = filters.endDate === '' || tDate <= new Date(filters.endDate);

    return matchesSearch && matchesCategory && matchesMinAmount && matchesMaxAmount && matchesStartDate && matchesEndDate;
  }).sort((a, b) => {
    const aValue = sortConfig.key === 'date' ? new Date(a.date).getTime() : a[sortConfig.key];
    const bValue = sortConfig.key === 'date' ? new Date(b.date).getTime() : b[sortConfig.key];
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
  const monthlyIncome = transactions
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth() && new Date(t.date).getFullYear() === new Date().getFullYear())
    .reduce((sum, t) => sum + t.amount, 0);

  const resetFilters = () => {
    setFilters({
      categoryId: 'ALL',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
    });
    setSearch('');
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== '' && v !== 'ALL').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Income Management</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Track and manage your various income sources.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsCategoryManagerOpen(true)} 
            className="gap-2"
          >
            <Settings2 className="w-4 h-4" />
            Income Categories
          </Button>
          <Button onClick={() => {
            setTransactionToEdit(null);
            setIsAddDialogOpen(true);
          }} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm">
            <Plus className="w-4 h-4" />
            Add Income
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{format(totalIncome)}</div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Lifetime earnings tracked</p>
          </CardContent>
        </Card>

        <Card className="border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{format(monthlyIncome)}</div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Earnings for {new Date().toLocaleString('default', { month: 'long' })}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Search income..."
                className="pl-10 border-neutral-200 dark:border-neutral-800"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Popover>
              <PopoverTrigger className="group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-background px-4 h-9 text-sm font-medium whitespace-nowrap transition-all outline-none select-none hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100 gap-2 relative">
                <Filter className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge className="ml-1 bg-emerald-500 text-white h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">Filters</h4>
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 text-xs text-neutral-500 dark:text-neutral-400">
                      Reset
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Category</Label>
                    <Select value={filters.categoryId} onValueChange={(v) => v && setFilters({ ...filters, categoryId: v })}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Amount Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Min"
                        type="number"
                        className="h-9"
                        value={filters.minAmount}
                        onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                      />
                      <Input
                        placeholder="Max"
                        type="number"
                        className="h-9"
                        value={filters.maxAmount}
                        onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-neutral-500 dark:text-neutral-400 tracking-wider">Date Range</Label>
                    <div className="space-y-2">
                      <Input
                        type="date"
                        className="h-9"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      />
                      <Input
                        type="date"
                        className="h-9"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-neutral-50 dark:bg-neutral-900">
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:text-emerald-500 transition-colors"
                    onClick={() => setSortConfig({ key: 'date', direction: sortConfig.key === 'date' && sortConfig.direction === 'desc' ? 'asc' : 'desc' })}
                  >
                    Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead>Source / Category</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:text-emerald-500 transition-colors"
                    onClick={() => setSortConfig({ key: 'description', direction: sortConfig.key === 'description' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  >
                    Description {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead 
                    className="text-right cursor-pointer hover:text-emerald-500 transition-colors"
                    onClick={() => setSortConfig({ key: 'amount', direction: sortConfig.key === 'amount' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                  >
                    Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-neutral-400">
                      Loading income records...
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors">
                      <TableCell className="text-neutral-600 dark:text-neutral-400">
                        {new Date(t.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: t.category.color }}
                          />
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">{t.category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-neutral-900 dark:text-neutral-100 font-medium">
                        {t.description || '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        +{format(t.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTransactionToEdit(t);
                              setIsAddDialogOpen(true);
                            }}
                            className="text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 h-8 w-8"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTransactionToDelete(t);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-neutral-400">
                      No income records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AddTransactionDialog
        isOpen={isAddDialogOpen}
        onClose={() => {
          setIsAddDialogOpen(false);
          setTransactionToEdit(null);
        }}
        onSuccess={fetchTransactions}
        transaction={transactionToEdit}
        defaultType="INCOME"
      />

      <CategoryManagerDialog
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onRefresh={fetchTransactions}
      />

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neutral-600 dark:text-neutral-400">
              Are you sure you want to delete this income record?
            </p>
            {transactionToDelete && (
              <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-100 dark:border-neutral-800">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {transactionToDelete.description || 'No description'}
                  </span>
                  <span className="font-bold text-emerald-600">
                    +{format(transactionToDelete.amount)}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {new Date(transactionToDelete.date).toLocaleDateString()} • {transactionToDelete.category?.name}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
