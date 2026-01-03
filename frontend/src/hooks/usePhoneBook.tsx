import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';

import { phoneBookApi } from '@/lib/api/client';
import type { PhoneBookEntry } from '@/types/domain/phoneBook';
import type { PaginationMeta } from '@/types/pagination';

export interface UsePhoneBookParams {
  category?: 'all' | 'students' | 'staff' | 'donors' | 'guests' | 'others';
  search?: string;
  page?: number;
  perPage?: number;
}

export interface UsePhoneBookReturn {
  entries: PhoneBookEntry[];
  isLoading: boolean;
  error: Error | null;
  pagination: PaginationMeta | null;
  refetch: () => void;
}

/**
 * Hook for fetching phone book entries
 * 
 * @example
 * ```tsx
 * const { entries, isLoading, pagination } = usePhoneBook({
 *   category: 'students',
 *   search: 'John',
 *   page: 1,
 *   perPage: 25,
 * });
 * ```
 */
export function usePhoneBook(params: UsePhoneBookParams = {}): UsePhoneBookReturn {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const {
    category = 'all',
    search = '',
    page = 1,
    perPage = 25,
  } = params;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<{
    data: PhoneBookEntry[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number | null;
    to: number | null;
  }>({
    queryKey: ['phonebook', profile?.organization_id, profile?.default_school_id ?? null, category, search, page, perPage],
    queryFn: async () => {
      if (!user || !profile || !profile.organization_id || !profile.default_school_id) {
        if (import.meta.env.DEV) {
          console.log('[usePhoneBook] No user, profile, organization_id, or default_school_id');
        }
        return {
          data: [],
          current_page: 1,
          per_page: perPage,
          total: 0,
          last_page: 1,
          from: null,
          to: null,
        };
      }

      const response = await phoneBookApi.list({
        category,
        search: search.trim() || undefined,
        page,
        per_page: perPage,
      });

      return response as {
        data: PhoneBookEntry[];
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number | null;
        to: number | null;
      };
    },
    enabled: !!user && !!profile && !!profile.organization_id && !!profile.default_school_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const entries = data?.data ?? [];
  // IMPORTANT: Memoize pagination meta so it stays referentially stable.
  // `useDataTable` watches `paginationMeta` by reference; if this object changes every render,
  // it can cause a render loop and block route transitions (URL changes but UI doesn't).
  const pagination: PaginationMeta | null = useMemo(() => {
    if (!data) return null;
    return {
      current_page: data.current_page,
      per_page: data.per_page,
      total: data.total,
      last_page: data.last_page,
      from: data.from,
      to: data.to,
    };
  }, [data?.current_page, data?.per_page, data?.total, data?.last_page, data?.from, data?.to]);

  return {
    entries,
    isLoading,
    error: error as Error | null,
    pagination,
    refetch: () => {
      void refetch();
    },
  };
}

