import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useCurrentAcademicYear } from './useAcademicYears';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';

import {
  examsApi, examClassesApi, examSubjectsApi, examTimesApi,
  examStudentsApi, examResultsApi, examAttendanceApi
} from '@/lib/api/client';
import { showToast } from '@/lib/toast';
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
  mapExamAttendanceApiToDomain,
  mapAttendanceSummaryApiToDomain,
  mapExamAttendanceReportDetailApiToDomain,
  mapTimeslotStudentsResponseApiToDomain,
  mapStudentAttendanceReportApiToDomain,
  mapTimeslotAttendanceSummaryApiToDomain,
} from '@/mappers/examMapper';
import type * as ExamApi from '@/types/api/exam';
import type {
  Exam, ExamClass, ExamSubject, ExamReport, ExamTime,
  ExamSummaryReport, ClassMarkSheetReport, StudentResultReport,
  EnrollmentStats, MarksProgress, ExamStatus, ExamAttendance,
  ExamAttendanceSummary, TimeslotStudentsResponse, StudentAttendanceReport,
  ExamAttendanceReportDetail,
  TimeslotAttendanceSummary, ExamAttendanceStatus
} from '@/types/domain/exam';

// ========== Exam CRUD Hooks ==========

export const useExams = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<Exam[]>({
    queryKey: ['exams', organizationId || profile?.organization_id, orgIds.join(','), profile?.default_school_id ?? null],
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

/**
 * Get the latest exam from the current academic year
 * Returns the exam with the most recent start date (or created date if no start date)
 */
export const useLatestExamFromCurrentYear = (organizationId?: string) => {
  const { data: exams } = useExams(organizationId);
  const { data: currentAcademicYear } = useCurrentAcademicYear(organizationId);

  return useMemo(() => {
    if (!exams || !currentAcademicYear) return null;

    // Filter exams for current academic year
    const currentYearExams = exams.filter(
      exam => exam.academicYear?.id === currentAcademicYear.id
    );

    if (currentYearExams.length === 0) return null;

    // Sort by start date (most recent first), then by created date
    const sorted = [...currentYearExams].sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bDate = b.startDate ? new Date(b.startDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return bDate - aDate; // Most recent first
    });

    return sorted[0];
  }, [exams, currentAcademicYear]);
};

export const useExam = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Exam | null>({
    queryKey: ['exam', examId, profile?.organization_id, profile?.default_school_id ?? null],
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
    queryKey: ['exam-classes', examId, profile?.organization_id, profile?.default_school_id ?? null],
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
    queryKey: ['exam-subjects', examId, examClassId, profile?.organization_id, profile?.default_school_id ?? null],
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

export const useBulkAssignAllExamSubjects = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (payload: {
      exam_id: string;
      total_marks?: number | null;
      passing_marks?: number | null;
    }) => examSubjectsApi.bulkAssignAll(payload),
    onSuccess: async (result, variables) => {
      const assigned = result?.assigned_count ?? 0;
      const skipped = result?.skipped_count ?? 0;
      showToast.success(
        t('exams.bulkAssignSubjectsSuccess', { count: assigned, skipped }) ||
          `Assigned ${assigned} subject(s). ${skipped} already assigned.`
      );
      await queryClient.invalidateQueries({ queryKey: ['exam-subjects', variables.exam_id] });
      await queryClient.refetchQueries({ queryKey: ['exam-subjects', variables.exam_id] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('exams.bulkAssignSubjectsFailed') || 'Failed to bulk assign subjects');
    },
  });
};

export const useBulkUpdateExamSubjectMarks = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: (payload: {
      exam_id: string;
      total_marks: number;
      passing_marks: number;
      only_unset?: boolean;
    }) => examSubjectsApi.bulkUpdateMarks(payload),
    onSuccess: async (result, variables) => {
      const updated = result?.updated_count ?? 0;
      showToast.success(
        t('exams.bulkUpdateMarksSuccess', { count: updated }) ||
          `Updated marks for ${updated} subject(s).`
      );
      await queryClient.invalidateQueries({ queryKey: ['exam-subjects', variables.exam_id] });
      await queryClient.refetchQueries({ queryKey: ['exam-subjects', variables.exam_id] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('exams.bulkUpdateMarksFailed') || 'Failed to bulk update marks');
    },
  });
};

