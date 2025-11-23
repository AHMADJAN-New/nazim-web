import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export type StudentStatus = 'applied' | 'admitted' | 'active' | 'withdrawn';
export type AdmissionFeeStatus = 'paid' | 'pending' | 'waived' | 'partial';
export type Gender = 'male' | 'female';

export interface Student {
  id: string;
  organization_id: string;
  school_id: string | null;
  card_number: string | null;
  admission_no: string;
  full_name: string;
  father_name: string;
  grandfather_name: string | null;
  mother_name: string | null;
  gender: Gender;
  birth_year: string | null;
  birth_date: string | null;
  age: number | null;
  admission_year: string | null;
  orig_province: string | null;
  orig_district: string | null;
  orig_village: string | null;
  curr_province: string | null;
  curr_district: string | null;
  curr_village: string | null;
  nationality: string | null;
  preferred_language: string | null;
  previous_school: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_phone: string | null;
  guardian_tazkira: string | null;
  guardian_picture_path: string | null;
  home_address: string | null;
  zamin_name: string | null;
  zamin_phone: string | null;
  zamin_tazkira: string | null;
  zamin_address: string | null;
  applying_grade: string | null;
  is_orphan: boolean;
  admission_fee_status: AdmissionFeeStatus;
  student_status: StudentStatus;
  disability_status: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  family_income: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentInsert {
  organization_id?: string;
  school_id?: string | null;
  card_number?: string | null;
  admission_no: string;
  full_name: string;
  father_name: string;
  grandfather_name?: string | null;
  mother_name?: string | null;
  gender: Gender;
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
  admission_fee_status?: AdmissionFeeStatus;
  student_status?: StudentStatus;
  disability_status?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  family_income?: string | null;
}

const buildOrganizationFilter = async (
  profile: any,
  user: any,
  organizationId?: string
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

export const useStudents = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Student[]>({
    queryKey: ['students', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) return [];

      const orgFilter = await buildOrganizationFilter(profile, user, organizationId);
      let query = (supabase as any)
        .from('students')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (Array.isArray(orgFilter.value)) {
        query = query.in(orgFilter.column, orgFilter.value);
      } else if (orgFilter.value) {
        query = query.eq(orgFilter.column, orgFilter.value);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []) as Student[];
    },
    enabled: !!user && !!profile,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentInsert) => {
      const organizationId = payload.organization_id || profile?.organization_id;
      if (!organizationId) {
        throw new Error('Organization is required to create a student');
      }

      const insertData = {
        ...payload,
        organization_id: organizationId,
        is_orphan: payload.is_orphan ?? false,
        admission_fee_status: payload.admission_fee_status ?? 'pending',
        student_status: payload.student_status ?? 'active',
      };

      const { data, error } = await (supabase as any)
        .from('students')
        .insert(insertData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Student;
    },
    onSuccess: () => {
      toast.success('Student registered successfully');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to register student');
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentInsert> }) => {
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required to update student');
      }

      let query = (supabase as any)
        .from('students')
        .update({ ...data, organization_id: data.organization_id || profile?.organization_id })
        .eq('id', id)
        .is('deleted_at', null);

      if (profile.role !== 'super_admin') {
        query = query.eq('organization_id', profile.organization_id);
      }

      const { data: updated, error } = await query.select().single();

      if (error) throw new Error(error.message);
      return updated as Student;
    },
    onSuccess: () => {
      toast.success('Student information updated');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update student');
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required to delete student');
      }

      let query = (supabase as any)
        .from('students')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (profile.role !== 'super_admin') {
        query = query.eq('organization_id', profile.organization_id);
      }

      const { error } = await query;
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      toast.success('Student removed');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove student');
    },
  });
};

export const useStudentStats = (organizationId?: string) => {
  const { data: students, isLoading } = useStudents(organizationId);

  const stats = (students || []).reduce(
    (acc, student) => {
      acc.total += 1;
      if (student.gender === 'male') acc.male += 1;
      if (student.gender === 'female') acc.female += 1;
      if (student.is_orphan) acc.orphans += 1;
      if (student.admission_fee_status !== 'paid') acc.feePending += 1;
      return acc;
    },
    { total: 0, male: 0, female: 0, orphans: 0, feePending: 0 }
  );

  return { data: stats, isLoading };
};

export const useSyncStudentOrg = (organizationId?: string) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  useEffect(() => {
    const effectiveOrg = organizationId || profile?.organization_id || null;
    void queryClient.invalidateQueries({ queryKey: ['students', effectiveOrg] });
  }, [organizationId, profile?.organization_id, queryClient]);
};
