import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Package,
  RefreshCw,
  XCircle,
  Lock,
  CreditCard,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, Link, Navigate } from 'react-router-dom';

import { OrganizationPermissionManagement } from '@/components/settings/OrganizationPermissionManagement';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { usePlatformPlans, usePlatformOrganization } from '@/platform/hooks/usePlatformAdmin';
import {
  usePlatformOrganizationSubscription,
  usePlatformActivateSubscription,
  usePlatformSuspendSubscription,
  usePlatformToggleFeature,
} from '@/platform/hooks/usePlatformAdminComplete';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { platformApi } from '@/platform/lib/platformApi';
import { showToast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import type * as SubscriptionApi from '@/types/api/subscription';

export default function OrganizationSubscriptionDetail() {
  const { organizationId } = useParams<{ organizationId: string }>();
  
  const { data: platformPermissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = platformPermissions?.includes('subscription.admin') ?? false;

  const { data, isLoading, error } = usePlatformOrganizationSubscription(
    organizationId || ''
  );
  const { data: organization } = usePlatformOrganization(organizationId || null);
  const { data: plans } = usePlatformPlans();

  const activateSubscription = usePlatformActivateSubscription();
  const suspendSubscription = usePlatformSuspendSubscription();
  const toggleFeature = usePlatformToggleFeature();
  const queryClient = useQueryClient();

  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [isLicensePaymentDialogOpen, setIsLicensePaymentDialogOpen] = useState(false);
  const [isMaintenancePaymentDialogOpen, setIsMaintenancePaymentDialogOpen] = useState(false);
  const [activateFormData, setActivateFormData] = useState({
    plan_id: '',
    currency: 'AFN' as 'AFN' | 'USD',
    amount_paid: 0,
    additional_schools: 0,
    notes: '',
  });
  const [suspendReason, setSuspendReason] = useState('');

  // Payment form schemas
  const paymentFormSchema = z.object({
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    currency: z.enum(['AFN', 'USD']),
    payment_method: z.enum(['bank_transfer', 'cash', 'check', 'mobile_money', 'other']),
    payment_reference: z.string().optional(),
    payment_date: z.string().min(1, 'Payment date is required'),
    notes: z.string().optional(),
  });

  type PaymentFormData = z.infer<typeof paymentFormSchema>;

  const licensePaymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      currency: 'AFN',
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  const maintenancePaymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      currency: 'AFN',
      payment_method: 'bank_transfer',
      payment_date: new Date().toISOString().split('T')[0],
    },
  });

  // Show loading while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  // Access control - redirect if no permission
  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  // Handle missing organizationId
  if (!organizationId) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">
            Organization ID is required
          </p>
          <Button asChild className="mt-4">
            <Link to="/platform/organizations">Back to Organizations</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  // Handle error - but still try to render if we have partial data
  if (error && !data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-lg font-medium text-destructive mb-2">
            Failed to load subscription details
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
          <Button asChild className="mt-4">
            <Link to="/platform/organizations">Back to Organizations</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Extract data with defaults - allow rendering even if subscription is null
  const subscription = data?.subscription || null;
  const statusObj = data?.status || { status: 'none', message: 'No subscription data' };
  const status = statusObj.status || 'none';
  const usage = data?.usage || {};
  const features = Array.isArray(data?.features) ? data.features : [];

  const handleActivate = () => {
    if (!activateFormData.plan_id) {
      return;
    }
    
    const payload: SubscriptionApi.ActivateSubscriptionData = {
      plan_id: activateFormData.plan_id,
      currency: activateFormData.currency,
      amount_paid: Number(activateFormData.amount_paid) || 0,
      additional_schools: Number(activateFormData.additional_schools) || 0,
      notes: activateFormData.notes?.trim() || null,
    };
    
    activateSubscription.mutate(
      {
        organizationId,
        ...payload,
      },
      {
        onSuccess: () => {
          setIsActivateDialogOpen(false);
          setActivateFormData({
            plan_id: '',
            currency: 'AFN',
            amount_paid: 0,
            additional_schools: 0,
            notes: '',
          });
        },
      }
    );
  };

  const handleSuspend = () => {
    if (!suspendReason.trim()) {
      return;
    }
    suspendSubscription.mutate(
      {
        organizationId,
        reason: suspendReason,
      },
      {
        onSuccess: () => {
          setIsSuspendDialogOpen(false);
          setSuspendReason('');
        },
      }
    );
  };

  const selectedPlan = plans?.find((p) => p.id === activateFormData.plan_id);

  // Group features by category
  const featuresByCategory = features.reduce((acc, feature) => {
    const category = feature.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {} as Record<string, typeof features>);

  const categoryLabels: Record<string, string> = {
    core: 'Core Features',
    academic: 'Academic',
    finance: 'Finance',
    documents: 'Documents',
    events: 'Events',
    library: 'Library',
    hostel: 'Hostel',
    hr: 'Human Resources',
    id_cards: 'ID Cards',
    templates: 'Templates',
    courses: 'Courses',
    enterprise: 'Enterprise',
    branding: 'Branding',
    storage: 'Storage',
    assets: 'Assets',
    other: 'Other',
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/platform/organizations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Subscription Management
            </h1>
            <p className="text-muted-foreground">
              {organization ? (
                <>Manage subscription for <strong>{organization.name}</strong></>
              ) : (
                <>Manage subscription for organization: {organizationId}</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Subscription Status
          </CardTitle>
          <CardDescription>
            Current subscription information and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <StatusBadge status={subscription.status} />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Plan</div>
                  <div className="mt-1 font-medium">
                    {subscription.plan?.name || 'No Plan'}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Started At
                  </div>
                  <div className="mt-1 font-medium">
                    {subscription.started_at
                      ? formatDate(new Date(subscription.started_at))
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Expires At
                  </div>
                  <div className="mt-1 font-medium">
                    {subscription.expires_at
                      ? formatDate(new Date(subscription.expires_at))
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Trial Ends At
                  </div>
                  <div className="mt-1 font-medium">
                    {subscription.trial_ends_at
                      ? formatDate(new Date(subscription.trial_ends_at))
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Auto Renew
                  </div>
                  <div className="mt-1 font-medium">
                    {subscription.auto_renew ? 'Yes' : 'No'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Amount Paid
                  </div>
                  <div className="mt-1 font-medium">
                    {subscription.amount_paid.toLocaleString()}{' '}
                    {subscription.currency}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Additional Schools
                  </div>
                  <div className="mt-1 font-medium">
                    {subscription.additional_schools}
                  </div>
                </div>
              </div>

              {subscription.notes && (
                <div className="rounded-lg border p-4">
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div className="mt-1 text-sm">{subscription.notes}</div>
                </div>
              )}

              {subscription.suspension_reason && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <div className="font-medium">Suspension Reason</div>
                  </div>
                  <div className="mt-2 text-sm">
                    {subscription.suspension_reason}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {subscription.status !== 'active' && (
                  <Button
                    onClick={() => {
                      setActivateFormData({
                        plan_id: subscription.plan_id || '',
                        currency: subscription.currency,
                        amount_paid: subscription.amount_paid,
                        additional_schools: subscription.additional_schools,
                        notes: subscription.notes || '',
                      });
                      setIsActivateDialogOpen(true);
                    }}
                    disabled={activateSubscription.isPending}
                  >
                    {activateSubscription.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Activate Subscription
                      </>
                    )}
                  </Button>
                )}
                {subscription.status === 'active' && (
                  <Button
                    variant="destructive"
                    onClick={() => setIsSuspendDialogOpen(true)}
                    disabled={suspendSubscription.isPending}
                  >
                    {suspendSubscription.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Suspending...
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-2 h-4 w-4" />
                        Suspend Subscription
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No active subscription found for this organization
              </p>
              <Button
                onClick={() => setIsActivateDialogOpen(true)}
                disabled={activateSubscription.isPending}
              >
                {activateSubscription.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Create Subscription
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License & Maintenance Fees */}
      {subscription && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* License Fee Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                License Fee Status
              </CardTitle>
              <CardDescription>
                One-time payment for software access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {subscription.license_paid_at ? (
                <>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">License Paid</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Paid on: {formatDate(new Date(subscription.license_paid_at))}
                  </div>
                  {subscription.plan && (
                    <div className="text-sm text-muted-foreground">
                      Amount: {subscription.currency === 'AFN' 
                        ? `${subscription.plan.license_fee_afn.toLocaleString()} AFN`
                        : `${subscription.plan.license_fee_usd.toLocaleString()} USD`}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-orange-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">License Unpaid</span>
                  </div>
                  {subscription.plan && (
                    <div className="text-sm text-muted-foreground">
                      Amount Due: {subscription.currency === 'AFN' 
                        ? `${subscription.plan.license_fee_afn.toLocaleString()} AFN`
                        : `${subscription.plan.license_fee_usd.toLocaleString()} USD`}
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      licensePaymentForm.setValue('amount', subscription.currency === 'AFN' 
                        ? subscription.plan.license_fee_afn 
                        : subscription.plan.license_fee_usd);
                      licensePaymentForm.setValue('currency', subscription.currency);
                      setIsLicensePaymentDialogOpen(true);
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Record License Payment
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Fee Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Maintenance Fee Status
              </CardTitle>
              <CardDescription>
                Recurring payment for support, updates, and hosting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {subscription.next_maintenance_due_at ? (
                <>
                  {(() => {
                    const nextDue = new Date(subscription.next_maintenance_due_at);
                    const now = new Date();
                    const isOverdue = nextDue < now;
                    const daysDiff = Math.floor((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <>
                        {isOverdue ? (
                          <div className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">Overdue</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-blue-600">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">Next Due</span>
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {formatDate(nextDue)}
                          {!isOverdue && daysDiff >= 0 && (
                            <span className="ml-2">({daysDiff} days remaining)</span>
                          )}
                          {isOverdue && (
                            <span className="ml-2 text-red-600">({Math.abs(daysDiff)} days overdue)</span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                  {subscription.last_maintenance_paid_at && (
                    <div className="text-sm text-muted-foreground">
                      Last paid: {formatDate(new Date(subscription.last_maintenance_paid_at))}
                    </div>
                  )}
                  {subscription.plan && (
                    <div className="text-sm text-muted-foreground">
                      Amount: {subscription.currency === 'AFN' 
                        ? `${subscription.plan.maintenance_fee_afn.toLocaleString()} AFN`
                        : `${subscription.plan.maintenance_fee_usd.toLocaleString()} USD`}
                      {subscription.billing_period && (
                        <span className="ml-1">
                          ({subscription.billing_period === 'monthly' ? 'Monthly' :
                            subscription.billing_period === 'quarterly' ? 'Quarterly' :
                            subscription.billing_period === 'yearly' ? 'Yearly' :
                            'Custom'})
                        </span>
                      )}
                    </div>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      maintenancePaymentForm.setValue('amount', subscription.currency === 'AFN' 
                        ? subscription.plan.maintenance_fee_afn 
                        : subscription.plan.maintenance_fee_usd);
                      maintenancePaymentForm.setValue('currency', subscription.currency);
                      setIsMaintenancePaymentDialogOpen(true);
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Record Maintenance Payment
                  </Button>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No maintenance due</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* License Payment Dialog */}
      <Dialog open={isLicensePaymentDialogOpen} onOpenChange={setIsLicensePaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record License Payment</DialogTitle>
            <DialogDescription>
              Enter payment details for the license fee
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={licensePaymentForm.handleSubmit(async (data) => {
              if (!subscription?.id || !organizationId) return;
              try {
                await platformApi.subscriptions.submitLicensePayment(organizationId, {
                  subscription_id: subscription.id,
                  ...data,
                });
                showToast.success('License payment recorded successfully');
                setIsLicensePaymentDialogOpen(false);
                licensePaymentForm.reset();
                // Refresh subscription data
                await queryClient.invalidateQueries({ queryKey: ['platform-organization-subscription', organizationId] });
              } catch (error) {
                showToast.error(error instanceof Error ? error.message : 'Failed to record license payment');
              }
            })}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="license-amount">Amount</Label>
              <Input
                id="license-amount"
                type="number"
                step="0.01"
                {...licensePaymentForm.register('amount', { valueAsNumber: true })}
              />
              {licensePaymentForm.formState.errors.amount && (
                <p className="text-sm text-destructive">
                  {licensePaymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-currency">Currency</Label>
              <Select
                value={licensePaymentForm.watch('currency')}
                onValueChange={(value) => licensePaymentForm.setValue('currency', value as 'AFN' | 'USD')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">AFN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-payment-method">Payment Method</Label>
              <Select
                value={licensePaymentForm.watch('payment_method')}
                onValueChange={(value) => licensePaymentForm.setValue('payment_method', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-payment-reference">Payment Reference (Optional)</Label>
              <Input
                id="license-payment-reference"
                {...licensePaymentForm.register('payment_reference')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-payment-date">Payment Date</Label>
              <Input
                id="license-payment-date"
                type="date"
                {...licensePaymentForm.register('payment_date')}
              />
              {licensePaymentForm.formState.errors.payment_date && (
                <p className="text-sm text-destructive">
                  {licensePaymentForm.formState.errors.payment_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="license-notes">Notes (Optional)</Label>
              <Textarea
                id="license-notes"
                {...licensePaymentForm.register('notes')}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsLicensePaymentDialogOpen(false);
                  licensePaymentForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Submit Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Payment Dialog */}
      <Dialog open={isMaintenancePaymentDialogOpen} onOpenChange={setIsMaintenancePaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Maintenance Payment</DialogTitle>
            <DialogDescription>
              Enter payment details for the maintenance fee
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={maintenancePaymentForm.handleSubmit(async (data) => {
              if (!subscription?.id || !organizationId) return;
              try {
                await platformApi.subscriptions.submitMaintenancePayment(organizationId, {
                  subscription_id: subscription.id,
                  ...data,
                });
                showToast.success('Maintenance payment recorded successfully');
                setIsMaintenancePaymentDialogOpen(false);
                maintenancePaymentForm.reset();
                // Refresh subscription data
                await queryClient.invalidateQueries({ queryKey: ['platform-organization-subscription', organizationId] });
              } catch (error) {
                showToast.error(error instanceof Error ? error.message : 'Failed to record maintenance payment');
              }
            })}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="maintenance-amount">Amount</Label>
              <Input
                id="maintenance-amount"
                type="number"
                step="0.01"
                {...maintenancePaymentForm.register('amount', { valueAsNumber: true })}
              />
              {maintenancePaymentForm.formState.errors.amount && (
                <p className="text-sm text-destructive">
                  {maintenancePaymentForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-currency">Currency</Label>
              <Select
                value={maintenancePaymentForm.watch('currency')}
                onValueChange={(value) => maintenancePaymentForm.setValue('currency', value as 'AFN' | 'USD')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">AFN</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-payment-method">Payment Method</Label>
              <Select
                value={maintenancePaymentForm.watch('payment_method')}
                onValueChange={(value) => maintenancePaymentForm.setValue('payment_method', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-payment-reference">Payment Reference (Optional)</Label>
              <Input
                id="maintenance-payment-reference"
                {...maintenancePaymentForm.register('payment_reference')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-payment-date">Payment Date</Label>
              <Input
                id="maintenance-payment-date"
                type="date"
                {...maintenancePaymentForm.register('payment_date')}
              />
              {maintenancePaymentForm.formState.errors.payment_date && (
                <p className="text-sm text-destructive">
                  {maintenancePaymentForm.formState.errors.payment_date.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maintenance-notes">Notes (Optional)</Label>
              <Textarea
                id="maintenance-notes"
                {...maintenancePaymentForm.register('notes')}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsMaintenancePaymentDialogOpen(false);
                  maintenancePaymentForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Submit Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>
            Current usage across all tracked metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(usage || {}).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(usage || {}).map(([key, info]: [string, any]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {info.name || key.replace(/_/g, ' ')}
                    </div>
                    {info.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {info.description}
                      </div>
                    )}
                    <div className="text-sm text-muted-foreground mt-1">
                      {info.current} / {info.limit || '∞'} {info.unit && `(${info.unit})`}
                    </div>
                  </div>
                  <div className="w-32 ml-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full transition-all',
                          info.limit && info.current / info.limit > 0.9
                            ? 'bg-destructive'
                            : info.limit && info.current / info.limit > 0.75
                            ? 'bg-yellow-500'
                            : ''
                        )}
                        style={{
                          width: `${
                            info.limit
                              ? Math.min(
                                  (info.current / info.limit) * 100,
                                  100
                                )
                              : 0
                          }%`,
                          backgroundColor: info.limit && info.current / info.limit > 0.9
                            ? undefined // Use bg-destructive class
                            : info.limit && info.current / info.limit > 0.75
                            ? undefined // Use bg-yellow-500 class
                            : '#f59e0b', // amber-500 - vibrant yellow/amber color
                        }}
                      />
                    </div>
                    {info.limit && (
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        {Math.round((info.current / info.limit) * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No usage data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Management</CardTitle>
          <CardDescription>
            Enable or disable features for this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {features && features.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="space-y-2">
                    {categoryFeatures.map((feature) => (
                      <div
                        key={feature.featureKey}
                        className={cn(
                          'flex items-center justify-between rounded-lg border p-4 transition-colors',
                          feature.isEnabled
                            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900'
                            : 'bg-muted/50'
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {feature.name}
                            </div>
                            {feature.isAddon && (
                              <Badge variant="outline" className="text-xs">
                                Add-on
                              </Badge>
                            )}
                          </div>
                          {feature.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {feature.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <Badge
                            variant={feature.isEnabled ? 'default' : 'secondary'}
                            className={cn(
                              feature.isEnabled && 'bg-green-500 hover:bg-green-600',
                              !feature.isEnabled && 'bg-muted'
                            )}
                          >
                            {feature.isEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Switch
                            checked={feature.isEnabled}
                            onCheckedChange={(checked) => {
                              if (organizationId) {
                                toggleFeature.mutate(
                                  {
                                    organizationId,
                                    featureKey: feature.featureKey,
                                  },
                                  {
                                    onError: () => {
                                      // Error handling is done in the hook
                                    },
                                  }
                                );
                              }
                            }}
                            disabled={toggleFeature.isPending}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No feature data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activate Subscription Dialog */}
      <Dialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Activate Subscription</DialogTitle>
            <DialogDescription>
              Configure and activate a subscription for this organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan_id">
                Plan <span className="text-destructive">*</span>
              </Label>
              <Select
                value={activateFormData.plan_id}
                onValueChange={(value) => {
                  const selectedPlan = plans?.find((p) => p.id === value);
                  setActivateFormData({
                    ...activateFormData,
                    plan_id: value,
                    currency: selectedPlan?.currency || 'AFN',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price_afn} AFN / {plan.price_usd} USD
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="text-sm font-medium mb-2">Plan Details</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Price: {selectedPlan.price_afn} AFN / {selectedPlan.price_usd} USD</div>
                  {selectedPlan.description && (
                    <div>{selectedPlan.description}</div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={activateFormData.currency}
                onValueChange={(value) =>
                  setActivateFormData({
                    ...activateFormData,
                    currency: value as 'AFN' | 'USD',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AFN">AFN (Afghan Afghani)</SelectItem>
                  <SelectItem value="USD">USD (US Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount_paid">Amount Paid</Label>
              <Input
                id="amount_paid"
                type="number"
                min="0"
                value={activateFormData.amount_paid}
                onChange={(e) =>
                  setActivateFormData({
                    ...activateFormData,
                    amount_paid: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_schools">Additional Schools</Label>
              <Input
                id="additional_schools"
                type="number"
                min="0"
                value={activateFormData.additional_schools}
                onChange={(e) =>
                  setActivateFormData({
                    ...activateFormData,
                    additional_schools: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={activateFormData.notes}
                onChange={(e) =>
                  setActivateFormData({
                    ...activateFormData,
                    notes: e.target.value,
                  })
                }
                placeholder="Add any notes about this subscription..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleActivate}
              disabled={
                !activateFormData.plan_id ||
                activateFormData.amount_paid < 0 ||
                activateSubscription.isPending
              }
            >
              {activateSubscription.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Subscription Dialog */}
      <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Subscription</DialogTitle>
            <DialogDescription>
              Suspend this organization's subscription. Provide a reason for
              suspension.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="suspend_reason">
                Suspension Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="suspend_reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspending this subscription..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSuspendDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={!suspendReason.trim() || suspendSubscription.isPending}
            >
              {suspendSubscription.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Suspending...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Suspend Subscription
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Management */}
      {organizationId && (
        <div className="mt-8">
          <OrganizationPermissionManagement 
            organizationId={organizationId} 
            usePlatformAdminApi={true}
          />
        </div>
      )}
    </div>
  );
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
