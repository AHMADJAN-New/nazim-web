// Organization Domain Types - UI-friendly structure (camelCase, nested objects)

export interface Organization {
    id: string;
    name: string;
    slug: string;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
    streetAddress?: string | null;
    city?: string | null;
    stateProvince?: string | null;
    country?: string | null;
    postalCode?: string | null;
    registrationNumber?: string | null;
    taxId?: string | null;
    licenseNumber?: string | null;
    type?: string | null;
    description?: string | null;
    establishedDate?: Date | null;
    isActive?: boolean;
    contactPersonName?: string | null;
    contactPersonEmail?: string | null;
    contactPersonPhone?: string | null;
    contactPersonPosition?: string | null;
    logoUrl?: string | null;
    settings?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
}
