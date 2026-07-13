import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { useProfile } from './useProfiles';

import { examSeatingApi } from '@/lib/api/client';
import {
  mapExamSeatingMapApiToDomain,
  mapExamSeatingMapDetailApiToDomain,
  mapExamSeatingMapFormToInsert,
  mapExamSeatingMapFormToUpdate,
  mapReportDataApiToDomain,
  mapRollNumberConfirmApiToDomain,
  mapRollNumberPreviewApiToDomain,
  mapSolveResponseApiToDomain,
  mapSolveStatusApiToDomain,
  mapSyncAssignmentsDomainToApi,
  mapSyncClassColorsDomainToApi,
  mapSyncMapClassesDomainToApi,
} from '@/mappers/examSeatingMapper';
import { showToast } from '@/lib/toast';
import { useServerReport } from '@/hooks/useServerReport';
import type * as ExamSeatingApi from '@/types/api/examSeating';
import type {
  ExamSeatingMap,
  ExamSeatingMapDetail,
  ExamSeatingMapFormData,
  ExamSeatingReportData,
  MapRollNumberConfirmResponse,
  MapRollNumberPreviewResponse,
  SolveExamSeatingMapResult,
  SolveStatusResult,
  SyncExamSeatingAssignmentItem,
} from '@/types/domain/examSeating';

export type {
  ExamSeatingMap,
  ExamSeatingMapDetail,
  ExamSeatingAssignment,
  ExamSeatingClassColor,
  ExamSeatingRun,
  ExamSeatingReportData,
  MapRollNumberPreviewResponse,
  MapRollNumberConfirmResponse,
} from '@/types/domain/examSeating';

const seatingMapsQueryKey = (
  examId?: string,
  organizationId?: string | null,
  schoolId?: string | null
) => ['exam-seating-maps', examId, organizationId, schoolId ?? null] as const;

const seatingMapQueryKey = (
  examId?: string,
  mapId?: string,
  organizationId?: string | null,
  schoolId?: string | null
) => ['exam-seating-map', examId, mapId, organizationId, schoolId ?? null] as const;

const seatingSolveStatusQueryKey = (
  examId?: string,
  mapId?: string,
  organizationId?: string | null,
  schoolId?: string | null
) => ['exam-seating-solve-status', examId, mapId, organizationId, schoolId ?? null] as const;

const seatingReportDataQueryKey = (
  examId?: string,
  mapId?: string,
  organizationId?: string | null,
  schoolId?: string | null
) => ['exam-seating-report-data', examId, mapId, organizationId, schoolId ?? null] as const;

const invalidateSeatingCaches = async (
  queryClient: ReturnType<typeof useQueryClient>,
  examId: string,
  mapId?: string
) => {
  await queryClient.invalidateQueries({ queryKey: ['exam-seating-maps', examId] });
  if (mapId) {
    await queryClient.invalidateQueries({ queryKey: ['exam-seating-map', examId, mapId] });
    await queryClient.invalidateQueries({ queryKey: ['exam-seating-solve-status', examId, mapId] });
    await queryClient.invalidateQueries({ queryKey: ['exam-seating-report-data', examId, mapId] });
  }
  await queryClient.invalidateQueries({ queryKey: ['exam-students-with-numbers'] });
  await queryClient.invalidateQueries({ queryKey: ['roll-number-start-from'] });
  await queryClient.invalidateQueries({ queryKey: ['roll-number-report'] });
  await queryClient.invalidateQueries({ queryKey: ['roll-slips-html'] });
};

