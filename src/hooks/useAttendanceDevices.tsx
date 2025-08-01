import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AttendanceDevice {
  id: string;
  device_name: string;
  device_type: string;
  ip_address?: string;
  port?: number;
  location?: string;
  branch_id: string;
  is_active: boolean;
  last_sync?: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

export interface AttendanceLog {
  id: string;
  device_id: string;
  student_id: string;
  timestamp: string;
  log_type: string;
  verification_method: string;
  device_user_id?: string;
  raw_data: any;
  processed: boolean;
  created_at: string;
}

export const useAttendanceDevices = () => {
  return useQuery({
    queryKey: ['attendance-devices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_devices')
        .select('*')
        .order('device_name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data as AttendanceDevice[];
    },
  });
};

export const useAttendanceLogs = (deviceId?: string) => {
  return useQuery({
    queryKey: ['attendance-logs', deviceId],
    queryFn: async () => {
      let query = supabase
        .from('attendance_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (deviceId) {
        query = query.eq('device_id', deviceId);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        throw new Error(error.message);
      }

      return data as AttendanceLog[];
    },
  });
};

export const useCreateAttendanceDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceData: Omit<AttendanceDevice, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('attendance_devices')
        .insert(deviceData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-devices'] });
      toast.success('Attendance device added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add attendance device');
    },
  });
};

export const useUpdateAttendanceDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AttendanceDevice> & { id: string }) => {
      const { data, error } = await supabase
        .from('attendance_devices')
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
      queryClient.invalidateQueries({ queryKey: ['attendance-devices'] });
      toast.success('Attendance device updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update attendance device');
    },
  });
};

export const useCreateAttendanceLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logData: Omit<AttendanceLog, 'id' | 'created_at' | 'processed'>) => {
      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(logData)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance log created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create attendance log');
    },
  });
};

export const useSyncDeviceData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ deviceId, logs }: { deviceId: string; logs: any[] }) => {
      // Process multiple logs at once
      const { data, error } = await supabase
        .from('attendance_logs')
        .insert(logs.map(log => ({
          device_id: deviceId,
          student_id: log.student_id || log.user_id,
          timestamp: log.timestamp,
          log_type: log.type || 'check_in',
          verification_method: log.method || 'fingerprint',
          device_user_id: log.device_user_id,
          raw_data: log
        })))
        .select();

      if (error) {
        throw new Error(error.message);
      }

      // Update device last sync time
      await supabase
        .from('attendance_devices')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', deviceId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-logs'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-devices'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Device data synced successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync device data');
    },
  });
};