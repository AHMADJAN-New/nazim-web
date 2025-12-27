import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { showToast } from '@/lib/toast';
import { libraryBooksApi, libraryCopiesApi, libraryLoansApi } from '@/lib/api/client';
import type { LibraryBook, LibraryLoan } from '@/types/domain/library';
import { useAuth } from './useAuth';
import { usePagination } from './usePagination';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';

export const useLibraryBooks = (usePaginated?: boolean, search?: string) => {
  const { user, profile, profileLoading } = useAuth();
  const isEventUser = profile?.is_event_user ?? false;
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error } = useQuery<LibraryBook[] | PaginatedResponse<LibraryBook>>({
    queryKey: ['library-books', profile?.organization_id, profile?.default_school_id ?? null, usePaginated ? page : undefined, usePaginated ? pageSize : undefined, search],
    queryFn: async () => {
      if (!user || !profile) {
        return [];
      }

      try {
        const params: { organization_id?: string; page?: number; per_page?: number; search?: string } = {
          organization_id: profile.organization_id || undefined,
        };

        // Add search if provided
        if (search) {
          params.search = search;
        }

        // Add pagination params if using pagination
        if (usePaginated) {
          params.page = page;
          params.per_page = pageSize;
        }

        const apiBooks = await libraryBooksApi.list(params);

        // Check if response is paginated (Laravel returns meta fields directly, not nested)
        if (usePaginated && apiBooks && typeof apiBooks === 'object' && 'data' in apiBooks && 'current_page' in apiBooks) {
          // Laravel's paginated response has data and meta fields at the same level
          const paginatedResponse = apiBooks as any;
          // Extract meta from Laravel's response structure
          const meta: PaginationMeta = {
            current_page: paginatedResponse.current_page,
            from: paginatedResponse.from,
            last_page: paginatedResponse.last_page,
            per_page: paginatedResponse.per_page,
            to: paginatedResponse.to,
            total: paginatedResponse.total,
            path: paginatedResponse.path,
            first_page_url: paginatedResponse.first_page_url,
            last_page_url: paginatedResponse.last_page_url,
            next_page_url: paginatedResponse.next_page_url,
            prev_page_url: paginatedResponse.prev_page_url,
          };
          return { data: paginatedResponse.data as LibraryBook[], meta } as PaginatedResponse<LibraryBook>;
        }

        // Non-paginated response
        return apiBooks as LibraryBook[];
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useLibraryBooks] Error fetching books:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile && !profileLoading && !isEventUser, // Disable for event users and wait for profile
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<LibraryBook>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<LibraryBook> | undefined;
    return {
      data: paginatedData?.data || [],
      isLoading,
      error,
      pagination: paginatedData?.meta ?? null,
      paginationState,
      page,
      pageSize,
      setPage,
      setPageSize,
    };
  }

  return {
    data: data as LibraryBook[] | undefined,
    isLoading,
    error,
  };
};

export const useCreateLibraryBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => libraryBooksApi.create(data),
    onSuccess: async () => {
      showToast.success('toast.library.bookSaved');
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.refetchQueries({ queryKey: ['library-books'] });
      // Invalidate finance queries to refresh account balances and dashboard
      await qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      await qc.invalidateQueries({ queryKey: ['finance-dashboard'] });
      await qc.refetchQueries({ queryKey: ['finance-accounts'] });
      await qc.refetchQueries({ queryKey: ['finance-dashboard'] });
    },
    onError: () => showToast.error('toast.library.bookSaveFailed'),
  });
};

export const useUpdateLibraryBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => libraryBooksApi.update(id, data),
    onSuccess: async () => {
      showToast.success('toast.library.bookUpdated');
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.refetchQueries({ queryKey: ['library-books'] });
      // Invalidate finance queries to refresh account balances and dashboard
      await qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      await qc.invalidateQueries({ queryKey: ['finance-dashboard'] });
      await qc.refetchQueries({ queryKey: ['finance-accounts'] });
      await qc.refetchQueries({ queryKey: ['finance-dashboard'] });
    },
    onError: () => showToast.error('toast.library.bookUpdateFailed'),
  });
};

export const useDeleteLibraryBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => libraryBooksApi.remove(id),
    onSuccess: async () => {
      showToast.success('toast.library.bookRemoved');
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.refetchQueries({ queryKey: ['library-books'] });
      // Invalidate finance queries to refresh account balances and dashboard
      await qc.invalidateQueries({ queryKey: ['finance-accounts'] });
      await qc.invalidateQueries({ queryKey: ['finance-dashboard'] });
      await qc.refetchQueries({ queryKey: ['finance-accounts'] });
      await qc.refetchQueries({ queryKey: ['finance-dashboard'] });
    },
    onError: () => showToast.error('toast.library.bookRemoveFailed'),
  });
};

export const useCreateLibraryCopy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => libraryCopiesApi.create(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.refetchQueries({ queryKey: ['library-books'] });
      showToast.success('toast.library.copyAdded');
    },
    onError: () => showToast.error('toast.library.copyAddFailed'),
  });
};

export const useLibraryLoans = (openOnly?: boolean) => {
  const { user, profile, profileLoading } = useAuth();
  const isEventUser = profile?.is_event_user === true;
  
  return useQuery<LibraryLoan[]>({
    queryKey: ['library-loans', openOnly, profile?.organization_id ?? null, profile?.default_school_id ?? null],
    queryFn: async () => {
      if (!user) return [];
      return libraryLoansApi.list({ open_only: openOnly });
    },
    enabled: !!user && !profileLoading && !isEventUser, // Disable for event users and wait for profile
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateLibraryLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => libraryLoansApi.create(data),
    onSuccess: async () => {
      showToast.success('toast.library.loanCreated');
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.invalidateQueries({ queryKey: ['library-loans'] });
      await qc.refetchQueries({ queryKey: ['library-books'] });
      await qc.refetchQueries({ queryKey: ['library-loans'] });
    },
    onError: () => showToast.error('toast.library.loanCreateFailed'),
  });
};

export const useReturnLibraryLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => libraryLoansApi.returnCopy(id),
    onSuccess: async () => {
      showToast.success('toast.library.bookReturned');
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.invalidateQueries({ queryKey: ['library-loans'] });
      await qc.refetchQueries({ queryKey: ['library-loans'] });
    },
    onError: () => showToast.error('toast.library.bookReturnFailed'),
  });
};

export const useDueSoonLoans = (days?: number) => {
  const { user } = useAuth();
  return useQuery<LibraryLoan[]>({
    queryKey: ['library-due-soon', days],
    queryFn: async () => {
      if (!user) return [];
      return libraryLoansApi.dueSoon({ days });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
