import { useOfflineCachedQuery } from './useOfflineCachedQuery';

export interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  status: 'confirmed' | 'pending';
}

export const useUpcomingEvents = () => {
  const queryKey = ['upcoming-events'];
  return useOfflineCachedQuery({
    cacheKey: JSON.stringify(queryKey),
    cacheKind: 'calendar.upcoming-events',
    queryKey,

    queryFn: async (): Promise<UpcomingEvent[]> => {
      // Return empty array - communications and exams tables don't exist
      return [];
    },
  });
};
