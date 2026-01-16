// Room API Types - Match Laravel API response (snake_case, DB columns)

export interface Room {
    id: string;
    room_number: string;
    building_id: string;
    school_id: string;
    staff_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Extended with relationship data
    building?: {
        id: string;
        building_name: string;
        school_id: string;
    };
    staff?: {
        id: string;
        duty?: string | null;
        profile?: {
            full_name: string;
        };
    } | null;
}

export type RoomInsert = Omit<Room, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'school_id' | 'building' | 'staff'>;
export type RoomUpdate = Partial<Omit<Room, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'school_id' | 'building' | 'staff'>>;
