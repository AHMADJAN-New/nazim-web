// Organization API Types - Match Laravel API response (snake_case, DB columns)

export interface Organization {
    id: string;
    name: string;
    slug: string;
    settings?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export type OrganizationInsert = Omit<Organization, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type OrganizationUpdate = Partial<OrganizationInsert>;
