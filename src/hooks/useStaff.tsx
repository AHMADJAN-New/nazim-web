import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Staff {
  id: string;
  user_id: string;
  employee_id: string;
  branch_id: string;
  department?: string;
  designation?: string;
  qualification?: string;
  salary?: number;
  hire_date?: string;
  experience_years?: number;
  created_at: string;
  updated_at: string;
  // Extended with profile data
  profile?: {
    full_name: string;
    email: string;
    phone?: string;
    address?: string;
  };
}

export const useStaff = () => {
  return useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          profile:profiles(
            full_name,
            email,
            phone,
            address
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as Staff[];
    },
  });
};

export interface StaffStats {
  total: number;
  teachers: number;
  admin: number;
  support: number;
}

export const useStaffStats = () => {
  const query = useQuery({
    queryKey: ['staff-stats'],
    queryFn: async (): Promise<StaffStats> => {
      const [total, teachers, admin] = await Promise.all([
        supabase.from('staff').select('*', { count: 'exact', head: true }),
        supabase.from('staff').select('*', { count: 'exact', head: true }).eq('designation', 'teacher'),
        supabase.from('staff').select('*', { count: 'exact', head: true }).eq('designation', 'admin'),
      ]);

      const totalCount = total.count ?? 0;
      const teacherCount = teachers.count ?? 0;
      const adminCount = admin.count ?? 0;
      const supportCount = totalCount - teacherCount - adminCount;

      return {
        total: totalCount,
        teachers: teacherCount,
        admin: adminCount,
        support: supportCount,
      };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('staff-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
        query.refetch();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [query.refetch]);

  return query;
};

export const useCreateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (staffData: Omit<Staff, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('staff')
        .insert(staffData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create staff member');
    },
  });
};

export const useUpdateStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Staff> & { id: string }) => {
      const { data, error } = await supabase
        .from('staff')
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
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update staff member');
    },
  });
};

export const useDeleteStaff = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete staff member');
    },
  });
};