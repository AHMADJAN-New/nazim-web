import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  status: 'confirmed' | 'pending';
}

export const useUpcomingEvents = () => {
  return useQuery({
    queryKey: ['upcoming-events'],
    queryFn: async (): Promise<UpcomingEvent[]> => {
      // Return empty array - communications and exams tables don't exist
      return [];
    },
  });
};