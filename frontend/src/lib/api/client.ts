/**
 * Laravel API Client
 * 
 * Pagination Support:
 * - Add `page?: number` and `per_page?: number` to list method params
 * - Backend should return PaginatedResponse<T> structure when pagination params are provided
 * - Example: studentsApi.list({ organization_id: '...', page: 1, per_page: 25 })
 */

import type { PaginationParams, PaginatedResponse } from '@/types/pagination';

// Use relative path in dev (via Vite proxy) or full URL in production
// In development, Vite proxy handles /api -> http://localhost:8000/api
// This eliminates CORS preflight overhead
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');

export interface Profile {
  id: string;
  organization_id: string | null;
  role: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  default_school_id: string | null;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private lastDevToolsWarning: number = 0;
  private readonly DEVTOOLS_WARNING_THROTTLE = 30000; // 30 seconds (reduced console noise)

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('api_token');
    }

    // Development helper messages
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      // Log helpful information once on initialization
      if (!(window as any).__API_CLIENT_INITIALIZED__) {
        (window as any).__API_CLIENT_INITIALIZED__ = true;
        console.log('%c🔧 API Client Initialized', 'color: #10b981; font-weight: bold;');
        console.log(`Base URL: ${baseUrl}`);
        console.log('💡 Development Tips:');
        console.log('  • Ensure Laravel backend is running: `php artisan serve` (port 8000)');
        console.log('  • Check Vite proxy is working (should proxy /api to http://localhost:8000/api)');
        console.log('  • Disable "Disable cache" in DevTools Network tab if requests are blocked');
        console.log('  • Check browser console for CORS errors if requests fail');
      }
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('api_token', token);
      // Dispatch custom event to notify AuthProvider
      window.dispatchEvent(new Event('auth-token-changed'));
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('api_token');
      // Dispatch custom event to notify AuthProvider
      window.dispatchEvent(new Event('auth-token-changed'));
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    // Construct full URL - handles both relative (/api) and absolute (http://...) baseUrls
    // For relative URLs, URL constructor uses window.location.origin as base
    // This works perfectly with Vite proxy: /api/students -> http://localhost:5173/api/students
    const fullPath = `${this.baseUrl}${endpoint}`;
    const url = new URL(fullPath, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            // Laravel expects array parameters in format: key[]=value1&key[]=value2
            value.forEach(v => {
              // Convert booleans to 1/0 for better Laravel compatibility
              const paramValue = typeof v === 'boolean' ? (v ? '1' : '0') : String(v);
              url.searchParams.append(`${key}[]`, paramValue);
            });
          } else {
            // Convert booleans to 1/0 for better Laravel compatibility
            const paramValue = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
            url.searchParams.append(key, paramValue);
          }
        }
      });
    }

    return url.toString();
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const headers: HeadersInit = {
      'Accept': 'application/json',
      ...fetchOptions.headers,
    };

    // Only set Content-Type for JSON, not for FormData (browser will set it with boundary)
    if (!(fetchOptions.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const hasToken = !!this.token;
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));

        // Suppress console errors for expected 401 when no token (user not logged in)
        // This is normal behavior, not an error
        const isExpectedUnauth = response.status === 401 && !hasToken && endpoint.includes('/auth/');

        // For validation errors (400 or 422), include details if available
        if ((response.status === 400 || response.status === 422) && (error.details || error.errors)) {
          const validationErrors = error.details || error.errors;
          const details = Object.entries(validationErrors)
            .map(([key, messages]) => `${key}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          throw new Error(error.message || 'Validation failed' + (details ? ` - ${details}` : ''));
        }

        // Create error but don't log expected 401s
        // Laravel may return error in 'error' field or 'message' field
        const errorMessage = error.message || error.error || `HTTP error! status: ${response.status}`;
        const errorObj = new Error(errorMessage);
        if (isExpectedUnauth) {
          // Mark as expected so useAuth can handle it silently
          (errorObj as any).expected = true;
        }
        throw errorObj;
      }

      // Handle 204 No Content responses (no body)
      if (response.status === 204) {
        return null as T;
      }

      return response.json();
    } catch (error: any) {
      // Detect DevTools request blocking
      const isDevToolsBlocked = error.message?.includes('blocked') ||
        error.message?.toLowerCase().includes('devtools') ||
        (error.name === 'TypeError' && error.message?.includes('Failed to fetch'));

      // Check if request was actually blocked by DevTools (visible in Network tab as "blocked:devtools")
      // This happens when "Disable cache" or request blocking is enabled in DevTools
      // Throttle warnings to avoid console spam (max once per 30 seconds)
      if (isDevToolsBlocked && import.meta.env.DEV) {
        const now = Date.now();
        if (now - this.lastDevToolsWarning > this.DEVTOOLS_WARNING_THROTTLE) {
          this.lastDevToolsWarning = now;
          // Only show if not in iframe (iframe errors are expected and non-critical)
          const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
          if (!isInIframe) {
            const devToolsMessage =
              '⚠️ Request appears to be blocked by DevTools. ' +
              'To fix: Open DevTools → Network tab → Disable "Disable cache" and any request blocking. ' +
              'Then refresh the page.';
            console.warn(devToolsMessage);
          }
        }
      }

      // Handle network errors
      if (error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('blocked') ||
        error.name === 'TypeError') {
        // Check if it's a CORS or network issue
        const isNetworkError = !error.response && (error.message?.includes('Failed to fetch') || error.name === 'TypeError');
        if (isNetworkError) {
          // Provide helpful error message with troubleshooting steps
          const backendUrl = this.baseUrl.includes('localhost') || this.baseUrl.includes('127.0.0.1')
            ? 'http://localhost:8000'
            : this.baseUrl;

          // Try to diagnose the issue
          let diagnosis = '';
          if (import.meta.env.DEV) {
            // Check if it's a proxy issue
            const isProxyIssue = this.baseUrl.startsWith('/api') && !this.baseUrl.includes('localhost');
            
            diagnosis = `\n\n🔍 Diagnosis:`;
            if (isProxyIssue) {
              diagnosis += `\n• Using Vite proxy (/api → http://localhost:8000/api)`;
              diagnosis += `\n• If this fails, check Vite dev server is running and proxy is configured`;
            } else {
              diagnosis += `\n• Direct connection to: ${backendUrl}`;
            }
            
            diagnosis += `\n\n📋 Troubleshooting steps:`;
            diagnosis += `\n1. ✅ Check Laravel backend is running:`;
            diagnosis += `\n   → Open terminal and run: cd backend && php artisan serve`;
            diagnosis += `\n   → Should see: "Laravel development server started: http://127.0.0.1:8000"`;
            diagnosis += `\n   → Test in browser: http://localhost:8000/up (should return JSON)`;
            diagnosis += `\n\n2. ✅ Check Vite dev server is running:`;
            diagnosis += `\n   → Should be running on http://localhost:5173`;
            diagnosis += `\n   → Check Vite console for proxy errors`;
            diagnosis += `\n\n3. ✅ Check DevTools Network tab:`;
            diagnosis += `\n   → Disable "Disable cache" checkbox`;
            diagnosis += `\n   → Check if request shows as "blocked" or "failed"`;
            diagnosis += `\n   → Look for CORS errors in console`;
            diagnosis += `\n\n4. ✅ Verify ports are not in use:`;
            diagnosis += `\n   → Port 8000 (Laravel) should be free`;
            diagnosis += `\n   → Port 5173 (Vite) should be free`;
            diagnosis += `\n   → Check: netstat -ano | findstr :8000 (Windows) or lsof -i :8000 (Mac/Linux)`;
            diagnosis += `\n\n5. ✅ Check firewall/antivirus:`;
            diagnosis += `\n   → May be blocking localhost connections`;
            diagnosis += `\n   → Try temporarily disabling to test`;
          }

          const errorMessage = `Network error: Unable to connect to API server at ${this.baseUrl}.${diagnosis}`;
          throw new Error(errorMessage);
        }
      }
      throw error;
    }
  }

  async requestFile(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<{ blob: Blob; filename: string | null }> {
    const { params, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const headers: HeadersInit = {
      Accept: '*/*',
      ...fetchOptions.headers,
    };

    if (!(fetchOptions.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
    }

    const contentDisposition = response.headers.get('content-disposition');
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/["']/g, '') || null
      : null;

    const blob = await response.blob();
    return { blob, filename };
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    const headers: HeadersInit = {};

    // If data is FormData, don't stringify and don't set Content-Type (browser will set it with boundary)
    if (data instanceof FormData) {
      return this.request<T>(endpoint, {
        method: 'POST',
        body: data,
        headers: options?.headers || {},
      });
    }

    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: options?.headers || {},
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_URL);

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: any; token: string; profile?: any }> => {
    const response = await apiClient.post<{ user: any; token: string; profile?: any }>('/auth/login', {
      email,
      password,
    });
    apiClient.setToken(response.token);
    return response;
  },


  logout: async () => {
    await apiClient.post('/auth/logout');
    apiClient.setToken(null);
  },

  getUser: async () => {
    const response = await apiClient.get<{ user: any; profile: any }>('/auth/user');
    return response;
  },

  getProfile: async () => {
    return apiClient.get<Profile>('/auth/profile');
  },

  updateProfile: async (data: any) => {
    return apiClient.put('/auth/profile', data);
  },

  changePassword: async (data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }) => {
    return apiClient.post('/auth/change-password', data);
  },

  register: async (data: {
    email: string;
    password: string;
    password_confirmation: string;
    full_name: string;
    organization_id?: string;
  }) => {
    const response = await apiClient.post<{ user: any; token: string; profile?: any }>('/auth/register', data);
    if (response.token) {
      apiClient.setToken(response.token);
    }
    return response;
  },
};

// Organizations API
export const organizationsApi = {
  list: async (params?: { organization_id?: string }) => {
    return apiClient.get('/organizations', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/organizations/${id}`);
  },

  create: async (data: any) => {
    return apiClient.post('/organizations', data);
  },

  update: async (id: string, data: any) => {
    return apiClient.put(`/organizations/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/organizations/${id}`);
  },

  accessible: async () => {
    return apiClient.get('/organizations/accessible');
  },

  statistics: async (id: string) => {
    return apiClient.get(`/organizations/${id}/statistics`);
  },

  publicList: async () => {
    // Public endpoint for listing organizations (no auth required)
    // This makes a direct fetch call without authentication
    // If the endpoint doesn't exist, return empty array gracefully
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${baseUrl}/organizations/public`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If endpoint doesn't exist (404) or other error, return empty array
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch organizations: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      // If fetch fails (network error, CORS, etc.), return empty array
      if (import.meta.env.DEV) {
        console.warn('Could not fetch public organizations list:', error);
      }
      return [];
    }
  },
};

// Profiles API
export const profilesApi = {
  list: async (params?: { organization_id?: string }) => {
    return apiClient.get('/profiles', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/profiles/${id}`);
  },

  me: async () => {
    return apiClient.get('/profiles/me');
  },

  update: async (id: string, data: any) => {
    return apiClient.put(`/profiles/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/profiles/${id}`);
  },
};

// Permissions API
export const permissionsApi = {
  list: async () => {
    return apiClient.get('/permissions');
  },

  create: async (data: {
    name: string;
    resource: string;
    action: string;
    description?: string | null;
  }) => {
    return apiClient.post('/permissions', data);
  },

  update: async (id: string, data: {
    name?: string;
    resource?: string;
    action?: string;
    description?: string | null;
  }) => {
    return apiClient.put(`/permissions/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/permissions/${id}`);
  },

  userPermissions: async () => {
    return apiClient.get('/permissions/user');
  },

  userPermissionsForUser: async (userId: string) => {
    return apiClient.get(`/permissions/user/${userId}`);
  },

  roles: async () => {
    return apiClient.get('/permissions/roles');
  },

  rolePermissions: async (roleName: string) => {
    return apiClient.get(`/permissions/roles/${roleName}`);
  },

  assignPermissionToRole: async (data: { role: string; permission_id: string | number }) => {
    return apiClient.post('/permissions/roles/assign', data);
  },

  removePermissionFromRole: async (data: { role: string; permission_id: string | number }) => {
    return apiClient.post('/permissions/roles/remove', data);
  },

  assignRoleToUser: async (data: { user_id: string; role: string }) => {
    return apiClient.post('/permissions/users/assign-role', data);
  },

  removeRoleFromUser: async (data: { user_id: string; role: string }) => {
    return apiClient.post('/permissions/users/remove-role', data);
  },

  assignPermissionToUser: async (data: { user_id: string; permission_id: string | number }) => {
    return apiClient.post('/permissions/users/assign-permission', data);
  },

  removePermissionFromUser: async (data: { user_id: string; permission_id: string | number }) => {
    return apiClient.post('/permissions/users/remove-permission', data);
  },

  userRoles: async (userId: string) => {
    return apiClient.get(`/permissions/users/${userId}/roles`);
  },
};

// Roles API
export const rolesApi = {
  list: async () => {
    return apiClient.get('/roles');
  },

  get: async (id: string) => {
    return apiClient.get(`/roles/${id}`);
  },

  create: async (data: {
    name: string;
    description?: string | null;
    guard_name?: string;
  }) => {
    return apiClient.post('/roles', data);
  },

  update: async (id: string, data: {
    name?: string;
    description?: string | null;
  }) => {
    return apiClient.put(`/roles/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/roles/${id}`);
  },
};

// Schools API (School Branding)
export const schoolsApi = {
  list: async (params?: {
    organization_id?: string;
    is_active?: boolean;
  }) => {
    return apiClient.get('/schools', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/schools/${id}`);
  },

  create: async (data: {
    organization_id: string;
    school_name: string;
    school_name_arabic?: string;
    school_name_pashto?: string;
    school_address?: string;
    school_phone?: string;
    school_email?: string;
    school_website?: string;
    logo_path?: string;
    header_image_path?: string;
    footer_text?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    report_font_size?: string;
    primary_logo_binary?: string; // Base64 encoded
    primary_logo_mime_type?: string;
    primary_logo_filename?: string;
    primary_logo_size?: number;
    secondary_logo_binary?: string; // Base64 encoded
    secondary_logo_mime_type?: string;
    secondary_logo_filename?: string;
    secondary_logo_size?: number;
    ministry_logo_binary?: string; // Base64 encoded
    ministry_logo_mime_type?: string;
    ministry_logo_filename?: string;
    ministry_logo_size?: number;
    primary_logo_usage?: string;
    secondary_logo_usage?: string;
    ministry_logo_usage?: string;
    header_text?: string;
    table_alternating_colors?: boolean;
    show_page_numbers?: boolean;
    show_generation_date?: boolean;
    report_logo_selection?: string;
    calendar_preference?: string;
    is_active?: boolean;
  }) => {
    return apiClient.post('/schools', data);
  },

  update: async (id: string, data: {
    school_name?: string;
    school_name_arabic?: string;
    school_name_pashto?: string;
    school_address?: string;
    school_phone?: string;
    school_email?: string;
    school_website?: string;
    logo_path?: string;
    header_image_path?: string;
    footer_text?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    font_family?: string;
    report_font_size?: string;
    primary_logo_binary?: string; // Base64 encoded
    primary_logo_mime_type?: string;
    primary_logo_filename?: string;
    primary_logo_size?: number;
    secondary_logo_binary?: string; // Base64 encoded
    secondary_logo_mime_type?: string;
    secondary_logo_filename?: string;
    secondary_logo_size?: number;
    ministry_logo_binary?: string; // Base64 encoded
    ministry_logo_mime_type?: string;
    ministry_logo_filename?: string;
    ministry_logo_size?: number;
    primary_logo_usage?: string;
    secondary_logo_usage?: string;
    ministry_logo_usage?: string;
    header_text?: string;
    table_alternating_colors?: boolean;
    show_page_numbers?: boolean;
    show_generation_date?: boolean;
    report_logo_selection?: string;
    calendar_preference?: string;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/schools/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/schools/${id}`);
  },
};

// Users API
export const usersApi = {
  list: async (params?: {
    role?: string;
    organization_id?: string | null;
    is_active?: boolean;
    search?: string;
  }) => {
    return apiClient.get('/users', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/users/${id}`);
  },

  create: async (data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    organization_id?: string | null;
    default_school_id?: string | null;
    phone?: string;
  }) => {
    return apiClient.post('/users', data);
  },

  update: async (id: string, data: {
    full_name?: string;
    email?: string;
    role?: string;
    organization_id?: string | null;
    default_school_id?: string | null;
    phone?: string;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/users/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/users/${id}`);
  },

  resetPassword: async (id: string, password: string) => {
    return apiClient.post(`/users/${id}/reset-password`, { password });
  },
};

export const staffApi = {
  list: async (params?: {
    organization_id?: string;
    staff_type_id?: string;
    status?: string;
    search?: string;
  }) => {
    return apiClient.get('/staff', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/staff/${id}`);
  },

  create: async (data: {
    profile_id?: string | null;
    organization_id: string;
    employee_id: string;
    staff_type?: string;
    staff_type_id?: string;
    school_id?: string | null;
    first_name: string;
    father_name: string;
    grandfather_name?: string | null;
    tazkira_number?: string | null;
    birth_year?: string | null;
    birth_date?: string | null;
    phone_number?: string | null;
    email?: string | null;
    home_address?: string | null;
    origin_province?: string | null;
    origin_district?: string | null;
    origin_village?: string | null;
    current_province?: string | null;
    current_district?: string | null;
    current_village?: string | null;
    religious_education?: string | null;
    religious_university?: string | null;
    religious_graduation_year?: string | null;
    religious_department?: string | null;
    modern_education?: string | null;
    modern_school_university?: string | null;
    modern_graduation_year?: string | null;
    modern_department?: string | null;
    teaching_section?: string | null;
    position?: string | null;
    duty?: string | null;
    salary?: string | null;
    status?: string;
    picture_url?: string | null;
    document_urls?: any[];
    notes?: string | null;
  }) => {
    return apiClient.post('/staff', data);
  },

  update: async (id: string, data: {
    profile_id?: string | null;
    employee_id?: string;
    staff_type?: string;
    staff_type_id?: string;
    school_id?: string | null;
    first_name?: string;
    father_name?: string;
    grandfather_name?: string | null;
    tazkira_number?: string | null;
    birth_year?: string | null;
    birth_date?: string | null;
    phone_number?: string | null;
    email?: string | null;
    home_address?: string | null;
    origin_province?: string | null;
    origin_district?: string | null;
    origin_village?: string | null;
    current_province?: string | null;
    current_district?: string | null;
    current_village?: string | null;
    religious_education?: string | null;
    religious_university?: string | null;
    religious_graduation_year?: string | null;
    religious_department?: string | null;
    modern_education?: string | null;
    modern_school_university?: string | null;
    modern_graduation_year?: string | null;
    modern_department?: string | null;
    teaching_section?: string | null;
    position?: string | null;
    duty?: string | null;
    salary?: string | null;
    status?: string;
    picture_url?: string | null;
    document_urls?: any[];
    notes?: string | null;
  }) => {
    return apiClient.put(`/staff/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/staff/${id}`);
  },

  stats: async (params?: {
    organization_id?: string;
  }) => {
    return apiClient.get('/staff/stats', params);
  },

  uploadPicture: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/staff/${id}/picture`, formData, {
      headers: {}, // Let browser set Content-Type with boundary
    });
  },

  uploadDocument: async (id: string, file: File, documentType: string, description?: string | null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (description) {
      formData.append('description', description);
    }
    return apiClient.post(`/staff/${id}/document`, formData, {
      headers: {}, // Let browser set Content-Type with boundary
    });
  },

  exportReport: async (params: {
    format: 'csv' | 'pdf' | 'xlsx';
    organization_id?: string;
    school_id?: string;
    status?: string;
    staff_type_id?: string;
    search?: string;
  }) => {
    return apiClient.requestFile('/staff/report/export', { method: 'GET', params });
  },
};

export const staffTypesApi = {
  list: async (params?: {
    organization_id?: string;
  }) => {
    return apiClient.get('/staff-types', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/staff-types/${id}`);
  },

  create: async (data: {
    organization_id?: string | null;
    name: string;
    code: string;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
  }) => {
    return apiClient.post('/staff-types', data);
  },

  update: async (id: string, data: {
    name?: string;
    code?: string;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
  }) => {
    return apiClient.put(`/staff-types/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/staff-types/${id}`);
  },
};

