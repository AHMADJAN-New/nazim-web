import {
  ArrowLeft,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  Building2,
  Package,
  CreditCard,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import {
  usePlatformRenewalRequest,
  usePlatformApproveRenewal,
  usePlatformRejectRenewal,
} from '@/platform/hooks/usePlatformAdminComplete';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function RenewalReviewPage() {
  const { renewalId } = useParams<{ renewalId: string }>();
  const navigate = useNavigate();

  const { data: renewal, isLoading, error } = usePlatformRenewalRequest(
    renewalId || ''
  );
  const approveRenewal = usePlatformApproveRenewal();
  const rejectRenewal = usePlatformRejectRenewal();

  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // Payment form state (for manual payment entry)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    currency: 'AFN' as 'AFN' | 'USD',
    payment_method: 'cash' as 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other',
    payment_reference: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Handle missing renewalId
  if (!renewalId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            Renewal ID is required
          </p>
          <Button asChild className="mt-4">
            <Link to="/platform/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !renewal) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            Failed to load renewal request
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <Button asChild className="mt-4">
            <Link to="/platform/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleApprove = () => {
    const payload: {
      renewalId: string;
      amount?: number;
      currency?: 'AFN' | 'USD';
      payment_method?: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other';
      payment_reference?: string;
      payment_date?: string;
      notes?: string;
    } = {
      renewalId: renewal.id,
    };

    // If no payment record exists, include payment data
    if (!renewal.payment_record) {
      if (!paymentData.amount || !paymentData.payment_date) {
        return; // Validation will be handled by backend
      }
      payload.amount = Number(paymentData.amount);
      payload.currency = paymentData.currency;
      payload.payment_method = paymentData.payment_method;
      payload.payment_reference = paymentData.payment_reference || undefined;
      payload.payment_date = paymentData.payment_date;
      payload.notes = paymentData.notes || undefined;
    }

    approveRenewal.mutate(payload, {
      onSuccess: () => {
        setIsApproveDialogOpen(false);
        setPaymentData({
          amount: '',
          currency: 'AFN',
          payment_method: 'cash',
          payment_reference: '',
          payment_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
        navigate('/platform/dashboard');
      },
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      return;
    }
    rejectRenewal.mutate(
      {
        renewalId: renewal.id,
        reason: rejectReason,
      },
      {
        onSuccess: () => {
          setIsRejectDialogOpen(false);
          setRejectReason('');
          navigate('/platform/dashboard');
        },
      }
    );
  };

  const statusConfig: Record<
    string,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: typeof CheckCircle }
  > = {
    pending: {
      variant: 'secondary',
      label: 'Pending',
      icon: Clock,
    },
    approved: {
      variant: 'default',
      label: 'Approved',
      icon: CheckCircle,
    },
    rejected: {
      variant: 'destructive',
      label: 'Rejected',
      icon: XCircle,
    },
  };

  const statusInfo = statusConfig[renewal.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/platform/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Review Renewal Request
            </h1>
            <p className="text-muted-foreground">
              Review and process renewal request for organization
            </p>
          </div>
        </div>
        <Badge
          variant={statusInfo.variant}
          className={cn(
            'flex items-center gap-2',
            renewal.status === 'pending' && 'bg-yellow-500',
            renewal.status === 'approved' && 'bg-green-500',
            renewal.status === 'rejected' && 'bg-red-500'
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Organization Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Organization</div>
              <div className="mt-1 font-medium">
                {renewal.organization?.name || renewal.organization_id}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Requested At</div>
              <div className="mt-1 font-medium">
                {formatDateTime(new Date(renewal.requested_at))}
              </div>
            </div>
            {renewal.processed_at && (
              <div>
                <div className="text-sm text-muted-foreground">Processed At</div>
                <div className="mt-1 font-medium">
                  {formatDateTime(new Date(renewal.processed_at))}
                </div>
              </div>
            )}
            {renewal.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="mt-1 text-sm">{renewal.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Plan Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">
                Current Plan
              </div>
              <div className="mt-1 font-medium">
                {renewal.subscription?.plan?.name || 'No Plan'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Requested Plan
              </div>
              <div className="mt-1 font-medium">
                {renewal.requested_plan?.name || 'Unknown Plan'}
              </div>
              {renewal.requested_plan?.description && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {renewal.requested_plan.description}
                </div>
              )}
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Additional Schools
              </div>
              <div className="mt-1 font-medium">
                {renewal.additional_schools || 0}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Information */}
      {renewal.payment_record && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="mt-1 font-medium">
                  {renewal.payment_record.amount.toLocaleString()}{' '}
                  {renewal.payment_record.currency}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Payment Method
                </div>
                <div className="mt-1 font-medium">
                  {renewal.payment_record.payment_method?.replace('_', ' ')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <div className="mt-1">
                  <Badge
                    variant={
                      renewal.payment_record.status === 'confirmed'
                        ? 'default'
                        : renewal.payment_record.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {renewal.payment_record.status}
                  </Badge>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Payment Date</div>
                <div className="mt-1 font-medium">
                  {formatDate(new Date(renewal.payment_record.payment_date))}
                </div>
              </div>
            </div>
            {renewal.payment_record.payment_reference && (
              <div>
                <div className="text-sm text-muted-foreground">
                  Payment Reference
                </div>
                <div className="mt-1 font-medium">
                  {renewal.payment_record.payment_reference}
                </div>
              </div>
            )}
            {renewal.payment_record.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Payment Notes</div>
                <div className="mt-1 text-sm">
                  {renewal.payment_record.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rejection Reason */}
      {renewal.status === 'rejected' && renewal.rejection_reason && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Rejection Reason
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{renewal.rejection_reason}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {renewal.status === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Approve or reject this renewal request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsApproveDialogOpen(true)}
                disabled={approveRenewal.isPending || rejectRenewal.isPending}
              >
                {approveRenewal.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Renewal
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsRejectDialogOpen(true)}
                disabled={approveRenewal.isPending || rejectRenewal.isPending}
              >
                {rejectRenewal.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Renewal
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Approve Renewal Request</DialogTitle>
            <DialogDescription>
              Review the details before approving this renewal request
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Summary Card */}
            <div className="rounded-lg border bg-gradient-to-br from-muted/50 to-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4 text-primary" />
                <span>{renewal.organization?.name || renewal.organization_id}</span>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-2 rounded-md bg-background/50">
                  <span className="text-xs font-medium text-muted-foreground">Current Plan</span>
                  <span className="text-sm font-semibold">
                    {renewal.subscription?.plan?.name || 'No Plan'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-primary/5 border border-primary/20">
                  <span className="text-xs font-medium text-muted-foreground">Requested Plan</span>
                  <span className="text-sm font-semibold text-primary">
                    {renewal.requested_plan?.name || 'Unknown Plan'}
                  </span>
                </div>
                {renewal.additional_schools > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-background/50">
                    <span className="text-xs font-medium text-muted-foreground">Additional Schools</span>
                    <span className="text-sm font-semibold">{renewal.additional_schools}</span>
                  </div>
                )}
                {renewal.payment_record && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <span className="text-xs font-medium text-muted-foreground">Payment Amount</span>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      {renewal.payment_record.amount.toLocaleString()} {renewal.payment_record.currency}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* What will happen */}
            <div className="rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="text-sm font-semibold text-primary">What will happen:</div>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>The payment record will be confirmed</li>
                    <li>The subscription will be updated to the requested plan</li>
                    {renewal.additional_schools > 0 && (
                      <li>{renewal.additional_schools} additional school(s) will be added</li>
                    )}
                    <li>The subscription status will be set to active</li>
                    <li>The renewal request will be marked as approved</li>
                  </ul>
                </div>
              </div>
            </div>

            {!renewal.payment_record && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/50 to-amber-50/30 dark:from-amber-950/20 dark:to-amber-950/10 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Record Manual Payment
                    </div>
                    <div className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                      Enter payment details to proceed with approval
                    </div>
                  </div>
                </div>
                
                {/* Payment Form */}
                <div className="grid gap-3 grid-cols-2 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount" className="text-xs font-medium">
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={paymentData.amount}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, amount: e.target.value })
                      }
                      placeholder="0.00"
                      className="h-9"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-currency" className="text-xs font-medium">
                      Currency <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={paymentData.currency}
                      onValueChange={(value: 'AFN' | 'USD') =>
                        setPaymentData({ ...paymentData, currency: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AFN">AFN</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-method" className="text-xs font-medium">
                      Payment Method <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={paymentData.payment_method}
                      onValueChange={(
                        value: 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'other'
                      ) =>
                        setPaymentData({ ...paymentData, payment_method: value })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-date" className="text-xs font-medium">
                      Payment Date <span className="text-destructive">*</span>
                    </Label>
                    <CalendarDatePicker
                      date={
                        paymentData.payment_date
                          ? new Date(paymentData.payment_date)
                          : undefined
                      }
                      onDateChange={(date) =>
                        setPaymentData({
                          ...paymentData,
                          payment_date: date
                            ? date.toISOString().split('T')[0]
                            : '',
                        })
                      }
                      placeholder="Select date"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="payment-reference" className="text-xs font-medium">
                      Payment Reference
                    </Label>
                    <Input
                      id="payment-reference"
                      value={paymentData.payment_reference}
                      onChange={(e) =>
                        setPaymentData({
                          ...paymentData,
                          payment_reference: e.target.value,
                        })
                      }
                      placeholder="Receipt or reference number (optional)"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="payment-notes" className="text-xs font-medium">
                      Notes
                    </Label>
                    <Textarea
                      id="payment-notes"
                      value={paymentData.notes}
                      onChange={(e) =>
                        setPaymentData({ ...paymentData, notes: e.target.value })
                      }
                      placeholder="Optional notes about this payment"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={approveRenewal.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={
                approveRenewal.isPending ||
                (!renewal.payment_record &&
                  (!paymentData.amount || !paymentData.payment_date))
              }
            >
              {approveRenewal.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Renewal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Renewal Request</DialogTitle>
            <DialogDescription>
              Reject this renewal request. Provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Rejection Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejecting this renewal request..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectRenewal.isPending}
            >
              {rejectRenewal.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject Renewal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

