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
import { Link } from 'react-router-dom';
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
import { usePlatformPendingPayments } from '@/platform/hooks/usePlatformAdmin';
import { showToast } from '@/lib/toast';
import { FeeRecordSidePanel } from '@/platform/components/FeeRecordSidePanel';
import type * as SubscriptionApi from '@/types/api/subscription';

export default function MaintenanceFeesManagement() {
  const { t, isRTL } = useLanguage();
  const queryClient = useQueryClient();
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState<string>('all');
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedOrgName, setSelectedOrgName] = useState('');

  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasPlatformAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const { data: pendingPaymentsResponse } = usePlatformPendingPayments();
  const pendingMaintenancePayments = (pendingPaymentsResponse?.data ?? []).filter(
    (p: { payment_type?: string }) => p.payment_type === 'maintenance'
  );

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
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('subscription.maintenanceFeesManagement') || 'Maintenance Fees Management'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {t('subscription.maintenanceFeesManagementDescription') || 'Manage maintenance fees across all organizations'}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
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

      {/* Pending maintenance payments (recorded but not yet confirmed) */}
      {pendingMaintenancePayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Maintenance Payments</CardTitle>
            <CardDescription>
              Recorded maintenance payments awaiting confirmation. Click Review to confirm or reject.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMaintenancePayments.map((p: { id: string; organization?: { name: string }; amount: number; currency: string; payment_date?: string; created_at?: string }) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.organization?.name ?? '-'}</TableCell>
                      <TableCell className="text-right">{p.amount?.toLocaleString()} {p.currency}</TableCell>
                      <TableCell>{p.payment_date ? formatDate(new Date(p.payment_date)) : p.created_at ? formatDate(new Date(p.created_at)) : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/platform/payments/${p.id}`}>Review</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
        <CardContent className="p-0 sm:p-6">
          {feesLoading ? (
            <div className="text-center py-8 text-muted-foreground px-4 sm:px-0">Loading...</div>
          ) : !maintenanceFees || maintenanceFees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground px-4 sm:px-0">
              {t('subscription.noMaintenanceFees') || 'No maintenance fees found'}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.organization') || 'Organization'}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('subscription.billingPeriod') || 'Billing Period'}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('subscription.nextMaintenanceDue') || 'Next Due Date'}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('subscription.lastMaintenancePaid') || 'Last Paid'}</TableHead>
                      <TableHead className="text-right">{t('common.amount') || 'Amount'}</TableHead>
                      <TableHead>{t('subscription.status') || 'Status'}</TableHead>
                      <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {maintenanceFees.map((fee) => (
                    <TableRow
                      key={fee.subscription_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedOrgId(fee.organization_id);
                        setSelectedOrgName(fee.organization_name ?? '');
                        setSidePanelOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">
                        <div>
                          {fee.organization_name}
                          <div className="md:hidden mt-1">
                            <Badge variant="outline" className="text-xs">{fee.billing_period}</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{fee.billing_period}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {fee.next_due_date ? formatDate(new Date(fee.next_due_date)) : '-'}
                        {fee.days_until_due !== null && (
                          <div className="text-xs text-muted-foreground">
                            ({fee.days_until_due} {t('subscription.daysUntilDue') || 'days'})
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {fee.last_paid_date ? formatDate(new Date(fee.last_paid_date)) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {fee.amount ? `${fee.amount.toLocaleString()} ${fee.currency}` : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(fee.is_overdue, fee.days_until_due)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `/platform/organizations/${fee.organization_id}/subscription`;
                          }}
                          className="flex-shrink-0"
                        >
                          <span className="hidden sm:inline">{t('common.view') || 'View'}</span>
                          <span className="sm:hidden">View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <FeeRecordSidePanel
        open={sidePanelOpen}
        onOpenChange={setSidePanelOpen}
        organizationId={selectedOrgId}
        organizationName={selectedOrgName}
        type="maintenance"
      />

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
        <CardContent className="p-0 sm:p-6">
          {invoicesLoading ? (
            <div className="text-center py-8 text-muted-foreground px-4 sm:px-0">Loading...</div>
          ) : !invoicesData || invoicesData.length === 0 ? (
            <div className="text-center py-10 px-4 sm:px-0">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
              <p className="text-muted-foreground font-medium mb-1">
                {t('subscription.noInvoices') || 'No invoices found'}
              </p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {t('subscription.noInvoicesHint') || 'Generate maintenance invoices for organizations with due or overdue fees to see them here.'}
              </p>
              <Button onClick={() => setIsGenerateDialogOpen(true)}>
                <FileText className="mr-2 h-4 w-4" />
                {t('subscription.generateInvoices') || 'Generate Invoices'}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('subscription.invoiceNumber') || 'Invoice #'}</TableHead>
                      <TableHead>{t('common.organization') || 'Organization'}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('subscription.billingPeriod') || 'Billing Period'}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('subscription.invoiceDueDate') || 'Due Date'}</TableHead>
                      <TableHead className="text-right">{t('common.amount') || 'Amount'}</TableHead>
                      <TableHead>{t('subscription.invoiceStatus') || 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {invoicesData.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-xs sm:text-sm">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div>
                          {invoice.organization?.name || '-'}
                          <div className="md:hidden mt-1">
                            <Badge variant="outline" className="text-xs">{invoice.billing_period}</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{invoice.billing_period}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{formatDate(new Date(invoice.due_date))}</TableCell>
                      <TableCell className="text-right">
                        {invoice.amount ? `${invoice.amount.toLocaleString()} ${invoice.currency}` : '-'}
                      </TableCell>
                      <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

