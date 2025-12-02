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
        settings: domain.settings || {},
    };
}

/**
 * Convert Domain Organization model to API OrganizationUpdate payload
 */
export function mapOrganizationDomainToUpdate(domain: Partial<Organization>): OrganizationApi.OrganizationUpdate {
    return mapOrganizationDomainToInsert(domain);
}
