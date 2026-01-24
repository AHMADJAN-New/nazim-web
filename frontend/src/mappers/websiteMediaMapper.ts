import type * as WebsiteMediaApi from '@/types/api/websiteMedia';
import type { WebsiteMedia } from '@/types/domain/websiteMedia';

/**
 * Convert API WebsiteMedia model to Domain WebsiteMedia model
 */
export function mapWebsiteMediaApiToDomain(api: WebsiteMediaApi.WebsiteMedia): WebsiteMedia {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    type: api.type,
    filePath: api.file_path,
    fileName: api.file_name,
    altText: api.alt_text,
    metadata: api.metadata,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain WebsiteMedia model to API WebsiteMediaInsert payload
 */
export function mapWebsiteMediaDomainToInsert(domain: Partial<WebsiteMedia>): WebsiteMediaApi.WebsiteMediaInsert {
  return {
    type: domain.type || 'image',
    file_path: domain.filePath || '',
    file_name: domain.fileName,
    alt_text: domain.altText,
    metadata: domain.metadata,
  };
}

/**
 * Convert Domain WebsiteMedia model to API WebsiteMediaUpdate payload
 */
export function mapWebsiteMediaDomainToUpdate(domain: Partial<WebsiteMedia>): WebsiteMediaApi.WebsiteMediaUpdate {
  return {
    type: domain.type,
    file_path: domain.filePath,
    file_name: domain.fileName,
    alt_text: domain.altText,
    metadata: domain.metadata,
  };
}

