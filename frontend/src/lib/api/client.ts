/**
 * Laravel API Client
 * Replaces Supabase client for backend API calls
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Load token from localStorage
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('api_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('api_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('api_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
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
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...fetchOptions.headers,
    };

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
        throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error: any) {
      // Handle network errors
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        throw new Error('Network error: Unable to connect to API server. Please ensure the Laravel backend is running.');
      }
      throw error;
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
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
  login: async (email: string, password: string) => {
    const response = await apiClient.post<{ user: any; token: string }>('/auth/login', {
      email,
      password,
    });
    apiClient.setToken(response.token);
    return response;
  },

  register: async (data: {
    email: string;
    password: string;
    password_confirmation: string;
    full_name: string;
    organization_id?: string;
  }) => {
    const response = await apiClient.post<{ user: any; token: string }>('/auth/register', data);
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

  userPermissions: async () => {
    return apiClient.get('/permissions/user');
  },
};
