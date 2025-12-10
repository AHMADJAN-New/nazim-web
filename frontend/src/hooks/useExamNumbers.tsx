import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
import { useAuth } from './useAuth';
import { examsApi } from '@/lib/api/client';
import type * as ExamApi from '@/types/api/exam';
import type {
  StudentsWithNumbersResponse,
  NumberAssignmentPreviewResponse,
  NumberAssignmentConfirmResponse,
  RollNumberReportResponse,
  RollSlipsHtmlResponse,
  SecretLabelsHtmlResponse,
  SecretNumberLookupResponse,
} from '@/types/domain/exam';
import {
  mapStudentsWithNumbersResponseApiToDomain,
  mapNumberAssignmentPreviewResponseApiToDomain,
  mapNumberAssignmentConfirmResponseApiToDomain,
  mapRollNumberReportResponseApiToDomain,
  mapRollSlipsHtmlResponseApiToDomain,
  mapSecretLabelsHtmlResponseApiToDomain,
  mapSecretNumberLookupResponseApiToDomain,
} from '@/mappers/examMapper';

// ========== Get Students with Numbers ==========

export const useExamStudentsWithNumbers = (
  examId?: string,
  examClassId?: string
) => {
  const { user, profile } = useAuth();

  return useQuery<StudentsWithNumbersResponse | null>({
    queryKey: ['exam-students-with-numbers', examId, examClassId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return null;
      const params: { exam_class_id?: string } = {};
      if (examClassId) {
        params.exam_class_id = examClassId;
      }
      const response = await examsApi.studentsWithNumbers(examId, params);
      return mapStudentsWithNumbersResponseApiToDomain(response as ExamApi.StudentsWithNumbersResponse);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

// ========== Roll Number Hooks ==========

export const useRollNumberStartFrom = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<string>({
    queryKey: ['roll-number-start-from', examId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return '1001';
      const response = await examsApi.rollNumberStartFrom(examId);
      return (response as { suggested_start_from: string }).suggested_start_from || '1001';
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const usePreviewRollNumberAssignment = () => {
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      examClassId,
      startFrom,
      scope,
      overrideExisting,
    }: {
      examId: string;
      examClassId?: string;
      startFrom: string;
      scope: 'exam' | 'class';
      overrideExisting?: boolean;
    }) => {
      const response = await examsApi.previewRollNumberAssignment(examId, {
        exam_class_id: examClassId,
        start_from: startFrom,
        scope,
        override_existing: overrideExisting,
      });
      return mapNumberAssignmentPreviewResponseApiToDomain(
        response as ExamApi.NumberAssignmentPreviewResponse
      );
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.previewFailed') || 'Failed to preview assignment');
    },
  });
};

export const useConfirmRollNumberAssignment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      items,
    }: {
      examId: string;
      items: Array<{ exam_student_id: string; new_roll_number: string }>;
    }) => {
      const response = await examsApi.confirmRollNumberAssignment(examId, { items });
      return mapNumberAssignmentConfirmResponseApiToDomain(
        response as ExamApi.NumberAssignmentConfirmResponse
      );
    },
    onSuccess: (data: NumberAssignmentConfirmResponse) => {
      const message = data.errors.length > 0
        ? t('toast.rollNumbersAssignedWithErrors', { count: data.updated, errors: data.errors.length }) ||
          `${data.updated} roll numbers assigned. ${data.errors.length} failed.`
        : t('toast.rollNumbersAssigned', { count: data.updated }) ||
          `${data.updated} roll numbers assigned successfully`;
      showToast.success(message);
      void queryClient.invalidateQueries({ queryKey: ['exam-students-with-numbers'] });
      void queryClient.invalidateQueries({ queryKey: ['roll-number-start-from'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-students'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.rollNumberAssignFailed') || 'Failed to assign roll numbers');
    },
  });
};

export const useUpdateRollNumber = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      examStudentId,
      rollNumber,
    }: {
      examId: string;
      examStudentId: string;
      rollNumber: string | null;
    }) => {
      return examsApi.updateRollNumber(examId, examStudentId, {
        exam_roll_number: rollNumber,
      });
    },
    onSuccess: () => {
      showToast.success(t('toast.rollNumberUpdated') || 'Roll number updated');
      void queryClient.invalidateQueries({ queryKey: ['exam-students-with-numbers'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-students'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.rollNumberUpdateFailed') || 'Failed to update roll number');
    },
  });
};

// ========== Secret Number Hooks ==========

