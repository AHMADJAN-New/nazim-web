import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import type { TeachingPeriod, TeacherPeriodPreference } from '@/types/academics';

export interface TeachingPeriodPayload {
  id?: string;
  name: string;
  day_of_week: TeachingPeriod['day_of_week'];
  start_time: string;
  end_time: string;
  sort_order: number;
  is_break?: boolean;
  max_parallel_classes?: number;
  organization_id?: string;
}

export interface TeacherPreferencePayload {
  id?: string;
  teacher_staff_id: string;
  period_id: string;
  preference: TeacherPeriodPreference['preference'];
  notes?: string | null;
  organization_id?: string;
}

export const useTeachingPeriods = (organizationId?: string) => {
  const { profile } = useAuth();
  const orgId = organizationId ?? profile?.organization_id ?? null;

  return useQuery({
    queryKey: ['teaching-periods', orgId],
    queryFn: async (): Promise<TeachingPeriod[]> => {
      if (!orgId) {
        return [];
      }

      let query = (supabase as any)
        .from('teaching_periods')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('sort_order', { ascending: true });

      query = query.eq('organization_id', orgId);

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as TeachingPeriod[];
    },
    enabled: !!profile?.role && !!orgId,
  });
};

export const useUpsertTeachingPeriod = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: TeachingPeriodPayload) => {
      const organizationId = payload.organization_id ?? profile?.organization_id ?? null;
      if (!organizationId) {
        throw new Error('Organization context required');
      }

      const { id, organization_id: _, ...rest } = payload;
      const baseRecord = {
        ...rest,
      };

      const query = id
        ? (supabase as any)
            .from('teaching_periods')
            .update(baseRecord)
            .eq('id', id)
        : (supabase as any)
            .from('teaching_periods')
            .insert({
              ...baseRecord,
              organization_id: organizationId,
            });

      const { data, error } = await query.select('*').single();
      if (error) {
        throw new Error(error.message);
      }
      return data as TeachingPeriod;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-periods'] });
      toast.success('Teaching period saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save period');
    },
  });
};

export const useDeleteTeachingPeriod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('teaching_periods')
        .delete()
        .eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teaching-periods'] });
      toast.success('Teaching period removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove period');
    },
  });
};

export const useTeacherPeriodPreferences = (teacherId?: string, organizationId?: string) => {
  const { profile } = useAuth();
  const orgId = organizationId ?? profile?.organization_id ?? null;

  return useQuery({
    queryKey: ['teacher-period-preferences', orgId, teacherId],
    queryFn: async (): Promise<TeacherPeriodPreference[]> => {
      if (!orgId) {
        return [];
      }

      let query = (supabase as any)
        .from('teacher_period_preferences')
        .select('*')
        .eq('organization_id', orgId);
      if (teacherId) {
        query = query.eq('teacher_staff_id', teacherId);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as TeacherPeriodPreference[];
    },
    enabled: !!profile?.role && !!orgId,
  });
};

export const useUpsertTeacherPreference = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: TeacherPreferencePayload) => {
      const organizationId = payload.organization_id ?? profile?.organization_id ?? null;
      if (!organizationId) {
        throw new Error('Organization context required');
      }

      const { id, organization_id: _, ...rest } = payload;
      const basePayload = {
        ...rest,
      };

      const query = id
        ? (supabase as any)
            .from('teacher_period_preferences')
            .update(basePayload)
            .eq('id', id)
        : (supabase as any)
            .from('teacher_period_preferences')
            .insert({
              ...basePayload,
              organization_id: organizationId,
            });

      const { data, error } = await query.select('*').single();
      if (error) {
        throw new Error(error.message);
      }
      return data as TeacherPeriodPreference;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teacher-period-preferences'] });
      if (variables.teacher_staff_id) {
        queryClient.invalidateQueries({
          queryKey: ['teacher-period-preferences', variables.teacher_staff_id],
        });
      }
      toast.success('Preference saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save preference');
    },
  });
};

export const useDeleteTeacherPreference = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('teacher_period_preferences')
        .delete()
        .eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-period-preferences'] });
      toast.success('Preference removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove preference');
    },
  });
};
