import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { 
  examsApi, examClassesApi, examSubjectsApi, examTimesApi,
  examStudentsApi, examResultsApi 
} from '@/lib/api/client';
import type * as ExamApi from '@/types/api/exam';
import type { 
  Exam, ExamClass, ExamSubject, ExamReport, ExamTime,
  ExamSummaryReport, ClassMarkSheetReport, StudentResultReport,
  EnrollmentStats, MarksProgress, ExamStatus
} from '@/types/domain/exam';
import {
  mapExamApiToDomain,
  mapExamClassApiToDomain,
  mapExamSubjectApiToDomain,
  mapExamDomainToInsert,
  mapExamDomainToUpdate,
  mapExamReportApiToDomain,
  mapExamTimeApiToDomain,
  mapExamTimeDomainToInsert,
  mapExamTimeDomainToUpdate,
  mapExamSummaryReportApiToDomain,
  mapClassMarkSheetApiToDomain,
  mapStudentResultApiToDomain,
  mapEnrollmentStatsApiToDomain,
  mapMarksProgressApiToDomain,
} from '@/mappers/examMapper';

// ========== Exam CRUD Hooks ==========

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
      } catch (error: unknown) {
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

export const useExam = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Exam | null>({
    queryKey: ['exam', examId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return null;
      try {
        const apiExam = await examsApi.get(examId);
        return mapExamApiToDomain(apiExam as ExamApi.Exam);
      } catch (error: unknown) {
        if (import.meta.env.DEV) {
          console.error('[useExam] Error fetching exam:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateExam = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (payload: { 
      name: string; 
      academicYearId: string; 
      description?: string; 
      startDate?: Date; 
      endDate?: Date;
      status?: ExamStatus;
    }) => {
      const insertData = mapExamDomainToInsert(payload as Partial<Exam>);
      return examsApi.create(insertData as Parameters<typeof examsApi.create>[0]);
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
    mutationFn: ({ id, data }: { id: string; data: Partial<Exam> }) => 
      examsApi.update(id, mapExamDomainToUpdate(data) as Parameters<typeof examsApi.update>[1]),
    onSuccess: () => {
      showToast.success(t('toast.examUpdated') || 'Exam updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
      void queryClient.invalidateQueries({ queryKey: ['exam'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examUpdateFailed') || 'Failed to update exam');
    },
  });
};

export const useUpdateExamStatus = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: ({ examId, status }: { examId: string; status: ExamStatus }) => 
      examsApi.updateStatus(examId, status),
    onSuccess: () => {
      showToast.success(t('toast.examStatusUpdated') || 'Exam status updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exams'] });
      void queryClient.invalidateQueries({ queryKey: ['exam'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examStatusUpdateFailed') || 'Failed to update exam status');
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

// ========== Exam Classes Hooks ==========

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
    mutationFn: (payload: { exam_id: string; class_academic_year_id: string }) => 
      examClassesApi.create(payload),
    onSuccess: (data: unknown) => {
      const result = data as ExamApi.ExamClass;
      showToast.success(t('toast.classAssigned') || 'Class assigned to exam');
      void queryClient.invalidateQueries({ queryKey: ['exam-classes', result.exam_id] });
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

// ========== Exam Subjects Hooks ==========

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
    onSuccess: (data: unknown) => {
      const result = data as ExamApi.ExamSubject;
      showToast.success(t('toast.subjectEnrolled') || 'Subject enrolled for exam');
      void queryClient.invalidateQueries({ queryKey: ['exam-subjects', result.exam_id] });
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

// ========== Exam Timetable Hooks ==========

export const useExamTimes = (examId?: string, examClassId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamTime[]>({
    queryKey: ['exam-times', examId, examClassId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return [];
      const params: { exam_class_id?: string } = {};
      if (examClassId) {
        params.exam_class_id = examClassId;
      }
      const apiExamTimes = await examTimesApi.list(examId, params);
      return (apiExamTimes as ExamApi.ExamTime[]).map(mapExamTimeApiToDomain);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateExamTime = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: ({ examId, data }: { examId: string; data: Partial<ExamTime> }) => {
      const insertData = mapExamTimeDomainToInsert(data);
      return examTimesApi.create(examId, insertData);
    },
    onSuccess: () => {
      showToast.success(t('toast.examTimeCreated') || 'Exam time slot created');
      void queryClient.invalidateQueries({ queryKey: ['exam-times'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examTimeCreateFailed') || 'Failed to create time slot');
    },
  });
};

export const useUpdateExamTime = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExamTime> }) => {
      const updateData = mapExamTimeDomainToUpdate(data);
      return examTimesApi.update(id, updateData);
    },
    onSuccess: () => {
      showToast.success(t('toast.examTimeUpdated') || 'Exam time slot updated');
      void queryClient.invalidateQueries({ queryKey: ['exam-times'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examTimeUpdateFailed') || 'Failed to update time slot');
    },
  });
};

export const useDeleteExamTime = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (id: string) => examTimesApi.delete(id),
    onSuccess: async () => {
      showToast.success(t('toast.examTimeDeleted') || 'Exam time slot deleted');
      await queryClient.invalidateQueries({ queryKey: ['exam-times'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examTimeDeleteFailed') || 'Failed to delete time slot');
    },
  });
};

export const useToggleExamTimeLock = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (id: string) => examTimesApi.toggleLock(id),
    onSuccess: () => {
      showToast.success(t('toast.examTimeLockToggled') || 'Time slot lock toggled');
      void queryClient.invalidateQueries({ queryKey: ['exam-times'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examTimeLockToggleFailed') || 'Failed to toggle lock');
    },
  });
};

// ========== Exam Reports Hooks ==========

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

export const useExamSummaryReport = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamSummaryReport>({
    queryKey: ['exam-summary-report', examId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) throw new Error('Missing exam');
      const report = await examsApi.summaryReport(examId);
      return mapExamSummaryReportApiToDomain(report as ExamApi.ExamSummaryReport);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useExamClassReport = (examId?: string, classId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ClassMarkSheetReport>({
    queryKey: ['exam-class-report', examId, classId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId || !classId) throw new Error('Missing exam or class');
      const report = await examsApi.classReport(examId, classId);
      return mapClassMarkSheetApiToDomain(report as ExamApi.ClassMarkSheetReport);
    },
    enabled: !!user && !!profile && !!examId && !!classId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useExamStudentReport = (examId?: string, studentId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentResultReport>({
    queryKey: ['exam-student-report', examId, studentId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId || !studentId) throw new Error('Missing exam or student');
      const report = await examsApi.studentReport(examId, studentId);
      return mapStudentResultApiToDomain(report as ExamApi.StudentResultReport);
    },
    enabled: !!user && !!profile && !!examId && !!studentId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useEnrollmentStats = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<EnrollmentStats>({
    queryKey: ['enrollment-stats', examId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) throw new Error('Missing exam');
      const stats = await examsApi.enrollmentStats(examId);
      return mapEnrollmentStatsApiToDomain(stats as ExamApi.EnrollmentStats);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useMarksProgress = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<MarksProgress>({
    queryKey: ['marks-progress', examId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) throw new Error('Missing exam');
      const progress = await examsApi.marksProgress(examId);
      return mapMarksProgressApiToDomain(progress as ExamApi.MarksProgress);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
      const { mapExamStudentApiToDomain } = await import('@/mappers/examMapper');
      const apiExamStudents = await examStudentsApi.list(params);
      return (apiExamStudents as ExamApi.ExamStudent[]).map(mapExamStudentApiToDomain);
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
      return examStudentsApi.create(data);
    },
    onSuccess: () => {
      showToast.success(t('toast.studentEnrolled') || 'Student enrolled successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-students'] });
      void queryClient.invalidateQueries({ queryKey: ['enrollment-stats'] });
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
      return examStudentsApi.bulkEnroll(data);
    },
    onSuccess: (data: unknown) => {
      const result = data as { enrolled_count?: number; skipped_count?: number };
      const enrolledCount = result?.enrolled_count || 0;
      const skippedCount = result?.skipped_count || 0;
      const message = skippedCount > 0 
        ? t('toast.studentsEnrolledWithSkipped', { enrolled: enrolledCount, skipped: skippedCount }) || 
          `${enrolledCount} students enrolled. ${skippedCount} already enrolled.`
        : t('toast.studentsEnrolled', { count: enrolledCount }) || `${enrolledCount} students enrolled.`;
      showToast.success(message);
      void queryClient.invalidateQueries({ queryKey: ['exam-students'] });
      void queryClient.invalidateQueries({ queryKey: ['enrollment-stats'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.studentsEnrollFailed') || 'Failed to enroll students');
    },
  });
};

export const useEnrollAllStudents = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (examId: string) => {
      return examsApi.enrollAll(examId);
    },
    onSuccess: (data: unknown) => {
      const result = data as { summary?: { total_enrolled?: number; total_skipped?: number } };
      const enrolled = result?.summary?.total_enrolled || 0;
      const skipped = result?.summary?.total_skipped || 0;
      showToast.success(
        t('toast.allStudentsEnrolled', { enrolled, skipped }) || 
        `Enrolled ${enrolled} students across all classes. ${skipped} already enrolled.`
      );
      void queryClient.invalidateQueries({ queryKey: ['exam-students'] });
      void queryClient.invalidateQueries({ queryKey: ['enrollment-stats'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.enrollAllFailed') || 'Failed to enroll all students');
    },
  });
};

export const useRemoveStudentFromExam = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async (id: string) => {
      return examStudentsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.studentRemoved') || 'Student removed from exam');
      await queryClient.invalidateQueries({ queryKey: ['exam-students'] });
      await queryClient.invalidateQueries({ queryKey: ['enrollment-stats'] });
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
      const { mapExamResultApiToDomain } = await import('@/mappers/examMapper');
      const apiExamResults = await examResultsApi.list(params);
      return (apiExamResults as ExamApi.ExamResult[]).map(mapExamResultApiToDomain);
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
      return examResultsApi.create(data);
    },
    onSuccess: () => {
      showToast.success(t('toast.examResultSaved') || 'Result saved successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      void queryClient.invalidateQueries({ queryKey: ['marks-progress'] });
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
      return examResultsApi.bulkStore(data);
    },
    onSuccess: (data: unknown) => {
      const result = data as { created_count?: number; updated_count?: number };
      const createdCount = result?.created_count || 0;
      const updatedCount = result?.updated_count || 0;
      const total = createdCount + updatedCount;
      showToast.success(t('toast.examResultsSaved', { count: total }) || `${total} results saved successfully`);
      void queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      void queryClient.invalidateQueries({ queryKey: ['marks-progress'] });
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
      return examResultsApi.update(id, data);
    },
    onSuccess: () => {
      showToast.success(t('toast.examResultUpdated') || 'Result updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      void queryClient.invalidateQueries({ queryKey: ['marks-progress'] });
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
      return examResultsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.examResultDeleted') || 'Result deleted successfully');
      await queryClient.invalidateQueries({ queryKey: ['exam-results'] });
      await queryClient.invalidateQueries({ queryKey: ['marks-progress'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examResultDeleteFailed') || 'Failed to delete result');
    },
  });
};
