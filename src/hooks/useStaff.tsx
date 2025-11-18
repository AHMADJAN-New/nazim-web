import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useAuth } from './useAuth';

// Staff interface matching the new comprehensive schema
export interface Staff {
  id: string;
  profile_id: string | null;
  organization_id: string;
  employee_id: string;
  staff_type: 'teacher' | 'admin' | 'accountant' | 'librarian' | 'hostel_manager' | 'asset_manager' | 'security' | 'maintenance' | 'other';
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
  status: 'active' | 'inactive' | 'on_leave' | 'terminated' | 'suspended';
  picture_url: string | null;
  document_urls: Array<{ type: string; url: string; name?: string }> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // Extended with profile data (if linked to user account)
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
    role: string;
  };
  // Extended with organization data
  organization?: {
    id: string;
    name: string;
  };
}

export interface StaffInsert {
  profile_id?: string | null;
  organization_id: string;
  employee_id: string;
  staff_type?: Staff['staff_type'];
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
  status?: Staff['status'];
  picture_url?: string | null;
  document_urls?: Array<{ type: string; url: string; name?: string }> | null;
  notes?: string | null;
}

export interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  on_leave: number;
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
  const { profile } = useAuth();
  const orgId = organizationId || profile?.organization_id || null;

  return useQuery({
    queryKey: ['staff', orgId],
    queryFn: async () => {
      // First, fetch staff without nested queries to avoid N+1 problem
      let query = supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by organization if not super admin
      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data: staffData, error: staffError } = await query;

      if (staffError) {
        throw new Error(staffError.message);
      }

      if (!staffData || staffData.length === 0) {
        return [] as Staff[];
      }

      // Get unique profile IDs and organization IDs
      const profileIds = [...new Set(staffData.map((s: any) => s.profile_id).filter(Boolean))] as string[];
      const orgIds = [...new Set(staffData.map((s: any) => s.organization_id).filter(Boolean))] as string[];

      // Fetch profiles and organizations in parallel (batch queries)
      const [profilesResult, orgsResult] = await Promise.all([
        profileIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, full_name, email, phone, avatar_url, role')
              .in('id', profileIds)
          : Promise.resolve({ data: [], error: null }),
        orgIds.length > 0
          ? supabase
              .from('organizations')
              .select('id, name')
              .in('id', orgIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // Create lookup maps for efficient joining
      const profilesMap = new Map(
        (profilesResult.data || []).map((p: any) => [p.id, p])
      );
      const orgsMap = new Map(
        (orgsResult.data || []).map((o: any) => [o.id, o])
      );

      // Combine data
      const staffWithRelations: Staff[] = staffData.map((staff: any) => ({
        ...staff,
        profile: staff.profile_id ? (profilesMap.get(staff.profile_id) || null) : null,
        organization: staff.organization_id ? (orgsMap.get(staff.organization_id) || null) : null,
      }));

      return staffWithRelations;
    },
    enabled: !!orgId || organizationId === undefined, // Allow super admin to see all
  });
};

// Hook to fetch a single staff member
export const useStaffMember = (staffId: string) => {
  return useQuery({
    queryKey: ['staff', staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          profile:profiles(
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role
          ),
          organization:organizations(
            id,
            name
          )
        `)
        .eq('id', staffId)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Staff;
    },
  });
};

// Hook to fetch staff by type
export const useStaffByType = (staffType: Staff['staff_type'], organizationId?: string) => {
  const { profile } = useAuth();
  const orgId = organizationId || profile?.organization_id || null;

  return useQuery({
    queryKey: ['staff', 'type', staffType, orgId],
    queryFn: async () => {
      // Fetch staff without nested queries
      let query = supabase
        .from('staff')
        .select('*')
        .eq('staff_type', staffType)
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data: staffData, error: staffError } = await query;

      if (staffError) {
        throw new Error(staffError.message);
      }

      if (!staffData || staffData.length === 0) {
        return [] as Staff[];
      }

      // Get unique profile IDs
      const profileIds = [...new Set(staffData.map((s: any) => s.profile_id).filter(Boolean))] as string[];

      // Fetch profiles in batch
      let profilesMap = new Map();
      if (profileIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, avatar_url, role')
          .in('id', profileIds);

        if (profilesData) {
          profilesData.forEach((p: any) => {
            profilesMap.set(p.id, p);
          });
        }
      }

      // Combine data
      const staffWithRelations: Staff[] = staffData.map((staff: any) => ({
        ...staff,
        profile: staff.profile_id ? (profilesMap.get(staff.profile_id) || null) : null,
      }));

      return staffWithRelations;
    },
    enabled: !!orgId || organizationId === undefined,
  });
};

// Hook to get staff statistics
export const useStaffStats = (organizationId?: string) => {
  const { profile } = useAuth();
  const orgId = organizationId || profile?.organization_id || null;

  return useQuery({
    queryKey: ['staff-stats', orgId],
    queryFn: async (): Promise<StaffStats> => {
      let baseQuery = supabase.from('staff').select('*', { count: 'exact', head: true });
      
      if (orgId) {
        baseQuery = baseQuery.eq('organization_id', orgId);
      }

      const [total, active, inactive, onLeave, teachers, admins, accountants, librarians] = await Promise.all([
        baseQuery,
        orgId ? supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'active') : supabase.from('staff').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        orgId ? supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'inactive') : supabase.from('staff').select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
        orgId ? supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'on_leave') : supabase.from('staff').select('*', { count: 'exact', head: true }).eq('status', 'on_leave'),
        orgId ? supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('staff_type', 'teacher') : supabase.from('staff').select('*', { count: 'exact', head: true }).eq('staff_type', 'teacher'),
        orgId ? supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('staff_type', 'admin') : supabase.from('staff').select('*', { count: 'exact', head: true }).eq('staff_type', 'admin'),
        orgId ? supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('staff_type', 'accountant') : supabase.from('staff').select('*', { count: 'exact', head: true }).eq('staff_type', 'accountant'),
        orgId ? supabase.from('staff').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('staff_type', 'librarian') : supabase.from('staff').select('*', { count: 'exact', head: true }).eq('staff_type', 'librarian'),
      ]);

      return {
        total: total.count ?? 0,
        active: active.count ?? 0,
        inactive: inactive.count ?? 0,
        on_leave: onLeave.count ?? 0,
        by_type: {
          teacher: teachers.count ?? 0,
          admin: admins.count ?? 0,
          accountant: accountants.count ?? 0,
          librarian: librarians.count ?? 0,
          other: (total.count ?? 0) - (teachers.count ?? 0) - (admins.count ?? 0) - (accountants.count ?? 0) - (librarians.count ?? 0),
        },
      };
    },
    enabled: !!orgId || organizationId === undefined,
  });
};

// Hook to create a new staff member
export const useCreateStaff = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (staffData: StaffInsert) => {
      // Auto-set organization_id if not provided
      const finalData = {
        ...staffData,
        organization_id: staffData.organization_id || profile?.organization_id || '',
      };

      // Validate employee_id uniqueness within organization
      if (finalData.organization_id && finalData.employee_id) {
        const { data: existing } = await supabase
          .from('staff')
          .select('id')
          .eq('organization_id', finalData.organization_id)
          .eq('employee_id', finalData.employee_id)
          .single();

        if (existing) {
          throw new Error('Employee ID already exists in this organization');
        }
      }

      const { data, error } = await supabase
        .from('staff')
        .insert(finalData)
        .select(`
          *,
          profile:profiles(
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role
          ),
          organization:organizations(
            id,
            name
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Staff;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
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
          const { data: existing } = await supabase
            .from('staff')
            .select('id')
            .eq('organization_id', staff.organization_id)
            .eq('employee_id', updates.employee_id)
            .neq('id', id)
            .single();

          if (existing) {
            throw new Error('Employee ID already exists in this organization');
          }
        }
      }

      const { data, error } = await supabase
        .from('staff')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          profile:profiles(
            id,
            full_name,
            email,
            phone,
            avatar_url,
            role
          ),
          organization:organizations(
            id,
            name
          )
        `)
        .single();

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
  return useMutation({
    mutationFn: async ({ staffId, organizationId, file }: { staffId: string; organizationId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${staffId}/picture/${Date.now()}.${fileExt}`;
      const filePath = `${organizationId}/${fileName}`;

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

      // Update staff record with picture URL
      const { error: updateError } = await supabase
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
  return useMutation({
    mutationFn: async ({ 
      staffId, 
      organizationId, 
      file, 
      documentType 
    }: { 
      staffId: string; 
      organizationId: string; 
      file: File; 
      documentType: string;
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${staffId}/documents/${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `${organizationId}/${fileName}`;

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

      // Get current staff record to update document_urls
      const { data: staff, error: fetchError } = await supabase
        .from('staff')
        .select('document_urls')
        .eq('id', staffId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const currentDocs = (staff.document_urls as Array<{ type: string; url: string; name?: string }>) || [];
      const updatedDocs = [
        ...currentDocs,
        {
          type: documentType,
          url: fileName,
          name: file.name,
        },
      ];

      const { error: updateError } = await supabase
        .from('staff')
        .update({ document_urls: updatedDocs })
        .eq('id', staffId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return publicUrl;
    },
  });
};