export const staffDocumentsApi = {
  list: async (staffId: string) => {
    return apiClient.get(`/staff/${staffId}/documents`);
  },

  create: async (staffId: string, file: File, documentType: string, description?: string | null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (description) {
      formData.append('description', description);
    }
    return apiClient.post(`/staff/${staffId}/documents`, formData, {
      headers: {}, // Let browser set Content-Type with boundary
    });
  },

  delete: async (id: string) => {
    return apiClient.delete(`/staff-documents/${id}`);
  },
};

export const classesApi = {
  list: async (params?: {
    organization_id?: string;
  }) => {
    return apiClient.get('/classes', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/classes/${id}`);
  },

  create: async (data: {
    name: string;
    code: string;
    grade_level?: number | null;
    description?: string | null;
    default_capacity?: number;
    is_active?: boolean;
    organization_id?: string | null;
  }) => {
    return apiClient.post('/classes', data);
  },

  update: async (id: string, data: {
    name?: string;
    code?: string;
    grade_level?: number | null;
    description?: string | null;
    default_capacity?: number;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/classes/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/classes/${id}`);
  },

  assignToYear: async (classId: string, data: {
    academic_year_id: string;
    section_name?: string | null;
    room_id?: string | null;
    capacity?: number | null;
    notes?: string | null;
  }) => {
    return apiClient.post(`/classes/${classId}/assign-to-year`, data);
  },

  bulkAssignSections: async (data: {
    class_id: string;
    academic_year_id: string;
    sections: string[];
    default_room_id?: string | null;
    default_capacity?: number | null;
  }) => {
    return apiClient.post('/classes/bulk-assign-sections', data);
  },

  updateInstance: async (id: string, data: {
    section_name?: string | null;
    room_id?: string | null;
    capacity?: number | null;
    teacher_id?: string | null;
    is_active?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.put(`/classes/academic-years/${id}`, data);
  },

  removeFromYear: async (id: string) => {
    return apiClient.delete(`/classes/academic-years/${id}`);
  },

  copyBetweenYears: async (data: {
    from_academic_year_id: string;
    to_academic_year_id: string;
    class_instance_ids: string[];
    copy_assignments?: boolean;
  }) => {
    return apiClient.post('/classes/copy-between-years', data);
  },

  getAcademicYears: async (classId: string) => {
    return apiClient.get(`/classes/${classId}/academic-years`);
  },

  getByAcademicYear: async (academicYearId: string, organizationId?: string) => {
    return apiClient.get('/classes/academic-years', {
      academic_year_id: academicYearId,
      organization_id: organizationId,
    });
  },
};

// Class Academic Years API
export const classAcademicYearsApi = {
  get: async (id: string) => {
    return apiClient.get(`/class-academic-years/${id}`);
  },
};

// Academic Years API
export const academicYearsApi = {
  list: async (params?: {
    organization_id?: string;
    is_current?: boolean;
  }) => {
    return apiClient.get('/academic-years', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/academic-years/${id}`);
  },

  create: async (data: {
    name: string;
    start_date: string;
    end_date: string;
    is_current?: boolean;
    description?: string | null;
    status?: string;
    organization_id?: string | null;
  }) => {
    return apiClient.post('/academic-years', data);
  },

  update: async (id: string, data: {
    name?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description?: string | null;
    status?: string;
    organization_id?: string | null;
  }) => {
    return apiClient.put(`/academic-years/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/academic-years/${id}`);
  },

  setCurrent: async (id: string) => {
    return apiClient.put(`/academic-years/${id}`, { is_current: true });
  },
};

export const buildingsApi = {
  list: async (params?: {
    school_id?: string;
    organization_id?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/buildings', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/buildings/${id}`);
  },

  create: async (data: {
    building_name: string;
    school_id: string;
  }) => {
    return apiClient.post('/buildings', data);
  },

  update: async (id: string, data: {
    building_name?: string;
    school_id?: string;
  }) => {
    return apiClient.put(`/buildings/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/buildings/${id}`);
  },
};

export const roomsApi = {
  list: async (params?: {
    school_id?: string;
    building_id?: string;
    organization_id?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/rooms', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/rooms/${id}`);
  },

  create: async (data: {
    room_number: string;
    building_id: string;
    staff_id?: string | null;
  }) => {
    return apiClient.post('/rooms', data);
  },

  update: async (id: string, data: {
    room_number?: string;
    building_id?: string;
    staff_id?: string | null;
  }) => {
    return apiClient.put(`/rooms/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/rooms/${id}`);
  },
};

export const hostelApi = {
  overview: async (params?: { organization_id?: string }) => {
    return apiClient.get('/hostel/overview', params);
  },
};

// Residency Types API
export const residencyTypesApi = {
  list: async (params?: {
    organization_id?: string;
  }) => {
    return apiClient.get('/residency-types', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/residency-types/${id}`);
  },

  create: async (data: {
    name: string;
    code: string;
    description?: string | null;
    is_active?: boolean;
    organization_id?: string | null;
  }) => {
    return apiClient.post('/residency-types', data);
  },

  update: async (id: string, data: {
    name?: string;
    code?: string;
    description?: string | null;
    is_active?: boolean;
    organization_id?: string | null;
  }) => {
    return apiClient.put(`/residency-types/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/residency-types/${id}`);
  },
};

export const assetsApi = {
  list: async (params?: {
    status?: string | string[];
    school_id?: string;
    building_id?: string;
    room_id?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/assets', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/assets/${id}`);
  },

  create: async (data: {
    name: string;
    asset_tag: string;
    category?: string | null;
    category_id?: string | null;
    serial_number?: string | null;
    purchase_date?: string | null;
    purchase_price?: number | null;
    status?: string;
    condition?: string | null;
    vendor?: string | null;
    warranty_expiry?: string | null;
    location_notes?: string | null;
    notes?: string | null;
    school_id?: string | null;
    building_id?: string | null;
    room_id?: string | null;
  }) => {
    return apiClient.post('/assets', data);
  },

  update: async (id: string, data: any) => {
    return apiClient.put(`/assets/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/assets/${id}`);
  },

  stats: async () => {
    return apiClient.get('/assets/stats');
  },

  history: async (id: string) => {
    return apiClient.get(`/assets/${id}/history`);
  },

  listAssignments: async (assetId: string) => {
    return apiClient.get(`/assets/${assetId}/assignments`);
  },

  createAssignment: async (
    assetId: string,
    data: {
      assigned_to_type: string;
      assigned_to_id?: string | null;
      assigned_on?: string | null;
      expected_return_date?: string | null;
      notes?: string | null;
    }
  ) => {
    return apiClient.post(`/assets/${assetId}/assignments`, data);
  },

  updateAssignment: async (id: string, data: any) => {
    return apiClient.put(`/asset-assignments/${id}`, data);
  },

  deleteAssignment: async (id: string) => {
    return apiClient.delete(`/asset-assignments/${id}`);
  },

  listMaintenance: async (assetId: string) => {
    return apiClient.get(`/assets/${assetId}/maintenance`);
  },

  createMaintenance: async (
    assetId: string,
    data: {
      maintenance_type?: string | null;
      status?: string;
      performed_on?: string | null;
      next_due_date?: string | null;
      cost?: number | null;
      vendor?: string | null;
      notes?: string | null;
    }
  ) => {
    return apiClient.post(`/assets/${assetId}/maintenance`, data);
  },

  updateMaintenance: async (id: string, data: any) => {
    return apiClient.put(`/asset-maintenance/${id}`, data);
  },

  deleteMaintenance: async (id: string) => {
    return apiClient.delete(`/asset-maintenance/${id}`);
  },
};

// Report Templates API
export const reportTemplatesApi = {
  list: async (params?: {
    schoolId?: string;
  }) => {
    const queryParams: Record<string, any> = {};
    if (params?.schoolId) {
      queryParams.school_id = params.schoolId;
    }
    return apiClient.get('/report-templates', queryParams);
  },

  get: async (id: string) => {
    return apiClient.get(`/report-templates/${id}`);
  },

  create: async (data: {
    template_name: string;
    template_type: string;
    school_id: string;
    header_text?: string | null;
    header_text_position?: string | null;
    footer_text?: string | null;
    footer_text_position?: string | null;
    header_html?: string | null;
    footer_html?: string | null;
    report_logo_selection?: string | null;
    show_primary_logo?: boolean;
    show_secondary_logo?: boolean;
    show_ministry_logo?: boolean;
    primary_logo_position?: string | null;
    secondary_logo_position?: string | null;
    ministry_logo_position?: string | null;
    show_page_numbers?: boolean;
    show_generation_date?: boolean;
    table_alternating_colors?: boolean;
    report_font_size?: string | null;
    is_default?: boolean;
    is_active?: boolean;
  }) => {
    return apiClient.post('/report-templates', data);
  },

  update: async (id: string, data: {
    template_name?: string;
    template_type?: string;
    school_id?: string;
    header_text?: string | null;
    header_text_position?: string | null;
    footer_text?: string | null;
    footer_text_position?: string | null;
    header_html?: string | null;
    footer_html?: string | null;
    report_logo_selection?: string | null;
    show_primary_logo?: boolean;
    show_secondary_logo?: boolean;
    show_ministry_logo?: boolean;
    primary_logo_position?: string | null;
    secondary_logo_position?: string | null;
    ministry_logo_position?: string | null;
    show_page_numbers?: boolean;
    show_generation_date?: boolean;
    table_alternating_colors?: boolean;
    report_font_size?: string | null;
    is_default?: boolean;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/report-templates/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/report-templates/${id}`);
  },

  bySchool: async (schoolId: string) => {
    return apiClient.get(`/report-templates/school/${schoolId}`);
  },
};

// Students API
export const studentsApi = {
  list: async (params?: {
    organization_id?: string;
    school_id?: string;
    student_status?: string;
    gender?: string;
    is_orphan?: boolean;
    admission_fee_status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/students', params);
  },

  exportReport: async (params: {
    format: 'csv' | 'pdf' | 'xlsx';
    organization_id?: string;
    school_id?: string;
    student_status?: string;
    gender?: string;
    is_orphan?: boolean;
    admission_fee_status?: string;
    search?: string;
  }) => {
    return apiClient.requestFile('/students/report/export', { method: 'GET', params });
  },

  get: async (id: string) => {
    return apiClient.get(`/students/${id}`);
  },

  create: async (data: {
    admission_no: string;
    full_name: string;
    father_name: string;
    gender: string;
    organization_id?: string | null;
    school_id?: string | null;
    card_number?: string | null;
    grandfather_name?: string | null;
    mother_name?: string | null;
    birth_year?: string | null;
    birth_date?: string | null;
    age?: number | null;
    admission_year?: string | null;
    orig_province?: string | null;
    orig_district?: string | null;
    orig_village?: string | null;
    curr_province?: string | null;
    curr_district?: string | null;
    curr_village?: string | null;
    nationality?: string | null;
    preferred_language?: string | null;
    previous_school?: string | null;
    guardian_name?: string | null;
    guardian_relation?: string | null;
    guardian_phone?: string | null;
    guardian_tazkira?: string | null;
    guardian_picture_path?: string | null;
    home_address?: string | null;
    zamin_name?: string | null;
    zamin_phone?: string | null;
    zamin_tazkira?: string | null;
    zamin_address?: string | null;
    applying_grade?: string | null;
    is_orphan?: boolean;
    admission_fee_status?: string;
    student_status?: string;
    disability_status?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    family_income?: string | null;
    picture_path?: string | null;
  }) => {
    return apiClient.post('/students', data);
  },

  update: async (id: string, data: {
    admission_no?: string;
    full_name?: string;
    father_name?: string;
    gender?: string;
    school_id?: string | null;
    card_number?: string | null;
    grandfather_name?: string | null;
    mother_name?: string | null;
    birth_year?: string | null;
    birth_date?: string | null;
    age?: number | null;
    admission_year?: string | null;
    orig_province?: string | null;
    orig_district?: string | null;
    orig_village?: string | null;
    curr_province?: string | null;
    curr_district?: string | null;
    curr_village?: string | null;
    nationality?: string | null;
    preferred_language?: string | null;
    previous_school?: string | null;
    guardian_name?: string | null;
    guardian_relation?: string | null;
    guardian_phone?: string | null;
    guardian_tazkira?: string | null;
    guardian_picture_path?: string | null;
    home_address?: string | null;
    zamin_name?: string | null;
    zamin_phone?: string | null;
    zamin_tazkira?: string | null;
    zamin_address?: string | null;
    applying_grade?: string | null;
    is_orphan?: boolean;
    admission_fee_status?: string;
    student_status?: string;
    disability_status?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    family_income?: string | null;
    picture_path?: string | null;
  }) => {
    return apiClient.put(`/students/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/students/${id}`);
  },

  stats: async (params?: {
    organization_id?: string;
  }) => {
    return apiClient.get('/students/stats', params);
  },

  autocomplete: async () => {
    return apiClient.get('/students/autocomplete');
  },

  checkDuplicates: async (data: {
    full_name: string;
    father_name: string;
    tazkira_number?: string | null;
    card_number?: string | null;
    admission_no?: string | null;
  }) => {
    return apiClient.post('/students/check-duplicates', data);
  },

  uploadPicture: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/students/${id}/picture`, formData, {
      headers: {}, // Let browser set Content-Type with boundary
    });
  },
};

// Student Documents API
export const studentDocumentsApi = {
  list: async (studentId: string) => {
    return apiClient.get(`/students/${studentId}/documents`);
  },

  create: async (studentId: string, file: File, documentType: string, description?: string | null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    if (description) {
      formData.append('description', description);
    }
    return apiClient.post(`/students/${studentId}/documents`, formData, {
      headers: {}, // Let browser set Content-Type with boundary
    });
  },

  delete: async (id: string) => {
    return apiClient.delete(`/student-documents/${id}`);
  },
};

// Student Educational History API
export const studentEducationalHistoryApi = {
  list: async (studentId: string) => {
    return apiClient.get(`/students/${studentId}/educational-history`);
  },

  create: async (studentId: string, data: {
    institution_name: string;
    school_id?: string | null;
    academic_year?: string | null;
    grade_level?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    achievements?: string | null;
    notes?: string | null;
  }) => {
    return apiClient.post(`/students/${studentId}/educational-history`, data);
  },

  update: async (id: string, data: {
    institution_name?: string;
    school_id?: string | null;
    academic_year?: string | null;
    grade_level?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    achievements?: string | null;
    notes?: string | null;
  }) => {
    return apiClient.put(`/student-educational-history/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/student-educational-history/${id}`);
  },
};

// Student Discipline Records API
export const studentDisciplineRecordsApi = {
  list: async (studentId: string) => {
    return apiClient.get(`/students/${studentId}/discipline-records`);
  },

  create: async (studentId: string, data: {
    incident_date: string;
    incident_type: string;
    school_id?: string | null;
    description?: string | null;
    severity?: string;
    action_taken?: string | null;
    resolved?: boolean;
    resolved_date?: string | null;
  }) => {
    return apiClient.post(`/students/${studentId}/discipline-records`, data);
  },

  update: async (id: string, data: {
    incident_date?: string;
    incident_type?: string;
    school_id?: string | null;
    description?: string | null;
    severity?: string;
    action_taken?: string | null;
    resolved?: boolean;
    resolved_date?: string | null;
  }) => {
    return apiClient.put(`/student-discipline-records/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/student-discipline-records/${id}`);
  },

  resolve: async (id: string) => {
    return apiClient.post(`/student-discipline-records/${id}/resolve`);
  },
};

// Student Admissions API
export const studentAdmissionsApi = {
  list: async (params?: {
    organization_id?: string;
    student_id?: string;
    academic_year_id?: string;
    class_id?: string;
    enrollment_status?: string;
    is_boarder?: boolean;
    residency_type_id?: string;
    school_id?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/student-admissions', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/student-admissions/${id}`);
  },

  create: async (data: {
    student_id: string;
    organization_id?: string | null;
    school_id?: string | null;
    academic_year_id?: string | null;
    class_id?: string | null;
    class_academic_year_id?: string | null;
    residency_type_id?: string | null;
    room_id?: string | null;
    admission_year?: string | null;
    admission_date?: string;
    enrollment_status?: string;
    enrollment_type?: string | null;
    shift?: string | null;
    is_boarder?: boolean;
    fee_status?: string | null;
    placement_notes?: string | null;
  }) => {
    return apiClient.post('/student-admissions', data);
  },

  update: async (id: string, data: {
    student_id?: string;
    school_id?: string | null;
    academic_year_id?: string | null;
    class_id?: string | null;
    class_academic_year_id?: string | null;
    residency_type_id?: string | null;
    room_id?: string | null;
    admission_year?: string | null;
    admission_date?: string;
    enrollment_status?: string;
    enrollment_type?: string | null;
    shift?: string | null;
    is_boarder?: boolean;
    fee_status?: string | null;
    placement_notes?: string | null;
  }) => {
    return apiClient.put(`/student-admissions/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/student-admissions/${id}`);
  },

  stats: async (params?: {
    organization_id?: string;
  }) => {
    return apiClient.get('/student-admissions/stats', params);
  },

  report: async (params?: {
    organization_id?: string;
    school_id?: string;
    academic_year_id?: string;
    class_id?: string;
    enrollment_status?: string;
    residency_type_id?: string;
    is_boarder?: boolean;
    from_date?: string;
    to_date?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/student-admissions/report', params);
  },

  bulkDeactivate: async (data: {
    admission_ids: string[];
  }) => {
    return apiClient.post('/student-admissions/bulk-deactivate', data);
  },

  bulkDeactivateByStudentIds: async (data: {
    student_ids: string[];
    class_id: string;
    academic_year_id: string;
  }) => {
    return apiClient.post('/student-admissions/bulk-deactivate-by-student-ids', data);
  },
};

// Teacher Subject Assignments API
export const teacherSubjectAssignmentsApi = {
  list: async (params?: {
    organization_id?: string;
    teacher_id?: string;
    academic_year_id?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/teacher-subject-assignments', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/teacher-subject-assignments/${id}`);
  },

  create: async (data: {
    teacher_id: string;
    class_academic_year_id: string;
    subject_id: string;
    schedule_slot_ids: string[];
    school_id?: string | null;
    academic_year_id?: string | null;
    organization_id?: string;
    is_active?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.post('/teacher-subject-assignments', data);
  },

  update: async (id: string, data: {
    schedule_slot_ids?: string[];
    is_active?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.put(`/teacher-subject-assignments/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/teacher-subject-assignments/${id}`);
  },
};

// Schedule Slots API
export const scheduleSlotsApi = {
  list: async (params?: {
    organization_id?: string;
    academic_year_id?: string;
  }) => {
    return apiClient.get('/schedule-slots', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/schedule-slots/${id}`);
  },

  create: async (data: {
    name: string;
    code: string;
    start_time: string;
    end_time: string;
    days_of_week?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
    default_duration_minutes?: number;
    academic_year_id?: string | null;
    school_id?: string | null;
    sort_order?: number;
    is_active?: boolean;
    description?: string | null;
    organization_id?: string | null;
  }) => {
    return apiClient.post('/schedule-slots', data);
  },

  update: async (id: string, data: {
    name?: string;
    code?: string;
    start_time?: string;
    end_time?: string;
    days_of_week?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
    default_duration_minutes?: number;
    academic_year_id?: string | null;
    school_id?: string | null;
    sort_order?: number;
    is_active?: boolean;
    description?: string | null;
    organization_id?: string | null;
  }) => {
    return apiClient.put(`/schedule-slots/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/schedule-slots/${id}`);
  },
};

// Timetables API
export const timetablesApi = {
  list: async (params?: {
    organization_id?: string;
    academic_year_id?: string;
  }) => {
    return apiClient.get('/timetables', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/timetables/${id}`);
  },

  create: async (data: {
    name: string;
    timetable_type?: string;
    description?: string | null;
    organization_id?: string | null;
    academic_year_id?: string | null;
    school_id?: string | null;
    is_active?: boolean;
    entries: Array<{
      class_academic_year_id: string;
      subject_id: string;
      teacher_id: string;
      schedule_slot_id: string;
      day_name: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'all_year';
      period_order: number;
    }>;
  }) => {
    return apiClient.post('/timetables', data);
  },

  update: async (id: string, data: {
    name?: string;
    timetable_type?: string;
    description?: string | null;
    academic_year_id?: string | null;
    school_id?: string | null;
    is_active?: boolean;
    organization_id?: string | null;
  }) => {
    return apiClient.put(`/timetables/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/timetables/${id}`);
  },

  entries: async (id: string) => {
    return apiClient.get(`/timetables/${id}/entries`);
  },
};

// Teacher Timetable Preferences API
export const teacherTimetablePreferencesApi = {
  list: async (params?: {
    organization_id?: string;
    teacher_id?: string;
    academic_year_id?: string;
  }) => {
    return apiClient.get('/teacher-timetable-preferences', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/teacher-timetable-preferences/${id}`);
  },

  create: async (data: {
    teacher_id: string;
    schedule_slot_ids: string[];
    organization_id?: string | null;
    academic_year_id?: string | null;
    is_active?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.post('/teacher-timetable-preferences', data);
  },

  update: async (id: string, data: {
    schedule_slot_ids?: string[];
    is_active?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.put(`/teacher-timetable-preferences/${id}`, data);
  },

  upsert: async (data: {
    teacher_id: string;
    schedule_slot_ids: string[];
    organization_id?: string | null;
    academic_year_id?: string | null;
    is_active?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.post('/teacher-timetable-preferences/upsert', data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/teacher-timetable-preferences/${id}`);
  },
};

// Subjects API
export const subjectsApi = {
  list: async (params?: {
    organization_id?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/subjects', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/subjects/${id}`);
  },

  create: async (data: {
    name: string;
    code: string;
    description?: string | null;
    is_active?: boolean;
    organization_id?: string | null;
  }) => {
    return apiClient.post('/subjects', data);
  },

  update: async (id: string, data: {
    name?: string;
    code?: string;
    description?: string | null;
    is_active?: boolean;
    organization_id?: string | null;
  }) => {
    return apiClient.put(`/subjects/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/subjects/${id}`);
  },
};

// Class Subject Templates API
export const classSubjectTemplatesApi = {
  list: async (params?: {
    class_id?: string;
    organization_id?: string;
  }) => {
    return apiClient.get('/class-subject-templates', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/class-subject-templates/${id}`);
  },

  create: async (data: {
    class_id: string;
    subject_id: string;
    organization_id?: string | null;
    is_required?: boolean;
    credits?: number | null;
    hours_per_week?: number | null;
  }) => {
    return apiClient.post('/class-subject-templates', data);
  },

  update: async (id: string, data: {
    is_required?: boolean;
    credits?: number | null;
    hours_per_week?: number | null;
  }) => {
    return apiClient.put(`/class-subject-templates/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/class-subject-templates/${id}`);
  },
};

// Class Subjects API
export const classSubjectsApi = {
  list: async (params?: {
    class_academic_year_id?: string;
    subject_id?: string;
    organization_id?: string;
  }) => {
    return apiClient.get('/class-subjects', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/class-subjects/${id}`);
  },

  create: async (data: {
    class_subject_template_id?: string | null;
    class_academic_year_id: string;
    subject_id: string;
    organization_id?: string | null;
    teacher_id?: string | null;
    room_id?: string | null;
    credits?: number | null;
    hours_per_week?: number | null;
    is_required?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.post('/class-subjects', data);
  },

  update: async (id: string, data: {
    teacher_id?: string | null;
    room_id?: string | null;
    credits?: number | null;
    hours_per_week?: number | null;
    is_required?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.put(`/class-subjects/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/class-subjects/${id}`);
  },
};

// Attendance Sessions API
export const attendanceSessionsApi = {
  list: async (params?: {
    class_id?: string;
    method?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    school_id?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/attendance-sessions', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/attendance-sessions/${id}`);
  },

  create: async (data: any) => {
    return apiClient.post('/attendance-sessions', data);
  },

  update: async (id: string, data: any) => {
    return apiClient.put(`/attendance-sessions/${id}`, data);
  },

  markRecords: async (id: string, data: any) => {
    return apiClient.post(`/attendance-sessions/${id}/records`, data);
  },

  scan: async (id: string, data: any) => {
    return apiClient.post(`/attendance-sessions/${id}/scan`, data);
  },

  scanFeed: async (id: string, params?: { limit?: number }) => {
    return apiClient.get(`/attendance-sessions/${id}/scans`, params);
  },

  roster: async (params: { class_id?: string; class_ids?: string[]; academic_year_id?: string }) => {
    return apiClient.get('/attendance-sessions/roster', params);
  },
  close: async (id: string) => {
    return apiClient.post(`/attendance-sessions/${id}/close`);
  },
  report: async (params?: {
    organization_id?: string;
    student_id?: string;
    class_id?: string;
    class_ids?: string[];
    school_id?: string;
    academic_year_id?: string;
    date_from?: string;
    date_to?: string;
    status?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/attendance-sessions/report', params);
  },
  totalsReport: async (params?: {
    organization_id?: string;
    class_id?: string;
    class_ids?: string[];
    school_id?: string;
    academic_year_id?: string;
    date_from?: string;
    date_to?: string;
    status?: string;
  }) => {
    return apiClient.get('/attendance-sessions/totals-report', params);
  },
};

// Library Categories API
export const libraryCategoriesApi = {
  list: async (params?: { organization_id?: string }) => {
    return apiClient.get('/library-categories', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/library-categories/${id}`);
  },

  create: async (data: {
    name: string;
    code?: string | null;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
    organization_id?: string | null;
  }) => {
    return apiClient.post('/library-categories', data);
  },

  update: async (id: string, data: {
    name?: string;
    code?: string | null;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
  }) => {
    return apiClient.put(`/library-categories/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/library-categories/${id}`);
  },
};

// Asset Categories API
export const assetCategoriesApi = {
  list: async (params?: { organization_id?: string }) => {
    return apiClient.get('/asset-categories', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/asset-categories/${id}`);
  },

  create: async (data: {
    name: string;
    code?: string | null;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
    organization_id?: string | null;
  }) => {
    return apiClient.post('/asset-categories', data);
  },

  update: async (id: string, data: {
    name?: string;
    code?: string | null;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
  }) => {
    return apiClient.put(`/asset-categories/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/asset-categories/${id}`);
  },
};

// Library Books API
export const libraryBooksApi = {
  list: async (params?: { search?: string; page?: number; per_page?: number; organization_id?: string }) => {
    return apiClient.get('/library-books', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/library-books/${id}`);
  },

  create: async (data: {
    title: string;
    author?: string | null;
    isbn?: string | null;
    book_number?: string | null;
    category?: string | null;
    category_id?: string | null;
    volume?: string | null;
    description?: string | null;
    price?: number;
    default_loan_days?: number;
    initial_copies?: number;
  }) => {
    return apiClient.post('/library-books', data);
  },

  update: async (id: string, data: {
    title?: string;
    author?: string | null;
    isbn?: string | null;
    book_number?: string | null;
    category?: string | null;
    category_id?: string | null;
    volume?: string | null;
    description?: string | null;
    price?: number;
    default_loan_days?: number;
  }) => {
    return apiClient.put(`/library-books/${id}`, data);
  },

  remove: async (id: string) => {
    return apiClient.delete(`/library-books/${id}`);
  },
};

// Library Copies API
export const libraryCopiesApi = {
  create: async (data: {
    book_id: string;
    copy_code?: string | null;
    status?: string;
    acquired_at?: string | null;
  }) => {
    return apiClient.post('/library-copies', data);
  },

  update: async (id: string, data: {
    copy_code?: string | null;
    status?: string;
    acquired_at?: string | null;
  }) => {
    return apiClient.put(`/library-copies/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/library-copies/${id}`);
  },
};

// Library Loans API
export const libraryLoansApi = {
  list: async (params?: { open_only?: boolean; due_before?: string }) => {
    return apiClient.get('/library-loans', params);
  },

  create: async (data: {
    book_id: string;
    book_copy_id: string;
    student_id?: string | null;
    staff_id?: string | null;
    loan_date: string;
    due_date?: string | null;
    deposit_amount?: number;
    fee_retained?: number;
    notes?: string | null;
  }) => {
    return apiClient.post('/library-loans', data);
  },

  returnCopy: async (id: string, data?: {
    returned_at?: string | null;
    fee_retained?: number;
    refunded?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.post(`/library-loans/${id}/return`, data || {});
  },

  dueSoon: async (params?: { days?: number }) => {
    return apiClient.get('/library-loans/due-soon', params);
  },
};

// Leave Requests API
export const leaveRequestsApi = {
  list: async (params?: {
    student_id?: string;
    class_id?: string;
    school_id?: string;
    status?: string;
    month?: number;
    year?: number;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => apiClient.get('/leave-requests', params),

  get: async (id: string) => apiClient.get(`/leave-requests/${id}`),

  create: async (data: any) => apiClient.post('/leave-requests', data),

  update: async (id: string, data: any) => apiClient.put(`/leave-requests/${id}`, data),

  approve: async (id: string, data?: { approval_note?: string | null }) =>
    apiClient.post(`/leave-requests/${id}/approve`, data || {}),

  reject: async (id: string, data?: { approval_note?: string | null }) =>
    apiClient.post(`/leave-requests/${id}/reject`, data || {}),

  printData: async (id: string) => apiClient.get(`/leave-requests/${id}/print`),

  scan: async (token: string) => apiClient.get(`/leave-requests/scan/${token}`),
};
// Short-term courses API
export const shortTermCoursesApi = {
  list: async (params?: { organization_id?: string; status?: string; page?: number; per_page?: number }) =>
    apiClient.get('/short-term-courses', params),
  get: async (id: string) => apiClient.get(`/short-term-courses/${id}`),
  create: async (data: any) => apiClient.post('/short-term-courses', data),
  update: async (id: string, data: any) => apiClient.put(`/short-term-courses/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/short-term-courses/${id}`),
  close: async (id: string) => apiClient.post(`/short-term-courses/${id}/close`),
  reopen: async (id: string) => apiClient.post(`/short-term-courses/${id}/reopen`),
  stats: async (id: string) => apiClient.get(`/short-term-courses/${id}/stats`),
};

// Course students API
export const courseStudentsApi = {
  list: async (params?: { organization_id?: string; course_id?: string; status?: string; page?: number; per_page?: number }) =>
    apiClient.get('/course-students', params),
  get: async (id: string) => apiClient.get(`/course-students/${id}`),
  create: async (data: any) => apiClient.post('/course-students', data),
  update: async (id: string, data: any) => apiClient.put(`/course-students/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/course-students/${id}`),
  enrollFromMain: async (data: any) => apiClient.post('/course-students/enroll-from-main', data),
  copyToMain: async (id: string, data: any) => apiClient.post(`/course-students/${id}/copy-to-main`, data),
  markCompleted: async (id: string) => apiClient.post(`/course-students/${id}/complete`),
  markDropped: async (id: string) => apiClient.post(`/course-students/${id}/drop`),
  issueCertificate: async (id: string) => apiClient.post(`/course-students/${id}/issue-certificate`),
  enrollToNewCourse: async (id: string, data: { course_id: string; registration_date?: string; fee_paid?: boolean; fee_amount?: number }) =>
    apiClient.post(`/course-students/${id}/enroll-to-new-course`, data),
};

// Course student discipline records API
export const courseStudentDisciplineRecordsApi = {
  list: async (courseStudentId: string) => apiClient.get(`/course-students/${courseStudentId}/discipline-records`),
  create: async (courseStudentId: string, data: any) => apiClient.post(`/course-students/${courseStudentId}/discipline-records`, data),
  update: async (id: string, data: any) => apiClient.put(`/course-student-discipline-records/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/course-student-discipline-records/${id}`),
  resolve: async (id: string) => apiClient.post(`/course-student-discipline-records/${id}/resolve`),
};

// Course Attendance Sessions API
export const courseAttendanceSessionsApi = {
  list: async (params?: {
    course_id?: string;
    method?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }) => apiClient.get('/course-attendance-sessions', params),

  get: async (id: string) => apiClient.get(`/course-attendance-sessions/${id}`),

  create: async (data: {
    course_id: string;
    session_date: string;
    session_title?: string | null;
    method?: string;
    remarks?: string | null;
  }) => apiClient.post('/course-attendance-sessions', data),

  update: async (id: string, data: {
    session_date?: string;
    session_title?: string | null;
    method?: string;
    remarks?: string | null;
  }) => apiClient.put(`/course-attendance-sessions/${id}`, data),

  delete: async (id: string) => apiClient.delete(`/course-attendance-sessions/${id}`),

  roster: async (params: { course_id: string }) =>
    apiClient.get('/course-attendance-sessions/roster', params),

  markRecords: async (id: string, data: {
    records: Array<{
      course_student_id: string;
      status: 'present' | 'absent' | 'late' | 'excused' | 'sick' | 'leave';
      note?: string | null;
    }>;
  }) => apiClient.post(`/course-attendance-sessions/${id}/records`, data),

  scan: async (id: string, data: { code: string }) =>
    apiClient.post(`/course-attendance-sessions/${id}/scan`, data),

  scans: async (id: string, params?: { limit?: number }) =>
    apiClient.get(`/course-attendance-sessions/${id}/scans`, params),

  close: async (id: string) => apiClient.post(`/course-attendance-sessions/${id}/close`),

  report: async (params?: {
    course_id?: string;
    course_student_id?: string;
    date_from?: string;
    date_to?: string;
  }) => apiClient.get('/course-attendance-sessions/report', params),
};

// Course Documents API
export const courseDocumentsApi = {
  list: async (params?: {
    course_id?: string;
    course_student_id?: string;
    document_type?: string;
    page?: number;
    per_page?: number;
  }) => apiClient.get('/course-documents', params),

  get: async (id: string) => apiClient.get(`/course-documents/${id}`),

  create: async (data: FormData) => apiClient.post('/course-documents', data),

  delete: async (id: string) => apiClient.delete(`/course-documents/${id}`),

  download: async (id: string) =>
    apiClient.requestFile(`/course-documents/${id}/download`, { method: 'GET' }),
};

// Certificate Templates API
export const certificateTemplatesApi = {
  list: async (params?: { active_only?: boolean; type?: string; school_id?: string }) =>
    apiClient.get('/certificate-templates', params),

  get: async (id: string) => apiClient.get(`/certificate-templates/${id}`),

  create: async (data: FormData) => apiClient.post('/certificate-templates', data),

  update: async (id: string, data: FormData) => {
    // Laravel doesn't support PUT with FormData, use POST with _method
    data.append('_method', 'PUT');
    return apiClient.post(`/certificate-templates/${id}`, data);
  },

  delete: async (id: string) => apiClient.delete(`/certificate-templates/${id}`),

  setDefault: async (id: string) => apiClient.post(`/certificate-templates/${id}/set-default`),

  getBackgroundUrl: (id: string) => `${API_URL}/certificate-templates/${id}/background`,

  getBackgroundImage: async (endpoint: string) => {
    // Extract the path from the endpoint (remove /api prefix if present)
    const path = endpoint.startsWith('/api') ? endpoint.replace('/api', '') : endpoint;
    return apiClient.requestFile(path, { method: 'GET' });
  },

  generateCertificate: async (courseStudentId: string, data: { template_id: string }) =>
    apiClient.post(`/certificate-templates/generate/${courseStudentId}`, data),

  getCertificateData: async (courseStudentId: string) =>
    apiClient.get(`/certificate-templates/certificate-data/${courseStudentId}`),
};

// ID Card Templates API
export const idCardTemplatesApi = {
  list: async (params?: { active_only?: boolean; school_id?: string }) =>
    apiClient.get('/id-card-templates', params),

  get: async (id: string) => apiClient.get(`/id-card-templates/${id}`),

  create: async (data: FormData) => apiClient.post('/id-card-templates', data),

  update: async (id: string, data: FormData) => {
    // Laravel doesn't support PUT with FormData, use POST with _method
    data.append('_method', 'PUT');
    return apiClient.post(`/id-card-templates/${id}`, data);
  },

  delete: async (id: string) => apiClient.delete(`/id-card-templates/${id}`),

  setDefault: async (id: string) => apiClient.post(`/id-card-templates/${id}/set-default`),

  getBackgroundUrl: (id: string, side: 'front' | 'back') => 
    `${API_URL}/id-card-templates/${id}/background/${side}`,

  getBackgroundImage: async (id: string, side: 'front' | 'back') => {
    return apiClient.requestFile(`/id-card-templates/${id}/background/${side}`, { method: 'GET' });
  },
};

// Translations API
export const translationsApi = {
  get: async () => apiClient.get<{
    en: Record<string, unknown>;
    ps: Record<string, unknown>;
    fa: Record<string, unknown>;
    ar: Record<string, unknown>;
  }>('/translations'),

  save: async (translations: {
    en: Record<string, unknown>;
    ps: Record<string, unknown>;
    fa: Record<string, unknown>;
    ar: Record<string, unknown>;
  }) => apiClient.post<{ message: string; languages: string[] }>('/translations', { translations }),
};
// Exam Types API
export const examTypesApi = {
  list: async (params?: {
    organization_id?: string;
    is_active?: boolean;
  }) => apiClient.get('/exam-types', params),
  get: async (id: string) => apiClient.get(`/exam-types/${id}`),
  create: async (data: {
    name: string;
    code?: string | null;
    description?: string | null;
    display_order?: number;
    is_active?: boolean;
  }) => apiClient.post('/exam-types', data),
  update: async (id: string, data: {
    name?: string;
    code?: string | null;
    description?: string | null;
    display_order?: number;
    is_active?: boolean;
  }) => apiClient.put(`/exam-types/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/exam-types/${id}`),
};

// Exams API
export const examsApi = {
  list: async (params?: {
    organization_id?: string;
    academic_year_id?: string;
    status?: string;
  }) => {
    return apiClient.get('/exams', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/exams/${id}`);
  },

  create: async (data: {
    name: string;
    academic_year_id: string;
    exam_type_id?: string | null;
    description?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: string;
  }) => {
    return apiClient.post('/exams', data);
  },

  update: async (id: string, data: {
    name?: string;
    academic_year_id?: string;
    exam_type_id?: string | null;
    description?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    status?: string;
  }) => {
    return apiClient.put(`/exams/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/exams/${id}`);
  },

  updateStatus: async (id: string, status: string) => {
    return apiClient.post(`/exams/${id}/status`, { status });
  },

  report: async (id: string) => {
    return apiClient.get(`/exams/${id}/report`);
  },

  summaryReport: async (id: string) => {
    return apiClient.get(`/exams/${id}/reports/summary`);
  },

  classReport: async (examId: string, classId: string) => {
    return apiClient.get(`/exams/${examId}/reports/classes/${classId}`);
  },

  studentReport: async (examId: string, studentId: string) => {
    return apiClient.get(`/exams/${examId}/reports/students/${studentId}`);
  },

  enrollmentStats: async (examId: string) => {
    return apiClient.get(`/exams/${examId}/enrollment-stats`);
  },

  marksProgress: async (examId: string) => {
    return apiClient.get(`/exams/${examId}/marks-progress`);
  },

  enrollAll: async (examId: string) => {
    return apiClient.post(`/exams/${examId}/enroll-all`, {});
  },

  // Exam Numbers
  studentsWithNumbers: async (examId: string, params?: { exam_class_id?: string }) => {
    return apiClient.get(`/exams/${examId}/students-with-numbers`, params);
  },

  rollNumberStartFrom: async (examId: string) => {
    return apiClient.get(`/exams/${examId}/roll-numbers/start-from`);
  },

  previewRollNumberAssignment: async (examId: string, data: {
    exam_class_id?: string;
    start_from: string;
    scope: 'exam' | 'class';
    override_existing?: boolean;
  }) => {
    return apiClient.post(`/exams/${examId}/roll-numbers/preview-auto-assign`, data);
  },

  confirmRollNumberAssignment: async (examId: string, data: {
    items: Array<{ exam_student_id: string; new_roll_number: string }>;
  }) => {
    return apiClient.post(`/exams/${examId}/roll-numbers/confirm-auto-assign`, data);
  },

  updateRollNumber: async (examId: string, examStudentId: string, data: {
    exam_roll_number: string | null;
  }) => {
    return apiClient.patch(`/exams/${examId}/students/${examStudentId}/roll-number`, data);
  },

  secretNumberStartFrom: async (examId: string) => {
    return apiClient.get(`/exams/${examId}/secret-numbers/start-from`);
  },

  previewSecretNumberAssignment: async (examId: string, data: {
    exam_class_id?: string;
    start_from: string;
    scope: 'exam' | 'class';
    override_existing?: boolean;
  }) => {
    return apiClient.post(`/exams/${examId}/secret-numbers/preview-auto-assign`, data);
  },

  confirmSecretNumberAssignment: async (examId: string, data: {
    items: Array<{ exam_student_id: string; new_secret_number: string }>;
  }) => {
    return apiClient.post(`/exams/${examId}/secret-numbers/confirm-auto-assign`, data);
  },

  updateSecretNumber: async (examId: string, examStudentId: string, data: {
    exam_secret_number: string | null;
  }) => {
    return apiClient.patch(`/exams/${examId}/students/${examStudentId}/secret-number`, data);
  },

  lookupBySecretNumber: async (examId: string, secretNumber: string) => {
    return apiClient.get(`/exams/${examId}/secret-numbers/lookup`, { secret_number: secretNumber });
  },

  rollNumberReport: async (examId: string, params?: { exam_class_id?: string }) => {
    return apiClient.get(`/exams/${examId}/reports/roll-numbers`, params);
  },

  rollSlipsHtml: async (examId: string, params?: { exam_class_id?: string }) => {
    return apiClient.get(`/exams/${examId}/reports/roll-slips`, params);
  },

  secretLabelsHtml: async (examId: string, params?: { exam_class_id?: string; subject_id?: string }) => {
    return apiClient.get(`/exams/${examId}/reports/secret-labels`, params);
  },

  // New Report Methods
  consolidatedClassReport: async (examId: string, classId: string) => {
    return apiClient.get(`/exams/${examId}/reports/classes/${classId}/consolidated`);
  },

  classSubjectMarkSheet: async (
    examId: string,
    classId: string,
    subjectId: string,
    params?: {
      sort_by?: 'roll' | 'marks' | 'father_name';
      sort_order?: 'asc' | 'desc';
      show_secret_number?: boolean;
      show_rank?: boolean;
    }
  ) => {
    return apiClient.get(`/exams/${examId}/reports/classes/${classId}/subjects/${subjectId}`, params);
  },
};

// Exam Classes API
export const examClassesApi = {
  list: async (params?: { exam_id?: string }) => {
    return apiClient.get('/exam-classes', params);
  },

  create: async (data: { exam_id: string; class_academic_year_id: string }) => {
    return apiClient.post('/exam-classes', data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/exam-classes/${id}`);
  },
};

// Exam Times (Timetable) API
export const examTimesApi = {
  list: async (examId: string, params?: {
    exam_class_id?: string;
    date?: string;
    room_id?: string;
  }) => {
    return apiClient.get(`/exams/${examId}/times`, params);
  },

  create: async (examId: string, data: {
    exam_class_id: string;
    exam_subject_id: string;
    date: string;
    start_time: string;
    end_time: string;
    room_id?: string | null;
    invigilator_id?: string | null;
    notes?: string | null;
  }) => {
    return apiClient.post(`/exams/${examId}/times`, data);
  },

  update: async (id: string, data: {
    date?: string;
    start_time?: string;
    end_time?: string;
    room_id?: string | null;
    invigilator_id?: string | null;
    notes?: string | null;
    is_locked?: boolean;
  }) => {
    return apiClient.put(`/exam-times/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/exam-times/${id}`);
  },

  toggleLock: async (id: string) => {
    return apiClient.post(`/exam-times/${id}/toggle-lock`, {});
  },
};

// Exam Subjects API
export const examSubjectsApi = {
  list: async (params?: { exam_id?: string; exam_class_id?: string }) => {
    return apiClient.get('/exam-subjects', params);
  },

  create: async (data: {
    exam_id: string;
    exam_class_id: string;
    class_subject_id: string;
    total_marks?: number | null;
    passing_marks?: number | null;
    scheduled_at?: string | null;
  }) => {
    return apiClient.post('/exam-subjects', data);
  },

  update: async (
    id: string,
    data: {
      total_marks?: number | null;
      passing_marks?: number | null;
      scheduled_at?: string | null;
    }
  ) => {
    return apiClient.put(`/exam-subjects/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/exam-subjects/${id}`);
  },
};

// Exam Students API
export const examStudentsApi = {
  list: async (params?: { exam_id?: string; exam_class_id?: string }) => {
    return apiClient.get('/exam-students', params);
  },

  create: async (data: {
    exam_id: string;
    exam_class_id: string;
    student_admission_id: string;
  }) => {
    return apiClient.post('/exam-students', data);
  },

  bulkEnroll: async (data: {
    exam_id: string;
    exam_class_id: string;
  }) => {
    return apiClient.post('/exam-students/bulk-enroll', data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/exam-students/${id}`);
  },
};

// Exam Results API
export const examResultsApi = {
  list: async (params?: {
    exam_id?: string;
    exam_subject_id?: string;
    exam_student_id?: string;
  }) => {
    return apiClient.get('/exam-results', params);
  },

  create: async (data: {
    exam_id: string;
    exam_subject_id: string;
    exam_student_id: string;
    marks_obtained?: number | null;
    is_absent?: boolean;
    remarks?: string | null;
  }) => {
    return apiClient.post('/exam-results', data);
  },

  bulkStore: async (data: {
    exam_id: string;
    exam_subject_id: string;
    results: Array<{
      exam_student_id: string;
      marks_obtained?: number | null;
      is_absent?: boolean;
      remarks?: string | null;
    }>;
  }) => {
    return apiClient.post('/exam-results/bulk-store', data);
  },

  update: async (
    id: string,
    data: {
      marks_obtained?: number | null;
      is_absent?: boolean;
      remarks?: string | null;
    }
  ) => {
    return apiClient.put(`/exam-results/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/exam-results/${id}`);
  },
};

// Exam Attendance API
export const examAttendanceApi = {
  list: async (examId: string, params?: {
    exam_class_id?: string;
    exam_time_id?: string;
    exam_subject_id?: string;
    status?: string;
    date?: string;
  }) => {
    return apiClient.get(`/exams/${examId}/attendance`, params);
  },

  byClass: async (examId: string, classId: string) => {
    return apiClient.get(`/exams/${examId}/attendance/class/${classId}`);
  },

  byTimeslot: async (examId: string, examTimeId: string) => {
    return apiClient.get(`/exams/${examId}/attendance/timeslot/${examTimeId}`);
  },

  getTimeslotStudents: async (examId: string, examTimeId: string) => {
    return apiClient.get(`/exams/${examId}/attendance/timeslot/${examTimeId}/students`);
  },

  timeslotSummary: async (examId: string, examTimeId: string) => {
    return apiClient.get(`/exams/${examId}/attendance/timeslot/${examTimeId}/summary`);
  },

  studentReport: async (examId: string, studentId: string) => {
    return apiClient.get(`/exams/${examId}/attendance/students/${studentId}`);
  },

  summary: async (examId: string) => {
    return apiClient.get(`/exams/${examId}/attendance/summary`);
  },

  mark: async (examId: string, data: {
    exam_time_id: string;
    attendances: Array<{
      student_id: string;
      status: 'present' | 'absent' | 'late' | 'excused';
      checked_in_at?: string | null;
      seat_number?: string | null;
      notes?: string | null;
    }>;
  }) => {
    return apiClient.post(`/exams/${examId}/attendance/mark`, data);
  },

  scan: async (examId: string, data: {
    exam_time_id: string;
    roll_number: string;
    status?: 'present' | 'absent' | 'late' | 'excused';
    notes?: string | null;
  }) => {
    return apiClient.post(`/exams/${examId}/attendance/scan`, data);
  },

  scanFeed: async (examId: string, examTimeId: string, params?: { limit?: number }) => {
    return apiClient.get(`/exams/${examId}/attendance/timeslot/${examTimeId}/scans`, params);
  },

  update: async (id: string, data: {
    status?: 'present' | 'absent' | 'late' | 'excused';
    checked_in_at?: string | null;
    seat_number?: string | null;
    notes?: string | null;
  }) => {
    return apiClient.put(`/exam-attendance/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/exam-attendance/${id}`);
  },
};

// Grades API
export const gradesApi = {
  list: async (params?: { organization_id?: string }) => {
    return apiClient.get('/grades', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/grades/${id}`);
  },

  create: async (data: {
    name_en: string;
    name_ar: string;
    name_ps: string;
    name_fa: string;
    min_percentage: number;
    max_percentage: number;
    order: number;
    is_pass: boolean;
  }) => {
    return apiClient.post('/grades', data);
  },

  update: async (id: string, data: {
    name_en?: string;
    name_ar?: string;
    name_ps?: string;
    name_fa?: string;
    min_percentage?: number;
    max_percentage?: number;
    order?: number;
    is_pass?: boolean;
  }) => {
    return apiClient.put(`/grades/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/grades/${id}`);
  },
};


// ============================================
// Finance Module APIs
// ============================================

// Finance Accounts API
export const financeAccountsApi = {
  list: async (params?: { school_id?: string; type?: string; is_active?: boolean }) =>
    apiClient.get('/finance-accounts', params),
  get: async (id: string) => apiClient.get(`/finance-accounts/${id}`),
  create: async (data: any) => apiClient.post('/finance-accounts', data),
  update: async (id: string, data: any) => apiClient.put(`/finance-accounts/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/finance-accounts/${id}`),
};

// Income Categories API
export const incomeCategoriesApi = {
  list: async (params?: { school_id?: string; is_active?: boolean }) =>
    apiClient.get('/income-categories', params),
  get: async (id: string) => apiClient.get(`/income-categories/${id}`),
  create: async (data: any) => apiClient.post('/income-categories', data),
  update: async (id: string, data: any) => apiClient.put(`/income-categories/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/income-categories/${id}`),
};

// Expense Categories API
export const expenseCategoriesApi = {
  list: async (params?: { school_id?: string; is_active?: boolean }) =>
    apiClient.get('/expense-categories', params),
  get: async (id: string) => apiClient.get(`/expense-categories/${id}`),
  create: async (data: any) => apiClient.post('/expense-categories', data),
  update: async (id: string, data: any) => apiClient.put(`/expense-categories/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/expense-categories/${id}`),
};

// Finance Projects API
export const financeProjectsApi = {
  list: async (params?: { school_id?: string; status?: string; is_active?: boolean }) =>
    apiClient.get('/finance-projects', params),
  get: async (id: string) => apiClient.get(`/finance-projects/${id}`),
  create: async (data: any) => apiClient.post('/finance-projects', data),
  update: async (id: string, data: any) => apiClient.put(`/finance-projects/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/finance-projects/${id}`),
  summary: async (id: string) => apiClient.get(`/finance-projects/${id}/summary`),
};

// Donors API
export const donorsApi = {
  list: async (params?: { type?: string; is_active?: boolean; search?: string }) =>
    apiClient.get('/donors', params),
  get: async (id: string) => apiClient.get(`/donors/${id}`),
  create: async (data: any) => apiClient.post('/donors', data),
  update: async (id: string, data: any) => apiClient.put(`/donors/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/donors/${id}`),
  summary: async (id: string, params?: { start_date?: string; end_date?: string }) =>
    apiClient.get(`/donors/${id}/summary`, params),
};

// Income Entries API
export const incomeEntriesApi = {
  list: async (params?: {
    school_id?: string;
    account_id?: string;
    income_category_id?: string;
    project_id?: string;
    donor_id?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => apiClient.get('/income-entries', params),
  get: async (id: string) => apiClient.get(`/income-entries/${id}`),
  create: async (data: any) => apiClient.post('/income-entries', data),
  update: async (id: string, data: any) => apiClient.put(`/income-entries/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/income-entries/${id}`),
};

// Expense Entries API
export const expenseEntriesApi = {
  list: async (params?: {
    school_id?: string;
    account_id?: string;
    expense_category_id?: string;
    project_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => apiClient.get('/expense-entries', params),
  get: async (id: string) => apiClient.get(`/expense-entries/${id}`),
  create: async (data: any) => apiClient.post('/expense-entries', data),
  update: async (id: string, data: any) => apiClient.put(`/expense-entries/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/expense-entries/${id}`),
};

// Currencies API
export const currenciesApi = {
  list: async (params?: { is_active?: boolean; is_base?: boolean }) =>
    apiClient.get('/currencies', params),
  get: async (id: string) => apiClient.get(`/currencies/${id}`),
  create: async (data: any) => apiClient.post('/currencies', data),
  update: async (id: string, data: any) => apiClient.put(`/currencies/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/currencies/${id}`),
};

// Exchange Rates API
export const exchangeRatesApi = {
  list: async (params?: {
    from_currency_id?: string;
    to_currency_id?: string;
    effective_date?: string;
    is_active?: boolean;
  }) => apiClient.get('/exchange-rates', params),
  get: async (id: string) => apiClient.get(`/exchange-rates/${id}`),
  create: async (data: any) => apiClient.post('/exchange-rates', data),
  update: async (id: string, data: any) => apiClient.put(`/exchange-rates/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/exchange-rates/${id}`),
  convert: async (data: { from_currency_id: string; to_currency_id: string; amount: number; date?: string }) =>
    apiClient.post('/exchange-rates/convert', data),
};

// Finance Reports API
export const financeReportsApi = {
  dashboard: async () => apiClient.get('/finance/dashboard'),
  dailyCashbook: async (params: { date: string; account_id?: string }) =>
    apiClient.get('/finance/reports/daily-cashbook', params),
  incomeVsExpense: async (params: { start_date: string; end_date: string; school_id?: string }) =>
    apiClient.get('/finance/reports/income-vs-expense', params),
  projectSummary: async (params?: { status?: string }) =>
    apiClient.get('/finance/reports/project-summary', params),
  donorSummary: async (params?: { start_date?: string; end_date?: string }) =>
    apiClient.get('/finance/reports/donor-summary', params),
  accountBalances: async () => apiClient.get('/finance/reports/account-balances'),
};

// Fees API
export const feeStructuresApi = {
  list: async (params?: {
    organization_id?: string;
    academic_year_id?: string;
    class_id?: string;
    class_academic_year_id?: string;
    is_active?: boolean;
  }) => apiClient.get('/fees/structures', params),
  get: async (id: string) => apiClient.get(`/fees/structures/${id}`),
  create: async (data: any) => apiClient.post('/fees/structures', data),
  update: async (id: string, data: any) => apiClient.put(`/fees/structures/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/fees/structures/${id}`),
};

export const feeAssignmentsApi = {
  list: async (params?: {
    organization_id?: string;
    student_id?: string;
    student_admission_id?: string;
    academic_year_id?: string;
    class_academic_year_id?: string;
    status?: string;
  }) => apiClient.get('/fees/assignments', params),
  create: async (data: any) => apiClient.post('/fees/assignments', data),
  update: async (id: string, data: any) => apiClient.put(`/fees/assignments/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/fees/assignments/${id}`),
};

export const feePaymentsApi = {
  list: async (params?: {
    fee_assignment_id?: string;
    student_id?: string;
    payment_date_from?: string;
    payment_date_to?: string;
  }) => apiClient.get('/fees/payments', params),
  create: async (data: any) => apiClient.post('/fees/payments', data),
};

export const feeExceptionsApi = {
  list: async (params?: {
    organization_id?: string;
    academic_year_id?: string;
    class_academic_year_id?: string;
    student_id?: string;
    fee_assignment_id?: string;
    exception_type?: string;
    is_active?: boolean;
  }) => apiClient.get('/fees/exceptions', params),
  get: async (id: string) => apiClient.get(`/fees/exceptions/${id}`),
  create: async (data: any) => apiClient.post('/fees/exceptions', data),
  update: async (id: string, data: any) => apiClient.put(`/fees/exceptions/${id}`, data),
  delete: async (id: string) => apiClient.delete(`/fees/exceptions/${id}`),
};

export const feeReportsApi = {
  dashboard: async (params?: {
    academic_year_id?: string;
    class_academic_year_id?: string;
    school_id?: string;
  }) => apiClient.get('/fees/reports/dashboard', params),
  studentFees: async (params?: {
    academic_year_id?: string;
    class_academic_year_id?: string;
    school_id?: string;
    status?: string;
    search?: string;
    page?: number;
    per_page?: number;
  }) => apiClient.get('/fees/reports/students', params),
  collectionReport: async (params?: {
    academic_year_id?: string;
    class_academic_year_id?: string;
    school_id?: string;
    start_date?: string;
    end_date?: string;
  }) => apiClient.get('/fees/reports/collection', params),
  defaulters: async (params?: {
    academic_year_id?: string;
    class_academic_year_id?: string;
    school_id?: string;
    min_amount?: number;
  }) => apiClient.get('/fees/reports/defaulters', params),
};

// Document Management System API
export const dmsApi = {
  dashboard: async () => apiClient.get('/dms/dashboard'),
  distribution: async () => apiClient.get('/dms/reports/distribution'),
  archive: async (params?: Record<string, any>) => apiClient.get('/dms/archive', params),

  incoming: {
    list: async (params?: Record<string, any>) => apiClient.get('/dms/incoming', params),
    get: async (id: string) => apiClient.get(`/dms/incoming/${id}`),
    create: async (data: any) => apiClient.post('/dms/incoming', data),
    update: async (id: string, data: any) => apiClient.put(`/dms/incoming/${id}`, data),
    delete: async (id: string) => apiClient.delete(`/dms/incoming/${id}`),
  },

  outgoing: {
    list: async (params?: Record<string, any>) => apiClient.get('/dms/outgoing', params),
    get: async (id: string) => apiClient.get(`/dms/outgoing/${id}`),
    create: async (data: any) => apiClient.post('/dms/outgoing', data),
    update: async (id: string, data: any) => apiClient.put(`/dms/outgoing/${id}`, data),
    delete: async (id: string) => apiClient.delete(`/dms/outgoing/${id}`),
    downloadPdf: async (id: string) => apiClient.requestFile(`/dms/outgoing/${id}/pdf`, { method: 'GET' }),
  },

  templates: {
    list: async (params?: Record<string, any>) => apiClient.get('/dms/templates', params),
    get: async (id: string) => apiClient.get(`/dms/templates/${id}`),
    create: async (data: any) => apiClient.post('/dms/templates', data),
    update: async (id: string, data: any) => apiClient.put(`/dms/templates/${id}`, data),
    delete: async (id: string) => apiClient.delete(`/dms/templates/${id}`),
    duplicate: async (id: string, data?: { name?: string }) => apiClient.post(`/dms/templates/${id}/duplicate`, data || {}),
    preview: async (
      id: string,
      variables?: Record<string, string>,
      options?: { recipient_type?: string; table_payload?: any }
    ) => apiClient.post(`/dms/templates/${id}/preview`, { variables: variables || {}, ...(options || {}) }),
    previewPdf: async (
      id: string,
      variables?: Record<string, string>,
      options?: { recipient_type?: string; recipient_id?: string; table_payload?: any }
    ) => {
      const result = await apiClient.requestFile(`/dms/templates/${id}/preview-pdf`, {
        method: 'POST',
        body: JSON.stringify({ variables: variables || {}, ...(options || {}) }),
      });
      return result.blob;
    },
    previewDraft: async (payload: {
      template: Record<string, any>;
      variables?: Record<string, string>;
      recipient_type?: string;
      table_payload?: any;
    }) => apiClient.post(`/dms/templates/preview-draft`, payload),
    getAvailableFields: async (recipientType: string) => apiClient.get('/dms/templates/fields/available', { recipient_type: recipientType }),
  },

  letterheads: {
    list: async (params?: Record<string, any>) => apiClient.get('/dms/letterheads', params),
    get: async (id: string) => apiClient.get(`/dms/letterheads/${id}`),
    create: async (data: FormData) => apiClient.post('/dms/letterheads', data),
    update: async (id: string, data: FormData) => apiClient.put(`/dms/letterheads/${id}`, data),
    delete: async (id: string) => apiClient.delete(`/dms/letterheads/${id}`),
    download: async (id: string) => apiClient.requestFile(`/dms/letterheads/${id}/download`, { method: 'GET' }),
    preview: async (id: string) => apiClient.get(`/dms/letterheads/${id}/preview`),
  },

  letterTypes: {
    list: async (params?: Record<string, any>) => apiClient.get('/dms/letter-types', params),
    get: async (id: string) => apiClient.get(`/dms/letter-types/${id}`),
    create: async (data: any) => apiClient.post('/dms/letter-types', data),
    update: async (id: string, data: any) => apiClient.put(`/dms/letter-types/${id}`, data),
    delete: async (id: string) => apiClient.delete(`/dms/letter-types/${id}`),
  },

  settings: {
    get: async (params?: { school_id?: string }) => apiClient.get('/dms/settings', params),
    update: async (data: any) => apiClient.put('/dms/settings', data),
  },

  departments: {
    list: async () => apiClient.get('/dms/departments'),
    get: async (id: string) => apiClient.get(`/dms/departments/${id}`),
    create: async (data: any) => apiClient.post('/dms/departments', data),
    update: async (id: string, data: any) => apiClient.put(`/dms/departments/${id}`, data),
    delete: async (id: string) => apiClient.delete(`/dms/departments/${id}`),
    stats: async () => apiClient.get('/dms/departments/stats'),
  },

  files: {
    list: async (params: { owner_type: 'incoming' | 'outgoing'; owner_id: string }) => apiClient.get('/dms/files', params),
    upload: async (data: FormData) => apiClient.post('/dms/files', data),
    download: async (id: string) => apiClient.requestFile(`/dms/files/${id}/download`, { method: 'GET' }),
  },
};

// Question Bank API
export const questionsApi = {
  list: async (params?: {
    school_id?: string;
    subject_id?: string;
    class_academic_year_id?: string;
    type?: string;
    difficulty?: string;
    is_active?: boolean;
    search?: string;
    page?: number;
    per_page?: number;
  }) => {
    return apiClient.get('/exam/questions', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/exam/questions/${id}`);
  },

  create: async (data: {
    school_id: string;
    subject_id: string;
    class_academic_year_id?: string | null;
    type: string;
    difficulty?: string;
    marks?: number;
    text: string;
    text_rtl?: boolean;
    options?: Array<{ id: string; label?: string; text: string; is_correct?: boolean }> | null;
    correct_answer?: string | null;
    reference?: string | null;
    tags?: string[] | null;
    is_active?: boolean;
  }) => {
    return apiClient.post('/exam/questions', data);
  },

  update: async (id: string, data: {
    subject_id?: string;
    class_academic_year_id?: string | null;
    type?: string;
    difficulty?: string;
    marks?: number;
    text?: string;
    text_rtl?: boolean;
    options?: Array<{ id: string; label?: string; text: string; is_correct?: boolean }> | null;
    correct_answer?: string | null;
    reference?: string | null;
    tags?: string[] | null;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/exam/questions/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/exam/questions/${id}`);
  },

  duplicate: async (id: string) => {
    return apiClient.post(`/exam/questions/${id}/duplicate`, {});
  },

  bulkUpdate: async (data: { question_ids: string[]; is_active: boolean }) => {
    return apiClient.post('/exam/questions/bulk-update', data);
  },
};

// Exam Paper Templates API
export const examPaperTemplatesApi = {
  list: async (params?: {
    school_id?: string;
    exam_id?: string;
    exam_subject_id?: string;
    subject_id?: string;
    class_academic_year_id?: string;
    is_default?: boolean;
    is_active?: boolean;
  }) => {
    return apiClient.get('/exam/paper-templates', params);
  },

  get: async (id: string) => {
    return apiClient.get(`/exam/paper-templates/${id}`);
  },

  create: async (data: {
    school_id: string;
    exam_id?: string | null;
    exam_subject_id?: string | null;
    subject_id: string;
    class_academic_year_id?: string | null;
    title: string;
    language?: string;
    total_marks?: number | null;
    duration_minutes?: number | null;
    header_html?: string | null;
    footer_html?: string | null;
    instructions?: string | null;
    is_default_for_exam_subject?: boolean;
    is_active?: boolean;
  }) => {
    return apiClient.post('/exam/paper-templates', data);
  },

  update: async (id: string, data: {
    exam_id?: string | null;
    exam_subject_id?: string | null;
    subject_id?: string;
    class_academic_year_id?: string | null;
    title?: string;
    language?: string;
    total_marks?: number | null;
    duration_minutes?: number | null;
    header_html?: string | null;
    footer_html?: string | null;
    instructions?: string | null;
    is_default_for_exam_subject?: boolean;
    is_active?: boolean;
  }) => {
    return apiClient.put(`/exam/paper-templates/${id}`, data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/exam/paper-templates/${id}`);
  },

  duplicate: async (id: string) => {
    return apiClient.post(`/exam/paper-templates/${id}/duplicate`, {});
  },

  // Item management
  addItem: async (templateId: string, data: {
    question_id: string;
    section_label?: string | null;
    position?: number;
    marks_override?: number | null;
    is_mandatory?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.post(`/exam/paper-templates/${templateId}/items`, data);
  },

  updateItem: async (templateId: string, itemId: string, data: {
    section_label?: string | null;
    position?: number;
    marks_override?: number | null;
    is_mandatory?: boolean;
    notes?: string | null;
  }) => {
    return apiClient.put(`/exam/paper-templates/${templateId}/items/${itemId}`, data);
  },

  removeItem: async (templateId: string, itemId: string) => {
    return apiClient.delete(`/exam/paper-templates/${templateId}/items/${itemId}`);
  },

  reorderItems: async (templateId: string, items: Array<{
    id: string;
    position: number;
    section_label?: string | null;
  }>) => {
    return apiClient.post(`/exam/paper-templates/${templateId}/reorder`, { items });
  },

  // Exam paper stats
  examPaperStats: async (examId: string) => {
    return apiClient.get(`/exams/${examId}/paper-stats`);
  },

  // Print status management
  updatePrintStatus: async (id: string, data: {
    print_status?: 'not_printed' | 'printing' | 'printed' | 'cancelled';
    copies_printed?: number;
    increment?: boolean;
    print_notes?: string | null;
  }) => {
    return apiClient.post(`/exam/paper-templates/${id}/print-status`, data);
  },

  // Template file management
  templateFiles: {
    list: async (params?: {
      language?: 'en' | 'ps' | 'fa' | 'ar';
      is_active?: boolean;
      is_default?: boolean;
    }) => {
      return apiClient.get('/exam/paper-template-files', params);
    },
    get: async (id: string) => {
      return apiClient.get(`/exam/paper-template-files/${id}`);
    },
    create: async (data: {
      name: string;
      description?: string | null;
      language: 'en' | 'ps' | 'fa' | 'ar';
      template_html: string;
      css_styles?: string | null;
      is_default?: boolean;
      is_active?: boolean;
    }) => {
      return apiClient.post('/exam/paper-template-files', data);
    },
    update: async (id: string, data: {
      name?: string;
      description?: string | null;
      language?: 'en' | 'ps' | 'fa' | 'ar';
      template_html?: string;
      css_styles?: string | null;
      is_default?: boolean;
      is_active?: boolean;
    }) => {
      return apiClient.put(`/exam/paper-template-files/${id}`, data);
    },
    delete: async (id: string) => {
      return apiClient.delete(`/exam/paper-template-files/${id}`);
    },
    setDefault: async (id: string) => {
      return apiClient.post(`/exam/paper-template-files/${id}/set-default`);
    },
    preview: async (id: string) => {
      return apiClient.get(`/exam/paper-template-files/${id}/preview`);
    },
  },

  // Paper generation
  preview: async (id: string, variant?: number) => {
    return apiClient.get(`/exam/paper-templates/${id}/preview`, { variant });
  },
  generate: async (id: string, data: {
    variants: number[];
    page_layout?: 'A4_portrait' | 'A4_landscape';
  }) => {
    return apiClient.post(`/exam/paper-templates/${id}/generate`, data);
  },
  generateHtml: async (id: string, data: {
    variant: number;
  }) => {
    return apiClient.post(`/exam/paper-templates/${id}/generate-html`, data);
  },
};

// Exam Paper Preview API
export const examPaperPreviewApi = {
  studentView: async (templateId: string) => {
    return apiClient.get(`/exam/paper-preview/${templateId}/student`);
  },

  teacherView: async (templateId: string) => {
    return apiClient.get(`/exam/paper-preview/${templateId}/teacher`);
  },

  examSubjectPreview: async (examSubjectId: string, showAnswers?: boolean) => {
    return apiClient.get(`/exam-subjects/${examSubjectId}/paper-preview`, { show_answers: showAnswers });
  },

  availableTemplates: async (examSubjectId: string) => {
    return apiClient.get(`/exam-subjects/${examSubjectId}/available-templates`);
  },

  setDefaultTemplate: async (examSubjectId: string, templateId: string) => {
    return apiClient.post(`/exam-subjects/${examSubjectId}/set-default-template`, { template_id: templateId });
  },
};

// Graduation & Certificates MVP
export const graduationBatchesApi = {
  list: async (params?: {
    school_id?: string;
    academic_year_id?: string;
    class_id?: string;
    exam_id?: string;
  }) => apiClient.get('/graduation/batches', params),
  get: async (id: string, params?: { school_id?: string }) => 
    apiClient.get(`/graduation/batches/${id}`, params),
  create: async (data: {
    school_id: string;
    academic_year_id: string;
    class_id: string;
    exam_id?: string; // Backward compatibility
    exam_ids?: string[]; // New: multiple exams
    exam_weights?: Record<string, number>; // Exam weights (0-100, must sum to 100 if provided)
    graduation_date: string;
    graduation_type?: 'final_year' | 'promotion' | 'transfer';
    from_class_id?: string;
    to_class_id?: string;
    min_attendance_percentage?: number;
    require_attendance?: boolean;
    exclude_approved_leaves?: boolean;
  }) => apiClient.post('/graduation/batches', data),
  update: async (id: string, data: {
    academic_year_id?: string;
    class_id?: string;
    exam_id?: string;
    exam_ids?: string[];
    exam_weights?: Record<string, number>;
    graduation_date?: string;
    graduation_type?: 'final_year' | 'promotion' | 'transfer';
    from_class_id?: string;
    to_class_id?: string;
    min_attendance_percentage?: number;
    require_attendance?: boolean;
    exclude_approved_leaves?: boolean;
  }, params?: { school_id?: string }) =>
    apiClient.put(`/graduation/batches/${id}`, { ...data, ...params }),
  delete: async (id: string, params?: { school_id?: string }) =>
    apiClient.delete(`/graduation/batches/${id}`, params),
  generateStudents: async (id: string, params?: { school_id?: string }) =>
    apiClient.post(`/graduation/batches/${id}/generate-students`, params),
  approve: async (id: string, params?: { school_id?: string }) =>
    apiClient.post(`/graduation/batches/${id}/approve`, params),
  issueCertificates: async (id: string, data: { 
    template_id: string; 
    school_id?: string;
    starting_number?: number;
    prefix?: string;
    certificate_type?: string;
    padding?: number;
  }) =>
    apiClient.post(`/graduation/batches/${id}/issue-certificates`, data),
};

export const certificateTemplatesV2Api = {
  list: async (params?: { school_id?: string; type?: string }) =>
    apiClient.get('/certificates/templates', params),
  get: async (id: string) => apiClient.get(`/certificates/templates/${id}`),
  create: async (data: FormData | {
    school_id?: string;
    type: string;
    title: string;
    body_html?: string;
    layout_config?: any;
    background_image?: File | null;
    page_size?: 'A4' | 'A5' | 'custom';
    custom_width_mm?: number | null;
    custom_height_mm?: number | null;
    rtl?: boolean;
    font_family?: string | null;
    is_active?: boolean;
    description?: string | null;
  }) => {
    // If data is FormData, use it directly; otherwise convert to FormData
    if (data instanceof FormData) {
      return apiClient.post('/certificates/templates', data);
    }
    const formData = new FormData();
    if (data.school_id) formData.append('school_id', data.school_id);
    formData.append('type', data.type);
    formData.append('title', data.title);
    // Backend also expects 'name' field - use title as name if name not provided
    if ((data as any).name) {
      formData.append('name', (data as any).name);
    } else {
      formData.append('name', data.title);
    }
    if (data.body_html) formData.append('body_html', data.body_html);
    if (data.layout_config) formData.append('layout_config', JSON.stringify(data.layout_config));
    if (data.background_image) formData.append('background_image', data.background_image);
    if (data.page_size) formData.append('page_size', data.page_size);
    if (data.custom_width_mm !== undefined) formData.append('custom_width_mm', String(data.custom_width_mm));
    if (data.custom_height_mm !== undefined) formData.append('custom_height_mm', String(data.custom_height_mm));
    if (data.rtl !== undefined) formData.append('rtl', data.rtl ? '1' : '0');
    if (data.font_family) formData.append('font_family', data.font_family);
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
    if (data.description !== undefined) formData.append('description', data.description || '');
    return apiClient.post('/certificates/templates', formData);
  },
  update: async (id: string, data: FormData | {
    school_id?: string;
    type?: string;
    title?: string;
    body_html?: string;
    layout_config?: any;
    background_image?: File | null;
    page_size?: 'A4' | 'A5' | 'custom';
    custom_width_mm?: number | null;
    custom_height_mm?: number | null;
    rtl?: boolean;
    font_family?: string | null;
    is_active?: boolean;
    description?: string | null;
  }) => {
    // If data is FormData, use it directly; otherwise convert to FormData
    if (data instanceof FormData) {
      // Laravel doesn't support PUT with FormData, use POST with _method
      data.append('_method', 'PUT');
      return apiClient.post(`/certificates/templates/${id}`, data);
    }
    const formData = new FormData();
    if (data.school_id !== undefined) formData.append('school_id', data.school_id || '');
    if (data.type) formData.append('type', data.type);
    if (data.title) {
      formData.append('title', data.title);
      // Backend also expects 'name' field - use title as name if name not provided
      if ((data as any).name) {
        formData.append('name', (data as any).name);
      } else {
        formData.append('name', data.title);
      }
    }
    if (data.body_html !== undefined) formData.append('body_html', data.body_html || '');
    if (data.layout_config !== undefined) formData.append('layout_config', JSON.stringify(data.layout_config));
    if (data.background_image) formData.append('background_image', data.background_image);
    if (data.page_size) formData.append('page_size', data.page_size);
    if (data.custom_width_mm !== undefined) formData.append('custom_width_mm', String(data.custom_width_mm));
    if (data.custom_height_mm !== undefined) formData.append('custom_height_mm', String(data.custom_height_mm));
    if (data.rtl !== undefined) formData.append('rtl', data.rtl ? '1' : '0');
    if (data.font_family !== undefined) formData.append('font_family', data.font_family || '');
    if (data.is_active !== undefined) formData.append('is_active', data.is_active ? '1' : '0');
    if (data.description !== undefined) formData.append('description', data.description || '');
    // Laravel doesn't support PUT with FormData, use POST with _method
    formData.append('_method', 'PUT');
    return apiClient.post(`/certificates/templates/${id}`, formData);
  },
  delete: async (id: string) => apiClient.delete(`/certificates/templates/${id}`),
  activate: async (id: string) => apiClient.post(`/certificates/templates/${id}/activate`),
  deactivate: async (id: string) => apiClient.post(`/certificates/templates/${id}/deactivate`),
  getBackgroundUrl: (id: string) => `${API_URL}/certificates/templates/${id}/background`,
};

export const issuedCertificatesApi = {
  list: async (params?: {
    school_id?: string;
    student_id?: string;
    batch_id?: string;
    type?: string;
  }) => apiClient.get('/certificates/issued', params),
  get: async (id: string) => apiClient.get(`/certificates/issued/${id}`),
  getCertificateData: async (id: string, schoolId?: string) => 
    apiClient.get(`/certificates/issued/${id}/data`, schoolId ? { school_id: schoolId } : undefined),
  revoke: async (id: string, reason: string, schoolId?: string) =>
    apiClient.post(`/certificates/issued/${id}/revoke`, { 
      reason,
      ...(schoolId && { school_id: schoolId }),
    }),
  downloadPdf: async (id: string, schoolId?: string) =>
    apiClient.requestFile(`/certificates/issued/${id}/pdf`, { 
      method: 'GET',
      params: schoolId ? { school_id: schoolId } : undefined,
    }),
  downloadBatch: async (batchId: string) =>
    apiClient.requestFile(`/certificates/batches/${batchId}/pdf`, { method: 'GET' }),
};

// Student ID Cards API
export const studentIdCardsApi = {
  list: async (params?: {
    academic_year_id?: string;
    class_id?: string;
    class_academic_year_id?: string;
    enrollment_status?: string;
    id_card_template_id?: string;
    is_printed?: boolean;
    card_fee_paid?: boolean;
    search?: string;
    page?: number;
    per_page?: number;
  }) => apiClient.get('/student-id-cards', params),
  
  get: async (id: string) => apiClient.get(`/student-id-cards/${id}`),
  
  assign: async (data: {
    academic_year_id: string;
    id_card_template_id: string;
    student_admission_ids: string[];
    class_id?: string | null;
    class_academic_year_id?: string | null;
    card_fee?: number;
    card_fee_paid?: boolean;
    card_fee_paid_date?: string | null;
    card_number?: string | null;
    notes?: string | null;
  }) => apiClient.post('/student-id-cards/assign', data),
  
  update: async (id: string, data: {
    card_number?: string | null;
    card_fee?: number;
    card_fee_paid?: boolean;
    card_fee_paid_date?: string | null;
    is_printed?: boolean;
    printed_at?: string | null;
    printed_by?: string | null;
    notes?: string | null;
  }) => apiClient.put(`/student-id-cards/${id}`, data),
  
  markPrinted: async (id: string) => 
    apiClient.post(`/student-id-cards/${id}/mark-printed`),
  
  markFeePaid: async (id: string, data: {
    card_fee_paid: boolean;
    card_fee_paid_date?: string;
    account_id?: string | null;
    income_category_id?: string | null;
  }) => apiClient.post(`/student-id-cards/${id}/mark-fee-paid`, data),
  
  delete: async (id: string) => apiClient.delete(`/student-id-cards/${id}`),
  
  preview: async (id: string, side: 'front' | 'back' = 'front') => {
    const result = await apiClient.requestFile(`/student-id-cards/export/preview?id=${id}&side=${side}`, {
      method: 'GET',
    });
    // Return just the blob for preview
    return result.blob;
  },
  
  exportBulk: async (data: {
    card_ids?: string[];
    filters?: {
      academic_year_id?: string;
      class_id?: string;
      class_academic_year_id?: string;
      enrollment_status?: string;
      id_card_template_id?: string;
      is_printed?: boolean;
      card_fee_paid?: boolean;
      search?: string;
    };
    format: 'zip' | 'pdf';
    sides: 'front' | 'back' | 'both';
    cards_per_page?: number;
    quality?: 'standard' | 'high';
    include_unprinted?: boolean;
    include_unpaid?: boolean;
    file_naming_template?: string;
  }) => apiClient.requestFile('/student-id-cards/export/bulk', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
    },
  }),
  
  exportIndividual: async (id: string, format: 'png' | 'pdf' = 'png') =>
    apiClient.requestFile(`/student-id-cards/export/individual/${id}`, {
      method: 'GET',
      params: { format },
    }),
};
