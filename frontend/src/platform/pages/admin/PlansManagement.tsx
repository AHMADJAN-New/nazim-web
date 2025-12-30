import {
  CheckCircle,
  Edit,
  Package,
  Plus,
  RefreshCw,
  XCircle,
  CheckCircle2,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  usePlatformPlans,
  useCreatePlatformPlan,
  useUpdatePlatformPlan,
} from '@/platform/hooks/usePlatformAdmin';
import { usePlatformFeatureDefinitions } from '@/platform/hooks/usePlatformAdminComplete';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { showToast } from '@/lib/toast';

interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  price_yearly_afn: number;
  price_yearly_usd: number;
  trial_days: number;
  grace_period_days: number;
  readonly_period_days: number;
  max_schools: number;
  per_school_price_afn: number;
  per_school_price_usd: number;
  sort_order: number;
  is_default: boolean;
  features: Record<string, boolean>;
}

const initialFormData: PlanFormData = {
  name: '',
  slug: '',
  description: '',
  price_yearly_afn: 0,
  price_yearly_usd: 0,
  trial_days: 0,
  grace_period_days: 14,
  readonly_period_days: 60,
  max_schools: 1,
  per_school_price_afn: 0,
  per_school_price_usd: 0,
  sort_order: 0,
  is_default: false,
  features: {},
};

export default function PlansManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);

  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const { data: plans, isLoading } = usePlatformPlans();
  const { data: featureDefinitions, isLoading: featuresLoading, error: featuresError } = usePlatformFeatureDefinitions();
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
    setFormData({ ...initialFormData, features });
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
    setFormData({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || '',
      price_yearly_afn: plan.priceYearlyAfn,
      price_yearly_usd: plan.priceYearlyUsd,
      trial_days: plan.trialDays,
      grace_period_days: plan.gracePeriodDays,
      readonly_period_days: plan.readonlyPeriodDays,
      max_schools: plan.maxSchools,
      per_school_price_afn: plan.perSchoolPriceAfn,
      per_school_price_usd: plan.perSchoolPriceUsd,
      sort_order: plan.sortOrder,
      is_default: plan.isDefault,
      features,
    });
    setEditingPlan(plan.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const { features, ...planData } = formData;
      const payload = {
        ...planData,
        features: features || {},
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Subscription Plans
          </h1>
          <p className="text-muted-foreground">
            Manage available subscription plans
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            All Plans
          </CardTitle>
          <CardDescription>
            Click on a plan to edit its details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">AFN/Year</TableHead>
                <TableHead className="text-right">USD/Year</TableHead>
                <TableHead className="text-center">Max Schools</TableHead>
                <TableHead className="text-center">Trial Days</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">
                    {plan.name}
                    {plan.isDefault && (
                      <Badge variant="secondary" className="ml-2">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {plan.slug}
                  </TableCell>
                  <TableCell className="text-right">
                    {plan.priceYearlyAfn.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ${plan.priceYearlyUsd.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {plan.maxSchools === -1 ? 'Unlimited' : plan.maxSchools}
                  </TableCell>
                  <TableCell className="text-center">
                    {plan.trialDays}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {plan.features?.length || 0} feature{plan.features?.length !== 1 ? 's' : ''}
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
                  <TableCell className="text-right">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price_afn">Yearly Price (AFN) *</Label>
                    <Input
                      id="price_afn"
                      type="number"
                      step="0.01"
                      value={formData.price_yearly_afn}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_yearly_afn: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_usd">Yearly Price (USD) *</Label>
                    <Input
                      id="price_usd"
                      type="number"
                      step="0.01"
                      value={formData.price_yearly_usd}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_yearly_usd: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0.00"
                    />
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
    </div>
  );
}
