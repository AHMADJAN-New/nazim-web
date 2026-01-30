import type * as WebsiteMediaCategoryApi from '@/types/api/websiteMediaCategory';
import type { WebsiteMediaCategory } from '@/types/domain/websiteMediaCategory';

/**
 * Convert API WebsiteMediaCategory model to Domain WebsiteMediaCategory model
 */
export function mapWebsiteMediaCategoryApiToDomain(
  api: WebsiteMediaCategoryApi.WebsiteMediaCategory
): WebsiteMediaCategory {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    name: api.name,
    slug: api.slug,
    description: api.description,
    coverImagePath: api.cover_image_path,
    sortOrder: api.sort_order ?? 0,
    isActive: api.is_active ?? true,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain WebsiteMediaCategory model to API WebsiteMediaCategoryInsert payload
 */
export function mapWebsiteMediaCategoryDomainToInsert(
  domain: Partial<WebsiteMediaCategory>
): WebsiteMediaCategoryApi.WebsiteMediaCategoryInsert {
  return {
    name: domain.name || '',
    slug: domain.slug ?? null,
    description: domain.description,
    cover_image_path: domain.coverImagePath,
    sort_order: domain.sortOrder ?? 0,
    is_active: domain.isActive ?? true,
  };
}

/**
 * Convert Domain WebsiteMediaCategory model to API WebsiteMediaCategoryUpdate payload
 */
export function mapWebsiteMediaCategoryDomainToUpdate(
  domain: Partial<WebsiteMediaCategory>
): WebsiteMediaCategoryApi.WebsiteMediaCategoryUpdate {
  return {
    name: domain.name,
    slug: domain.slug ?? null,
    description: domain.description,
    cover_image_path: domain.coverImagePath,
    sort_order: domain.sortOrder,
    is_active: domain.isActive,
  };
}
