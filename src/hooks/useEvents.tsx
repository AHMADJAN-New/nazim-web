import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  category: 'academic' | 'sports' | 'cultural' | 'meeting' | 'exam' | 'holiday';
  priority: 'low' | 'normal' | 'high';
  organizer: string;
  participants: string[];
  maxParticipants?: number;
  registrationRequired: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  notificationSent: boolean;
}

const mapFromDb = (e: any): SchoolEvent => ({
  id: e.id,
  title: e.title,
  description: e.description,
  date: e.event_date,
  startTime: e.start_time,
  endTime: e.end_time,
  location: e.location,
  category: e.category,
  priority: e.priority,
  organizer: e.organizer,
  participants: e.participants || [],
  maxParticipants: e.max_participants ?? undefined,
  registrationRequired: e.registration_required,
  status: e.status,
  notificationSent: e.notification_sent,
});

const mapToDb = (e: Partial<SchoolEvent>) => ({
  title: e.title,
  description: e.description,
  event_date: e.date,
  start_time: e.startTime,
  end_time: e.endTime,
  location: e.location,
  category: e.category,
  priority: e.priority,
  organizer: e.organizer,
  participants: e.participants,
  max_participants: e.maxParticipants,
  registration_required: e.registrationRequired,
  status: e.status,
  notification_sent: e.notificationSent,
  branch_id: (e as any).branch_id,
  created_by: (e as any).created_by,
});

export const useEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<SchoolEvent[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map(mapFromDb);
    },
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: Omit<SchoolEvent, 'id'>) => {
      const { data: auth } = await supabase.auth.getUser();
      const payload = mapToDb({ ...event, branch_id: auth.user?.user_metadata?.branch_id || '660e8400-e29b-41d4-a716-446655440001', created_by: auth.user?.id });
      const { data, error } = await supabase
        .from('events')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create event');
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SchoolEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(mapToDb(updates))
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update event');
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete event');
    },
  });
};
