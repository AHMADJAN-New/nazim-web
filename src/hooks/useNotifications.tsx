import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, title, created_at, is_read')
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50); // Limit to 50 most recent notifications

        // Handle table not found gracefully (expected when table doesn't exist yet)
        if (error) {
          // Table doesn't exist yet (migrations not run) - this is expected, don't log as error
          if (
            error.code === 'PGRST116' ||
            error.code === 'PGRST205' ||
            error.message?.includes('does not exist') ||
            error.message?.includes('relation') ||
            error.message?.includes('schema cache') ||
            (error as any).status === 404
          ) {
            // Table doesn't exist, return empty array silently
            return [];
          }
          // Only log unexpected errors
          console.error('Error fetching notifications:', error);
          return [];
        }

        return (data as Notification[]) || [];
      } catch (err) {
        // Handle any unexpected errors
        console.error('Unexpected error fetching notifications:', err);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 seconds - notifications can change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchInterval: 60 * 1000, // Poll every 60 seconds for new notifications
    refetchOnMount: true, // Refetch on component mount
    refetchOnReconnect: true, // Refetch when reconnecting
  });
};

