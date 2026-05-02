import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';

import { attendanceRoundNamesApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

export interface AttendanceRoundName {
  id: string;
  organization_id: string;
  school_id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface AttendanceRoundNameInsert {
  name: string;
  order_index: number;
  is_active?: boolean;
}

export interface AttendanceRoundNameUpdate {
  name?: string;
  order_index?: number;
  is_active?: boolean;
}

export const useAttendanceRoundNames = (activeOnly: boolean = false) => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['attendance-round-names', profile?.organization_id, profile?.default_school_id ?? null, activeOnly],
    queryFn: async () => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) {
        return [] as AttendanceRoundName[];
      }
      const data = await attendanceRoundNamesApi.list({ active_only: activeOnly ? '1' : undefined });
      return (data || []) as AttendanceRoundName[];
    },
    enabled: !!user && !!profile?.organization_id && !!profile?.default_school_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateAttendanceRoundName = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: AttendanceRoundNameInsert) => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) {
        throw new Error('User must be assigned to an organization and school');
      }
      return (await attendanceRoundNamesApi.create(payload)) as AttendanceRoundName;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance-round-names'] });
      showToast.success('attendanceRoundNames.created');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'attendanceRoundNames.createFailed');
    },
  });
};

export const useUpdateAttendanceRoundName = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AttendanceRoundNameUpdate & { id: string }) => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) {
        throw new Error('User must be assigned to an organization and school');
      }
      return (await attendanceRoundNamesApi.update(id, updates)) as AttendanceRoundName;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance-round-names'] });
      showToast.success('attendanceRoundNames.updated');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'attendanceRoundNames.updateFailed');
    },
  });
};

export const useDeleteAttendanceRoundName = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user || !profile?.organization_id || !profile?.default_school_id) {
        throw new Error('User must be assigned to an organization and school');
      }
      await attendanceRoundNamesApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance-round-names'] });
      showToast.success('attendanceRoundNames.deleted');
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'attendanceRoundNames.deleteFailed');
    },
  });
};

