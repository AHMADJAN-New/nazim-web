import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePaymentMethods, useCreatePaymentMethod, useUpdatePaymentMethod, useDeletePaymentMethod } from '@/hooks/finance/useFinancialLookups';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { paymentMethodSchema } from '@/lib/finance/schemas';
import type { PaymentMethod } from '@/types/finance';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Trash2, Search, CreditCard } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PaymentMethodFormData = z.infer<typeof paymentMethodSchema>;

export function PaymentMethodsPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('finance.payment_methods.create');
  const hasUpdatePermission = useHasPermission('finance.payment_methods.update');
  const hasDeletePermission = useHasPermission('finance.payment_methods.delete');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: methods, isLoading } = usePaymentMethods();
  const createMethod = useCreatePaymentMethod();
  const updateMethod = useUpdatePaymentMethod();
  const deleteMethod = useDeletePaymentMethod();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentMethodFormData>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      is_cash: false,
      is_bank_related: false,
      is_online: false,
      requires_reference: false,
      is_active: true,
      sort_order: 100,
    },
  });

  const isActiveValue = watch('is_active');
  const isCashValue = watch('is_cash');
  const isBankRelatedValue = watch('is_bank_related');
  const isOnlineValue = watch('is_online');
  const requiresReferenceValue = watch('requires_reference');

  const filteredMethods = useMemo(() => {
    if (!methods) return [];
    return methods.filter((method) =>
      method.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      method.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [methods, searchQuery]);

  const handleOpenDialog = (methodId?: string) => {
    if (methodId) {
      const method = methods?.find((m) => m.id === methodId);
      if (method) {
        reset({
          code: method.code,
          name: method.name,
          name_arabic: method.name_arabic || '',
          name_pashto: method.name_pashto || '',
          description: method.description || '',
          is_cash: method.is_cash,
          is_bank_related: method.is_bank_related,
          is_online: method.is_online,
          requires_reference: method.requires_reference,
          processing_fee_percentage: method.processing_fee_percentage || undefined,
          processing_fee_fixed: method.processing_fee_fixed || undefined,
          is_active: method.is_active,
          sort_order: method.sort_order,
        });
        setSelectedMethod(methodId);
      }
    } else {
      reset({
        code: '',
        name: '',
        name_arabic: '',
        name_pashto: '',
        description: '',
        is_cash: false,
        is_bank_related: false,
        is_online: false,
        requires_reference: false,
        processing_fee_percentage: undefined,
        processing_fee_fixed: undefined,
        is_active: true,
        sort_order: 100,
      });
      setSelectedMethod(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedMethod(null);
    reset();
  };

  const onSubmit = (data: PaymentMethodFormData) => {
    if (selectedMethod) {
      updateMethod.mutate(
        { id: selectedMethod, ...data },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createMethod.mutate(data, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedMethod) {
      deleteMethod.mutate(selectedMethod, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedMethod(null);
        },
      });
    }
  };

  const isGlobal = (method: PaymentMethod) => method.organization_id === null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>
                Manage payment and receipt methods for financial transactions
              </CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payment methods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredMethods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No methods found matching your search.' : 'No methods found. Add one to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMethods.map((method) => (
                    <TableRow key={method.id}>
                      <TableCell className="font-mono font-medium">{method.code}</TableCell>
                      <TableCell>{method.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {method.is_cash && <Badge variant="default">Cash</Badge>}
                          {method.is_bank_related && <Badge variant="secondary">Bank</Badge>}
                          {method.is_online && <Badge variant="outline">Online</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {method.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isGlobal(method) ? (
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
                              onClick={() => handleOpenDialog(method.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasDeletePermission && !isGlobal(method) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedMethod(method.id);
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
              {selectedMethod ? 'Edit Payment Method' : 'Add Payment Method'}
            </DialogTitle>
            <DialogDescription>
              {selectedMethod
                ? 'Update the payment method details below.'
                : 'Fill in the details to create a new payment method.'}
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
                      placeholder="PAY-CASH"
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
                      placeholder="Cash Payment"
                      maxLength={100}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Optional description"
                    rows={2}
                    maxLength={500}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="processing_fee_percentage">Processing Fee (%)</Label>
                    <Input
                      id="processing_fee_percentage"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...register('processing_fee_percentage', { valueAsNumber: true })}
                      placeholder="e.g., 2.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="processing_fee_fixed">Processing Fee (Fixed $)</Label>
                    <Input
                      id="processing_fee_fixed"
                      type="number"
                      step="0.01"
                      min="0"
                      {...register('processing_fee_fixed', { valueAsNumber: true })}
                      placeholder="e.g., 0.30"
                    />
                  </div>
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

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_cash"
                      checked={isCashValue}
                      onCheckedChange={(checked) => setValue('is_cash', checked)}
                    />
                    <Label htmlFor="is_cash">Cash Payment</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_bank_related"
                      checked={isBankRelatedValue}
                      onCheckedChange={(checked) => setValue('is_bank_related', checked)}
                    />
                    <Label htmlFor="is_bank_related">Bank Related</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_online"
                      checked={isOnlineValue}
                      onCheckedChange={(checked) => setValue('is_online', checked)}
                    />
                    <Label htmlFor="is_online">Online Payment</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_reference"
                      checked={requiresReferenceValue}
                      onCheckedChange={(checked) => setValue('requires_reference', checked)}
                    />
                    <Label htmlFor="requires_reference">Requires Reference Number</Label>
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
                    maxLength={100}
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_pashto">Name (Pashto)</Label>
                  <Input
                    id="name_pashto"
                    {...register('name_pashto')}
                    placeholder="په پښتو نوم"
                    maxLength={100}
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
                disabled={createMethod.isPending || updateMethod.isPending}
              >
                {selectedMethod ? 'Update' : 'Create'}
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
              This will delete the payment method. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMethod(null)}>
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
