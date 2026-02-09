import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { schoolsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { useLanguage } from './useLanguage';
import type * as SchoolAdmissionRulesApi from '@/types/api/schoolAdmissionRules';
import type { SchoolAdmissionRules, SchoolAdmissionRulesUpdate } from '@/types/domain/schoolAdmissionRules';

// Re-export domain types for convenience
export type { SchoolAdmissionRules, SchoolAdmissionRulesUpdate } from '@/types/domain/schoolAdmissionRules';

/**
 * Mapper: Convert API SchoolAdmissionRules to Domain SchoolAdmissionRules
 */
function mapSchoolAdmissionRulesApiToDomain(
  api: SchoolAdmissionRulesApi.SchoolAdmissionRules
): SchoolAdmissionRules {
  return {
    commitmentItems: api.commitment_items ?? [],
    guaranteeText: api.guarantee_text ?? '',
    labels: api.labels,
  };
}

/**
 * Mapper: Convert Domain SchoolAdmissionRulesUpdate to API SchoolAdmissionRulesUpdate
 */
function mapSchoolAdmissionRulesDomainToUpdate(
  domain: SchoolAdmissionRulesUpdate
): SchoolAdmissionRulesApi.SchoolAdmissionRulesUpdate {
  const out: SchoolAdmissionRulesApi.SchoolAdmissionRulesUpdate = {
    commitment_items: domain.commitmentItems,
    guarantee_text: domain.guaranteeText,
  };
  if (domain.labels !== undefined) {
    out.labels = domain.labels;
  }
  return out;
}

/**
 * Hook to fetch school admission rules
 */
export const useSchoolAdmissionRules = (schoolId: string | null | undefined) => {
  const { t } = useLanguage();

  return useQuery<SchoolAdmissionRules | null>({
    queryKey: ['school-admission-rules', schoolId],
    queryFn: async () => {
      if (!schoolId) return null;

      try {
        const apiRules = await schoolsApi.getAdmissionRules(schoolId);
        return mapSchoolAdmissionRulesApiToDomain(
          apiRules as SchoolAdmissionRulesApi.SchoolAdmissionRules
        );
      } catch (error: any) {
        // 404 means rules don't exist yet (not seeded), return null
        if (error?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to update school admission rules
 */
export const useUpdateSchoolAdmissionRules = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      schoolId,
      ...data
    }: SchoolAdmissionRulesUpdate & { schoolId: string }) => {
      const updateData = mapSchoolAdmissionRulesDomainToUpdate(data);
      const apiRules = await schoolsApi.updateAdmissionRules(schoolId, updateData);
      return mapSchoolAdmissionRulesApiToDomain(
        apiRules as SchoolAdmissionRulesApi.SchoolAdmissionRules
      );
    },
    onSuccess: (data, variables) => {
      showToast.success(t('toast.schoolRulesUpdated') || 'School rules updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['school-admission-rules', variables.schoolId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('toast.schoolRulesUpdateFailed') || 'Failed to update school rules');
    },
  });
};
