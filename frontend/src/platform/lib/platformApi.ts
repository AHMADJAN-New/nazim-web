import { apiClient } from '@/lib/api/client';
import type * as SubscriptionApi from '@/types/api/subscription';
import type * as OrganizationApi from '@/types/api/organization';

/**
 * Platform Admin API Client
 * Uses /platform routes (not /admin/subscription)
 * These routes require subscription.admin permission (GLOBAL, not organization-scoped)
 */
export const platformApi = {
  // Dashboard
  dashboard: async () => {
    return apiClient.get<{ data: SubscriptionApi.SubscriptionDashboard }>('/platform/dashboard');
  },

  // Plans
  plans: {
    list: async () => {
      return apiClient.get<{ data: SubscriptionApi.SubscriptionPlan[] }>('/platform/plans');
    },
    create: async (data: SubscriptionApi.CreatePlanData) => {
      return apiClient.post<{ data: SubscriptionApi.SubscriptionPlan }>('/platform/plans', data);
    },
    update: async (id: string, data: SubscriptionApi.UpdatePlanData) => {
      return apiClient.put<{ data: SubscriptionApi.SubscriptionPlan }>(`/platform/plans/${id}`, data);
    },
  },

  // Subscriptions
  subscriptions: {
    list: async (params?: { status?: string; plan_id?: string }) => {
      // Backend returns Laravel paginated response: { data: [], current_page, last_page, total, ... }
      return apiClient.get<{
        data: SubscriptionApi.OrganizationSubscription[];
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
      }>('/platform/subscriptions', params);
    },
    get: async (organizationId: string) => {
      // Backend returns: { data: { subscription, status, usage, features } }
      return apiClient.get<{ 
        data: {
          subscription: SubscriptionApi.OrganizationSubscription | null;
          status: string;
          usage: Record<string, any>;
          features: any[];
        }
      }>(`/platform/organizations/${organizationId}/subscription`);
    },
    activate: async (organizationId: string, data: SubscriptionApi.ActivateSubscriptionData) => {
      return apiClient.post<{ data: SubscriptionApi.OrganizationSubscription }>(`/platform/organizations/${organizationId}/activate`, data);
    },
    suspend: async (organizationId: string, data: SubscriptionApi.SuspendSubscriptionData) => {
      return apiClient.post<{ data: SubscriptionApi.OrganizationSubscription }>(`/platform/organizations/${organizationId}/suspend`, data);
    },
    addLimitOverride: async (organizationId: string, data: SubscriptionApi.AddLimitOverrideData) => {
      return apiClient.post(`/platform/organizations/${organizationId}/limit-override`, data);
    },
    addFeatureAddon: async (organizationId: string, data: SubscriptionApi.AddFeatureAddonData) => {
      return apiClient.post(`/platform/organizations/${organizationId}/feature-addon`, data);
    },
    getUsageSnapshots: async (organizationId: string) => {
      return apiClient.get<{ data: SubscriptionApi.UsageSnapshot[] }>(`/platform/organizations/${organizationId}/usage-snapshots`);
    },
    recalculateUsage: async (organizationId: string) => {
      return apiClient.post(`/platform/organizations/${organizationId}/recalculate-usage`);
    },
  },

  // Payments
  payments: {
    pending: async () => {
      return apiClient.get<{ 
        data: SubscriptionApi.PendingPayment[]; 
        current_page: number; 
        last_page: number; 
        total: number;
      }>('/platform/payments/pending');
    },
    confirm: async (paymentId: string) => {
      return apiClient.post(`/platform/payments/${paymentId}/confirm`);
    },
    reject: async (paymentId: string, data: { reason: string }) => {
      return apiClient.post(`/platform/payments/${paymentId}/reject`, data);
    },
  },

  // Renewals
  renewals: {
    pending: async () => {
      return apiClient.get<{ 
        data: SubscriptionApi.PendingRenewal[]; 
        current_page: number; 
        last_page: number; 
        total: number;
      }>('/platform/renewals/pending');
    },
    get: async (renewalId: string) => {
      return apiClient.get<{ data: SubscriptionApi.RenewalRequest }>(`/platform/renewals/${renewalId}`);
    },
    approve: async (renewalId: string, data: SubscriptionApi.ApproveRenewalData) => {
      return apiClient.post(`/platform/renewals/${renewalId}/approve`, data);
    },
    reject: async (renewalId: string, data: { reason: string }) => {
      return apiClient.post(`/platform/renewals/${renewalId}/reject`, data);
    },
  },

  // Organizations
  organizations: {
    list: async () => {
      const response = await apiClient.get<{ data: OrganizationApi.Organization[] }>('/platform/organizations');
      return response.data; // Extract data from response
    },
    get: async (id: string) => {
      const response = await apiClient.get<{ data: OrganizationApi.Organization }>(`/platform/organizations/${id}`);
      return response.data; // Extract data from response
    },
    create: async (data: OrganizationApi.OrganizationInsert & { admin_email: string; admin_password: string; admin_full_name: string }) => {
      const response = await apiClient.post<{ data: OrganizationApi.Organization }>('/platform/organizations', data);
      return response.data; // Extract data from response
    },
    update: async (id: string, data: Partial<OrganizationApi.OrganizationInsert>) => {
      const response = await apiClient.put<{ data: OrganizationApi.Organization }>(`/platform/organizations/${id}`, data);
      return response.data; // Extract data from response
    },
    delete: async (id: string) => {
      return apiClient.delete(`/platform/organizations/${id}`);
    },
    toggleFeature: async (organizationId: string, featureKey: string) => {
      return apiClient.post(`/platform/organizations/${organizationId}/features/${featureKey}/toggle`);
    },
    admins: async () => {
      return apiClient.get('/platform/organizations/admins');
    },
  },

  // Permissions Management (Platform Admin)
  permissions: {
    getAll: async () => {
      return apiClient.get<Array<{ id: number; name: string; resource: string; action: string; description?: string; organization_id: string }>>('/platform/permissions/all');
    },
    getForOrganization: async (organizationId: string) => {
      return apiClient.get<Array<{ id: number; name: string; resource: string; action: string; description?: string; organization_id: string }>>(`/platform/organizations/${organizationId}/permissions`);
    },
  },

  // Platform Admin Users
  users: {
    list: async () => {
      const response = await apiClient.get<{
        data: Array<{
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          is_active: boolean;
          has_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        }>;
      }>('/platform/users');
      return response.data;
    },
    create: async (data: {
      email: string;
      password: string;
      full_name: string;
      phone?: string;
    }) => {
      const response = await apiClient.post<{
        data: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          is_active: boolean;
          has_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
      }>('/platform/users', data);
      return response.data;
    },
    update: async (id: string, data: {
      email?: string;
      full_name?: string;
      phone?: string;
    }) => {
      const response = await apiClient.put<{
        data: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          is_active: boolean;
          has_platform_admin: boolean;
          created_at: string;
          updated_at: string;
        };
      }>(`/platform/users/${id}`, data);
      return response.data;
    },
    delete: async (id: string) => {
      return apiClient.delete(`/platform/users/${id}`);
    },
    resetPassword: async (id: string, password: string) => {
      return apiClient.post(`/platform/users/${id}/reset-password`, { password });
    },
  },

  // User Permissions Management (Platform Admin)
  userPermissions: {
    get: async (userId: string) => {
      return apiClient.get<{
        user_id: string;
        organization_id: string;
        all_permissions: string[];
        direct_permissions: Array<{ id: number; name: string }>;
        role_permissions: Array<{ id: number; name: string }>;
      }>(`/platform/users/${userId}/permissions`);
    },
    assign: async (userId: string, permissionId: number) => {
      return apiClient.post(`/platform/users/${userId}/permissions/assign`, { permission_id: permissionId });
    },
    remove: async (userId: string, permissionId: number) => {
      return apiClient.post(`/platform/users/${userId}/permissions/remove`, { permission_id: permissionId });
    },
  },

  // Permission Groups Management (Platform Admin) - Global groups
  permissionGroups: {
    list: async () => {
      const response = await apiClient.get<{ data: Array<{
        id: string;
        organization_id: string | null;
        name: string;
        description?: string;
        permissions: Array<{ id: number; name: string; resource: string; action: string }>;
        created_at: string;
        updated_at: string;
      }> }>('/platform/permission-groups');
      return response.data;
    },
    create: async (data: { name: string; description?: string; permission_ids: number[] }) => {
      const response = await apiClient.post<{ data: {
        id: string;
        organization_id: string | null;
        name: string;
        description?: string;
        permissions: Array<{ id: number; name: string; resource: string; action: string }>;
      } }>('/platform/permission-groups', data);
      return response.data;
    },
    update: async (groupId: string, data: { name?: string; description?: string; permission_ids?: number[] }) => {
      const response = await apiClient.put<{ data: {
        id: string;
        organization_id: string | null;
        name: string;
        description?: string;
        permissions: Array<{ id: number; name: string; resource: string; action: string }>;
      } }>(`/platform/permission-groups/${groupId}`, data);
      return response.data;
    },
    delete: async (groupId: string) => {
      return apiClient.delete(`/platform/permission-groups/${groupId}`);
    },
    assignToUser: async (userId: string, permissionGroupId: string) => {
      return apiClient.post<{ message: string; assigned: number; skipped: number }>(`/platform/users/${userId}/permission-groups/assign`, {
        permission_group_id: permissionGroupId,
      });
    },
    removeFromUser: async (userId: string, permissionGroupId: string) => {
      return apiClient.post<{ message: string; removed: number }>(`/platform/users/${userId}/permission-groups/remove`, {
        permission_group_id: permissionGroupId,
      });
    },
  },

  // Discount Codes
  discountCodes: {
    list: async () => {
      return apiClient.get<{ data: SubscriptionApi.DiscountCode[]; current_page: number; last_page: number; total: number }>('/platform/discount-codes');
    },
    create: async (data: SubscriptionApi.CreateDiscountCodeData) => {
      return apiClient.post<{ data: SubscriptionApi.DiscountCode }>('/platform/discount-codes', data);
    },
    update: async (id: string, data: Partial<SubscriptionApi.CreateDiscountCodeData>) => {
      return apiClient.put<{ data: SubscriptionApi.DiscountCode }>(`/platform/discount-codes/${id}`, data);
    },
    delete: async (id: string) => {
      return apiClient.delete(`/platform/discount-codes/${id}`);
    },
  },

  // Feature & Limit Definitions
  featureDefinitions: async () => {
    return apiClient.get<{ data: SubscriptionApi.FeatureDefinition[] }>('/platform/feature-definitions');
  },
  limitDefinitions: async () => {
    return apiClient.get<{ data: SubscriptionApi.LimitDefinition[] }>('/platform/limit-definitions');
  },

  // System Operations
  processTransitions: async () => {
    return apiClient.post<{ data: { to_grace_period: number; to_readonly: number; to_expired: number } }>('/platform/process-transitions');
  },

  // Backup & Restore
  backups: {
    list: async () => {
      const response = await apiClient.get<{
        success: boolean;
        backups: Array<{
          filename: string;
          size: string;
          created_at: string;
          path: string;
        }>;
      }>('/platform/backups');
      return response.backups;
    },
    create: async () => {
      return apiClient.post<{
        success: boolean;
        message: string;
        backup: {
          filename: string;
          path: string;
          size: string;
          timestamp: string;
          created_at: string;
        };
      }>('/platform/backups');
    },
    download: async (filename: string) => {
      const { blob, filename: responseFilename } = await apiClient.requestFile(
        `/platform/backups/${filename}/download`,
        { method: 'GET' }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = responseFilename || filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    delete: async (filename: string) => {
      return apiClient.delete<{
        success: boolean;
        message: string;
      }>(`/platform/backups/${filename}`);
    },
    restore: async (filename: string) => {
      return apiClient.post<{
        success: boolean;
        message: string;
      }>(`/platform/backups/${filename}/restore`);
    },
    uploadAndRestore: async (file: File) => {
      const formData = new FormData();
      formData.append('backup_file', file);
      return apiClient.post('/platform/backups/upload-restore', formData, { headers: {} });
    },
  },

  // Maintenance Mode
  maintenance: {
    getStatus: async () => {
      return apiClient.get<{
        success: boolean;
        data: {
          is_maintenance_mode: boolean;
          message: string | null;
          scheduled_end_at: string | null;
          affected_services: string[];
          current_log: {
            id: string;
            started_at: string;
            started_by: {
              id: string;
              name: string;
              email: string;
            } | null;
          } | null;
        };
      }>('/platform/maintenance/status');
    },
    enable: async (data: {
      message?: string;
      scheduled_end_at?: string;
      affected_services?: string[];
    }) => {
      return apiClient.post<{
        success: boolean;
        message: string;
        log_id: string;
      }>('/platform/maintenance/enable', data);
    },
    disable: async () => {
      return apiClient.post<{
        success: boolean;
        message: string;
      }>('/platform/maintenance/disable');
    },
    history: async () => {
      return apiClient.get<{
        success: boolean;
        data: Array<{
          id: string;
          message: string;
          affected_services: string[];
          started_at: string;
          scheduled_end_at: string | null;
          actual_end_at: string | null;
          duration_minutes: number | null;
          status: string;
          started_by: {
            name: string;
            email: string;
          } | null;
          ended_by: {
            name: string;
            email: string;
          } | null;
        }>;
      }>('/platform/maintenance/history');
    },
  },
};

