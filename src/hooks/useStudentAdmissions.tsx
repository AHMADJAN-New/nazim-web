import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export type AdmissionStatus = 'pending' | 'admitted' | 'active' | 'inactive' | 'suspended' | 'withdrawn' | 'graduated';

export interface StudentAdmission {
  id: string;
  organization_id: string;
  school_id: string | null;
  student_id: string;
  academic_year_id: string | null;
  class_id: string | null;
  class_academic_year_id: string | null;
  residency_type_id: string | null;
  room_id: string | null;
  admission_year: string | null;
  admission_date: string;
  enrollment_status: AdmissionStatus;
  enrollment_type: string | null;
  shift: string | null;
  is_boarder: boolean;
  fee_status: string | null;
  placement_notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
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
}

export interface StudentAdmissionInsert {
  organization_id?: string;
  school_id?: string | null;
  student_id: string;
  academic_year_id?: string | null;
  class_id?: string | null;
  class_academic_year_id?: string | null;
  residency_type_id?: string | null;
  room_id?: string | null;
  admission_year?: string | null;
  admission_date?: string;
  enrollment_status?: AdmissionStatus;
  enrollment_type?: string | null;
  shift?: string | null;
  is_boarder?: boolean;
  fee_status?: string | null;
  placement_notes?: string | null;
}

export interface StudentAdmissionUpdate extends Partial<StudentAdmissionInsert> {}

const buildOrganizationFilter = async (
  profile: any,
  user: any,
  organizationId?: string,
): Promise<{ column: string; value: string | string[] | null }> => {
  if (!profile) {
    return { column: 'organization_id', value: null };
  }

  const isSuperAdmin = profile.role === 'super_admin';
  if (isSuperAdmin) {
    if (organizationId) {
      return { column: 'organization_id', value: organizationId };
    }

    const { data: orgs, error } = await (supabase as any)
      .from('super_admin_organizations')
      .select('organization_id')
      .eq('super_admin_id', user?.id)
      .is('deleted_at', null);

    if (error) {
      throw new Error(error.message);
    }

    const orgIds = orgs?.map((o: any) => o.organization_id) || [];
    if (profile.organization_id && !orgIds.includes(profile.organization_id)) {
      orgIds.push(profile.organization_id);
    }

    return { column: 'organization_id', value: orgIds };
  }

  return { column: 'organization_id', value: organizationId || profile.organization_id };
};

export const useStudentAdmissions = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentAdmission[]>({
    queryKey: ['student-admissions', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) return [];

      const orgFilter = await buildOrganizationFilter(profile, user, organizationId);
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

      if (Array.isArray(orgFilter.value)) {
        query = query.in(orgFilter.column, orgFilter.value);
      } else if (orgFilter.value) {
        query = query.eq(orgFilter.column, orgFilter.value);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []) as StudentAdmission[];
    },
    enabled: !!user && !!profile,
  });
};

export const useCreateStudentAdmission = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentAdmissionInsert) => {
      const organizationId = payload.organization_id || profile?.organization_id;
      if (!organizationId && profile?.role !== 'super_admin') {
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

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StudentAdmissionUpdate }) => {
      const { error } = await (supabase as any)
        .from('student_admissions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);

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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('student_admissions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);
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
