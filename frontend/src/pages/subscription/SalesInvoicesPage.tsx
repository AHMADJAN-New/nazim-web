import { useMutation } from '@tanstack/react-query';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { downloadSalesInvoicePdf, useSalesInvoice, useSalesInvoices } from '@/hooks/useSalesInvoices';
import { showToast } from '@/lib/toast';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function SalesInvoicesPage() {
  const { t, isRTL } = useLanguage();
  const { data: invoices = [], isLoading, error, refetch } = useSalesInvoices();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const detailQuery = useSalesInvoice(selectedId);

  const downloadPdf = useMutation({
    mutationFn: async (id: string) => downloadSalesInvoicePdf(id),
    onSuccess: ({ blob, filename }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'invoice.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast.success(t('subscription.invoiceDownloaded') || 'Invoice downloaded');
    },
    onError: (err: Error) => {
      showToast.error(err.message || (t('subscription.invoiceDownloadFailed') || 'Failed to download invoice'));
    },
  });

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('subscription.invoices') || 'Invoices'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {t('subscription.invoicesDescription') || 'View and download your invoices.'}
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} aria-label="Refresh invoices">
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Refresh</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('subscription.salesInvoices') || 'Sales invoices'}</CardTitle>
          <CardDescription>
            {t('subscription.salesInvoicesHint') || 'These cover one-time charges like license and setup.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-destructive">
              {t('common.error') || 'Error'}
              {error instanceof Error && (
                <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
              )}
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t('subscription.noInvoices') || 'No invoices found.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.status}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(inv.total_amount, inv.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {inv.issued_at ? formatDate(new Date(inv.issued_at)) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedId(inv.id)}>
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadPdf.mutate(inv.id)}
                            disabled={downloadPdf.isPending}
                            aria-label="Download invoice PDF"
                          >
                            {downloadPdf.isPending ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline ml-2">PDF</span>
                          </Button>
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

      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice details</DialogTitle>
            <DialogDescription>Line items and payment status.</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : !detailQuery.data ? (
            <div className="py-10 text-center text-muted-foreground">No details available.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <Card className="border-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
                  </CardHeader>
                  <CardContent className="text-lg font-semibold">
                    {formatCurrency(detailQuery.data.invoice.total_amount, detailQuery.data.invoice.currency)}
                  </CardContent>
                </Card>
                <Card className="border-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
                  </CardHeader>
                  <CardContent className="text-lg font-semibold">
                    {formatCurrency(detailQuery.data.payment_summary?.paid ?? 0, detailQuery.data.invoice.currency)}
                  </CardContent>
                </Card>
                <Card className="border-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Remaining</CardTitle>
                  </CardHeader>
                  <CardContent className="text-lg font-semibold">
                    {formatCurrency(detailQuery.data.payment_summary?.due ?? 0, detailQuery.data.invoice.currency)}
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
                    {detailQuery.data.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell className="font-medium">{it.title}</TableCell>
                        <TableCell className="text-right">{it.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(it.unit_price, detailQuery.data.invoice.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(it.line_total, detailQuery.data.invoice.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

