import { useQuery } from '@tanstack/react-query';
import {
  Globe,
  Monitor,
  MapPin,
  Mail,
  Calendar,
  Shield,
  Building2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  History,
  Wifi,
  Activity,
  Download,
  Flag,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useLanguage } from '@/hooks/useLanguage';
import { formatShortDate } from '@/lib/calendarAdapter';
import { showToast } from '@/lib/toast';
import { formatDateTime } from '@/lib/utils';
import { parseUserAgent } from '@/platform/lib/parseUserAgent';
import { platformApi } from '@/platform/lib/platformApi';
import type * as LoginAuditApi from '@/types/api/loginAudit';

const RECENT_DAYS = 30;
const RECENT_LIMIT = 10;

function getDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - RECENT_DAYS);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

type RiskLevel = 'low' | 'medium' | 'high';

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-border/60 last:border-0">
      <div className="flex-shrink-0 mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium break-words mt-0.5">{value}</p>
      </div>
    </div>
  );
}

interface LoginAttemptDetailSheetProps {
  attempt: LoginAuditApi.LoginAttempt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName?: string;
  organizations?: Array<{ id: string; name: string }>;
  lockedAccounts?: LoginAuditApi.LockedAccount[];
  onFilterByEmail?: (email: string) => void;
  onFilterByOrg?: (orgId: string) => void;
  onAttemptSelect?: (attempt: LoginAuditApi.LoginAttempt) => void;
  onReportSuspicious?: (attempt: LoginAuditApi.LoginAttempt) => void;
  getFailureReasonLabel: (reason: string | null) => string;
}

