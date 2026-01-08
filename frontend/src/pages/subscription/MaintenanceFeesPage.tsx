import { 
  FileText, 
  Calendar, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Info,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  useMaintenanceFees,
  useMaintenanceInvoices,
  useMaintenancePaymentHistory,
} from '@/hooks/useMaintenanceLicenseFees';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

export default function MaintenanceFeesPage() {
  const { t, isRTL } = useLanguage();
  const { data: status, isLoading: statusLoading } = useMaintenanceFees();
  const { data: invoices, isLoading: invoicesLoading } = useMaintenanceInvoices();
  const { data: paymentHistory, isLoading: historyLoading } = useMaintenancePaymentHistory();

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500">{t('subscription.invoicePaid')}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t('subscription.invoicePending')}</Badge>;
      case 'sent':
        return <Badge variant="outline">{t('subscription.invoiceSent')}</Badge>;
      case 'overdue':
        return <Badge variant="destructive">{t('subscription.invoiceOverdue')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline">{t('subscription.invoiceCancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-500">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (statusLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="container mx-auto py-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Subscription</AlertTitle>
          <AlertDescription>
            You do not have an active subscription. Please contact support to set up a subscription.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('subscription.maintenanceFees') || 'Maintenance Fees'}</h1>
        <p className="text-muted-foreground">
          {t('subscription.maintenanceFeeDescription') || 'Manage your recurring maintenance fee payments'}
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('subscription.maintenanceFeeStatus') || 'Maintenance Fee Status'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.isOverdue ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('subscription.maintenanceOverdue') || 'Maintenance Overdue'}</AlertTitle>
              <AlertDescription>
                {status.daysOverdue 
                  ? t('subscription.daysOverdue', { count: status.daysOverdue }) || `${status.daysOverdue} days overdue`
                  : t('subscription.maintenanceOverdueDescription') || 'Your maintenance fee payment is overdue. Please pay immediately to avoid service interruption.'}
              </AlertDescription>
            </Alert>
          ) : status.nextDueDate ? (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>{t('subscription.nextMaintenanceDue') || 'Next Maintenance Due'}</AlertTitle>
              <AlertDescription>
                {formatDate(status.nextDueDate)}
                {status.daysUntilDue !== null && status.daysUntilDue !== undefined && (
                  <span className="ml-2">
                    ({status.daysUntilDue} {t('subscription.daysUntilDue') || 'days until due'})
                  </span>
                )}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">{t('subscription.billingPeriod') || 'Billing Period'}</div>
              <div className="text-lg font-semibold">
                {status.billingPeriodLabel || status.billingPeriod || 'N/A'}
              </div>
            </div>
            {status.nextDueDate && (
              <div>
                <div className="text-sm text-muted-foreground">{t('subscription.nextMaintenanceDue') || 'Next Due Date'}</div>
                <div className="text-lg font-semibold">{formatDate(status.nextDueDate)}</div>
              </div>
            )}
            {status.lastPaidDate && (
              <div>
                <div className="text-sm text-muted-foreground">{t('subscription.lastMaintenancePaid') || 'Last Paid'}</div>
                <div className="text-lg font-semibold">{formatDate(status.lastPaidDate)}</div>
              </div>
            )}
            {status.amount && (
              <div>
                <div className="text-sm text-muted-foreground">{t('subscription.maintenanceFee') || 'Amount'}</div>
                <div className="text-lg font-semibold">
                  {status.amount.toLocaleString()} {status.currency}
                </div>
              </div>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Read-Only View</AlertTitle>
            <AlertDescription>
              To submit maintenance fee payments, please contact your platform administrator. This page displays your maintenance fee status and history.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('subscription.maintenanceInvoices') || 'Maintenance Invoices'}
          </CardTitle>
          <CardDescription>
            {t('subscription.maintenanceInvoicesDescription') || 'View and pay your maintenance invoices'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('subscription.noInvoices') || 'No invoices found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('subscription.invoiceNumber') || 'Invoice #'}</TableHead>
                    <TableHead>{t('common.amount') || 'Amount'}</TableHead>
                    <TableHead>{t('subscription.billingPeriod') || 'Billing Period'}</TableHead>
                    <TableHead>{t('subscription.invoiceDueDate') || 'Due Date'}</TableHead>
                    <TableHead>{t('subscription.invoiceStatus') || 'Status'}</TableHead>
                    <TableHead>{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {invoice.amount.toLocaleString()} {invoice.currency}
                      </TableCell>
                      <TableCell>{invoice.billingPeriod}</TableCell>
                      <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                      <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {invoice.status === 'pending' || invoice.status === 'sent' || invoice.status === 'overdue' 
                          ? 'Contact admin to pay'
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('subscription.paymentHistory') || 'Payment History'}
          </CardTitle>
          <CardDescription>
            {t('subscription.maintenancePaymentHistory') || 'History of your maintenance fee payments'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading payment history...</div>
          ) : !paymentHistory || paymentHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('subscription.noPaymentHistory') || 'No payment history found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('subscription.paymentDate') || 'Date'}</TableHead>
                    <TableHead>{t('common.amount') || 'Amount'}</TableHead>
                    <TableHead>{t('subscription.paymentMethod') || 'Method'}</TableHead>
                    <TableHead>{t('subscription.paymentReference') || 'Reference'}</TableHead>
                    <TableHead>{t('subscription.invoiceStatus') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>
                        {payment.amount.toLocaleString()} {payment.currency}
                      </TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.paymentReference || '-'}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

