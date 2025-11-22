import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFinancialAccounts, useCreateFinancialAccount, useUpdateFinancialAccount, useDeleteFinancialAccount } from '@/hooks/finance/useFinancialLookups';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { financialAccountSchema } from '@/lib/finance/schemas';
import type { FinancialAccount } from '@/types/finance';

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
import { Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type FinancialAccountFormData = z.infer<typeof financialAccountSchema>;

export function FinancialAccountsPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('finance.accounts.create');
  const hasUpdatePermission = useHasPermission('finance.accounts.update');
  const hasDeletePermission = useHasPermission('finance.accounts.delete');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('');
  const [currencyId, setCurrencyId] = useState<string>('');

  const { data: accounts, isLoading } = useFinancialAccounts();
  const createAccount = useCreateFinancialAccount();
  const updateAccount = useUpdateFinancialAccount();
  const deleteAccount = useDeleteFinancialAccount();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FinancialAccountFormData>({
    resolver: zodResolver(financialAccountSchema),
    defaultValues: {
      is_active: true,
      sort_order: 100,
    },
  });

  const isActiveValue = watch('is_active');

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((acc) =>
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.description && acc.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [accounts, searchQuery]);

  const availableParents = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(acc => acc.id !== selectedAccount);
  }, [accounts, selectedAccount]);

  const handleOpenDialog = (accountId?: string) => {
    if (accountId) {
      const acc = accounts?.find((a) => a.id === accountId);
      if (acc) {
        reset({
          code: acc.code,
          name: acc.name,
          name_arabic: acc.name_arabic || '',
          name_pashto: acc.name_pashto || '',
          description: acc.description || '',
          account_type: acc.account_type,
          parent_account_id: acc.parent_account_id || undefined,
          currency_id: acc.currency_id || undefined,
          is_active: acc.is_active,
          sort_order: acc.sort_order,
        });
        setParentId(acc.parent_account_id || '');
        setAccountType(acc.account_type);
        setCurrencyId(acc.currency_id || '');
        setSelectedAccount(accountId);
      }
    } else {
      reset({
        code: '',
        name: '',
        name_arabic: '',
        name_pashto: '',
        description: '',
        account_type: 'asset',
        parent_account_id: undefined,
        currency_id: undefined,
        is_active: true,
        sort_order: 100,
      });
      setParentId('');
      setAccountType('asset');
      setCurrencyId('');
      setSelectedAccount(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAccount(null);
    setParentId('');
    setAccountType('');
    setCurrencyId('');
    reset();
  };

  const onSubmit = (data: FinancialAccountFormData) => {
    const submitData = {
      ...data,
      parent_account_id: parentId || null,
      account_type: accountType as 'asset' | 'liability' | 'equity' | 'income' | 'expense',
      currency_id: currencyId || null,
    };

    if (selectedAccount) {
      updateAccount.mutate(
        { id: selectedAccount, ...submitData },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createAccount.mutate(submitData, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedAccount) {
      deleteAccount.mutate(selectedAccount, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedAccount(null);
        },
      });
    }
  };

  const isGlobal = (acc: FinancialAccount) => acc.organization_id === null;

  const getParentName = (parentId: string | null) => {
    if (!parentId || !accounts) return null;
    const parent = accounts.find(acc => acc.id === parentId);
    return parent ? `${parent.code} - ${parent.name}` : null;
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'bg-green-600';
      case 'liability': return 'bg-red-600';
      case 'equity': return 'bg-purple-600';
      case 'income': return 'bg-blue-600';
      case 'expense': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Chart of Accounts
              </CardTitle>
              <CardDescription>
                Manage financial accounts for double-entry bookkeeping
              </CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No accounts found matching your search.' : 'No accounts found. Add one to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell className="font-mono font-medium">{acc.code}</TableCell>
                      <TableCell>{acc.name}</TableCell>
                      <TableCell>
                        <Badge className={getAccountTypeColor(acc.account_type)}>
                          {acc.account_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getParentName(acc.parent_account_id) ? (
                          <span className="text-sm text-muted-foreground">
                            {getParentName(acc.parent_account_id)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {acc.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isGlobal(acc) ? (
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
                              onClick={() => handleOpenDialog(acc.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasDeletePermission && !isGlobal(acc) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedAccount(acc.id);
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
              {selectedAccount ? 'Edit Account' : 'Add Account'}
            </DialogTitle>
            <DialogDescription>
              {selectedAccount
                ? 'Update the account details below.'
                : 'Fill in the details to create a new financial account.'}
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
                      placeholder="1000"
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
                      placeholder="Cash in Hand"
                      maxLength={150}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_type">Account Type *</Label>
                    <Select value={accountType} onValueChange={setAccountType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="income">Income/Revenue</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.account_type && (
                      <p className="text-sm text-destructive">{errors.account_type.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parent_account_id">Parent Account</Label>
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

                <div className="space-y-2">
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    min="0"
                    {...register('sort_order', { valueAsNumber: true })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={isActiveValue}
                    onCheckedChange={(checked) => setValue('is_active', checked)}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Account Types:</h4>
                  <ul className="text-sm space-y-1">
                    <li><strong>Asset:</strong> Resources owned (Cash, Bank, Inventory)</li>
                    <li><strong>Liability:</strong> Debts owed (Loans, Payables)</li>
                    <li><strong>Equity:</strong> Owner's stake (Capital, Retained Earnings)</li>
                    <li><strong>Income:</strong> Revenue earned (Sales, Fees)</li>
                    <li><strong>Expense:</strong> Costs incurred (Salaries, Rent)</li>
                  </ul>
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
                disabled={createAccount.isPending || updateAccount.isPending}
              >
                {selectedAccount ? 'Update' : 'Create'}
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
              This will delete the financial account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAccount(null)}>
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
