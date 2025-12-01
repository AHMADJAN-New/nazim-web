import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useProfile } from './useProfiles';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { schoolsApi } from '@/lib/api/client';

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
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery({
    queryKey: ['schools', organizationId || profile?.organization_id, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile || orgsLoading) return [];

      // Fetch schools from Laravel API
      const schools = await schoolsApi.list({
        organization_id: organizationId,
      });
      
      // Sort by school_name
      return (schools as School[]).sort((a, b) => 
        a.school_name.localeCompare(b.school_name)
      );
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
      // Fetch school from Laravel API
      const school = await schoolsApi.get(schoolId);
      return school as School;
    },
    enabled: !!schoolId,
  });
};

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { orgIds } = useAccessibleOrganizations();

  return useMutation({
    mutationFn: async (schoolData: CreateSchoolData) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      const isAdmin = profile.role === 'admin';
      if (!isAdmin && profile.role !== 'super_admin') {
        throw new Error('Insufficient permissions to create schools');
      }

      const organizationId = schoolData.organization_id || profile.organization_id;
      if (!organizationId) {
        throw new Error('Organization ID is required');
      }
      if (!orgIds.includes(organizationId)) {
        throw new Error('Cannot create school for a non-accessible organization');
      }

      // Create school via Laravel API
      const school = await schoolsApi.create({
        organization_id: organizationId,
        school_name: schoolData.school_name,
        school_name_arabic: schoolData.school_name_arabic,
        school_name_pashto: schoolData.school_name_pashto,
        school_address: schoolData.school_address,
        school_phone: schoolData.school_phone,
        school_email: schoolData.school_email,
        school_website: schoolData.school_website,
        primary_color: schoolData.primary_color,
        secondary_color: schoolData.secondary_color,
        accent_color: schoolData.accent_color,
        font_family: schoolData.font_family,
        calendar_preference: schoolData.calendar_preference,
        primary_logo_usage: schoolData.primary_logo_usage,
        secondary_logo_usage: schoolData.secondary_logo_usage,
        ministry_logo_usage: schoolData.ministry_logo_usage,
        is_active: schoolData.is_active,
      });

      return school as School;
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
  const { user, profile } = useAuth();

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

      // Build update data (exclude id and organization_id from update)
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
      if (schoolData.is_active !== undefined) updateData.is_active = schoolData.is_active;

      // Update school via Laravel API
      const school = await schoolsApi.update(schoolData.id, updateData);
      return school as School;
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
  const { user, profile } = useAuth();

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

      // Delete school via Laravel API (soft delete)
      await schoolsApi.delete(schoolId);
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

