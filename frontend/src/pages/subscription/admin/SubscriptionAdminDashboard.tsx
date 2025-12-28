import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  RefreshCw,
  Ticket,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHasPermission } from '@/hooks/usePermissions';
import {
  useSubscriptionDashboard,
  usePendingPayments,
  usePendingRenewals,
  useAdminSubscriptions,
} from '@/hooks/useSubscriptionAdmin';
import { cn } from '@/lib/utils';

export default function SubscriptionAdminDashboard() {
  const hasAdminPermission = useHasPermission('subscription.admin');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: dashboardData, isLoading: isDashboardLoading } =
    useSubscriptionDashboard();
  const { data: pendingPayments, isLoading: isPaymentsLoading } =
    usePendingPayments();
  const { data: pendingRenewals, isLoading: isRenewalsLoading } =
    usePendingRenewals();
  const { data: subscriptions, isLoading: isSubscriptionsLoading } =
    useAdminSubscriptions({});

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Subscription Administration
          </h1>
          <p className="text-muted-foreground">
            Manage subscriptions, payments, and plans across all organizations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/subscription/plans">
              <Package className="mr-2 h-4 w-4" />
              Manage Plans
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/admin/subscription/discount-codes">
              <Ticket className="mr-2 h-4 w-4" />
              Discount Codes
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrganizations}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Actions
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Revenue This Year
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.revenueThisYear.afn.toLocaleString()} AFN
            </div>
            <p className="text-xs text-muted-foreground">
              ${stats.revenueThisYear.usd.toLocaleString()} USD
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Clock className="mr-2 h-4 w-4" />
            Pending ({stats.pendingPayments + stats.pendingRenewals})
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Users className="mr-2 h-4 w-4" />
            All Subscriptions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Subscriptions by Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions by Plan</CardTitle>
              <CardDescription>
                Distribution of organizations across subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(stats.subscriptionsByPlan || {}).map(
                  ([plan, count]) => (
                    <div key={plan} className="flex items-center">
                      <div className="w-32 font-medium capitalize">{plan}</div>
                      <div className="flex-1">
                        <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${((count as number) / Math.max(stats.totalOrganizations, 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="w-16 text-right font-medium">
                        {count as number}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscriptions by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Subscriptions by Status</CardTitle>
              <CardDescription>
                Current subscription status breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {Object.entries(stats.subscriptionsByStatus || {}).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex flex-col items-center rounded-lg border p-4"
                    >
                      <StatusIcon status={status} />
                      <div className="mt-2 text-2xl font-bold">
                        {count as number}
                      </div>
                      <div className="text-xs capitalize text-muted-foreground">
                        {status.replace('_', ' ')}
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {/* Pending Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pending Payments
                {(pendingPayments?.length || 0) > 0 && (
                  <Badge variant="destructive">
                    {pendingPayments?.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manual payments awaiting confirmation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPaymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : !pendingPayments?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  No pending payments
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPayments.slice(0, 5).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <div className="font-medium">
                          {payment.organizationName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {payment.amount.toLocaleString()} {payment.currency}
                          {' · '}
                          {payment.paymentMethod}
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <Link
                          to={`/admin/subscription/payments/${payment.id}`}
                        >
                          Review
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {(pendingPayments?.length || 0) > 5 && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/admin/subscription/payments">
                        View All ({pendingPayments?.length})
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Renewals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Pending Renewals
                {(pendingRenewals?.length || 0) > 0 && (
                  <Badge variant="secondary">
                    {pendingRenewals?.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Renewal requests awaiting processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isRenewalsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : !pendingRenewals?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  No pending renewals
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRenewals.slice(0, 5).map((renewal) => (
                    <div
                      key={renewal.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <div className="font-medium">
                          {renewal.organizationName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {renewal.currentPlan} → {renewal.requestedPlan}
                        </div>
                      </div>
                      <Button size="sm" asChild>
                        <Link to={`/admin/subscription/renewals/${renewal.id}`}>
                          Review
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {(pendingRenewals?.length || 0) > 5 && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/admin/subscription/renewals">
                        View All ({pendingRenewals?.length})
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>
                View and manage all organization subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSubscriptionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : !subscriptions?.data?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  No subscriptions found
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.data.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <div className="font-medium">
                          {sub.organization?.name || 'Unknown Organization'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{sub.plan?.name}</Badge>
                          <StatusBadge status={sub.status} />
                        </div>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          to={`/admin/subscription/organizations/${sub.organizationId}`}
                        >
                          Manage
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {(subscriptions.total || 0) > 10 && (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/admin/subscription/organizations">
                        View All ({subscriptions.total})
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-8 w-8 text-green-500" />;
    case 'trial':
      return <Clock className="h-8 w-8 text-blue-500" />;
    case 'grace_period':
      return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
    case 'readonly':
      return <AlertTriangle className="h-8 w-8 text-orange-500" />;
    case 'expired':
    case 'suspended':
      return <XCircle className="h-8 w-8 text-red-500" />;
    default:
      return <Clock className="h-8 w-8 text-muted-foreground" />;
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
