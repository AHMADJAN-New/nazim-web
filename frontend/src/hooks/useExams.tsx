import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
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
      try {
        const params: { organization_id?: string } = {};
        if (organizationId) {
          params.organization_id = organizationId;
        }
        const apiExams = await examsApi.list(params);
        return (apiExams as ExamApi.Exam[]).map(mapExamApiToDomain);
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error('[useExams] Error fetching exams:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateExam = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (payload: { name: string; academicYearId: string; description?: string; startDate?: Date; endDate?: Date }) => {
      const insertData = mapExamDomainToInsert(payload as Partial<Exam>);
      return examsApi.create(insertData);
    },
    onSuccess: () => {
      showToast.success(t('toast.examCreated') || 'Exam created successfully');
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examCreateFailed') || 'Failed to create exam');
    },
  });
};

export const useUpdateExam = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Exam> }) => examsApi.update(id, mapExamDomainToUpdate(data)),
    onSuccess: () => {
      showToast.success(t('toast.examUpdated') || 'Exam updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examUpdateFailed') || 'Failed to update exam');
    },
  });
};

export const useDeleteExam = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (id: string) => examsApi.delete(id),
    onSuccess: async () => {
      showToast.success(t('toast.examDeleted') || 'Exam deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['exams'] });
      await queryClient.refetchQueries({ queryKey: ['exams'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examDeleteFailed') || 'Failed to delete exam');
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
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (payload: { exam_id: string; class_academic_year_id: string }) => examClassesApi.create(payload),
    onSuccess: (data: ExamApi.ExamClass) => {
      showToast.success(t('toast.classAssigned') || 'Class assigned to exam');
      void queryClient.invalidateQueries({ queryKey: ['exam-classes', data.exam_id] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.classAssignFailed') || 'Failed to assign class');
    },
  });
};

export const useRemoveClassFromExam = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (id: string) => examClassesApi.delete(id),
    onSuccess: async () => {
      showToast.success(t('toast.classRemoved') || 'Class removed from exam');
      await queryClient.invalidateQueries({ queryKey: ['exam-classes'] });
      await queryClient.invalidateQueries({ queryKey: ['exam-subjects'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.classRemoveFailed') || 'Failed to remove class');
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
  const { t } = useLanguage();
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
      showToast.success(t('toast.subjectEnrolled') || 'Subject enrolled for exam');
      void queryClient.invalidateQueries({ queryKey: ['exam-subjects', data.exam_id] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.subjectEnrollFailed') || 'Failed to enroll subject');
    },
  });
};

export const useRemoveExamSubject = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (id: string) => examSubjectsApi.delete(id),
    onSuccess: async () => {
      showToast.success(t('toast.subjectRemoved') || 'Subject removed from exam');
      await queryClient.invalidateQueries({ queryKey: ['exam-subjects'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.subjectRemoveFailed') || 'Failed to remove subject');
    },
  });
};

export const useUpdateExamSubject = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { total_marks?: number | null; passing_marks?: number | null; scheduled_at?: string | null };
    }) => examSubjectsApi.update(id, data),
    onSuccess: () => {
      showToast.success(t('toast.examSubjectUpdated') || 'Exam subject updated');
      void queryClient.invalidateQueries({ queryKey: ['exam-subjects'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examSubjectUpdateFailed') || 'Failed to update subject');
    },
  });
};


// ========== Exam Students Hooks ==========

export const useExamStudents = (examId?: string, examClassId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['exam-students', examId, examClassId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) return [];
      const params: { exam_id?: string; exam_class_id?: string } = {};
      if (examId) params.exam_id = examId;
      if (examClassId) params.exam_class_id = examClassId;
      const { examStudentsApi } = await import('@/lib/api/client');
      const { mapExamStudentApiToDomain } = await import('@/mappers/examMapper');
      const apiExamStudents = await examStudentsApi.list(params);
      return (apiExamStudents as any[]).map(mapExamStudentApiToDomain);
    },
    enabled: !!user && !!profile && (!!examId || !!examClassId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useEnrollStudent = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: { exam_id: string; exam_class_id: string; student_admission_id: string }) => {
      const { examStudentsApi } = await import('@/lib/api/client');
      return examStudentsApi.create(data);
    },
    onSuccess: () => {
      showToast.success(t('toast.studentEnrolled') || 'Student enrolled successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-students'] });
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.studentEnrollFailed') || 'Failed to enroll student');
    },
  });
};

