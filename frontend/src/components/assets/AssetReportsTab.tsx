import { isBefore, isAfter } from 'date-fns';
import { BarChart3, TrendingUp, DollarSign, AlertTriangle, Calendar } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { LoadingSpinner } from '@/components/ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssetCategories } from '@/hooks/useAssetCategories';
import type { AssetCategory } from '@/hooks/useAssetCategories';
import { useAssets, useAssetStats } from '@/hooks/useAssets';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import type * as AssetApi from '@/types/api/asset';
import type { Asset } from '@/types/domain/asset';

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

  // Helper function to get currency symbol for an asset
  const getAssetCurrencySymbol = (asset: Asset): string => {
    // Try asset's currency first
    if (asset.currency?.symbol) {
      return asset.currency.symbol;
    }
    // Try finance account's currency
    if (asset.financeAccount?.currency?.symbol) {
      return asset.financeAccount.currency.symbol;
    }
    // Fallback to currency code if no symbol
    if (asset.currency?.code) {
      return asset.currency.code;
    }
    if (asset.financeAccount?.currency?.code) {
      return asset.financeAccount.currency.code;
    }
    return '$'; // Default fallback
  };

  // Helper function to format price with currency symbol
  const formatAssetPrice = (asset: Asset, price: number): string => {
    const symbol = getAssetCurrencySymbol(asset);
    return `${symbol} ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to format amount with currency symbol
  const formatAmountWithSymbol = (amount: number, symbol: string): string => {
    return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate statistics
  const calculatedStats = useMemo(() => {
    const totalAssets = filteredAssets.length;
    
    // Total price for 1 copy of each asset (grouped by currency)
    const totalPriceByCurrency: Record<string, { symbol: string; amount: number }> = {};
    filteredAssets.forEach((asset) => {
      const price = asset.purchasePrice || 0;
      if (price > 0) {
        const currencyKey = asset.currency?.code || asset.financeAccount?.currency?.code || 'USD';
        const symbol = getAssetCurrencySymbol(asset);
        if (!totalPriceByCurrency[currencyKey]) {
          totalPriceByCurrency[currencyKey] = { symbol, amount: 0 };
        }
        totalPriceByCurrency[currencyKey].amount += price;
      }
    });
    
    // Total value for all copies (price × copies) - grouped by currency
    const getEffectiveCopies = (asset: Asset): number => {
      const copies = asset.totalCopies ?? asset.totalCopiesCount ?? 1;
      return copies > 0 ? copies : 1;
    };
    
    const totalValueByCurrency: Record<string, { symbol: string; amount: number }> = {};
    filteredAssets.forEach((asset) => {
      const price = asset.purchasePrice || 0;
      const copies = getEffectiveCopies(asset);
      const value = price * copies;
      if (value > 0) {
        const currencyKey = asset.currency?.code || asset.financeAccount?.currency?.code || 'USD';
        const symbol = getAssetCurrencySymbol(asset);
        if (!totalValueByCurrency[currencyKey]) {
          totalValueByCurrency[currencyKey] = { symbol, amount: 0 };
        }
        totalValueByCurrency[currencyKey].amount += value;
      }
    });
    
    // For backward compatibility, calculate single totals (using first currency or default)
    const firstCurrency = Object.keys(totalPriceByCurrency)[0] || 'USD';
    const totalPrice = totalPriceByCurrency[firstCurrency]?.amount || 0;
    const totalValue = totalValueByCurrency[firstCurrency]?.amount || 0;
    
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
      totalPriceByCurrency,
      totalValueByCurrency,
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
            <p className="text-sm text-muted-foreground">{t('assets.analyticsInsights')}</p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('assets.totalAssets')}
          value={(stats as AssetApi.AssetStats | undefined)?.asset_count ?? calculatedStats.totalAssets}
          icon={BarChart3}
          description={`${calculatedStats.totalCopies} ${t('assets.totalCopiesLabel')}`}
          color="blue"
        />
        <StatsCard
          title={t('assets.totalPrice')}
          value={
            Object.entries(calculatedStats.totalPriceByCurrency).length > 0
              ? Object.entries(calculatedStats.totalPriceByCurrency)
                  .map(([code, { symbol, amount }]) => formatAmountWithSymbol(amount, symbol))
                  .join(' + ')
              : '$0.00'
          }
          icon={DollarSign}
          description={t('assets.sumOfPrices')}
          color="green"
        />
        <StatsCard
          title={t('assets.totalValue')}
          value={
            Object.entries(calculatedStats.totalValueByCurrency).length > 0
              ? Object.entries(calculatedStats.totalValueByCurrency)
                  .map(([code, { symbol, amount }]) => formatAmountWithSymbol(amount, symbol))
                  .join(' + ')
              : '$0.00'
          }
          icon={TrendingUp}
          description={t('assets.priceTimesCopies')}
          color="purple"
        />
        <StatsCard
          title={t('assets.maintenanceCost')}
          value={formatCurrency(calculatedStats.totalMaintenanceCost)}
          icon={AlertTriangle}
          description={`${calculatedStats.needsMaintenance} ${t('assets.needAttention')}`}
          color="amber"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('assets.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('assets.allStatuses')}</SelectItem>
            <SelectItem value="available">{t('assets.available')}</SelectItem>
            <SelectItem value="assigned">{t('assets.assigned')}</SelectItem>
            <SelectItem value="maintenance">{t('assets.maintenance')}</SelectItem>
            <SelectItem value="retired">{t('assets.retired')}</SelectItem>
            <SelectItem value="lost">{t('assets.lost')}</SelectItem>
            <SelectItem value="disposed">{t('assets.disposed')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t('assets.filterByCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('assets.allCategories')}</SelectItem>
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
        <TabsList className="flex w-full gap-1 h-auto flex-shrink-0 overflow-x-auto pb-1">
          <TabsTrigger value="status-breakdown" className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.statusBreakdown')}</span>
            <span className="sm:hidden">{t('assets.status')}</span>
          </TabsTrigger>
          <TabsTrigger value="category-breakdown" className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.categoryBreakdown')}</span>
            <span className="sm:hidden">{t('assets.category')}</span>
          </TabsTrigger>
          <TabsTrigger value="needs-maintenance" className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.needsMaintenance')}</span>
            <span className="sm:hidden">{t('assets.maintenance')}</span>
            {calculatedStats.needsMaintenance > 0 && (
              <Badge variant="destructive" className="ml-1">
                {calculatedStats.needsMaintenance}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="value-analysis" className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t('assets.valueAnalysis')}</span>
            <span className="sm:hidden">{t('assets.value')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Status Breakdown Tab */}
        <TabsContent value="status-breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('assets.assetsByStatus')}</CardTitle>
              <CardDescription>{t('assets.statusDistribution')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('assets.status')}</TableHead>
                    <TableHead>{t('assets.count')}</TableHead>
                    <TableHead>{t('assets.copies')}</TableHead>
                    <TableHead>{t('assets.assigned')}</TableHead>
                    <TableHead>{t('assets.totalValue')}</TableHead>
                    <TableHead>{t('assets.percentage')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(calculatedStats.statusCounts).map(([status, count]) => {
                    const statusAssets = assetsByStatus[status] || [];
                    // Calculate value grouped by currency
                    const statusValueByCurrency: Record<string, { symbol: string; amount: number }> = {};
                    statusAssets.forEach((a) => {
                      const price = a.purchasePrice || 0;
                      const copies = a.totalCopiesCount ?? a.totalCopies ?? 1;
                      const value = price * copies;
                      if (value > 0) {
                        const currencyKey = a.currency?.code || a.financeAccount?.currency?.code || 'USD';
                        const symbol = getAssetCurrencySymbol(a);
                        if (!statusValueByCurrency[currencyKey]) {
                          statusValueByCurrency[currencyKey] = { symbol, amount: 0 };
                        }
                        statusValueByCurrency[currencyKey].amount += value;
                      }
                    });
                    const statusValue = Object.values(statusValueByCurrency).reduce((sum, curr) => sum + curr.amount, 0);
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
                        <TableCell>
                          {Object.entries(statusValueByCurrency).map(([code, { symbol, amount }], index) => (
                            <span key={code}>
                              {index > 0 && <span className="text-muted-foreground"> + </span>}
                              <span>{formatAmountWithSymbol(amount, symbol)}</span>
                            </span>
                          ))}
                          {Object.keys(statusValueByCurrency).length === 0 && (
                            <span className="text-muted-foreground">$0.00</span>
                          )}
                        </TableCell>
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
              <CardTitle>{t('assets.assetsByCategoryTitle')}</CardTitle>
              <CardDescription>{t('assets.categoryDistribution')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('assets.category')}</TableHead>
                    <TableHead>{t('assets.count')}</TableHead>
                    <TableHead>{t('assets.copies')}</TableHead>
                    <TableHead>{t('assets.assigned')}</TableHead>
                    <TableHead>{t('assets.totalValue')}</TableHead>
                    <TableHead>{t('assets.percentage')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(calculatedStats.categoryCounts).map(([category, count]) => {
                    const categoryAssets = assetsByCategory[category] || [];
                    // Calculate value grouped by currency
                    const categoryValueByCurrency: Record<string, { symbol: string; amount: number }> = {};
                    categoryAssets.forEach((a) => {
                      const price = a.purchasePrice || 0;
                      const copies = a.totalCopiesCount ?? a.totalCopies ?? 1;
                      const value = price * copies;
                      if (value > 0) {
                        const currencyKey = a.currency?.code || a.financeAccount?.currency?.code || 'USD';
                        const symbol = getAssetCurrencySymbol(a);
                        if (!categoryValueByCurrency[currencyKey]) {
                          categoryValueByCurrency[currencyKey] = { symbol, amount: 0 };
                        }
                        categoryValueByCurrency[currencyKey].amount += value;
                      }
                    });
                    const categoryValue = Object.values(categoryValueByCurrency).reduce((sum, curr) => sum + curr.amount, 0);
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
                        <TableCell>
                          {Object.entries(categoryValueByCurrency).map(([code, { symbol, amount }], index) => (
                            <span key={code}>
                              {index > 0 && <span className="text-muted-foreground"> + </span>}
                              <span>{formatAmountWithSymbol(amount, symbol)}</span>
                            </span>
                          ))}
                          {Object.keys(categoryValueByCurrency).length === 0 && (
                            <span className="text-muted-foreground">$0.00</span>
                          )}
                        </TableCell>
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
              <CardTitle>{t('assets.assetsNeedingMaintenance')}</CardTitle>
              <CardDescription>{t('assets.maintenanceDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              {assetsNeedingMaintenance.length === 0 ? (
                <div className="flex h-24 items-center justify-center text-muted-foreground">
                  {t('assets.noAssetsNeedMaintenance')}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('assets.name')}</TableHead>
                      <TableHead>{t('assets.tag')}</TableHead>
                      <TableHead>{t('assets.status')}</TableHead>
                      <TableHead>{t('assets.issue')}</TableHead>
                      <TableHead>{t('assets.lastMaintenance')}</TableHead>
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
                            {warrantyExpired && <Badge variant="destructive">{t('assets.warrantyExpired')}</Badge>}
                            {maintenanceOverdue && <Badge variant="destructive">{t('assets.maintenanceOverdue')}</Badge>}
                          </TableCell>
                          <TableCell>
                            {latestMaintenance?.performedOn
                              ? formatDate(latestMaintenance.performedOn)
                              : t('assets.never')}
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
                <CardTitle>{t('assets.topValuedAssets')}</CardTitle>
                <CardDescription>{t('assets.highestPurchaseValue')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('assets.name')}</TableHead>
                      <TableHead>{t('assets.value')}</TableHead>
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
                          <TableCell className="font-medium">
                            {formatAssetPrice(asset, asset.purchasePrice || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('assets.maintenanceCostLeaders')}</CardTitle>
                <CardDescription>{t('assets.highestMaintenanceCosts')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('assets.name')}</TableHead>
                      <TableHead>{t('assets.maintenanceCost')}</TableHead>
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
                              <p className="text-xs text-muted-foreground">{t('assets.tag')}: {asset.assetTag}</p>
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
                          {t('assets.noMaintenanceCosts')}
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

