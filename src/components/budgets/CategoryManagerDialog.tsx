import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Plus, Edit2, ShoppingBag, Utensils, Car, Home, Smartphone, Heart, Gamepad, Gift, Briefcase, Coffee, Zap, Music, Camera, Book, Globe, Star, Trash2, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import CategoryDialog from './CategoryDialog';
import { useAuth } from '../../hooks/useAuth';

const ICON_MAP: Record<string, any> = {
  ShoppingBag, Utensils, Car, Home, Smartphone, Heart, Gamepad, Gift, Briefcase, Coffee, Zap, Music, Camera, Book, Globe, Star
};

interface CategoryManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
  onRefresh: () => void;
}

export default function CategoryManagerDialog({ isOpen, onClose, categories, onRefresh }: CategoryManagerDialogProps) {
  const { token } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const customCategories = categories.filter(c => c.userId);

  const handleAdd = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === customCategories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(customCategories.map(c => c.id));
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (res.ok) {
        toast.success('Categories deleted successfully');
        setSelectedIds([]);
        onRefresh();
        setIsConfirmDeleteOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete categories');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
          setSelectedIds([]);
          onClose();
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b dark:border-neutral-800">
            <DialogTitle>Manage Categories</DialogTitle>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedIds.length})
                </Button>
              )}
              <Button size="sm" onClick={handleAdd} className="bg-amber-500 hover:bg-amber-600 text-white gap-1">
                <Plus className="w-4 h-4" />
                Add New
              </Button>
            </div>
          </DialogHeader>
          
          <div className="py-2 border-b dark:border-neutral-800 flex items-center justify-between px-1">
            <div className="text-xs text-neutral-500 font-medium">
              {customCategories.length} custom categories
            </div>
            {customCategories.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleSelectAll}
                className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              >
                {selectedIds.length === customCategories.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-2">
            {categories.map((cat) => {
              const IconComp = ICON_MAP[cat.icon] || Star;
              const isDefault = !cat.userId;
              const isSelected = selectedIds.includes(cat.id);
              
              return (
                <div 
                  key={cat.id} 
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isSelected 
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/10' 
                      : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {!isDefault && (
                      <button 
                        onClick={() => toggleSelect(cat.id)}
                        className="text-neutral-400 hover:text-amber-500 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: cat.color }}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">{cat.name}</div>
                      <div className="flex items-center gap-2">
                        {isDefault && (
                          <div className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Default</div>
                        )}
                        <Badge variant="outline" className={`text-[9px] uppercase px-1 h-4 ${
                          cat.type === 'INCOME' 
                            ? 'text-emerald-600 border-emerald-100 bg-emerald-50' 
                            : 'text-neutral-500 border-neutral-100 bg-neutral-50'
                        }`}>
                          {cat.type || 'EXPENSE'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {!isDefault && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEdit(cat)}
                      className="text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-neutral-600 dark:text-neutral-400">
              Are you sure you want to delete {selectedIds.length} selected categories? 
              This action cannot be undone and may fail if categories are currently used in transactions or budgets.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete} 
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Categories'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          onRefresh();
          setIsFormOpen(false);
        }}
        category={editingCategory}
      />
    </>
  );
}
