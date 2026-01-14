/**
 * Currencies Page - Manage currencies for multi-currency support
 *
 * This has been refactored to follow the same dialog pattern as IncomeCategories,
 * with inline <form> elements inside the Dialogs (no nested form component),
 * to avoid any focus/selection issues while typing.
 */

import { Plus, Pencil, Trash2, Coins, Star } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
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
    useCurrencies,
    useCreateCurrency,
    useUpdateCurrency,
    useDeleteCurrency,
    type Currency,
    type CurrencyFormData,
} from '@/hooks/useCurrencies';
import { useLanguage } from '@/hooks/useLanguage';

export default function Currencies() {
    const { t } = useLanguage();
    const { data: currencies, isLoading } = useCurrencies();
    const createCurrency = useCreateCurrency();
    const updateCurrency = useUpdateCurrency();
    const deleteCurrency = useDeleteCurrency();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editCurrency, setEditCurrency] = useState<Currency | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState<CurrencyFormData>({
        code: '',
        name: '',
        symbol: '',
        decimalPlaces: 2,
        isBase: false,
        isActive: true,
    });

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            symbol: '',
            decimalPlaces: 2,
            isBase: false,
            isActive: true,
        });
    };

    const handleCreate = async () => {
        if (!formData.code || !formData.name) return;
        await createCurrency.mutateAsync(formData);
        setIsCreateOpen(false);
        resetForm();
    };

    const handleUpdate = async () => {
        if (!editCurrency || !formData.code || !formData.name) return;
        await updateCurrency.mutateAsync({ id: editCurrency.id, ...formData });
        setEditCurrency(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteCurrency.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (currency: Currency) => {
        setEditCurrency(currency);
        setFormData({
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol || '',
            decimalPlaces: currency.decimalPlaces,
            isBase: currency.isBase,
            isActive: currency.isActive,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('finance.currencies') || 'Currencies'}
                description={t('finance.currenciesDescription') || 'Manage currencies for multi-currency support'}
                icon={<Coins className="h-5 w-5" />}
                primaryAction={{
                    label: t('finance.addCurrency') || 'Add Currency',
                    onClick: () => setIsCreateOpen(true),
                    icon: <Plus className="h-4 w-4" />,
                }}
            />

            {/* Create Currency Dialog (IncomeCategories-style inline form) */}
            <Dialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) resetForm();
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.addCurrency') || 'Add Currency'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.addCurrencyDescription') || 'Create a new currency'}
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleCreate();
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="code">{t('finance.currencyCode') || 'Currency Code'} *</Label>
                                <Input
                                    id="code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="USD"
                                    maxLength={3}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('finance.currencyCodeHint') || 'ISO 4217 code (3 letters)'}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('events.name') || 'Name'} *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('finance.currencyNamePlaceholder') || 'e.g., US Dollar'}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="symbol">{t('finance.currencySymbol') || 'Symbol'}</Label>
                                <Input
                                    id="symbol"
                                    value={formData.symbol || ''}
                                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                                    placeholder="$"
                                    maxLength={10}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="decimalPlaces">{t('finance.decimalPlaces') || 'Decimal Places'}</Label>
                                <Input
                                    id="decimalPlaces"
                                    type="number"
                                    min="0"
                                    max="6"
                                    value={formData.decimalPlaces}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            decimalPlaces: Number.isNaN(parseInt(e.target.value, 10))
                                                ? 2
                                                : parseInt(e.target.value, 10),
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isBase"
                                    checked={formData.isBase}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isBase: checked })
                                    }
                                />
                                <Label htmlFor="isBase">
                                    {t('finance.baseCurrency') || 'Base Currency'}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isActive: checked })
                                    }
                                />
                                <Label htmlFor="isActive">{t('events.active') || 'Active'}</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={createCurrency.isPending || !formData.code || !formData.name}
                            >
                                {t('events.create') || 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Currencies Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        {t('finance.allCurrencies') || 'All Currencies'}
                    </CardTitle>
                    <CardDescription>
                        {currencies?.length || 0} {t('finance.currenciesFound') || 'currencies found'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('finance.currencyCode') || 'Code'}</TableHead>
                                    <TableHead>{t('events.name') || 'Name'}</TableHead>
                                    <TableHead>{t('finance.currencySymbol') || 'Symbol'}</TableHead>
                                    <TableHead>{t('finance.decimalPlaces') || 'Decimals'}</TableHead>
                                    <TableHead>{t('finance.baseCurrency') || 'Base'}</TableHead>
                                    <TableHead>{t('events.status') || 'Status'}</TableHead>
                                    <TableHead className="text-right">
                                        {t('events.actions') || 'Actions'}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currencies?.map((currency) => (
                                    <TableRow key={currency.id}>
                                        <TableCell className="font-medium">{currency.code}</TableCell>
                                        <TableCell>{currency.name}</TableCell>
                                        <TableCell>{currency.symbol || '-'}</TableCell>
                                        <TableCell>{currency.decimalPlaces}</TableCell>
                                        <TableCell>
                                            {currency.isBase ? (
                                                <Badge variant="default" className="gap-1">
                                                    <Star className="h-3 w-3" />
                                                    {t('events.yes') || 'Yes'}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={currency.isActive ? 'default' : 'secondary'}
                                            >
                                                {currency.isActive
                                                    ? t('events.active') || 'Active'
                                                    : t('events.inactive') || 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(currency)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteId(currency.id)}
                                                    disabled={currency.isBase}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!currencies || currencies.length === 0) && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={7}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            {t('finance.noCurrencies') || 'No currencies found'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog - mirrors IncomeCategories edit dialog structure */}
            <Dialog
                open={!!editCurrency}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditCurrency(null);
                        resetForm();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.editCurrency') || 'Edit Currency'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.editCurrencyDescription') || 'Update currency details'}
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleUpdate();
                        }}
                        className="space-y-4"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-code">
                                    {t('finance.currencyCode') || 'Currency Code'} *
                                </Label>
                                <Input
                                    id="edit-code"
                                    value={formData.code}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            code: e.target.value.toUpperCase(),
                                        })
                                    }
                                    placeholder="USD"
                                    maxLength={3}
                                    disabled
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('finance.currencyCodeHint') || 'ISO 4217 code (3 letters)'}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">{t('events.name') || 'Name'} *</Label>
                                <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('finance.currencyNamePlaceholder') || 'e.g., US Dollar'}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-symbol">
                                    {t('finance.currencySymbol') || 'Symbol'}
                                </Label>
                                <Input
                                    id="edit-symbol"
                                    value={formData.symbol || ''}
                                    onChange={(e) =>
                                        setFormData({ ...formData, symbol: e.target.value })
                                    }
                                    placeholder="$"
                                    maxLength={10}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-decimalPlaces">
                                    {t('finance.decimalPlaces') || 'Decimal Places'}
                                </Label>
                                <Input
                                    id="edit-decimalPlaces"
                                    type="number"
                                    min="0"
                                    max="6"
                                    value={formData.decimalPlaces}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            decimalPlaces: Number.isNaN(parseInt(e.target.value, 10))
                                                ? 2
                                                : parseInt(e.target.value, 10),
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-isBase"
                                    checked={formData.isBase}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isBase: checked })
                                    }
                                />
                                <Label htmlFor="edit-isBase">
                                    {t('finance.baseCurrency') || 'Base Currency'}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="edit-isActive"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) =>
                                        setFormData({ ...formData, isActive: checked })
                                    }
                                />
                                <Label htmlFor="edit-isActive">
                                    {t('events.active') || 'Active'}
                                </Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={updateCurrency.isPending || !formData.code || !formData.name}
                            >
                                {t('events.update') || 'Update'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog
                open={!!deleteId}
                onOpenChange={(open) => {
                    if (!open) setDeleteId(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('events.confirmDelete') || 'Confirm Delete'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('finance.deleteCurrencyWarning') ||
                                'Are you sure you want to delete this currency? This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground"
                        >
                            {t('events.delete') || 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
