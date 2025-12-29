// Organization API Types - Match Laravel API response (snake_case, DB columns)

export interface Organization {
    id: string;
    name: string;
    slug: string;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    street_address?: string | null;
    city?: string | null;
    state_province?: string | null;
    country?: string | null;
    postal_code?: string | null;
    registration_number?: string | null;
    tax_id?: string | null;
    license_number?: string | null;
    type?: string | null;
    description?: string | null;
    established_date?: string | null;
    is_active?: boolean;
    contact_person_name?: string | null;
    contact_person_email?: string | null;
    contact_person_phone?: string | null;
    contact_person_position?: string | null;
    logo_url?: string | null;
    settings?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
    deleted_at?: string | null;
}

export type OrganizationInsert = Omit<Organization, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type OrganizationUpdate = Partial<OrganizationInsert>;
