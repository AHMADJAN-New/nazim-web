import type * as WebsiteDomainApi from '@/types/api/websiteDomain';
import type { WebsiteDomain } from '@/types/domain/websiteDomain';

/**
 * Convert API WebsiteDomain model to Domain WebsiteDomain model
 */
export function mapWebsiteDomainApiToDomain(api: WebsiteDomainApi.WebsiteDomain): WebsiteDomain {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    domain: api.domain,
    isPrimary: api.is_primary,
    verificationStatus: api.verification_status,
    sslStatus: api.ssl_status,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain WebsiteDomain model to API WebsiteDomainInsert payload
 */
export function mapWebsiteDomainDomainToInsert(domain: Partial<WebsiteDomain>): WebsiteDomainApi.WebsiteDomainInsert {
  return {
    domain: domain.domain || '',
    is_primary: domain.isPrimary,
    verification_status: domain.verificationStatus,
    ssl_status: domain.sslStatus,
  };
}

/**
 * Convert Domain WebsiteDomain model to API WebsiteDomainUpdate payload
 */
export function mapWebsiteDomainDomainToUpdate(domain: Partial<WebsiteDomain>): WebsiteDomainApi.WebsiteDomainUpdate {
  return {
    domain: domain.domain,
    is_primary: domain.isPrimary,
    verification_status: domain.verificationStatus,
    ssl_status: domain.sslStatus,
  };
}

