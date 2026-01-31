import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { websiteAdmissionsApi, websiteAdmissionFieldsApi, publicWebsiteApi, type PaginatedResponse } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import type * as OnlineAdmissionApi from '@/types/api/onlineAdmission';
import type {
  OnlineAdmission,
  OnlineAdmissionField,
  OnlineAdmissionStatus,
} from '@/types/domain/onlineAdmission';
import {
  mapOnlineAdmissionApiToDomain,
  mapOnlineAdmissionFieldApiToDomain,
  mapOnlineAdmissionFieldDomainToInsert,
  mapOnlineAdmissionFieldDomainToUpdate,
} from '@/mappers/onlineAdmissionMapper';

export interface OnlineAdmissionsQueryParams {
  status?: OnlineAdmissionStatus;
  search?: string;
}

export const useWebsiteOnlineAdmissions = (params?: OnlineAdmissionsQueryParams) => {
  const { data: profile } = useProfile();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const queryResult = useQuery({
    queryKey: [
      'online-admissions',
      profile?.organization_id,
      profile?.default_school_id ?? null,
      page,
      pageSize,
      params?.status ?? null,
      params?.search ?? null,
    ],
    queryFn: async () => {
      if (!profile?.organization_id || !profile?.default_school_id) {
        return { data: [] as OnlineAdmissionApi.OnlineAdmission[], pagination: null };
      }

      const response = await websiteAdmissionsApi.list({
        status: params?.status,
        search: params?.search,
        page,
        per_page: pageSize,
      });

      if (Array.isArray(response)) {
        return { data: response, pagination: null };
      }

      if (response && typeof response === 'object' && 'data' in response) {
        return { data: (response as PaginatedResponse<OnlineAdmissionApi.OnlineAdmission>).data, pagination: response };
      }

      return { data: [], pagination: null };
    },
    enabled: !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const admissions = useMemo(
    () => (queryResult.data?.data || []).map(mapOnlineAdmissionApiToDomain),
    [queryResult.data?.data]
  );

  return {
    admissions,
    pagination: queryResult.data?.pagination ?? null,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    page,
    pageSize,
    setPage,
    setPageSize,
    refetch: queryResult.refetch,
  };
};

export const useWebsiteOnlineAdmission = (id?: string) => {
  const { data: profile } = useProfile();

  return useQuery<OnlineAdmission | null>({
    queryKey: ['online-admission', profile?.organization_id, profile?.default_school_id ?? null, id],
    queryFn: async () => {
      if (!id || !profile?.organization_id || !profile?.default_school_id) return null;
      const response = await websiteAdmissionsApi.get(id);
      return mapOnlineAdmissionApiToDomain(response as OnlineAdmissionApi.OnlineAdmission);
    },
    enabled: !!id && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useUpdateWebsiteOnlineAdmission = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { status?: OnlineAdmissionStatus; notes?: string | null; rejectionReason?: string | null } }) => {
      return websiteAdmissionsApi.update(id, {
        status: data.status,
        notes: data.notes ?? null,
        rejection_reason: data.rejectionReason ?? null,
      });
    },
    onSuccess: () => {
      showToast.success(t('toast.onlineAdmissionUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['online-admissions'] });
      void queryClient.invalidateQueries({ queryKey: ['online-admission'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.onlineAdmissionUpdateFailed'));
    },
  });
};

export const useAcceptWebsiteOnlineAdmission = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, admissionNo, admissionYear }: { id: string; admissionNo?: string; admissionYear?: string }) => {
      return websiteAdmissionsApi.accept(id, {
        admission_no: admissionNo,
        admission_year: admissionYear,
      });
    },
    onSuccess: async () => {
      showToast.success(t('toast.onlineAdmissionAccepted'));
      await queryClient.invalidateQueries({ queryKey: ['online-admissions'] });
      await queryClient.refetchQueries({ queryKey: ['online-admissions'] });
      await queryClient.invalidateQueries({ queryKey: ['online-admission'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.onlineAdmissionAcceptFailed'));
    },
  });
};

export const useWebsiteAdmissionFields = () => {
  const { data: profile } = useProfile();

  return useQuery<OnlineAdmissionField[]>({
    queryKey: ['online-admission-fields', profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!profile?.organization_id || !profile?.default_school_id) return [];
      const response = await websiteAdmissionFieldsApi.list();
      const fields = Array.isArray(response) ? response : (response?.data || []);
      return (fields as OnlineAdmissionApi.OnlineAdmissionField[]).map(mapOnlineAdmissionFieldApiToDomain);
    },
    enabled: !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateWebsiteAdmissionField = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (field: OnlineAdmissionField) => {
      const payload = mapOnlineAdmissionFieldDomainToInsert(field);
      return websiteAdmissionFieldsApi.create(payload);
    },
    onSuccess: () => {
      showToast.success(t('toast.onlineAdmissionFieldCreated'));
      void queryClient.invalidateQueries({ queryKey: ['online-admission-fields'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.onlineAdmissionFieldCreateFailed'));
    },
  });
};

export const useUpdateWebsiteAdmissionField = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, field }: { id: string; field: Partial<OnlineAdmissionField> }) => {
      const payload = mapOnlineAdmissionFieldDomainToUpdate(field);
      return websiteAdmissionFieldsApi.update(id, payload);
    },
    onSuccess: () => {
      showToast.success(t('toast.onlineAdmissionFieldUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['online-admission-fields'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.onlineAdmissionFieldUpdateFailed'));
    },
  });
};

export const useDeleteWebsiteAdmissionField = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      return websiteAdmissionFieldsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.onlineAdmissionFieldDeleted'));
      await queryClient.invalidateQueries({ queryKey: ['online-admission-fields'] });
      await queryClient.refetchQueries({ queryKey: ['online-admission-fields'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.onlineAdmissionFieldDeleteFailed'));
    },
  });
};

export const usePublicAdmissionFields = () => {
  return useQuery<OnlineAdmissionField[]>({
    queryKey: ['public-admission-fields'],
    queryFn: async () => {
      const response = await publicWebsiteApi.getAdmissionFields();
      const fields = Array.isArray(response) ? response : (response?.data || []);
      return (fields as OnlineAdmissionApi.OnlineAdmissionField[]).map(mapOnlineAdmissionFieldApiToDomain);
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
