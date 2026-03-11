import { AlertTriangle, BarChart3, Clock, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { usePlatformLimitDetails, usePlatformLimitsOverview } from '@/platform/hooks/usePlatformAdminComplete';
import type { OrganizationLimitsOverviewRow } from '@/types/api/subscription';

type FlatLimitRow = {
  organizationId: string;
  organizationName: string;
  subscriptionStatus: string;
  planName: string | null;
  resourceKey: string;
  resourceName: string;
  current: number;
  limit: number;
  percentage: number;
  warning: boolean;
  isAtLimit: boolean;
  hasOverride: boolean;
  lastCalculatedAt: string | null;
};

function getStatusBadge(limit: FlatLimitRow) {
  if (limit.limit === -1) return <Badge variant="secondary">Unlimited</Badge>;
  if (limit.isAtLimit) return <Badge variant="destructive">At Limit</Badge>;
  if (limit.warning) return <Badge variant="outline">Warning</Badge>;
  return <Badge variant="default">Healthy</Badge>;
}

export default function OrganizationLimitsOverview() {
  const [search, setSearch] = useState('');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedResourceKey, setSelectedResourceKey] = useState<string | null>(null);

  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasPlatformAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const { data: overviewRows = [], isLoading: overviewLoading, refetch } = usePlatformLimitsOverview();

  const { data: limitDetails, isLoading: detailsLoading } = usePlatformLimitDetails(
    selectedOrgId,
    selectedResourceKey
  );

  const flatRows = useMemo<FlatLimitRow[]>(() => {
    return (overviewRows as OrganizationLimitsOverviewRow[]).flatMap((row) =>
      row.limits.map((limit) => ({
        organizationId: row.organization.id,
        organizationName: row.organization.name,
        subscriptionStatus: row.subscription.status,
        planName: row.subscription.plan_name,
        resourceKey: limit.resource_key,
        resourceName: limit.name,
        current: limit.current,
        limit: limit.limit,
        percentage: limit.percentage,
        warning: limit.warning,
        isAtLimit: limit.is_at_limit,
        hasOverride: limit.has_override,
        lastCalculatedAt: limit.last_calculated_at,
      }))
    );
  }, [overviewRows]);

  const resourceOptions = useMemo(() => {
    const map = new Map<string, string>();
    flatRows.forEach((row) => {
      map.set(row.resourceKey, row.resourceName);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [flatRows]);

  const filteredRows = useMemo(() => {
    return flatRows.filter((row) => {
      const matchesSearch =
        search.trim() === '' ||
        row.organizationName.toLowerCase().includes(search.toLowerCase()) ||
        row.resourceName.toLowerCase().includes(search.toLowerCase()) ||
        row.resourceKey.toLowerCase().includes(search.toLowerCase());
      const matchesResource = resourceFilter === 'all' || row.resourceKey === resourceFilter;
      return matchesSearch && matchesResource;
    });
  }, [flatRows, search, resourceFilter]);

  const atLimitCount = filteredRows.filter((r) => r.isAtLimit).length;
  const warningCount = filteredRows.filter((r) => r.warning && !r.isAtLimit).length;
  const overrideCount = filteredRows.filter((r) => r.hasOverride).length;

  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPlatformAdmin) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization Limits Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Central view of all limit usage across organizations
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void refetch()}
          disabled={overviewLoading}
          className="w-full md:w-auto"
        >
          <RefreshCw className={`h-4 w-4 ${overviewLoading ? 'animate-spin' : ''}`} />
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tracked Rows</CardDescription>
            <CardTitle className="text-xl">{filteredRows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>At Limit</CardDescription>
            <CardTitle className="text-xl text-destructive">{atLimitCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Warnings</CardDescription>
            <CardTitle className="text-xl">{warningCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Overrides</CardDescription>
            <CardTitle className="text-xl">{overrideCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-1 md:grid-cols-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organization or limit..."
              className="pl-9"
            />
          </div>
          <Select value={resourceFilter} onValueChange={setResourceFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by limit type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Limit Types</SelectItem>
              {resourceOptions.map(([key, name]) => (
                <SelectItem key={key} value={key}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limits Matrix</CardTitle>
          <CardDescription>
            Click any row to view deep history: overrides, snapshots, and tracking details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Last Refresh</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No matching limit records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={`${row.organizationId}-${row.resourceKey}`}>
                      <TableCell>
                        <div className="font-medium">{row.organizationName}</div>
                        <div className="text-xs text-muted-foreground">{row.planName || row.subscriptionStatus}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.resourceName}</div>
                        <div className="text-xs text-muted-foreground">{row.resourceKey}</div>
                      </TableCell>
                      <TableCell>
                        {row.current} / {row.limit === -1 ? 'Unlimited' : row.limit}
                        {row.limit !== -1 && (
                          <div className="text-xs text-muted-foreground">{Math.round(row.percentage)}%</div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(row)}</TableCell>
                      <TableCell>
                        {row.hasOverride ? <Badge variant="outline">Yes</Badge> : <span className="text-muted-foreground">No</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {row.lastCalculatedAt ? formatDate(new Date(row.lastCalculatedAt)) : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOrgId(row.organizationId);
                            setSelectedResourceKey(row.resourceKey);
                          }}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedOrgId && !!selectedResourceKey}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrgId(null);
            setSelectedResourceKey(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Limit Details & History
            </DialogTitle>
            <DialogDescription>
              Current status, override changes, and usage trend snapshots
            </DialogDescription>
          </DialogHeader>

          {detailsLoading ? (
            <div className="py-10 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !limitDetails ? (
            <div className="py-8 text-center text-muted-foreground">No limit details available</div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {limitDetails.organization.name} - {limitDetails.limit_definition.name}
                  </CardTitle>
                  <CardDescription>{limitDetails.limit_definition.resource_key}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 grid-cols-1 md:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Current</div>
                    <div className="font-semibold">{limitDetails.current_status.current}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Limit</div>
                    <div className="font-semibold">
                      {limitDetails.current_status.limit === -1 ? 'Unlimited' : limitDetails.current_status.limit}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Remaining</div>
                    <div className="font-semibold">{limitDetails.current_status.remaining}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Last Calculated</div>
                    <div className="text-sm">
                      {limitDetails.usage_tracking.last_calculated_at
                        ? formatDate(new Date(limitDetails.usage_tracking.last_calculated_at))
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Reset Period</div>
                    <div className="text-sm">{limitDetails.limit_definition.reset_period}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div>
                      {limitDetails.current_status.allowed ? (
                        <Badge variant="default">Allowed</Badge>
                      ) : (
                        <Badge variant="destructive">Blocked</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Active Override</CardTitle>
                </CardHeader>
                <CardContent>
                  {limitDetails.active_override ? (
                    <div className="space-y-1 text-sm">
                      <div>Limit Value: {limitDetails.active_override.limit_value}</div>
                      <div>Reason: {limitDetails.active_override.reason || 'N/A'}</div>
                      <div>
                        Expires:{' '}
                        {limitDetails.active_override.expires_at
                          ? formatDate(new Date(limitDetails.active_override.expires_at))
                          : 'No expiry'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No active override</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Overrides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {limitDetails.recent_overrides.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No override records</div>
                  ) : (
                    limitDetails.recent_overrides.map((item) => (
                      <div key={item.id} className="rounded border p-2 text-sm">
                        <div className="font-medium">Limit: {item.limit_value}</div>
                        <div className="text-muted-foreground">{item.reason || 'No reason'}</div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Usage Snapshots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Usage</TableHead>
                          <TableHead>Limit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {limitDetails.usage_snapshots.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                              No snapshots
                            </TableCell>
                          </TableRow>
                        ) : (
                          limitDetails.usage_snapshots.map((snap, idx) => (
                            <TableRow key={`${snap.snapshot_date}-${idx}`}>
                              <TableCell>{snap.snapshot_date || 'N/A'}</TableCell>
                              <TableCell>{snap.usage}</TableCell>
                              <TableCell>{snap.limit === -1 ? 'Unlimited' : snap.limit}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {limitDetails.current_status.message && (
                <Card className="border-yellow-300 bg-yellow-50">
                  <CardContent className="pt-6 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5" />
                    <p className="text-sm">{limitDetails.current_status.message}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
