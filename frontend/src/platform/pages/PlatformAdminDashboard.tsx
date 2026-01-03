import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Package,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  TrendingUp,
  Users,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Settings as SettingsIcon,
  GraduationCap,
  School,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { usePlatformDashboard, usePlatformPendingPayments, usePlatformPendingRenewals, usePlatformSubscriptions, usePlatformOrganizations, usePlatformOrganizationAdmins } from '../hooks/usePlatformAdmin';

import { OrganizationAdminsManagement } from '@/components/settings/OrganizationAdminsManagement';
import { OrganizationsManagement } from '@/components/settings/OrganizationsManagement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { OrganizationDetailsDialog } from '@/platform/components/OrganizationDetailsDialog';
import { OrganizationSubscriptionDialog } from '@/platform/components/OrganizationSubscriptionDialog';

export function PlatformAdminDashboard() {
  const { t } = useLanguage();
  const location = useLocation();
  
  // Determine active tab based on route
  const getInitialTab = () => {
    if (location.pathname.includes('/organizations')) return 'organizations';
    if (location.pathname.includes('/admins')) return 'admins';
    return 'overview';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [viewingOrganizationId, setViewingOrganizationId] = useState<string | null>(null);
  const [viewingSubscriptionOrgId, setViewingSubscriptionOrgId] = useState<string | null>(null);
  
  // Update tab when route changes
  useEffect(() => {
    setActiveTab(getInitialTab());
  }, [location.pathname]);

  const { data: dashboardData, isLoading: isDashboardLoading } = usePlatformDashboard();
  const { data: pendingPayments, isLoading: isPaymentsLoading } = usePlatformPendingPayments();
  const { data: pendingRenewals, isLoading: isRenewalsLoading } = usePlatformPendingRenewals();
  const { data: subscriptions, isLoading: isSubscriptionsLoading } = usePlatformSubscriptions();
  const { data: organizations } = usePlatformOrganizations();
  const { data: organizationAdmins } = usePlatformOrganizationAdmins();

  if (isDashboardLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
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

  const activeSubscriptions = stats.subscriptionsByStatus['active'] || 0;
  const trialSubscriptions = stats.subscriptionsByStatus['trial'] || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Platform Administration</h1>
        <p className="text-muted-foreground">
          Manage the Nazim platform, organizations, subscriptions, and more
        </p>
      </div>

      {/* Stats Cards */}
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
            <p className="text-xs text-muted-foreground">
              {stats.totalSchools} schools
            </p>
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
          <TabsTrigger value="organizations">
            <Building2 className="mr-2 h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="admins">
            <Users className="mr-2 h-4 w-4" />
            Organization Admins
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
                {((pendingPayments?.data?.length) || 0) > 0 && (
                  <Badge variant="destructive">
                    {pendingPayments?.data?.length || 0}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isPaymentsLoading ? (
                <LoadingSpinner />
              ) : !pendingPayments?.data || pendingPayments.data.length === 0 ? (
                <p className="text-muted-foreground">No pending payments</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.data.slice(0, 10).map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.organization_name}</TableCell>
                        <TableCell>
                          {payment.amount?.toLocaleString()} {payment.currency}
                        </TableCell>
                        <TableCell>
                          {formatDate(new Date(payment.created_at))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/platform/payments/${payment.id}`}>
                              Review
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pending Renewals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Pending Renewals
                {((pendingRenewals?.data?.length) || 0) > 0 && (
                  <Badge variant="destructive">
                    {pendingRenewals?.data?.length || 0}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isRenewalsLoading ? (
                <LoadingSpinner />
              ) : !pendingRenewals?.data || pendingRenewals.data.length === 0 ? (
                <p className="text-muted-foreground">No pending renewals</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Plan</TableHead>
                      <TableHead>Requested Plan</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRenewals.data.slice(0, 10).map((renewal: any) => (
                      <TableRow key={renewal.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {renewal.organization?.name || 'Unknown Organization'}
                            </div>
                            {renewal.organization && (
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                {renewal.organization.contact_person_name && (
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    <span>{renewal.organization.contact_person_name}</span>
                                    {renewal.organization.contact_person_position && (
                                      <span className="text-muted-foreground">
                                        ({renewal.organization.contact_person_position})
                                      </span>
                                    )}
                                  </div>
                                )}
                                {renewal.organization.contact_person_email && (
                                  <div className="flex items-center gap-1">
                                    <span>📧</span>
                                    <span>{renewal.organization.contact_person_email}</span>
                                  </div>
                                )}
                                {renewal.organization.contact_person_phone && (
                                  <div className="flex items-center gap-1">
                                    <span>📞</span>
                                    <span>{renewal.organization.contact_person_phone}</span>
                                  </div>
                                )}
                                {!renewal.organization.contact_person_name && 
                                 !renewal.organization.contact_person_email && 
                                 !renewal.organization.contact_person_phone && (
                                  <div className="text-muted-foreground italic">
                                    No contact information
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              renewal.status === 'approved' ? 'default' :
                              renewal.status === 'rejected' ? 'destructive' :
                              'secondary'
                            }
                            className={cn(
                              renewal.status === 'approved' && 'bg-green-500',
                              renewal.status === 'rejected' && 'bg-red-500',
                              renewal.status === 'pending' && 'bg-yellow-500'
                            )}
                          >
                            {renewal.status === 'approved' ? 'Approved' :
                             renewal.status === 'rejected' ? 'Rejected' :
                             'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-medium">
                              {renewal.subscription?.plan?.name || 
                               (renewal.subscription?.plan_id ? `Plan ID: ${renewal.subscription.plan_id}` : 'No Plan')}
                            </div>
                            {renewal.subscription && (
                              <div className="text-xs text-muted-foreground">
                                Status: {renewal.subscription.status || 'N/A'}
                              </div>
                            )}
                            {!renewal.subscription && (
                              <div className="text-xs text-muted-foreground italic">
                                No active subscription
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <div className="font-medium">
                              {renewal.requested_plan?.name || 'N/A'}
                            </div>
                            {renewal.requested_plan && (
                              <div className="text-xs text-muted-foreground">
                                {renewal.additional_schools > 0 && (
                                  <span>+{renewal.additional_schools} schools</span>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {renewal.requested_at 
                            ? formatDate(new Date(renewal.requested_at))
                            : formatDate(new Date(renewal.created_at))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/platform/renewals/${renewal.id}`}>
                                Review
                              </Link>
                            </Button>
                            {renewal.organization_id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewingOrganizationId(renewal.organization_id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                  <LoadingSpinner />
                </div>
              ) : !subscriptions || subscriptions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No subscriptions found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">
                          {sub.organization?.name || 'Unknown Organization'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{sub.plan?.name || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={sub.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.started_at ? formatDate(new Date(sub.started_at)) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {sub.expires_at ? formatDate(new Date(sub.expires_at)) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {sub.amount_paid > 0 ? (
                            <span>
                              {sub.currency === 'AFN' ? '؋' : '$'}
                              {sub.amount_paid.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewingOrganizationId(sub.organization_id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingSubscriptionOrgId(sub.organization_id)}
                            >
                              Manage
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations" className="mt-4">
          <OrganizationsManagement />
        </TabsContent>

        <TabsContent value="admins" className="mt-4">
          <OrganizationAdminsManagement />
        </TabsContent>
      </Tabs>

      {/* Organization Details Dialog */}
      <OrganizationDetailsDialog
        organizationId={viewingOrganizationId}
        open={!!viewingOrganizationId}
        onOpenChange={(open) => {
          if (!open) {
            setViewingOrganizationId(null);
          }
        }}
        showManageButton={true}
      />

      {/* Subscription Management Dialog */}
      <OrganizationSubscriptionDialog
        organizationId={viewingSubscriptionOrgId}
        open={!!viewingSubscriptionOrgId}
        onOpenChange={(open) => {
          if (!open) {
            setViewingSubscriptionOrgId(null);
          }
        }}
      />
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