export const useExamSeatingMaps = (examId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamSeatingMap[]>({
    queryKey: seatingMapsQueryKey(examId, profile?.organization_id, profile?.default_school_id ?? null),
    queryFn: async () => {
      if (!user || !profile || !examId) return [];
      const response = await examSeatingApi.list(examId);
      const maps = Array.isArray(response)
        ? response
        : (response as { data?: ExamSeatingApi.ExamSeatingMap[] })?.data ?? [];
      return maps.map(mapExamSeatingMapApiToDomain);
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id && !!examId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useExamSeatingMap = (examId?: string, mapId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamSeatingMapDetail | null>({
    queryKey: seatingMapQueryKey(examId, mapId, profile?.organization_id, profile?.default_school_id ?? null),
    queryFn: async () => {
      if (!user || !profile || !examId || !mapId) return null;
      const response = await examSeatingApi.get(examId, mapId);
      const detail = (response as { data?: ExamSeatingApi.ExamSeatingMapDetail }).data
        ?? (response as ExamSeatingApi.ExamSeatingMapDetail);
      return mapExamSeatingMapDetailApiToDomain(detail);
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id && !!examId && !!mapId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useExamSeatingSolveStatus = (
  examId?: string,
  mapId?: string,
  enabled = false,
  refetchInterval: number | false = false
) => {
  const { user, profile } = useAuth();

  return useQuery<SolveStatusResult | null>({
    queryKey: seatingSolveStatusQueryKey(examId, mapId, profile?.organization_id, profile?.default_school_id ?? null),
    queryFn: async () => {
      if (!user || !profile || !examId || !mapId) return null;
      const response = await examSeatingApi.getSolveStatus(examId, mapId);
      return mapSolveStatusApiToDomain(response as ExamSeatingApi.SolveStatusResponse);
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id && !!examId && !!mapId && enabled,
    refetchInterval,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};

export const useExamSeatingReportData = (examId?: string, mapId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<ExamSeatingReportData | null>({
    queryKey: seatingReportDataQueryKey(examId, mapId, profile?.organization_id, profile?.default_school_id ?? null),
    queryFn: async () => {
      if (!user || !profile || !examId || !mapId) return null;
      const response = await examSeatingApi.getReportData(examId, mapId);
      return mapReportDataApiToDomain(response as ExamSeatingApi.ExamSeatingReportDataResponse);
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id && !!examId && !!mapId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateExamSeatingMap = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ examId, data }: { examId: string; data: ExamSeatingMapFormData }) => {
      const response = await examSeatingApi.create(examId, mapExamSeatingMapFormToInsert(data));
      const map = (response as { data?: ExamSeatingApi.ExamSeatingMap }).data
        ?? (response as ExamSeatingApi.ExamSeatingMap);
      return mapExamSeatingMapApiToDomain(map);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapCreated'));
      await invalidateSeatingCaches(queryClient, variables.examId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapCreateFailed'));
    },
  });
};

export const useUpdateExamSeatingMap = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      mapId,
      data,
    }: {
      examId: string;
      mapId: string;
      data: Partial<ExamSeatingMapFormData>;
    }) => {
      const response = await examSeatingApi.update(examId, mapId, mapExamSeatingMapFormToUpdate(data));
      const map = (response as { data?: ExamSeatingApi.ExamSeatingMap }).data
        ?? (response as ExamSeatingApi.ExamSeatingMap);
      return mapExamSeatingMapApiToDomain(map);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapUpdated'));
      await invalidateSeatingCaches(queryClient, variables.examId, variables.mapId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapUpdateFailed'));
    },
  });
};

export const useDeleteExamSeatingMap = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ examId, mapId }: { examId: string; mapId: string }) => {
      await examSeatingApi.delete(examId, mapId);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapDeleted'));
      await invalidateSeatingCaches(queryClient, variables.examId, variables.mapId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapDeleteFailed'));
    },
  });
};

export const useSyncExamSeatingAssignments = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      mapId,
      revision,
      assignments,
    }: {
      examId: string;
      mapId: string;
      revision: number;
      assignments: SyncExamSeatingAssignmentItem[];
    }) => {
      const response = await examSeatingApi.syncAssignments(
        examId,
        mapId,
        mapSyncAssignmentsDomainToApi(revision, assignments)
      );
      const detail = (response as { data?: ExamSeatingApi.ExamSeatingMapDetail }).data
        ?? (response as ExamSeatingApi.ExamSeatingMapDetail);
      return mapExamSeatingMapDetailApiToDomain(detail);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapAssignmentsSaved'));
      await invalidateSeatingCaches(queryClient, variables.examId, variables.mapId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapAssignmentsSaveFailed'));
    },
  });
};

export const useSyncExamSeatingClassColors = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      mapId,
      colors,
    }: {
      examId: string;
      mapId: string;
      colors: Array<{ examClassId: string; colorHex: string }>;
    }) => {
      const response = await examSeatingApi.syncClassColors(
        examId,
        mapId,
        mapSyncClassColorsDomainToApi(colors)
      );
      const detail = (response as { data?: ExamSeatingApi.ExamSeatingMapDetail }).data
        ?? (response as ExamSeatingApi.ExamSeatingMapDetail);
      return mapExamSeatingMapDetailApiToDomain(detail);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapUpdated'));
      await invalidateSeatingCaches(queryClient, variables.examId, variables.mapId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapUpdateFailed'));
    },
  });
};

export const useSyncExamSeatingMapClasses = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      mapId,
      examClassIds,
    }: {
      examId: string;
      mapId: string;
      examClassIds: string[];
    }) => {
      const response = await examSeatingApi.syncMapClasses(
        examId,
        mapId,
        mapSyncMapClassesDomainToApi(examClassIds)
      );
      const detail = (response as { data?: ExamSeatingApi.ExamSeatingMapDetail }).data
        ?? (response as ExamSeatingApi.ExamSeatingMapDetail);
      return mapExamSeatingMapDetailApiToDomain(detail);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapClassesUpdated'));
      await invalidateSeatingCaches(queryClient, variables.examId, variables.mapId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapClassesUpdateFailed'));
    },
  });
};

export const useSolveExamSeatingMap = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      mapId,
      revision,
      inputChecksum,
      strictMode,
      seed,
    }: {
      examId: string;
      mapId: string;
      revision: number;
      inputChecksum: string;
      strictMode?: boolean;
      seed?: number;
    }): Promise<SolveExamSeatingMapResult> => {
      const response = await examSeatingApi.solve(examId, mapId, {
        revision,
        input_checksum: inputChecksum,
        strict_mode: strictMode,
        seed,
      });
      return mapSolveResponseApiToDomain(response as ExamSeatingApi.SolveExamSeatingMapResponse);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapSolveStarted'));
      await invalidateSeatingCaches(queryClient, variables.examId, variables.mapId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapSolveFailed'));
    },
  });
};

