import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { platformApi } from '@/platform/lib/platformApi';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import type * as LoginAuditApi from '@/types/api/loginAudit';

/**
 * Paginated list of login attempts with filters.
 */
export const useLoginAttempts = (filters?: LoginAuditApi.LoginAttemptFilters) => {
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  return useQuery({
    queryKey: ['platform-login-audit', filters],
    queryFn: async () => platformApi.loginAudit.list(filters),
    enabled: !permissionsLoading && hasAdmin,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Per-user login attempt history.
 */
export const useLoginAttemptsByUser = (userId: string | null, params?: { page?: number; per_page?: number; start_date?: string; end_date?: string }) => {
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  return useQuery({
    queryKey: ['platform-login-audit-user', userId, params],
    queryFn: async () => {
      if (!userId) return { data: [], current_page: 1, last_page: 1, per_page: 25, total: 0 };
      return platformApi.loginAudit.getByUser(userId, params);
    },
    enabled: !permissionsLoading && hasAdmin && !!userId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Per-organization login attempt history.
 */
export const useLoginAttemptsByOrganization = (
  organizationId: string | null,
  filters?: LoginAuditApi.LoginAttemptFilters
) => {
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  return useQuery({
    queryKey: ['platform-login-audit-org', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return { data: [], current_page: 1, last_page: 1, per_page: 25, total: 0 };
      return platformApi.loginAudit.getByOrganization(organizationId, filters);
    },
    enabled: !permissionsLoading && hasAdmin && !!organizationId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Brute-force alerts (IPs and emails with many failures in last hour).
 */
export const useLoginAlerts = () => {
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  return useQuery({
    queryKey: ['platform-login-audit-alerts'],
    queryFn: async () => platformApi.loginAudit.alerts(),
    enabled: !permissionsLoading && hasAdmin,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Currently locked accounts.
 */
export const useLockedAccounts = () => {
  const { data: permissions, isLoading: permissionsLoading } = usePlatformAdminPermissions();
  const hasAdmin = Array.isArray(permissions) && permissions.includes('subscription.admin');

  return useQuery({
    queryKey: ['platform-login-audit-locked'],
    queryFn: async () => platformApi.loginAudit.locked(),
    enabled: !permissionsLoading && hasAdmin,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Mutation to unlock an account.
 */
export const useUnlockAccount = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (email: string) => platformApi.loginAudit.unlock(email),
    onSuccess: () => {
      showToast.success(t('platform.loginAudit.unlockSuccess') ?? 'Account unlocked');
      void queryClient.invalidateQueries({ queryKey: ['platform-login-audit-locked'] });
      void queryClient.invalidateQueries({ queryKey: ['platform-login-audit'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message ?? (t('platform.loginAudit.unlockFailed') ?? 'Unlock failed'));
    },
  });
};

/**
 * Trigger CSV export of login audit with filters.
 * Returns a function that fetches and triggers download.
 */
export const useExportLoginAudit = () => {
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (filters?: LoginAuditApi.LoginAttemptFilters) => {
      const { blob, filename } = await platformApi.loginAudit.export(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `login_audit_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      showToast.success(t('platform.loginAudit.exportSuccess') ?? 'Export started');
    },
    onError: (error: Error) => {
      showToast.error(error.message ?? (t('platform.loginAudit.exportFailed') ?? 'Export failed'));
    },
  });
};
