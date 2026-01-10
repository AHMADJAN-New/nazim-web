import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  Ticket,
  XCircle,
  GraduationCap,
  School,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import {
  usePlatformDashboard,
} from '@/platform/hooks/usePlatformAdmin';
import { PageHeader } from '@/components/layout/PageHeader';

export default function SubscriptionAdminDashboard() {
  const { t } = useLanguage();
  const hasAdminPermission = useHasPermission('subscription.admin');

  const { data: dashboardData, isLoading: isDashboardLoading } =
    usePlatformDashboard();

  // Access control - redirect if no permission
  if (!hasAdminPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isDashboardLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = dashboardData || {
    totalOrganizations: 0,
    totalSchools: 0,
    totalStudents: 0,
    pendingPayments: 0,
    pendingRenewals: 0,
    expiringSoon: 0,
    recentlyExpired: 0,
    revenueThisYear: { afn: 0, usd: 0 },
    subscriptionsByPlan: {} as Record<string, number>,
    subscriptionsByStatus: {} as Record<string, number>,
  };

  // Calculate derived stats from subscriptionsByStatus
  const activeSubscriptions = stats.subscriptionsByStatus['active'] || 0;
  const trialSubscriptions = stats.subscriptionsByStatus['trial'] || 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title="Subscription Administration"
        description="Manage subscriptions, payments, and plans across all organizations"
        icon={<Package className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" className="flex-shrink-0" asChild>
              <Link to="/platform/plans">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Manage Plans</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="flex-shrink-0" asChild>
              <Link to="/platform/discount-codes">
                <Ticket className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Discount Codes</span>
              </Link>
            </Button>
          </>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrganizations}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Schools
            </CardTitle>
            <School className="h-4 w-4 text-blue-500 hidden sm:inline-flex" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalSchools}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all organizations
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Students
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-purple-500 hidden sm:inline-flex" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalStudents.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all schools
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500 hidden sm:inline-flex" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeSubscriptions}
            </div>
            <p className="text-xs text-muted-foreground">
              {trialSubscriptions} on trial
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Pending Actions
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500 hidden sm:inline-flex" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingPayments + stats.pendingRenewals}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPayments} payments, {stats.pendingRenewals} renewals
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.location.href = '/platform/revenue-history'}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Revenue This Year
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.revenueThisYear.afn.toLocaleString()} AFN
            </div>
            <p className="text-xs text-muted-foreground">
              ${stats.revenueThisYear.usd.toLocaleString()} USD
            </p>
            {stats.revenueByType && (
              <div className="mt-3 pt-3 border-t space-y-1">
                <p className="text-xs font-medium">Breakdown:</p>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="truncate">License: {stats.revenueByType.license.afn.toLocaleString()} AFN / ${stats.revenueByType.license.usd.toLocaleString()} USD</div>
                  <div className="truncate">Maintenance: {stats.revenueByType.maintenance.afn.toLocaleString()} AFN / ${stats.revenueByType.maintenance.usd.toLocaleString()} USD</div>
                  {stats.revenueByType.renewal.afn > 0 && (
                    <div className="truncate">Renewal: {stats.revenueByType.renewal.afn.toLocaleString()} AFN / ${stats.revenueByType.renewal.usd.toLocaleString()} USD</div>
                  )}
                </div>
              </div>
            )}
            <Button variant="link" className="mt-2 p-0 h-auto text-xs" asChild>
              <Link to="/platform/revenue-history">
                <span className="hidden sm:inline">View Revenue History →</span>
                <span className="sm:hidden">View History →</span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="space-y-4">
          {/* Subscriptions by Plan */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Subscriptions by Plan</CardTitle>
              <CardDescription className="hidden md:block">
                Distribution of organizations across subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.subscriptionsByPlan || {}).map(
                  ([plan, count]) => (
                    <div key={plan} className="flex items-center gap-2 sm:gap-4">
                      <div className="w-20 sm:w-32 font-medium capitalize text-xs sm:text-sm truncate">{plan}</div>
                      <div className="flex-1 min-w-0">
                        <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full"
                            style={{
                              width: `${((count as number) / Math.max(stats.totalOrganizations, 1)) * 100}%`,
                              backgroundColor: '#f59e0b', // amber-500 - vibrant yellow/amber color
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-12 sm:w-16 text-right font-medium text-xs sm:text-sm">
                        {count as number}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions by Status */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Subscriptions by Status</CardTitle>
              <CardDescription className="hidden md:block">
                Current subscription status breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                {Object.entries(stats.subscriptionsByStatus || {}).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex flex-col items-center rounded-lg border p-3 sm:p-4"
                    >
                      <StatusIcon status={status} />
                      <div className="mt-2 text-lg sm:text-xl lg:text-2xl font-bold">
                        {count as number}
                      </div>
                      <div className="text-xs capitalize text-muted-foreground text-center">
                        {status.replace('_', ' ')}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
      </div>

    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />;
    case 'trial':
      return <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />;
    case 'grace_period':
      return <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />;
    case 'readonly':
      return <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />;
    case 'expired':
    case 'suspended':
      return <XCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />;
    default:
      return <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }
  > = {
    active: { variant: 'default', label: 'Active' },
    trial: { variant: 'secondary', label: 'Trial' },
    grace_period: { variant: 'outline', label: 'Grace Period' },
    readonly: { variant: 'outline', label: 'Read Only' },
    expired: { variant: 'destructive', label: 'Expired' },
    suspended: { variant: 'destructive', label: 'Suspended' },
    cancelled: { variant: 'destructive', label: 'Cancelled' },
  };

  const config = statusConfig[status] || {
    variant: 'outline' as const,
    label: status,
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === 'active' && 'bg-green-500',
        status === 'trial' && 'bg-blue-500',
        status === 'grace_period' && 'bg-yellow-500 text-yellow-900',
        status === 'readonly' && 'bg-orange-500'
      )}
    >
      {config.label}
    </Badge>
  );
}
