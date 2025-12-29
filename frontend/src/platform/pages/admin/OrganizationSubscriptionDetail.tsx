import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Package,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';

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
import { OrganizationPermissionManagement } from '@/components/settings/OrganizationPermissionManagement';

// CRITICAL: Log when module loads - ALWAYS (even in production)
console.log('[OrganizationSubscriptionDetail] ====== MODULE LOADED ======');
console.log('[OrganizationSubscriptionDetail] Module load timestamp:', new Date().toISOString());

export default function OrganizationSubscriptionDetail() {
  // CRITICAL: Log immediately when component mounts - ALWAYS (even in production)
  console.log('[OrganizationSubscriptionDetail] ====== COMPONENT MOUNTED ======');
  console.log('[OrganizationSubscriptionDetail] Timestamp:', new Date().toISOString());
  
  const { organizationId } = useParams<{ organizationId: string }>();
  
  // CRITICAL: Log organizationId immediately - ALWAYS
  console.log('[OrganizationSubscriptionDetail] organizationId from params:', organizationId);
  
  // CRITICAL: Use platform admin permissions hook for platform admin routes
  const { data: platformPermissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = platformPermissions?.includes('subscription.admin') ?? false;
  
  // CRITICAL: Log permission check - ALWAYS
  console.log('[OrganizationSubscriptionDetail] Permission check:', {
    permissionsLoading,
    hasPermissions: !!platformPermissions,
    permissionsCount: platformPermissions?.length || 0,
    hasAdminPermission,
  });

  const { data, isLoading, error } = usePlatformOrganizationSubscription(
    organizationId || ''
  );
  const { data: organization } = usePlatformOrganization(organizationId || null);
  const { data: plans } = usePlatformPlans();

  // Debug logging
  if (import.meta.env.DEV) {
    console.log('[OrganizationSubscriptionDetail] Component state:', {
      organizationId,
      isLoading,
      hasData: !!data,
      data,
      error: error ? (error instanceof Error ? error.message : String(error)) : null,
      hasOrganization: !!organization,
      hasPlans: !!plans,
    });
  }

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

  // Show loading while checking permissions
  if (permissionsLoading) {
    console.log('[OrganizationSubscriptionDetail] Showing loading state (permissions)');
    return (
      <div className="flex h-[50vh] items-center justify-center bg-red-50 border-4 border-red-500">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground font-bold">Loading permissions...</p>
          <p className="text-xs mt-2 font-mono">Organization ID: {organizationId || 'MISSING'}</p>
          <p className="text-xs mt-1 text-red-600">If you see this, the component IS rendering!</p>
        </div>
      </div>
    );
  }

  // Access control - redirect if no permission
  if (!hasAdminPermission) {
    console.log('[OrganizationSubscriptionDetail] No admin permission, redirecting');
    console.log('[OrganizationSubscriptionDetail] Platform permissions:', platformPermissions);
    return (
      <div className="flex h-[50vh] items-center justify-center bg-yellow-50 border-4 border-yellow-500">
        <div className="text-center">
          <p className="text-lg font-bold text-yellow-800">No Admin Permission</p>
          <p className="text-sm text-yellow-700 mt-2">Redirecting to dashboard...</p>
          <p className="text-xs mt-2 font-mono">Organization ID: {organizationId || 'MISSING'}</p>
          <p className="text-xs mt-1">Permissions: {JSON.stringify(platformPermissions)}</p>
          <Navigate to="/platform/dashboard" replace />
        </div>
      </div>
    );
  }
  
  // CRITICAL: Log that we passed permission check - ALWAYS
  console.log('[OrganizationSubscriptionDetail] ✅ Permission check passed, continuing to render');

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
          {import.meta.env.DEV && (
            <p className="text-xs mt-2">Organization ID: {organizationId}</p>
          )}
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
          {import.meta.env.DEV && (
            <div className="text-xs text-muted-foreground mb-4 p-4 bg-muted rounded">
              <p>Debug Info:</p>
              <p>Organization ID: {organizationId}</p>
              <p>Error: {JSON.stringify(error, null, 2)}</p>
            </div>
          )}
          <Button asChild className="mt-4">
            <Link to="/platform/organizations">Back to Organizations</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Extract data with defaults - allow rendering even if subscription is null
  // Handle case where data might be undefined (shouldn't happen after loading, but be safe)
  const subscription = data?.subscription || null;
  const status = data?.status || 'inactive';
  const usage = data?.usage || {};
  const features = Array.isArray(data?.features) ? data.features : [];

  // Debug: Log extracted data
  if (import.meta.env.DEV) {
    console.log('[OrganizationSubscriptionDetail] Extracted data:', {
      rawData: data,
      subscription: subscription ? 'exists' : 'null',
      subscriptionDetails: subscription ? {
        id: subscription.id,
        status: subscription.status,
        planId: subscription.plan_id,
        hasPlan: !!subscription.plan,
      } : null,
      status,
      usageKeys: Object.keys(usage),
      featuresCount: features.length,
      features: features.slice(0, 3), // First 3 features for debugging
    });
  }

  const handleActivate = () => {
    if (!activateFormData.plan_id) {
      return;
    }
    
    // Ensure all required fields are properly formatted
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

  // Debug: Ensure component renders
  if (import.meta.env.DEV) {
    console.log('[OrganizationSubscriptionDetail] Rendering component with:', {
      hasSubscription: !!subscription,
      status,
      featuresCount: features.length,
      hasOrganization: !!organization,
      hasPlans: !!plans,
    });
  }

  // CRITICAL: Log before rendering - ALWAYS (even in production)
  console.log('[OrganizationSubscriptionDetail] About to render JSX', {
    organizationId,
    hasSubscription: !!subscription,
    isLoading,
    hasError: !!error,
    hasData: !!data,
    status,
    featuresCount: features.length,
  });
  
  // CRITICAL: Log before rendering - ALWAYS
  console.log('[OrganizationSubscriptionDetail] ====== ABOUT TO RENDER JSX ======');
  console.log('[OrganizationSubscriptionDetail] Render data:', {
    organizationId,
    hasSubscription: !!subscription,
    isLoading,
    hasError: !!error,
    hasData: !!data,
    status,
    featuresCount: features.length,
  });
  
  // Always render something - even if there's an error or no data
  return (
    <div className="space-y-6 p-6 min-h-screen bg-green-50 border-4 border-green-500">
      {/* Debug Banner - ALWAYS VISIBLE (even in production for now) */}
      <div className="rounded-lg border-4 border-red-500 bg-red-100 p-4 text-sm font-bold">
        <p className="text-lg text-red-800 mb-2">🚨 COMPONENT IS RENDERING! 🚨</p>
        <p className="font-bold text-blue-900 mb-2">🔍 Debug Info (OrganizationSubscriptionDetail):</p>
        <div className="grid grid-cols-2 gap-2 text-blue-800">
          <div><strong>Organization ID:</strong> {organizationId || 'MISSING'}</div>
          <div><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</div>
          <div><strong>Has Data:</strong> {data ? 'Yes' : 'No'}</div>
          <div><strong>Has Subscription:</strong> {subscription ? 'Yes' : 'No'}</div>
          <div><strong>Status:</strong> {status}</div>
          <div><strong>Features:</strong> {features.length}</div>
          <div><strong>Has Organization:</strong> {organization ? 'Yes' : 'No'}</div>
          <div><strong>Has Plans:</strong> {plans ? `Yes (${plans.length})` : 'No'}</div>
          <div className="col-span-2">
            <strong>Error:</strong> {error ? (error instanceof Error ? error.message : String(error)) : 'None'}
          </div>
          <div className="col-span-2">
            <strong>Raw Data Type:</strong> {typeof data}
          </div>
          <div className="col-span-2">
            <strong>Raw Data:</strong> <pre className="text-xs mt-1 overflow-auto max-h-32 bg-white p-2 rounded border">{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      </div>

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
              Organization Subscription
            </h1>
            <p className="text-muted-foreground">
              {organization ? (
                <>Manage subscription for: <strong>{organization.name}</strong></>
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
              {Object.entries(usage || {}).map(([key, info]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <div className="font-medium capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {info.current} / {info.limit || '∞'}
                    </div>
                  </div>
                  <div className="w-32">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full',
                          (info.current / (info.limit || 1)) * 100 > 90
                            ? 'bg-destructive'
                            : (info.current / (info.limit || 1)) * 100 > 75
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
            <div className="space-y-3">
              {features.map((feature) => (
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
                    <div className="font-medium capitalize">
                      {feature.name.replace(/_/g, ' ')}
                    </div>
                    {feature.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {feature.description}
                      </div>
                    )}
                    {feature.isAddon && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Add-on
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge
                      variant={feature.isEnabled ? 'default' : 'secondary'}
                      className={cn(
                        feature.isEnabled && 'bg-green-500',
                        !feature.isEnabled && 'bg-muted'
                      )}
                    >
                      {feature.isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                    <Switch
                      checked={feature.isEnabled}
                      onCheckedChange={(checked) => {
                        if (organizationId) {
                          toggleFeature.mutate({
                            organizationId,
                            featureKey: feature.featureKey,
                          });
                        }
                      }}
                      disabled={toggleFeature.isPending}
                    />
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
                    amount_paid:
                      selectedPlan && activateFormData.currency === 'AFN'
                        ? selectedPlan.priceYearlyAfn
                        : selectedPlan && activateFormData.currency === 'USD'
                        ? selectedPlan.priceYearlyUsd
                        : activateFormData.amount_paid,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans
                    ?.filter((p) => p.isActive)
                    .map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {plan.priceYearlyAfn.toLocaleString()} AFN /{' '}
                        {plan.priceYearlyUsd.toLocaleString()} USD
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="text-sm font-medium">{selectedPlan.name}</div>
                {selectedPlan.description && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedPlan.description}
                  </div>
                )}
                <div className="mt-2 text-sm">
                  <div>
                    Max Schools: {selectedPlan.maxSchools}
                  </div>
                  <div>
                    Trial Days: {selectedPlan.trialDays}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">
                  Currency <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={activateFormData.currency}
                  onValueChange={(value: 'AFN' | 'USD') => {
                    const newCurrency = value;
                    const selectedPlan = plans?.find(
                      (p) => p.id === activateFormData.plan_id
                    );
                    setActivateFormData({
                      ...activateFormData,
                      currency: newCurrency,
                      amount_paid:
                        selectedPlan && newCurrency === 'AFN'
                          ? selectedPlan.priceYearlyAfn
                          : selectedPlan && newCurrency === 'USD'
                          ? selectedPlan.priceYearlyUsd
                          : activateFormData.amount_paid,
                    });
                  }}
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
                <Label htmlFor="amount_paid">
                  Amount Paid <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="amount_paid"
                  type="number"
                  min="0"
                  step="0.01"
                  value={activateFormData.amount_paid}
                  onChange={(e) =>
                    setActivateFormData({
                      ...activateFormData,
                      amount_paid: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
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
          <OrganizationPermissionManagement organizationId={organizationId} />
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
