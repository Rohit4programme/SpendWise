import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Users, Plus, Calendar, CheckCircle, Trash2, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { useCurrency } from '../hooks/useCurrency';
import { cn } from '../lib/utils';

export default function Debts() {
  const { token } = useAuth();
  const { format } = useCurrency();
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isRepaymentDialogOpen, setIsRepaymentDialogOpen] = useState(false);
  const [debtToDelete, setDebtToDelete] = useState<any | null>(null);
  const [debtForRepayment, setDebtForRepayment] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    personName: '',
    amount: '',
    type: 'LENT',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  });

  const [repaymentFormData, setRepaymentFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const fetchDebts = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/debts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDebts(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch debts', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, [token]);

  const handleAddDebt = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/debts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Debt recorded successfully');
        setIsAddDialogOpen(false);
        setFormData({
          personName: '',
          amount: '',
          type: 'LENT',
          date: new Date().toISOString().split('T')[0],
          dueDate: '',
          notes: '',
        });
        fetchDebts();
      } else {
        toast.error('Failed to record debt');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/debts/${id}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success('Marked as paid');
        fetchDebts();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const handleAddRepayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!debtForRepayment || !token) return;
    try {
      const res = await fetch(`/api/debts/${debtForRepayment.id}/repayments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(repaymentFormData),
      });

      if (res.ok) {
        toast.success('Repayment recorded');
        setIsRepaymentDialogOpen(false);
        setRepaymentFormData({
          amount: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        fetchDebts();
      } else {
        toast.error('Failed to record repayment');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const handleDelete = async () => {
    if (!debtToDelete || !token) return;
    try {
      const res = await fetch(`/api/debts/${debtToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success('Record deleted');
        setIsDeleteConfirmOpen(false);
        setDebtToDelete(null);
        fetchDebts();
      } else {
        toast.error('Failed to delete record');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const lentDebts = debts.filter(d => d.type === 'LENT');
  const borrowedDebts = debts.filter(d => d.type === 'BORROWED');

  const totalLent = lentDebts.filter(d => d.status === 'PENDING').reduce((acc, d) => acc + d.amount, 0);
  const totalBorrowed = borrowedDebts.filter(d => d.status === 'PENDING').reduce((acc, d) => acc + d.amount, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Borrow & Lend</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Track money you owe and money owed to you.</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          Add Record
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4" /> Total You Lent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{format(totalLent)}</div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Pending repayments from friends</p>
          </CardContent>
        </Card>

        <Card className="border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4" /> Total You Borrowed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{format(totalBorrowed)}</div>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">Pending repayments to others</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lent" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="lent">Lent to Others</TabsTrigger>
          <TabsTrigger value="borrowed">Borrowed from Others</TabsTrigger>
        </TabsList>

        <TabsContent value="lent" className="mt-6 space-y-4">
          {lentDebts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lentDebts.map((debt) => (
                <div key={debt.id}>
                  <DebtCard
                    debt={debt}
                    format={format}
                    onPay={handleMarkAsPaid}
                    onAddRepayment={(d) => {
                      setDebtForRepayment(d);
                      setIsRepaymentDialogOpen(true);
                    }}
                    onDelete={(d) => {
                      setDebtToDelete(d);
                      setIsDeleteConfirmOpen(true);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No lending records found." />
          )}
        </TabsContent>

        <TabsContent value="borrowed" className="mt-6 space-y-4">
          {borrowedDebts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {borrowedDebts.map((debt) => (
                <div key={debt.id}>
                  <DebtCard
                    debt={debt}
                    format={format}
                    onPay={handleMarkAsPaid}
                    onAddRepayment={(d) => {
                      setDebtForRepayment(d);
                      setIsRepaymentDialogOpen(true);
                    }}
                    onDelete={(d) => {
                      setDebtToDelete(d);
                      setIsDeleteConfirmOpen(true);
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No borrowing records found." />
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Record</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDebt} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Record Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => v && setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LENT">I Lent Money</SelectItem>
                  <SelectItem value="BORROWED">I Borrowed Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personName">{formData.type === 'LENT' ? 'Lent to' : 'Borrowed from'}</Label>
              <Input
                id="personName"
                placeholder="Person's name"
                value={formData.personName}
                onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                placeholder="What was it for?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white">
                Save Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neutral-600 dark:text-neutral-400">
              Are you sure you want to delete this record?
            </p>
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

      <Dialog open={isRepaymentDialogOpen} onOpenChange={setIsRepaymentDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
            <DialogDescription>
              Record a partial or full repayment for {debtForRepayment?.personName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddRepayment} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="repaymentAmount">Amount Repaid</Label>
              <Input
                id="repaymentAmount"
                type="number"
                placeholder="0.00"
                value={repaymentFormData.amount}
                onChange={(e) => setRepaymentFormData({ ...repaymentFormData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repaymentDate">Date of Repayment</Label>
              <Input
                id="repaymentDate"
                type="date"
                value={repaymentFormData.date}
                onChange={(e) => setRepaymentFormData({ ...repaymentFormData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repaymentNotes">Notes (Optional)</Label>
              <Input
                id="repaymentNotes"
                placeholder="Any details?"
                value={repaymentFormData.notes}
                onChange={(e) => setRepaymentFormData({ ...repaymentFormData, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRepaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white">
                Record Repayment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DebtCard({ debt, format, onPay, onAddRepayment, onDelete }: { debt: any, format: any, onPay: (id: string) => void, onAddRepayment: (debt: any) => void, onDelete: (debt: any) => void }) {
  const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date() && debt.status === 'PENDING';
  const totalRepaid = debt.repayments?.reduce((acc: number, r: any) => acc + r.amount, 0) || 0;
  const remainingBalance = debt.amount - totalRepaid;

  return (
    <Card className={cn(
      "border-neutral-200 dark:border-neutral-800 transition-all",
      debt.status === 'PAID' ? "opacity-60 bg-neutral-50 dark:bg-neutral-900/50" : "bg-white dark:bg-neutral-900 shadow-sm"
    )}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              debt.type === 'LENT' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
            )}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-neutral-900 dark:text-neutral-100">{debt.personName}</div>
              <div className="text-xs text-neutral-500">{new Date(debt.date).toLocaleDateString()}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold text-lg text-neutral-900 dark:text-neutral-100">{format(debt.amount)}</div>
            <Badge variant={debt.status === 'PAID' ? 'secondary' : 'outline'} className={cn(
              "text-[10px] uppercase tracking-wider",
              debt.status === 'PENDING' && "border-amber-200 text-amber-600",
              debt.status === 'PAID' && "bg-emerald-50 text-emerald-600"
            )}>
              {debt.status}
            </Badge>
          </div>
        </div>

        {debt.notes && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 italic">"{debt.notes}"</p>
        )}

        {debt.status === 'PENDING' && totalRepaid > 0 && (
          <div className="mb-4 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-100 dark:border-neutral-700">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-500">Repaid: {format(totalRepaid)}</span>
              <span className="font-bold text-amber-600">Remaining: {format(remainingBalance)}</span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all" 
                style={{ width: `${(totalRepaid / debt.amount) * 100}%` }}
              />
            </div>
          </div>
        )}

        {debt.repayments && debt.repayments.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Repayment History</p>
            {debt.repayments.map((r: any) => (
              <div key={r.id} className="flex justify-between items-center text-xs py-1 border-b border-neutral-50 dark:border-neutral-800 last:border-0">
                <span className="text-neutral-500">{new Date(r.date).toLocaleDateString()}</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">{format(r.amount)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-4 text-xs">
            {debt.dueDate && (
              <div className={cn(
                "flex items-center gap-1",
                isOverdue ? "text-red-500 font-bold" : "text-neutral-500"
              )}>
                <Clock className="w-3 h-3" />
                Due: {new Date(debt.dueDate).toLocaleDateString()}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onDelete(debt)}
              className="h-8 w-8 text-neutral-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            {debt.status === 'PENDING' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onAddRepayment(debt)}
                  className="h-8 gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                >
                  <Plus className="w-3 h-3" /> Repay
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onPay(debt.id)}
                  className="h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                >
                  <CheckCircle className="w-3 h-3" /> Mark Paid
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400 text-sm">
      {message}
    </div>
  );
}
