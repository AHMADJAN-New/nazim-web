import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

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
import { usePlatformPendingPayments } from '@/platform/hooks/usePlatformAdmin';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { FeeRecordSidePanel } from '@/platform/components/FeeRecordSidePanel';

export default function LicenseFeesManagement() {
  const { t, isRTL } = useLanguage();
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid' | 'pending'>('unpaid');
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedOrgName, setSelectedOrgName] = useState('');

  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasPlatformAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const { data: pendingPaymentsResponse } = usePlatformPendingPayments();
  const pendingLicensePayments = (pendingPaymentsResponse?.data ?? []).filter(
    (p: { payment_type?: string }) => p.payment_type === 'license'
  );

  // Fetch all license fee statuses (paid, pending, unpaid)
  const { data: licenseFeeList, isLoading: unpaidLoading } = useQuery({
    queryKey: ['platform-license-fees-unpaid'],
    enabled: !permissionsLoading && hasPlatformAdmin,
    queryFn: async () => {
      const response = await platformApi.licenseFees.unpaid();
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const filteredList = (() => {
    const list = licenseFeeList ?? [];
    if (filterStatus === 'all') return list;
    if (filterStatus === 'unpaid') return list.filter((f: { license_paid?: boolean; license_pending?: boolean }) => !f.license_paid && !f.license_pending);
    if (filterStatus === 'paid') return list.filter((f: { license_paid?: boolean }) => f.license_paid);
    if (filterStatus === 'pending') return list.filter((f: { license_pending?: boolean }) => f.license_pending);
    return list;
  })();

  const unpaidCount = licenseFeeList?.filter((f: { license_paid?: boolean; license_pending?: boolean }) => !f.license_paid && !f.license_pending).length ?? 0;
  const pendingCount = licenseFeeList?.filter((f: { license_pending?: boolean }) => f.license_pending).length ?? 0;
  const paidCount = licenseFeeList?.filter((f: { license_paid?: boolean }) => f.license_paid).length ?? 0;

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

  const getStatusBadge = (licensePaid: boolean, licensePending: boolean) => {
    if (licensePaid) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          {t('subscription.licensePaid') || 'Paid'}
        </Badge>
      );
    }
    if (licensePending) {
      return (
        <Badge variant="default" className="bg-yellow-500">
          <RefreshCw className="mr-1 h-3 w-3" />
          {t('subscription.licensePending') || 'Pending'}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        {t('subscription.licenseUnpaid') || 'Unpaid'}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('subscription.licenseFeesManagement') || 'License Fees Management'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {t('subscription.licenseFeesManagementDescription') || 'Manage license fee payments across all organizations'}
          </p>
        </div>
      </div>

      {/* Unpaid Alert */}
      {unpaidCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('subscription.unpaidLicenseFees') || 'Unpaid License Fees'}</AlertTitle>
          <AlertDescription>
            {t('subscription.unpaidLicenseFeesCount', { count: unpaidCount }) || 
              `${unpaidCount} organization(s) have not paid their license fees`}
          </AlertDescription>
        </Alert>
      )}

      {/* Pending license payments (recorded but not yet confirmed) */}
      {pendingLicensePayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending License Payments</CardTitle>
            <CardDescription>
              Recorded license payments awaiting confirmation. Click Review to confirm or reject.
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
                  {pendingLicensePayments.map((p: { id: string; organization?: { name: string }; amount: number; currency: string; payment_date?: string; created_at?: string }) => (
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
              {t('subscription.totalOrganizations') || 'Total Organizations'}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{licenseFeeList?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('subscription.unpaidCount') || 'Unpaid'}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unpaidCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('subscription.pendingCount') || 'Pending'}
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* License Fees Table */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('subscription.licenseFees') || 'License Fees'}
              </CardTitle>
              <CardDescription>
                {t('subscription.licenseFeesListDescription') || 'List of all organizations with license fee status'}
              </CardDescription>
            </div>
            <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
              {(['all', 'unpaid', 'pending', 'paid'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'all' ? (t('common.all') || 'All') : status === 'unpaid' ? (t('subscription.unpaidCount') || 'Unpaid') : status === 'pending' ? (t('subscription.pendingCount') || 'Pending') : (t('subscription.licensePaid') || 'Paid')}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {unpaidLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !filteredList.length ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('subscription.noLicenseFees') || 'No license fees found'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.organization') || 'Organization'}</TableHead>
                    <TableHead className="text-right">{t('subscription.licenseFee') || 'License Fee'}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('subscription.licensePaidAt') || 'Paid At'}</TableHead>
                    <TableHead>{t('subscription.status') || 'Status'}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((fee: { subscription_id: string; organization_id: string; organization_name?: string; license_amount?: number; currency?: string; license_paid_at?: string; license_paid?: boolean; license_pending?: boolean }) => (
                    <TableRow
                      key={fee.subscription_id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setSelectedOrgId(fee.organization_id);
                        setSelectedOrgName(fee.organization_name ?? '');
                        setSidePanelOpen(true);
                      }}
                    >
                      <TableCell className="font-medium">{fee.organization_name ?? '-'}</TableCell>
                      <TableCell className="text-right">
                        {fee.license_amount ? (
                          <>
                            {fee.license_amount.toLocaleString()} {fee.currency}
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {fee.license_paid_at ? formatDate(new Date(fee.license_paid_at)) : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(fee.license_paid, fee.license_pending)}
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
          )}
        </CardContent>
      </Card>
      <FeeRecordSidePanel
        open={sidePanelOpen}
        onOpenChange={setSidePanelOpen}
        organizationId={selectedOrgId}
        organizationName={selectedOrgName}
        type="license"
      />
    </div>
  );
}

