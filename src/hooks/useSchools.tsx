import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfile } from './useProfiles';
import { useAuth } from './useAuth';

export interface School {
  id: string;
  organization_id: string;
  school_name: string;
  school_name_arabic: string | null;
  school_name_pashto: string | null;
  school_address: string | null;
  school_phone: string | null;
  school_email: string | null;
  school_website: string | null;
  logo_path: string | null;
  header_image_path: string | null;
  footer_text: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  report_font_size: string;
  primary_logo_binary: Uint8Array | null;
  primary_logo_mime_type: string | null;
  primary_logo_filename: string | null;
  primary_logo_size: number | null;
  secondary_logo_binary: Uint8Array | null;
  secondary_logo_mime_type: string | null;
  secondary_logo_filename: string | null;
  secondary_logo_size: number | null;
  ministry_logo_binary: Uint8Array | null;
  ministry_logo_mime_type: string | null;
  ministry_logo_filename: string | null;
  ministry_logo_size: number | null;
  primary_logo_usage: string;
  secondary_logo_usage: string;
  ministry_logo_usage: string;
  header_text: string | null;
  table_alternating_colors: boolean;
  show_page_numbers: boolean;
  show_generation_date: boolean;
  report_logo_selection: string;
  calendar_preference: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateSchoolData {
  organization_id?: string;
  school_name: string;
  school_name_arabic?: string;
  school_name_pashto?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
  school_website?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  font_family?: string;
  calendar_preference?: string;
  primary_logo_usage?: string;
  secondary_logo_usage?: string;
  ministry_logo_usage?: string;
  primary_logo_binary?: Uint8Array;
  primary_logo_mime_type?: string;
  primary_logo_filename?: string;
  primary_logo_size?: number;
  secondary_logo_binary?: Uint8Array;
  secondary_logo_mime_type?: string;
  secondary_logo_filename?: string;
  secondary_logo_size?: number;
  ministry_logo_binary?: Uint8Array;
  ministry_logo_mime_type?: string;
  ministry_logo_filename?: string;
  ministry_logo_size?: number;
  is_active?: boolean;
}

export interface UpdateSchoolData extends Partial<CreateSchoolData> {
  id: string;
}

export const useSchools = (organizationId?: string) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['schools', organizationId || profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) return [];

      // Super admin can see all or filter by org
      const isSuperAdmin = profile.role === 'super_admin';

      let query = (supabase as any)
        .from('school_branding')
        .select('*')
        .order('school_name', { ascending: true });

      if (isSuperAdmin) {
        if (organizationId) {
          // Filter by specific organization
          query = query.eq('organization_id', organizationId);
        } else {
          // Get all organizations for super admin
          const { data: orgs } = await (supabase as any)
            .from('super_admin_organizations')
            .select('organization_id')
            .eq('super_admin_id', user.id)
            .is('deleted_at', null);

          if (orgs && orgs.length > 0) {
            const orgIds = orgs.map(o => o.organization_id);
            // Also include profile's organization_id if it exists
            if (profile.organization_id && !orgIds.includes(profile.organization_id)) {
              orgIds.push(profile.organization_id);
            }
            query = query.in('organization_id', orgIds);
          } else if (profile.organization_id) {
            // Fallback to profile's organization_id
            query = query.eq('organization_id', profile.organization_id);
          }
          // If no organizations at all, show all (super admin privilege)
        }
      } else {
        // Regular users see only their organization's schools
        const userOrgId = profile.organization_id;
        if (userOrgId) {
          query = query.eq('organization_id', userOrgId);
        } else {
          return []; // No organization assigned
        }
      }

      // Try with deleted_at filter first, fallback to without if column doesn't exist
      const { data, error } = await query.is('deleted_at', null);

