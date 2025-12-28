import {
  CheckCircle,
  Edit,
  Package,
  Plus,
  RefreshCw,
  XCircle,
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
import { useHasPermission } from '@/hooks/usePermissions';
import {
  useAdminPlans,
  useCreatePlan,
  useUpdatePlan,
} from '@/hooks/useSubscriptionAdmin';
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
};

export default function PlansManagement() {
  const hasAdminPermission = useHasPermission('subscription.admin');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);

  const { data: plans, isLoading } = useAdminPlans();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  // Access control
  if (!hasAdminPermission) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setEditingPlan(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: (typeof plans)[0]) => {
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
    });
    setEditingPlan(plan.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingPlan) {
        await updatePlan.mutateAsync({
          id: editingPlan,
          ...formData,
        });
        showToast.success('Plan updated successfully');
      } else {
        await createPlan.mutateAsync(formData);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? 'Update the plan details below'
                : 'Fill in the plan details below'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Basic"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="e.g., basic"
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
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_afn">Yearly Price (AFN)</Label>
                <Input
                  id="price_afn"
                  type="number"
                  value={formData.price_yearly_afn}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_yearly_afn: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_usd">Yearly Price (USD)</Label>
                <Input
                  id="price_usd"
                  type="number"
                  value={formData.price_yearly_usd}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_yearly_usd: parseFloat(e.target.value) || 0,
                    })
                  }
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="per_school_afn">Per School (AFN)</Label>
                <Input
                  id="per_school_afn"
                  type="number"
                  value={formData.per_school_price_afn}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      per_school_price_afn: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="per_school_usd">Per School (USD)</Label>
                <Input
                  id="per_school_usd"
                  type="number"
                  value={formData.per_school_price_usd}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      per_school_price_usd: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
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
