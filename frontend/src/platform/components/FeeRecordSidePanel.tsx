import { Building2, ExternalLink, Package, CreditCard } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { formatDate } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';
import { LicenseFeeStatusCard } from '@/platform/components/LicenseFeeStatusCard';
import { MaintenanceFeeStatusCard } from '@/platform/components/MaintenanceFeeStatusCard';
import type { OrganizationSubscription } from '@/types/api/subscription';

interface FeeRecordSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  organizationName: string;
  type: 'license' | 'maintenance';
}

export function FeeRecordSidePanel({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  type,
}: FeeRecordSidePanelProps) {
  const { data: subscriptionData, isLoading: subLoading } = useQuery({
    queryKey: ['platform-organization-subscription', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const res = await platformApi.subscriptions.get(organizationId);
      return res.data;
    },
    enabled: open && !!organizationId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: revenueHistory, isLoading: revenueLoading } = useQuery({
    queryKey: ['platform-organization-revenue-history', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const res = await platformApi.subscriptions.getRevenueHistory(organizationId);
      return res.data;
    },
    enabled: open && !!organizationId,
    staleTime: 2 * 60 * 1000,
  });

  const subscription = subscriptionData?.subscription ?? null;
  const rawStatus = subscriptionData?.status ?? subscription?.status;
  const statusLabel =
    typeof rawStatus === 'object' && rawStatus !== null && 'status' in rawStatus
      ? (rawStatus as { status?: string }).status
      : typeof rawStatus === 'string'
        ? rawStatus
        : subscription?.status ?? '—';
  const recentPayments = revenueHistory?.payments?.slice(0, 5) ?? [];

  const isLicenseFocus = type === 'license';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {organizationName || 'Subscription'}
          </SheetTitle>
          <SheetDescription>
            {isLicenseFocus ? 'License fee status and subscription' : 'Maintenance fee status and subscription'}
          </SheetDescription>
        </SheetHeader>

        {subLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {subscription?.plan && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {subscription.plan.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Status: {statusLabel}
                  {subscription?.currency && ` · ${subscription.currency}`}
                </div>
              </div>
            )}

            {isLicenseFocus ? (
              <>
                <LicenseFeeStatusCard
                  subscription={subscription as OrganizationSubscription | null}
                  organizationId={organizationId ?? ''}
                />
                <MaintenanceFeeStatusCard
                  subscription={subscription as OrganizationSubscription | null}
                  organizationId={organizationId ?? ''}
                />
              </>
            ) : (
              <>
                <MaintenanceFeeStatusCard
                  subscription={subscription as OrganizationSubscription | null}
                  organizationId={organizationId ?? ''}
                />
                <LicenseFeeStatusCard
                  subscription={subscription as OrganizationSubscription | null}
                  organizationId={organizationId ?? ''}
                />
              </>
            )}

            {!revenueLoading && recentPayments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Recent Payments
                </h4>
                <ul className="space-y-2">
                  {recentPayments.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0"
                    >
                      <span className="text-muted-foreground">
                        {p.payment_type_label} · {formatDate(new Date(p.confirmed_at || p.created_at || p.payment_date || ''))}
                      </span>
                      <span className="font-medium">
                        {p.net_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                        {p.currency}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {organizationId && (
              <div className="pt-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link to={`/platform/organizations/${organizationId}/subscription`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open full subscription page
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
