// Room Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as RoomApi from '@/types/api/room';
import type { Room } from '@/types/domain/room';

/**
 * Convert API Room model to Domain Room model
 */
export function mapRoomApiToDomain(api: RoomApi.Room): Room {
    return {
        id: api.id,
        roomNumber: api.room_number,
        buildingId: api.building_id,
        schoolId: api.school_id,
        staffId: api.staff_id,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
        building: api.building ? {
            id: api.building.id,
            buildingName: api.building.building_name,
            schoolId: api.building.school_id,
        } : undefined,
        staff: api.staff ? {
            id: api.staff.id,
            profile: api.staff.profile ? {
                fullName: api.staff.profile.full_name,
            } : undefined,
        } : null,
    };
}

/**
 * Convert Domain Room model to API RoomInsert payload
 */
export function mapRoomDomainToInsert(domain: Partial<Room>): RoomApi.RoomInsert {
    return {
        room_number: domain.roomNumber || '',
        building_id: domain.buildingId || '',
        staff_id: domain.staffId || null,
    };
}

/**
 * Convert Domain Room model to API RoomUpdate payload
 */
export function mapRoomDomainToUpdate(domain: Partial<Room>): RoomApi.RoomUpdate {
    return mapRoomDomainToInsert(domain);
}
