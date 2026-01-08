import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { showToast } from '@/lib/toast';
import type * as SubscriptionApi from '@/types/api/subscription';

export default function MaintenanceFeesManagement() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('all');

  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasPlatformAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  // Fetch maintenance fees list
  const { data: maintenanceFees, isLoading: feesLoading } = useQuery({
    queryKey: ['platform-maintenance-fees', selectedBillingPeriod],
    enabled: !permissionsLoading && hasPlatformAdmin,
    queryFn: async () => {
      const response = await platformApi.maintenanceFees.list({
        billing_period: selectedBillingPeriod !== 'all' ? selectedBillingPeriod : undefined,
      });
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch overdue maintenance fees
  const { data: overdueFees, isLoading: overdueLoading } = useQuery({
    queryKey: ['platform-maintenance-fees-overdue'],
    enabled: !permissionsLoading && hasPlatformAdmin,
    queryFn: async () => {
      const response = await platformApi.maintenanceFees.overdue();
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Fetch invoices
  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['platform-maintenance-invoices'],
    enabled: !permissionsLoading && hasPlatformAdmin,
    queryFn: async () => {
      const response = await platformApi.maintenanceFees.invoices();
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Generate invoices mutation
  const generateInvoices = useMutation({
    mutationFn: async (data?: { organization_ids?: string[]; billing_period?: SubscriptionApi.BillingPeriod }) => {
      return platformApi.maintenanceFees.generateInvoices(data);
    },
    onSuccess: (response) => {
      showToast.success(
        t('subscription.invoicesGenerated') || 
        `Generated ${response.data.generated} invoice(s). ${response.data.skipped} skipped.`
      );
      setIsGenerateDialogOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['platform-maintenance-fees'] });
      void queryClient.invalidateQueries({ queryKey: ['platform-maintenance-invoices'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('subscription.invoiceGenerationFailed') || 'Failed to generate invoices');
    },
  });

  // Confirm payment mutation
  const confirmPayment = useMutation({
    mutationFn: async (paymentId: string) => {
      return platformApi.maintenanceFees.confirmPayment(paymentId);
    },
    onSuccess: () => {
      showToast.success(t('subscription.paymentConfirmed') || 'Payment confirmed successfully');
      void queryClient.invalidateQueries({ queryKey: ['platform-maintenance-fees'] });
      void queryClient.invalidateQueries({ queryKey: ['platform-maintenance-invoices'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('subscription.paymentConfirmFailed') || 'Failed to confirm payment');
    },
  });

  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPlatformAdmin) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  const getStatusBadge = (isOverdue: boolean, daysUntilDue: number | null) => {
    if (isOverdue) {
      return (
        <Badge variant="destructive">
          <AlertTriangle className="mr-1 h-3 w-3" />
          {t('subscription.maintenanceOverdue') || 'Overdue'}
        </Badge>
      );
    }
    if (daysUntilDue !== null && daysUntilDue <= 30) {
      return (
        <Badge variant="default" className="bg-yellow-500">
          <Clock className="mr-1 h-3 w-3" />
          {t('subscription.maintenanceUpcoming') || 'Upcoming'}
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-green-500">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        {t('subscription.current') || 'Current'}
      </Badge>
    );
  };

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

  return (
    <div className="space-y-6 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('subscription.maintenanceFeesManagement') || 'Maintenance Fees Management'}
          </h1>
          <p className="text-muted-foreground">
            {t('subscription.maintenanceFeesManagementDescription') || 'Manage maintenance fees across all organizations'}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                {t('subscription.generateInvoices') || 'Generate Invoices'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('subscription.generateInvoices') || 'Generate Maintenance Invoices'}</DialogTitle>
                <DialogDescription>
                  {t('subscription.generateInvoicesDescription') || 'Generate maintenance invoices for organizations with due dates'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t('subscription.generateInvoicesWarning') || 'This will generate invoices for all organizations with upcoming or overdue maintenance fees.'}
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsGenerateDialogOpen(false)}
                >
                  {t('common.cancel') || 'Cancel'}
                </Button>
                <Button
                  onClick={() => generateInvoices.mutate()}
                  disabled={generateInvoices.isPending}
                >
                  {generateInvoices.isPending
                    ? (t('common.processing') || 'Processing...')
                    : (t('subscription.generate') || 'Generate')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueFees && overdueFees.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('subscription.overdueMaintenance') || 'Overdue Maintenance Fees'}</AlertTitle>
          <AlertDescription>
            {t('subscription.overdueMaintenanceCount', { count: overdueFees.length }) || 
              `${overdueFees.length} organization(s) have overdue maintenance fees`}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('subscription.totalMaintenanceFees') || 'Total Organizations'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{maintenanceFees?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('subscription.overdueCount') || 'Overdue'}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueFees?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('subscription.totalInvoices') || 'Total Invoices'}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoicesData?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Fees Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('subscription.maintenanceFees') || 'Maintenance Fees'}
          </CardTitle>
          <CardDescription>
            {t('subscription.maintenanceFeesListDescription') || 'List of all organizations with maintenance fees'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !maintenanceFees || maintenanceFees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('subscription.noMaintenanceFees') || 'No maintenance fees found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.organization') || 'Organization'}</TableHead>
                    <TableHead>{t('subscription.billingPeriod') || 'Billing Period'}</TableHead>
                    <TableHead>{t('subscription.nextMaintenanceDue') || 'Next Due Date'}</TableHead>
                    <TableHead>{t('subscription.lastMaintenancePaid') || 'Last Paid'}</TableHead>
                    <TableHead className="text-right">{t('common.amount') || 'Amount'}</TableHead>
                    <TableHead>{t('subscription.status') || 'Status'}</TableHead>
                    <TableHead>{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenanceFees.map((fee) => (
                    <TableRow key={fee.subscription_id}>
                      <TableCell className="font-medium">{fee.organization_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{fee.billing_period}</Badge>
                      </TableCell>
                      <TableCell>
                        {fee.next_due_date ? formatDate(new Date(fee.next_due_date)) : '-'}
                        {fee.days_until_due !== null && (
                          <div className="text-xs text-muted-foreground">
                            ({fee.days_until_due} {t('subscription.daysUntilDue') || 'days'})
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {fee.last_paid_date ? formatDate(new Date(fee.last_paid_date)) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {fee.amount ? `${fee.amount.toLocaleString()} ${fee.currency}` : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(fee.is_overdue, fee.days_until_due)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Navigate to organization subscription detail
                            window.location.href = `/platform/organizations/${fee.organization_id}/subscription`;
                          }}
                        >
                          {t('common.view') || 'View'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('subscription.maintenanceInvoices') || 'Maintenance Invoices'}
          </CardTitle>
          <CardDescription>
            {t('subscription.invoicesListDescription') || 'All generated maintenance invoices'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !invoicesData || invoicesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('subscription.noInvoices') || 'No invoices found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('subscription.invoiceNumber') || 'Invoice #'}</TableHead>
                    <TableHead>{t('common.organization') || 'Organization'}</TableHead>
                    <TableHead>{t('subscription.billingPeriod') || 'Billing Period'}</TableHead>
                    <TableHead>{t('subscription.invoiceDueDate') || 'Due Date'}</TableHead>
                    <TableHead className="text-right">{t('common.amount') || 'Amount'}</TableHead>
                    <TableHead>{t('subscription.invoiceStatus') || 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.organization?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{invoice.billing_period}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(new Date(invoice.due_date))}</TableCell>
                      <TableCell className="text-right">
                        {invoice.amount ? `${invoice.amount.toLocaleString()} ${invoice.currency}` : '-'}
                      </TableCell>
                      <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
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

