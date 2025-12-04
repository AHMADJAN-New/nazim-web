// Building API Types - Match Laravel API response (snake_case, DB columns)

export interface SchoolInfo {
    id: string;
    school_name: string;
    school_name_arabic?: string | null;
    school_name_pashto?: string | null;
}

export interface Building {
    id: string;
    building_name: string;
    school_id: string;
    organization_id?: string | null; // Computed from school relationship
    school?: SchoolInfo | null; // School information
    rooms_count?: number; // Number of rooms in this building
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type BuildingInsert = Omit<Building, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>;
export type BuildingUpdate = Partial<Omit<Building, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>>;