export const useFinalizeExamSeatingMap = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      mapId,
      revision,
    }: {
      examId: string;
      mapId: string;
      revision: number;
    }) => {
      const response = await examSeatingApi.finalize(examId, mapId, { revision });
      const map = (response as { data?: ExamSeatingApi.ExamSeatingMap }).data
        ?? (response as ExamSeatingApi.ExamSeatingMap);
      return mapExamSeatingMapApiToDomain(map);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapFinalized'));
      await invalidateSeatingCaches(queryClient, variables.examId, variables.mapId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapFinalizeFailed'));
    },
  });
};

export const useReopenExamSeatingMap = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ examId, mapId }: { examId: string; mapId: string }) => {
      const response = await examSeatingApi.reopen(examId, mapId);
      const detail = (response as { data?: ExamSeatingApi.ExamSeatingMapDetail }).data
        ?? (response as ExamSeatingApi.ExamSeatingMapDetail);
      return mapExamSeatingMapDetailApiToDomain(detail);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapReopened') || t('toast.seatingMapUpdated'));
      await invalidateSeatingCaches(queryClient, variables.examId, variables.mapId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapReopenFailed') || t('toast.seatingMapUpdateFailed'));
    },
  });
};

export const useDuplicateExamSeatingMap = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ examId, mapId }: { examId: string; mapId: string }) => {
      const response = await examSeatingApi.duplicate(examId, mapId);
      const map = (response as ExamSeatingApi.DuplicateExamSeatingMapResponse).map
        ?? (response as { data?: ExamSeatingApi.ExamSeatingMap }).data
        ?? (response as ExamSeatingApi.ExamSeatingMap);
      return mapExamSeatingMapApiToDomain(map);
    },
    onSuccess: async (_data, variables) => {
      showToast.success(t('toast.seatingMapDuplicated'));
      await invalidateSeatingCaches(queryClient, variables.examId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapDuplicateFailed'));
    },
  });
};

export const usePreviewMapRollNumbers = () => {
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      mapId,
    }: {
      examId: string;
      mapId: string;
    }): Promise<MapRollNumberPreviewResponse> => {
      const response = await examSeatingApi.previewMapRollNumbers(examId, mapId);
      return mapRollNumberPreviewApiToDomain(response as ExamSeatingApi.MapRollNumberPreviewResponse);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.previewFailed'));
    },
  });
};

export const useConfirmMapRollNumbers = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      examId,
      mapId,
      revision,
      inputChecksum,
    }: {
      examId: string;
      mapId: string;
      revision: number;
      inputChecksum: string;
    }): Promise<MapRollNumberConfirmResponse> => {
      const response = await examSeatingApi.confirmMapRollNumbers(examId, mapId, {
        revision,
        input_checksum: inputChecksum,
      });
      return mapRollNumberConfirmApiToDomain(response as ExamSeatingApi.MapRollNumberConfirmResponse);
    },
    onSuccess: async (data, variables) => {
      const message = data.errors.length > 0
        ? t('toast.seatingMapRollNumbersAppliedWithErrors', {
            count: data.updated,
            errors: data.errors.length,
          })
        : t('toast.seatingMapRollNumbersApplied', { count: data.updated });
      showToast.success(message);
      await invalidateSeatingCaches(queryClient, variables.examId, variables.mapId);
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.seatingMapRollNumbersApplyFailed'));
    },
  });
};

export const useExamSeatingMapReport = () => {
  const { t } = useLanguage();
  const {
    generateReport,
    isGenerating,
    progress,
    status,
    downloadUrl,
    fileName,
    error,
    downloadReport,
    reset,
  } = useServerReport();

  const generateSeatingMapReport = useCallback(
    async ({
      reportData,
      reportType,
      title,
      brandingId,
      reportTemplateId,
    }: {
      reportData: ExamSeatingReportData;
      reportType: 'pdf' | 'excel';
      title: string;
      brandingId?: string | null;
      reportTemplateId?: string | null;
    }) => {
      await generateReport({
        reportKey: 'exam_seating_map',
        reportType,
        title,
        brandingId: brandingId ?? undefined,
        reportTemplateId: reportTemplateId ?? undefined,
        templateName: reportType === 'pdf' ? 'exam_seating_map' : undefined,
        async: true,
        // Server re-fetches seating data via parameters.map_id; still send
        // columns/rows so Excel validation (no custom template) succeeds.
        columns: reportData.columns,
        rows: reportData.rows,
        parameters: {
          map_id: reportData.map.id,
          map_name: reportData.map.name,
          exam_id: reportData.map.examId,
        },
      });
    },
    [generateReport]
  );

  return {
    generateSeatingMapReport,
    isGenerating,
    progress,
    status,
    downloadUrl,
    fileName,
    error,
    downloadReport,
    reset,
    t,
  };
};
