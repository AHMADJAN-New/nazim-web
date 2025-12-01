import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { studentAdmissionsApi } from '@/lib/api/client';

// Custom enum type for stricter validation
export type AdmissionStatus = 'pending' | 'admitted' | 'active' | 'inactive' | 'suspended' | 'withdrawn' | 'graduated';

// Student Admission interface matching the database schema with relations
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
  deleted_at: string | null;
  student?: {
    id: string;
    full_name: string;
    admission_no: string;
    gender: string | null;
    admission_year: string | null;
    guardian_phone: string | null;
  };
  organization?: {
    id: string;
    name: string;
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
}

export type StudentAdmissionUpdate = Partial<StudentAdmissionInsert>;

export const useStudentAdmissions = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentAdmission[]>({
    queryKey: ['student-admissions', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) return [];

      try {
        const effectiveOrgId = organizationId || profile.organization_id;
        console.log('[useStudentAdmissions] Fetching admissions for organization:', effectiveOrgId);

        const admissions = await studentAdmissionsApi.list({
          organization_id: effectiveOrgId || undefined,
        });

        console.log('[useStudentAdmissions] Fetched', (admissions as StudentAdmission[]).length, 'admissions');
        return admissions as StudentAdmission[];
      } catch (error) {
        console.error('[useStudentAdmissions] Error fetching admissions:', error);
        throw error;
      }
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
      if (!organizationId) {
        throw new Error('Organization is required to admit a student');
      }

      const insertData = {
        ...payload,
        organization_id: organizationId,
        admission_date: payload.admission_date || new Date().toISOString().slice(0, 10),
        enrollment_status: payload.enrollment_status || 'admitted',
        is_boarder: payload.is_boarder ?? false,
      };

      const admission = await studentAdmissionsApi.create(insertData);
      return admission as StudentAdmission;
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

      const updated = await studentAdmissionsApi.update(id, data);
      return updated as StudentAdmission;
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
        throw new Error('User not authenticated');
      }

      await studentAdmissionsApi.delete(id);
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

export interface AdmissionStats {
  total: number;
  active: number;
  pending: number;
  boarders: number;
}

export const useAdmissionStats = (organizationId?: string) => {
  const { user, profile } = useAuth();

  const { data: stats, isLoading } = useQuery<AdmissionStats>({
    queryKey: ['student-admissions-stats', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) {
        return { total: 0, active: 0, pending: 0, boarders: 0 };
      }

      const effectiveOrgId = organizationId || profile.organization_id;
      const result = await studentAdmissionsApi.stats({
        organization_id: effectiveOrgId || undefined,
      });

      return result as AdmissionStats;
    },
    enabled: !!user && !!profile,
  });

  return { stats: stats || { total: 0, active: 0, pending: 0, boarders: 0 }, isLoading };
};