      // If table doesn't exist (404) or column doesn't exist, return empty array
      if (error) {
        // Table doesn't exist yet (migrations not run)
        if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation') || (error as any).status === 404) {
          console.warn('school_branding table does not exist yet. Please run migrations.');
          return [];
        }
        // Column doesn't exist yet, retry without filter
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('deleted_at')) {
          const { data: retryData, error: retryError } = await query;
          if (retryError) {
            throw new Error(retryError.message);
          }
          return (retryData as unknown) as School[];
        }
        throw new Error(error.message);
      }

      return (data as unknown) as School[];
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useSchool = (schoolId: string) => {
  return useQuery({
    queryKey: ['school', schoolId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('school_branding')
        .select('*')
        .eq('id', schoolId);

      const { data, error } = await query.is('deleted_at', null).single();

      // If table doesn't exist (404) or column doesn't exist, return null
      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('does not exist') || error.message?.includes('relation') || (error as any).status === 404) {
          console.warn('school_branding table does not exist yet. Please run migrations.');
          return null;
        }
        // Column doesn't exist yet, retry without filter
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('deleted_at')) {
          const { data: retryData, error: retryError } = await (supabase as any)
            .from('school_branding')
            .select('*')
            .eq('id', schoolId)
            .single();
          if (retryError) {
            throw new Error(retryError.message);
          }
          return (retryData as unknown) as School;
        }
        throw new Error(error.message);
      }

      return (data as unknown) as School;
    },
    enabled: !!schoolId,
  });
};

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (schoolData: CreateSchoolData) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const isSuperAdmin = profile.role === 'super_admin';
      const isAdmin = profile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to create schools');
      }

      // If not super admin, use their organization_id
      const organizationId = schoolData.organization_id || (isSuperAdmin ? null : profile.organization_id);

      if (!isSuperAdmin && !organizationId) {
        throw new Error('Organization ID is required');
      }

      const { data, error } = await (supabase as any)
        .from('school_branding')
        .insert({
          organization_id: organizationId,
          school_name: schoolData.school_name,
          school_name_arabic: schoolData.school_name_arabic || null,
          school_name_pashto: schoolData.school_name_pashto || null,
          school_address: schoolData.school_address || null,
          school_phone: schoolData.school_phone || null,
          school_email: schoolData.school_email || null,
          school_website: schoolData.school_website || null,
          primary_color: schoolData.primary_color || '#0b0b56',
          secondary_color: schoolData.secondary_color || '#0056b3',
          accent_color: schoolData.accent_color || '#ff6b35',
          font_family: schoolData.font_family || 'Bahij Nassim',
          calendar_preference: schoolData.calendar_preference || 'gregorian',
          primary_logo_usage: schoolData.primary_logo_usage || 'header',
          secondary_logo_usage: schoolData.secondary_logo_usage || 'footer',
          ministry_logo_usage: schoolData.ministry_logo_usage || 'header',
          primary_logo_binary: schoolData.primary_logo_binary || null,
          primary_logo_mime_type: schoolData.primary_logo_mime_type || null,
          primary_logo_filename: schoolData.primary_logo_filename || null,
          primary_logo_size: schoolData.primary_logo_size || null,
          secondary_logo_binary: schoolData.secondary_logo_binary || null,
          secondary_logo_mime_type: schoolData.secondary_logo_mime_type || null,
          secondary_logo_filename: schoolData.secondary_logo_filename || null,
          secondary_logo_size: schoolData.secondary_logo_size || null,
          ministry_logo_binary: schoolData.ministry_logo_binary || null,
          ministry_logo_mime_type: schoolData.ministry_logo_mime_type || null,
          ministry_logo_filename: schoolData.ministry_logo_filename || null,
          ministry_logo_size: schoolData.ministry_logo_size || null,
          is_active: schoolData.is_active !== undefined ? schoolData.is_active : true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success('School created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create school');
    },
  });
};

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (schoolData: UpdateSchoolData) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const isSuperAdmin = profile.role === 'super_admin';
      const isAdmin = profile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to update schools');
      }

      // Get current school to verify organization access
      let checkQuery = (supabase as any)
        .from('school_branding')
        .select('organization_id')
        .eq('id', schoolData.id);

      const { data: currentSchool, error: checkError } = await checkQuery.is('deleted_at', null).single();

      // If table doesn't exist, skip the check (migrations not run)
      if (checkError && (checkError.code === 'PGRST116' || (checkError as any).status === 404 || checkError.message?.includes('does not exist'))) {
        // Table doesn't exist yet, skip validation
      } else if (checkError && (checkError.code === '42703' || checkError.message?.includes('column'))) {
        // Column doesn't exist, retry without filter
        const { data: retryData } = await (supabase as any)
          .from('school_branding')
          .select('organization_id')
          .eq('id', schoolData.id)
          .single();
        if (!retryData) {
          throw new Error('School not found');
        }
      } else if (checkError) {
        throw new Error(checkError.message);
      }

      if (!currentSchool) {
        throw new Error('School not found');
      }

      // Check organization access for admins
      if (isAdmin && !isSuperAdmin) {
        if ((currentSchool as any).organization_id !== profile.organization_id) {
          throw new Error('Cannot update school from different organization');
        }
      }

      const updateData: any = {};
      if (schoolData.school_name !== undefined) updateData.school_name = schoolData.school_name;
      if (schoolData.school_name_arabic !== undefined) updateData.school_name_arabic = schoolData.school_name_arabic;
      if (schoolData.school_name_pashto !== undefined) updateData.school_name_pashto = schoolData.school_name_pashto;
      if (schoolData.school_address !== undefined) updateData.school_address = schoolData.school_address;
      if (schoolData.school_phone !== undefined) updateData.school_phone = schoolData.school_phone;
      if (schoolData.school_email !== undefined) updateData.school_email = schoolData.school_email;
      if (schoolData.school_website !== undefined) updateData.school_website = schoolData.school_website;
      if (schoolData.primary_color !== undefined) updateData.primary_color = schoolData.primary_color;
      if (schoolData.secondary_color !== undefined) updateData.secondary_color = schoolData.secondary_color;
      if (schoolData.accent_color !== undefined) updateData.accent_color = schoolData.accent_color;
      if (schoolData.font_family !== undefined) updateData.font_family = schoolData.font_family;
      if (schoolData.calendar_preference !== undefined) updateData.calendar_preference = schoolData.calendar_preference;
      if (schoolData.primary_logo_usage !== undefined) updateData.primary_logo_usage = schoolData.primary_logo_usage;
      if (schoolData.secondary_logo_usage !== undefined) updateData.secondary_logo_usage = schoolData.secondary_logo_usage;
      if (schoolData.ministry_logo_usage !== undefined) updateData.ministry_logo_usage = schoolData.ministry_logo_usage;
      if (schoolData.primary_logo_binary !== undefined) updateData.primary_logo_binary = schoolData.primary_logo_binary;
      if (schoolData.primary_logo_mime_type !== undefined) updateData.primary_logo_mime_type = schoolData.primary_logo_mime_type;
      if (schoolData.primary_logo_filename !== undefined) updateData.primary_logo_filename = schoolData.primary_logo_filename;
      if (schoolData.primary_logo_size !== undefined) updateData.primary_logo_size = schoolData.primary_logo_size;
      if (schoolData.secondary_logo_binary !== undefined) updateData.secondary_logo_binary = schoolData.secondary_logo_binary;
      if (schoolData.secondary_logo_mime_type !== undefined) updateData.secondary_logo_mime_type = schoolData.secondary_logo_mime_type;
      if (schoolData.secondary_logo_filename !== undefined) updateData.secondary_logo_filename = schoolData.secondary_logo_filename;
      if (schoolData.secondary_logo_size !== undefined) updateData.secondary_logo_size = schoolData.secondary_logo_size;
      if (schoolData.ministry_logo_binary !== undefined) updateData.ministry_logo_binary = schoolData.ministry_logo_binary;
      if (schoolData.ministry_logo_mime_type !== undefined) updateData.ministry_logo_mime_type = schoolData.ministry_logo_mime_type;
      if (schoolData.ministry_logo_filename !== undefined) updateData.ministry_logo_filename = schoolData.ministry_logo_filename;
      if (schoolData.ministry_logo_size !== undefined) updateData.ministry_logo_size = schoolData.ministry_logo_size;
      if (schoolData.is_active !== undefined) updateData.is_active = schoolData.is_active;
      if (schoolData.organization_id !== undefined && isSuperAdmin) {
        updateData.organization_id = schoolData.organization_id;
      }

      const { data, error } = await (supabase as any)
        .from('school_branding')
        .update(updateData)
        .eq('id', schoolData.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['school'] });
      toast.success('School updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update school');
    },
  });
};

