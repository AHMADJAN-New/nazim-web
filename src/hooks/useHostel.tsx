import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HostelRoom {
  id: string;
  room_number: string;
  branch_id: string;
  room_type?: string;
  capacity: number;
  occupied_count: number;
  floor?: number;
  facilities?: string[];
  monthly_fee?: number;
  created_at: string;
}

export interface HostelAllocation {
  id: string;
  student_id: string;
  room_id: string;
  allocated_date: string;
  checkout_date?: string;
  status: string;
  allocated_by: string;
  monthly_fee?: number;
  created_at: string;
  student?: {
    student_id: string;
    profiles?: {
      full_name: string;
    };
  };
  room?: HostelRoom;
}

export const useHostelRooms = () => {
  return useQuery({
    queryKey: ['hostel-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hostel_rooms')
        .select('*')
        .order('room_number', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as HostelRoom[];
    },
  });
};

export const useHostelAllocations = () => {
  return useQuery({
    queryKey: ['hostel-allocations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hostel_allocations')
        .select(`
          *,
          student:students!student_id (
            student_id,
            profiles:user_id (
              full_name
            )
          ),
          room:hostel_rooms!room_id (
            room_number,
            room_type,
            floor
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data as HostelAllocation[];
    },
  });
};

export const useCreateHostelRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roomData: Omit<HostelRoom, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('hostel_rooms')
        .insert(roomData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-rooms'] });
      toast.success('Hostel room created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create hostel room');
    },
  });
};

export const useUpdateHostelRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HostelRoom> & { id: string }) => {
      const { data, error } = await supabase
        .from('hostel_rooms')
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
      queryClient.invalidateQueries({ queryKey: ['hostel-rooms'] });
      toast.success('Hostel room updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update hostel room');
    },
  });
};

export const useCreateHostelAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (allocationData: Omit<HostelAllocation, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('hostel_allocations')
        .insert(allocationData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['hostel-rooms'] });
      toast.success('Room allocated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to allocate room');
    },
  });
};

export const useUpdateHostelAllocation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HostelAllocation> & { id: string }) => {
      const { data, error } = await supabase
        .from('hostel_allocations')
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
      queryClient.invalidateQueries({ queryKey: ['hostel-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['hostel-rooms'] });
      toast.success('Allocation updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update allocation');
    },
  });
};

export interface HostelAttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  marked_by: string;
  created_at: string;
  student?: {
    student_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

export const useHostelAttendance = (filters?: { date?: string }) => {
  return useQuery({
    queryKey: ['hostel-attendance', filters],
    queryFn: async () => {
      let query = supabase
        .from('hostel_attendance')
        .select(`
          *,
          student:students!student_id (
            student_id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .order('date', { ascending: false });

      if (filters?.date) {
        query = query.eq('date', filters.date);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data as HostelAttendanceRecord[];
    },
  });
};

export const useRecordHostelAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendanceData: Omit<HostelAttendanceRecord, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('hostel_attendance')
        .insert(attendanceData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-attendance'] });
      toast.success('Attendance recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to record attendance');
    },
  });
};