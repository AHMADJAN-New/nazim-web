import type * as WebsiteAnnouncementApi from '@/types/api/websiteAnnouncement';
import type { WebsiteAnnouncement } from '@/types/domain/websiteAnnouncement';

/**
 * Convert API WebsiteAnnouncement model to Domain WebsiteAnnouncement model
 */
export function mapWebsiteAnnouncementApiToDomain(api: WebsiteAnnouncementApi.WebsiteAnnouncement): WebsiteAnnouncement {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    title: api.title,
    content: api.content,
    status: api.status,
    publishedAt: api.published_at ? new Date(api.published_at) : null,
    expiresAt: api.expires_at ? new Date(api.expires_at) : null,
    isPinned: api.is_pinned,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain WebsiteAnnouncement model to API WebsiteAnnouncementInsert payload
 */
export function mapWebsiteAnnouncementDomainToInsert(domain: Partial<WebsiteAnnouncement>): WebsiteAnnouncementApi.WebsiteAnnouncementInsert {
  return {
    title: domain.title || '',
    content: domain.content,
    status: domain.status || 'draft',
    published_at: domain.publishedAt ? domain.publishedAt.toISOString() : null,
    expires_at: domain.expiresAt ? domain.expiresAt.toISOString() : null,
    is_pinned: domain.isPinned,
  };
}

/**
 * Convert Domain WebsiteAnnouncement model to API WebsiteAnnouncementUpdate payload
 */
export function mapWebsiteAnnouncementDomainToUpdate(domain: Partial<WebsiteAnnouncement>): WebsiteAnnouncementApi.WebsiteAnnouncementUpdate {
  return {
    title: domain.title,
    content: domain.content,
    status: domain.status,
    published_at: domain.publishedAt ? domain.publishedAt.toISOString() : undefined,
    expires_at: domain.expiresAt ? domain.expiresAt.toISOString() : undefined,
    is_pinned: domain.isPinned,
  };
}

