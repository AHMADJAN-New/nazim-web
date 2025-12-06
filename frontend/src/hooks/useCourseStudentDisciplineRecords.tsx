import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { courseStudentDisciplineRecordsApi } from '@/lib/api/client';

export interface DisciplineRecord {
  id: string;
  courseStudentId: string;
  courseId: string;
  organizationId: string;
  incidentDate: string;
  incidentType: string;
  description?: string | null;
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  actionTaken?: string | null;
  resolved: boolean;
  resolvedDate?: string | null;
  resolvedBy?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiDisciplineRecord {
  id: string;
  course_student_id: string;
  course_id: string;
  organization_id: string;
  incident_date: string;
  incident_type: string;
  description?: string | null;
  severity: 'minor' | 'moderate' | 'major' | 'severe';
  action_taken?: string | null;
  resolved: boolean;
  resolved_date?: string | null;
  resolved_by?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

const mapApiToDomain = (api: ApiDisciplineRecord): DisciplineRecord => ({
  id: api.id,
  courseStudentId: api.course_student_id,
  courseId: api.course_id,
  organizationId: api.organization_id,
  incidentDate: api.incident_date,
  incidentType: api.incident_type,
  description: api.description,
  severity: api.severity,
  actionTaken: api.action_taken,
  resolved: api.resolved,
  resolvedDate: api.resolved_date,
  resolvedBy: api.resolved_by,
  createdBy: api.created_by,
  createdAt: api.created_at,
  updatedAt: api.updated_at,
});

export const useCourseStudentDisciplineRecords = (courseStudentId: string) => {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ['course-student-discipline-records', courseStudentId],
    queryFn: async () => {
      if (!user || !profile) return [];
      const records = await courseStudentDisciplineRecordsApi.list(courseStudentId);
      return (records as ApiDisciplineRecord[]).map(mapApiToDomain);
    },
    enabled: !!user && !!profile && !!courseStudentId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateDisciplineRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ courseStudentId, data }: { courseStudentId: string; data: {
      incident_date: string;
      incident_type: string;
      description?: string;
      severity: 'minor' | 'moderate' | 'major' | 'severe';
      action_taken?: string;
    }}) => {
      const result = await courseStudentDisciplineRecordsApi.create(courseStudentId, data);
      return mapApiToDomain(result as ApiDisciplineRecord);
    },
    onSuccess: (_data, variables) => {
      toast.success('Discipline record created');
      void queryClient.invalidateQueries({ queryKey: ['course-student-discipline-records', variables.courseStudentId] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not create record'),
  });
};

export const useUpdateDisciplineRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{
      incident_date: string;
      incident_type: string;
      description: string;
      severity: 'minor' | 'moderate' | 'major' | 'severe';
      action_taken: string;
    }>}) => {
      const result = await courseStudentDisciplineRecordsApi.update(id, data);
      return mapApiToDomain(result as ApiDisciplineRecord);
    },
    onSuccess: () => {
      toast.success('Discipline record updated');
      void queryClient.invalidateQueries({ queryKey: ['course-student-discipline-records'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not update record'),
  });
};

export const useDeleteDisciplineRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await courseStudentDisciplineRecordsApi.delete(id);
      return id;
    },
    onSuccess: () => {
      toast.success('Discipline record deleted');
      void queryClient.invalidateQueries({ queryKey: ['course-student-discipline-records'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete record'),
  });
};

export const useResolveDisciplineRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolvedDate }: { id: string; resolvedDate?: string }) => {
      const result = await courseStudentDisciplineRecordsApi.resolve(id);
      return mapApiToDomain(result as ApiDisciplineRecord);
    },
    onSuccess: () => {
      toast.success('Discipline record resolved');
      void queryClient.invalidateQueries({ queryKey: ['course-student-discipline-records'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not resolve record'),
  });
};
