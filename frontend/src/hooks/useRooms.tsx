import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { roomsApi } from '@/lib/api/client';

// TypeScript interfaces for Room
export interface Room {
  id: string;
  room_number: string;
  building_id: string;
  school_id: string;
  staff_id?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Extended with relationship data
  building?: {
    id: string;
    building_name: string;
    school_id: string;
  };
  staff?: {
    id: string;
    profile?: {
      full_name: string;
    };
  } | null;
}

export interface RoomInsert {
  room_number: string;
  building_id: string;
  staff_id?: string | null;
}

export interface RoomUpdate {
  room_number?: string;
  building_id?: string;
  staff_id?: string | null;
}

// Room with guaranteed relations (for query results)
export interface RoomWithRelations extends Room {
  building: {
    id: string;
    building_name: string;
    school_id: string;
  };
  staff: {
    id: string;
    profile?: {
      full_name: string;
    };
  } | null;
}

export const useRooms = (schoolId?: string, organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery({
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

      const rooms = await roomsApi.list(params);
      return (rooms || []) as RoomWithRelations[];
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (roomData: { room_number: string; building_id: string; staff_id?: string | null }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Validation: max 100 characters
      if (roomData.room_number.length > 100) {
        throw new Error('Room number must be 100 characters or less');
      }

      // Trim whitespace
      const trimmedNumber = roomData.room_number.trim();
      if (!trimmedNumber) {
        throw new Error('Room number cannot be empty');
      }

      // Create room via Laravel API (validation handled server-side)
      // Laravel will auto-set school_id from building
      const room = await roomsApi.create({
        room_number: trimmedNumber,
        building_id: roomData.building_id,
        staff_id: roomData.staff_id || null,
      });

      return room as RoomWithRelations;
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
      room_number,
      building_id,
      staff_id,
    }: {
      id: string;
      room_number?: string;
      building_id?: string;
      staff_id?: string | null;
    }) => {
      // Validation: max 100 characters
      if (room_number && room_number.length > 100) {
        throw new Error('Room number must be 100 characters or less');
      }

      // Trim whitespace if room_number is being updated
      const updateData: RoomUpdate = {};
      if (room_number) {
        const trimmedNumber = room_number.trim();
        if (!trimmedNumber) {
          throw new Error('Room number cannot be empty');
        }
        updateData.room_number = trimmedNumber;
      }
      if (building_id !== undefined) {
        updateData.building_id = building_id;
      }
      if (staff_id !== undefined) {
        updateData.staff_id = staff_id || null;
      }

      // Update room via Laravel API (validation handled server-side)
      // Laravel will auto-update school_id if building_id changes
      const room = await roomsApi.update(id, updateData);
      return room as RoomWithRelations;
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
