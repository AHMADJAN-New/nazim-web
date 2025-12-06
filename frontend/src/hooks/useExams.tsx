import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { examsApi, examClassesApi, examSubjectsApi } from '@/lib/api/client';
import type * as ExamApi from '@/types/api/exam';
import type { Exam, ExamClass, ExamSubject, ExamReport } from '@/types/domain/exam';
import {
  mapExamApiToDomain,
  mapExamClassApiToDomain,
  mapExamSubjectApiToDomain,
  mapExamDomainToInsert,
  mapExamDomainToUpdate,
  mapExamReportApiToDomain,
} from '@/mappers/examMapper';

export const useExams = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<Exam[]>({
    queryKey: ['exams', organizationId || profile?.organization_id, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile || orgsLoading) return [];
      const params: { organization_id?: string } = {};
      if (organizationId) {
        params.organization_id = organizationId;
      }
      const apiExams = await examsApi.list(params);
      return (apiExams as ExamApi.Exam[]).map(mapExamApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateExam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Exam>) => examsApi.create(mapExamDomainToInsert(payload)),
    onSuccess: () => {
      toast.success('Exam created successfully');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create exam');
    },
  });
};

export const useUpdateExam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Exam> }) => examsApi.update(id, mapExamDomainToUpdate(data)),
    onSuccess: () => {
      toast.success('Exam updated successfully');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update exam');
    },
  });
};

export const useDeleteExam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examsApi.delete(id),
    onSuccess: () => {
      toast.success('Exam deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['exam-classes'] });
      queryClient.invalidateQueries({ queryKey: ['exam-subjects'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete exam');
    },
  });
};

export const useExamClasses = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamClass[]>({
    queryKey: ['exam-classes', examId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return [];
      const apiExamClasses = await examClassesApi.list({ exam_id: examId });
      return (apiExamClasses as ExamApi.ExamClass[]).map(mapExamClassApiToDomain);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useAssignClassToExam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { exam_id: string; class_academic_year_id: string }) => examClassesApi.create(payload),
    onSuccess: (data: ExamApi.ExamClass) => {
      toast.success('Class assigned to exam');
      queryClient.invalidateQueries({ queryKey: ['exam-classes', data.exam_id] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to assign class');
    },
  });
};

export const useRemoveClassFromExam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examClassesApi.delete(id),
    onSuccess: (_data, id) => {
      toast.success('Class removed from exam');
      queryClient.invalidateQueries({ queryKey: ['exam-classes'] });
      queryClient.invalidateQueries({ queryKey: ['exam-subjects'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove class');
    },
  });
};

export const useExamSubjects = (examId?: string, examClassId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamSubject[]>({
    queryKey: ['exam-subjects', examId, examClassId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return [];
      const params: { exam_id: string; exam_class_id?: string } = { exam_id: examId };
      if (examClassId) {
        params.exam_class_id = examClassId;
      }
      const apiExamSubjects = await examSubjectsApi.list(params);
      return (apiExamSubjects as ExamApi.ExamSubject[]).map(mapExamSubjectApiToDomain);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useExamReport = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamReport>({
    queryKey: ['exam-report', examId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) throw new Error('Missing exam');
      const report = await examsApi.report(examId);
      return mapExamReportApiToDomain(report as ExamApi.ExamReport);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useEnrollSubjectToExam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      exam_id: string;
      exam_class_id: string;
      class_subject_id: string;
      total_marks?: number | null;
      passing_marks?: number | null;
      scheduled_at?: string | null;
    }) => examSubjectsApi.create(payload),
    onSuccess: (data: ExamApi.ExamSubject) => {
      toast.success('Subject enrolled for exam');
      queryClient.invalidateQueries({ queryKey: ['exam-subjects', data.exam_id] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to enroll subject');
    },
  });
};

export const useRemoveExamSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => examSubjectsApi.delete(id),
    onSuccess: () => {
      toast.success('Subject removed from exam');
      queryClient.invalidateQueries({ queryKey: ['exam-subjects'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove subject');
    },
  });
};

export const useUpdateExamSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { total_marks?: number | null; passing_marks?: number | null; scheduled_at?: string | null };
    }) => examSubjectsApi.update(id, data),
    onSuccess: () => {
      toast.success('Exam subject updated');
      queryClient.invalidateQueries({ queryKey: ['exam-subjects'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update subject');
    },
  });
};
