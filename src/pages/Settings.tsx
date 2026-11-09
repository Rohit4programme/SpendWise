import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { User, Bell, Shield, CreditCard, Moon, Sun, Plus, Calendar, CheckCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useCurrency } from '../hooks/useCurrency';
import { cn } from '../lib/utils';

export default function Settings() {
  const { user, token, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const { format, refreshSettings } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [bills, setBills] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [isPayConfirmOpen, setIsPayConfirmOpen] = useState(false);
  const [billToPay, setBillToPay] = useState<any | null>(null);
  const [billFormData, setBillFormData] = useState({
    name: '',
    amount: '',
    dueDate: '',
    categoryId: '',
  });

  const [settings, setSettings] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currency: 'USD',
    notifications: true,
    budgetAlerts: true,
    weeklySummaries: true,
    theme: 'light',
    billReminders: true,
    reminderDays: 3,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const [settingsRes, billsRes, categoriesRes] = await Promise.all([
          fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/bills', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/categories', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data) {
            setSettings(prev => ({
              ...prev,
              currency: data.currency,
              notifications: data.notifications,
              budgetAlerts: data.budgetAlerts ?? true,
              weeklySummaries: data.weeklySummaries ?? true,
              theme: data.theme,
              billReminders: data.billReminders ?? true,
              reminderDays: data.reminderDays ?? 3
            }));
          }
        }

        if (billsRes.ok) {
          setBills(await billsRes.json());
        }

        if (categoriesRes.ok) {
          const cats = await categoriesRes.json();
          setCategories(cats);
          if (cats.length > 0) {
            setBillFormData(prev => ({ ...prev, categoryId: cats[0].id }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings', error);
      }
    };
    fetchData();
  }, [token]);

  const handleAddBill = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(billFormData),
      });

      if (res.ok) {
        toast.success('Bill added successfully');
        setIsBillDialogOpen(false);
        setBillFormData({ name: '', amount: '', dueDate: '', categoryId: categories[0]?.id || '' });
        // Refresh bills
        const billsRes = await fetch('/api/bills', { headers: { Authorization: `Bearer ${token}` } });
        if (billsRes.ok) setBills(await billsRes.json());
      } else {
        toast.error('Failed to add bill');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!billToPay || !token) return;
    try {
      const res = await fetch(`/api/bills/${billToPay.id}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast.success('Bill marked as paid');
        setBills(bills.map(b => b.id === billToPay.id ? { ...b, isPaid: true } : b));
        setIsPayConfirmOpen(false);
        setBillToPay(null);
      } else {
        toast.error('Failed to update bill');
      }
    } catch (error) {
      toast.error('Something went wrong');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: settings.name,
          currency: settings.currency,
          notifications: settings.notifications,
          budgetAlerts: settings.budgetAlerts,
          weeklySummaries: settings.weeklySummaries,
          theme: settings.theme,
          billReminders: settings.billReminders,
          reminderDays: settings.reminderDays,
        }),
      });

      if (res.ok) {
        toast.success('Settings updated successfully');
        setTheme(settings.theme as 'light' | 'dark');
        refreshSettings();
        if (settings.name !== user?.name) {
          updateUser({ name: settings.name });
        }
      } else {
        toast.error('Failed to update settings');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (res.ok) {
        toast.success('Password updated successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update password');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">Settings</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Manage your account preferences and application settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "w-full justify-start gap-2",
              activeTab === 'profile' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" : "text-neutral-600 dark:text-neutral-400"
            )}
          >
            <User className="w-4 h-4" /> Profile
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('notifications')}
            className={cn(
              "w-full justify-start gap-2",
              activeTab === 'notifications' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" : "text-neutral-600 dark:text-neutral-400"
            )}
          >
            <Bell className="w-4 h-4" /> Notifications
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('security')}
            className={cn(
              "w-full justify-start gap-2",
              activeTab === 'security' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" : "text-neutral-600 dark:text-neutral-400"
            )}
          >
            <Shield className="w-4 h-4" /> Security
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('billing')}
            className={cn(
              "w-full justify-start gap-2",
              activeTab === 'billing' ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" : "text-neutral-600 dark:text-neutral-400"
            )}
          >
            <CreditCard className="w-4 h-4" /> Billing
          </Button>
        </div>

        <div className="md:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <>
              <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription className="dark:text-neutral-400">Update your personal details and email address.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={settings.name}
                        onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.email}
                        disabled
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription className="dark:text-neutral-400">Customize your experience with SpendWise.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Currency</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Choose your primary currency for tracking.</p>
                    </div>
                    <Select
                      value={settings.currency}
                      onValueChange={(v) => v && setSettings({ ...settings, currency: v })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Appearance</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Choose between light and dark themes.</p>
                    </div>
                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                      <Button
                        variant={settings.theme === 'light' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setSettings({ ...settings, theme: 'light' });
                          setTheme('light');
                        }}
                      >
                        <Sun className="w-4 h-4" /> Light
                      </Button>
                      <Button
                        variant={settings.theme === 'dark' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="gap-2"
                        onClick={() => {
                          setSettings({ ...settings, theme: 'dark' });
                          setTheme('dark');
                        }}
                      >
                        <Moon className="w-4 h-4" /> Dark
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'notifications' && (
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription className="dark:text-neutral-400">Manage how and when you receive updates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Master Notifications</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Enable or disable all application notifications.</p>
                  </div>
                  <Switch
                    checked={settings.notifications}
                    onCheckedChange={(v) => setSettings({ ...settings, notifications: v })}
                  />
                </div>

                {settings.notifications && (
                  <div className="pl-6 space-y-6 border-l-2 border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Budget Alerts</Label>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive alerts when you approach or exceed your budget limits.</p>
                      </div>
                      <Switch
                        checked={settings.budgetAlerts}
                        onCheckedChange={(v) => setSettings({ ...settings, budgetAlerts: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Weekly Summaries</Label>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Get a weekly report of your spending and savings performance.</p>
                      </div>
                      <Switch
                        checked={settings.weeklySummaries}
                        onCheckedChange={(v) => setSettings({ ...settings, weeklySummaries: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Bill Reminders</Label>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Get notified before your bills are due.</p>
                      </div>
                      <Switch
                        checked={settings.billReminders}
                        onCheckedChange={(v) => setSettings({ ...settings, billReminders: v })}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription className="dark:text-neutral-400">Manage your password and account security.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'billing' && (
            <>
              <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
                <CardHeader>
                  <CardTitle>Subscription Plan</CardTitle>
                  <CardDescription className="dark:text-neutral-400">Manage your current plan and billing details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-100">SpendWise Pro</div>
                      <div className="text-sm text-amber-700 dark:text-amber-400">Free forever for early adopters</div>
                    </div>
                    <Badge className="bg-amber-500 text-white">Active</Badge>
                  </div>
                  <div className="space-y-2">
                    <Label>Next Billing Date</Label>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Your plan is free, no billing date scheduled.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-neutral-200 dark:border-neutral-800 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Upcoming Bills</CardTitle>
                    <CardDescription className="dark:text-neutral-400">Manage your recurring payments and bills.</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => setIsBillDialogOpen(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Bill
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Bill Reminders</Label>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Get notified before your bills are due.</p>
                    </div>
                    <Switch
                      checked={settings.billReminders}
                      onCheckedChange={(v) => setSettings({ ...settings, billReminders: v })}
                    />
                  </div>

                  {settings.billReminders && (
                    <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
                      <div className="space-y-0.5">
                        <Label>Reminder Period</Label>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">How many days before the due date should we remind you?</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max="30"
                          className="w-20"
                          value={settings.reminderDays}
                          onChange={(e) => setSettings({ ...settings, reminderDays: parseInt(e.target.value) || 1 })}
                        />
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">days</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Your Bills</h4>
                    {bills.length > 0 ? (
                      <div className="space-y-3">
                        {bills.map((bill) => (
                          <div 
                            key={bill.id} 
                            className={cn(
                              "flex items-center justify-between p-4 rounded-xl border transition-all",
                              bill.isPaid 
                                ? "bg-neutral-50 dark:bg-neutral-900/50 border-neutral-100 dark:border-neutral-800 opacity-60" 
                                : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                                style={{ backgroundColor: bill.category?.color || '#ccc' }}
                              >
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-neutral-900 dark:text-neutral-100">{bill.name}</div>
                                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                  Due: {new Date(bill.dueDate).toLocaleDateString()} • {bill.category?.name}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="font-bold text-neutral-900 dark:text-neutral-100">{format(bill.amount)}</div>
                                <div className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider",
                                  bill.isPaid ? "text-emerald-600" : "text-amber-600"
                                )}>
                                  {bill.isPaid ? 'Paid' : 'Upcoming'}
                                </div>
                              </div>
                              {!bill.isPaid && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => {
                                    setBillToPay(bill);
                                    setIsPayConfirmOpen(true);
                                  }}
                                  className="h-8 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                >
                                  <CheckCircle className="w-3 h-3" /> Pay
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 text-neutral-400 text-sm">
                        No bills added yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab !== 'security' && activeTab !== 'billing' && (
            <div className="flex justify-end">
              <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-white" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}

          <Dialog open={isBillDialogOpen} onOpenChange={setIsBillDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Bill</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddBill} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="billName">Bill Name</Label>
                  <Input
                    id="billName"
                    placeholder="e.g. Rent, Electricity"
                    value={billFormData.name}
                    onChange={(e) => setBillFormData({ ...billFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billAmount">Amount</Label>
                    <Input
                      id="billAmount"
                      type="number"
                      placeholder="0.00"
                      value={billFormData.amount}
                      onChange={(e) => setBillFormData({ ...billFormData, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billDate">Due Date</Label>
                    <Input
                      id="billDate"
                      type="date"
                      value={billFormData.dueDate}
                      onChange={(e) => setBillFormData({ ...billFormData, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={billFormData.categoryId}
                    onValueChange={(v) => v && setBillFormData({ ...billFormData, categoryId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsBillDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white">
                    Add Bill
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPayConfirmOpen} onOpenChange={setIsPayConfirmOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Confirm Payment</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-neutral-600 dark:text-neutral-400">
                  Are you sure you want to mark <span className="font-bold text-neutral-900 dark:text-neutral-100">{billToPay?.name}</span> as paid?
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  This will update the bill status to "Paid".
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPayConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleMarkAsPaid}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Confirm Payment
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </div>
  );
}
