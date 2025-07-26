import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publication_year?: number;
  category?: string;
  location?: string;
  total_copies: number;
  available_copies: number;
  branch_id: string;
  created_at: string;
}

export interface LibraryTransaction {
  id: string;
  book_id: string;
  student_id: string;
  issue_date: string;
  due_date: string;
  return_date?: string;
  fine_amount?: number;
  status: string;
  issued_by: string;
  returned_by?: string;
  created_at: string;
  book?: LibraryBook;
  student?: {
    student_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

export const useLibraryBooks = () => {
  return useQuery({
    queryKey: ['library-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_books')
        .select('*')
        .order('title', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as LibraryBook[];
    },
  });
};

export const useLibraryTransactions = () => {
  return useQuery({
    queryKey: ['library-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_transactions')
        .select(`
          *,
          book:library_books!book_id (
            title,
            author,
            isbn
          ),
          student:students!student_id (
            student_id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as LibraryTransaction[];
    },
  });
};

export const useCreateLibraryBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookData: Omit<LibraryBook, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('library_books')
        .insert(bookData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      toast.success('Library book added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add library book');
    },
  });
};

export const useIssueBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionData: Omit<LibraryTransaction, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('library_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      toast.success('Book issued successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to issue book');
    },
  });
};

export const useReturnBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LibraryTransaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('library_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['library-books'] });
      toast.success('Book returned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to return book');
    },
  });
};