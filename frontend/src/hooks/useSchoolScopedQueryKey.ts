import { useMemo } from 'react';

import { useSchoolContext } from '@/contexts/SchoolContext';

import { useAuth } from './useAuth';

/**
 * School id for TanStack Query keys for school-scoped API data.
 * Must stay aligned with `apiClient` auto `school_id` (selected school when
 * `schools_access_all`, otherwise profile default).
 */
export function useSchoolScopedQueryKey(): string | null {
  const { profile } = useAuth();
  const { selectedSchoolId, hasSchoolsAccessAll } = useSchoolContext();

  return useMemo(() => {
    if (hasSchoolsAccessAll) {
      return selectedSchoolId ?? profile?.default_school_id ?? null;
    }
    return profile?.default_school_id ?? null;
  }, [hasSchoolsAccessAll, selectedSchoolId, profile?.default_school_id]);
}
