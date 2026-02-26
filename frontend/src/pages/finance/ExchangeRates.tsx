/**
 * Exchange Rates Page - Manage currency exchange rates
 */

import { Plus, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
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
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
    useExchangeRates,
    useCreateExchangeRate,
    useUpdateExchangeRate,
    useDeleteExchangeRate,
    useCurrencies,
    type ExchangeRate,
    type ExchangeRateFormData,
} from '@/hooks/useCurrencies';
import { useLanguage } from '@/hooks/useLanguage';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { formatDate } from '@/lib/utils';

export default function ExchangeRates() {
    const { t } = useLanguage();
    const { data: exchangeRates, isLoading } = useExchangeRates();
    const { data: currencies } = useCurrencies({ isActive: true });
    const createRate = useCreateExchangeRate();
    const updateRate = useUpdateExchangeRate();
    const deleteRate = useDeleteExchangeRate();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editRate, setEditRate] = useState<ExchangeRate | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const [formData, setFormData] = useState<ExchangeRateFormData>({
        fromCurrencyId: '',
        toCurrencyId: '',
        rate: 0,
        effectiveDate: dateToLocalYYYYMMDD(new Date()),
        notes: '',
        isActive: true,
    });

    const resetForm = () => {
        setFormData({
            fromCurrencyId: '',
            toCurrencyId: '',
            rate: 0,
            effectiveDate: dateToLocalYYYYMMDD(new Date()),
            notes: '',
            isActive: true,
        });
    };

    const handleCreate = async () => {
        if (!formData.fromCurrencyId || !formData.toCurrencyId || formData.rate <= 0) return;
        await createRate.mutateAsync(formData);
        setIsCreateOpen(false);
        resetForm();
    };

    const handleUpdate = async () => {
        if (!editRate || !formData.fromCurrencyId || !formData.toCurrencyId || formData.rate <= 0) return;
        await updateRate.mutateAsync({ id: editRate.id, ...formData });
        setEditRate(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteRate.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (rate: ExchangeRate) => {
        setEditRate(rate);
        setFormData({
            fromCurrencyId: rate.fromCurrencyId,
            toCurrencyId: rate.toCurrencyId,
            rate: rate.rate,
            effectiveDate: rate.effectiveDate instanceof Date ? dateToLocalYYYYMMDD(rate.effectiveDate) : rate.effectiveDate,
            notes: rate.notes || '',
            isActive: rate.isActive,
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const renderRateForm = (onSubmit: () => void, loading: boolean) => (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
            className="space-y-4"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="fromCurrencyId">{t('finance.fromCurrency') || 'From Currency'} *</Label>
                    <Select
                        value={formData.fromCurrencyId}
                        onValueChange={(value) => setFormData({ ...formData, fromCurrencyId: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectCurrency') || 'Select currency'} />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies?.filter(c => c.id !== formData.toCurrencyId).map((currency) => (
                                <SelectItem key={currency.id} value={currency.id}>
                                    {currency.code} - {currency.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="toCurrencyId">{t('finance.toCurrency') || 'To Currency'} *</Label>
                    <Select
                        value={formData.toCurrencyId}
                        onValueChange={(value) => setFormData({ ...formData, toCurrencyId: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={t('finance.selectCurrency') || 'Select currency'} />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies?.filter(c => c.id !== formData.fromCurrencyId).map((currency) => (
                                <SelectItem key={currency.id} value={currency.id}>
                                    {currency.code} - {currency.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="rate">{t('finance.exchangeRate') || 'Exchange Rate'} *</Label>
                    <Input
                        id="rate"
                        type="number"
                        min="0.000001"
                        step="0.000001"
                        value={formData.rate || ''}
                        onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                        placeholder="1.0"
                        required
                    />
                    <p className="text-xs text-muted-foreground">
                        {t('finance.exchangeRateHint') || '1 from currency = rate to currency'}
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="effectiveDate">{t('finance.effectiveDate') || 'Effective Date'} *</Label>
                    <CalendarDatePicker
                        date={formData.effectiveDate ? parseLocalDate(formData.effectiveDate) : undefined}
                        onDateChange={(date) =>
                            setFormData({
                                ...formData,
                                effectiveDate: date ? dateToLocalYYYYMMDD(date) : '',
                            })
                        }
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="notes">{t('events.notes') || 'Notes'}</Label>
                <Textarea
                    id="notes"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('finance.rateNotesPlaceholder') || 'Optional notes about this rate...'}
                    rows={3}
                />
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">{t('events.active') || 'Active'}</Label>
            </div>
            <DialogFooter>
                <Button 
                    type="submit" 
                    disabled={loading || !formData.fromCurrencyId || !formData.toCurrencyId || formData.rate <= 0}
                >
                    {editRate ? t('events.update') || 'Update' : t('events.create') || 'Create'}
                </Button>
            </DialogFooter>
        </form>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('finance.exchangeRates') || 'Exchange Rates'}
                description={t('finance.exchangeRatesDescription') || 'Manage currency exchange rates for conversion'}
                icon={<ArrowRightLeft className="h-5 w-5" />}
                primaryAction={{
                    label: t('finance.addExchangeRate') || 'Add Exchange Rate',
                    onClick: () => setIsCreateOpen(true),
                    icon: <Plus className="h-4 w-4" />,
                }}
            />

            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.addExchangeRate') || 'Add Exchange Rate'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.addExchangeRateDescription') || 'Create a new exchange rate'}
                        </DialogDescription>
                    </DialogHeader>
                    {renderRateForm(handleCreate, createRate.isPending)}
                </DialogContent>
            </Dialog>

            {/* Exchange Rates Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="h-5 w-5" />
                        {t('finance.allExchangeRates') || 'All Exchange Rates'}
                    </CardTitle>
                    <CardDescription>
                        {exchangeRates?.length || 0} {t('finance.ratesFound') || 'rates found'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('finance.fromCurrency') || 'From'}</TableHead>
                                <TableHead>{t('finance.toCurrency') || 'To'}</TableHead>
                                <TableHead>{t('finance.exchangeRate') || 'Rate'}</TableHead>
                                <TableHead>{t('finance.effectiveDate') || 'Effective Date'}</TableHead>
                                <TableHead>{t('events.notes') || 'Notes'}</TableHead>
                                <TableHead>{t('events.status') || 'Status'}</TableHead>
                                <TableHead className="text-right">{t('events.actions') || 'Actions'}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {exchangeRates?.map((rate) => {
                                // Determine if this is a reverse rate (check notes)
                                const isReverse = rate.notes?.toLowerCase().includes('reverse');
                                
                                // Get currency colors
                                const getCurrencyColor = (code: string) => {
                                    const colors: Record<string, string> = {
                                        'USD': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
                                        'AFN': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                                        'PKR': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
                                        'SAR': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
                                    };
                                    return colors[code] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
                                };

                                const fromCode = rate.fromCurrency?.code || 'N/A';
                                const toCode = rate.toCurrency?.code || 'N/A';

                                return (
                                    <TableRow key={rate.id}>
                                        <TableCell>
                                            <Badge className={getCurrencyColor(fromCode)}>
                                                {fromCode}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getCurrencyColor(toCode)}>
                                                {toCode}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{rate.rate.toFixed(2)}</span>
                                                {isReverse && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {t('finance.reverse') || 'Reverse'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-normal">
                                                {formatDate(rate.effectiveDate)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">{rate.notes || '-'}</TableCell>
                                        <TableCell>
                                            <Badge 
                                                variant={rate.isActive ? 'default' : 'secondary'}
                                                className={
                                                    rate.isActive 
                                                        ? 'bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700' 
                                                        : 'bg-gray-500 hover:bg-gray-600 text-white dark:bg-gray-600 dark:hover:bg-gray-700'
                                                }
                                            >
                                                {rate.isActive ? t('events.active') || 'Active' : t('events.inactive') || 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(rate)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setDeleteId(rate.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {(!exchangeRates || exchangeRates.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        {t('finance.noExchangeRates') || 'No exchange rates found'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={!!editRate} onOpenChange={(open) => { if (!open) { setEditRate(null); resetForm(); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('finance.editExchangeRate') || 'Edit Exchange Rate'}</DialogTitle>
                        <DialogDescription>
                            {t('finance.editExchangeRateDescription') || 'Update exchange rate details'}
                        </DialogDescription>
                    </DialogHeader>
                    {renderRateForm(handleUpdate, updateRate.isPending)}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('events.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('finance.deleteExchangeRateWarning') || 'Are you sure you want to delete this exchange rate? This action cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            {t('events.delete') || 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}


