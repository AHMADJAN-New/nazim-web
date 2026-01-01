import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/services/notifications';
import type { NotificationItem } from '@/types/notification';
import type { PaginationMeta } from '@/types/pagination';
import { useAuth } from './useAuth';

export interface NotificationQueryResult {
  notifications: NotificationItem[];
  meta?: PaginationMeta;
}

interface NotificationQueryOptions {
  limit?: number;
  page?: number;
  unreadOnly?: boolean;
  enabled?: boolean;
}

const NOTIFICATION_QUERY_KEY = 'notifications';

const updateCachedNotifications = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (notification: NotificationItem) => NotificationItem
) => {
  const cached = queryClient.getQueriesData<NotificationQueryResult>({ queryKey: [NOTIFICATION_QUERY_KEY] });
  cached.forEach(([key, value]) => {
    if (!value) return;
    const [, secondSegment] = Array.isArray(key) ? key : [];
    if (secondSegment === 'count') {
      return;
    }
    const next = {
      ...value,
      notifications: value.notifications.map(updater),
    };
    queryClient.setQueryData(key, next);
  });
};

export const useNotifications = (options: NotificationQueryOptions = {}) => {
  const { user } = useAuth();
  const limit = options.limit ?? 30;

  return useQuery<NotificationQueryResult>({
    queryKey: [NOTIFICATION_QUERY_KEY, user?.id, limit, options.page, options.unreadOnly],
    enabled: !!user && (options.enabled ?? true),
    queryFn: async () => {
      const response = await notificationsApi.list({
        per_page: limit,
        page: options.page,
        unread_only: options.unreadOnly,
      });

      if (Array.isArray(response)) {
        return { notifications: response };
      }

      return { notifications: response.data, meta: response.meta };
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useNotificationCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: [NOTIFICATION_QUERY_KEY, 'count', user?.id],
    queryFn: notificationsApi.unreadCount,
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });
};

export const useNotificationActions = () => {
  const queryClient = useQueryClient();

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATION_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [NOTIFICATION_QUERY_KEY, 'count'] });

      const previousLists = queryClient.getQueriesData<NotificationQueryResult>({ queryKey: [NOTIFICATION_QUERY_KEY] });
      const previousCount = queryClient.getQueryData<{ count: number }>([NOTIFICATION_QUERY_KEY, 'count']);

      updateCachedNotifications(queryClient, (notification) =>
        notification.id === id ? { ...notification, read_at: new Date().toISOString() } : notification
      );

      if (previousCount) {
        queryClient.setQueryData([NOTIFICATION_QUERY_KEY, 'count'], {
          count: Math.max(0, (previousCount.count ?? 0) - 1),
        });
      }

      return { previousLists, previousCount };
    },
    onError: (_error, _id, context) => {
      context?.previousLists?.forEach(([key, value]) => queryClient.setQueryData(key, value));
      if (context?.previousCount) {
        queryClient.setQueryData([NOTIFICATION_QUERY_KEY, 'count'], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEY, 'count'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [NOTIFICATION_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [NOTIFICATION_QUERY_KEY, 'count'] });

      const previousLists = queryClient.getQueriesData<NotificationQueryResult>({ queryKey: [NOTIFICATION_QUERY_KEY] });
      const previousCount = queryClient.getQueryData<{ count: number }>([NOTIFICATION_QUERY_KEY, 'count']);

      updateCachedNotifications(queryClient, (notification) => ({
        ...notification,
        read_at: notification.read_at ?? new Date().toISOString(),
      }));

      queryClient.setQueryData([NOTIFICATION_QUERY_KEY, 'count'], { count: 0 });

      return { previousLists, previousCount };
    },
    onError: (_error, _variables, context) => {
      context?.previousLists?.forEach(([key, value]) => queryClient.setQueryData(key, value));
      if (context?.previousCount) {
        queryClient.setQueryData([NOTIFICATION_QUERY_KEY, 'count'], context.previousCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEY, 'count'] });
    },
  });

  return { markRead, markAllRead };
};
