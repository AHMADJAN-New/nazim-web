import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  RefreshCw,
  XCircle,
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import {
  usePlatformOrganizationSubscription,
  usePlatformActivateSubscription,
  usePlatformSuspendSubscription,
  usePlatformToggleFeature,
} from '@/platform/hooks/usePlatformAdminComplete';
import { usePlatformPlans, usePlatformOrganization } from '@/platform/hooks/usePlatformAdmin';
import type * as SubscriptionApi from '@/types/api/subscription';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading';
import { OrganizationPermissionManagement } from '@/components/settings/OrganizationPermissionManagement';

interface OrganizationSubscriptionDialogProps {
  organizationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function OrganizationSubscriptionDialog({
  organizationId,
  open,
  onOpenChange,
}: OrganizationSubscriptionDialogProps) {
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

  const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [activateFormData, setActivateFormData] = useState({
    plan_id: '',
    currency: 'AFN' as 'AFN' | 'USD',
    amount_paid: 0,
    additional_schools: 0,
    notes: '',
  });
  const [suspendReason, setSuspendReason] = useState('');

  // Extract data with defaults - allow rendering even if subscription is null
  const subscription = data?.subscription || null;
  const statusObj = data?.status || { status: 'none', message: 'No subscription data' };
  const status = statusObj.status || 'none';
  const usage = data?.usage || {};
  const features = Array.isArray(data?.features) ? data.features : [];

  const handleActivate = () => {
    if (!activateFormData.plan_id || !organizationId) {
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
    if (!suspendReason.trim() || !organizationId) {
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

  // Don't show dialog if no permission
  if (!hasAdminPermission) {
    return null;
  }

  return (
    <>
      <Dialog open={open && !!organizationId} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Package className="h-6 w-6" />
              Subscription Management
              {organization && (
                <span className="text-lg font-normal text-muted-foreground">
                  - {organization.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Manage subscription, usage, and features for this organization
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {isLoading || permissionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : error && !data ? (
              <div className="py-8 text-center">
                <p className="text-destructive">Error loading subscription details</p>
                {import.meta.env.DEV && (
                  <p className="text-xs mt-2 text-muted-foreground">
                    {error instanceof Error ? error.message : String(error)}
                  </p>
                )}
              </div>
            ) : (
              <>
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
                                      : 'bg-primary'
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

                {/* Permissions Management */}
                {organizationId && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Permissions Management</CardTitle>
                      <CardDescription>
                        Manage permissions for this organization
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <OrganizationPermissionManagement 
                        organizationId={organizationId} 
                        usePlatformAdminApi={true}
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      {plan.name} - {plan.priceYearlyAfn} AFN / {plan.priceYearlyUsd} USD
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="text-sm font-medium mb-2">Plan Details</div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Price: {selectedPlan.priceYearlyAfn} AFN / {selectedPlan.priceYearlyUsd} USD</div>
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
    </>
  );
}

