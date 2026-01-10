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
import { PageHeader } from '@/components/layout/PageHeader';
import { TrendingUp as TrendingUpIcon } from 'lucide-react';

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
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title="Platform Administration"
        description="Manage the Nazim platform, organizations, subscriptions, and more"
        icon={<TrendingUpIcon className="h-5 w-5" />}
        showDescriptionOnMobile={false}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Total Organizations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.totalOrganizations}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSchools} schools
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
            <div className="text-xl sm:text-2xl font-bold">
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
            <div className="text-xl sm:text-2xl font-bold">
              {stats.pendingPayments + stats.pendingRenewals}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingPayments} payments, {stats.pendingRenewals} renewals
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Revenue This Year
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
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
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-2 flex-shrink-0">
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-2 flex-shrink-0">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Pending</span>
              <span className="hidden sm:inline">({stats.pendingPayments + stats.pendingRenewals})</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2 flex-shrink-0">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Subscriptions</span>
            </TabsTrigger>
            <TabsTrigger value="organizations" className="flex items-center gap-2 flex-shrink-0">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Organizations</span>
            </TabsTrigger>
            <TabsTrigger value="admins" className="flex items-center gap-2 flex-shrink-0">
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Admins</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Subscriptions by Plan */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Subscriptions by Plan</CardTitle>
              <CardDescription className="hidden md:block">
                Distribution of organizations across subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
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
            <CardContent className="p-4 sm:p-6">
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">
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
        </TabsContent>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {/* Pending Payments */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <CreditCard className="h-5 w-5 hidden sm:inline-flex" />
                <span>Pending Payments</span>
                {((pendingPayments?.data?.length) || 0) > 0 && (
                  <Badge variant="destructive">
                    {pendingPayments?.data?.length || 0}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isPaymentsLoading ? (
                <LoadingSpinner />
              ) : !pendingPayments?.data || pendingPayments.data.length === 0 ? (
                <p className="text-muted-foreground py-4">No pending payments</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Organization</TableHead>
                          <TableHead className="whitespace-nowrap">Amount</TableHead>
                          <TableHead className="hidden sm:table-cell whitespace-nowrap">Date</TableHead>
                          <TableHead className="hidden md:table-cell whitespace-nowrap">Status</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPayments.data.slice(0, 10).map((payment: any) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div>{payment.organization_name}</div>
                                <div className="sm:hidden mt-1 text-xs text-muted-foreground">
                                  {formatDate(new Date(payment.created_at))}
                                </div>
                                <div className="md:hidden mt-1">
                                  <Badge variant="outline" className="text-xs">{payment.status}</Badge>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {payment.amount?.toLocaleString()} {payment.currency}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {formatDate(new Date(payment.created_at))}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline">{payment.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="outline" asChild className="flex-shrink-0" aria-label="Review payment">
                                <Link to={`/platform/payments/${payment.id}`}>
                                  <Eye className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-2">Review</span>
                                </Link>
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

          {/* Pending Renewals */}
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <RefreshCw className="h-5 w-5 hidden sm:inline-flex" />
                <span>Pending Renewals</span>
                {((pendingRenewals?.data?.length) || 0) > 0 && (
                  <Badge variant="destructive">
                    {pendingRenewals?.data?.length || 0}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isRenewalsLoading ? (
                <LoadingSpinner />
              ) : !pendingRenewals?.data || pendingRenewals.data.length === 0 ? (
                <p className="text-muted-foreground py-4">No pending renewals</p>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Organization</TableHead>
                          <TableHead className="hidden md:table-cell whitespace-nowrap">Status</TableHead>
                          <TableHead className="hidden lg:table-cell whitespace-nowrap">Current Plan</TableHead>
                          <TableHead className="hidden lg:table-cell whitespace-nowrap">Requested Plan</TableHead>
                          <TableHead className="hidden sm:table-cell whitespace-nowrap">Requested Date</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
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
                              <div className="lg:hidden mt-1 space-y-0.5">
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
                                {renewal.subscription?.plan?.name && (
                                  <div className="text-xs text-muted-foreground">
                                    Current: {renewal.subscription.plan.name}
                                  </div>
                                )}
                                {renewal.requested_plan?.name && (
                                  <div className="text-xs text-muted-foreground">
                                    Requested: {renewal.requested_plan.name}
                                  </div>
                                )}
                                {renewal.requested_at && (
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(new Date(renewal.requested_at))}
                                  </div>
                                )}
                              </div>
                              {renewal.organization && (
                                <div className="text-xs text-muted-foreground space-y-0.5 hidden sm:block">
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
                          <TableCell className="hidden md:table-cell">
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
                          <TableCell className="hidden lg:table-cell">
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
                          <TableCell className="hidden lg:table-cell">
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
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {renewal.requested_at 
                              ? formatDate(new Date(renewal.requested_at))
                              : formatDate(new Date(renewal.created_at))}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
                              <Button size="sm" variant="outline" asChild className="flex-shrink-0" aria-label="Review renewal">
                                <Link to={`/platform/renewals/${renewal.id}`}>
                                  <Eye className="h-4 w-4" />
                                  <span className="hidden sm:inline ml-2">Review</span>
                                </Link>
                              </Button>
                              {renewal.organization_id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setViewingOrganizationId(renewal.organization_id)}
                                  aria-label="View organization"
                                  className="flex-shrink-0"
                                >
                                  <Building2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
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
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">All Subscriptions</CardTitle>
              <CardDescription className="hidden md:block">
                View and manage all organization subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {isSubscriptionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : !subscriptions || subscriptions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No subscriptions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Organization</TableHead>
                          <TableHead className="hidden md:table-cell whitespace-nowrap">Plan</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="hidden lg:table-cell whitespace-nowrap">Started</TableHead>
                          <TableHead className="hidden lg:table-cell whitespace-nowrap">Expires</TableHead>
                          <TableHead className="hidden md:table-cell text-right whitespace-nowrap">Amount Paid</TableHead>
                          <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                    <TableBody>
                      {subscriptions.map((sub: any) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div>{sub.organization?.name || 'Unknown Organization'}</div>
                              <div className="md:hidden mt-1 space-y-0.5">
                                <Badge variant="outline" className="text-xs">{sub.plan?.name || 'N/A'}</Badge>
                                {sub.started_at && (
                                  <div className="text-xs text-muted-foreground">
                                    Started: {formatDate(new Date(sub.started_at))}
                                  </div>
                                )}
                                {sub.expires_at && (
                                  <div className="text-xs text-muted-foreground">
                                    Expires: {formatDate(new Date(sub.expires_at))}
                                  </div>
                                )}
                                {sub.amount_paid > 0 && (
                                  <div className="text-xs font-medium">
                                    {sub.currency === 'AFN' ? '؋' : '$'}
                                    {sub.amount_paid.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline">{sub.plan?.name || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={sub.status} />
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {sub.started_at ? formatDate(new Date(sub.started_at)) : 'N/A'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {sub.expires_at ? formatDate(new Date(sub.expires_at)) : 'N/A'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-right">
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
                            <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewingOrganizationId(sub.organization_id)}
                                aria-label="View organization"
                                className="flex-shrink-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingSubscriptionOrgId(sub.organization_id)}
                                className="flex-shrink-0"
                                aria-label="Manage subscription"
                              >
                                <SettingsIcon className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">Manage</span>
                              </Button>
                            </div>
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

