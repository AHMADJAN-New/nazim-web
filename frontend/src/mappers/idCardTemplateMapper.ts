import type * as IdCardTemplateApi from '@/types/api/idCardTemplate';
import type { IdCardTemplate, IdCardLayoutConfig } from '@/types/domain/idCardTemplate';

/**
 * Convert API IdCardTemplate model to Domain IdCardTemplate model
 */
export function mapIdCardTemplateApiToDomain(api: IdCardTemplateApi.IdCardTemplate): IdCardTemplate {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    name: api.name,
    description: api.description,
    backgroundImagePathFront: api.background_image_path_front,
    backgroundImagePathBack: api.background_image_path_back,
    layoutConfigFront: (api.layout_config_front as IdCardLayoutConfig) || {},
    layoutConfigBack: (api.layout_config_back as IdCardLayoutConfig) || {},
    cardSize: api.card_size,
    isDefault: api.is_default,
    isActive: api.is_active,
    createdBy: api.created_by,
    updatedBy: api.updated_by,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain IdCardTemplate model to API IdCardTemplateInsert payload
 */
export function mapIdCardTemplateDomainToInsert(domain: Partial<IdCardTemplate>): IdCardTemplateApi.IdCardTemplateInsert {
  return {
    name: domain.name || '',
    description: domain.description || null,
    background_image_front: domain.backgroundImageFront || null,
    background_image_back: domain.backgroundImageBack || null,
    layout_config_front: domain.layoutConfigFront || null,
    layout_config_back: domain.layoutConfigBack || null,
    card_size: domain.cardSize || 'CR80',
    school_id: domain.schoolId || null,
    is_default: domain.isDefault ?? false,
    is_active: domain.isActive ?? true,
  };
}

/**
 * Convert Domain IdCardTemplate model to API IdCardTemplateUpdate payload
 */
export function mapIdCardTemplateDomainToUpdate(domain: Partial<IdCardTemplate>): IdCardTemplateApi.IdCardTemplateUpdate {
  return mapIdCardTemplateDomainToInsert(domain);
}

