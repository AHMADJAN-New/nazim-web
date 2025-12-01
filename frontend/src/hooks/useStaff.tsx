import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { staffApi, staffTypesApi, staffDocumentsApi } from '@/lib/api/client';

// Staff Type types
export interface StaffType {
  id: string;
  organization_id: string | null;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type StaffTypeInsert = Omit<StaffType, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type StaffTypeUpdate = Partial<StaffTypeInsert>;

// Staff Document types
export interface StaffDocument {
  id: string;
  staff_id: string;
  organization_id: string;
  school_id: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type StaffDocumentInsert = Omit<StaffDocument, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type StaffDocumentUpdate = Partial<StaffDocumentInsert>;

// Custom status type for stricter typing
export type StaffStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'suspended';

// Staff types
export interface Staff {
  id: string;
  profile_id: string | null;
  organization_id: string;
  employee_id: string;
  staff_type: string;
  staff_type_id: string | null;
  school_id: string | null;
  first_name: string;
  father_name: string;
  grandfather_name: string | null;
  full_name: string;
  tazkira_number: string | null;
  birth_year: string | null;
  birth_date: string | null;
  phone_number: string | null;
  email: string | null;
  home_address: string | null;
  origin_province: string | null;
  origin_district: string | null;
  origin_village: string | null;
  current_province: string | null;
  current_district: string | null;
  current_village: string | null;
  religious_education: string | null;
  religious_university: string | null;
  religious_graduation_year: string | null;
  religious_department: string | null;
  modern_education: string | null;
  modern_school_university: string | null;
  modern_graduation_year: string | null;
  modern_department: string | null;
  teaching_section: string | null;
  position: string | null;
  duty: string | null;
  salary: string | null;
  status: StaffStatus;
  picture_url: string | null;
  document_urls: any[];
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Extended with relations
  staff_type?: StaffType;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    role: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  school?: {
    id: string;
    school_name: string;
  };
}

export type StaffInsert = Omit<Staff, 'id' | 'full_name' | 'created_at' | 'updated_at' | 'deleted_at' | 'staff_type' | 'profile' | 'organization' | 'school'>;
export type StaffUpdate = Partial<StaffInsert>;

export interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  on_leave: number;
  terminated: number;
  suspended: number;
  by_type: {
    teacher: number;
    admin: number;
    accountant: number;
    librarian: number;
    other: number;
  };
}

// Hook to fetch all staff with organization filtering
export const useStaff = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
  const orgId = organizationId || profile?.organization_id || null;

  return useQuery({
    queryKey: ['staff', orgId, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile) return [];
      if (orgsLoading) return [];

      const resolvedOrgIds = orgIds;

      // Short-circuit if no accessible orgs
      if (resolvedOrgIds.length === 0) {
        return [];
      }

      // Fetch staff from Laravel API
      const params: any = {};
      if (organizationId) {
        if (!resolvedOrgIds.includes(organizationId)) {
          return [];
        }
        params.organization_id = organizationId;
      }

      const staff = await staffApi.list(params);
      return staff as Staff[];
    },
    enabled: !!user && !!profile, // Allow super admin to see all when organizationId is undefined
  });
};

// Hook to fetch a single staff member
export const useStaffMember = (staffId: string) => {
  return useQuery({
    queryKey: ['staff', staffId],
    queryFn: async () => {
      const staff = await staffApi.get(staffId);
      return staff as Staff;
    },
  });
};

// Hook to fetch staff by type
export const useStaffByType = (staffTypeId: string, organizationId?: string) => {
  const { profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
  const orgId = organizationId || profile?.organization_id || null;

  return useQuery({
    queryKey: ['staff', 'type', staffTypeId, orgId],
    queryFn: async () => {
      const params: any = {
        staff_type_id: staffTypeId,
        status: 'active',
      };
      if (orgId) {
        params.organization_id = orgId;
      }

      const staff = await staffApi.list(params);
      // Sort by full_name
      return (staff as Staff[]).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    },
    enabled: (!!orgId || organizationId === undefined) && !orgsLoading,
  });
};

// Hook to get staff statistics
export const useStaffStats = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['staff-stats', organizationId === undefined ? 'all' : organizationId, orgIds.join(',')],
    queryFn: async (): Promise<StaffStats> => {
      if (!user || !profile || orgsLoading) {
        return { total: 0, active: 0, inactive: 0, on_leave: 0, terminated: 0, suspended: 0, by_type: { teacher: 0, admin: 0, accountant: 0, librarian: 0, other: 0 } };
      }

      const resolvedOrgIds = orgIds;
      if (resolvedOrgIds.length === 0) {
        return { total: 0, active: 0, inactive: 0, on_leave: 0, terminated: 0, suspended: 0, by_type: { teacher: 0, admin: 0, accountant: 0, librarian: 0, other: 0 } };
      }

      // Fetch stats from Laravel API
      const params: any = {};
      if (organizationId) {
        if (!resolvedOrgIds.includes(organizationId)) {
          return { total: 0, active: 0, inactive: 0, on_leave: 0, terminated: 0, suspended: 0, by_type: { teacher: 0, admin: 0, accountant: 0, librarian: 0, other: 0 } };
        }
        params.organization_id = organizationId;
      }

      const stats = await staffApi.stats(params);
      return stats as StaffStats;
    },
    enabled: !!user && !!profile && !orgsLoading, // Always enabled when user and profile exist
  });
};

