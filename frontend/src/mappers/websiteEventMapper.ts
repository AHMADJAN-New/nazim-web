import type * as WebsiteEventApi from '@/types/api/websiteEvent';
import type { WebsiteEvent } from '@/types/domain/websiteEvent';

/**
 * Convert API WebsiteEvent model to Domain WebsiteEvent model
 */
export function mapWebsiteEventApiToDomain(api: WebsiteEventApi.WebsiteEvent): WebsiteEvent {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    title: api.title,
    location: api.location,
    startsAt: new Date(api.starts_at),
    endsAt: api.ends_at ? new Date(api.ends_at) : null,
    isPublic: api.is_public,
    summary: api.summary,
    contentJson: api.content_json,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain WebsiteEvent model to API WebsiteEventInsert payload
 */
export function mapWebsiteEventDomainToInsert(domain: Partial<WebsiteEvent>): WebsiteEventApi.WebsiteEventInsert {
  return {
    title: domain.title || '',
    location: domain.location,
    starts_at: domain.startsAt ? domain.startsAt.toISOString() : new Date().toISOString(),
    ends_at: domain.endsAt ? domain.endsAt.toISOString() : null,
    is_public: domain.isPublic,
    summary: domain.summary,
    content_json: domain.contentJson,
  };
}

/**
 * Convert Domain WebsiteEvent model to API WebsiteEventUpdate payload
 */
export function mapWebsiteEventDomainToUpdate(domain: Partial<WebsiteEvent>): WebsiteEventApi.WebsiteEventUpdate {
  return {
    title: domain.title,
    location: domain.location,
    starts_at: domain.startsAt ? domain.startsAt.toISOString() : undefined,
    ends_at: domain.endsAt ? domain.endsAt.toISOString() : undefined,
    is_public: domain.isPublic,
    summary: domain.summary,
    content_json: domain.contentJson,
  };
}

