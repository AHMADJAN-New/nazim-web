import type * as WebsitePostApi from '@/types/api/websitePost';
import type { WebsitePost } from '@/types/domain/websitePost';

/**
 * Convert API WebsitePost model to Domain WebsitePost model
 */
export function mapWebsitePostApiToDomain(api: WebsitePostApi.WebsitePost): WebsitePost {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    slug: api.slug,
    title: api.title,
    status: api.status,
    excerpt: api.excerpt,
    contentJson: api.content_json,
    seoTitle: api.seo_title,
    seoDescription: api.seo_description,
    seoImagePath: api.seo_image_path,
    publishedAt: api.published_at ? new Date(api.published_at) : null,
    createdBy: api.created_by,
    updatedBy: api.updated_by,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain WebsitePost model to API WebsitePostInsert payload
 */
export function mapWebsitePostDomainToInsert(domain: Partial<WebsitePost>): WebsitePostApi.WebsitePostInsert {
  return {
    slug: domain.slug || '',
    title: domain.title || '',
    status: domain.status || 'draft',
    excerpt: domain.excerpt,
    content_json: domain.contentJson,
    seo_title: domain.seoTitle,
    seo_description: domain.seoDescription,
    seo_image_path: domain.seoImagePath,
    published_at: domain.publishedAt ? domain.publishedAt.toISOString() : null,
  };
}

/**
 * Convert Domain WebsitePost model to API WebsitePostUpdate payload
 */
export function mapWebsitePostDomainToUpdate(domain: Partial<WebsitePost>): WebsitePostApi.WebsitePostUpdate {
  return {
    slug: domain.slug,
    title: domain.title,
    status: domain.status,
    excerpt: domain.excerpt,
    content_json: domain.contentJson,
    seo_title: domain.seoTitle,
    seo_description: domain.seoDescription,
    seo_image_path: domain.seoImagePath,
    published_at: domain.publishedAt ? domain.publishedAt.toISOString() : undefined,
  };
}

