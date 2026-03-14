/**
 * Org Facilities Hooks - org-admin managed buildings (mosques, etc.)
 * Uses org_finance permission; no default_school_id required.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import { orgFinanceApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import {
  mapFacilityTypeApiToDomain,
  mapFacilityTypeDomainToInsert,
  mapOrgFacilityApiToDomain,
  mapOrgFacilityDomainToInsert,
  mapOrgFacilityDomainToUpdate,
  mapFacilityStaffApiToDomain,
  mapFacilityStaffDomainToInsert,
  mapFacilityMaintenanceApiToDomain,
  mapFacilityMaintenanceDomainToInsert,
  mapFacilityDocumentApiToDomain,
} from '@/mappers/facilityMapper';
import type * as FacilityApi from '@/types/api/facility';
import type {
  FacilityType,
  OrgFacility,
  FacilityStaff,
  FacilityMaintenance,
  FacilityDocument,
} from '@/types/domain/facility';

const ORG_FACILITIES_KEY = 'org-facilities';

export const useOrgFacilityTypes = () => {
  const { user, profile } = useAuth();
  return useQuery<FacilityType[]>({
    queryKey: [ORG_FACILITIES_KEY, 'types', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.facilityTypes.list();
      const list = Array.isArray(data) ? data : (data as { data?: FacilityApi.FacilityType[] })?.data ?? [];
      return (list as FacilityApi.FacilityType[]).map(mapFacilityTypeApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFacilities = (params?: { facilityTypeId?: string; isActive?: boolean }) => {
  const { user, profile } = useAuth();
  return useQuery<OrgFacility[]>({
    queryKey: [ORG_FACILITIES_KEY, 'list', profile?.organization_id, params],
    queryFn: async () => {
      if (!user || !profile?.organization_id) return [];
      const data = await orgFinanceApi.facilities.list({
        facility_type_id: params?.facilityTypeId,
        is_active: params?.isActive,
      });
      const list = Array.isArray(data) ? data : (data as { data?: FacilityApi.OrgFacility[] })?.data ?? [];
      return (list as FacilityApi.OrgFacility[]).map(mapOrgFacilityApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrgFacility = (id: string | undefined) => {
  const { user, profile } = useAuth();
  return useQuery<OrgFacility | null>({
    queryKey: [ORG_FACILITIES_KEY, 'facility', id, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !id) return null;
      const data = await orgFinanceApi.facilities.get(id);
      return data ? mapOrgFacilityApiToDomain(data as FacilityApi.OrgFacility) : null;
    },
    enabled: !!user && !!profile?.organization_id && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

export const useOrgFacilityStaff = (facilityId: string | undefined) => {
  const { user, profile } = useAuth();
  return useQuery<FacilityStaff[]>({
    queryKey: [ORG_FACILITIES_KEY, 'staff', facilityId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !facilityId) return [];
      const data = await orgFinanceApi.facilities.staff.list(facilityId);
      const list = Array.isArray(data) ? data : (data as { data?: FacilityApi.FacilityStaff[] })?.data ?? [];
      return (list as FacilityApi.FacilityStaff[]).map(mapFacilityStaffApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!facilityId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useOrgFacilityMaintenance = (facilityId: string | undefined) => {
  const { user, profile } = useAuth();
  return useQuery<FacilityMaintenance[]>({
    queryKey: [ORG_FACILITIES_KEY, 'maintenance', facilityId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !facilityId) return [];
      const data = await orgFinanceApi.facilities.maintenance.list(facilityId);
      const list = Array.isArray(data) ? data : (data as { data?: FacilityApi.FacilityMaintenance[] })?.data ?? [];
      return (list as FacilityApi.FacilityMaintenance[]).map(mapFacilityMaintenanceApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!facilityId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useOrgFacilityDocuments = (facilityId: string | undefined) => {
  const { user, profile } = useAuth();
  return useQuery<FacilityDocument[]>({
    queryKey: [ORG_FACILITIES_KEY, 'documents', facilityId, profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !facilityId) return [];
      const data = await orgFinanceApi.facilities.documents.list(facilityId);
      const list = Array.isArray(data) ? data : (data as { data?: FacilityApi.FacilityDocument[] })?.data ?? [];
      return (list as FacilityApi.FacilityDocument[]).map(mapFacilityDocumentApiToDomain);
    },
    enabled: !!user && !!profile?.organization_id && !!facilityId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCreateOrgFacilityDocument = (facilityId: string) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      const res = await orgFinanceApi.facilities.documents.create(facilityId, formData);
      return mapFacilityDocumentApiToDomain(res as FacilityApi.FacilityDocument);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'documents', facilityId] });
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'facility'] });
      showToast.success(t('organizationAdmin.facilityDocumentAdded') ?? 'Document added');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.facilityDocumentAddFailed') ?? 'Failed to add document'));
    },
  });
};

export const useDeleteOrgFacilityDocument = (facilityId: string) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      await orgFinanceApi.facilities.documents.delete(facilityId, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'documents', facilityId] });
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'facility'] });
      showToast.success(t('organizationAdmin.facilityDocumentRemoved') ?? 'Document removed');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.facilityDocumentRemoveFailed') ?? 'Failed to remove document'));
    },
  });
};

export const useDownloadOrgFacilityDocument = () => {
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ facilityId, id }: { facilityId: string; id: string }) => {
      const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
      const url = `${base}/org-finance/facilities/${facilityId}/documents/${id}/download`;
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to download document');
      const blob = await response.blob();
      const cd = response.headers.get('Content-Disposition');
      const filename = cd ? cd.split('filename=')[1]?.replace(/"/g, '') : 'document';
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(objectUrl);
    },
    onError: () => {
      showToast.error(t('organizationAdmin.facilityDocumentDownloadFailed') ?? 'Failed to download document');
    },
  });
};

export const useCreateOrgFacilityType = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<FacilityType>) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      const data = mapFacilityTypeDomainToInsert(payload);
      const res = await orgFinanceApi.facilityTypes.create(data as Record<string, unknown>);
      return mapFacilityTypeApiToDomain(res as FacilityApi.FacilityType);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'types'] });
      showToast.success(t('organizationAdmin.facilityTypeCreated') ?? 'Facility type created');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.facilityTypeCreateFailed') ?? 'Failed to create facility type'));
    },
  });
};

export const useCreateOrgFacility = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<OrgFacility>) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      const data = mapOrgFacilityDomainToInsert(payload);
      const res = await orgFinanceApi.facilities.create(data as Record<string, unknown>);
      return mapOrgFacilityApiToDomain(res as FacilityApi.OrgFacility);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY] });
      showToast.success(t('organizationAdmin.facilityCreated') ?? 'Facility created');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.facilityCreateFailed') ?? 'Failed to create facility'));
    },
  });
};

export const useUpdateOrgFacility = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<OrgFacility> & { id: string }) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      const data = mapOrgFacilityDomainToUpdate(payload);
      const res = await orgFinanceApi.facilities.update(id, data as Record<string, unknown>);
      return mapOrgFacilityApiToDomain(res as FacilityApi.OrgFacility);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY] });
      showToast.success(t('organizationAdmin.facilityUpdated') ?? 'Facility updated');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.facilityUpdateFailed') ?? 'Failed to update facility'));
    },
  });
};

export const useDeleteOrgFacility = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      await orgFinanceApi.facilities.delete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY] });
      showToast.success(t('organizationAdmin.facilityDeleted') ?? 'Facility deleted');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.facilityDeleteFailed') ?? 'Failed to delete facility'));
    },
  });
};

export const useCreateOrgFacilityStaff = (facilityId: string) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<FacilityStaff>) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      const data = mapFacilityStaffDomainToInsert(payload);
      const res = await orgFinanceApi.facilities.staff.create(facilityId, data as Record<string, unknown>);
      return mapFacilityStaffApiToDomain(res as FacilityApi.FacilityStaff);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'staff', facilityId] });
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'facility'] });
      showToast.success(t('organizationAdmin.facilityStaffAdded') ?? 'Staff added');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.facilityStaffAddFailed') ?? 'Failed to add staff'));
    },
  });
};

export const useUpdateOrgFacilityStaff = (facilityId: string) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<FacilityStaff> & { id: string }) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      const data = mapFacilityStaffDomainToInsert(payload);
      const res = await orgFinanceApi.facilities.staff.update(facilityId, id, data as Record<string, unknown>);
      return mapFacilityStaffApiToDomain(res as FacilityApi.FacilityStaff);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'staff', facilityId] });
      showToast.success(t('organizationAdmin.facilityStaffUpdated') ?? 'Staff updated');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.facilityStaffUpdateFailed') ?? 'Failed to update staff'));
    },
  });
};

export const useDeleteOrgFacilityStaff = (facilityId: string) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      await orgFinanceApi.facilities.staff.delete(facilityId, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'staff', facilityId] });
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'facility'] });
      showToast.success(t('organizationAdmin.facilityStaffRemoved') ?? 'Staff removed');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.facilityStaffRemoveFailed') ?? 'Failed to remove staff'));
    },
  });
};

export const useCreateOrgFacilityMaintenance = (facilityId: string) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (payload: Partial<FacilityMaintenance>) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      const data = mapFacilityMaintenanceDomainToInsert(payload);
      const apiData: Record<string, unknown> = {
        maintained_at: data.maintained_at,
        description: data.description,
        status: data.status,
        cost_amount: data.cost_amount,
        currency_id: data.currency_id,
        expense_entry_id: data.expense_entry_id,
      };
      const res = await orgFinanceApi.facilities.maintenance.create(facilityId, apiData);
      return mapFacilityMaintenanceApiToDomain(res as FacilityApi.FacilityMaintenance);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'maintenance', facilityId] });
      showToast.success(t('organizationAdmin.maintenanceRecordAdded') ?? 'Maintenance record added');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.maintenanceRecordAddFailed') ?? 'Failed to add maintenance record'));
    },
  });
};

export const useUpdateOrgFacilityMaintenance = (facilityId: string) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<FacilityMaintenance> & { id: string }) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      const data = mapFacilityMaintenanceDomainToInsert(payload);
      const apiData: Record<string, unknown> = {
        maintained_at: data.maintained_at,
        description: data.description,
        status: data.status,
        cost_amount: data.cost_amount,
        currency_id: data.currency_id,
        expense_entry_id: data.expense_entry_id,
      };
      const res = await orgFinanceApi.facilities.maintenance.update(facilityId, id, apiData);
      return mapFacilityMaintenanceApiToDomain(res as FacilityApi.FacilityMaintenance);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'maintenance', facilityId] });
      showToast.success(t('organizationAdmin.maintenanceRecordUpdated') ?? 'Maintenance record updated');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.maintenanceRecordUpdateFailed') ?? 'Failed to update maintenance record'));
    },
  });
};

export const useDeleteOrgFacilityMaintenance = (facilityId: string) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.organization_id) throw new Error('User must be assigned to an organization');
      await orgFinanceApi.facilities.maintenance.delete(facilityId, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [ORG_FACILITIES_KEY, 'maintenance', facilityId] });
      showToast.success(t('organizationAdmin.maintenanceRecordRemoved') ?? 'Maintenance record removed');
    },
    onError: (err: Error) => {
      showToast.error(err.message ?? (t('organizationAdmin.maintenanceRecordRemoveFailed') ?? 'Failed to remove maintenance record'));
    },
  });
};
