// Building API Types - Match Laravel API response (snake_case, DB columns)

export interface Building {
    id: string;
    building_name: string;
    school_id: string;
    organization_id?: string | null; // Computed from school relationship
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type BuildingInsert = Omit<Building, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>;
export type BuildingUpdate = Partial<Omit<Building, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>>;
