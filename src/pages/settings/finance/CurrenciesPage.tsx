import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCurrencies, useCreateCurrency, useUpdateCurrency, useDeleteCurrency } from '@/hooks/finance/useFinancialLookups';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { currencySchema } from '@/lib/finance/schemas';
import type { Currency } from '@/types/finance';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Pencil, Trash2, Search, DollarSign } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type CurrencyFormData = z.infer<typeof currencySchema>;

export function CurrenciesPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('finance.currencies.create');
  const hasUpdatePermission = useHasPermission('finance.currencies.update');
  const hasDeletePermission = useHasPermission('finance.currencies.delete');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: currencies, isLoading } = useCurrencies();
  const createCurrency = useCreateCurrency();
  const updateCurrency = useUpdateCurrency();
  const deleteCurrency = useDeleteCurrency();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CurrencyFormData>({
    resolver: zodResolver(currencySchema),
    defaultValues: {
      decimal_places: 2,
      exchange_rate: 1.0,
      is_base_currency: false,
      is_active: true,
      sort_order: 100,
    },
  });

  const isActiveValue = watch('is_active');
  const isBaseCurrencyValue = watch('is_base_currency');

  const filteredCurrencies = useMemo(() => {
    if (!currencies) return [];
    return currencies.filter((currency) =>
      currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (currency.symbol && currency.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [currencies, searchQuery]);

  const handleOpenDialog = (currencyId?: string) => {
    if (currencyId) {
      const currency = currencies?.find((c) => c.id === currencyId);
      if (currency) {
        reset({
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol || '',
          decimal_places: currency.decimal_places,
          exchange_rate: currency.exchange_rate,
          is_base_currency: currency.is_base_currency,
          is_active: currency.is_active,
          sort_order: currency.sort_order,
        });
        setSelectedCurrency(currencyId);
      }
    } else {
      reset({
        code: '',
        name: '',
        symbol: '',
        decimal_places: 2,
        exchange_rate: 1.0,
        is_base_currency: false,
        is_active: true,
        sort_order: 100,
      });
      setSelectedCurrency(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedCurrency(null);
    reset();
  };

  const onSubmit = (data: CurrencyFormData) => {
    if (selectedCurrency) {
      updateCurrency.mutate(
        { id: selectedCurrency, ...data },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createCurrency.mutate(data, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedCurrency) {
      deleteCurrency.mutate(selectedCurrency, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedCurrency(null);
        },
      });
    }
  };

  const isGlobal = (currency: Currency) => currency.organization_id === null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Currencies
              </CardTitle>
              <CardDescription>
                Manage currencies with exchange rates for multi-currency transactions
              </CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Currency
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search currencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredCurrencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No currencies found matching your search.' : 'No currencies found. Add one to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Decimal Places</TableHead>
                    <TableHead>Exchange Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCurrencies.map((currency) => (
                    <TableRow key={currency.id}>
                      <TableCell className="font-mono font-medium">{currency.code}</TableCell>
                      <TableCell>
                        {currency.name}
                        {currency.is_base_currency && (
                          <Badge variant="secondary" className="ml-2">Base</Badge>
                        )}
                      </TableCell>
                      <TableCell>{currency.symbol || '-'}</TableCell>
                      <TableCell>{currency.decimal_places}</TableCell>
                      <TableCell>{currency.exchange_rate.toFixed(6)}</TableCell>
                      <TableCell>
                        {currency.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isGlobal(currency) ? (
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
                              onClick={() => handleOpenDialog(currency.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasDeletePermission && !isGlobal(currency) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedCurrency(currency.id);
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCurrency ? 'Edit Currency' : 'Add Currency'}
            </DialogTitle>
            <DialogDescription>
              {selectedCurrency
                ? 'Update the currency details below.'
                : 'Fill in the details to create a new currency.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  {...register('code')}
                  placeholder="USD"
                  maxLength={10}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  {...register('symbol')}
                  placeholder="$"
                  maxLength={10}
                />
                {errors.symbol && (
                  <p className="text-sm text-destructive">{errors.symbol.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="US Dollar"
                maxLength={100}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="decimal_places">Decimal Places *</Label>
                <Input
                  id="decimal_places"
                  type="number"
                  min="0"
                  max="4"
                  {...register('decimal_places', { valueAsNumber: true })}
                />
                {errors.decimal_places && (
                  <p className="text-sm text-destructive">{errors.decimal_places.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="exchange_rate">Exchange Rate *</Label>
                <Input
                  id="exchange_rate"
                  type="number"
                  step="0.000001"
                  min="0"
                  {...register('exchange_rate', { valueAsNumber: true })}
                />
                {errors.exchange_rate && (
                  <p className="text-sm text-destructive">{errors.exchange_rate.message}</p>
                )}
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
              {errors.sort_order && (
                <p className="text-sm text-destructive">{errors.sort_order.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_base_currency"
                checked={isBaseCurrencyValue}
                onCheckedChange={(checked) => setValue('is_base_currency', checked)}
              />
              <Label htmlFor="is_base_currency">Base Currency</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={isActiveValue}
                onCheckedChange={(checked) => setValue('is_active', checked)}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCurrency.isPending || updateCurrency.isPending}
              >
                {selectedCurrency ? 'Update' : 'Create'}
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
              This will delete the currency. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCurrency(null)}>
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
