import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { roomsApi } from '@/lib/api/client';
import type * as RoomApi from '@/types/api/room';
import type { Room } from '@/types/domain/room';
import { mapRoomApiToDomain, mapRoomDomainToInsert, mapRoomDomainToUpdate } from '@/mappers/roomMapper';

// Re-export domain types for convenience
export type { Room } from '@/types/domain/room';

export const useRooms = (schoolId?: string, organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Room[]>({
    queryKey: ['rooms', schoolId, organizationId || profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) return [];

      // Fetch rooms via Laravel API (relationships included)
      const params: { school_id?: string; building_id?: string; organization_id?: string } = {};
      if (schoolId) {
        params.school_id = schoolId;
      } else if (organizationId || profile.organization_id) {
        params.organization_id = organizationId || profile.organization_id || undefined;
      }

      const apiRooms = await roomsApi.list(params);
      
      // Map API models to domain models
      return (apiRooms as RoomApi.Room[]).map(mapRoomApiToDomain);
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (roomData: { roomNumber: string; buildingId: string; staffId?: string | null }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Validation: max 100 characters
      if (roomData.roomNumber.length > 100) {
        throw new Error('Room number must be 100 characters or less');
      }

      // Trim whitespace
      const trimmedNumber = roomData.roomNumber.trim();
      if (!trimmedNumber) {
        throw new Error('Room number cannot be empty');
      }

      // Convert domain model to API insert payload
      const insertData = mapRoomDomainToInsert({
        roomNumber: trimmedNumber,
        buildingId: roomData.buildingId,
        staffId: roomData.staffId || null,
      });

      // Create room via Laravel API (validation handled server-side)
      // Laravel will auto-set school_id from building
      const apiRoom = await roomsApi.create(insertData);
      
      // Map API response back to domain model
      return mapRoomApiToDomain(apiRoom as RoomApi.Room);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create room');
    },
  });
};

export const useUpdateRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      roomNumber,
      buildingId,
      staffId,
    }: {
      id: string;
      roomNumber?: string;
      buildingId?: string;
      staffId?: string | null;
    }) => {
      // Validation: max 100 characters
      if (roomNumber && roomNumber.length > 100) {
        throw new Error('Room number must be 100 characters or less');
      }

      // Prepare update data
      const updateData: Partial<Room> = {};
      if (roomNumber) {
        const trimmedNumber = roomNumber.trim();
        if (!trimmedNumber) {
          throw new Error('Room number cannot be empty');
        }
        updateData.roomNumber = trimmedNumber;
      }
      if (buildingId !== undefined) {
        updateData.buildingId = buildingId;
      }
      if (staffId !== undefined) {
        updateData.staffId = staffId || null;
      }

      // Convert domain model to API update payload
      const apiUpdateData = mapRoomDomainToUpdate(updateData);

      // Update room via Laravel API (validation handled server-side)
      // Laravel will auto-update school_id if building_id changes
      const apiRoom = await roomsApi.update(id, apiUpdateData);
      
      // Map API response back to domain model
      return mapRoomApiToDomain(apiRoom as RoomApi.Room);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update room');
    },
  });
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete room via Laravel API (validation handled server-side)
      await roomsApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete room');
    },
  });
};
