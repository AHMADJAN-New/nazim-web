import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
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
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';

export default function LicenseFeesManagement() {
  const { t, isRTL } = useLanguage();
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid' | 'pending'>('unpaid');

  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasPlatformAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  // Fetch unpaid license fees
  const { data: unpaidLicenseFees, isLoading: unpaidLoading } = useQuery({
    queryKey: ['platform-license-fees-unpaid'],
    enabled: !permissionsLoading && hasPlatformAdmin && (filterStatus === 'all' || filterStatus === 'unpaid'),
    queryFn: async () => {
      const response = await platformApi.licenseFees.unpaid();
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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

  const unpaidCount = unpaidLicenseFees?.filter(fee => !fee.license_paid && !fee.license_pending).length || 0;
  const pendingCount = unpaidLicenseFees?.filter(fee => fee.license_pending).length || 0;
  const paidCount = unpaidLicenseFees?.filter(fee => fee.license_paid).length || 0;

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
            <div className="text-2xl font-bold">{unpaidLicenseFees?.length || 0}</div>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('subscription.licenseFees') || 'License Fees'}
          </CardTitle>
          <CardDescription>
            {t('subscription.licenseFeesListDescription') || 'List of all organizations with license fee status'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {unpaidLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !unpaidLicenseFees || unpaidLicenseFees.length === 0 ? (
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
                  {unpaidLicenseFees.map((fee) => (
                    <TableRow key={fee.subscription_id}>
                      <TableCell className="font-medium">{fee.organization_name}</TableCell>
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
                          onClick={() => {
                            // Navigate to organization subscription detail
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
    </div>
  );
}

