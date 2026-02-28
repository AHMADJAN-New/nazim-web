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
} from 'lucide-react';
import { useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { platformApi } from '@/platform/lib/platformApi';
import { usePlatformPayment } from '@/platform/hooks/usePlatformAdmin';
import { showToast } from '@/lib/toast';

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  license: 'License Fee',
  maintenance: 'Maintenance Fee',
  renewal: 'Renewal',
};

export default function PaymentReviewPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: permissions } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const { data: payment, isLoading, error } = usePlatformPayment(paymentId || null);

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!paymentId || !payment) return;
      if (payment.payment_type === 'license') {
        return platformApi.licenseFees.confirmPayment(paymentId);
      }
      if (payment.payment_type === 'maintenance') {
        return platformApi.maintenanceFees.confirmPayment(paymentId);
      }
      return platformApi.payments.confirm(paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['platform-payment', paymentId] });
      showToast.success('Payment confirmed');
      navigate('/platform/pending');
    },
    onError: (err: Error) => {
      showToast.error(err.message || 'Failed to confirm payment');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!paymentId) return;
      return platformApi.payments.reject(paymentId, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['platform-payment', paymentId] });
      setIsRejectDialogOpen(false);
      setRejectReason('');
      showToast.success('Payment rejected');
      navigate('/platform/pending');
    },
    onError: (err: Error) => {
      showToast.error(err.message || 'Failed to reject payment');
    },
  });

  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  if (!paymentId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">Payment ID is required</p>
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

  if (error || !payment) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">Failed to load payment</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Payment not found'}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button asChild variant="outline">
              <Link to="/platform/pending">Back to Pending</Link>
            </Button>
            <Button asChild>
              <Link to="/platform/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const statusConfig: Record<
    string,
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: typeof CheckCircle }
  > = {
    pending: {
      variant: 'secondary',
      label: 'Pending',
      icon: Clock,
    },
    confirmed: {
      variant: 'default',
      label: 'Confirmed',
      icon: CheckCircle,
    },
    rejected: {
      variant: 'destructive',
      label: 'Rejected',
      icon: XCircle,
    },
  };

  const statusInfo = statusConfig[payment.status] || statusConfig.pending;
  const StatusIcon = statusInfo.icon;

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    rejectMutation.mutate(rejectReason);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
            <Link to="/platform/pending">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Review Payment
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Review and confirm or reject this payment
            </p>
          </div>
        </div>
        <Badge
          variant={statusInfo.variant}
          className={cn(
            'flex items-center gap-2',
            payment.status === 'pending' && 'bg-amber-500/20 text-amber-800 dark:text-amber-200',
            payment.status === 'confirmed' && 'bg-green-500/20 text-green-800 dark:text-green-200',
            payment.status === 'rejected' && 'bg-red-500/20 text-red-800 dark:text-red-200'
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {statusInfo.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Organization</div>
              <div className="mt-1 font-medium">
                {payment.organization?.name || payment.organization_id}
              </div>
            </div>
            {payment.subscription?.plan && (
              <div>
                <div className="text-sm text-muted-foreground">Plan</div>
                <div className="mt-1 font-medium flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {payment.subscription.plan.name}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Type</div>
                <div className="mt-1 font-medium">
                  {PAYMENT_TYPE_LABELS[payment.payment_type] || payment.payment_type}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Amount</div>
                <div className="mt-1 font-medium">
                  {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  {payment.currency}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Payment Method</div>
                <div className="mt-1 font-medium">
                  {(payment.payment_method || '').replace(/_/g, ' ')}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Payment Date</div>
                <div className="mt-1 font-medium">
                  {payment.payment_date ? formatDate(new Date(payment.payment_date)) : '-'}
                </div>
              </div>
            </div>
            {payment.payment_reference && (
              <div>
                <div className="text-sm text-muted-foreground">Reference</div>
                <div className="mt-1 font-medium">{payment.payment_reference}</div>
              </div>
            )}
            {payment.notes && (
              <div>
                <div className="text-sm text-muted-foreground">Notes</div>
                <div className="mt-1 text-sm">{payment.notes}</div>
              </div>
            )}
            {payment.confirmed_at && (
              <div>
                <div className="text-sm text-muted-foreground">Confirmed</div>
                <div className="mt-1 text-sm">
                  {formatDateTime(new Date(payment.confirmed_at))}
                  {payment.confirmed_by && ` by ${payment.confirmed_by}`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {payment.status === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Confirm or reject this payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending || rejectMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
              <Button
                variant="destructive"
                onClick={() => setIsRejectDialogOpen(true)}
                disabled={confirmMutation.isPending || rejectMutation.isPending}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter the reason for rejecting this payment..."
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
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Reject Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
