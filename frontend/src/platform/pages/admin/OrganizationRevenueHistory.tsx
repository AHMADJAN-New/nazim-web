import { useState, useMemo } from 'react';
import {
  Building2,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  RefreshCw,
  Search,
  Filter,
  Download,
  CreditCard,
  Wrench,
  Package,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { usePlatformOrganizations } from '@/platform/hooks/usePlatformAdmin';
import { usePlatformOrganizationRevenueHistory } from '@/platform/hooks/usePlatformAdmin';
import { platformApi } from '@/platform/lib/platformApi';
import { formatDate } from '@/lib/utils';
import type * as SubscriptionApi from '@/types/api/subscription';
import { Navigate } from 'react-router-dom';

export default function OrganizationRevenueHistory() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  // Use platform admin permissions directly (like PlansManagement and PlatformSettings)
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdminPermission = Array.isArray(permissions) && permissions.includes('subscription.admin');

  const { data: organizations = [], isLoading: orgsLoading } = usePlatformOrganizations();
  const { data: revenueHistory, isLoading: revenueLoading } = usePlatformOrganizationRevenueHistory(selectedOrganizationId);

  // Show loading while permissions are loading
  if (permissionsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Access control - redirect if no permission (match PlansManagement pattern)
  if (!hasAdminPermission) {
    return <Navigate to="/platform/dashboard" replace />;
  }

  // Filter organizations by search query
  const filteredOrganizations = useMemo(() => {
    if (!searchQuery.trim()) return organizations;
    
    const query = searchQuery.toLowerCase();
    return organizations.filter(org =>
      org.name.toLowerCase().includes(query) ||
      org.email?.toLowerCase().includes(query) ||
      org.phone?.toLowerCase().includes(query)
    );
  }, [organizations, searchQuery]);

  // Calculate total revenue across all organizations
  const totalRevenue = useMemo(() => {
    // This would require fetching revenue for all orgs, which is expensive
    // For now, we'll show it when an organization is selected
    return { afn: 0, usd: 0 };
  }, []);

  const paymentTypeLabels: Record<string, string> = {
    license: 'License Fee',
    maintenance: 'Maintenance Fee',
    renewal: 'Renewal (Legacy)',
    all: 'All Types',
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Organization Revenue History</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            View revenue breakdown by organization, payment type, and time period
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Types</SelectItem>
                <SelectItem value="license">License Fee</SelectItem>
                <SelectItem value="maintenance">Maintenance Fee</SelectItem>
                <SelectItem value="renewal">Renewal (Legacy)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            Click on an organization to view detailed revenue history
          </CardDescription>
        </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {orgsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organization</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden lg:table-cell">Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrganizations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No organizations found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrganizations.map((org) => (
                          <TableRow
                            key={org.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setSelectedOrganizationId(org.id)}
                          >
                            <TableCell className="font-medium max-w-[200px]">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="line-clamp-2 break-words">{org.name}</span>
                              </div>
                              <div className="md:hidden mt-1 text-xs text-muted-foreground">
                                {org.email || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{org.email || '-'}</TableCell>
                            <TableCell className="hidden lg:table-cell">{org.phone || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={org.isActive ? 'default' : 'secondary'}>
                                {org.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrganizationId(org.id);
                                }}
                                className="flex-shrink-0"
                              >
                                <FileText className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">View Revenue</span>
                                <span className="sm:hidden">View</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
                </div>
              )}
            </CardContent>
      </Card>

      {/* Revenue History Side Panel */}
      <Sheet open={!!selectedOrganizationId} onOpenChange={(open) => {
        if (!open) setSelectedOrganizationId(null);
      }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {revenueHistory?.organization?.name || 'Revenue History'}
            </SheetTitle>
            <SheetDescription>
              {revenueHistory ? 'Complete revenue history and payment breakdown' : 'Loading revenue history...'}
            </SheetDescription>
          </SheetHeader>

          {revenueLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : revenueHistory ? (
            <>

              <div className="mt-6 space-y-6">
                {/* Total Revenue Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">AFN</p>
                        <p className="text-2xl font-bold">
                          {revenueHistory.total_revenue.AFN?.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) || '0.00'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">USD</p>
                        <p className="text-2xl font-bold">
                          {revenueHistory.total_revenue.USD?.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) || '0.00'}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Total Payments: {revenueHistory.total_payments}
                    </p>
                  </CardContent>
                </Card>

                {/* Revenue by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Revenue by Payment Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(revenueHistory.totals_by_type).map(([type, totals]) => (
                        <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {type === 'license' && <CreditCard className="h-5 w-5 text-blue-500" />}
                            {type === 'maintenance' && <Wrench className="h-5 w-5 text-green-500" />}
                            {type === 'renewal' && <Package className="h-5 w-5 text-purple-500" />}
                            <div>
                              <p className="font-medium">{paymentTypeLabels[type] || type}</p>
                              <p className="text-sm text-muted-foreground">
                                {totals.count} payment{totals.count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {totals.AFN?.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }) || '0.00'} AFN
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ${totals.USD?.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }) || '0.00'} USD
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs for different views */}
                <Tabs defaultValue="payments" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="payments" className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">All Payments</span>
                      <span className="sm:hidden">Payments</span>
                    </TabsTrigger>
                    <TabsTrigger value="by-year" className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">By Year</span>
                      <span className="sm:hidden">Year</span>
                    </TabsTrigger>
                    <TabsTrigger value="by-month" className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">By Month</span>
                      <span className="sm:hidden">Month</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="payments" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Payment History</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 sm:p-6">
                        <div className="overflow-x-auto -mx-4 sm:mx-0">
                          <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                            <Table className="min-w-[500px]">
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead className="hidden md:table-cell">Plan</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                            <TableBody>
                              {revenueHistory.payments.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                    No payments found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                revenueHistory.payments
                                  .filter((payment) => {
                                    if (paymentTypeFilter !== 'all' && payment.payment_type !== paymentTypeFilter) {
                                      return false;
                                    }
                                    if (yearFilter !== 'all' && payment.confirmed_at) {
                                      const paymentYear = new Date(payment.confirmed_at).getFullYear().toString();
                                      if (paymentYear !== yearFilter) return false;
                                    }
                                    return true;
                                  })
                                  .map((payment) => (
                                    <TableRow key={payment.id}>
                                      <TableCell className="text-sm">
                                        {payment.confirmed_at
                                          ? formatDate(new Date(payment.confirmed_at))
                                          : payment.payment_date
                                          ? formatDate(new Date(payment.payment_date))
                                          : '-'}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          <span className="hidden sm:inline">{payment.payment_type_label}</span>
                                          <span className="sm:hidden">{payment.payment_type_label.split(' ')[0]}</span>
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="hidden md:table-cell">{payment.plan_name || '-'}</TableCell>
                                      <TableCell className="text-right">
                                        <div>
                                          <p className="font-medium text-sm sm:text-base">
                                            {payment.net_amount.toLocaleString('en-US', {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}{' '}
                                            {payment.currency}
                                          </p>
                                          {payment.discount_amount > 0 && (
                                            <p className="text-xs text-muted-foreground">
                                              Discount: {payment.discount_amount.toLocaleString('en-US', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              })}
                                            </p>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))
                              )}
                            </TableBody>
                          </Table>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="by-year" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Revenue by Year</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {Object.entries(revenueHistory.payments_by_year)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([year, totals]) => (
                              <div key={year} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">{year}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {totals.count} payment{totals.count !== 1 ? 's' : ''}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">
                                    {totals.AFN?.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }) || '0.00'} AFN
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    ${totals.USD?.toLocaleString('en-US', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }) || '0.00'} USD
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="by-month" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Revenue by Month</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {Object.entries(revenueHistory.payments_by_month)
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([month, totals]) => {
                              const [year, monthNum] = month.split('-');
                              const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' });
                              return (
                                <div key={month} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">{monthName} {year}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {totals.count} payment{totals.count !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {totals.AFN?.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }) || '0.00'} AFN
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      ${totals.USD?.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }) || '0.00'} USD
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground mt-6">
              No revenue history found
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

