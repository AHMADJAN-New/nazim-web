import { useState, useMemo } from 'react';
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { Search, Activity, Calendar, User, FileText, RefreshCw, Filter, X, AlertCircle, Clock, Database, Globe } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';

import { useLanguage } from '@/hooks/useLanguage';
import { useActivityLogs, useActivityLogNames, useActivityEventTypes, useActivityLogStats, type UseActivityLogsResult } from '@/hooks/useActivityLogs';
import { formatDate, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { ActivityLog } from '@/types/domain/activityLog';
import { DEFAULT_PAGE_SIZE, type PaginationMeta } from '@/types/pagination';

// Filters type for local state (simpler than domain type)
interface LocalActivityLogFilters {
  logName?: string;
  event?: string;
  causerId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// Event badge color mapping
const getEventBadgeVariant = (event: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!event) return 'outline';
  switch (event.toLowerCase()) {
    case 'created':
      return 'default';
    case 'updated':
      return 'secondary';
    case 'deleted':
      return 'destructive';
    default:
      return 'outline';
  }
};

// HTTP method badge color
const getMethodBadgeVariant = (method: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!method) return 'outline';
  switch (method.toUpperCase()) {
    case 'POST':
      return 'default';
    case 'PUT':
    case 'PATCH':
      return 'secondary';
    case 'DELETE':
      return 'destructive';
    default:
      return 'outline';
  }
};

// Status code badge color
const getStatusBadgeVariant = (statusCode: number | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (!statusCode) return 'outline';
  if (statusCode >= 200 && statusCode < 300) return 'default';
  if (statusCode >= 400 && statusCode < 500) return 'secondary';
  if (statusCode >= 500) return 'destructive';
  return 'outline';
};

// Hidden fields that should not be displayed in properties
const HIDDEN_FIELDS = [
  'id',
  'organization_id',
  'school_id',
  'created_at',
  'updated_at',
  'deleted_at',
];

// Format field name from snake_case to Title Case
const formatFieldName = (fieldName: string): string => {
  return fieldName
    .replace(/_id$/, '')  // Remove _id suffix (e.g., organization_id → organization)
    .replace(/_/g, ' ')   // Replace underscores with spaces
    .replace(/\b\w/g, (char) => char.toUpperCase());  // Capitalize first letter of each word
};

// Format value for display
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    // Check if it looks like currency (has decimal places)
    if (Number.isFinite(value) && value.toString().includes('.')) {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return value.toLocaleString();
  }
  // Try to parse as date
  if (typeof value === 'string') {
    const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (dateMatch) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: value.includes('T') ? '2-digit' : undefined,
            minute: value.includes('T') ? '2-digit' : undefined,
          });
        }
      } catch {
        // Not a valid date, return as-is
      }
    }
  }
  return String(value);
};

// Format subject type from fully qualified class name to readable name
const formatSubjectType = (subjectType: string | null): string => {
  if (!subjectType) return '—';
  // Get the class name (last part after backslash)
  const className = subjectType.split('\\').pop() || subjectType;
  // Convert PascalCase to "Title Case"
  return className.replace(/([A-Z])/g, ' $1').trim();
};

// Parse properties into a list of changes
interface PropertyChange {
  field: string;
  label: string;
  oldValue: string | null;
  newValue: string | null;
}

const parseProperties = (properties: Record<string, unknown> | null): PropertyChange[] => {
  if (!properties) return [];
  
  const changes: PropertyChange[] = [];
  const attributes = (properties.attributes as Record<string, unknown>) || {};
  const old = (properties.old as Record<string, unknown>) || {};
  
  // Get all unique field names
  const allFields = new Set([
    ...Object.keys(attributes),
    ...Object.keys(old),
  ]);
  
  for (const field of allFields) {
    // Skip hidden fields
    if (HIDDEN_FIELDS.includes(field)) continue;
    
    const oldValue = old[field];
    const newValue = attributes[field];
    
    // Skip if both are the same (no change)
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
    
    changes.push({
      field,
      label: formatFieldName(field),
      oldValue: oldValue !== undefined ? formatValue(oldValue) : null,
      newValue: newValue !== undefined ? formatValue(newValue) : null,
    });
  }
  
  return changes;
};