export const useDeleteSchool = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (schoolId: string) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const isSuperAdmin = profile.role === 'super_admin';
      const isAdmin = profile.role === 'admin';

      if (!isSuperAdmin && !isAdmin) {
        throw new Error('Insufficient permissions to delete schools');
      }

      // Get current school to verify organization access
      let checkQuery = (supabase as any)
        .from('school_branding')
        .select('organization_id')
        .eq('id', schoolId);

      const { data: currentSchool, error: checkError } = await checkQuery.is('deleted_at', null).single();

      // If table doesn't exist, skip the check (migrations not run)
      if (checkError && (checkError.code === 'PGRST116' || (checkError as any).status === 404 || checkError.message?.includes('does not exist'))) {
        throw new Error('School not found - table does not exist. Please run migrations.');
      } else if (checkError && (checkError.code === '42703' || checkError.message?.includes('column'))) {
        // Column doesn't exist, retry without filter
        const { data: retryData } = await (supabase as any)
          .from('school_branding')
          .select('organization_id')
          .eq('id', schoolId)
          .single();
        if (!retryData) {
          throw new Error('School not found');
        }
      } else if (checkError) {
        throw new Error(checkError.message);
      }

      if (!currentSchool) {
        throw new Error('School not found');
      }

      // Check organization access for admins
      if (isAdmin && !isSuperAdmin) {
        if ((currentSchool as any).organization_id !== profile.organization_id) {
          throw new Error('Cannot delete school from different organization');
        }
      }

      // Soft delete: set deleted_at timestamp
      const { error } = await (supabase as any)
        .from('school_branding')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', schoolId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      queryClient.invalidateQueries({ queryKey: ['school'] });
      toast.success('School deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete school');
    },
  });
};

