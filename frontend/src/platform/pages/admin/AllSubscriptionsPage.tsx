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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePlatformSubscriptions } from '@/platform/hooks/usePlatformAdmin';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading';
import { OrganizationDetailsDialog } from '@/platform/components/OrganizationDetailsDialog';
import { OrganizationSubscriptionDialog } from '@/platform/components/OrganizationSubscriptionDialog';

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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">All Subscriptions</h1>
        <p className="text-muted-foreground">
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
        <CardContent>
          {isSubscriptionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : subscriptionsError ? (
            <div className="py-8 text-center">
              <p className="text-destructive">Error loading subscriptions</p>
              {import.meta.env.DEV && (
                <p className="text-xs mt-2 text-muted-foreground">
                  {subscriptionsError instanceof Error ? subscriptionsError.message : String(subscriptionsError)}
                </p>
              )}
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

