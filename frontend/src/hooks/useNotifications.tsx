import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  title: string;
  created_at: string;
  is_read: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];

      // TODO: Implement notifications API in Laravel backend
      // For now, return empty array since notifications API is not yet implemented
      return [];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds - notifications can change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disabled until API is implemented
    refetchInterval: false, // Disabled until API is implemented
    refetchOnMount: false, // Disabled until API is implemented
    refetchOnReconnect: false, // Disabled until API is implemented
  });
};

