import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { useLanguage } from './useLanguage';
import type * as StudentIdCardApi from '@/types/api/studentIdCard';
import type { 
  StudentIdCard, 
  StudentIdCardInsert, 
  StudentIdCardUpdate,
  IdCardFilters as StudentIdCardFilters,
  AssignIdCardRequest,
  IdCardExportRequest as ExportIdCardRequest,
} from '@/types/domain/studentIdCard';
import { 
  mapStudentIdCardApiToDomain, 
  mapStudentIdCardDomainToInsert,
  mapStudentIdCardDomainToUpdate,
  mapAssignIdCardRequestDomainToApi,
  mapStudentIdCardFiltersDomainToApi,
} from '@/mappers/studentIdCardMapper';
import { studentIdCardsApi } from '@/lib/api/client';

// Re-export domain types for convenience
export type { 
  StudentIdCard, 
  StudentIdCardInsert, 
  StudentIdCardUpdate,
  StudentIdCardFilters,
  AssignIdCardRequest,
  ExportIdCardRequest,
} from '@/types/domain/studentIdCard';

/**
 * List student ID cards with filters
 */
export const useStudentIdCards = (filters?: StudentIdCardFilters) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useQuery<StudentIdCard[]>({
    queryKey: ['student-id-cards', profile?.organization_id, filters],
    queryFn: async () => {
      if (!user || !profile) {
        if (import.meta.env.DEV) {
          console.log('[useStudentIdCards] No user or profile');
        }
        return [];
      }

      try {
        const apiFilters = mapStudentIdCardFiltersDomainToApi({
          ...filters,
          // Always filter by organization
        });

        const apiCards = await studentIdCardsApi.list(apiFilters);
        
        // Map API models to domain models
        return (apiCards as StudentIdCardApi.StudentIdCard[]).map(mapStudentIdCardApiToDomain);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useStudentIdCards] Error fetching ID cards:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !!profile.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

/**
 * Get single student ID card
 */
export const useStudentIdCard = (id: string | null) => {
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  return useQuery<StudentIdCard | null>({
    queryKey: ['student-id-card', id],
    queryFn: async () => {
      if (!id || !user || !profile) {
        return null;
      }

      try {
        const apiCard = await studentIdCardsApi.get(id);
        return mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useStudentIdCard] Error fetching ID card:', error);
        }
        throw error;
      }
    },
    enabled: !!id && !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Bulk assign ID card template to students
 */
export const useAssignIdCards = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: AssignIdCardRequest) => {
      if (!profile?.organization_id) {
        throw new Error('User must be assigned to an organization');
      }

      const apiData = mapAssignIdCardRequestDomainToApi(data);
      const result = await studentIdCardsApi.assign(apiData);
      
      // Map response back to domain models
      if (Array.isArray(result)) {
        return (result as StudentIdCardApi.StudentIdCard[]).map(mapStudentIdCardApiToDomain);
      }
      return [];
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardsAssigned'));
      void queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardAssignFailed'));
    },
  });
};

/**
 * Update student ID card
 */
export const useUpdateStudentIdCard = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & StudentIdCardUpdate) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      const apiUpdates = mapStudentIdCardDomainToUpdate(updates);
      const apiCard = await studentIdCardsApi.update(id, apiUpdates);
      return mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardUpdated'));
      void queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
      void queryClient.invalidateQueries({ queryKey: ['student-id-card'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardUpdateFailed'));
    },
  });
};

/**
 * Mark card as printed
 */
export const useMarkCardPrinted = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      const apiCard = await studentIdCardsApi.markPrinted(id);
      return mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardMarkedPrinted'));
      void queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
      void queryClient.invalidateQueries({ queryKey: ['student-id-card'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardMarkPrintedFailed'));
    },
  });
};

/**
 * Mark card fee as paid
 */
export const useMarkCardFeePaid = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, paidDate }: { id: string; paidDate?: Date }) => {
      const apiCard = await studentIdCardsApi.markFeePaid(id, {
        card_fee_paid: true,
        card_fee_paid_date: paidDate?.toISOString() ?? new Date().toISOString(),
      });
      return mapStudentIdCardApiToDomain(apiCard as StudentIdCardApi.StudentIdCard);
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardFeeMarkedPaid'));
      void queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
      void queryClient.invalidateQueries({ queryKey: ['student-id-card'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardFeeMarkPaidFailed'));
    },
  });
};

/**
 * Delete student ID card (soft delete)
 */
export const useDeleteStudentIdCard = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: string) => {
      await studentIdCardsApi.delete(id);
    },
    onSuccess: async () => {
      showToast.success(t('toast.idCardDeleted'));
      await queryClient.invalidateQueries({ queryKey: ['student-id-cards'] });
      await queryClient.refetchQueries({ queryKey: ['student-id-cards'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardDeleteFailed'));
    },
  });
};

/**
 * Export ID cards (ZIP/PDF)
 */
export const useExportIdCards = () => {
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: ExportIdCardRequest) => {
      // Convert domain filters to API filters
      const apiFilters = data.filters 
        ? mapStudentIdCardFiltersDomainToApi(data.filters)
        : undefined;

      // Convert sides from 'front' | 'back' | 'both' to array
      const sidesArray: ('front' | 'back')[] = 
        data.sides === 'both' ? ['front', 'back'] :
        data.sides === 'front' ? ['front'] :
        ['back'];

      const exportData = {
        card_ids: data.cardIds,
        filters: apiFilters,
        format: data.format,
        sides: sidesArray,
        cards_per_page: data.cardsPerPage,
        quality: data.quality,
        include_unprinted: data.includeUnprinted,
        include_unpaid: data.includeUnpaid,
        file_naming_template: data.fileNamingTemplate,
      };

      return await studentIdCardsApi.exportBulk(exportData);
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardsExported'));
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardExportFailed'));
    },
  });
};

/**
 * Preview ID card image
 */
export const usePreviewIdCard = () => {
  return useMutation({
    mutationFn: async ({ id, side }: { id: string; side: 'front' | 'back' }) => {
      return await studentIdCardsApi.preview(id, side);
    },
  });
};

/**
 * Export individual ID card
 */
export const useExportIndividualIdCard = () => {
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, format }: { id: string; format: 'png' | 'pdf' }) => {
      return await studentIdCardsApi.exportIndividual(id, format);
    },
    onSuccess: () => {
      showToast.success(t('toast.idCardExported'));
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.idCardExportFailed'));
    },
  });
};

