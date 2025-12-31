import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiClient } from '@/lib/api/client';

export interface SearchResult {
  id: string;
  name: string;
  type: 'student' | 'class' | 'staff' | 'subject' | 'academic_year' | 'school';
  admission_no?: string;
  class?: string;
  position?: string;
  code?: string;
  employee_id?: string;
  card_number?: string;
  father_name?: string;
  start_year?: number;
  end_year?: number;
}

export interface SearchResults {
  students: SearchResult[];
  classes: SearchResult[];
  staff: SearchResult[];
  subjects: SearchResult[];
  academic_years: SearchResult[];
  schools: SearchResult[];
}

export const useGlobalSearch = (query: string) => {
  const { user, profile } = useAuth();

  return useQuery<SearchResults>({
    queryKey: ['global-search', query, profile?.organization_id, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id || !query || query.length < 2) {
        return {
          students: [],
          classes: [],
          staff: [],
          subjects: [],
          academic_years: [],
          schools: [],
        };
      }

      try {
        if (import.meta.env.DEV) {
          console.log('[useGlobalSearch] Fetching search results for query:', query);
          console.log('[useGlobalSearch] Query type:', typeof query);
          console.log('[useGlobalSearch] Query length:', query.length);
        }

        const response = await apiClient.get<SearchResults>('/search', {
          params: {
            q: query,
          },
        });

        if (import.meta.env.DEV) {
          console.log('[useGlobalSearch] Request URL would be: /api/search?q=' + encodeURIComponent(query));
        }

        if (import.meta.env.DEV) {
          console.log('[useGlobalSearch] Response:', response);
          console.log('[useGlobalSearch] Response type:', typeof response);
          console.log('[useGlobalSearch] Students count:', Array.isArray(response?.students) ? response.students.length : 'not array');
          console.log('[useGlobalSearch] Classes count:', Array.isArray(response?.classes) ? response.classes.length : 'not array');
          console.log('[useGlobalSearch] Staff count:', Array.isArray(response?.staff) ? response.staff.length : 'not array');
        }

        // Ensure response has the correct structure
        if (response && typeof response === 'object') {
          const processed = {
            students: Array.isArray(response.students) ? response.students : [],
            classes: Array.isArray(response.classes) ? response.classes : [],
            staff: Array.isArray(response.staff) ? response.staff : [],
            subjects: Array.isArray(response.subjects) ? response.subjects : [],
            academic_years: Array.isArray(response.academic_years) ? response.academic_years : [],
            schools: Array.isArray(response.schools) ? response.schools : [],
          };
          
          if (import.meta.env.DEV) {
            console.log('[useGlobalSearch] Processed results:', processed);
          }
          
          return processed;
        }

        if (import.meta.env.DEV) {
          console.warn('[useGlobalSearch] Invalid response structure:', response);
        }

        return {
          students: [],
          classes: [],
          staff: [],
          subjects: [],
          academic_years: [],
          schools: [],
        };
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useGlobalSearch] Error:', error);
          if (error instanceof Error) {
            console.error('[useGlobalSearch] Error message:', error.message);
            console.error('[useGlobalSearch] Error stack:', error.stack);
          }
        }
        return {
          students: [],
          classes: [],
          staff: [],
          subjects: [],
          academic_years: [],
          schools: [],
        };
      }
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!query && query.trim().length >= 2,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Always return data structure even when disabled
    placeholderData: {
      students: [],
      classes: [],
      staff: [],
      subjects: [],
      academic_years: [],
      schools: [],
    },
  });
};
