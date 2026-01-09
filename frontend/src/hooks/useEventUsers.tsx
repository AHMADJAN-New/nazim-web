import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useLanguage } from './useLanguage';

import { eventUsersApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type { EventUser, CreateEventUserRequest, UpdateEventUserRequest } from '@/types/events';

// Re-export types for convenience
export type { EventUser, CreateEventUserRequest, UpdateEventUserRequest } from '@/types/events';

export const useEventUsers = (eventId: string) => {
  return useQuery<EventUser[]>({
    queryKey: ['event-users', eventId],
    queryFn: async () => {
      return await eventUsersApi.list(eventId);
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateEventUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ eventId, data }: { eventId: string; data: CreateEventUserRequest }) => {
      return await eventUsersApi.create(eventId, data);
    },
    onSuccess: (_, variables) => {
      showToast.success(t('events.users.userCreated') || 'Event user created successfully');
      void queryClient.invalidateQueries({ queryKey: ['event-users', variables.eventId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('events.users.userCreateFailed') || 'Failed to create event user');
    },
  });
};

export const useUpdateEventUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ eventId, userId, data }: { eventId: string; userId: string; data: UpdateEventUserRequest }) => {
      return await eventUsersApi.update(eventId, userId, data);
    },
    onSuccess: (_, variables) => {
      showToast.success(t('events.users.userUpdated') || 'Event user updated successfully');
      void queryClient.invalidateQueries({ queryKey: ['event-users', variables.eventId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('events.users.userUpdateFailed') || 'Failed to update event user');
    },
  });
};

export const useDeleteEventUser = () => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      await eventUsersApi.delete(eventId, userId);
    },
    onSuccess: async (_, variables) => {
      showToast.success(t('events.users.userDeleted') || 'Event user deactivated successfully');
      await queryClient.invalidateQueries({ queryKey: ['event-users', variables.eventId] });
      await queryClient.refetchQueries({ queryKey: ['event-users', variables.eventId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || t('events.users.userDeleteFailed') || 'Failed to deactivate event user');
    },
  });
};