export function ActivityLogsPage() {
  const { t, isRTL } = useLanguage();
  
  // Filters state
  const [filters, setFilters] = useState<LocalActivityLogFilters>({
    logName: undefined,
    event: undefined,
    causerId: undefined,
    search: undefined,
    startDate: undefined,
    endDate: undefined,
  });
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  
  // Filter panel open state
  const [filtersOpen, setFiltersOpen] = useState(true);
  
  // Detail dialog state
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  
  // Data hooks
  const { data: activityLogsData, isLoading, isFetching, refetch } = useActivityLogs({
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
    logName: filters.logName,
    event: filters.event,
    causerId: filters.causerId,
    search: filters.search,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  
  const { data: logNames = [], isLoading: isLogNamesLoading } = useActivityLogNames();
  const { data: eventTypes = [], isLoading: isEventTypesLoading } = useActivityEventTypes();
  const { data: stats, isLoading: isStatsLoading } = useActivityLogStats();
  
  // Extract data with proper typing (activityLogsData is UseActivityLogsResult | undefined)
  const logsResult = activityLogsData as UseActivityLogsResult | undefined;
  const logs = logsResult?.data ?? [];
  const apiPagination = logsResult?.pagination;
  
  // Convert pagination for DataTablePagination
  const paginationMeta: PaginationMeta | undefined = apiPagination ? {
    current_page: apiPagination.currentPage,
    last_page: apiPagination.lastPage,
    per_page: apiPagination.perPage,
    total: apiPagination.total,
    from: (apiPagination.currentPage - 1) * apiPagination.perPage + 1,
    to: Math.min(apiPagination.currentPage * apiPagination.perPage, apiPagination.total),
  } : undefined;
  
  // Filter handlers
  const handleFilterChange = (key: keyof LocalActivityLogFilters, value: string | undefined) => {
    const newValue = value === 'all' || value === '' ? undefined : value;
    setFilters(prev => ({ ...prev, [key]: newValue }));
    setPagination(prev => ({ ...prev, pageIndex: 0 })); // Reset to first page
  };
  
  const handleDateChange = (key: 'startDate' | 'endDate', date: Date | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: date ? date.toISOString().split('T')[0] : undefined,
    }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };
  
  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value || undefined }));
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };
  
  const clearFilters = () => {
    setFilters({});
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };
  
  const hasActiveFilters = Object.values(filters).some(v => v !== undefined);
  
  // Table columns
  const columns = useMemo<ColumnDef<ActivityLog>[]>(() => [
    {
      accessorKey: 'createdAt',
      header: t('settings.activityLogs.dateTime') || 'Date & Time',
      cell: ({ row }) => (
        <div className="whitespace-nowrap text-sm">
          <div>{formatDate(row.original.createdAt)}</div>
          <div className="text-muted-foreground text-xs">
            {row.original.createdAt.toLocaleTimeString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'logName',
      header: t('settings.activityLogs.logName') || 'Module',
      cell: ({ row }) => (
        <Badge variant="outline" className="font-mono text-xs">
          {row.original.logName || '—'}
        </Badge>
      ),
    },
    {
      accessorKey: 'event',
      header: t('settings.activityLogs.event') || 'Event',
      cell: ({ row }) => (
        <Badge variant={getEventBadgeVariant(row.original.event)}>
          {row.original.event || '—'}
        </Badge>
      ),
    },
    {
      accessorKey: 'description',
      header: t('settings.activityLogs.description') || 'Description',
      cell: ({ row }) => (
        <div className="max-w-[300px] truncate" title={row.original.description}>
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: 'causerName',
      header: t('settings.activityLogs.user') || 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {row.original.causerName || row.original.causer?.email || '—'}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'requestMethod',
      header: t('settings.activityLogs.method') || 'Method',
      cell: ({ row }) => (
        row.original.requestMethod ? (
          <Badge variant={getMethodBadgeVariant(row.original.requestMethod)} className="font-mono text-xs">
            {row.original.requestMethod}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
    },
    {
      accessorKey: 'statusCode',
      header: t('settings.activityLogs.status') || 'Status',
      cell: ({ row }) => (
        row.original.statusCode ? (
          <Badge variant={getStatusBadgeVariant(row.original.statusCode)} className="font-mono text-xs">
            {row.original.statusCode}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedLog(row.original)}
        >
          <FileText className="h-4 w-4" />
        </Button>
      ),
    },
  ], [t]);
  
  // Table instance
  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: paginationMeta?.last_page ?? -1,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });
  
  // Loading state
  if (isLoading && !activityLogsData) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t('settings.activityLogs.title') || 'Activity Logs'}
            </h1>
            <p className="hidden md:block text-sm text-muted-foreground">
              {t('settings.activityLogs.description') || 'View system activity and audit trail'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            <span className="hidden sm:inline ml-2">{t('common.refresh') || 'Refresh'}</span>
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      {!isStatsLoading && stats && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayCount?.toLocaleString() || 0}</div>
            </CardContent>
            <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full -mr-4 -mt-4 pointer-events-none opacity-50" />
          </Card>
          
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weekCount?.toLocaleString() || 0}</div>
            </CardContent>
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-4 -mt-4 pointer-events-none opacity-50" />
          </Card>
          
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unique Users Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsersToday?.toLocaleString() || 0}</div>
            </CardContent>
            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full -mr-4 -mt-4 pointer-events-none opacity-50" />
          </Card>
          
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Top Event
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.topEvents?.[0]?.event || '—'}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats.topEvents?.[0]?.count?.toLocaleString() || 0} occurrences
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-full -mr-4 -mt-4 pointer-events-none opacity-50" />
          </Card>
        </div>
      )}
      
      {/* Filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <CardTitle className="text-base">{t('common.filters') || 'Filters'}</CardTitle>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {Object.values(filters).filter(v => v !== undefined).length}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    {t('common.clearFilters') || 'Clear'}
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {filtersOpen ? t('common.hide') || 'Hide' : t('common.show') || 'Show'}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {/* Search */}
                <div className="space-y-2">
                  <Label>{t('common.search') || 'Search'}</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('settings.activityLogs.searchPlaceholder') || 'Search description...'}
                      value={filters.search || ''}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                {/* Log Name */}
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select
                    value={filters.logName || 'all'}
                    onValueChange={(v) => handleFilterChange('logName', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.all') || 'All'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                      {logNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Event Type */}
                <div className="space-y-2">
                  <Label>Event</Label>
                  <Select
                    value={filters.event || 'all'}
                    onValueChange={(v) => handleFilterChange('event', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.all') || 'All'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                      {eventTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Date Range - Start */}
                <div className="space-y-2">
                  <Label>{t('settings.activityLogs.startDate') || 'Start Date'}</Label>
                  <CalendarDatePicker
                    date={filters.startDate ? new Date(filters.startDate) : undefined}
                    onDateChange={(date) => handleDateChange('startDate', date)}
                    placeholder={t('common.selectDate') || 'Select date'}
                  />
                </div>
                
                {/* Date Range - End */}
                <div className="space-y-2">
                  <Label>{t('settings.activityLogs.endDate') || 'End Date'}</Label>
                  <CalendarDatePicker
                    date={filters.endDate ? new Date(filters.endDate) : undefined}
                    onDateChange={(date) => handleDateChange('endDate', date)}
                    placeholder={t('common.selectDate') || 'Select date'}
                  />
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      
      {/* Data Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isFetching && !logs.length ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {columns.map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-10">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-8 w-8" />
                        <p>{t('settings.activityLogs.noLogs') || 'No activity logs found'}</p>
                        {hasActiveFilters && (
                          <Button variant="link" onClick={clearFilters}>
                            {t('common.clearFilters') || 'Clear filters'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedLog(row.original)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          <DataTablePagination
            table={table}
            paginationMeta={paginationMeta}
            onPageChange={(page) => setPagination(prev => ({ ...prev, pageIndex: page - 1 }))}
            onPageSizeChange={(size) => setPagination(prev => ({ ...prev, pageSize: size, pageIndex: 0 }))}
          />
        </CardContent>
      </Card>
      
      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('settings.activityLogs.logDetails') || 'Log Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedLog?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('settings.activityLogs.dateTime') || 'Date & Time'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDateTime(selectedLog.createdAt)}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('settings.activityLogs.user') || 'User'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLog.causerName || selectedLog.causer?.email || '—'}</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('settings.activityLogs.logName') || 'Module'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">{selectedLog.logName || '—'}</Badge>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('settings.activityLogs.event') || 'Event'}
                  </Label>
                  <Badge variant={getEventBadgeVariant(selectedLog.event)}>
                    {selectedLog.event || '—'}
                  </Badge>
                </div>
              </div>
              
              {/* Request Info */}
              {(selectedLog.requestMethod || selectedLog.route || selectedLog.statusCode) && (
                <div className="space-y-3">
                  <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {t('settings.activityLogs.requestInfo') || 'Request Information'}
                  </Label>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
                    {selectedLog.requestMethod && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          {t('settings.activityLogs.method') || 'Method'}
                        </Label>
                        <Badge variant={getMethodBadgeVariant(selectedLog.requestMethod)} className="font-mono">
                          {selectedLog.requestMethod}
                        </Badge>
                      </div>
                    )}
                    
                    {selectedLog.statusCode && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          {t('settings.activityLogs.status') || 'Status Code'}
                        </Label>
                        <Badge variant={getStatusBadgeVariant(selectedLog.statusCode)} className="font-mono">
                          {selectedLog.statusCode}
                        </Badge>
                      </div>
                    )}
                    
                    {selectedLog.ipAddress && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          {t('settings.activityLogs.ipAddress') || 'IP Address'}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <code className="text-sm">{selectedLog.ipAddress}</code>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedLog.route && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">
                        {t('settings.activityLogs.route') || 'Route'}
                      </Label>
                      <code className="block bg-muted p-2 rounded text-sm overflow-x-auto">
                        {selectedLog.route}
                      </code>
                    </div>
                  )}
                </div>
              )}
              
              {/* Subject Info */}
              {(selectedLog.subjectType || selectedLog.subjectId) && (
                <div className="space-y-3">
                  <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {t('settings.activityLogs.subjectInfo') || 'Subject Information'}
                  </Label>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    {selectedLog.subjectType && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          {t('settings.activityLogs.subjectType') || 'Type'}
                        </Label>
                        <Badge variant="outline">
                          {formatSubjectType(selectedLog.subjectType)}
                        </Badge>
                      </div>
                    )}
                    
                    {selectedLog.subjectId && (
                      <div className="space-y-1">
                        <Label className="text-muted-foreground text-xs">
                          {t('settings.activityLogs.subjectId') || 'ID'}
                        </Label>
                        <code className="text-sm">{selectedLog.subjectId}</code>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Properties (Changes) - Improved Display */}
              {selectedLog.properties && Object.keys(selectedLog.properties).length > 0 && (
                <div className="space-y-3">
                  <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    {t('settings.activityLogs.properties') || 'Changes / Properties'}
                  </Label>
                  
                  {(() => {
                    const changes = parseProperties(selectedLog.properties);
                    
                    // If no changes to display (all hidden fields), show the raw JSON
                    if (changes.length === 0) {
                      // Check if there are any non-hidden properties at all
                      const hasAnyData = selectedLog.properties && (
                        (selectedLog.properties.attributes && Object.keys(selectedLog.properties.attributes as object).length > 0) ||
                        (selectedLog.properties.old && Object.keys(selectedLog.properties.old as object).length > 0)
                      );
                      
                      if (!hasAnyData) {
                        return (
                          <p className="text-sm text-muted-foreground">{t('common.noData') || 'No data available'}</p>
                        );
                      }
                      
                      // Fallback to raw JSON for non-standard properties structure
                      return (
                        <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-[300px]">
                          {JSON.stringify(selectedLog.properties, null, 2)}
                        </pre>
                      );
                    }
                    
                    return (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">
                                {t('common.field') || 'Field'}
                              </th>
                              {selectedLog.event === 'updated' && (
                                <th className="px-3 py-2 text-left font-medium">
                                  {t('settings.activityLogs.previousValue') || 'Previous'}
                                </th>
                              )}
                              <th className="px-3 py-2 text-left font-medium">
                                {selectedLog.event === 'updated' 
                                  ? (t('settings.activityLogs.newValue') || 'New') 
                                  : (t('common.value') || 'Value')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {changes.map((change) => (
                              <tr key={change.field} className="hover:bg-muted/30">
                                <td className="px-3 py-2 font-medium">{change.label}</td>
                                {selectedLog.event === 'updated' && (
                                  <td className="px-3 py-2 text-muted-foreground">
                                    {change.oldValue ?? '—'}
                                  </td>
                                )}
                                <td className="px-3 py-2">
                                  {change.newValue ?? '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              {/* User Agent */}
              {selectedLog.userAgent && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">
                    {t('settings.activityLogs.userAgent') || 'User Agent'}
                  </Label>
                  <code className="block bg-muted p-2 rounded text-xs overflow-x-auto">
                    {selectedLog.userAgent}
                  </code>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ActivityLogsPage;
