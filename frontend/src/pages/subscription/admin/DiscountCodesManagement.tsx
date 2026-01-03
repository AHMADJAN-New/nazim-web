import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Edit,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import {
  usePlatformDiscountCodes,
  usePlatformPlans,
  usePlatformCreateDiscountCode,
  usePlatformDeleteDiscountCode,
  usePlatformUpdateDiscountCode,
} from '@/platform/hooks/usePlatformAdminComplete';
import type * as SubscriptionApi from '@/types/api/subscription';

interface DiscountCodeFormData {
  code: string;
  name: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_discount_amount: number | null;
  currency: 'AFN' | 'USD' | null;
  applicable_plan_id: string | null;
  max_uses: number | null;
  max_uses_per_org: number;
  valid_from: string | null;
  valid_until: string | null;
}

const initialFormData: DiscountCodeFormData = {
  code: '',
  name: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 0,
  max_discount_amount: null,
  currency: null,
  applicable_plan_id: null,
  max_uses: null,
  max_uses_per_org: 1,
  valid_from: null,
  valid_until: null,
};

export default function DiscountCodesManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<DiscountCodeFormData>(initialFormData);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');

  const { data: codesResponse, isLoading } = usePlatformDiscountCodes();
  const { data: plans } = usePlatformPlans();
  const createCode = usePlatformCreateDiscountCode();
  const updateCode = usePlatformUpdateDiscountCode();
  const deleteCode = usePlatformDeleteDiscountCode();

  const codes = codesResponse?.data || [];

  // Filter codes
  const filteredCodes = useMemo(() => {
    let filtered = codes;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (code) =>
          code.code.toLowerCase().includes(query) ||
          code.name.toLowerCase().includes(query) ||
          code.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter((code) => {
        if (statusFilter === 'active') {
          return code.is_active && (!code.valid_until || new Date(code.valid_until) >= now);
        }
        if (statusFilter === 'inactive') {
          return !code.is_active;
        }
        if (statusFilter === 'expired') {
          return code.valid_until && new Date(code.valid_until) < now;
        }
        return true;
      });
    }

    return filtered;
  }, [codes, searchQuery, statusFilter]);

  const handleOpenCreate = () => {
    setFormData(initialFormData);
    setEditingCode(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (code: SubscriptionApi.DiscountCode) => {
    setFormData({
      code: code.code,
      name: code.name,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      max_discount_amount: code.max_discount_amount,
      currency: code.currency,
      applicable_plan_id: code.applicable_plan_id,
      max_uses: code.max_uses,
      max_uses_per_org: code.max_uses_per_org,
      valid_from: code.valid_from || null,
      valid_until: code.valid_until || null,
    });
    setEditingCode(code.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingCode) {
        await updateCode.mutateAsync({
          id: editingCode,
          ...formData,
        });
      } else {
        await createCode.mutateAsync(formData);
      }
      setIsDialogOpen(false);
      setFormData(initialFormData);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this discount code?')) {
      await deleteCode.mutateAsync(id);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast.success('Code copied to clipboard');
  };

  const getCodeStatus = (code: SubscriptionApi.DiscountCode) => {
    if (!code.is_active) {
      return { label: 'Inactive', variant: 'destructive' as const };
    }

    const now = new Date();
    if (code.valid_until && new Date(code.valid_until) < now) {
      return { label: 'Expired', variant: 'destructive' as const };
    }

    if (code.max_uses && code.current_uses >= code.max_uses) {
      return { label: 'Max Uses Reached', variant: 'secondary' as const };
    }

    if (code.valid_from && new Date(code.valid_from) > now) {
      return { label: 'Not Started', variant: 'secondary' as const };
    }

    return { label: 'Active', variant: 'default' as const };
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
            Discount Codes
          </h1>
          <p className="text-muted-foreground">
            Create and manage discount codes for subscriptions
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Code
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by code, name, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{codes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {codes.filter((c) => getCodeStatus(c).label === 'Active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Uses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {codes.reduce((sum, c) => sum + c.current_uses, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCodes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            All Discount Codes
          </CardTitle>
          <CardDescription>
            {filteredCodes.length} code(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No discount codes found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCodes.map((code) => {
                  const status = getCodeStatus(code);
                  const usagePercentage =
                    code.max_uses
                      ? (code.current_uses / code.max_uses) * 100
                      : 0;

                  return (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">
                        <div className="flex items-center gap-2">
                          {code.code}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyCode(code.code)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{code.name}</div>
                          {code.description && (
                            <div className="text-xs text-muted-foreground">
                              {code.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {code.discount_type === 'percentage'
                            ? `${code.discount_value}%`
                            : `${code.discount_value} ${code.currency || 'AFN'}`}
                        </div>
                        {code.max_discount_amount && (
                          <div className="text-xs text-muted-foreground">
                            Max: {code.max_discount_amount} {code.currency || 'AFN'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.applicable_plan_id ? (
                          <Badge variant="outline">
                            {plans?.find((p) => p.id === code.applicable_plan_id)?.name ||
                              'Unknown Plan'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">All Plans</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {code.current_uses} / {code.max_uses || '∞'}
                          </div>
                          {code.max_uses && (
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                              />
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {code.max_uses_per_org} per org
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {code.valid_from ? (
                            <div>From: {formatDate(new Date(code.valid_from))}</div>
                          ) : (
                            <div className="text-muted-foreground">No start date</div>
                          )}
                          {code.valid_until ? (
                            <div>Until: {formatDate(new Date(code.valid_until))}</div>
                          ) : (
                            <div className="text-muted-foreground">No expiry</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={status.variant}
                          className={
                            status.label === 'Active'
                              ? 'bg-green-500'
                              : status.label === 'Expired'
                                ? 'bg-red-500'
                                : ''
                          }
                        >
                          {status.label === 'Active' && (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          )}
                          {status.label === 'Expired' && (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {status.label === 'Inactive' && (
                            <AlertTriangle className="mr-1 h-3 w-3" />
                          )}
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenEdit(code)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(code.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCode ? 'Edit Discount Code' : 'Create Discount Code'}
            </DialogTitle>
            <DialogDescription>
              {editingCode
                ? 'Update the discount code details'
                : 'Create a new discount code for subscriptions'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="SUMMER2024"
                  disabled={!!editingCode}
                />
                <p className="text-xs text-muted-foreground">
                  Code will be automatically uppercased
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Sale 2024"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description for this discount code"
                rows={2}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="discount_type">
                  Discount Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(v) =>
                    setFormData({
                      ...formData,
                      discount_type: v as 'percentage' | 'fixed',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_value">
                  Discount Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="discount_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_value: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder={formData.discount_type === 'percentage' ? '10' : '1000'}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.discount_type === 'percentage'
                    ? 'Percentage (e.g., 10 for 10%)'
                    : 'Fixed amount'}
                </p>
              </div>
            </div>

            {formData.discount_type === 'fixed' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency || 'none'}
                    onValueChange={(v) =>
                      setFormData({
                        ...formData,
                        currency: v === 'none' ? null : (v as 'AFN' | 'USD'),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue>
                        {formData.currency ? formData.currency : 'Any Currency'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any Currency</SelectItem>
                      <SelectItem value="AFN">AFN</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_discount_amount">Max Discount Amount</Label>
                  <Input
                    id="max_discount_amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.max_discount_amount || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_discount_amount:
                          e.target.value === '' ? null : parseFloat(e.target.value) || null,
                      })
                    }
                    placeholder="Optional maximum discount"
                  />
                </div>
              </div>
            )}

            {formData.discount_type === 'percentage' && (
              <div className="space-y-2">
                <Label htmlFor="max_discount_amount">Max Discount Amount</Label>
                <Input
                  id="max_discount_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.max_discount_amount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_discount_amount:
                        e.target.value === '' ? null : parseFloat(e.target.value) || null,
                    })
                  }
                  placeholder="Optional maximum discount cap"
                />
                <p className="text-xs text-muted-foreground">
                  Cap the maximum discount amount (e.g., 5000 AFN)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="applicable_plan_id">Applicable Plan</Label>
              <Select
                value={formData.applicable_plan_id || 'all'}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    applicable_plan_id: v === 'all' ? null : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue>
                    {formData.applicable_plan_id
                      ? plans?.find((p) => p.id === formData.applicable_plan_id)?.name ||
                        'Unknown Plan'
                      : 'All Plans'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {plans
                    ?.filter((p) => !p.deletedAt)
                    .map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty to apply to all plans
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max_uses">Max Uses (Total)</Label>
                <Input
                  id="max_uses"
                  type="number"
                  min="1"
                  value={formData.max_uses || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_uses: e.target.value === '' ? null : parseInt(e.target.value) || null,
                    })
                  }
                  placeholder="Unlimited"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for unlimited uses
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_uses_per_org">
                  Max Uses Per Organization <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="max_uses_per_org"
                  type="number"
                  min="1"
                  value={formData.max_uses_per_org}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_uses_per_org: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="valid_from">Valid From</Label>
                <CalendarDatePicker
                  date={
                    formData.valid_from ? new Date(formData.valid_from) : undefined
                  }
                  onDateChange={(date) =>
                    setFormData({
                      ...formData,
                      valid_from: date ? date.toISOString().slice(0, 10) : null,
                    })
                  }
                  placeholder="No start date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="valid_until">Valid Until</Label>
                <CalendarDatePicker
                  date={
                    formData.valid_until ? new Date(formData.valid_until) : undefined
                  }
                  onDateChange={(date) =>
                    setFormData({
                      ...formData,
                      valid_until: date ? date.toISOString().slice(0, 10) : null,
                    })
                  }
                  placeholder="No expiry date"
                  minDate={formData.valid_from ? new Date(formData.valid_from) : undefined}
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
              disabled={
                createCode.isPending ||
                updateCode.isPending ||
                !formData.code ||
                !formData.name ||
                formData.discount_value <= 0
              }
            >
              {editingCode ? 'Update' : 'Create'} Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