export const useBulkEnrollStudents = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: { exam_id: string; exam_class_id: string }) => {
      const { examStudentsApi } = await import('@/lib/api/client');
      return examStudentsApi.bulkEnroll(data);
    },
    onSuccess: (data: any) => {
      const enrolledCount = data?.enrolled_count || 0;
      const skippedCount = data?.skipped_count || 0;
      const message = skippedCount > 0 
        ? t('toast.studentsEnrolledWithSkipped', { enrolled: enrolledCount, skipped: skippedCount }) || `${enrolledCount} students enrolled. ${skippedCount} already enrolled.`
        : t('toast.studentsEnrolled', { count: enrolledCount }) || `${enrolledCount} students enrolled.`;
      showToast.success(message);
      void queryClient.invalidateQueries({ queryKey: ['exam-students'] });
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.studentsEnrollFailed') || 'Failed to enroll students');
    },
  });
};

export const useRemoveStudentFromExam = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      const { examStudentsApi } = await import('@/lib/api/client');
      return examStudentsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.studentRemoved') || 'Student removed from exam');
      await queryClient.invalidateQueries({ queryKey: ['exam-students'] });
      await queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.studentRemoveFailed') || 'Failed to remove student');
    },
  });
};

// ========== Exam Results Hooks ==========

export const useExamResults = (examId?: string, examSubjectId?: string, examStudentId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['exam-results', examId, examSubjectId, examStudentId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) return [];
      const params: { exam_id?: string; exam_subject_id?: string; exam_student_id?: string } = {};
      if (examId) params.exam_id = examId;
      if (examSubjectId) params.exam_subject_id = examSubjectId;
      if (examStudentId) params.exam_student_id = examStudentId;
      const { examResultsApi } = await import('@/lib/api/client');
      const { mapExamResultApiToDomain } = await import('@/mappers/examMapper');
      const apiExamResults = await examResultsApi.list(params);
      return (apiExamResults as any[]).map(mapExamResultApiToDomain);
    },
    enabled: !!user && !!profile && (!!examId || !!examSubjectId || !!examStudentId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useSaveExamResult = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: {
      exam_id: string;
      exam_subject_id: string;
      exam_student_id: string;
      marks_obtained?: number | null;
      is_absent?: boolean;
      remarks?: string | null;
    }) => {
      const { examResultsApi } = await import('@/lib/api/client');
      return examResultsApi.create(data);
    },
    onSuccess: () => {
      showToast.success(t('toast.examResultSaved') || 'Result saved successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examResultSaveFailed') || 'Failed to save result');
    },
  });
};

export const useBulkSaveExamResults = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (data: {
      exam_id: string;
      exam_subject_id: string;
      results: Array<{
        exam_student_id: string;
        marks_obtained?: number | null;
        is_absent?: boolean;
        remarks?: string | null;
      }>;
    }) => {
      const { examResultsApi } = await import('@/lib/api/client');
      return examResultsApi.bulkStore(data);
    },
    onSuccess: (data: any) => {
      const createdCount = data?.created_count || 0;
      const updatedCount = data?.updated_count || 0;
      const total = createdCount + updatedCount;
      showToast.success(t('toast.examResultsSaved', { count: total }) || `${total} results saved successfully`);
      void queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examResultsSaveFailed') || 'Failed to save results');
    },
  });
};

export const useUpdateExamResult = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { marks_obtained?: number | null; is_absent?: boolean; remarks?: string | null };
    }) => {
      const { examResultsApi } = await import('@/lib/api/client');
      return examResultsApi.update(id, data);
    },
    onSuccess: () => {
      showToast.success(t('toast.examResultUpdated') || 'Result updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-results'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examResultUpdateFailed') || 'Failed to update result');
    },
  });
};

export const useDeleteExamResult = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      const { examResultsApi } = await import('@/lib/api/client');
      return examResultsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.examResultDeleted') || 'Result deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['exam-results'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examResultDeleteFailed') || 'Failed to delete result');
    },
  });
};
