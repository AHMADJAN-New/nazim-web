import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory } from '@/hooks/finance/useFinancialLookups';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { expenseCategorySchema } from '@/lib/finance/schemas';
import type { ExpenseCategory } from '@/types/finance';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, TrendingDown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ExpenseCategoryFormData = z.infer<typeof expenseCategorySchema>;

export function ExpenseCategoriesPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('finance.expense_categories.create');
  const hasUpdatePermission = useHasPermission('finance.expense_categories.update');
  const hasDeletePermission = useHasPermission('finance.expense_categories.delete');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentId, setParentId] = useState<string>('');

  const { data: categories, isLoading } = useExpenseCategories();
  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const deleteCategory = useDeleteExpenseCategory();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseCategoryFormData>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: {
      is_recurring: false,
      requires_approval: false,
      is_active: true,
      sort_order: 100,
    },
  });

  const isActiveValue = watch('is_active');
  const isRecurringValue = watch('is_recurring');
  const requiresApprovalValue = watch('requires_approval');

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [categories, searchQuery]);

  const availableParents = useMemo(() => {
    if (!categories) return [];
    return categories.filter(cat => cat.id !== selectedCategory);
  }, [categories, selectedCategory]);

  const handleOpenDialog = (categoryId?: string) => {
    if (categoryId) {
      const cat = categories?.find((c) => c.id === categoryId);
      if (cat) {
        reset({
          code: cat.code,
          name: cat.name,
          name_arabic: cat.name_arabic || '',
          name_pashto: cat.name_pashto || '',
          description: cat.description || '',
          parent_id: cat.parent_id || undefined,
          is_recurring: cat.is_recurring,
          requires_approval: cat.requires_approval,
          approval_limit: cat.approval_limit || undefined,
          is_active: cat.is_active,
          sort_order: cat.sort_order,
        });
        setParentId(cat.parent_id || '');
        setSelectedCategory(categoryId);
      }
    } else {
      reset({
        code: '',
        name: '',
        name_arabic: '',
        name_pashto: '',
        description: '',
        parent_id: undefined,
        is_recurring: false,
        requires_approval: false,
        approval_limit: undefined,
        is_active: true,
        sort_order: 100,
      });
      setParentId('');
      setSelectedCategory(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedCategory(null);
    setParentId('');
    reset();
  };

  const onSubmit = (data: ExpenseCategoryFormData) => {
    const submitData = {
      ...data,
      parent_id: parentId || null,
    };

    if (selectedCategory) {
      updateCategory.mutate(
        { id: selectedCategory, ...submitData },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createCategory.mutate(submitData, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedCategory) {
      deleteCategory.mutate(selectedCategory, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedCategory(null);
        },
      });
    }
  };

  const isGlobal = (cat: ExpenseCategory) => cat.organization_id === null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Expense Categories
              </CardTitle>
              <CardDescription>
                Manage expense and expenditure categories for financial tracking
              </CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expense categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No categories found matching your search.' : 'No categories found. Add one to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Approval Limit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-mono font-medium">{cat.code}</TableCell>
                      <TableCell>{cat.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {cat.is_recurring && (
                            <Badge variant="default">Recurring</Badge>
                          )}
                          {cat.requires_approval && (
                            <Badge variant="secondary">Requires Approval</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cat.approval_limit ? `$${cat.approval_limit.toLocaleString()}` : '-'}
                      </TableCell>
                      <TableCell>
                        {cat.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isGlobal(cat) ? (
                          <Badge variant="outline">Global</Badge>
                        ) : (
                          <Badge>Organization</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {hasUpdatePermission && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(cat.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasDeletePermission && !isGlobal(cat) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCategory(cat.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? 'Edit Expense Category' : 'Add Expense Category'}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? 'Update the category details below.'
                : 'Fill in the details to create a new expense category.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="translations">Translations</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      {...register('code')}
                      placeholder="EXP-SALARY"
                      maxLength={50}
                    />
                    {errors.code && (
                      <p className="text-sm text-destructive">{errors.code.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Staff Salaries"
                      maxLength={150}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_id">Parent Category</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {availableParents.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.code} - {parent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Optional description"
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="approval_limit">Approval Limit ($)</Label>
                    <Input
                      id="approval_limit"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('approval_limit', { valueAsNumber: true })}
                      placeholder="e.g., 5000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Amount above which approval is required
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      min="0"
                      {...register('sort_order', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_recurring"
                      checked={isRecurringValue}
                      onCheckedChange={(checked) => setValue('is_recurring', checked)}
                    />
                    <Label htmlFor="is_recurring">Recurring Expense</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_approval"
                      checked={requiresApprovalValue}
                      onCheckedChange={(checked) => setValue('requires_approval', checked)}
                    />
                    <Label htmlFor="requires_approval">Requires Approval</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={isActiveValue}
                      onCheckedChange={(checked) => setValue('is_active', checked)}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="translations" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name_arabic">Name (Arabic)</Label>
                  <Input
                    id="name_arabic"
                    {...register('name_arabic')}
                    placeholder="الاسم بالعربية"
                    maxLength={150}
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_pashto">Name (Pashto)</Label>
                  <Input
                    id="name_pashto"
                    {...register('name_pashto')}
                    placeholder="په پښتو نوم"
                    maxLength={150}
                    dir="rtl"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCategory.isPending || updateCategory.isPending}
              >
                {selectedCategory ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the expense category. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCategory(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
