import type * as WebsitePageApi from '@/types/api/websitePage';
import type { WebsitePage } from '@/types/domain/websitePage';

/**
 * Convert API WebsitePage model to Domain WebsitePage model
 */
export function mapWebsitePageApiToDomain(api: WebsitePageApi.WebsitePage): WebsitePage {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    slug: api.slug,
    title: api.title,
    status: api.status,
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
 * Convert Domain WebsitePage model to API WebsitePageInsert payload
 */
export function mapWebsitePageDomainToInsert(domain: Partial<WebsitePage>): WebsitePageApi.WebsitePageInsert {
  return {
    slug: domain.slug || '',
    title: domain.title || '',
    status: domain.status || 'draft',
    content_json: domain.contentJson,
    seo_title: domain.seoTitle,
    seo_description: domain.seoDescription,
    seo_image_path: domain.seoImagePath,
    published_at: domain.publishedAt ? domain.publishedAt.toISOString() : null,
  };
}

/**
 * Convert Domain WebsitePage model to API WebsitePageUpdate payload
 */
export function mapWebsitePageDomainToUpdate(domain: Partial<WebsitePage>): WebsitePageApi.WebsitePageUpdate {
  return {
    slug: domain.slug,
    title: domain.title,
    status: domain.status,
    content_json: domain.contentJson,
    seo_title: domain.seoTitle,
    seo_description: domain.seoDescription,
    seo_image_path: domain.seoImagePath,
    published_at: domain.publishedAt ? domain.publishedAt.toISOString() : undefined,
  };
}

