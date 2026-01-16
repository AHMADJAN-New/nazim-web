import {
  RefreshCw,
  Users,
  Eye,
} from 'lucide-react';
import { useState } from 'react';

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
import { useLanguage } from '@/hooks/useLanguage';
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
  const { t } = useLanguage();
  const { data: subscriptions, isLoading: isSubscriptionsLoading, error: subscriptionsError } =
    usePlatformSubscriptions({});
  const [viewingOrganizationId, setViewingOrganizationId] = useState<string | null>(null);
  const [viewingSubscriptionOrgId, setViewingSubscriptionOrgId] = useState<string | null>(null);

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
        <CardContent className="p-0 sm:p-6">
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
          ) : !subscriptions || subscriptions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground px-4 sm:px-0">
              <p>No subscriptions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead className="hidden md:table-cell">Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Started</TableHead>
                      <TableHead className="hidden lg:table-cell">Expires</TableHead>
                      <TableHead className="hidden md:table-cell text-right">Amount Paid</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
              <TableBody>
                {subscriptions.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">
                      <div>
                        {sub.organization?.name || 'Unknown Organization'}
                        <div className="md:hidden mt-1">
                          <Badge variant="outline" className="text-xs">{sub.plan?.name || 'N/A'}</Badge>
                        </div>
                        <div className="md:hidden mt-1 text-xs text-muted-foreground">
                          {sub.started_at && formatDate(new Date(sub.started_at))}
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
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewingOrganizationId(sub.organization_id)}
                          aria-label="View organization"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingSubscriptionOrgId(sub.organization_id)}
                          className="flex-shrink-0"
                        >
                          <span className="hidden sm:inline">Manage</span>
                          <span className="sm:hidden">Edit</span>
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

