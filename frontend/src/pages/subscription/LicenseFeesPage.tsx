import { 
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  Info,
  CreditCard,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  useLicenseFees,
  useLicensePaymentHistory,
} from '@/hooks/useMaintenanceLicenseFees';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

export default function LicenseFeesPage() {
  const { t, isRTL } = useLanguage();
  const { data: status, isLoading: statusLoading } = useLicenseFees();
  const { data: paymentHistory, isLoading: historyLoading } = useLicensePaymentHistory();

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
        <h1 className="text-3xl font-bold">{t('subscription.licenseFee') || 'License Fee'}</h1>
        <p className="text-muted-foreground">
          {t('subscription.licenseFeeDescription') || 'One-time payment for software access'}
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('subscription.licenseFeeStatus') || 'License Fee Status'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.licensePaid ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{t('subscription.licensePaid') || 'License Paid'}</AlertTitle>
              <AlertDescription>
                {status.licensePaidAt 
                  ? t('subscription.licensePaidOn', { date: formatDate(status.licensePaidAt) }) || `License paid on ${formatDate(status.licensePaidAt)}`
                  : t('subscription.licensePaidDescription') || 'Your license fee has been paid. Thank you!'}
              </AlertDescription>
            </Alert>
          ) : status.licensePending ? (
            <Alert variant="default">
              <Clock className="h-4 w-4" />
              <AlertTitle>{t('subscription.licensePending') || 'License Payment Pending'}</AlertTitle>
              <AlertDescription>
                {t('subscription.licensePendingDescription') || 'Your license payment is pending confirmation. Please wait for approval.'}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t('subscription.licenseUnpaid') || 'License Unpaid'}</AlertTitle>
              <AlertDescription>
                {t('subscription.licenseUnpaidDescription') || 'You need to pay the license fee to access the software. Please submit your payment below.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {status.licensePaidAt && (
              <div>
                <div className="text-sm text-muted-foreground">{t('subscription.licensePaidAt') || 'Paid At'}</div>
                <div className="text-lg font-semibold">{formatDate(status.licensePaidAt)}</div>
              </div>
            )}
            {status.licenseAmount && (
              <div>
                <div className="text-sm text-muted-foreground">{t('subscription.licenseFee') || 'License Fee'}</div>
                <div className="text-lg font-semibold">
                  {status.licenseAmount.toLocaleString()} {status.currency}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">{t('subscription.status') || 'Status'}</div>
              <div className="text-lg font-semibold">
                {status.licensePaid 
                  ? t('subscription.licensePaid') || 'Paid'
                  : status.licensePending
                  ? t('subscription.licensePending') || 'Pending'
                  : t('subscription.licenseUnpaid') || 'Unpaid'}
              </div>
            </div>
          </div>

          {!status.licensePaid && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Read-Only View</AlertTitle>
              <AlertDescription>
                To submit license fee payments, please contact your platform administrator. This page displays your license fee status and history.
              </AlertDescription>
            </Alert>
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
            {t('subscription.licensePaymentHistory') || 'History of your license fee payments'}
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

