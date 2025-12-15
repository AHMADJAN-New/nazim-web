import { useQuery } from '@tanstack/react-query';
import { libraryBooksApi } from '@/lib/api/client';
import { useAuth } from './useAuth';

export interface LibrarySummary {
  total_books: number;
  total_copies: number;
  available_copies: number;
  on_loan: number;
}

/**
 * Get library summary (for dashboard)
 * Returns counts only, not full list
 */
export const useLibrarySummary = (enabled: boolean = true) => {
  const { user, profile } = useAuth();

  return useQuery<LibrarySummary>({
    queryKey: ['library', 'summary', profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) {
        return {
          total_books: 0,
          total_copies: 0,
          available_copies: 0,
          on_loan: 0,
        };
      }
      return await libraryBooksApi.summary();
    },
    enabled: !!user && !!profile && enabled, // Only run if enabled flag is true
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

