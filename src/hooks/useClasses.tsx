import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import type { AcademicClass, ClassWithTeachers } from '@/types/academics';

export interface ClassPayload {
  name: string;
  code: string;
  grade_level?: string | null;
  section?: string | null;
  description?: string | null;
  status?: AcademicClass['status'];
  school_id?: string | null;
  homeroom_teacher_id?: string | null;
  organization_id?: string;
}

const mapClassesWithTeachers = (
  classes: AcademicClass[],
  assignments: Array<{
    id: string;
    class_id: string;
    subject_id: string;
    subject?: { id: string; name: string; color: string | null } | null;
    teacher?: { id: string; full_name: string | null } | null;
  }>
): ClassWithTeachers[] => {
  const assignmentsByClass = assignments.reduce<Record<string, ClassWithTeachers['teacherAssignments']>>(
    (acc, assignment) => {
      if (!acc[assignment.class_id]) {
        acc[assignment.class_id] = [];
      }
      if (assignment.subject && assignment.teacher) {
        acc[assignment.class_id].push({
          assignmentId: assignment.id,
          subjectId: assignment.subject.id,
          subjectName: assignment.subject.name,
          subjectColor: assignment.subject.color || null,
          teacherId: assignment.teacher.id,
          teacherName: assignment.teacher.full_name || '—',
        });
      }
      return acc;
    },
    {}
  );

  return classes.map((cls) => ({
    ...cls,
    teacherAssignments: assignmentsByClass[cls.id] || [],
  }));
};

export const useClasses = (organizationId?: string) => {
  const { profile } = useAuth();
  const orgId = organizationId ?? profile?.organization_id ?? null;

  return useQuery({
    queryKey: ['classes', orgId],
    queryFn: async (): Promise<ClassWithTeachers[]> => {
      if (!orgId && profile?.role !== 'super_admin') {
        return [];
      }

      let classesQuery = (supabase as any)
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (orgId) {
        classesQuery = classesQuery.eq('organization_id', orgId);
      }

      const { data, error } = await classesQuery;

      if (error) {
        throw new Error(error.message);
      }

      const classes = (data ?? []) as AcademicClass[];
      if (classes.length === 0) {
        return [];
      }

      const classIds = classes.map((cls) => cls.id);
      const { data: assignmentData, error: assignmentError } = await (supabase as any)
        .from('class_subjects')
        .select(`
          id,
          class_id,
          subject_id,
          subject:subjects(id, name, color),
          teacher:staff(id, full_name)
        `)
        .in('class_id', classIds);

      if (assignmentError) {
        throw new Error(assignmentError.message);
      }

      return mapClassesWithTeachers(classes, assignmentData || []);
    },
    enabled: !!profile?.role,
  });
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: ClassPayload) => {
      const organizationId = payload.organization_id ?? profile?.organization_id ?? null;

      if (!organizationId && profile?.role !== 'super_admin') {
        throw new Error('Organization context is required');
      }

      const finalPayload = {
        ...payload,
        organization_id: organizationId,
      };

      const { data, error } = await (supabase as any)
        .from('classes')
        .insert(finalPayload)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as AcademicClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create class');
    },
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClassPayload & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('classes')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as AcademicClass;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update class');
    },
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast.success('Class deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete class');
    },
  });
};
