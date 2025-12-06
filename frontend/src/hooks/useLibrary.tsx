import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { libraryBooksApi, libraryCopiesApi, libraryLoansApi } from '@/lib/api/client';
import type { LibraryBook, LibraryLoan } from '@/types/domain/library';
import { useAuth } from './useAuth';

export const useLibraryBooks = () => {
  const { user } = useAuth();
  return useQuery<LibraryBook[]>({
    queryKey: ['library-books'],
    queryFn: async () => {
      if (!user) return [];
      return libraryBooksApi.list();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateLibraryBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => libraryBooksApi.create(data),
    onSuccess: async () => {
      toast.success('Book saved');
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.refetchQueries({ queryKey: ['library-books'] });
    },
    onError: () => toast.error('Failed to save book'),
  });
};

export const useUpdateLibraryBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => libraryBooksApi.update(id, data),
    onSuccess: () => {
      toast.success('Book updated');
      qc.invalidateQueries({ queryKey: ['library-books'] });
    },
    onError: () => toast.error('Failed to update book'),
  });
};

export const useDeleteLibraryBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => libraryBooksApi.remove(id),
    onSuccess: () => {
      toast.success('Book removed');
      qc.invalidateQueries({ queryKey: ['library-books'] });
    },
    onError: () => toast.error('Failed to remove book'),
  });
};

export const useCreateLibraryCopy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => libraryCopiesApi.create(data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.refetchQueries({ queryKey: ['library-books'] });
      toast.success('Copy added');
    },
    onError: () => toast.error('Failed to add copy'),
  });
};

export const useLibraryLoans = (openOnly?: boolean) => {
  const { user } = useAuth();
  return useQuery<LibraryLoan[]>({
    queryKey: ['library-loans', openOnly],
    queryFn: async () => {
      if (!user) return [];
      return libraryLoansApi.list({ open_only: openOnly });
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateLibraryLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => libraryLoansApi.create(data),
    onSuccess: async () => {
      toast.success('Loan created');
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.invalidateQueries({ queryKey: ['library-loans'] });
      await qc.refetchQueries({ queryKey: ['library-books'] });
      await qc.refetchQueries({ queryKey: ['library-loans'] });
    },
    onError: () => toast.error('Failed to create loan'),
  });
};

export const useReturnLibraryLoan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => libraryLoansApi.returnCopy(id),
    onSuccess: async () => {
      toast.success('Book returned');
      await qc.invalidateQueries({ queryKey: ['library-books'] });
      await qc.invalidateQueries({ queryKey: ['library-loans'] });
      await qc.refetchQueries({ queryKey: ['library-loans'] });
    },
    onError: () => toast.error('Failed to return book'),
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
