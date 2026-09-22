import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { examAbsencePenaltyApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

export interface AbsencePenaltyBandForm {
  minAbsences: number;
  maxAbsences: number | null;
  marksPerAbsence: number;
}

export interface AbsencePenaltySettings {
  id: string;
  examId: string;
  organizationId: string;
  schoolId: string;
  isEnabled: boolean;
  examClassIds: string[];
  bands: AbsencePenaltyBandForm[];
}

export interface StudentExamAbsenceRow {
  studentAdmissionId: string;
  studentId: string;
  studentName: string | null;
  fatherName: string | null;
  admissionNo: string | null;
  examClassId: string | null;
  absenceCount: number;
}

function settingsQueryKey(
  organizationId: string | undefined | null,
  schoolId: string | undefined | null,
  examId: string | undefined | null,
) {
  return ['exam-absence-penalty-settings', organizationId ?? null, schoolId ?? null, examId ?? null] as const;
}

function absencesQueryKey(
  organizationId: string | undefined | null,
  schoolId: string | undefined | null,
  examId: string | undefined | null,
  examClassId: string | undefined | null,
) {
  return [
    'exam-absence-penalty-absences',
    organizationId ?? null,
    schoolId ?? null,
    examId ?? null,
    examClassId ?? null,
  ] as const;
}

export function useExamAbsencePenaltySettings(examId?: string) {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: settingsQueryKey(profile?.organization_id, profile?.default_school_id, examId),
    queryFn: async (): Promise<AbsencePenaltySettings> => {
      if (!examId) {
        throw new Error('Exam is required');
      }
      const data = await examAbsencePenaltyApi.getSettings(examId);
      return {
        id: data.id,
        examId: data.exam_id,
        organizationId: data.organization_id,
        schoolId: data.school_id,
        isEnabled: data.is_enabled,
        examClassIds: data.exam_class_ids || [],
        bands: (data.bands || []).map((band) => ({
          minAbsences: band.min_absences,
          maxAbsences: band.max_absences,
          marksPerAbsence: band.marks_per_absence,
        })),
      };
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateExamAbsencePenaltySettings() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (payload: {
      examId: string;
      isEnabled: boolean;
      examClassIds: string[];
      bands: AbsencePenaltyBandForm[];
    }) => {
      return examAbsencePenaltyApi.updateSettings({
        exam_id: payload.examId,
        is_enabled: payload.isEnabled,
        exam_class_ids: payload.examClassIds,
        bands: payload.bands.map((band) => ({
          min_absences: band.minAbsences,
          max_absences: band.maxAbsences,
          marks_per_absence: band.marksPerAbsence,
        })),
      });
    },
    onSuccess: (_data, variables) => {
      showToast.success(t('examAbsencePenalty.settingsSaved') || 'Absence penalty settings saved');
      void queryClient.invalidateQueries({
        queryKey: settingsQueryKey(
          profile?.organization_id,
          profile?.default_school_id,
          variables.examId,
        ),
      });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('examAbsencePenalty.settingsSaveFailed') || 'Failed to save settings');
    },
  });
}

export function useCopyExamAbsencePenaltySettings() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (payload: {
      sourceExamId: string;
      targetExamId: string;
      copyExamClasses?: boolean;
    }) => {
      return examAbsencePenaltyApi.copy({
        source_exam_id: payload.sourceExamId,
        target_exam_id: payload.targetExamId,
        copy_exam_classes: payload.copyExamClasses ?? false,
      });
    },
    onSuccess: (_data, variables) => {
      showToast.success(t('examAbsencePenalty.copySuccess') || 'Settings copied from exam');
      void queryClient.invalidateQueries({
        queryKey: settingsQueryKey(
          profile?.organization_id,
          profile?.default_school_id,
          variables.targetExamId,
        ),
      });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('examAbsencePenalty.copyFailed') || 'Failed to copy settings');
    },
  });
}

export function useExamStudentAbsences(examId?: string, examClassId?: string) {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: absencesQueryKey(
      profile?.organization_id,
      profile?.default_school_id,
      examId,
      examClassId,
    ),
    queryFn: async (): Promise<StudentExamAbsenceRow[]> => {
      if (!examId) return [];
      const data = await examAbsencePenaltyApi.listAbsences({
        exam_id: examId,
        exam_class_id: examClassId || undefined,
      });
      return (data.rows || []).map((row) => ({
        studentAdmissionId: row.student_admission_id,
        studentId: row.student_id,
        studentName: row.student_name,
        fatherName: row.father_name,
        admissionNo: row.admission_no,
        examClassId: row.exam_class_id,
        absenceCount: row.absence_count,
      }));
    },
    enabled:
      !!user &&
      !!profile?.organization_id &&
      !!profile?.default_school_id &&
      !!examId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpsertExamStudentAbsences() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (payload: {
      examId: string;
      rows: Array<{ studentAdmissionId: string; absenceCount: number }>;
    }) => {
      return examAbsencePenaltyApi.upsertAbsences({
        exam_id: payload.examId,
        rows: payload.rows.map((row) => ({
          student_admission_id: row.studentAdmissionId,
          absence_count: row.absenceCount,
        })),
      });
    },
    onSuccess: (_data, variables) => {
      showToast.success(t('examAbsencePenalty.absencesSaved') || 'Absence totals saved');
      void queryClient.invalidateQueries({
        queryKey: [
          'exam-absence-penalty-absences',
          profile?.organization_id ?? null,
          profile?.default_school_id ?? null,
          variables.examId,
        ],
      });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('examAbsencePenalty.absencesSaveFailed') || 'Failed to save absences');
    },
  });
}
