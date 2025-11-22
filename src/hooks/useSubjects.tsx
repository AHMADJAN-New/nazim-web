import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import type { SubjectRecord, SubjectWithTeachers } from '@/types/academics';

export interface SubjectPayload {
  name: string;
  code: string;
  description?: string | null;
  grade_level?: string | null;
  credit_hours?: number | null;
  is_core?: boolean;
  color?: string | null;
  organization_id?: string;
}

const mapSubjects = (
  subjects: SubjectRecord[],
  assignments: Array<{
    id: string;
    subject_id: string;
    class?: { id: string; name: string } | null;
    teacher?: { id: string; full_name: string | null } | null;
  }>
): SubjectWithTeachers[] => {
  const assignmentsBySubject = assignments.reduce<Record<string, SubjectWithTeachers['teachers']>>(
    (acc, assignment) => {
      if (!acc[assignment.subject_id]) {
        acc[assignment.subject_id] = [];
      }
      if (assignment.class && assignment.teacher) {
        acc[assignment.subject_id].push({
          assignmentId: assignment.id,
          classId: assignment.class.id,
          className: assignment.class.name,
          teacherId: assignment.teacher.id,
          teacherName: assignment.teacher.full_name || '—',
        });
      }
      return acc;
    },
    {}
  );

  return subjects.map((subject) => ({
    ...subject,
    teachers: assignmentsBySubject[subject.id] || [],
  }));
};

export const useSubjects = (organizationId?: string) => {
  const { profile } = useAuth();
  const orgId = organizationId ?? profile?.organization_id ?? null;

  return useQuery({
    queryKey: ['subjects', orgId],
    queryFn: async (): Promise<SubjectWithTeachers[]> => {
      if (!orgId && profile?.role !== 'super_admin') {
        return [];
      }

      let subjectsQuery = (supabase as any)
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (orgId) {
        subjectsQuery = subjectsQuery.eq('organization_id', orgId);
      }

      const { data, error } = await subjectsQuery;

      if (error) {
        throw new Error(error.message);
      }

      const subjects = (data ?? []) as SubjectRecord[];
      if (subjects.length === 0) {
        return [];
      }

      const subjectIds = subjects.map((subject) => subject.id);
      const { data: assignments, error: assignmentsError } = await (supabase as any)
        .from('class_subjects')
        .select(`
          id,
          subject_id,
          class:classes(id, name),
          teacher:staff(id, full_name)
        `)
        .in('subject_id', subjectIds);

      if (assignmentsError) {
        throw new Error(assignmentsError.message);
      }

      return mapSubjects(subjects, assignments || []);
    },
    enabled: !!profile?.role,
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: SubjectPayload) => {
      const organizationId = payload.organization_id ?? profile?.organization_id ?? null;

      if (!organizationId && profile?.role !== 'super_admin') {
        throw new Error('Organization context is required');
      }

      const finalPayload = {
        ...payload,
        organization_id: organizationId,
        is_core: payload.is_core ?? true,
      };

      const { data, error } = await (supabase as any)
        .from('subjects')
        .insert(finalPayload)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as SubjectRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create subject');
    },
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SubjectPayload & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as SubjectRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update subject');
    },
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Subject deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete subject');
    },
  });
};
