import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Use generated type from database schema
export type StaffType = Tables<'staff_types'>;
export type StaffTypeInsert = TablesInsert<'staff_types'>;
export type StaffTypeUpdate = TablesUpdate<'staff_types'>;

// Use generated type from database schema
export type StaffDocument = Tables<'staff_documents'>;
export type StaffDocumentInsert = TablesInsert<'staff_documents'>;
export type StaffDocumentUpdate = TablesUpdate<'staff_documents'>;

// Custom status type for stricter typing
export type StaffStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'suspended';

// Use generated type from database schema, extended with relations
export type Staff = Omit<Tables<'staff'>, 'status'> & {
  status: StaffStatus;
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
};
export type StaffInsert = TablesInsert<'staff'>;
export type StaffUpdate = TablesUpdate<'staff'>;

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

      // Fetch staff with relations filtered by accessible orgs
      let query = (supabase as any)
        .from('staff')
        .select(`
          *,
          staff_type:staff_types(*),
          organization:organizations(id, name),
          school:school_branding(id, school_name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (organizationId) {
        if (!resolvedOrgIds.includes(organizationId)) {
          return [];
        }
        query = query.eq('organization_id', organizationId);
      } else {
        query = query.in('organization_id', resolvedOrgIds);
      }

      const { data: staffData, error: staffError } = await query;

      if (staffError) {
        throw new Error(staffError.message);
      }

      // Fetch profiles separately in batch to avoid ambiguity (staff has multiple FKs to profiles)
      const profileIds = [...new Set((staffData || []).map((s: any) => s.profile_id).filter(Boolean))] as string[];

      let profilesMap = new Map();
      if (profileIds.length > 0) {
        const { data: profilesData } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, email, phone, avatar_url, role')
          .in('id', profileIds);

        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap.set(p.id, p);
          });
        }
      }

      // Attach profiles to staff members
      const staffWithProfiles = (staffData || []).map((staff: any) => {
        if (staff.profile_id && profilesMap.has(staff.profile_id)) {
          staff.profile = profilesMap.get(staff.profile_id);
        }
        return staff;
      });

      return staffWithProfiles as Staff[];
    },
    enabled: !!user && !!profile, // Allow super admin to see all when organizationId is undefined
  });
};

// Hook to fetch a single staff member
export const useStaffMember = (staffId: string) => {
  return useQuery({
    queryKey: ['staff', staffId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('staff')
        .select(`
          *,
          staff_type:staff_types(*),
          organization:organizations(
            id,
            name
          ),
          school:school_branding(
            id,
            school_name
          )
        `)
        .eq('id', staffId)
        .is('deleted_at', null)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Fetch profile separately if profile_id exists
      if (data && data.profile_id) {
        const { data: profileData } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, email, phone, avatar_url, role')
          .eq('id', data.profile_id)
          .single();

        if (profileData) {
          data.profile = profileData;
        }
      }

      return data as Staff;
    },
  });
};

// Hook to fetch staff by type
export const useStaffByType = (staffTypeId: string, organizationId?: string) => {
  const { profile } = useAuth();
  const orgId = organizationId || profile?.organization_id || null;

  return useQuery({
    queryKey: ['staff', 'type', staffTypeId, orgId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('staff')
        .select(`
          *,
          staff_type:staff_types(*),
          organization:organizations(id, name),
          school:school_branding(id, school_name)
        `)
        .eq('staff_type_id', staffTypeId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('full_name', { ascending: true });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data: staffData, error: staffError } = await query;

      if (staffError) {
        throw new Error(staffError.message);
      }

      // Fetch profiles separately in batch to avoid ambiguity (staff has multiple FKs to profiles)
      const profileIds = [...new Set((staffData || []).map((s: any) => s.profile_id).filter(Boolean))] as string[];

      let profilesMap = new Map();
      if (profileIds.length > 0) {
        const { data: profilesData } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, email, phone, avatar_url, role')
          .in('id', profileIds);

        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap.set(p.id, p);
          });
        }
      }

      // Attach profiles to staff members
      const staffWithProfiles = (staffData || []).map((staff: any) => {
        if (staff.profile_id && profilesMap.has(staff.profile_id)) {
          staff.profile = profilesMap.get(staff.profile_id);
        }
        return staff;
      });

      return staffWithProfiles as Staff[];
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

      let baseQuery = (supabase as any).from('staff').select('*', { count: 'exact', head: true }).is('deleted_at', null);

      if (organizationId) {
        if (!resolvedOrgIds.includes(organizationId)) {
          return { total: 0, active: 0, inactive: 0, on_leave: 0, terminated: 0, suspended: 0, by_type: { teacher: 0, admin: 0, accountant: 0, librarian: 0, other: 0 } };
        }
        baseQuery = baseQuery.eq('organization_id', organizationId);
      } else {
        baseQuery = baseQuery.in('organization_id', resolvedOrgIds);
      }

      // Get teacher type ID
      const { data: teacherType } = await (supabase as any)
        .from('staff_types')
        .select('id')
        .eq('code', 'teacher')
        .is('organization_id', null)
        .is('deleted_at', null)
        .single();

      const teacherTypeId = teacherType?.id;

      // Build queries for status counts using the same organization filtering logic
      const buildStatusQuery = (status: string) => {
        let query = (supabase as any).from('staff').select('*', { count: 'exact', head: true }).eq('status', status).is('deleted_at', null);

        if (organizationId) {
          if (!resolvedOrgIds.includes(organizationId)) return Promise.resolve({ count: 0 });
          query = query.eq('organization_id', organizationId);
        } else {
          query = query.in('organization_id', resolvedOrgIds);
        }

        return query;
      };

      const buildTeacherQuery = () => {
        if (!teacherTypeId) return Promise.resolve({ count: 0 });

        let query = (supabase as any).from('staff').select('*', { count: 'exact', head: true }).eq('staff_type_id', teacherTypeId).is('deleted_at', null);

        if (organizationId) {
          if (!resolvedOrgIds.includes(organizationId)) return Promise.resolve({ count: 0 });
          query = query.eq('organization_id', organizationId);
        } else {
          query = query.in('organization_id', resolvedOrgIds);
        }

        return query;
      };

      const [total, active, inactive, onLeave, terminated, suspended, teachers] = await Promise.all([
        baseQuery,
        buildStatusQuery('active'),
        buildStatusQuery('inactive'),
        buildStatusQuery('on_leave'),
        buildStatusQuery('terminated'),
        buildStatusQuery('suspended'),
        buildTeacherQuery(),
      ]);

      return {
        total: total.count ?? 0,
        active: active.count ?? 0,
        inactive: inactive.count ?? 0,
        on_leave: onLeave.count ?? 0,
        terminated: terminated.count ?? 0,
        suspended: suspended.count ?? 0,
        by_type: {
          teacher: teachers.count ?? 0,
          admin: 0, // Will be calculated from staff_types
          accountant: 0,
          librarian: 0,
          other: 0,
        },
      };
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
      // Get organization_id - must be provided or from profile
      const organizationId = staffData.organization_id || profile?.organization_id;

      if (!organizationId) {
        throw new Error('Organization ID is required. User must be assigned to an organization.');
      }

      // Clean up any empty strings in UUID fields
      const finalData: StaffInsert = {
        ...staffData,
        organization_id: organizationId,
        school_id: staffData.school_id && staffData.school_id !== '' ? staffData.school_id : null,
      };

      // Validate employee_id uniqueness within organization
      if (finalData.organization_id && finalData.employee_id) {
        const { data: existing, error: checkError } = await supabase
          .from('staff')
          .select('id')
          .eq('organization_id', finalData.organization_id)
          .eq('employee_id', finalData.employee_id)
          .maybeSingle();

        // If error is not "not found", it's a real error
        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error(checkError.message);
        }

        if (existing) {
          throw new Error('Employee ID already exists in this organization');
        }
      }

      // Insert staff without profile relation to avoid ambiguity (staff has multiple FKs to profiles)
      const { data, error } = await (supabase as any)
        .from('staff')
        .insert(finalData)
        .select(`
          *,
          staff_type:staff_types(*),
          organization:organizations(
            id,
            name
          ),
          school:school_branding(
            id,
            school_name
          )
        `)
        .single();

      // Fetch profile separately if profile_id exists
      if (data && data.profile_id) {
        const { data: profileData } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, email, phone, avatar_url, role')
          .eq('id', data.profile_id)
          .single();

        if (profileData) {
          data.profile = profileData;
        }
      }

      if (error) {
        throw new Error(error.message);
      }

      return data as Staff;
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
      // Validate employee_id uniqueness if being changed
      if (updates.employee_id) {
        const { data: staff } = await supabase
          .from('staff')
          .select('organization_id')
          .eq('id', id)
          .single();

        if (staff) {
          const { data: existing, error: checkError } = await supabase
            .from('staff')
            .select('id')
            .eq('organization_id', staff.organization_id)
            .eq('employee_id', updates.employee_id)
            .neq('id', id)
            .maybeSingle();

          // If error is not "not found", it's a real error
          if (checkError && checkError.code !== 'PGRST116') {
            throw new Error(checkError.message);
          }

          if (existing) {
            throw new Error('Employee ID already exists in this organization');
          }
        }
      }

      // Update staff without profile relation to avoid ambiguity
      const { data, error } = await (supabase as any)
        .from('staff')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          staff_type:staff_types(*),
          organization:organizations(
            id,
            name
          ),
          school:school_branding(
            id,
            school_name
          )
        `)
        .single();

      // Fetch profile separately if profile_id exists
      if (data && data.profile_id) {
        const { data: profileData } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, email, phone, avatar_url, role')
          .eq('id', data.profile_id)
          .single();

        if (profileData) {
          data.profile = profileData;
        }
      }

      if (error) {
        throw new Error(error.message);
      }

      return data as Staff;
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
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      staffId,
      organizationId,
      schoolId,
      file
    }: {
      staffId: string;
      organizationId: string;
      schoolId?: string | null;
      file: File;
    }) => {
      // Get staff record to get school_id if not provided
      const { data: staff } = await (supabase as any)
        .from('staff')
        .select('school_id')
        .eq('id', staffId)
        .single();

      const finalSchoolId = schoolId || staff?.school_id || null;

      // Build path: {organization_id}/{school_id}/{staff_id}/picture/{filename}
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const schoolPath = finalSchoolId ? `${finalSchoolId}/` : '';
      const filePath = `${organizationId}/${schoolPath}${staffId}/picture/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('staff-files')
        .getPublicUrl(filePath);

      // Update staff record with picture URL (store relative path)
      const { error: updateError } = await (supabase as any)
        .from('staff')
        .update({ picture_url: fileName })
        .eq('id', staffId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return publicUrl;
    },
  });
};

// Hook to upload staff document
export const useUploadStaffDocument = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      staffId,
      organizationId,
      schoolId,
      file,
      documentType,
      description
    }: {
      staffId: string;
      organizationId: string;
      schoolId?: string | null;
      file: File;
      documentType: string;
      description?: string | null;
    }) => {
      // Get staff record to get school_id if not provided
      const { data: staff } = await (supabase as any)
        .from('staff')
        .select('school_id')
        .eq('id', staffId)
        .single();

      const finalSchoolId = schoolId || staff?.school_id || null;

      // Build path: {organization_id}/{school_id}/{staff_id}/documents/{document_type}/{filename}
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const schoolPath = finalSchoolId ? `${finalSchoolId}/` : '';
      const filePath = `${organizationId}/${schoolPath}${staffId}/documents/${documentType}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('staff-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('staff-files')
        .getPublicUrl(filePath);

      // Insert into staff_documents table
      const { data: document, error: insertError } = await (supabase as any)
        .from('staff_documents')
        .insert({
          staff_id: staffId,
          organization_id: organizationId,
          school_id: finalSchoolId,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          description: description || null,
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      return { document, publicUrl };
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

      let query = (supabase as any)
        .from('staff_types')
        .select('*')
        .is('deleted_at', null)
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      // Multi-tenancy: Filter by accessible organizations
      if (accessibleOrgIds.length === 0) {
        return [];
      }
      
      // Filter by accessible organizations (includes global NULL if user has access)
      const orgFilter = organizationId 
        ? (accessibleOrgIds.includes(organizationId) ? [organizationId] : [])
        : accessibleOrgIds;
      
      if (orgFilter.length === 0) {
        return [];
      }
      
      // Include NULL (global) if user has access, plus specific orgs
      query = query.or(`organization_id.is.null,organization_id.in.(${orgFilter.join(',')})`);

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as StaffType[];
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

      // Validate code uniqueness
      const { data: existing } = await (supabase as any)
        .from('staff_types')
        .select('id')
        .eq('code', typeData.code)
        .eq('organization_id', organizationId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        throw new Error('A staff type with this code already exists');
      }

      const { data, error } = await (supabase as any)
        .from('staff_types')
        .insert({
          name: typeData.name,
          code: typeData.code,
          description: typeData.description || null,
          display_order: typeData.display_order || 0,
          organization_id: organizationId,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as StaffType;
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

      // Validate code uniqueness if being changed
      if (updates.code) {
        const { data: currentType } = await (supabase as any)
          .from('staff_types')
          .select('organization_id')
          .eq('id', id)
          .single();

        if (currentType) {
          const { data: existing } = await (supabase as any)
            .from('staff_types')
            .select('id')
            .eq('code', updates.code)
            .eq('organization_id', currentType.organization_id)
            .neq('id', id)
            .is('deleted_at', null)
            .maybeSingle();

          if (existing) {
            throw new Error('A staff type with this code already exists');
          }
        }
      }

      const { data, error } = await (supabase as any)
        .from('staff_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as StaffType;
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

      // Check if staff type is in use
      const { data: inUse } = await (supabase as any)
        .from('staff')
        .select('id')
        .eq('staff_type_id', id)
        .is('deleted_at', null)
        .limit(1);

      if (inUse && inUse.length > 0) {
        throw new Error('Cannot delete staff type that is assigned to staff members');
      }

      // Soft delete
      const { error } = await (supabase as any)
        .from('staff_types')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
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

      const { data, error } = await (supabase as any)
        .from('staff_documents')
        .select('*')
        .eq('staff_id', staffId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as StaffDocument[];
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

      // Get document to get file path
      const { data: document } = await (supabase as any)
        .from('staff_documents')
        .select('file_path, staff_id')
        .eq('id', documentId)
        .single();

      if (!document) {
        throw new Error('Document not found');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('staff-files')
        .remove([document.file_path]);

      if (storageError) {
        // Log but don't fail - file might already be deleted
        console.warn('Storage delete error:', storageError);
      }

      // Soft delete from database
      const { error: deleteError } = await (supabase as any)
        .from('staff_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }
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
