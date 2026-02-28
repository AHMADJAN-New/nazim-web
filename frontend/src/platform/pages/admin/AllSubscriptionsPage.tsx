import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Calendar,
  Settings as SettingsIcon,
  MoreHorizontal,
} from 'lucide-react';
import { useMemo, useState } from 'react';

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import { formatDate } from '@/lib/utils';
import { OrganizationDetailsDialog } from '@/platform/components/OrganizationDetailsDialog';
import { OrganizationSubscriptionDialog } from '@/platform/components/OrganizationSubscriptionDialog';
import { usePlatformSubscriptions } from '@/platform/hooks/usePlatformAdmin';

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
      className={
        status === 'active' ? 'bg-green-500' :
        status === 'trial' ? 'bg-blue-500' :
        status === 'grace_period' ? 'bg-yellow-500 text-yellow-900' :
        status === 'readonly' ? 'bg-orange-500' :
        ''
      }
    >
      {config.label}
    </Badge>
  );
}

export default function AllSubscriptionsPage() {
  const { data: subscriptions, isLoading: isSubscriptionsLoading, error: subscriptionsError } =
    usePlatformSubscriptions({});
  const [viewingOrganizationId, setViewingOrganizationId] = useState<string | null>(null);
  const [viewingSubscriptionOrgId, setViewingSubscriptionOrgId] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  type SubscriptionRow = {
    id: string;
    organization_id: string;
    status: string;
    started_at?: string | null;
    expires_at?: string | null;
    amount_paid: number;
    currency: string;
    organization?: { name?: string | null } | null;
    plan?: { name?: string | null } | null;
  };

  const normalizedSubscriptions = useMemo<SubscriptionRow[]>(
    () => (Array.isArray(subscriptions) ? (subscriptions as SubscriptionRow[]) : []),
    [subscriptions]
  );

  const subscriptionCounts = useMemo(() => {
    const active = normalizedSubscriptions.filter((sub) => sub.status === 'active').length;
    const trial = normalizedSubscriptions.filter((sub) => sub.status === 'trial').length;
    const atRisk = normalizedSubscriptions.filter((sub) =>
      ['grace_period', 'readonly', 'expired'].includes(sub.status)
    ).length;
    const suspendedOrCancelled = normalizedSubscriptions.filter((sub) =>
      ['suspended', 'cancelled'].includes(sub.status)
    ).length;

    return {
      all: normalizedSubscriptions.length,
      active,
      trial,
      atRisk,
      suspendedOrCancelled,
    };
  }, [normalizedSubscriptions]);

  const filteredSubscriptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const byStatus = normalizedSubscriptions.filter((sub) => {
      if (statusTab === 'all') return true;
      if (statusTab === 'active') return sub.status === 'active';
      if (statusTab === 'trial') return sub.status === 'trial';
      if (statusTab === 'at_risk') return ['grace_period', 'readonly', 'expired'].includes(sub.status);
      if (statusTab === 'suspended') return ['suspended', 'cancelled'].includes(sub.status);
      return true;
    });

    if (!query) {
      return byStatus;
    }

    return byStatus.filter((sub) => {
      const orgName = sub.organization?.name?.toLowerCase() ?? '';
      const planName = sub.plan?.name?.toLowerCase() ?? '';
      const status = sub.status?.toLowerCase() ?? '';
      return orgName.includes(query) || planName.includes(query) || status.includes(query);
    });
  }, [normalizedSubscriptions, searchQuery, statusTab]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">All Subscriptions</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          View and manage all organization subscriptions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>
            Complete list of all organization subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-3 sm:p-6">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-semibold">{subscriptionCounts.all}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <p className="text-xl font-semibold">{subscriptionCounts.active}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-muted-foreground">Trial</p>
                </div>
                <p className="text-xl font-semibold">{subscriptionCounts.trial}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <p className="text-xs text-muted-foreground">At Risk</p>
                </div>
                <p className="text-xl font-semibold">{subscriptionCounts.atRisk}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">Suspended/Cancelled</p>
                <p className="text-xl font-semibold">{subscriptionCounts.suspendedOrCancelled}</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organization, plan, status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Showing {filteredSubscriptions.length} of {subscriptionCounts.all}
            </p>
          </div>

          <Tabs value={statusTab} onValueChange={setStatusTab} className="space-y-4">
            <div className="overflow-x-auto pb-1">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5">
                <TabsTrigger value="all">All ({subscriptionCounts.all})</TabsTrigger>
                <TabsTrigger value="active">Active ({subscriptionCounts.active})</TabsTrigger>
                <TabsTrigger value="trial">Trial ({subscriptionCounts.trial})</TabsTrigger>
                <TabsTrigger value="at_risk">At Risk ({subscriptionCounts.atRisk})</TabsTrigger>
                <TabsTrigger value="suspended">
                  Suspended ({subscriptionCounts.suspendedOrCancelled})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={statusTab}>
          {isSubscriptionsLoading ? (
            <div className="flex items-center justify-center py-8 px-4 sm:px-0">
              <LoadingSpinner />
            </div>
          ) : subscriptionsError ? (
            <div className="py-8 text-center px-4 sm:px-0">
              <p className="text-destructive">Error loading subscriptions</p>
              {import.meta.env.DEV && (
                <p className="text-xs mt-2 text-muted-foreground">
                  {subscriptionsError instanceof Error ? subscriptionsError.message : String(subscriptionsError)}
                </p>
              )}
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground px-4 sm:px-0">
              <p>No subscriptions found for this filter</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Started</TableHead>
                      <TableHead className="hidden lg:table-cell">Expires</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium max-w-[200px]">
                          <div className="line-clamp-2 break-words">{sub.organization?.name || 'Unknown Organization'}</div>
                        </TableCell>
                        <TableCell>
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
                          {/* Desktop: Show buttons */}
                          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 justify-end">
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
                          
                          {/* Mobile: Show dropdown */}
                          <div className="md:hidden flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label="Actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewingOrganizationId(sub.organization_id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Organization
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setViewingSubscriptionOrgId(sub.organization_id)}>
                                  <SettingsIcon className="mr-2 h-4 w-4" />
                                  Manage Subscription
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredSubscriptions.map((sub) => (
                  <Card key={sub.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-base line-clamp-2 break-words">
                            {sub.organization?.name || 'Unknown Organization'}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className="text-xs">
                              {sub.plan?.name || 'N/A'}
                            </Badge>
                            <StatusBadge status={sub.status} />
                          </div>
                        </div>
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label="Actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewingOrganizationId(sub.organization_id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Organization
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setViewingSubscriptionOrgId(sub.organization_id)}>
                                  <SettingsIcon className="mr-2 h-4 w-4" />
                                  Manage Subscription
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                      </div>
                      
                      <div className="space-y-1.5 text-sm">
                        {sub.started_at && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">Started: {formatDate(new Date(sub.started_at))}</span>
                          </div>
                        )}
                        {sub.expires_at && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">Expires: {formatDate(new Date(sub.expires_at))}</span>
                          </div>
                        )}
                        {sub.amount_paid > 0 && (
                          <div className="flex items-center gap-2 font-medium">
                            <span className="text-xs text-muted-foreground">Amount Paid:</span>
                            <span className="text-sm">
                              {sub.currency === 'AFN' ? '؋' : '$'}
                              {sub.amount_paid.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
