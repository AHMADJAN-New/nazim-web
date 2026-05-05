import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';

const paymentSchema = z.object({
  amount: z.number().min(0.01),
  currency: z.enum(['AFN', 'USD']),
  payment_method: z.string().min(1).max(50),
  payment_reference: z.string().optional(),
  payment_date: z.string().min(1),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

export function OrganizationSalesInvoicePanel({ organizationId }: { organizationId: string }) {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const invoiceQuery = useQuery({
    queryKey: ['platform-sales-invoice', organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const res = await platformApi.salesInvoice.get(organizationId);
      return res.data;
    },
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const invoice = invoiceQuery.data?.invoice ?? null;
  const items = invoiceQuery.data?.items ?? [];
  const payments = invoiceQuery.data?.payments ?? [];
  const summary = invoiceQuery.data?.payment_summary ?? null;

  const currency = invoice?.currency ?? 'AFN';

  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      currency,
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().slice(0, 10),
    },
  });

  const recordPayment = useMutation({
    mutationFn: async (data: PaymentForm) => platformApi.salesInvoice.recordPayment(organizationId, data),
    onSuccess: async () => {
      showToast.success(t('subscription.paymentConfirmed') || 'Payment recorded');
      setIsPaymentDialogOpen(false);
      paymentForm.reset({
        currency,
        payment_method: 'bank_transfer',
        payment_date: new Date().toISOString().slice(0, 10),
      });
      await queryClient.invalidateQueries({ queryKey: ['platform-sales-invoice', organizationId] });
      await queryClient.refetchQueries({ queryKey: ['platform-sales-invoice', organizationId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to record payment');
    },
  });

  const canDownload = !!invoice?.id;

  const downloadPdf = useMutation({
    mutationFn: async () => platformApi.salesInvoice.downloadPdf(organizationId, {}),
    onSuccess: ({ blob, filename }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `${invoice?.invoice_number || 'sales-invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast.success('Invoice PDF download started');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'Failed to download invoice PDF');
    },
  });

  const totals = useMemo(() => {
    const total = summary?.total ?? invoice?.total_amount ?? 0;
    const paid = summary?.paid ?? 0;
    const due = summary?.due ?? Math.max(total - paid, 0);
    return { total, paid, due };
  }, [summary, invoice]);

  if (invoiceQuery.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (invoiceQuery.error) {
    return (
      <div className="py-10 text-center text-destructive">
        Failed to load invoice
        {invoiceQuery.error instanceof Error && (
          <p className="mt-1 text-sm text-muted-foreground">{invoiceQuery.error.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Sales Invoice</CardTitle>
            <CardDescription>
              {invoice ? (
                <>
                  <span className="font-mono">{invoice.invoice_number}</span>
                  {invoice.issued_at ? (
                    <span className="ml-2 text-muted-foreground">
                      ({formatDate(new Date(invoice.issued_at))})
                    </span>
                  ) : null}
                </>
              ) : (
                'No invoice yet'
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => invoiceQuery.refetch()}
              aria-label="Refresh invoice"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Refresh</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadPdf.mutate()}
              disabled={!canDownload || downloadPdf.isPending}
              aria-label="Download invoice PDF"
            >
              {downloadPdf.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline ml-2">PDF</span>
            </Button>
            <Button onClick={() => setIsPaymentDialogOpen(true)} disabled={!invoice}>
              Record payment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <Card className="border-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {formatCurrency(totals.total, currency)}
              </CardContent>
            </Card>
            <Card className="border-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {formatCurrency(totals.paid, currency)}
              </CardContent>
            </Card>
            <Card className="border-muted">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Remaining</CardTitle>
              </CardHeader>
              <CardContent className="text-lg font-semibold">
                {formatCurrency(totals.due, currency)}
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No items
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.title}</TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.unit_price, currency)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.line_total, currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {payments.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {formatCurrency(p.amount, currency)}
                      </TableCell>
                      <TableCell>{p.payment_date ? formatDate(new Date(p.payment_date)) : '-'}</TableCell>
                      <TableCell>{p.payment_method}</TableCell>
                      <TableCell>{p.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Attach a payment to this invoice.</DialogDescription>
          </DialogHeader>

          <form
            onSubmit={paymentForm.handleSubmit((data) => recordPayment.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.01"
                {...paymentForm.register('amount', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input disabled value={currency} />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Input {...paymentForm.register('payment_method')} placeholder="bank_transfer / cash / ..." />
            </div>
            <div className="space-y-2">
              <Label>Payment date</Label>
              <Input type="date" {...paymentForm.register('payment_date')} />
            </div>
            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input {...paymentForm.register('payment_reference')} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input {...paymentForm.register('notes')} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={recordPayment.isPending}>
                {recordPayment.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

