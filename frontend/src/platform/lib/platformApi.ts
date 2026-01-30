import { apiClient } from '@/lib/api/client';
import type * as HelpCenterApi from '@/types/api/helpCenter';
import type * as OrganizationApi from '@/types/api/organization';
import type * as SubscriptionApi from '@/types/api/subscription';
import type * as DesktopLicenseApi from '@/types/api/desktopLicense';

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
    getRevenueHistory: async (organizationId: string) => {
      return apiClient.get<{ data: SubscriptionApi.OrganizationRevenueHistory }>(`/platform/organizations/${organizationId}/revenue-history`);
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
    submitLicensePayment: async (organizationId: string, data: {
      subscription_id: string;
      amount: number;
      currency: 'AFN' | 'USD';
      payment_method: string;
      payment_reference?: string;
      payment_date: string;
      notes?: string;
    }) => {
      return apiClient.post<{ data: SubscriptionApi.PaymentRecord }>(
        `/platform/organizations/${organizationId}/license-payment`,
        data
      );
    },
    submitMaintenancePayment: async (organizationId: string, data: {
      subscription_id: string;
      invoice_id?: string;
      amount: number;
      currency: 'AFN' | 'USD';
      payment_method: string;
      payment_reference?: string;
      payment_date: string;
      notes?: string;
    }) => {
      return apiClient.post<{ data: SubscriptionApi.PaymentRecord }>(
        `/platform/organizations/${organizationId}/maintenance-payment`,
        data
      );
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

  // Help Center (Platform Admin - no organization scoping)
  helpCenter: {
    categories: {
      list: async (params?: {
        is_active?: boolean;
        parent_id?: string | null;
      }) => {
        return apiClient.get<{ data: HelpCenterApi.HelpCenterCategory[] } | HelpCenterApi.HelpCenterCategory[]>('/platform/help-center/categories', params);
      },
      get: async (id: string) => {
        return apiClient.get<{ data: HelpCenterApi.HelpCenterCategory }>(`/platform/help-center/categories/${id}`);
      },
      create: async (data: HelpCenterApi.HelpCenterCategoryInsert) => {
        return apiClient.post<{ data: HelpCenterApi.HelpCenterCategory }>('/platform/help-center/categories', data);
      },
      update: async (id: string, data: HelpCenterApi.HelpCenterCategoryUpdate) => {
        return apiClient.put<{ data: HelpCenterApi.HelpCenterCategory }>(`/platform/help-center/categories/${id}`, data);
      },
      delete: async (id: string) => {
        return apiClient.delete(`/platform/help-center/categories/${id}`);
      },
    },
    articles: {
      list: async (params?: {
        category_id?: string;
        status?: 'draft' | 'published' | 'archived';
        visibility?: 'public' | 'org_users' | 'staff_only';
        is_featured?: boolean;
        is_pinned?: boolean;
        tag?: string;
        search?: string;
        order_by?: 'recent' | 'views' | 'relevance';
        order_dir?: 'asc' | 'desc';
        page?: number;
        per_page?: number;
        limit?: number;
      }) => {
        return apiClient.get<{ data: HelpCenterApi.HelpCenterArticle[] } | HelpCenterApi.HelpCenterArticle[]>('/platform/help-center/articles', params);
      },
      get: async (id: string) => {
        return apiClient.get<{ data: HelpCenterApi.HelpCenterArticle }>(`/platform/help-center/articles/${id}`);
      },
      create: async (data: HelpCenterApi.HelpCenterArticleInsert) => {
        return apiClient.post<{ data: HelpCenterApi.HelpCenterArticle }>('/platform/help-center/articles', data);
      },
      update: async (id: string, data: HelpCenterApi.HelpCenterArticleUpdate) => {
        return apiClient.put<{ data: HelpCenterApi.HelpCenterArticle }>(`/platform/help-center/articles/${id}`, data);
      },
      delete: async (id: string) => {
        return apiClient.delete(`/platform/help-center/articles/${id}`);
      },
      publish: async (id: string) => {
        return apiClient.post(`/platform/help-center/articles/${id}/publish`);
      },
      unpublish: async (id: string) => {
        return apiClient.post(`/platform/help-center/articles/${id}/unpublish`);
      },
      archive: async (id: string) => {
        return apiClient.post(`/platform/help-center/articles/${id}/archive`);
      },
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

  // Testimonials
  testimonials: {
    list: async () => {
      return apiClient.get<{ data: Array<{
        id: string;
        name: string;
        role?: string;
        organization?: string;
        content: string;
        image_url?: string;
        rating: number;
        sort_order: number;
        is_active: boolean;
        created_at: string;
        updated_at: string;
      }> }>('/platform/testimonials');
    },
    create: async (data: {
      name: string;
      role?: string;
      organization?: string;
      content: string;
      image_url?: string;
      rating: number;
      sort_order?: number;
      is_active?: boolean;
    }) => {
      return apiClient.post<{ data: any }>('/platform/testimonials', data);
    },
    update: async (id: string, data: Partial<{
      name: string;
      role?: string;
      organization?: string;
      content: string;
      image_url?: string;
      rating: number;
      sort_order?: number;
      is_active?: boolean;
    }>) => {
      return apiClient.put<{ data: any }>(`/platform/testimonials/${id}`, data);
    },
    get: async (id: string) => {
      return apiClient.get<{ data: any }>(`/platform/testimonials/${id}`);
    },
    delete: async (id: string) => {
      return apiClient.delete(`/platform/testimonials/${id}`);
    },
  },

  // Contact Messages
  contactMessages: {
    list: async (params?: { status?: string; search?: string; page?: number; per_page?: number }) => {
      return apiClient.get<{
        data: Array<{
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          school_name?: string | null;
          student_count?: number | null;
          message: string;
          status: 'new' | 'read' | 'replied' | 'archived';
          admin_notes?: string | null;
          replied_by?: string | null;
          replied_at?: string | null;
          reply_subject?: string | null;
          reply_message?: string | null;
          source: string;
          created_at: string;
          updated_at: string;
        }>;
        current_page: number;
        last_page: number;
        total: number;
        per_page: number;
      }>('/platform/contact-messages', params);
    },
    get: async (id: string) => {
      return apiClient.get<{ data: any }>(`/platform/contact-messages/${id}`);
    },
    update: async (id: string, data: Partial<{
      status?: 'new' | 'read' | 'replied' | 'archived';
      admin_notes?: string;
      reply_subject?: string;
      reply_message?: string;
    }>) => {
      return apiClient.put<{ data: any }>(`/platform/contact-messages/${id}`, data);
    },
    delete: async (id: string) => {
      return apiClient.delete(`/platform/contact-messages/${id}`);
    },
    stats: async () => {
      return apiClient.get<{ data: {
        total: number;
        new: number;
        read: number;
        replied: number;
        archived: number;
        today: number;
        this_week: number;
        this_month: number;
      } }>('/platform/contact-messages/stats');
    },
  },
  planRequests: {
    list: async (params?: { search?: string; page?: number; per_page?: number }) => {
      return apiClient.get<{
        data: Array<{
          id: string;
          requested_plan_id?: string | null;
          organization_name: string;
          school_name: string;
          school_page_url?: string | null;
          contact_name: string;
          contact_email: string;
          contact_phone?: string | null;
          contact_whatsapp?: string | null;
          contact_position?: string | null;
          number_of_schools?: number | null;
          student_count?: number | null;
          staff_count?: number | null;
          city?: string | null;
          country?: string | null;
          message?: string | null;
          created_at: string;
          updated_at: string;
          requested_plan?: {
            id: string;
            name: string;
            slug: string;
          } | null;
        }>;
        pagination: {
          current_page: number;
          last_page: number;
          per_page: number;
          total: number;
        };
      }>('/platform/plan-requests', params);
    },
    get: async (id: string) => {
      return apiClient.get<{
        data: {
          id: string;
          requested_plan_id?: string | null;
          organization_name: string;
          school_name: string;
          school_page_url?: string | null;
          contact_name: string;
          contact_email: string;
          contact_phone?: string | null;
          contact_whatsapp?: string | null;
          contact_position?: string | null;
          number_of_schools?: number | null;
          student_count?: number | null;
          staff_count?: number | null;
          city?: string | null;
          country?: string | null;
          message?: string | null;
          created_at: string;
          updated_at: string;
          requested_plan?: {
            id: string;
            name: string;
            slug: string;
          } | null;
        };
      }>(`/platform/plan-requests/${id}`);
    },
  },

  // Website management
  websites: {
    getConfig: async () => {
      return apiClient.get<{
        base_domain: string;
      }>('/platform/website/config');
    },
    getOrganizationWebsite: async (organizationId: string) => {
      return apiClient.get<{
        organization: {
          id: string;
          name: string;
          slug: string;
          website: string | null;
        };
        domains: Array<{
          id: string;
          organization_id: string;
          school_id: string | null;
          domain: string;
          is_primary: boolean;
          verification_status: string | null;
          ssl_status: string | null;
          created_at: string;
          updated_at: string;
        }>;
        settings: Array<{
          id: string;
          organization_id: string;
          school_id: string | null;
          school_slug: string | null;
          default_language: string | null;
          enabled_languages: string[] | null;
          theme: Record<string, any> | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        }>;
        schools: Array<{
          id: string;
          school_name: string | null;
          school_slug: string | null;
        }>;
      }>(`/platform/organizations/${organizationId}/website`);
    },
    upsertWebsiteSettings: async (
      organizationId: string,
      schoolId: string,
      data: {
        school_slug: string;
        is_public: boolean;
        default_language?: string | null;
        enabled_languages?: string[] | null;
        theme?: Record<string, any> | null;
      }
    ) => {
      return apiClient.put(`/platform/organizations/${organizationId}/website/settings/${schoolId}`, data);
    },
    listDomains: async (organizationId: string, params?: { school_id?: string }) => {
      return apiClient.get(`/platform/organizations/${organizationId}/domains`, params);
    },
    createDomain: async (organizationId: string, data: {
      school_id: string;
      domain: string;
      is_primary?: boolean;
      verification_status?: string | null;
      ssl_status?: string | null;
    }) => {
      return apiClient.post(`/platform/organizations/${organizationId}/domains`, data);
    },
    updateDomain: async (organizationId: string, domainId: string, data: {
      school_id?: string;
      domain?: string;
      is_primary?: boolean;
      verification_status?: string | null;
      ssl_status?: string | null;
    }) => {
      return apiClient.put(`/platform/organizations/${organizationId}/domains/${domainId}`, data);
    },
    deleteDomain: async (organizationId: string, domainId: string) => {
      return apiClient.delete(`/platform/organizations/${organizationId}/domains/${domainId}`);
    },
  },

  // Generic request method for custom endpoints
  request: async function<T = any>(endpoint: string, options?: { method?: string; body?: string | object; params?: Record<string, string> }) {
    const method = options?.method || 'GET';
    const params = options?.params;
    
    if (method === 'GET') {
      return apiClient.get<T>(endpoint, params);
    } else if (method === 'POST') {
      const body = typeof options?.body === 'string' ? JSON.parse(options.body) : options?.body;
      return apiClient.post<T>(endpoint, body);
    } else if (method === 'PUT') {
      const body = typeof options?.body === 'string' ? JSON.parse(options.body) : options?.body;
      return apiClient.put<T>(endpoint, body);
    } else if (method === 'DELETE') {
      return apiClient.delete<T>(endpoint);
    }
    throw new Error(`Unsupported method: ${method}`);
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

  // Maintenance Fees (Platform Admin)
  maintenanceFees: {
    list: async (params?: { 
      billing_period?: string; 
      status?: string; 
      page?: number; 
      per_page?: number;
    }) => {
      return apiClient.get<{
        data: Array<{
          organization_id: string;
          organization_name: string;
          subscription_id: string;
          billing_period: SubscriptionApi.BillingPeriod;
          next_due_date: string | null;
          last_paid_date: string | null;
          is_overdue: boolean;
          days_until_due: number | null;
          days_overdue: number;
          amount: number;
          currency: 'AFN' | 'USD';
        }>;
        current_page: number;
        last_page: number;
        total: number;
      }>('/platform/maintenance-fees', params);
    },
    overdue: async () => {
      return apiClient.get<{
        data: Array<{
          organization_id: string;
          organization_name: string;
          subscription_id: string;
          billing_period: SubscriptionApi.BillingPeriod;
          next_due_date: string | null;
          last_paid_date: string | null;
          is_overdue: boolean;
          days_overdue: number;
          amount: number;
          currency: 'AFN' | 'USD';
        }>;
      }>('/platform/maintenance-fees/overdue');
    },
    invoices: async (params?: {
      organization_id?: string;
      status?: string;
      page?: number;
      per_page?: number;
    }) => {
      return apiClient.get<{
        data: SubscriptionApi.MaintenanceInvoice[];
        current_page: number;
        last_page: number;
        total: number;
      }>('/platform/maintenance-fees/invoices', params);
    },
    generateInvoices: async (data?: {
      organization_ids?: string[];
      billing_period?: SubscriptionApi.BillingPeriod;
    }) => {
      return apiClient.post<{
        data: {
          generated: number;
          skipped: number;
          invoices: SubscriptionApi.MaintenanceInvoice[];
        };
      }>('/platform/maintenance-fees/generate-invoices', data);
    },
    confirmPayment: async (paymentId: string) => {
      return apiClient.post(`/platform/maintenance-fees/payments/${paymentId}/confirm`);
    },
  },

  // License Fees (Platform Admin)
  licenseFees: {
    unpaid: async (params?: {
      page?: number;
      per_page?: number;
    }) => {
      return apiClient.get<{
        data: Array<{
          organization_id: string;
          organization_name: string;
          subscription_id: string;
          license_paid: boolean;
          license_paid_at: string | null;
          license_pending: boolean;
          license_amount: number;
          currency: 'AFN' | 'USD';
        }>;
        current_page: number;
        last_page: number;
        total: number;
      }>('/platform/license-fees/unpaid', params);
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

  // Desktop License Management
  desktopLicenses: {
    // License Keys
    keys: {
      list: async () => {
        return apiClient.get<{ data: DesktopLicenseApi.LicenseKey[] }>('/platform/desktop-licenses/keys');
      },
      generate: async (data: DesktopLicenseApi.GenerateKeyPairRequest) => {
        return apiClient.post<{ data: DesktopLicenseApi.LicenseKey }>('/platform/desktop-licenses/keys', data);
      },
      import: async (data: DesktopLicenseApi.ImportKeysRequest) => {
        return apiClient.post<{ data: DesktopLicenseApi.ImportKeysResponse }>('/platform/desktop-licenses/keys/import', data);
      },
      get: async (id: string) => {
        return apiClient.get<{ data: DesktopLicenseApi.LicenseKey }>(`/platform/desktop-licenses/keys/${id}`);
      },
      update: async (id: string, data: DesktopLicenseApi.UpdateKeyRequest) => {
        return apiClient.put<{ data: DesktopLicenseApi.LicenseKey }>(`/platform/desktop-licenses/keys/${id}`, data);
      },
      delete: async (id: string) => {
        return apiClient.delete(`/platform/desktop-licenses/keys/${id}`);
      },
    },
    // License Operations
    sign: async (data: DesktopLicenseApi.SignLicenseRequest) => {
      return apiClient.post<{ data: DesktopLicenseApi.SignedLicenseResponse }>('/platform/desktop-licenses/sign', data);
    },
    verify: async (data: DesktopLicenseApi.VerifyLicenseRequest) => {
      return apiClient.post<{ data: DesktopLicenseApi.VerifyLicenseResponse }>('/platform/desktop-licenses/verify', data);
    },
    // Desktop Licenses
    list: async () => {
      return apiClient.get<{ data: DesktopLicenseApi.DesktopLicense[] }>('/platform/desktop-licenses');
    },
    get: async (id: string) => {
      return apiClient.get<{ data: DesktopLicenseApi.DesktopLicense }>(`/platform/desktop-licenses/${id}`);
    },
    download: async (id: string) => {
      const { blob, filename } = await apiClient.requestFile(
        `/platform/desktop-licenses/${id}/download`,
        { method: 'GET' }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `license-${id}.dat`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    delete: async (id: string) => {
      return apiClient.delete(`/platform/desktop-licenses/${id}`);
    },
  },
};