// Hook to create a new staff member
export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (staffData: StaffInsert) => {
      // Get organization_id - automatically use profile's organization_id if not provided
      // This should always exist after the seeder runs
      const organizationId = staffData.organization_id || profile?.organization_id;

      if (!organizationId) {
        // If still no organization_id, this is a system error - user should have been assigned during login
        throw new Error('You must be assigned to an organization. Please log out and log back in, or contact administrator.');
      }

      // Clean up any empty strings in UUID fields
      const finalData: StaffInsert = {
        ...staffData,
        organization_id: organizationId,
        school_id: staffData.school_id && staffData.school_id !== '' ? staffData.school_id : null,
      };

      // Create staff via Laravel API (validation handled server-side)
      const staff = await staffApi.create(finalData);
      return staff as Staff;
    },
    onSuccess: (data, variables) => {
      // Invalidate all staff queries (including "all" organization filter)
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      // Also invalidate the specific organization's staff if organization_id was provided
      if (variables.organization_id) {
        queryClient.invalidateQueries({ queryKey: ['staff', variables.organization_id] });
      }
      // Invalidate stats for all organizations
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      toast.success('Staff member created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create staff member');
    },
  });
};

// Hook to update a staff member
export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffInsert> & { id: string }) => {
      // Update staff via Laravel API (validation handled server-side)
      const staff = await staffApi.update(id, updates);
      return staff as Staff;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      toast.success('Staff member updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update staff member');
    },
  });
};

// Hook to delete a staff member
export const useDeleteStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await staffApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-stats'] });
      toast.success('Staff member deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete staff member');
    },
  });
};

// Hook to upload staff picture
export const useUploadStaffPicture = () => {
  return useMutation({
    mutationFn: async ({
      staffId,
      file
    }: {
      staffId: string;
      file: File;
    }) => {
      // Upload picture via Laravel API
      const result = await staffApi.uploadPicture(staffId, file);
      return result.url;
    },
  });
};

// Hook to upload staff document
export const useUploadStaffDocument = () => {
  return useMutation({
    mutationFn: async ({
      staffId,
      file,
      documentType,
      description
    }: {
      staffId: string;
      file: File;
      documentType: string;
      description?: string | null;
    }) => {
      // Upload document via Laravel API
      const result = await staffApi.uploadDocument(staffId, file, documentType, description);
      return result;
    },
  });
};

// ============================================================================
// Staff Types Hooks
// ============================================================================

export const useStaffTypes = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds: accessibleOrgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['staff-types', organizationId, accessibleOrgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile) return [];
      if (orgsLoading) return [];

      // Fetch staff types from Laravel API
      const params: any = {};
      if (organizationId) {
        params.organization_id = organizationId;
      }

      const staffTypes = await staffTypesApi.list(params);
      return staffTypes as StaffType[];
    },
    enabled: !!user && !!profile && !orgsLoading,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateStaffType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { primaryOrgId } = useAccessibleOrganizations();

  return useMutation({
    mutationFn: async (typeData: {
      name: string;
      code: string;
      description?: string | null;
      display_order?: number;
      organization_id?: string | null;
    }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get organization_id - use provided or user's primary org
      let organizationId = typeData.organization_id;
      if (organizationId === undefined) {
        if (primaryOrgId) {
          organizationId = primaryOrgId;
        } else if (profile.organization_id) {
          organizationId = profile.organization_id;
        } else {
          throw new Error('User must be assigned to an organization');
        }
      }

      // Create staff type via Laravel API (validation handled server-side)
      const staffType = await staffTypesApi.create({
        ...typeData,
        organization_id: organizationId,
      });
      return staffType as StaffType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-types'] });
      toast.success('Staff type created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create staff type');
    },
  });
};

export const useUpdateStaffType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StaffType> & { id: string }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Update staff type via Laravel API (validation handled server-side)
      const staffType = await staffTypesApi.update(id, updates);
      return staffType as StaffType;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-types'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff type updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update staff type');
    },
  });
};

export const useDeleteStaffType = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Delete staff type via Laravel API (validation handled server-side)
      await staffTypesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-types'] });
      toast.success('Staff type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete staff type');
    },
  });
};

// ============================================================================
// Staff Documents Hooks
// ============================================================================

export const useStaffDocuments = (staffId: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['staff-files', staffId],
    queryFn: async () => {
      if (!user || !profile) return [];

      // Fetch documents from Laravel API
      const documents = await staffDocumentsApi.list(staffId);
      return documents as StaffDocument[];
    },
    enabled: !!user && !!profile && !!staffId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

export const useDeleteStaffDocument = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Delete document via Laravel API
      await staffDocumentsApi.delete(documentId);
    },
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: ['staff-files'] });
      toast.success('Document deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });
};
