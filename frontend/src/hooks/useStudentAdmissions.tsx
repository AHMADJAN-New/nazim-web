import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Custom enum type for stricter validation
export type AdmissionStatus = 'pending' | 'admitted' | 'active' | 'inactive' | 'suspended' | 'withdrawn' | 'graduated';

// Use generated type from database schema, extended with relations
export type StudentAdmission = Tables<'student_admissions'> & {
  student?: {
    id: string;
    full_name: string;
    admission_no: string;
    gender: string | null;
    admission_year: string | null;
    guardian_phone: string | null;
  };
  academic_year?: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
  };
  class?: {
    id: string;
    name: string;
    grade_level: number | null;
  };
  class_academic_year?: {
    id: string;
    section_name: string | null;
  };
  residency_type?: {
    id: string;
    name: string;
  };
  room?: {
    id: string;
    room_number: string;
  };
  school?: {
    id: string;
    school_name: string;
  };
};
export type StudentAdmissionInsert = TablesInsert<'student_admissions'>;
export type StudentAdmissionUpdate = TablesUpdate<'student_admissions'>;

const buildOrganizationFilter = async (
  profile: any,
  accessibleOrgIds: string[],
  organizationId?: string,
): Promise<{ column: string; value: string[] }> => {
  if (!profile) {
    return { column: 'organization_id', value: [] };
  }

  if (organizationId) {
    if (accessibleOrgIds.length === 0 || !accessibleOrgIds.includes(organizationId)) {
      return { column: 'organization_id', value: [] };
    }
    return { column: 'organization_id', value: [organizationId] };
  }

  return { column: 'organization_id', value: accessibleOrgIds };
};

export const useStudentAdmissions = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<StudentAdmission[]>({
    queryKey: ['student-admissions', organizationId ?? profile?.organization_id ?? null, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile) return [];
      if (orgsLoading) return [];

      const orgFilter = await buildOrganizationFilter(profile, orgIds, organizationId);
      console.log('[useStudentAdmissions] Organization filter:', orgFilter);
      console.log('[useStudentAdmissions] Profile:', { id: profile.id, organization_id: profile.organization_id, role: profile.role });
      
      // Try with nested relations first
      let query = (supabase as any)
        .from('student_admissions')
        .select(`
          *,
          school:school_branding(id, school_name),
          student:students(id, full_name, admission_no, gender, admission_year, guardian_phone),
          academic_year:academic_years(id, name, start_date, end_date),
          class:classes(id, name, grade_level),
          class_academic_year:class_academic_years(id, section_name),
          residency_type:residency_types(id, name),
          room:rooms(id, room_number)
        `)
        .is('deleted_at', null)
        .order('admission_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (orgFilter.value.length === 0) {
        console.log('[useStudentAdmissions] No accessible organizations, returning empty list');
        return [];
      }

      console.log('[useStudentAdmissions] Applying IN filter:', orgFilter.column, orgFilter.value);
      query = query.in(orgFilter.column, orgFilter.value);

      const { data, error } = await query;
      if (error) {
        console.error('[useStudentAdmissions] Query error:', error);
        console.error('[useStudentAdmissions] Error details:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Failed to fetch student admissions');
      }
      console.log('[useStudentAdmissions] Query successful, returned', data?.length || 0, 'admissions');
      if (data && data.length > 0) {
        console.log('[useStudentAdmissions] Sample admission:', JSON.stringify(data[0], null, 2));
      }
      return (data || []) as StudentAdmission[];
    },
    enabled: !!user && !!profile && !orgsLoading,
  });
};

export const useCreateStudentAdmission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentAdmissionInsert) => {
      const organizationId = payload.organization_id || profile?.organization_id;
      if (!organizationId) {
        throw new Error('Organization is required to admit a student');
      }

      const insertData = {
        ...payload,
        organization_id: organizationId,
        school_id: payload.school_id || null,
        admission_date: payload.admission_date || new Date().toISOString().slice(0, 10),
        enrollment_status: payload.enrollment_status || 'admitted',
        is_boarder: payload.is_boarder ?? false,
      };

      const { data, error } = await (supabase as any)
        .from('student_admissions')
        .insert(insertData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as StudentAdmission;
    },
    onSuccess: () => {
      toast.success('Student admitted');
      void queryClient.invalidateQueries({ queryKey: ['student-admissions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to admit student');
    },
  });
};

export const useUpdateStudentAdmission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StudentAdmissionUpdate }) => {
      if (!profile) throw new Error('User not authenticated');

      let query = (supabase as any)
        .from('student_admissions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (profile.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }

      const { error } = await query;

      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      toast.success('Admission updated');
      void queryClient.invalidateQueries({ queryKey: ['student-admissions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update admission');
    },
  });
};

export const useDeleteStudentAdmission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile) {
        throw new Error('Organization is required to remove admission');
      }

      // Soft delete: set deleted_at timestamp
      // UPDATE policy allows this without strict super admin checks
      let query = (supabase as any)
        .from('student_admissions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null); // Only update rows that aren't already deleted

      if (profile.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }

      const { data, error } = await query.select();
      if (error) {
        // Detailed logging to help diagnose any remaining RLS issues
        // eslint-disable-next-line no-console
        console.error('[useDeleteStudentAdmission] Delete error:', {
          error,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint,
          code: (error as any).code,
          admissionId: id,
          profileRole: profile?.role,
          profileOrgId: profile?.organization_id,
        });
        throw new Error(error.message || 'Failed to remove admission');
      }

      // Optional debug logging
      if (data && (data as any[]).length > 0) {
        // eslint-disable-next-line no-console
        console.log('[useDeleteStudentAdmission] Successfully soft-deleted admission:', (data as any[])[0].id);
      }

      return id;
    },
    onSuccess: () => {
      toast.success('Admission removed');
      void queryClient.invalidateQueries({ queryKey: ['student-admissions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove admission');
    },
  });
};

export const useAdmissionStats = (organizationId?: string) => {
  const { data: admissions, isLoading } = useStudentAdmissions(organizationId);

  const stats = (admissions || []).reduce(
    (acc, admission) => {
      acc.total += 1;
      acc.active += admission.enrollment_status === 'active' ? 1 : 0;
      acc.pending += admission.enrollment_status === 'pending' || admission.enrollment_status === 'admitted' ? 1 : 0;
      acc.boarders += admission.is_boarder ? 1 : 0;
      return acc;
    },
    { total: 0, active: 0, pending: 0, boarders: 0 },
  );

  return { stats, isLoading };
};
