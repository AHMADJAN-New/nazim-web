import { useMemo, useState } from 'react';
import { Download, FileClock, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/utils';
import { useWebsiteAuditLogs } from '@/website/hooks/useWebsiteAuditLogs';
import type { WebsiteAuditLogEntry } from '@/types/domain/websiteAuditLog';
import { PAGE_SIZE_OPTIONS } from '@/types/pagination';

type AuditFilter = 'all' | 'created' | 'updated';

const formatCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;

export default function WebsiteAuditLogsPage() {
  const { t, isRTL } = useLanguage();
  const { 
    data: auditLogs = [], 
    isLoading, 
    refetch, 
    isFetching,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useWebsiteAuditLogs(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<AuditFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const typeLabels = useMemo(
    () => ({
      page: t('websiteAdmin.audit.types.page'),
      post: t('websiteAdmin.audit.types.post'),
      announcement: t('websiteAdmin.audit.types.announcement'),
      event: t('websiteAdmin.audit.types.event'),
      media: t('websiteAdmin.audit.types.media'),
      media_category: t('websiteAdmin.audit.types.mediaCategory'),
      menu_link: t('websiteAdmin.audit.types.menuLink'),
      domain: t('websiteAdmin.audit.types.domain'),
      fatwa: t('websiteAdmin.audit.types.fatwa'),
      public_book: t('websiteAdmin.audit.types.publicBook'),
      scholar: t('websiteAdmin.audit.types.scholar'),
      course: t('websiteAdmin.audit.types.course'),
      graduate: t('websiteAdmin.audit.types.graduate'),
      donation: t('websiteAdmin.audit.types.donation'),
    }),
    [t]
  );

  const actionLabels = useMemo(
    () => ({
      created: t('websiteAdmin.audit.actions.created'),
      updated: t('websiteAdmin.audit.actions.updated'),
    }),
    [t]
  );

  const statusLabels = useMemo(
    () => ({
      draft: t('websiteAdmin.statuses.draft'),
      scheduled: t('websiteAdmin.statuses.scheduled'),
      published: t('websiteAdmin.statuses.published'),
      archived: t('websiteAdmin.statuses.archived'),
      active: t('websiteAdmin.statuses.active'),
      inactive: t('websiteAdmin.statuses.inactive'),
      pending: t('websiteAdmin.statuses.pending'),
      verified: t('websiteAdmin.statuses.verified'),
      unverified: t('websiteAdmin.statuses.unverified'),
      expired: t('websiteAdmin.statuses.expired'),
      assigned: t('websiteAdmin.statuses.assigned'),
      answered: t('websiteAdmin.statuses.answered'),
    }),
    [t]
  );

  const typeOptions = useMemo(() => {
    const uniqueTypes = Array.from(new Set(auditLogs.map((log) => log.entityType)));
    return [
      { value: 'all', label: t('websiteAdmin.common.all') },
      ...uniqueTypes
        .sort((a, b) => (typeLabels[a] || a).localeCompare(typeLabels[b] || b))
        .map((type) => ({ value: type, label: typeLabels[type] || type })),
    ];
  }, [auditLogs, t, typeLabels]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return auditLogs.filter((log) => {
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesType = typeFilter === 'all' || log.entityType === typeFilter;

      if (!query) {
        return matchesAction && matchesType;
      }

      const actorName = log.actorName || t('websiteAdmin.audit.systemUser');
      const haystack = [
        log.entityTitle || t('websiteAdmin.audit.untitled'),
        actorName,
        log.actorEmail || '',
        typeLabels[log.entityType] || log.entityType,
      ]
        .join(' ')
        .toLowerCase();

      return matchesAction && matchesType && haystack.includes(query);
    });
  }, [auditLogs, actionFilter, typeFilter, searchQuery, t, typeLabels]);

  const summary = useMemo(() => {
    // For paginated data, we only have current page data, so calculate from visible logs
    // Note: These are per-page stats, not total stats
    const created = auditLogs.filter((log) => log.action === 'created').length;
    const updated = auditLogs.filter((log) => log.action === 'updated').length;
    const uniqueUsers = new Set(auditLogs.filter((log) => log.actorId).map((log) => log.actorId)).size;

    return {
      total: pagination?.total ?? auditLogs.length,
      created,
      updated,
      uniqueUsers,
    };
  }, [auditLogs, pagination]);

  const getActionBadge = (action: WebsiteAuditLogEntry['action']) => {
    if (action === 'created') {
      return <Badge>{actionLabels.created}</Badge>;
    }

    return <Badge variant="secondary">{actionLabels.updated}</Badge>;
  };

  const getStatusLabel = (status?: string | null) => {
    if (!status) return null;
    return statusLabels[status] || status;
  };

  const getTypeLabel = (type: string) => typeLabels[type] || type;

  const handleExport = () => {
    const header = [
      t('websiteAdmin.audit.columns.occurredAt'),
      t('websiteAdmin.audit.columns.action'),
      t('websiteAdmin.audit.columns.activity'),
      t('websiteAdmin.audit.columns.user'),
      t('websiteAdmin.audit.columns.status'),
    ];

    const rows = filteredLogs.map((log) => {
      const actorName = log.actorName || t('websiteAdmin.audit.systemUser');
      const actionLabel = actionLabels[log.action] || log.action;
      const typeLabel = getTypeLabel(log.entityType);
      const statusLabel = getStatusLabel(log.status) || '';
      const title = log.entityTitle || t('websiteAdmin.audit.untitled');
      const activity = `${actionLabel} ${typeLabel}: ${title}`;

      return [
        formatDateTime(log.occurredAt),
        actionLabel,
        activity,
        actorName,
        statusLabel,
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((value) => formatCsvValue(String(value))).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `website-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('websiteAdmin.audit.title')}
        description={t('websiteAdmin.audit.description')}
        icon={<FileClock className="h-5 w-5" />}
        rightSlot={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('websiteAdmin.audit.refresh')}
            </Button>
            <Button onClick={handleExport} disabled={filteredLogs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              {t('websiteAdmin.audit.export')}
            </Button>
          </div>
        )}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('websiteAdmin.audit.summary.total')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('websiteAdmin.audit.summary.created')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{summary.created}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('websiteAdmin.audit.summary.updated')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.updated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('websiteAdmin.audit.summary.uniqueUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.uniqueUsers}</div>
          </CardContent>
        </Card>
      </div>

      <FilterPanel title={t('websiteAdmin.common.filters')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('websiteAdmin.common.search')}</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('websiteAdmin.audit.searchPlaceholder')}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('websiteAdmin.audit.filters.action')}</Label>
            <Select value={actionFilter} onValueChange={(value) => setActionFilter(value as AuditFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                <SelectItem value="created">{actionLabels.created}</SelectItem>
                <SelectItem value="updated">{actionLabels.updated}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('websiteAdmin.audit.filters.type')}</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterPanel>

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('websiteAdmin.audit.columns.activity')}</TableHead>
                <TableHead>{t('websiteAdmin.audit.columns.action')}</TableHead>
                <TableHead>{t('websiteAdmin.audit.columns.user')}</TableHead>
                <TableHead>{t('websiteAdmin.audit.columns.occurredAt')}</TableHead>
                <TableHead>{t('websiteAdmin.audit.columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                    {t('websiteAdmin.audit.noResults')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const actorName = log.actorName || t('websiteAdmin.audit.systemUser');
                  const title = log.entityTitle || t('websiteAdmin.audit.untitled');
                  const statusLabel = getStatusLabel(log.status);

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="min-w-[260px]">
                        <div className="space-y-1">
                          <div className="font-medium">
                            {actionLabels[log.action] || log.action} {getTypeLabel(log.entityType)}
                          </div>
                          <div className="text-sm text-muted-foreground break-words">{title}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="space-y-1">
                          <div className="font-medium">{actorName}</div>
                          {log.actorEmail && (
                            <div className="text-xs text-muted-foreground">{log.actorEmail}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(log.occurredAt)}
                      </TableCell>
                      <TableCell>
                        {statusLabel ? <Badge variant="outline">{statusLabel}</Badge> : '�'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.last_page > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t('pagination.rowsPerPage') || 'Rows per page:'}</Label>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pagination.total > 0 && (
              <span className="text-sm text-muted-foreground">
                {t('pagination.showing') || 'Showing'} {pagination.from ?? 0} {t('pagination.to') || 'to'} {pagination.to ?? 0} {t('pagination.of') || 'of'} {pagination.total} {t('pagination.entries') || 'entries'}
              </span>
            )}
          </div>
          <div className={isRTL ? 'dir-rtl' : 'dir-ltr'}>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {(() => {
                  const pages: (number | 'ellipsis')[] = [];
                  const maxVisible = 7;
                  const totalPages = pagination.last_page;

                  if (totalPages <= maxVisible) {
                    for (let i = 1; i <= totalPages; i++) {
                      pages.push(i);
                    }
                  } else {
                    pages.push(1);
                    let start = Math.max(2, page - 1);
                    let end = Math.min(totalPages - 1, page + 1);

                    if (page <= 3) {
                      start = 2;
                      end = 4;
                    }

                    if (page >= totalPages - 2) {
                      start = totalPages - 3;
                      end = totalPages - 1;
                    }

                    if (start > 2) {
                      pages.push('ellipsis');
                    }

                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }

                    if (end < totalPages - 1) {
                      pages.push('ellipsis');
                    }

                    pages.push(totalPages);
                  }

                  return pages.map((p, idx) => {
                    if (p === 'ellipsis') {
                      return (
                        <PaginationItem key={`ellipsis-${idx}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return (
                      <PaginationItem key={p}>
                        <PaginationLink
                          isActive={page === p}
                          onClick={() => setPage(p)}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  });
                })()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage(Math.min(pagination.last_page, page + 1))}
                    className={page >= pagination.last_page ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
}
