import {
  Clock,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { Users, Eye } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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
import { cn } from '@/lib/utils';
import { OrganizationDetailsDialog } from '@/platform/components/OrganizationDetailsDialog';
import { OrganizationSubscriptionDialog } from '@/platform/components/OrganizationSubscriptionDialog';
import {
  usePlatformPendingPayments,
  usePlatformPendingRenewals,
} from '@/platform/hooks/usePlatformAdmin';

export default function PendingActionsPage() {
  const { t } = useLanguage();
  const { data: pendingPayments, isLoading: isPaymentsLoading } =
    usePlatformPendingPayments();
  const { data: pendingRenewals, isLoading: isRenewalsLoading } =
    usePlatformPendingRenewals();
  const [viewingOrganizationId, setViewingOrganizationId] = useState<string | null>(null);
  const [viewingSubscriptionOrgId, setViewingSubscriptionOrgId] = useState<string | null>(null);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Pending Actions</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Review and process pending payments and renewal requests
        </p>
      </div>

      <div className="space-y-6">
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
            <CardDescription>
              Manual payments awaiting confirmation
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {isPaymentsLoading ? (
              <div className="flex items-center justify-center py-8 px-4 sm:px-0">
                <LoadingSpinner />
              </div>
            ) : !pendingPayments?.data?.length ? (
              <div className="py-8 text-center text-muted-foreground px-4 sm:px-0">
                No pending payments
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="hidden md:table-cell">Payment Method</TableHead>
                        <TableHead className="hidden lg:table-cell">Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                <TableBody>
                  {(pendingPayments.data || []).map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div>
                          {payment.organization_name || payment.organization_id}
                          <div className="md:hidden mt-1 text-xs text-muted-foreground">
                            {payment.payment_method?.replace('_', ' ') || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {payment.amount?.toLocaleString()} {payment.currency}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {payment.payment_method?.replace('_', ' ') || 'N/A'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {formatDate(new Date(payment.created_at))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{payment.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild className="flex-shrink-0">
                          <Link to={`/platform/payments/${payment.id}`}>
                            <span className="hidden sm:inline">Review</span>
                            <span className="sm:hidden">View</span>
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
              {((pendingRenewals?.data?.length || 0) > 0) && (
                <Badge variant="secondary">
                  {pendingRenewals?.data?.length || 0}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Renewal requests awaiting processing
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {isRenewalsLoading ? (
              <div className="flex items-center justify-center py-8 px-4 sm:px-0">
                <LoadingSpinner />
              </div>
            ) : !pendingRenewals?.data?.length ? (
              <div className="py-8 text-center text-muted-foreground px-4 sm:px-0">
                No pending renewals
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden lg:table-cell">Current Plan</TableHead>
                      <TableHead className="hidden lg:table-cell">Requested Plan</TableHead>
                      <TableHead className="hidden md:table-cell">Requested Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {(pendingRenewals.data || []).map((renewal: any) => (
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
                            renewal.status === 'pending' && 'bg-yellow-500',
                            'text-xs'
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
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {renewal.requested_at 
                          ? formatDate(new Date(renewal.requested_at))
                          : formatDate(new Date(renewal.created_at))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button size="sm" variant="outline" asChild className="flex-shrink-0">
                            <Link to={`/platform/renewals/${renewal.id}`}>
                              <span className="hidden sm:inline">Review</span>
                              <span className="sm:hidden">View</span>
                            </Link>
                          </Button>
                          {renewal.organization_id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setViewingOrganizationId(renewal.organization_id)}
                              aria-label="View organization"
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
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

