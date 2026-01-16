import {
  CheckCircle,
  Edit,
  Package,
  Plus,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Eye,
  DollarSign,
  Calendar,
  Building2,
  Info,
} from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  usePlatformPlans,
  useCreatePlatformPlan,
  useUpdatePlatformPlan,
} from '@/platform/hooks/usePlatformAdmin';
import { usePlatformFeatureDefinitions, usePlatformLimitDefinitions } from '@/platform/hooks/usePlatformAdminComplete';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';

type BillingPeriod = 'monthly' | 'quarterly' | 'yearly' | 'custom';

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  // New fee separation fields
  billing_period: BillingPeriod;
  license_fee_afn: number;
  license_fee_usd: number;
  maintenance_fee_afn: number;
  maintenance_fee_usd: number;
  custom_billing_days: number | null;
  // Other fields
  trial_days: number;
  grace_period_days: number;
  readonly_period_days: number;
  max_schools: number;
  per_school_price_afn: number;
  per_school_price_usd: number;
  sort_order: number;
  is_default: boolean;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

const initialFormData: PlanFormData = {
  name: '',
  slug: '',
  description: '',
  billing_period: 'yearly',
  license_fee_afn: 0,
  license_fee_usd: 0,
  maintenance_fee_afn: 0,
  maintenance_fee_usd: 0,
  custom_billing_days: null,
  trial_days: 0,
  grace_period_days: 14,
  readonly_period_days: 60,
  max_schools: 1,
  per_school_price_afn: 0,
  per_school_price_usd: 0,
  sort_order: 0,
  is_default: false,
  features: {},
  limits: {},
};

