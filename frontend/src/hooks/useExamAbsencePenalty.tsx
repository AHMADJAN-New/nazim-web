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
  organizationId: string;
  schoolId: string;
  isEnabled: boolean;
  bands: AbsencePenaltyBandForm[];
}

export interface StudentYearAbsenceRow {
  studentAdmissionId: string;
  studentId: string;
  studentName: string | null;
  fatherName: string | null;
  admissionNo: string | null;
  classAcademicYearId: string | null;
  absenceCount: number;
}

export function useExamAbsencePenaltySettings() {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: [
      'exam-absence-penalty-settings',
      profile?.organization_id,
      profile?.default_school_id ?? null,
    ],
    queryFn: async (): Promise<AbsencePenaltySettings> => {
      const data = await examAbsencePenaltyApi.getSettings();
      return {
        id: data.id,
        organizationId: data.organization_id,
        schoolId: data.school_id,
        isEnabled: data.is_enabled,
        bands: (data.bands || []).map((band) => ({
          minAbsences: band.min_absences,
          maxAbsences: band.max_absences,
          marksPerAbsence: band.marks_per_absence,
        })),
      };
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateExamAbsencePenaltySettings() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (payload: { isEnabled: boolean; bands: AbsencePenaltyBandForm[] }) => {
      return examAbsencePenaltyApi.updateSettings({
        is_enabled: payload.isEnabled,
        bands: payload.bands.map((band) => ({
          min_absences: band.minAbsences,
          max_absences: band.maxAbsences,
          marks_per_absence: band.marksPerAbsence,
        })),
      });
    },
    onSuccess: () => {
      showToast.success(t('examAbsencePenalty.settingsSaved') || 'Absence penalty settings saved');
      void queryClient.invalidateQueries({
        queryKey: [
          'exam-absence-penalty-settings',
          profile?.organization_id,
          profile?.default_school_id ?? null,
        ],
      });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('examAbsencePenalty.settingsSaveFailed') || 'Failed to save settings');
    },
  });
}

export function useStudentAcademicYearAbsences(
  academicYearId?: string,
  classAcademicYearId?: string,
) {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: [
      'exam-absence-penalty-absences',
      profile?.organization_id,
      profile?.default_school_id ?? null,
      academicYearId ?? null,
      classAcademicYearId ?? null,
    ],
    queryFn: async (): Promise<StudentYearAbsenceRow[]> => {
      if (!academicYearId) return [];
      const data = await examAbsencePenaltyApi.listAbsences({
        academic_year_id: academicYearId,
        class_academic_year_id: classAcademicYearId || undefined,
      });
      return (data.rows || []).map((row) => ({
        studentAdmissionId: row.student_admission_id,
        studentId: row.student_id,
        studentName: row.student_name,
        fatherName: row.father_name,
        admissionNo: row.admission_no,
        classAcademicYearId: row.class_academic_year_id,
        absenceCount: row.absence_count,
      }));
    },
    enabled:
      !!user &&
      !!profile?.organization_id &&
      !!profile?.default_school_id &&
      !!academicYearId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useUpsertStudentAcademicYearAbsences() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (payload: {
      academicYearId: string;
      rows: Array<{ studentAdmissionId: string; absenceCount: number }>;
    }) => {
      return examAbsencePenaltyApi.upsertAbsences({
        academic_year_id: payload.academicYearId,
        rows: payload.rows.map((row) => ({
          student_admission_id: row.studentAdmissionId,
          absence_count: row.absenceCount,
        })),
      });
    },
    onSuccess: () => {
      showToast.success(t('examAbsencePenalty.absencesSaved') || 'Absence totals saved');
      void queryClient.invalidateQueries({
        queryKey: [
          'exam-absence-penalty-absences',
          profile?.organization_id,
          profile?.default_school_id ?? null,
        ],
      });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('examAbsencePenalty.absencesSaveFailed') || 'Failed to save absences');
    },
  });
}