export const useSecretNumberStartFrom = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<string>({
    queryKey: ['secret-number-start-from', examId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return '1';
      const response = await examsApi.secretNumberStartFrom(examId);
      return (response as { suggested_start_from: string }).suggested_start_from || '1';
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const usePreviewSecretNumberAssignment = () => {
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      examClassId,
      startFrom,
      scope,
      overrideExisting,
    }: {
      examId: string;
      examClassId?: string;
      startFrom: string;
      scope: 'exam' | 'class';
      overrideExisting?: boolean;
    }) => {
      const response = await examsApi.previewSecretNumberAssignment(examId, {
        exam_class_id: examClassId,
        start_from: startFrom,
        scope,
        override_existing: overrideExisting,
      });
      return mapNumberAssignmentPreviewResponseApiToDomain(
        response as ExamApi.NumberAssignmentPreviewResponse
      );
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.previewFailed') || 'Failed to preview assignment');
    },
  });
};

export const useConfirmSecretNumberAssignment = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      items,
    }: {
      examId: string;
      items: Array<{ exam_student_id: string; new_secret_number: string }>;
    }) => {
      const response = await examsApi.confirmSecretNumberAssignment(examId, { items });
      return mapNumberAssignmentConfirmResponseApiToDomain(
        response as ExamApi.NumberAssignmentConfirmResponse
      );
    },
    onSuccess: (data: NumberAssignmentConfirmResponse) => {
      const message = data.errors.length > 0
        ? t('toast.secretNumbersAssignedWithErrors', { count: data.updated, errors: data.errors.length }) ||
          `${data.updated} secret numbers assigned. ${data.errors.length} failed.`
        : t('toast.secretNumbersAssigned', { count: data.updated }) ||
          `${data.updated} secret numbers assigned successfully`;
      showToast.success(message);
      void queryClient.invalidateQueries({ queryKey: ['exam-students-with-numbers'] });
      void queryClient.invalidateQueries({ queryKey: ['secret-number-start-from'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-students'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.secretNumberAssignFailed') || 'Failed to assign secret numbers');
    },
  });
};

export const useUpdateSecretNumber = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      examStudentId,
      secretNumber,
    }: {
      examId: string;
      examStudentId: string;
      secretNumber: string | null;
    }) => {
      return examsApi.updateSecretNumber(examId, examStudentId, {
        exam_secret_number: secretNumber,
      });
    },
    onSuccess: () => {
      showToast.success(t('toast.secretNumberUpdated') || 'Secret number updated');
      void queryClient.invalidateQueries({ queryKey: ['exam-students-with-numbers'] });
      void queryClient.invalidateQueries({ queryKey: ['exam-students'] });
    },
    onError: (error: Error) => {
      showToast.error(error?.message || t('toast.secretNumberUpdateFailed') || 'Failed to update secret number');
    },
  });
};

export const useLookupBySecretNumber = () => {
  return useMutation({
    mutationFn: async ({
      examId,
      secretNumber,
    }: {
      examId: string;
      secretNumber: string;
    }) => {
      const response = await examsApi.lookupBySecretNumber(examId, secretNumber);
      return mapSecretNumberLookupResponseApiToDomain(
        response as ExamApi.SecretNumberLookupResponse
      );
    },
  });
};

// ========== Reports Hooks ==========

export const useRollNumberReport = (examId?: string, examClassId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<RollNumberReportResponse | null>({
    queryKey: ['roll-number-report', examId, examClassId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return null;
      const params: { exam_class_id?: string } = {};
      if (examClassId) {
        params.exam_class_id = examClassId;
      }
      const response = await examsApi.rollNumberReport(examId, params);
      return mapRollNumberReportResponseApiToDomain(response as ExamApi.RollNumberReportResponse);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useRollSlipsHtml = (examId?: string, examClassId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<RollSlipsHtmlResponse | null>({
    queryKey: ['roll-slips-html', examId, examClassId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return null;
      const params: { exam_class_id?: string } = {};
      if (examClassId) {
        params.exam_class_id = examClassId;
      }
      const response = await examsApi.rollSlipsHtml(examId, params);
      return mapRollSlipsHtmlResponseApiToDomain(response as ExamApi.RollSlipsHtmlResponse);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useSecretLabelsHtml = (
  examId?: string,
  examClassId?: string,
  subjectId?: string
) => {
  const { user, profile } = useAuth();

  return useQuery<SecretLabelsHtmlResponse | null>({
    queryKey: ['secret-labels-html', examId, examClassId, subjectId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile || !examId) return null;
      const params: { exam_class_id?: string; subject_id?: string } = {};
      if (examClassId) {
        params.exam_class_id = examClassId;
      }
      if (subjectId) {
        params.subject_id = subjectId;
      }
      const response = await examsApi.secretLabelsHtml(examId, params);
      return mapSecretLabelsHtmlResponseApiToDomain(response as ExamApi.SecretLabelsHtmlResponse);
    },
    enabled: !!user && !!profile && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