export default function PlansManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<(typeof plans)[0] | null>(null);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);

  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const { data: plans, isLoading } = usePlatformPlans();
  const { data: featureDefinitions, isLoading: featuresLoading, error: featuresError } = usePlatformFeatureDefinitions();
  const { data: limitDefinitions, isLoading: limitsLoading, error: limitsError } = usePlatformLimitDefinitions();
  const createPlan = useCreatePlatformPlan();
  const updatePlan = useUpdatePlatformPlan();

  // Debug: Log feature definitions (only in dev mode)
  if (import.meta.env.DEV) {
    if (featureDefinitions) {
      console.log('[PlansManagement] Feature definitions loaded:', featureDefinitions.length, 'features');
      console.log('[PlansManagement] Sample feature:', featureDefinitions[0]);
    }
    if (featuresError) {
      console.error('[PlansManagement] Features error:', featuresError);
    }
  }

  // Wait for permissions to load
  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access control - check for platform admin permission (GLOBAL, not organization-scoped)
  const hasPlatformAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');
  if (!hasPlatformAdmin) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  const handleOpenCreate = () => {
    // Initialize features object with all features disabled
    const features: Record<string, boolean> = {};
    featureDefinitions?.forEach((feature) => {
      features[feature.feature_key] = false;
    });
    // Initialize limits object with all limits set to -1 (unlimited)
    const limits: Record<string, number> = {};
    limitDefinitions?.forEach((limit) => {
      limits[limit.resource_key] = -1; // -1 = unlimited
    });
    setFormData({ ...initialFormData, features, limits });
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: (typeof plans)[0]) => {
    // Initialize features object from plan features
    const features: Record<string, boolean> = {};
    featureDefinitions?.forEach((feature) => {
      // Check if this feature is enabled in the plan
      features[feature.feature_key] = plan.features?.includes(feature.feature_key) || false;
    });
    // Initialize limits object from plan limits
    const limits: Record<string, number> = {};
    limitDefinitions?.forEach((limit) => {
      // Get limit value from plan limits, default to -1 (unlimited) if not set
      limits[limit.resource_key] = plan.limits?.[limit.resource_key] ?? -1;
    });
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      // New fee separation fields
      billing_period: plan.billingPeriod || 'yearly',
      license_fee_afn: plan.licenseFeeAfn || 0,
      license_fee_usd: plan.licenseFeeUsd || 0,
      maintenance_fee_afn: plan.maintenanceFeeAfn || plan.priceYearlyAfn || 0,
      maintenance_fee_usd: plan.maintenanceFeeUsd || plan.priceYearlyUsd || 0,
      custom_billing_days: plan.customBillingDays || null,
      // Other fields
      trial_days: plan.trialDays,
      grace_period_days: plan.gracePeriodDays,
      readonly_period_days: plan.readonlyPeriodDays,
      max_schools: plan.maxSchools,
      per_school_price_afn: plan.perSchoolPriceAfn,
      per_school_price_usd: plan.perSchoolPriceUsd,
      sort_order: plan.sortOrder,
      is_default: plan.isDefault,
      features,
      limits,
    });
    setEditingPlan(plan.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const { features, limits, ...planData } = formData;
      
      // Auto-calculate price_yearly_* from maintenance_fee_* for backward compatibility
      // Only set if billing_period is yearly (for legacy API compatibility)
      let price_yearly_afn = 0;
      let price_yearly_usd = 0;
      
      if (planData.billing_period === 'yearly') {
        // For yearly billing, price_yearly equals maintenance_fee
        price_yearly_afn = planData.maintenance_fee_afn;
        price_yearly_usd = planData.maintenance_fee_usd;
      } else {
        // For other periods, calculate yearly equivalent
        let multiplier = 1;
        if (planData.billing_period === 'monthly') {
          multiplier = 12;
        } else if (planData.billing_period === 'quarterly') {
          multiplier = 4;
        } else if (planData.billing_period === 'custom' && planData.custom_billing_days) {
          multiplier = 365 / planData.custom_billing_days;
        }
        price_yearly_afn = planData.maintenance_fee_afn * multiplier;
        price_yearly_usd = planData.maintenance_fee_usd * multiplier;
      }
      
      const payload = {
        ...planData,
        // Auto-calculate legacy fields for backward compatibility
        price_yearly_afn,
        price_yearly_usd,
        features: features || {},
        limits: limits || {},
      };
      
      if (editingPlan) {
        await updatePlan.mutateAsync({
          id: editingPlan,
          ...payload,
        });
        showToast.success('Plan updated successfully');
      } else {
        await createPlan.mutateAsync(payload as any);
        showToast.success('Plan created successfully');
      }
      setIsDialogOpen(false);
    } catch (error) {
      showToast.error(
        error instanceof Error ? error.message : 'Failed to save plan'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage available subscription plans
          </p>
        </div>
        <Button onClick={handleOpenCreate} size="sm" className="flex-shrink-0">
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Add Plan</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            All Plans
          </CardTitle>
          <CardDescription>
            Click on a plan row to view details, or use the edit button to modify
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Billing</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">License (AFN)</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Maintenance (AFN)</TableHead>
                  <TableHead className="hidden md:table-cell text-center">Max Schools</TableHead>
                  <TableHead className="hidden lg:table-cell text-center">Features</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {plans?.map((plan) => (
                <TableRow 
                  key={plan.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={(e) => {
                    // Don't open view dialog if clicking on the edit button
                    if ((e.target as HTMLElement).closest('button')) {
                      return;
                    }
                    setViewingPlan(plan);
                    setIsViewDialogOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    <div>
                      {plan.name}
                      {plan.isDefault && (
                        <Badge variant="secondary" className="ml-2">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{plan.slug}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {plan.billingPeriodLabel || 'Yearly'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {plan.hasLicenseFee ? (
                      <div>
                        <div>{plan.licenseFeeAfn?.toLocaleString() || 0}</div>
                        <div className="text-xs text-muted-foreground">(one-time)</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {plan.hasMaintenanceFee ? (
                      <div>
                        <div>{plan.maintenanceFeeAfn?.toLocaleString() || plan.priceYearlyAfn?.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">/{plan.billingPeriod || 'year'}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {plan.maxSchools === -1 ? 'Unlimited' : plan.maxSchools}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {plan.features?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {plan.deletedAt ? (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Inactive
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(plan)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl">
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Update the plan details and configure features'
                : 'Fill in the plan details and configure features'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 mt-4 mb-0 flex-shrink-0">
                <TabsTrigger value="details" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Plan Details
                </TabsTrigger>
                <TabsTrigger value="features" className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Features
                  {featureDefinitions && featureDefinitions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {Object.values(formData.features).filter(Boolean).length}/{featureDefinitions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="limits" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Limits
                  {limitDefinitions && limitDefinitions.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {Object.values(formData.limits).filter((v) => v !== undefined && v !== -1).length}/{limitDefinitions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="flex-1 overflow-y-auto px-6 py-4 mt-4 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Plan Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Basic Plan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      placeholder="e.g., basic-plan"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Brief description of this plan"
                    rows={3}
                  />
                </div>

                {/* Billing Period Selection */}
                <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Billing Configuration
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billing_period">Billing Period *</Label>
                      <Select
                        value={formData.billing_period}
                        onValueChange={(value: BillingPeriod) =>
                          setFormData({ ...formData, billing_period: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select billing period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.billing_period === 'custom' && (
                      <div className="space-y-2">
                        <Label htmlFor="custom_billing_days">Custom Days *</Label>
                        <Input
                          id="custom_billing_days"
                          type="number"
                          value={formData.custom_billing_days || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              custom_billing_days: parseInt(e.target.value) || null,
                            })
                          }
                          placeholder="e.g., 180"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* License Fee (One-time) */}
                <div className="space-y-4 p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    License Fee (One-time)
                    <Badge variant="secondary" className="text-xs">One-time payment</Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="license_fee_afn">License Fee (AFN)</Label>
                      <Input
                        id="license_fee_afn"
                        type="number"
                        step="0.01"
                        value={formData.license_fee_afn}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            license_fee_afn: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license_fee_usd">License Fee (USD)</Label>
                      <Input
                        id="license_fee_usd"
                        type="number"
                        step="0.01"
                        value={formData.license_fee_usd}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            license_fee_usd: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Maintenance Fee (Recurring) */}
                <div className="space-y-4 p-4 rounded-lg border bg-green-50/50 dark:bg-green-950/20">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Maintenance Fee (Recurring)
                    <Badge variant="secondary" className="text-xs">
                      {formData.billing_period === 'monthly' ? 'Monthly' :
                       formData.billing_period === 'quarterly' ? 'Quarterly' :
                       formData.billing_period === 'yearly' ? 'Yearly' :
                       `Every ${formData.custom_billing_days || '?'} days`}
                    </Badge>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="maintenance_fee_afn">Maintenance Fee (AFN) *</Label>
                      <Input
                        id="maintenance_fee_afn"
                        type="number"
                        step="0.01"
                        value={formData.maintenance_fee_afn}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maintenance_fee_afn: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maintenance_fee_usd">Maintenance Fee (USD) *</Label>
                      <Input
                        id="maintenance_fee_usd"
                        type="number"
                        step="0.01"
                        value={formData.maintenance_fee_usd}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            maintenance_fee_usd: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>


                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trial_days">Trial Days</Label>
                    <Input
                      id="trial_days"
                      type="number"
                      value={formData.trial_days}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trial_days: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grace_days">Grace Period Days</Label>
                    <Input
                      id="grace_days"
                      type="number"
                      value={formData.grace_period_days}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          grace_period_days: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="14"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="readonly_days">Read-Only Period Days</Label>
                    <Input
                      id="readonly_days"
                      type="number"
                      value={formData.readonly_period_days}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          readonly_period_days: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max_schools">Max Schools</Label>
                    <Input
                      id="max_schools"
                      type="number"
                      value={formData.max_schools}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_schools: parseInt(e.target.value) || 1,
                        })
                      }
                      placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground">Use -1 for unlimited</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="per_school_afn">Per School Price (AFN)</Label>
                    <Input
                      id="per_school_afn"
                      type="number"
                      step="0.01"
                      value={formData.per_school_price_afn}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          per_school_price_afn: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="per_school_usd">Per School Price (USD)</Label>
                    <Input
                      id="per_school_usd"
                      type="number"
                      step="0.01"
                      value={formData.per_school_price_usd}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          per_school_price_usd: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sort_order">Sort Order</Label>
                    <Input
                      id="sort_order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sort_order: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch
                      id="is_default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_default: checked })
                      }
                    />
                    <Label htmlFor="is_default" className="cursor-pointer">
                      Set as default plan
                    </Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="features" className="flex-1 overflow-y-auto px-6 py-4 mt-4 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Plan Features</h3>
                      <p className="text-sm text-muted-foreground">
                        {featureDefinitions && featureDefinitions.length > 0
                          ? `Select which features are enabled for this plan`
                          : 'No features available. Please create feature definitions first.'}
                      </p>
                    </div>
                  </div>
                  {featureDefinitions && !featuresLoading && (
                    <div className="text-right bg-primary/10 rounded-lg px-4 py-2 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">
                        {Object.values(formData.features).filter(Boolean).length}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        of {featureDefinitions.length} enabled
                      </div>
                    </div>
                  )}
                </div>

                {featuresLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-sm text-muted-foreground">Loading features...</span>
                  </div>
                ) : featuresError ? (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm font-medium text-destructive">Error loading features</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {featuresError instanceof Error ? featuresError.message : 'Unknown error occurred'}
                    </p>
                  </div>
                ) : featureDefinitions && featureDefinitions.length > 0 ? (
                  <div className="space-y-4">
                    {(() => {
                      const grouped = featureDefinitions.reduce((acc, feature) => {
                        const category = feature.category || 'Other';
                        if (!acc[category]) {
                          acc[category] = [];
                        }
                        acc[category].push(feature);
                        return acc;
                      }, {} as Record<string, typeof featureDefinitions>);

                      const sortedCategories = Object.keys(grouped).sort();

                      return (
                        <div className="space-y-4">
                          {sortedCategories.map((category) => {
                            const categoryFeatures = grouped[category].sort(
                              (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                            );
                            const enabledCount = categoryFeatures.filter(
                              (f) => formData.features[f.feature_key]
                            ).length;

                            return (
                              <Card key={category} className="overflow-hidden">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-base capitalize">{category}</CardTitle>
                                    <Badge variant="outline" className="text-xs">
                                      {enabledCount} / {categoryFeatures.length} enabled
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  {categoryFeatures.map((feature) => {
                                    const isEnabled = formData.features[feature.feature_key] || false;
                                    return (
                                      <div
                                        key={feature.feature_key}
                                        className={cn(
                                          'flex items-center justify-between p-3 rounded-lg border transition-all',
                                          isEnabled
                                            ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800'
                                            : 'bg-background border-border hover:border-primary/50'
                                        )}
                                      >
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            {isEnabled ? (
                                              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                                            ) : (
                                              <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                            )}
                                            <div className="font-medium text-sm capitalize">
                                              {feature.name || feature.feature_key.replace(/_/g, ' ')}
                                            </div>
                                            {feature.is_addon && (
                                              <Badge variant="secondary" className="text-xs">
                                                Add-on
                                              </Badge>
                                            )}
                                          </div>
                                          {feature.description && (
                                            <p className="text-xs text-muted-foreground ml-6 mt-1">
                                              {feature.description}
                                            </p>
                                          )}
                                        </div>
                                        <Switch
                                          checked={isEnabled}
                                          onCheckedChange={(checked) => {
                                            setFormData({
                                              ...formData,
                                              features: {
                                                ...formData.features,
                                                [feature.feature_key]: checked,
                                              },
                                            });
                                          }}
                                        />
                                      </div>
                                    );
                                  })}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="rounded-lg border border-muted bg-muted/30 p-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No features available
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please create feature definitions first
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="limits" className="flex-1 overflow-y-auto px-6 py-4 mt-4 space-y-4">
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Plan Limits</h3>
                      <p className="text-sm text-muted-foreground">
                        {limitDefinitions && limitDefinitions.length > 0
                          ? `Set resource limits for this plan. Use -1 for unlimited.`
                          : 'No limits available. Please create limit definitions first.'}
                      </p>
                    </div>
                  </div>
                  {limitDefinitions && !limitsLoading && (
                    <div className="text-right bg-primary/10 rounded-lg px-4 py-2 border border-primary/20">
                      <div className="text-2xl font-bold text-primary">
                        {Object.values(formData.limits).filter((v) => v !== undefined && v !== -1).length}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        of {limitDefinitions.length} configured
                      </div>
                    </div>
                  )}
                </div>

                {limitsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-3 text-sm text-muted-foreground">Loading limits...</span>
                  </div>
                ) : limitsError ? (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                    <p className="text-sm font-medium text-destructive">Error loading limits</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {limitsError instanceof Error ? limitsError.message : 'Unknown error occurred'}
                    </p>
                  </div>
                ) : limitDefinitions && limitDefinitions.length > 0 ? (
                  <div className="space-y-4">
                    {(() => {
                      const grouped = limitDefinitions.reduce((acc, limit) => {
                        const category = limit.category || 'Other';
                        if (!acc[category]) {
                          acc[category] = [];
                        }
                        acc[category].push(limit);
                        return acc;
                      }, {} as Record<string, typeof limitDefinitions>);

                      const sortedCategories = Object.keys(grouped).sort();

                      return (
                        <div className="space-y-4">
                          {sortedCategories.map((category) => {
                            const categoryLimits = grouped[category].sort(
                              (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                            );
                            const configuredCount = categoryLimits.filter(
                              (l) => formData.limits[l.resource_key] !== undefined && formData.limits[l.resource_key] !== -1
                            ).length;

                            return (
                              <Card key={category} className="overflow-hidden">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-base capitalize">{category}</CardTitle>
                                    <Badge variant="outline" className="text-xs">
                                      {configuredCount} / {categoryLimits.length} configured
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {categoryLimits.map((limit) => {
                                    const limitValue = formData.limits[limit.resource_key] ?? -1;
                                    const isUnlimited = limitValue === -1 || limitValue === undefined;
                                    const unit = limit.unit === 'count' ? '' : limit.unit.toUpperCase();
                                    
                                    return (
                                      <div
                                        key={limit.resource_key}
                                        className={cn(
                                          'flex items-center justify-between p-3 rounded-lg border transition-all',
                                          !isUnlimited
                                            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                                            : 'bg-background border-border hover:border-primary/50'
                                        )}
                                      >
                                        <div className="flex-1 min-w-0 mr-4">
                                          <div className="flex items-center gap-2">
                                            <Building2 className={cn(
                                              'h-4 w-4 flex-shrink-0',
                                              !isUnlimited ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                                            )} />
                                            <div className="font-medium text-sm capitalize">
                                              {limit.name || limit.resource_key.replace(/_/g, ' ')}
                                            </div>
                                          </div>
                                          {limit.description && (
                                            <p className="text-xs text-muted-foreground ml-6 mt-1">
                                              {limit.description}
                                            </p>
                                          )}
                                          <p className="text-xs text-muted-foreground ml-6 mt-1">
                                            Unit: {unit || 'count'} • Reset: {limit.reset_period || 'never'}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <Input
                                            type="number"
                                            value={isUnlimited ? '' : limitValue}
                                            onChange={(e) => {
                                              const value = e.target.value === '' ? -1 : parseInt(e.target.value) || -1;
                                              setFormData({
                                                ...formData,
                                                limits: {
                                                  ...formData.limits,
                                                  [limit.resource_key]: value,
                                                },
                                              });
                                            }}
                                            placeholder="Unlimited"
                                            min={-1}
                                            className="w-32"
                                          />
                                          {limit.unit !== 'count' && (
                                            <span className="text-xs text-muted-foreground">{unit}</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="rounded-lg border border-muted bg-muted/30 p-12 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">
                      No limits available
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Please create limit definitions first
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createPlan.isPending || updatePlan.isPending}
            >
              {createPlan.isPending || updatePlan.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingPlan ? (
                'Update Plan'
              ) : (
                'Create Plan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Plan Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Package className="h-6 w-6" />
              {viewingPlan?.name || 'Plan Details'}
              {viewingPlan?.isDefault && (
                <Badge variant="secondary">Default</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Complete plan information, features, and limits
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {viewingPlan && (
              <>
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Plan Name</Label>
                        <p className="font-medium">{viewingPlan.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Slug</Label>
                        <p className="font-medium font-mono text-sm">{viewingPlan.slug}</p>
                      </div>
                    </div>
                    {viewingPlan.description && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Description</Label>
                        <p className="text-sm">{viewingPlan.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <div className="mt-1">
                          {viewingPlan.deletedAt ? (
                            <Badge variant="destructive">
                              <XCircle className="mr-1 h-3 w-3" />
                              Inactive
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Sort Order</Label>
                        <p className="font-medium">{viewingPlan.sortOrder}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Billing & Pricing Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Billing & Pricing
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Billing Period */}
                    <div>
                      <Label className="text-sm text-muted-foreground">Billing Period</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{viewingPlan.billingPeriodLabel || 'Yearly'}</Badge>
                        {viewingPlan.billingPeriod === 'custom' && viewingPlan.customBillingDays && (
                          <span className="text-sm text-muted-foreground">
                            ({viewingPlan.customBillingDays} days)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* License Fee (One-time) */}
                    {viewingPlan.hasLicenseFee && (
                      <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">One-time</Badge>
                          <Label className="text-sm font-medium">License Fee</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">AFN</p>
                            <p className="font-medium text-lg">{viewingPlan.licenseFeeAfn?.toLocaleString() || 0} AFN</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">USD</p>
                            <p className="font-medium text-lg">${viewingPlan.licenseFeeUsd?.toLocaleString() || 0} USD</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Maintenance Fee (Recurring) */}
                    {viewingPlan.hasMaintenanceFee && (
                      <div className="p-3 rounded-lg bg-green-50/50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                            {viewingPlan.billingPeriodLabel || 'Yearly'}
                          </Badge>
                          <Label className="text-sm font-medium">Maintenance Fee</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">AFN</p>
                            <p className="font-medium text-lg">{viewingPlan.maintenanceFeeAfn?.toLocaleString() || 0} AFN</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">USD</p>
                            <p className="font-medium text-lg">${viewingPlan.maintenanceFeeUsd?.toLocaleString() || 0} USD</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total First Year */}
                    {(viewingPlan.hasLicenseFee || viewingPlan.hasMaintenanceFee) && (
                      <div className="p-3 rounded-lg bg-muted/50 border">
                        <Label className="text-sm font-medium">Total (First Year)</Label>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <p className="text-xs text-muted-foreground">AFN</p>
                            <p className="font-bold text-xl">{viewingPlan.totalFeeAfn?.toLocaleString() || 0} AFN</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">USD</p>
                            <p className="font-bold text-xl">${viewingPlan.totalFeeUsd?.toLocaleString() || 0} USD</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Per School Pricing */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <Label className="text-sm text-muted-foreground">Per School Price (AFN)</Label>
                        <p className="font-medium">{viewingPlan.perSchoolPriceAfn.toLocaleString()} AFN</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Per School Price (USD)</Label>
                        <p className="font-medium">${viewingPlan.perSchoolPriceUsd.toLocaleString()} USD</p>
                      </div>
                    </div>

                  </CardContent>
                </Card>

                {/* Periods & Limits */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Periods & Limits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Trial Days</Label>
                        <p className="font-medium">{viewingPlan.trialDays} days</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Grace Period Days</Label>
                        <p className="font-medium">{viewingPlan.gracePeriodDays} days</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Read-Only Period Days</Label>
                        <p className="font-medium">{viewingPlan.readonlyPeriodDays} days</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Max Schools</Label>
                        <p className="font-medium">
                          {viewingPlan.maxSchools === -1 ? 'Unlimited' : viewingPlan.maxSchools}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Features */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Features
                      <Badge variant="outline" className="ml-2">
                        {viewingPlan.features?.length || 0} enabled
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {featureDefinitions && featureDefinitions.length > 0 ? (
                      <div className="space-y-4">
                        {(() => {
                          // Get all enabled feature keys from the plan
                          const enabledFeatureKeys = viewingPlan.features && Array.isArray(viewingPlan.features) 
                            ? viewingPlan.features 
                            : [];
                          
                          if (enabledFeatureKeys.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No features enabled for this plan</p>
                              </div>
                            );
                          }

                          // Group features by category
                          const grouped = featureDefinitions.reduce((acc, feature) => {
                            const category = feature.category || 'Other';
                            if (!acc[category]) {
                              acc[category] = [];
                            }
                            acc[category].push(feature);
                            return acc;
                          }, {} as Record<string, typeof featureDefinitions>);

                          const sortedCategories = Object.keys(grouped).sort();

                          // Filter to only show categories that have at least one enabled feature
                          const categoriesWithEnabledFeatures = sortedCategories.filter((category) => {
                            const categoryFeatures = grouped[category];
                            return categoryFeatures.some((f) => enabledFeatureKeys.includes(f.feature_key));
                          });

                          if (categoriesWithEnabledFeatures.length === 0) {
                            return (
                              <div className="text-center py-8 text-muted-foreground">
                                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No enabled features found in any category</p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-4">
                              {categoriesWithEnabledFeatures.map((category) => {
                                const categoryFeatures = grouped[category].sort(
                                  (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
                                );
                                // Filter to only show enabled features
                                const enabledFeatures = categoryFeatures.filter((f) =>
                                  enabledFeatureKeys.includes(f.feature_key)
                                );

                                return (
                                  <Card key={category} className="overflow-hidden">
                                    <CardHeader className="pb-3">
                                      <div className="flex items-center justify-between">
                                        <CardTitle className="text-base capitalize">{category}</CardTitle>
                                        <Badge variant="outline" className="text-xs">
                                          {enabledFeatures.length} / {categoryFeatures.length} enabled
                                        </Badge>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      {enabledFeatures.map((feature) => (
                                        <div
                                          key={feature.feature_key}
                                          className="flex items-start gap-3 p-3 rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800"
                                        >
                                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <div className="font-medium text-sm capitalize">
                                                {feature.name || feature.feature_key.replace(/_/g, ' ')}
                                              </div>
                                              {feature.is_addon && (
                                                <Badge variant="secondary" className="text-xs">
                                                  Add-on
                                                </Badge>
                                              )}
                                            </div>
                                            {feature.description && (
                                              <p className="text-xs text-muted-foreground mt-1">
                                                {feature.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No features available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Limits */}
                {viewingPlan.limits && Object.keys(viewingPlan.limits).length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Limits
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(viewingPlan.limits).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div>
                              <div className="font-medium text-sm capitalize">
                                {key.replace(/_/g, ' ')}
                              </div>
                            </div>
                            <div className="font-bold">
                              {value === -1 ? 'Unlimited' : value.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Metadata</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Created At</Label>
                      <p className="text-sm font-medium">
                        {viewingPlan.createdAt ? new Date(viewingPlan.createdAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Updated At</Label>
                      <p className="text-sm font-medium">
                        {viewingPlan.updatedAt ? new Date(viewingPlan.updatedAt).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    {viewingPlan.deletedAt && (
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-muted-foreground">Deleted At</Label>
                        <p className="text-sm font-medium text-destructive">
                          {new Date(viewingPlan.deletedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t px-6 py-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {viewingPlan && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false);
                  handleOpenEdit(viewingPlan);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Plan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