// ========== Exam Timetable Hooks ==========

export const useExamTimes = (examId?: string, examClassId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamTime[]>({
    queryKey: ['exam-times', examId, examClassId, profile?.organization_id, profile?.default_school_id ?? null],
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
      void queryClient.invalidateQueries({ queryKey: ['exam-report'] });
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
      void queryClient.invalidateQueries({ queryKey: ['exam-report'] });
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
      await queryClient.invalidateQueries({ queryKey: ['exam-report'] });
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

export const useBulkReplaceExamTimes = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({
      examId,
      times,
    }: {
      examId: string;
      times: Array<{
        examClassId: string;
        examSubjectId: string;
        date: string;
        startTime: string;
        endTime: string;
        roomId?: string | null;
        invigilatorId?: string | null;
        notes?: string | null;
      }>;
    }) => {
      const payload = {
        times: times.map((row) => ({
          exam_class_id: row.examClassId,
          exam_subject_id: row.examSubjectId,
          date: row.date,
          start_time: row.startTime,
          end_time: row.endTime,
          room_id: row.roomId ?? null,
          invigilator_id: row.invigilatorId ?? null,
          notes: row.notes ?? null,
        })),
      };
      const response = await examTimesApi.bulkReplace(examId, payload);
      const rows = (response as { data?: ExamApi.ExamTime[] })?.data ?? [];
      return (rows as ExamApi.ExamTime[]).map(mapExamTimeApiToDomain);
    },
    onSuccess: async () => {
      showToast.success(t('toast.examTimetableApplied') || 'Exam timetable applied');
      await queryClient.invalidateQueries({ queryKey: ['exam-times'] });
      await queryClient.refetchQueries({ queryKey: ['exam-times'] });
      await queryClient.invalidateQueries({ queryKey: ['exam-report'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.examTimetableApplyFailed') || 'Failed to apply exam timetable');
    },
  });
};

// ========== Exam Reports Hooks ==========

export const useExamReport = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamReport>({
    queryKey: ['exam-report', examId, profile?.organization_id, profile?.default_school_id ?? null],
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
    queryKey: ['exam-summary-report', examId, profile?.organization_id, profile?.default_school_id ?? null],
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
    queryKey: ['exam-class-report', examId, classId, profile?.organization_id, profile?.default_school_id ?? null],
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
    queryKey: ['exam-student-report', examId, studentId, profile?.organization_id, profile?.default_school_id ?? null],
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
    queryKey: ['enrollment-stats', examId, profile?.organization_id, profile?.default_school_id ?? null],
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
    queryKey: ['marks-progress', examId, profile?.organization_id, profile?.default_school_id ?? null],
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
    queryKey: ['exam-students', examId, examClassId, profile?.organization_id, profile?.default_school_id ?? null],
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
      showToast.success(t('courses.studentEnrolled') || 'Student enrolled successfully');
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
    queryKey: ['exam-results', examId, examSubjectId, examStudentId, profile?.organization_id, profile?.default_school_id ?? null],
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

// ========== Exam Attendance Hooks ==========

export const useExamAttendance = (
  examId?: string,
  filters?: {
    examClassId?: string;
    examTimeId?: string;
    examSubjectId?: string;
    status?: ExamAttendanceStatus;
    date?: string;
  }
) => {
  const { user, profile } = useAuth();

  return useQuery<ExamAttendance[]>({
    queryKey: ['exam-attendance', examId, filters, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examId) return [];
      const params: Record<string, string | undefined> = {};
      if (filters?.examClassId) params.exam_class_id = filters.examClassId;
      if (filters?.examTimeId) params.exam_time_id = filters.examTimeId;
      if (filters?.examSubjectId) params.exam_subject_id = filters.examSubjectId;
      if (filters?.status) params.status = filters.status;
      if (filters?.date) params.date = filters.date;

      const apiAttendances = await examAttendanceApi.list(examId, params);
      return (apiAttendances as ExamApi.ExamAttendance[]).map(mapExamAttendanceApiToDomain);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useExamAttendanceSummary = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamAttendanceSummary | null>({
    queryKey: ['exam-attendance-summary', examId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examId) return null;
      const apiSummary = await examAttendanceApi.summary(examId);
      return mapAttendanceSummaryApiToDomain(apiSummary as ExamApi.ExamAttendanceSummary);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useExamAttendanceReportDetail = (
  examId?: string,
  examClassId?: string | null,
  examSubjectId?: string | null
) => {
  const { user, profile } = useAuth();

  return useQuery<ExamAttendanceReportDetail | null>({
    queryKey: [
      'exam-attendance-report-detail',
      examId,
      examClassId ?? null,
      examSubjectId ?? null,
      profile?.organization_id,
      profile?.default_school_id ?? null,
    ],
    queryFn: async () => {
      if (!user || !profile || !examId || !examClassId || !examSubjectId) return null;
      const apiDetail = await examAttendanceApi.reportDetail(examId, {
        exam_class_id: examClassId,
        exam_subject_id: examSubjectId,
      });
      return mapExamAttendanceReportDetailApiToDomain(apiDetail as ExamApi.ExamAttendanceReportDetail);
    },
    enabled: !!user && !!profile && !!examId && !!examClassId && !!examSubjectId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useTimeslotStudents = (examId?: string, examTimeId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<TimeslotStudentsResponse | null>({
    queryKey: ['timeslot-students', examId, examTimeId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examId || !examTimeId) return null;
      const apiResponse = await examAttendanceApi.getTimeslotStudents(examId, examTimeId);
      return mapTimeslotStudentsResponseApiToDomain(apiResponse as ExamApi.TimeslotStudentsResponse);
    },
    enabled: !!user && !!profile && !!examId && !!examTimeId,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useTimeslotAttendanceSummary = (examId?: string, examTimeId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<TimeslotAttendanceSummary | null>({
    queryKey: ['timeslot-attendance-summary', examId, examTimeId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examId || !examTimeId) return null;
      const apiSummary = await examAttendanceApi.timeslotSummary(examId, examTimeId);
      return mapTimeslotAttendanceSummaryApiToDomain(apiSummary as ExamApi.TimeslotAttendanceSummary);
    },
    enabled: !!user && !!profile && !!examId && !!examTimeId,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useStudentAttendanceReport = (examId?: string, studentId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentAttendanceReport | null>({
    queryKey: ['student-attendance-report', examId, studentId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examId || !studentId) return null;
      const apiReport = await examAttendanceApi.studentReport(examId, studentId);
      return mapStudentAttendanceReportApiToDomain(apiReport as ExamApi.StudentAttendanceReport);
    },
    enabled: !!user && !!profile && !!examId && !!studentId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export interface HallAttendanceSession {
  date: string;
  startTime: string;
  endTime: string | null;
  examTimeIds: string[];
  classCount: number;
}

export interface HallAttendanceMapOption {
  id: string;
  name: string;
  status: string;
  rows: number;
  columns: number;
  roomId: string | null;
  roomName: string | null;
  examClassIds: string[];
  sessions: HallAttendanceSession[];
}

export interface HallAttendanceSeat {
  assignmentId: string;
  rowNumber: number;
  columnNumber: number;
  seatNumber: number;
  isDisabled: boolean;
  examStudentId: string | null;
  examClassId: string | null;
  examTimeId: string | null;
  examSubjectId: string | null;
  studentId: string | null;
  fullName: string | null;
  fatherName: string | null;
  rollNumber: string | null;
  admissionNo: string | null;
  className: string | null;
  markable: boolean;
  attendance: {
    id: string;
    status: ExamAttendanceStatus;
    checkedInAt: Date | null;
    seatNumber: string | null;
    notes: string | null;
  } | null;
}

export interface HallAttendanceStudentsResponse {
  map: {
    id: string;
    name: string;
    status: string;
    rows: number;
    columns: number;
    roomId: string | null;
    roomName: string | null;
  } | null;
  session: HallAttendanceSession;
  seats: HallAttendanceSeat[];
  students: HallAttendanceSeat[];
  counts: {
    total: number;
    markable: number;
    marked: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    unmarked: number;
    unresolved: number;
  };
}

function mapHallSessionApi(raw: {
  date: string;
  start_time: string;
  end_time?: string | null;
  exam_time_ids?: string[];
  class_count?: number;
}): HallAttendanceSession {
  return {
    date: raw.date,
    startTime: raw.start_time,
    endTime: raw.end_time ?? null,
    examTimeIds: raw.exam_time_ids ?? [],
    classCount: raw.class_count ?? 0,
  };
}

function mapHallSeatApi(raw: {
  assignment_id: string;
  row_number: number;
  column_number: number;
  seat_number: number;
  is_disabled: boolean;
  exam_student_id?: string | null;
  exam_class_id?: string | null;
  exam_time_id?: string | null;
  exam_subject_id?: string | null;
  student_id?: string | null;
  full_name?: string | null;
  father_name?: string | null;
  roll_number?: string | null;
  admission_no?: string | null;
  class_name?: string | null;
  markable: boolean;
  attendance?: {
    id: string;
    status: ExamAttendanceStatus;
    checked_in_at?: string | null;
    seat_number?: string | null;
    notes?: string | null;
  } | null;
}): HallAttendanceSeat {
  return {
    assignmentId: raw.assignment_id,
    rowNumber: raw.row_number,
    columnNumber: raw.column_number,
    seatNumber: raw.seat_number,
    isDisabled: raw.is_disabled,
    examStudentId: raw.exam_student_id ?? null,
    examClassId: raw.exam_class_id ?? null,
    examTimeId: raw.exam_time_id ?? null,
    examSubjectId: raw.exam_subject_id ?? null,
    studentId: raw.student_id ?? null,
    fullName: raw.full_name ?? null,
    fatherName: raw.father_name ?? null,
    rollNumber: raw.roll_number ?? null,
    admissionNo: raw.admission_no ?? null,
    className: raw.class_name ?? null,
    markable: raw.markable,
    attendance: raw.attendance
      ? {
          id: raw.attendance.id,
          status: raw.attendance.status,
          checkedInAt: raw.attendance.checked_in_at ? new Date(raw.attendance.checked_in_at) : null,
          seatNumber: raw.attendance.seat_number ?? null,
          notes: raw.attendance.notes ?? null,
        }
      : null,
  };
}

export const useHallAttendanceSessions = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<HallAttendanceSession[]>({
    queryKey: ['exam-hall-attendance-sessions', examId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examId) return [];
      const response = await examAttendanceApi.hallSessions(examId);
      const rows = Array.isArray(response)
        ? response
        : (response as { data?: Array<Record<string, unknown>> })?.data ?? [];
      return rows.map((raw) =>
        mapHallSessionApi(
          raw as {
            date: string;
            start_time: string;
            end_time?: string | null;
            exam_time_ids?: string[];
            class_count?: number;
          }
        )
      );
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id && !!examId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useHallAttendanceMaps = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<HallAttendanceMapOption[]>({
    queryKey: ['exam-hall-attendance-maps', examId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examId) return [];
      const response = await examAttendanceApi.hallMaps(examId);
      const rows = Array.isArray(response)
        ? response
        : (response as { data?: Array<Record<string, unknown>> })?.data ?? [];
      return rows.map((raw) => {
        const r = raw as {
          id: string;
          name: string;
          status: string;
          rows: number;
          columns: number;
          room_id?: string | null;
          room?: { id: string; name?: string | null; room_number?: string | null } | null;
          exam_class_ids?: string[];
          sessions?: Array<{
            date: string;
            start_time: string;
            end_time?: string | null;
            exam_time_ids?: string[];
            class_count?: number;
          }>;
        };
        return {
          id: r.id,
          name: r.name,
          status: r.status,
          rows: r.rows,
          columns: r.columns,
          roomId: r.room_id ?? null,
          roomName: r.room?.name ?? r.room?.room_number ?? null,
          examClassIds: r.exam_class_ids ?? [],
          sessions: (r.sessions ?? []).map(mapHallSessionApi),
        };
      });
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id && !!examId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

function mapHallStudentsResponse(response: unknown): HallAttendanceStudentsResponse {
  const raw = response as {
    map: {
      id: string;
      name: string;
      status: string;
      rows: number;
      columns: number;
      room_id?: string | null;
      room?: { name?: string | null; room_number?: string | null } | null;
    } | null;
    session: {
      date: string;
      start_time: string;
      end_time?: string | null;
      exam_time_ids?: string[];
      class_count?: number;
    };
    seats: Array<Parameters<typeof mapHallSeatApi>[0]>;
    students: Array<Parameters<typeof mapHallSeatApi>[0]>;
    counts: HallAttendanceStudentsResponse['counts'];
  };
  return {
    map: raw.map
      ? {
          id: raw.map.id,
          name: raw.map.name,
          status: raw.map.status,
          rows: raw.map.rows,
          columns: raw.map.columns,
          roomId: raw.map.room_id ?? null,
          roomName: raw.map.room?.name ?? raw.map.room?.room_number ?? null,
        }
      : null,
    session: mapHallSessionApi(raw.session),
    seats: (raw.seats ?? []).map(mapHallSeatApi),
    students: (raw.students ?? []).map(mapHallSeatApi),
    counts: raw.counts,
  };
}

export const useHallAttendanceStudents = (
  examId?: string,
  mapId?: string | null,
  session?: { date: string; startTime: string } | null
) => {
  const { user, profile } = useAuth();
  const useMap = !!mapId;

  return useQuery<HallAttendanceStudentsResponse | null>({
    queryKey: [
      'exam-hall-attendance-students',
      examId,
      mapId ?? 'session',
      session?.date ?? null,
      session?.startTime ?? null,
      profile?.organization_id,
      profile?.default_school_id ?? null,
    ],
    queryFn: async () => {
      if (!user || !profile || !examId || !session) return null;
      if (useMap && mapId) {
        const response = await examAttendanceApi.hallStudents(examId, mapId, {
          date: session.date,
          start_time: session.startTime,
        });
        return mapHallStudentsResponse(response);
      }
      const response = await examAttendanceApi.hallSessionStudents(examId, {
        date: session.date,
        start_time: session.startTime,
      });
      return mapHallStudentsResponse(response);
    },
    enabled:
      !!user &&
      !!profile &&
      !!profile.organization_id &&
      !!profile.default_school_id &&
      !!examId &&
      !!session?.date &&
      !!session?.startTime,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useMarkExamAttendance = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      examTimeId,
      attendances,
      silent,
    }: {
      examId: string;
      examTimeId: string;
      attendances: Array<{
        studentId: string;
        status: ExamAttendanceStatus;
        checkedInAt?: Date | null;
        seatNumber?: string | null;
        notes?: string | null;
      }>;
      /** When true, skip success toast (used for hall auto-save). */
      silent?: boolean;
    }) => {
      const result = await examAttendanceApi.mark(examId, {
        exam_time_id: examTimeId,
        attendances: attendances.map((a) => ({
          student_id: a.studentId,
          status: a.status,
          checked_in_at: a.checkedInAt ? a.checkedInAt.toISOString() : null,
          seat_number: a.seatNumber ?? null,
          notes: a.notes ?? null,
        })),
      });
      return { result, silent: !!silent };
    },
    onSuccess: (data) => {
      const result = data.result as { created?: number; updated?: number; errors?: unknown[] };
      const total = (result?.created || 0) + (result?.updated || 0);
      if (!data.silent) {
        showToast.success(t('toast.attendanceMarked', { count: total }) || `Attendance marked for ${total} students`);
      }
      void queryClient.invalidateQueries({ queryKey: ['exam-attendance'] });
      void queryClient.invalidateQueries({ queryKey: ['timeslot-students'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-attendance-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['timeslot-attendance-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-hall-attendance-students'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.attendanceMarkFailed') || 'Failed to mark attendance');
    },
  });
};

export const useMarkHallExamAttendance = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      attendances,
      silent,
    }: {
      examId: string;
      attendances: Array<{
        studentId: string;
        examTimeId: string;
        status: ExamAttendanceStatus;
        checkedInAt?: Date | null;
        seatNumber?: string | null;
        notes?: string | null;
      }>;
      silent?: boolean;
    }) => {
      const result = await examAttendanceApi.markHall(examId, {
        attendances: attendances.map((a) => ({
          student_id: a.studentId,
          exam_time_id: a.examTimeId,
          status: a.status,
          checked_in_at: a.checkedInAt ? a.checkedInAt.toISOString() : null,
          seat_number: a.seatNumber ?? null,
          notes: a.notes ?? null,
        })),
      });
      return { result, silent: !!silent };
    },
    onSuccess: (data) => {
      const result = data.result as { created?: number; updated?: number; errors?: unknown[] };
      const total = (result?.created || 0) + (result?.updated || 0);
      if (!data.silent) {
        showToast.success(t('toast.attendanceMarked', { count: total }) || `Attendance marked for ${total} students`);
      }
      // Silent hall taps: skip refetching the large seating payload (causes Opera OOM with ~1000 students).
      // Local optimistic state already reflects marks; full sync happens on Finish / non-silent save.
      void queryClient.invalidateQueries({ queryKey: ['exam-attendance-summary'] });
      if (!data.silent) {
        void queryClient.invalidateQueries({ queryKey: ['exam-attendance'] });
        void queryClient.invalidateQueries({ queryKey: ['timeslot-students'] });
        void queryClient.invalidateQueries({ queryKey: ['timeslot-attendance-summary'] });
        void queryClient.invalidateQueries({ queryKey: ['exam-hall-attendance-students'] });
      }
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.attendanceMarkFailed') || 'Failed to mark attendance');
    },
  });
};

export const useScanExamAttendance = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      examTimeId,
      rollNumber,
      status,
      notes,
    }: {
      examId: string;
      examTimeId: string;
      rollNumber: string;
      status?: ExamAttendanceStatus;
      notes?: string | null;
    }) => {
      return examAttendanceApi.scan(examId, {
        exam_time_id: examTimeId,
        roll_number: rollNumber,
        status: status || 'present',
        notes: notes || null,
      });
    },
    onSuccess: () => {
      // Don't show toast for background operations - use instant feedback instead
      void queryClient.invalidateQueries({ queryKey: ['exam-attendance'] });
      void queryClient.invalidateQueries({ queryKey: ['timeslot-students'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-attendance-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['timeslot-attendance-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-attendance-scan-feed'] });
    },
    onError: (error: Error) => {
      // Error handling is done in component with instant feedback
      if (import.meta.env.DEV) {
        console.error('Attendance scan error:', error);
      }
    },
  });
};

export const useExamAttendanceScanFeed = (examId?: string, examTimeId?: string, limit: number = 30) => {
  const { user, profile } = useAuth();

  return useQuery<ExamAttendance[]>({
    queryKey: ['exam-attendance-scan-feed', examId, examTimeId, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !examId || !examTimeId) return [];
      const scans = await examAttendanceApi.scanFeed(examId, examTimeId, { limit });
      return (scans as ExamApi.ExamAttendance[]).map(mapExamAttendanceApiToDomain);
    },
    enabled: !!user && !!profile && !!examId && !!examTimeId,
    staleTime: 5 * 1000, // 5 seconds - scan feed updates frequently
    refetchInterval: 10 * 1000, // Auto-refresh every 10 seconds
    refetchOnWindowFocus: true,
  });
};

export const useUpdateExamAttendance = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        status?: ExamAttendanceStatus;
        checkedInAt?: Date | null;
        seatNumber?: string | null;
        notes?: string | null;
      };
    }) => {
      return examAttendanceApi.update(id, {
        status: data.status,
        checked_in_at: data.checkedInAt ? data.checkedInAt.toISOString() : null,
        seat_number: data.seatNumber ?? null,
        notes: data.notes ?? null,
      });
    },
    onSuccess: () => {
      showToast.success(t('toast.attendanceUpdated') || 'Attendance updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['exam-attendance'] });
      void queryClient.invalidateQueries({ queryKey: ['timeslot-students'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-attendance-summary'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.attendanceUpdateFailed') || 'Failed to update attendance');
    },
  });
};

export const useDeleteExamAttendance = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      return examAttendanceApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.attendanceDeleted') || 'Attendance record deleted');
      await queryClient.invalidateQueries({ queryKey: ['exam-attendance'] });
      await queryClient.invalidateQueries({ queryKey: ['timeslot-students'] });
      await queryClient.invalidateQueries({ queryKey: ['exam-attendance-summary'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.attendanceDeleteFailed') || 'Failed to delete attendance');
    },
  });
};
