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
      'Accept': 'application/json',
      ...fetchOptions.headers,
    };

    // Only set Content-Type for JSON, not for FormData (browser will set it with boundary)
    if (!(fetchOptions.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

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

  statistics: async (id: string) => {
    return apiClient.get(`/organizations/${id}/statistics`);
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
    footer_text?: string | null;
    header_html?: string | null;
    footer_html?: string | null;
    report_logo_selection?: string | null;
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
    footer_text?: string | null;
    header_html?: string | null;
    footer_html?: string | null;
    report_logo_selection?: string | null;
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
  }) => {
    return apiClient.get('/students', params);
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
};

// Teacher Subject Assignments API
export const teacherSubjectAssignmentsApi = {
  list: async (params?: {
    organization_id?: string;
    teacher_id?: string;
    academic_year_id?: string;
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