import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import type { SubjectTeacherAssignment } from '@/types/academics';

export interface AssignmentPayload {
  class_id: string;
  subject_id: string;
  teacher_staff_id: string;
  room_id?: string | null;
  schedule_slot?: string | null;
  notes?: string | null;
  organization_id?: string;
}

interface AssignmentFilters {
  classId?: string;
  subjectId?: string;
}

export const useSubjectAssignments = (filters?: AssignmentFilters) => {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? null;

  return useQuery({
    queryKey: ['class-subjects', orgId, filters?.classId, filters?.subjectId],
    queryFn: async (): Promise<SubjectTeacherAssignment[]> => {
      if (!orgId && profile?.role !== 'super_admin') {
        return [];
      }

      let query = (supabase as any)
        .from('class_subjects')
        .select(`
          id,
          organization_id,
          class_id,
          subject_id,
          teacher_staff_id,
          room_id,
          schedule_slot,
          notes,
          created_at,
          updated_at,
          class:classes(id, name, code, grade_level, section),
          subject:subjects(id, name, code, grade_level, color),
          teacher:staff(id, full_name, employee_id)
        `)
        .order('created_at', { ascending: false });

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      if (filters?.classId) {
        query = query.eq('class_id', filters.classId);
      }

      if (filters?.subjectId) {
        query = query.eq('subject_id', filters.subjectId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as SubjectTeacherAssignment[];
    },
    enabled: !!profile?.role,
  });
};

const invalidateAcademicQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
  queryClient.invalidateQueries({ queryKey: ['classes'] });
  queryClient.invalidateQueries({ queryKey: ['subjects'] });
};

export const useCreateSubjectAssignment = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: AssignmentPayload) => {
      const organizationId = payload.organization_id ?? profile?.organization_id ?? null;

      if (!organizationId && profile?.role !== 'super_admin') {
        throw new Error('Organization context is required');
      }

      if (!payload.teacher_staff_id) {
        throw new Error('Teacher is required for assignment');
      }

      const finalPayload = {
        ...payload,
        organization_id: organizationId,
      };

      const { data, error } = await (supabase as any)
        .from('class_subjects')
        .insert(finalPayload)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as SubjectTeacherAssignment;
    },
    onSuccess: () => {
      invalidateAcademicQueries(queryClient);
      toast.success('Subject assigned to teacher');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign subject');
    },
  });
};

export const useUpdateSubjectAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AssignmentPayload & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('class_subjects')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as SubjectTeacherAssignment;
    },
    onSuccess: () => {
      invalidateAcademicQueries(queryClient);
      toast.success('Assignment updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update assignment');
    },
  });
};

export const useDeleteSubjectAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('class_subjects')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      invalidateAcademicQueries(queryClient);
      toast.success('Assignment removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove assignment');
    },
  });
};
