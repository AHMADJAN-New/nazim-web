import { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, AlertTriangle, Calendar } from 'lucide-react';
import { useAssets, useAssetStats } from '@/hooks/useAssets';
import { useAssetCategories } from '@/hooks/useAssetCategories';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { isBefore, isAfter } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import type { Asset } from '@/types/domain/asset';
import type { AssetCategory } from '@/hooks/useAssetCategories';
import type * as AssetApi from '@/types/api/asset';

export default function AssetReportsTab() {
  const { t } = useLanguage();
  const { assets: assetsData, isLoading: assetsLoading } = useAssets(undefined, false);
  const assets: Asset[] = (assetsData as Asset[]) || [];
  const { data: stats, isLoading: statsLoading } = useAssetStats();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const isLoading = assetsLoading || statsLoading;

  const { data: assetCategoriesData } = useAssetCategories();
  const assetCategories: AssetCategory[] = (assetCategoriesData as AssetCategory[]) || [];
  
  // Get unique categories
  const categories = useMemo(() => {
    // Use asset categories from API if available, otherwise fall back to unique categories from assets
    if (assetCategories && assetCategories.length > 0) {
      return assetCategories.filter((cat) => cat.is_active).map((cat) => cat.name);
    }
    // Fallback: extract unique categories from assets
    const cats = new Set<string>();
    assets.forEach((asset) => {
      if (asset.categoryName) {
        cats.add(asset.categoryName);
      } else if (asset.category) {
        cats.add(asset.category);
      }
    });
    return Array.from(cats).sort();
  }, [assets, assetCategories]);

  // Filter assets
  const filteredAssets = useMemo(() => {
    if (!assets || assets.length === 0) return [];
    let filtered: Asset[] = [...assets];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((a) => 
        a.categoryName === categoryFilter || a.category === categoryFilter
      );
    }
    
    return filtered;
  }, [assets, statusFilter, categoryFilter]);

  // Calculate statistics
  const calculatedStats = useMemo(() => {
    const totalAssets = filteredAssets.length;
    
    // Total price for 1 copy of each asset
    const totalPrice = filteredAssets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
    
    // Total value for all copies (price × copies)
    const getEffectiveCopies = (asset: Asset): number => {
      const copies = asset.totalCopies ?? asset.totalCopiesCount ?? 1;
      return copies > 0 ? copies : 1;
    };
    
    const totalValue = filteredAssets.reduce((sum, a) => {
      const price = a.purchasePrice || 0;
      const copies = getEffectiveCopies(a);
      return sum + (price * copies);
    }, 0);
    
    const totalCopies = filteredAssets.reduce((sum, a) => sum + getEffectiveCopies(a), 0);
    
    const totalMaintenanceCost = filteredAssets.reduce((sum, a) => sum + (a.maintenanceCostTotal || 0), 0);
    
    const statusCounts: Record<string, number> = {};
    filteredAssets.forEach((asset) => {
      statusCounts[asset.status] = (statusCounts[asset.status] || 0) + 1;
    });

    const categoryCounts: Record<string, number> = {};
    filteredAssets.forEach((asset) => {
      const cat = asset.categoryName || asset.category || 'Uncategorized';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Assets needing maintenance (warranty expired or maintenance overdue)
    const needsMaintenance = filteredAssets.filter((asset) => {
      if (asset.warrantyExpiry && isBefore(new Date(asset.warrantyExpiry), new Date())) {
        return true;
      }
      // Check if maintenance is overdue based on next due date
      if (asset.maintenanceRecords && asset.maintenanceRecords.length > 0) {
        const latestMaintenance = asset.maintenanceRecords
          .filter((m) => m.nextDueDate)
          .sort((a, b) => {
            const dateA = a.nextDueDate ? new Date(a.nextDueDate).getTime() : 0;
            const dateB = b.nextDueDate ? new Date(b.nextDueDate).getTime() : 0;
            return dateB - dateA;
          })[0];
        
        if (latestMaintenance?.nextDueDate && isBefore(new Date(latestMaintenance.nextDueDate), new Date())) {
          return true;
        }
      }
      return false;
    });

    // Assets with active assignments
    const assignedAssets = filteredAssets.filter((asset) => asset.activeAssignment !== null);

    return {
      totalAssets,
      totalPrice,
      totalValue,
      totalCopies,
      totalMaintenanceCost,
      statusCounts,
      categoryCounts,
      needsMaintenance: needsMaintenance.length,
      assignedAssets: assignedAssets.length,
    };
  }, [filteredAssets]);

  // Assets by status
  const assetsByStatus = useMemo(() => {
    const grouped: Record<string, Asset[]> = {};
    filteredAssets.forEach((asset) => {
      if (!grouped[asset.status]) {
        grouped[asset.status] = [];
      }
      grouped[asset.status].push(asset);
    });
    return grouped;
  }, [filteredAssets]);

  // Assets by category
  const assetsByCategory = useMemo(() => {
    const grouped: Record<string, Asset[]> = {};
    filteredAssets.forEach((asset) => {
      const cat = asset.categoryName || asset.category || 'Uncategorized';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(asset);
    });
    return grouped;
  }, [filteredAssets]);

  // Assets needing maintenance
  const assetsNeedingMaintenance = useMemo(() => {
    return filteredAssets.filter((asset) => {
      if (asset.warrantyExpiry && isBefore(new Date(asset.warrantyExpiry), new Date())) {
        return true;
      }
      if (asset.maintenanceRecords && asset.maintenanceRecords.length > 0) {
        const latestMaintenance = asset.maintenanceRecords
          .filter((m) => m.nextDueDate)
          .sort((a, b) => {
            const dateA = a.nextDueDate ? new Date(a.nextDueDate).getTime() : 0;
            const dateB = b.nextDueDate ? new Date(b.nextDueDate).getTime() : 0;
            return dateB - dateA;
          })[0];
        
        if (latestMaintenance?.nextDueDate && isBefore(new Date(latestMaintenance.nextDueDate), new Date())) {
          return true;
        }
      }
      return false;
    });
  }, [filteredAssets]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-semibold">{t('assets.assetReports')}</h1>
            <p className="text-sm text-muted-foreground">Analytics and insights for your assets</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assets</CardDescription>
            <CardTitle className="text-2xl">{(stats as AssetApi.AssetStats | undefined)?.asset_count ?? calculatedStats.totalAssets}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              <div>{calculatedStats.totalCopies} total copies</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {calculatedStats.assignedAssets} assigned
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {calculatedStats.totalAssets - calculatedStats.assignedAssets} available
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Price</CardDescription>
            <CardTitle className="text-2xl">
              ${calculatedStats.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Sum of all asset prices (1 copy each)
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Value</CardDescription>
            <CardTitle className="text-2xl">
              ${calculatedStats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Price × Total Copies
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Maintenance Cost</CardDescription>
            <CardTitle className="text-2xl">
              ${calculatedStats.totalMaintenanceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {calculatedStats.needsMaintenance} need attention
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="disposed">Disposed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="status-breakdown" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status-breakdown" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Status Breakdown
          </TabsTrigger>
          <TabsTrigger value="category-breakdown" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Category Breakdown
          </TabsTrigger>
          <TabsTrigger value="needs-maintenance" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Needs Maintenance
            {calculatedStats.needsMaintenance > 0 && (
              <Badge variant="destructive" className="ml-1">
                {calculatedStats.needsMaintenance}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="value-analysis" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Value Analysis
          </TabsTrigger>
        </TabsList>

        {/* Status Breakdown Tab */}
        <TabsContent value="status-breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assets by Status</CardTitle>
              <CardDescription>Distribution of assets across different statuses</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Copies</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(calculatedStats.statusCounts).map(([status, count]) => {
                    const statusAssets = assetsByStatus[status] || [];
                    const statusValue = statusAssets.reduce((sum, a) => {
                      const price = a.purchasePrice || 0;
                      const copies = a.totalCopiesCount ?? a.totalCopies ?? 1;
                      return sum + (price * copies);
                    }, 0);
                    const totalCopies = statusAssets.reduce((sum, a) => sum + (a.totalCopiesCount ?? a.totalCopies ?? 1), 0);
                    const assignedCopies = statusAssets.reduce((sum, a) => {
                      const total = a.totalCopiesCount ?? a.totalCopies ?? 1;
                      const available = a.availableCopiesCount ?? 0;
                      return sum + (total - available);
                    }, 0);
                    const percentage = calculatedStats.totalAssets > 0 ? ((count / calculatedStats.totalAssets) * 100).toFixed(1) : '0';
                    return (
                      <TableRow key={status}>
                        <TableCell>
                          <Badge 
                            variant={status === 'available' ? 'default' : status === 'assigned' ? 'default' : status === 'maintenance' ? 'default' : 'secondary'}
                            className={
                              status === 'available' ? 'bg-green-500 hover:bg-green-600 text-white' :
                              status === 'assigned' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                              status === 'maintenance' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                              status === 'lost' || status === 'disposed' ? 'bg-red-500 hover:bg-red-600 text-white' :
                              ''
                            }
                          >
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>{count}</TableCell>
                        <TableCell>{totalCopies}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>{assignedCopies}</span>
                            <span className="text-xs text-muted-foreground">/ {totalCopies}</span>
                          </div>
                        </TableCell>
                        <TableCell>${statusValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>{percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Category Breakdown Tab */}
        <TabsContent value="category-breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assets by Category</CardTitle>
              <CardDescription>Distribution of assets across different categories</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Copies</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(calculatedStats.categoryCounts).map(([category, count]) => {
                    const categoryAssets = assetsByCategory[category] || [];
                    const categoryValue = categoryAssets.reduce((sum, a) => {
                      const price = a.purchasePrice || 0;
                      const copies = a.totalCopiesCount ?? a.totalCopies ?? 1;
                      return sum + (price * copies);
                    }, 0);
                    const totalCopies = categoryAssets.reduce((sum, a) => sum + (a.totalCopiesCount ?? a.totalCopies ?? 1), 0);
                    const assignedCopies = categoryAssets.reduce((sum, a) => {
                      const total = a.totalCopiesCount ?? a.totalCopies ?? 1;
                      const available = a.availableCopiesCount ?? 0;
                      return sum + (total - available);
                    }, 0);
                    const percentage = calculatedStats.totalAssets > 0 ? ((count / calculatedStats.totalAssets) * 100).toFixed(1) : '0';
                    return (
                      <TableRow key={category}>
                        <TableCell className="font-medium">{category}</TableCell>
                        <TableCell>{count}</TableCell>
                        <TableCell>{totalCopies}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>{assignedCopies}</span>
                            <span className="text-xs text-muted-foreground">/ {totalCopies}</span>
                          </div>
                        </TableCell>
                        <TableCell>${categoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell>{percentage}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Needs Maintenance Tab */}
        <TabsContent value="needs-maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assets Needing Maintenance</CardTitle>
              <CardDescription>Assets with expired warranties or overdue maintenance</CardDescription>
            </CardHeader>
            <CardContent>
              {assetsNeedingMaintenance.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground">
                  No assets need maintenance
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead>Last Maintenance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetsNeedingMaintenance.map((asset) => {
                      const warrantyExpired = asset.warrantyExpiry && isBefore(new Date(asset.warrantyExpiry), new Date());
                      const latestMaintenance = asset.maintenanceRecords
                        ?.filter((m) => m.nextDueDate)
                        .sort((a, b) => {
                          const dateA = a.nextDueDate ? new Date(a.nextDueDate).getTime() : 0;
                          const dateB = b.nextDueDate ? new Date(b.nextDueDate).getTime() : 0;
                          return dateB - dateA;
                        })[0];
                      const maintenanceOverdue = latestMaintenance?.nextDueDate && isBefore(new Date(latestMaintenance.nextDueDate), new Date());
                      
                      return (
                        <TableRow key={asset.id}>
                          <TableCell className="font-medium">{asset.name}</TableCell>
                          <TableCell>{asset.assetTag}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={asset.status === 'available' ? 'default' : asset.status === 'assigned' ? 'default' : asset.status === 'maintenance' ? 'default' : 'secondary'}
                              className={
                                asset.status === 'available' ? 'bg-green-500 hover:bg-green-600 text-white' :
                                asset.status === 'assigned' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                                asset.status === 'maintenance' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                                asset.status === 'lost' || asset.status === 'disposed' ? 'bg-red-500 hover:bg-red-600 text-white' :
                                ''
                              }
                            >
                              {asset.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {warrantyExpired && <Badge variant="destructive">Warranty Expired</Badge>}
                            {maintenanceOverdue && <Badge variant="destructive">Maintenance Overdue</Badge>}
                          </TableCell>
                          <TableCell>
                            {latestMaintenance?.performedOn
                              ? format(new Date(latestMaintenance.performedOn), 'MMM dd, yyyy')
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Value Analysis Tab */}
        <TabsContent value="value-analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Valued Assets</CardTitle>
                <CardDescription>Assets with highest purchase value</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets
                      .filter((a) => a.purchasePrice)
                      .sort((a, b) => (b.purchasePrice || 0) - (a.purchasePrice || 0))
                      .slice(0, 10)
                      .map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell>{asset.name}</TableCell>
                          <TableCell className="font-medium">${(asset.purchasePrice || 0).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Cost Leaders</CardTitle>
                <CardDescription>Assets with highest maintenance costs</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Maintenance Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssets
                      .filter((a) => (a.maintenanceCostTotal ?? 0) > 0)
                      .sort((a, b) => (b.maintenanceCostTotal ?? 0) - (a.maintenanceCostTotal ?? 0))
                      .slice(0, 10)
                      .map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{asset.name}</p>
                              <p className="text-xs text-muted-foreground">Tag: {asset.assetTag}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ${((asset.maintenanceCostTotal ?? 0) as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredAssets.filter((a) => (a.maintenanceCostTotal ?? 0) > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          No maintenance costs recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

