import {
  Clock,
  CreditCard,
  RefreshCw,
  Calendar,
  Mail,
  Phone,
  DollarSign,
  MoreHorizontal,
  Building2,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="hidden lg:table-cell">Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(pendingPayments.data || []).map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium max-w-[200px]">
                            <div className="line-clamp-2 break-words">{payment.organization_name || payment.organization_id}</div>
                          </TableCell>
                          <TableCell>
                            {payment.amount?.toLocaleString()} {payment.currency}
                          </TableCell>
                          <TableCell>
                            {payment.payment_method?.replace('_', ' ') || 'N/A'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {formatDate(new Date(payment.created_at))}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{payment.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Desktop: Show button */}
                            <div className="hidden md:flex justify-end">
                              <Button size="sm" variant="outline" asChild className="flex-shrink-0">
                                <Link to={`/platform/payments/${payment.id}`}>
                                  Review
                                </Link>
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
                                  <DropdownMenuItem asChild>
                                    <Link to={`/platform/payments/${payment.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Review Payment
                                    </Link>
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
                  {(pendingPayments.data || []).map((payment: any) => (
                    <Card key={payment.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-base line-clamp-2 break-words">
                              {payment.organization_name || payment.organization_id}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-xs">
                                {payment.payment_method?.replace('_', ' ') || 'N/A'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {payment.status}
                              </Badge>
                            </div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label="Actions">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/platform/payments/${payment.id}`} className="flex items-center">
                                    <Eye className="mr-2 h-4 w-4" />
                                    Review Payment
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className="space-y-1.5 text-sm">
                          <div className="flex items-center gap-2 font-medium">
                            <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>
                              {payment.amount?.toLocaleString()} {payment.currency}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="text-xs">
                              {formatDate(new Date(payment.created_at))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
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
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Current Plan</TableHead>
                        <TableHead className="hidden lg:table-cell">Requested Plan</TableHead>
                        <TableHead className="hidden lg:table-cell">Requested Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(pendingRenewals.data || []).map((renewal: any) => (
                        <TableRow key={renewal.id}>
                          <TableCell className="max-w-[200px]">
                            <div className="space-y-1">
                              <div className="font-medium line-clamp-2 break-words">
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
                                      <Mail className="h-3 w-3" />
                                      <span>{renewal.organization.contact_person_email}</span>
                                    </div>
                                  )}
                                  {renewal.organization.contact_person_phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
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
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {renewal.requested_at 
                              ? formatDate(new Date(renewal.requested_at))
                              : formatDate(new Date(renewal.created_at))}
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Desktop: Show buttons */}
                            <div className="hidden md:flex items-center gap-1.5 sm:gap-2 justify-end">
                              <Button size="sm" variant="outline" asChild className="flex-shrink-0">
                                <Link to={`/platform/renewals/${renewal.id}`}>
                                  Review
                                </Link>
                              </Button>
                              {renewal.organization_id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setViewingOrganizationId(renewal.organization_id)}
                                  className="flex-shrink-0"
                                  aria-label="View organization"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
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
                                  <DropdownMenuItem asChild>
                                    <Link to={`/platform/renewals/${renewal.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Review Renewal
                                    </Link>
                                  </DropdownMenuItem>
                                  {renewal.organization_id && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => setViewingOrganizationId(renewal.organization_id)}>
                                        <Building2 className="mr-2 h-4 w-4" />
                                        View Organization
                                      </DropdownMenuItem>
                                    </>
                                  )}
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
                  {(pendingRenewals.data || []).map((renewal: any) => (
                    <Card key={renewal.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-base line-clamp-2 break-words">
                              {renewal.organization?.name || 'Unknown Organization'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1.5">
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
                                <DropdownMenuItem asChild>
                                  <Link to={`/platform/renewals/${renewal.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Review Renewal
                                  </Link>
                                </DropdownMenuItem>
                                {renewal.organization_id && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setViewingOrganizationId(renewal.organization_id)}>
                                      <Building2 className="mr-2 h-4 w-4" />
                                      View Organization
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {renewal.organization && (
                            <div className="space-y-1.5">
                              {renewal.organization.contact_person_name && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="text-xs">
                                    {renewal.organization.contact_person_name}
                                    {renewal.organization.contact_person_position && (
                                      <span className="text-muted-foreground ml-1">
                                        ({renewal.organization.contact_person_position})
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )}
                              {renewal.organization.contact_person_email && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="text-xs truncate">{renewal.organization.contact_person_email}</span>
                                </div>
                              )}
                              {renewal.organization.contact_person_phone && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="text-xs">{renewal.organization.contact_person_phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="pt-1.5 border-t space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Current Plan:</span>
                              <span className="text-xs font-medium">
                                {renewal.subscription?.plan?.name || 
                                 (renewal.subscription?.plan_id ? `Plan ID: ${renewal.subscription.plan_id}` : 'No Plan')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Requested Plan:</span>
                              <span className="text-xs font-medium">
                                {renewal.requested_plan?.name || 'N/A'}
                                {renewal.additional_schools > 0 && (
                                  <span className="text-muted-foreground ml-1">
                                    (+{renewal.additional_schools} schools)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="text-xs">
                                {renewal.requested_at 
                                  ? formatDate(new Date(renewal.requested_at))
                                  : formatDate(new Date(renewal.created_at))}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
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

