import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProfile } from './useProfiles';
import { useAuth } from './useAuth';

export interface Room {
  id: string;
  room_number: string;
  building_id: string;
  staff_id: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  // Extended with relationship data
  building?: {
    id: string;
    building_name: string;
    organization_id: string;
  };
  staff?: {
    id: string;
    profile?: {
      full_name: string;
    };
  };
}

export interface RoomWithRelations extends Room {
  building: {
    id: string;
    building_name: string;
  };
  staff: {
    id: string;
    profile?: {
      full_name: string;
    };
  } | null;
}

export const useRooms = (organizationId?: string) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useQuery({
    queryKey: ['rooms', organizationId || profile?.organization_id],
    queryFn: async () => {
      if (!user || !profile) return [];

      // Determine organization filter
      const isSuperAdmin = profile.organization_id === null && profile.role === 'super_admin';
      const filterOrgId = organizationId || (isSuperAdmin ? undefined : profile.organization_id);

      if (!isSuperAdmin && !filterOrgId) {
        return []; // No organization assigned
      }

      // Optimized query: fetch rooms first, then fetch related data in parallel
      let roomsQuery = supabase
        .from('rooms')
        .select('id, room_number, building_id, staff_id, organization_id, created_at, updated_at');

      if (filterOrgId) {
        roomsQuery = roomsQuery.eq('organization_id', filterOrgId);
      }

      const { data: rooms, error: roomsError } = await roomsQuery.order('room_number', { ascending: true });

      if (roomsError) {
        throw new Error(roomsError.message);
      }

      if (!rooms || rooms.length === 0) {
        return [];
      }

      // Get unique building IDs and staff IDs
      const buildingIds = [...new Set(rooms.map(r => r.building_id).filter(Boolean))];
      const staffIds = [...new Set(rooms.map(r => r.staff_id).filter(Boolean))];

      // Fetch related data in parallel
      const [buildingsResult, staffResult] = await Promise.all([
        buildingIds.length > 0
          ? supabase
              .from('buildings')
              .select('id, building_name, organization_id')
              .in('id', buildingIds)
          : Promise.resolve({ data: [], error: null }),
        staffIds.length > 0
          ? supabase
              .from('staff')
              .select(`
                id,
                profile_id,
                profile:profiles(
                  full_name
                )
              `)
              .in('id', staffIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (buildingsResult.error) {
        console.error('Error fetching buildings:', buildingsResult.error);
      }
      if (staffResult.error) {
        console.error('Error fetching staff:', staffResult.error);
      }

      // Create lookup maps for efficient joining
      const buildingsMap = new Map(
        (buildingsResult.data || []).map(b => [b.id, b])
      );
      const staffMap = new Map(
        (staffResult.data || []).map(s => [
          s.id,
          {
            id: s.id,
            profile: s.profile || null,
          },
        ])
      );

      // Combine data
      const roomsWithRelations: RoomWithRelations[] = rooms.map(room => ({
        ...room,
        building: buildingsMap.get(room.building_id) || {
          id: room.building_id,
          building_name: 'Unknown',
          organization_id: room.organization_id,
        },
        staff: room.staff_id ? (staffMap.get(room.staff_id) || null) : null,
      }));

      return roomsWithRelations;
    },
    enabled: !!user && !!profile,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (roomData: { room_number: string; building_id: string; staff_id?: string | null }) => {
      if (!user || !profile) {
        throw new Error('User not authenticated');
      }

      // Get building to verify organization
      const { data: building, error: buildingError } = await supabase
        .from('buildings')
        .select('organization_id')
        .eq('id', roomData.building_id)
        .single();

      if (buildingError || !building) {
        throw new Error('Building not found');
      }

      // Verify building belongs to user's organization (unless super admin)
      if (profile.role !== 'super_admin' && building.organization_id !== profile.organization_id) {
        throw new Error('Building does not belong to your organization');
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

      // Check for duplicates (same room number in same building)
      const { data: existing } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_number', trimmedNumber)
        .eq('building_id', roomData.building_id)
        .single();

      if (existing) {
        throw new Error('This room number already exists in the selected building');
      }

      // Organization_id will be set automatically by trigger, but we can set it explicitly
      const { data, error } = await supabase
        .from('rooms')
        .insert({
          room_number: trimmedNumber,
          building_id: roomData.building_id,
          staff_id: roomData.staff_id || null,
          organization_id: building.organization_id, // Inherit from building
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
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
      let trimmedNumber = room_number;
      if (room_number) {
        trimmedNumber = room_number.trim();
        if (!trimmedNumber) {
          throw new Error('Room number cannot be empty');
        }
      }

      // Get current room to check organization
      const { data: currentRoom } = await supabase
        .from('rooms')
        .select('organization_id, building_id')
        .eq('id', id)
        .single();

      if (!currentRoom) {
        throw new Error('Room not found');
      }

      // If building_id is being changed, verify new building belongs to same org
      if (building_id && building_id !== currentRoom.building_id) {
        const { data: newBuilding } = await supabase
          .from('buildings')
          .select('organization_id')
          .eq('id', building_id)
          .single();

        if (!newBuilding || newBuilding.organization_id !== currentRoom.organization_id) {
          throw new Error('Building must belong to the same organization');
        }
      }

      // Check for duplicates (excluding current record)
      if (trimmedNumber && building_id) {
        const { data: existing } = await supabase
          .from('rooms')
          .select('id')
          .eq('room_number', trimmedNumber)
          .eq('building_id', building_id)
          .neq('id', id)
          .single();

        if (existing) {
          throw new Error('This room number already exists in the selected building');
        }
      }

      const updateData: { room_number?: string; building_id?: string; staff_id?: string | null } = {};
      if (trimmedNumber !== undefined) updateData.room_number = trimmedNumber;
      if (building_id !== undefined) updateData.building_id = building_id;
      if (staff_id !== undefined) updateData.staff_id = staff_id || null;

      const { data, error } = await supabase
        .from('rooms')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
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
      // Note: Check if room is in use by students or other entities
      // This should be done in the application layer
      // For now, we'll just attempt deletion and handle FK errors

      const { error } = await supabase.from('rooms').delete().eq('id', id);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503') {
          throw new Error('This room is in use and cannot be deleted');
        }
        throw new Error(error.message);
      }
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

