import {
  AlertCircle,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  Shield,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDateTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLoginAttempts, useLoginAlerts, useLockedAccounts, useUnlockAccount, useExportLoginAudit } from '@/platform/hooks/useLoginAudit';
import { platformApi } from '@/platform/lib/platformApi';
import { useQuery } from '@tanstack/react-query';
import type * as LoginAuditApi from '@/types/api/loginAudit';

const FAILURE_REASON_KEYS: Record<string, string> = {
  user_not_found: 'platform.loginAudit.failureReasons.user_not_found',
  invalid_password: 'platform.loginAudit.failureReasons.invalid_password',
  account_inactive: 'platform.loginAudit.failureReasons.account_inactive',
  account_locked: 'platform.loginAudit.failureReasons.account_locked',
  token_creation_failed: 'platform.loginAudit.failureReasons.token_creation_failed',
  rate_limited: 'platform.loginAudit.failureReasons.rate_limited',
  validation_failed: 'platform.loginAudit.failureReasons.validation_failed',
};

export default function LoginAuditPage() {
  const { t, isRTL } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = searchParams.get('user_id') ?? undefined;
  const organizationId = searchParams.get('organization_id') ?? undefined;

  const pageSizeOptions = [50, 100, 200, 500] as const;

  // Default to last 7 days so recent attempts (including wrong password) are visible
  const defaultEnd = new Date().toISOString().slice(0, 10);
  const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [filters, setFilters] = useState<LoginAuditApi.LoginAttemptFilters>({
    start_date: defaultStart,
    end_date: defaultEnd,
    success: '',
    email: '',
    organization_id: organizationId ?? '',
    ip_address: '',
    login_context: '',
    per_page: 50,
    page: 1,
  });
  const [page, setPage] = useState(1);
  const [alertsExpanded, setAlertsExpanded] = useState(true);

  const effectiveFilters = {
    ...filters,
    page,
    per_page: filters.per_page ?? 50,
    user_id: userId,
    organization_id: organizationId || filters.organization_id || undefined,
  };

  const { data: attemptsData, isLoading, isError, error } = useLoginAttempts(effectiveFilters);
  const { data: alertsData } = useLoginAlerts();
  const { data: lockedData } = useLockedAccounts();
  const unlockMutation = useUnlockAccount();
  const exportMutation = useExportLoginAudit();

  const { data: organizations } = useQuery({
    queryKey: ['platform-organizations'],
    queryFn: () => platformApi.organizations.list(),
    staleTime: 5 * 60 * 1000,
  });

  const ipAlerts = alertsData?.ip_alerts ?? [];
  const emailAlerts = alertsData?.email_alerts ?? [];
  const lockedAccounts = lockedData?.data ?? [];
  const attempts = attemptsData?.data ?? [];
  const currentPage = attemptsData?.current_page ?? 1;
  const lastPage = attemptsData?.last_page ?? 1;
  const total = attemptsData?.total ?? 0;
  const perPage = attemptsData?.per_page ?? (filters.per_page ?? 50);
  const from = total > 0 ? (currentPage - 1) * perPage + 1 : 0;
  const to = total > 0 ? Math.min(currentPage * perPage, total) : 0;

  const handleApplyUserFilter = (uid: string | null) => {
    if (uid) {
      searchParams.set('user_id', uid);
      searchParams.delete('organization_id');
    } else {
      searchParams.delete('user_id');
    }
    setSearchParams(searchParams);
    setPage(1);
  };

  const handleApplyOrgFilter = (orgId: string | null) => {
    if (orgId) {
      searchParams.set('organization_id', orgId);
      searchParams.delete('user_id');
    } else {
      searchParams.delete('organization_id');
    }
    setSearchParams(searchParams);
    setPage(1);
  };

  const handleExport = () => {
    exportMutation.mutate(effectiveFilters);
  };

  const getFailureReasonLabel = (reason: string | null) => {
    if (!reason) return '-';
    const key = FAILURE_REASON_KEYS[reason];
    return key ? t(key) : reason;
  };

  const drillDownLabel = userId
    ? `Viewing: User ${attempts[0]?.email ?? userId}`
    : organizationId
      ? `Viewing: ${organizations?.find((o) => o.id === organizationId)?.name ?? organizationId}`
      : null;

  return (
    <div className="container mx-auto space-y-6 max-w-7xl overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('platform.loginAudit.title') ?? 'Login Audit'}
        description={t('platform.loginAudit.description')}
        icon={<Shield className="h-5 w-5" />}
      />

      {/* Drill-down banner */}
      {drillDownLabel && (
        <Card className="bg-muted/50">
          <CardContent className="flex items-center justify-between py-3">
            <span className="text-sm font-medium">{drillDownLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                searchParams.delete('user_id');
                searchParams.delete('organization_id');
                setSearchParams(searchParams);
                setPage(1);
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Alerts Card */}
      <Card>
        <Collapsible open={alertsExpanded} onOpenChange={setAlertsExpanded}>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full justify-between p-0 h-auto hover:bg-transparent">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-lg">
                    {t('platform.loginAudit.alerts') ?? 'Brute-force alerts'}
                  </CardTitle>
                  <Badge variant={ipAlerts.length + emailAlerts.length > 0 ? 'destructive' : 'secondary'}>
                    {ipAlerts.length + emailAlerts.length}
                  </Badge>
                </div>
                {alertsExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {ipAlerts.length === 0 && emailAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('platform.loginAudit.alertsEmpty') ?? 'No alerts in the last hour.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {ipAlerts.map((a) => (
                    <div
                      key={`ip-${a.ip_address}`}
                      className="flex items-center justify-between text-sm border rounded p-2"
                    >
                      <span>
                        <strong>IP:</strong> {a.ip_address} — {a.failure_count} failures
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters((f) => ({ ...f, ip_address: a.ip_address ?? '' }))}
                      >
                        {t('platform.loginAudit.viewInTable') ?? 'View in table'}
                      </Button>
                    </div>
                  ))}
                  {emailAlerts.map((a) => (
                    <div
                      key={`email-${a.email}`}
                      className="flex items-center justify-between text-sm border rounded p-2"
                    >
                      <span>
                        <strong>Email:</strong> {a.email} — {a.failure_count} failures
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters((f) => ({ ...f, email: a.email ?? '' }))}
                      >
                        {t('platform.loginAudit.viewInTable') ?? 'View in table'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Locked Accounts Card */}
      {lockedAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('platform.loginAudit.lockedAccounts') ?? 'Locked accounts'}
            </CardTitle>
            <CardDescription>
              {lockedAccounts.length} account(s) locked due to multiple failed attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('platform.loginAudit.columns.email') ?? 'Email'}</TableHead>
                    <TableHead>Locked at</TableHead>
                    <TableHead>Failures</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lockedAccounts.map((acc) => (
                    <TableRow key={acc.id}>
                      <TableCell>{acc.email}</TableCell>
                      <TableCell>{formatDateTime(acc.locked_at)}</TableCell>
                      <TableCell>{acc.failed_attempt_count}</TableCell>
                      <TableCell>{acc.ip_address}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={unlockMutation.isPending}
                          onClick={() => unlockMutation.mutate(acc.email)}
                        >
                          {t('platform.loginAudit.unlock') ?? 'Unlock'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t('platform.loginAudit.mainTable') ?? 'Login attempts'}</CardTitle>
              <CardDescription>
                Paginated list with filters
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={exportMutation.isPending}
              onClick={handleExport}
              aria-label={t('platform.loginAudit.export') ?? 'Export CSV'}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t('platform.loginAudit.export') ?? 'Export CSV'}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load login attempts. {error?.message ? `(${error.message})` : ''}
              </AlertDescription>
            </Alert>
          )}
          {/* Filters */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>{t('platform.loginAudit.filters.dateRange') ?? 'Date range'}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="date"
                  value={filters.start_date ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value || undefined }))}
                />
                <Input
                  type="date"
                  value={filters.end_date ?? ''}
                  onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value || undefined }))}
                />
              </div>
            </div>
            <div>
              <Label>{t('platform.loginAudit.filters.status') ?? 'Status'}</Label>
              <Select
                value={filters.success === '' || filters.success === undefined ? 'all' : String(filters.success)}
                onValueChange={(v) =>
                  setFilters((f) => ({
                    ...f,
                    success: v === 'all' ? '' : v === 'true',
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('platform.loginAudit.filters.statusAll') ?? 'All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('platform.loginAudit.filters.statusAll') ?? 'All'}</SelectItem>
                  <SelectItem value="true">{t('platform.loginAudit.filters.statusSuccess') ?? 'Success'}</SelectItem>
                  <SelectItem value="false">{t('platform.loginAudit.filters.statusFailure') ?? 'Failure'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('platform.loginAudit.filters.email') ?? 'Email'}</Label>
              <Input
                className="mt-1"
                placeholder="Search by email"
                value={filters.email ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, email: e.target.value || undefined }))}
              />
            </div>
            <div>
              <Label>{t('platform.loginAudit.filters.organization') ?? 'Organization'}</Label>
              <Select
                value={filters.organization_id || 'all'}
                onValueChange={(v) => setFilters((f) => ({ ...f, organization_id: v === 'all' ? undefined : v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('platform.loginAudit.filters.statusAll') ?? 'All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('platform.loginAudit.filters.statusAll') ?? 'All'}</SelectItem>
                  {organizations?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('platform.loginAudit.filters.ipAddress') ?? 'IP address'}</Label>
              <Input
                className="mt-1"
                placeholder="Search by IP"
                value={filters.ip_address ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, ip_address: e.target.value || undefined }))}
              />
            </div>
            <div>
              <Label>{t('platform.loginAudit.filters.context') ?? 'Login context'}</Label>
              <Select
                value={filters.login_context || 'all'}
                onValueChange={(v) => setFilters((f) => ({ ...f, login_context: v === 'all' ? undefined : v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('platform.loginAudit.filters.statusAll') ?? 'All'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('platform.loginAudit.filters.statusAll') ?? 'All'}</SelectItem>
                  <SelectItem value="main_app">{t('platform.loginAudit.filters.contextMain') ?? 'Main app'}</SelectItem>
                  <SelectItem value="platform_admin">{t('platform.loginAudit.filters.contextPlatform') ?? 'Platform admin'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('platform.loginAudit.columns.dateTime') ?? 'Date/Time'}</TableHead>
                      <TableHead>{t('platform.loginAudit.columns.email') ?? 'Email'}</TableHead>
                      <TableHead>{t('platform.loginAudit.columns.status') ?? 'Status'}</TableHead>
                      <TableHead>{t('platform.loginAudit.columns.failureReason') ?? 'Failure reason'}</TableHead>
                      <TableHead>{t('platform.loginAudit.columns.organization') ?? 'Organization'}</TableHead>
                      <TableHead>{t('platform.loginAudit.columns.ip') ?? 'IP'}</TableHead>
                      <TableHead>{t('platform.loginAudit.columns.context') ?? 'Context'}</TableHead>
                      <TableHead>{t('platform.loginAudit.columns.userAgent') ?? 'User agent'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No login attempts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      attempts.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{formatDateTime(a.attempted_at)}</TableCell>
                          <TableCell>
                            <button
                              type="button"
                              className="text-primary hover:underline"
                              onClick={() => a.user_id && handleApplyUserFilter(a.user_id)}
                            >
                              {a.email}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={a.success ? 'default' : 'destructive'}>
                              {a.success ? 'Success' : 'Failure'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getFailureReasonLabel(a.failure_reason)}</TableCell>
                          <TableCell>
                            {a.organization_id ? (
                              <button
                                type="button"
                                className="text-primary hover:underline"
                                onClick={() => handleApplyOrgFilter(a.organization_id ?? null)}
                              >
                                {organizations?.find((o) => o.id === a.organization_id)?.name ?? a.organization_id}
                              </button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>{a.ip_address}</TableCell>
                          <TableCell>
                            {a.login_context === 'platform_admin'
                              ? (t('platform.loginAudit.filters.contextPlatform') ?? 'Platform')
                              : (t('platform.loginAudit.filters.contextMain') ?? 'Main')}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={a.user_agent ?? ''}>
                            {a.user_agent ? (a.user_agent.length > 40 ? `${a.user_agent.slice(0, 40)}…` : a.user_agent) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {lastPage > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm whitespace-nowrap">
                        {t('pagination.rowsPerPage') || 'Rows per page'}:
                      </Label>
                      <Select
                        value={String(filters.per_page ?? 50)}
                        onValueChange={(value) => {
                          const size = Number(value);
                          setFilters((f) => ({ ...f, per_page: size }));
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {pageSizeOptions.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {total > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {t('pagination.showing') || 'Showing'} {from} {t('pagination.to') || 'to'} {to}{' '}
                        {t('pagination.of') || 'of'} {total} {t('pagination.entries') || 'entries'}
                      </span>
                    )}
                  </div>

                  <div className={isRTL ? 'dir-rtl' : 'dir-ltr'}>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage(Math.max(1, currentPage - 1))}
                            className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {(() => {
                          const pages: (number | 'ellipsis')[] = [];
                          const maxVisible = 7;
                          const totalPages = lastPage;

                          if (totalPages <= maxVisible) {
                            for (let i = 1; i <= totalPages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            let start = Math.max(2, currentPage - 1);
                            let end = Math.min(totalPages - 1, currentPage + 1);

                            if (currentPage <= 3) {
                              start = 2;
                              end = 4;
                            }
                            if (currentPage >= totalPages - 2) {
                              start = totalPages - 3;
                              end = totalPages - 1;
                            }
                            if (start > 2) pages.push('ellipsis');
                            for (let i = start; i <= end; i++) pages.push(i);
                            if (end < totalPages - 1) pages.push('ellipsis');
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
                                  isActive={currentPage === p}
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
                            onClick={() => setPage(Math.min(lastPage, currentPage + 1))}
                            className={currentPage >= lastPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