export function LoginAttemptDetailSheet({
  attempt,
  open,
  onOpenChange,
  organizationName,
  organizations = [],
  lockedAccounts = [],
  onFilterByEmail,
  onFilterByOrg,
  onAttemptSelect,
  onReportSuspicious,
  getFailureReasonLabel,
}: LoginAttemptDetailSheetProps) {
  const { t } = useLanguage();
  const [userAgentExpanded, setUserAgentExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [flaggedAttempts, setFlaggedAttempts] = useState<Set<string>>(new Set());

  const dateRange = useMemo(() => getDateRange(), []);

  const parsedUA = attempt?.user_agent ? parseUserAgent(attempt.user_agent) : null;

  const { data: ipInfo, isLoading: ipLoading } = useQuery({
    queryKey: ['platform-login-audit-ip', attempt?.ip_address],
    queryFn: () => platformApi.loginAudit.getIpInfo(attempt!.ip_address),
    enabled: open && !!attempt?.ip_address && !/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|::1)/.test(attempt?.ip_address ?? ''),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: userAttemptsData, isLoading: userAttemptsLoading } = useQuery({
    queryKey: ['platform-login-audit-user-recent', attempt?.user_id ?? attempt?.email, dateRange],
    queryFn: async () => {
      if (attempt?.user_id) {
        return platformApi.loginAudit.getByUser(attempt.user_id, { per_page: RECENT_LIMIT, ...dateRange });
      }
      if (attempt?.email) {
        return platformApi.loginAudit.list({ email: attempt.email, per_page: RECENT_LIMIT, ...dateRange });
      }
      return { data: [] };
    },
    enabled: open && !!attempt && (!!attempt.user_id || !!attempt.email),
    staleTime: 60 * 1000,
  });

  const { data: ipAttemptsData, isLoading: ipAttemptsLoading } = useQuery({
    queryKey: ['platform-login-audit-ip-recent', attempt?.ip_address, dateRange],
    queryFn: () =>
      platformApi.loginAudit.list({
        ip_address: attempt!.ip_address,
        per_page: RECENT_LIMIT,
        ...dateRange,
      }),
    enabled: open && !!attempt?.ip_address,
    staleTime: 60 * 1000,
  });

  const userAttempts = useMemo(
    () => userAttemptsData?.data ?? [],
    [userAttemptsData?.data]
  );
  const ipAttempts = ipAttemptsData?.data ?? [];

  const userStats = useMemo(() => {
    const total = userAttempts.length;
    if (total === 0) return null;
    const successCount = userAttempts.filter((a) => a.success).length;
    const failureCount = total - successCount;
    const lastSuccess = userAttempts.find((a) => a.success);
    const lastFailure = userAttempts.filter((a) => !a.success)[0];
    return {
      total,
      successCount,
      failureCount,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
      lastSuccessAttempt: lastSuccess ?? null,
      lastSuccessAt: lastSuccess?.attempted_at ?? null,
      lastFailureAt: lastFailure?.attempted_at ?? null,
      recentSuccessIps: [...new Set(userAttempts.filter((a) => a.success).map((a) => a.ip_address))],
      recentSuccessUas: userAttempts.filter((a) => a.success).map((a) => a.user_agent).filter(Boolean),
    };
  }, [userAttempts]);

  const riskLevel = useMemo((): RiskLevel => {
    if (!attempt) return 'low';
    let score = 0;
    if (!attempt.success) score += 2;
    if (attempt.was_locked) score += 2;
    if (attempt.consecutive_failures >= 3) score += 2;
    if (attempt.consecutive_failures >= 5) score += 1;
    if (userStats && userStats.successRate < 50 && userStats.total >= 3) score += 1;
    if (userStats && userStats.failureCount >= 5) score += 1;
    if (userStats?.recentSuccessIps && attempt.ip_address && !userStats.recentSuccessIps.includes(attempt.ip_address)) score += 1;
    const uaMatch = userStats?.recentSuccessUas.some((ua) => ua === attempt.user_agent);
    if (userStats?.recentSuccessUas.length && attempt.user_agent && !uaMatch) score += 1;
    if (score >= 5) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }, [attempt, userStats]);

  const isNewLocation = useMemo(() => {
    if (!attempt?.ip_address || !userStats?.recentSuccessIps?.length) return false;
    return !userStats.recentSuccessIps.includes(attempt.ip_address);
  }, [attempt, userStats]);

  const isNewDevice = useMemo(() => {
    if (!attempt?.user_agent || !userStats?.recentSuccessUas?.length) return false;
    return !userStats.recentSuccessUas.some((ua) => ua === attempt.user_agent);
  }, [attempt, userStats]);

  const lockedForEmail = useMemo(() => lockedAccounts.find((la) => la.email.toLowerCase() === attempt?.email?.toLowerCase()), [lockedAccounts, attempt?.email]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      /* ignore */
    }
  };

  const copyAllDetails = async () => {
    if (!attempt) return;
    const loc = ipLoading ? 'Loading...' : ipInfo?.private ? 'Private/Local' : ipInfo ? [ipInfo.city, ipInfo.region, ipInfo.country].filter(Boolean).join(', ') || 'Unknown' : attempt.ip_address;
    const lines: string[] = [
      `Login Attempt Report - ${formatDateTime(attempt.attempted_at)}`,
      '══════════════════════════════════════',
      `Status: ${attempt.success ? 'Success' : 'Failure'}`,
      `Email: ${attempt.email}`,
      `IP: ${attempt.ip_address}`,
      `Location: ${loc}`,
      `Device: ${parsedUA?.summary ?? attempt.user_agent ?? 'Unknown'}`,
      `Context: ${attempt.login_context}`,
      attempt.failure_reason ? `Failure Reason: ${getFailureReasonLabel(attempt.failure_reason)}` : '',
      organizationName ? `Organization: ${organizationName}` : '',
      attempt.consecutive_failures > 0 ? `Consecutive Failures: ${attempt.consecutive_failures}` : '',
      attempt.was_locked ? 'Account was locked' : '',
      ipInfo?.timezone ? `Timezone: ${ipInfo.timezone}` : '',
      ipInfo?.isp ? `ISP: ${ipInfo.isp}` : '',
    ].filter(Boolean);
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast.success(t('platform.loginAudit.detailCopyAllSuccess') ?? 'All details copied');
    } catch {
      showToast.error(t('platform.loginAudit.detailCopyAllFailed') ?? 'Failed to copy');
    }
  };

  const downloadAsJson = () => {
    if (!attempt) return;
    const payload = {
      exported_at: new Date().toISOString(),
      attempt: {
        ...attempt,
        attempted_at: attempt.attempted_at,
      },
      ip_info: ipInfo ?? null,
      device: parsedUA ?? null,
      organization_name: organizationName ?? null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `login-attempt-${attempt.id}-${attempt.attempted_at.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast.success(t('platform.loginAudit.detailDownloadSuccess') ?? 'Downloaded');
  };

  const handleReportSuspicious = () => {
    if (!attempt) return;
    setFlaggedAttempts((prev) => new Set(prev).add(attempt.id));
    onReportSuspicious?.(attempt);
    showToast.success(t('platform.loginAudit.detailReportSuspiciousSuccess') ?? 'Flagged for review');
  };

  const copyButton = (text: string, field: string) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 flex-shrink-0"
      onClick={(e) => {
        e.stopPropagation();
        copyToClipboard(text, field);
      }}
      aria-label="Copy"
    >
      {copiedField === field ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );

  if (!attempt) return null;

  const formatLocation = () => {
    if (ipLoading) return t('common.loading') ?? 'Loading...';
    if (!ipInfo) return attempt.ip_address;
    if (ipInfo.private) return `${attempt.ip_address} (${ipInfo.country ?? 'Private/Local'})`;
    if (ipInfo.error) return attempt.ip_address;
    const parts = [ipInfo.city, ipInfo.region, ipInfo.country].filter(Boolean);
    return parts.length > 0 ? `${attempt.ip_address} — ${parts.join(', ')}` : attempt.ip_address;
  };

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return null;
    return organizations.find((o) => o.id === orgId)?.name ?? orgId;
  };

  const formatInTimezone = (dateStr: string) => {
    const d = new Date(dateStr);
    if (ipInfo?.timezone) {
      try {
        return d.toLocaleString(undefined, { timeZone: ipInfo.timezone! });
      } catch {
        return formatDateTime(dateStr);
      }
    }
    return formatDateTime(dateStr);
  };

  const mapUrl = ipInfo?.lat != null && ipInfo?.lon != null && !ipInfo.private
    ? `https://www.openstreetmap.org/?mlat=${ipInfo.lat}&mlon=${ipInfo.lon}&zoom=12`
    : null;

  const riskBadge = {
    low: { label: 'Low risk', variant: 'secondary' as const, icon: CheckCircle2 },
    medium: { label: 'Medium risk', variant: 'outline' as const, icon: AlertTriangle },
    high: { label: 'High risk', variant: 'destructive' as const, icon: AlertCircle },
  }[riskLevel];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={attempt.success ? 'default' : 'destructive'} className="text-xs">
              {attempt.success ? (t('platform.loginAudit.filters.statusSuccess') ?? 'Success') : (t('platform.loginAudit.filters.statusFailure') ?? 'Failure')}
            </Badge>
            <Badge variant={riskBadge.variant} className="text-xs flex items-center gap-1">
              <riskBadge.icon className="h-3 w-3" />
              {t(`platform.loginAudit.risk.${riskLevel}`) ?? riskBadge.label}
            </Badge>
            {(isNewLocation || isNewDevice) && (
              <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-500">
                {isNewLocation && isNewDevice
                  ? (t('platform.loginAudit.detailNewDeviceAndLocation') ?? 'New device & location')
                  : isNewLocation
                    ? (t('platform.loginAudit.detailNewLocation') ?? 'New location')
                    : (t('platform.loginAudit.detailNewDevice') ?? 'New device')}
              </Badge>
            )}
            <SheetTitle className="text-base">
              {formatDateTime(attempt.attempted_at)}
            </SheetTitle>
          </div>
          <SheetDescription>
            {t('platform.loginAudit.detailDescription') ?? 'Login attempt details and device information'}
          </SheetDescription>

          {/* Action bar */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={downloadAsJson} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('platform.loginAudit.detailDownload') ?? 'Download JSON'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={copyAllDetails} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('platform.loginAudit.detailCopyAll') ?? 'Copy all'}</span>
            </Button>
            {attempt.user_id && (
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to="/platform/settings" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('platform.loginAudit.detailViewUser') ?? 'View user'}</span>
                </Link>
              </Button>
            )}
            <Button
              variant={flaggedAttempts.has(attempt.id) ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleReportSuspicious}
              className="gap-1.5"
            >
              <Flag className={`h-3.5 w-3.5 ${flaggedAttempts.has(attempt.id) ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">
                {flaggedAttempts.has(attempt.id)
                  ? (t('platform.loginAudit.detailFlagged') ?? 'Flagged')
                  : (t('platform.loginAudit.detailReportSuspicious') ?? 'Flag suspicious')}
              </span>
            </Button>
          </div>
        </SheetHeader>

        {/* Last successful login */}
        {userStats?.lastSuccessAttempt && !attempt.success && (
          <section className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('platform.loginAudit.detailLastSuccess') ?? 'Last successful login'}
            </h3>
            <p className="text-sm">
              {formatDateTime(userStats.lastSuccessAt!)}
              {userStats.lastSuccessAttempt.ip_address && (
                <span className="text-muted-foreground ml-1">
                  · {userStats.lastSuccessAttempt.ip_address}
                  {userStats.lastSuccessAttempt.ip_address !== attempt.ip_address && (
                    <span className="text-amber-600 dark:text-amber-500 ml-1">
                      ({t('platform.loginAudit.detailDifferentIp') ?? 'different IP'})
                    </span>
                  )}
                </span>
              )}
            </p>
          </section>
        )}

        {/* Summary stats */}
        {userStats && userAttempts.length > 0 && (
          <section className="mt-6 p-4 rounded-lg bg-muted/40 border border-border/60">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
              <Activity className="h-3.5 w-3.5" />
              {t('platform.loginAudit.detailSummary') ?? 'User activity summary'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-2 rounded bg-background/80">
                <p className="text-2xl font-bold">{userStats.total}</p>
                <p className="text-xs text-muted-foreground">{t('platform.loginAudit.detailAttemptsInPeriod') ?? 'attempts (30d)'}</p>
              </div>
              <div className="text-center p-2 rounded bg-background/80">
                <p className="text-2xl font-bold text-green-600 dark:text-green-500">{userStats.successCount}</p>
                <p className="text-xs text-muted-foreground">{t('platform.loginAudit.filters.statusSuccess') ?? 'Success'}</p>
              </div>
              <div className="text-center p-2 rounded bg-background/80">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{userStats.failureCount}</p>
                <p className="text-xs text-muted-foreground">{t('platform.loginAudit.filters.statusFailure') ?? 'Failure'}</p>
              </div>
              <div className="text-center p-2 rounded bg-background/80">
                <p className="text-2xl font-bold">{userStats.successRate}%</p>
                <p className="text-xs text-muted-foreground">{t('platform.loginAudit.detailSuccessRate') ?? 'Success rate'}</p>
              </div>
            </div>
          </section>
        )}

        {/* Lock events */}
        {lockedForEmail && (
          <section className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-2 mb-2">
              <AlertCircle className="h-3.5 w-3.5" />
              {t('platform.loginAudit.detailLockEvents') ?? 'Related lock events'}
            </h3>
            <p className="text-sm">
              {t('platform.loginAudit.detailLockedAt') ?? 'Locked at'}: {formatDateTime(lockedForEmail.locked_at)}
            </p>
            {lockedForEmail.unlocked_at && (
              <p className="text-sm">
                {t('platform.loginAudit.detailUnlockedAt') ?? 'Unlocked at'}: {formatDateTime(lockedForEmail.unlocked_at)}
                {lockedForEmail.unlock_reason && ` (${lockedForEmail.unlock_reason})`}
              </p>
            )}
          </section>
        )}

        <div className="mt-6 space-y-1">
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label={t('platform.loginAudit.columns.dateTime') ?? 'Date & Time'}
            value={
              <div className="space-y-1">
                <span className="flex items-center gap-1">
                  {formatDateTime(attempt.attempted_at)}
                  {copyButton(formatDateTime(attempt.attempted_at), 'date')}
                </span>
                {ipInfo?.timezone && (
                  <p className="text-xs text-muted-foreground">
                    {t('platform.loginAudit.detailUserTimezone') ?? "User's timezone"}: {ipInfo.timezone} — {formatInTimezone(attempt.attempted_at)}
                  </p>
                )}
              </div>
            }
          />

          <DetailRow
            icon={<Mail className="h-4 w-4" />}
            label={t('platform.loginAudit.columns.email') ?? 'Email'}
            value={
              <span className="flex items-center gap-1">
                {onFilterByEmail ? (
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilterByEmail(attempt.email);
                    }}
                  >
                    {attempt.email}
                  </button>
                ) : (
                  attempt.email
                )}
                {copyButton(attempt.email, 'email')}
              </span>
            }
          />

          {attempt.organization_id && (
            <DetailRow
              icon={<Building2 className="h-4 w-4" />}
              label={t('platform.loginAudit.columns.organization') ?? 'Organization'}
              value={
                <span className="flex items-center gap-1">
                  {onFilterByOrg ? (
                    <button
                      type="button"
                      className="text-primary hover:underline font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFilterByOrg(attempt.organization_id!);
                      }}
                    >
                      {organizationName ?? getOrgName(attempt.organization_id) ?? attempt.organization_id}
                    </button>
                  ) : (
                    organizationName ?? getOrgName(attempt.organization_id) ?? attempt.organization_id
                  )}
                </span>
              }
            />
          )}

          <DetailRow
            icon={<Shield className="h-4 w-4" />}
            label={t('platform.loginAudit.columns.context') ?? 'Login Context'}
            value={
              attempt.login_context === 'platform_admin'
                ? (t('platform.loginAudit.filters.contextPlatform') ?? 'Platform Admin')
                : (t('platform.loginAudit.filters.contextMain') ?? 'Main App')
            }
          />

          {!attempt.success && attempt.failure_reason && (
            <DetailRow
              icon={<AlertCircle className="h-4 w-4" />}
              label={t('platform.loginAudit.columns.failureReason') ?? 'Failure Reason'}
              value={getFailureReasonLabel(attempt.failure_reason)}
            />
          )}

          {parsedUA && (
            <DetailRow
              icon={<Monitor className="h-4 w-4" />}
              label={t('platform.loginAudit.detailDevice') ?? 'Device & Browser'}
              value={
                <div className="space-y-1">
                  <p className="font-medium">{parsedUA.summary}</p>
                  {(parsedUA.browser || parsedUA.os) && (
                    <p className="text-xs text-muted-foreground">
                      {[parsedUA.browser, parsedUA.os].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {parsedUA.deviceType && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {parsedUA.deviceType}
                    </Badge>
                  )}
                </div>
              }
            />
          )}

          <DetailRow
            icon={<Globe className="h-4 w-4" />}
            label={t('platform.loginAudit.columns.ip') ?? 'IP Address'}
            value={
              <span className="flex items-center gap-1">
                {attempt.ip_address}
                {copyButton(attempt.ip_address, 'ip')}
              </span>
            }
          />

          {attempt.ip_address && (
            <DetailRow
              icon={<MapPin className="h-4 w-4" />}
              label={t('platform.loginAudit.detailLocation') ?? 'Approximate Location'}
              value={
                <div className="space-y-2">
                  <p className="text-sm">{formatLocation()}</p>
                  {ipInfo && !ipInfo.private && !ipInfo.error && (ipInfo.isp || ipInfo.org) && (
                    <p className="text-xs text-muted-foreground">
                      {[ipInfo.isp, ipInfo.org].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <MapPin className="h-3 w-3" />
                      {t('platform.loginAudit.detailViewOnMap') ?? 'View on map'}
                    </a>
                  )}
                </div>
              }
            />
          )}

          {(attempt.consecutive_failures > 0 || attempt.was_locked) && (
            <DetailRow
              icon={<AlertCircle className="h-4 w-4" />}
              label={t('platform.loginAudit.detailSecurity') ?? 'Security Context'}
              value={
                <div className="flex flex-wrap gap-1">
                  {attempt.consecutive_failures > 0 && (
                    <Badge variant="outline">
                      {attempt.consecutive_failures} {t('platform.loginAudit.detailConsecutiveFailures') ?? 'consecutive failures'}
                    </Badge>
                  )}
                  {attempt.was_locked && (
                    <Badge variant="destructive">
                      {t('platform.loginAudit.detailWasLocked') ?? 'Account was locked'}
                    </Badge>
                  )}
                </div>
              }
            />
          )}
        </div>

        {/* Session timeline */}
        {userAttempts.length > 0 && (
          <section className="mt-6 border rounded-lg border-border/60 overflow-hidden">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-4 py-3 bg-muted/30">
              <Clock className="h-3.5 w-3.5" />
              {t('platform.loginAudit.detailSessionTimeline') ?? 'Session timeline'}
            </h3>
            <div className="max-h-[160px] overflow-y-auto p-4">
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
                {userAttempts.map((a) => (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    className={`relative flex items-start gap-3 pl-6 pb-4 last:pb-0 cursor-pointer group ${a.id === attempt.id ? 'ring-1 ring-primary/30 rounded -ml-1 pl-5' : ''}`}
                    onClick={() => onAttemptSelect?.(a)}
                    onKeyDown={(e) => e.key === 'Enter' && onAttemptSelect?.(a)}
                  >
                    <div
                      className={`absolute left-0 w-2 h-2 rounded-full -translate-x-1/2 mt-1.5 ${
                        a.success ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{formatShortDate(a.attempted_at)}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.success ? 'Success' : getFailureReasonLabel(a.failure_reason)} · {a.ip_address}
                      </p>
                    </div>
                    {a.id === attempt.id && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">{t('platform.loginAudit.detailCurrent') ?? 'Current'}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Latest logins for this user */}
        {(attempt.user_id || attempt.email) && (
          <section className="mt-4 border rounded-lg border-border/60 overflow-hidden">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-4 py-3 bg-muted/30">
              <History className="h-3.5 w-3.5" />
              {t('platform.loginAudit.detailLatestLogins') ?? "This user's latest logins"}
            </h3>
            <div className="max-h-[180px] overflow-y-auto">
              {userAttemptsLoading ? (
                <div className="p-4 text-sm text-muted-foreground text-center">{t('common.loading') ?? 'Loading...'}</div>
              ) : userAttempts.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">{t('platform.loginAudit.detailNoRecentAttempts') ?? 'No recent attempts'}</div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {userAttempts.map((a) => (
                    <li
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors cursor-pointer ${a.id === attempt.id ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : ''}`}
                      onClick={() => onAttemptSelect?.(a)}
                      onKeyDown={(e) => e.key === 'Enter' && onAttemptSelect?.(a)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant={a.success ? 'default' : 'destructive'} className="text-xs flex-shrink-0">
                          {a.success ? '✓' : '✗'}
                        </Badge>
                        <span className="text-muted-foreground truncate">{formatShortDate(a.attempted_at)}</span>
                        <span className="text-muted-foreground truncate hidden sm:inline">
                          {a.login_context === 'platform_admin' ? 'Platform' : 'Main'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">{a.ip_address}</span>
                        {a.id === attempt.id && (
                          <Badge variant="outline" className="text-xs">{t('platform.loginAudit.detailCurrent') ?? 'Current'}</Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* Activity from this IP */}
        {attempt.ip_address && (
          <section className="mt-4 border rounded-lg border-border/60 overflow-hidden">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 px-4 py-3 bg-muted/30">
              <Wifi className="h-3.5 w-3.5" />
              {t('platform.loginAudit.detailActivityFromIp') ?? 'Activity from this IP'}
            </h3>
            <div className="max-h-[180px] overflow-y-auto">
              {ipAttemptsLoading ? (
                <div className="p-4 text-sm text-muted-foreground text-center">{t('common.loading') ?? 'Loading...'}</div>
              ) : ipAttempts.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground text-center">{t('platform.loginAudit.detailNoActivityFromIp') ?? 'No activity'}</div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {ipAttempts.map((a) => (
                    <li
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors cursor-pointer ${a.id === attempt.id ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : ''}`}
                      onClick={() => onAttemptSelect?.(a)}
                      onKeyDown={(e) => e.key === 'Enter' && onAttemptSelect?.(a)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Badge variant={a.success ? 'default' : 'destructive'} className="text-xs flex-shrink-0">
                          {a.success ? '✓' : '✗'}
                        </Badge>
                        <span className="truncate font-medium">{a.email}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-muted-foreground text-xs">{formatShortDate(a.attempted_at)}</span>
                        {a.id === attempt.id && (
                          <Badge variant="outline" className="text-xs">{t('platform.loginAudit.detailCurrent') ?? 'Current'}</Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {attempt.user_agent && (
          <div className="mt-6 pt-4">
            <button
              type="button"
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground w-full"
              onClick={() => setUserAgentExpanded(!userAgentExpanded)}
            >
              {userAgentExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {t('platform.loginAudit.detailRawUserAgent') ?? 'Raw User Agent'}
            </button>
            {userAgentExpanded && (
              <pre className="mt-2 p-3 text-xs bg-muted/50 rounded-md overflow-x-auto break-all font-mono">
                {attempt.user_agent}
              </pre>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
