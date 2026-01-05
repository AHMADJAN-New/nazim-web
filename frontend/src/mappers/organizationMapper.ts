// Organization Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as OrganizationApi from '@/types/api/organization';
import type { Organization } from '@/types/domain/organization';

/**
 * Convert API Organization model to Domain Organization model
 */
export function mapOrganizationApiToDomain(api: OrganizationApi.Organization): Organization {
    return {
        id: api.id,
        name: api.name,
        slug: api.slug,
        email: api.email,
        phone: api.phone,
        website: api.website,
        streetAddress: api.street_address,
        city: api.city,
        stateProvince: api.state_province,
        country: api.country,
        postalCode: api.postal_code,
        registrationNumber: api.registration_number,
        taxId: api.tax_id,
        licenseNumber: api.license_number,
        type: api.type,
        description: api.description,
        establishedDate: api.established_date ? new Date(api.established_date) : null,
        isActive: api.is_active ?? true,
        contactPersonName: api.contact_person_name,
        contactPersonEmail: api.contact_person_email,
        contactPersonPhone: api.contact_person_phone,
        contactPersonPosition: api.contact_person_position,
        logoUrl: api.logo_url,
        settings: api.settings,
        createdAt: api.created_at ? new Date(api.created_at) : undefined,
        updatedAt: api.updated_at ? new Date(api.updated_at) : undefined,
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    };
}

/**
 * Convert Domain Organization model to API OrganizationInsert payload
 */
export function mapOrganizationDomainToInsert(domain: Partial<Organization>): OrganizationApi.OrganizationInsert {
    return {
        name: domain.name || '',
        slug: domain.slug || '',
        email: domain.email || null,
        phone: domain.phone || null,
        website: domain.website || null,
        street_address: domain.streetAddress || null,
        city: domain.city || null,
        state_province: domain.stateProvince || null,
        country: domain.country || null,
        postal_code: domain.postalCode || null,
        registration_number: domain.registrationNumber || null,
        tax_id: domain.taxId || null,
        license_number: domain.licenseNumber || null,
        type: domain.type || null,
        description: domain.description || null,
        established_date: domain.establishedDate 
            ? (domain.establishedDate instanceof Date 
                ? domain.establishedDate.toISOString().slice(0, 10)
                : typeof domain.establishedDate === 'string' && domain.establishedDate.trim() !== ''
                    ? domain.establishedDate
                    : null)
            : null,
        is_active: domain.isActive ?? true,
        contact_person_name: domain.contactPersonName || null,
        contact_person_email: domain.contactPersonEmail || null,
        contact_person_phone: domain.contactPersonPhone || null,
        contact_person_position: domain.contactPersonPosition || null,
        logo_url: domain.logoUrl || null,
        settings: domain.settings || {},
    };
}

/**
 * Convert Domain Organization model to API OrganizationUpdate payload
 */
export function mapOrganizationDomainToUpdate(domain: Partial<Organization>): OrganizationApi.OrganizationUpdate {
    return mapOrganizationDomainToInsert(domain);
}
