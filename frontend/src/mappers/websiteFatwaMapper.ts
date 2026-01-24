import type * as WebsiteFatwaApi from '@/types/api/websiteFatwa';
import type { WebsiteFatwa, WebsiteFatwaCategory, WebsiteFatwaQuestion } from '@/types/domain/websiteFatwa';

/**
 * Convert API WebsiteFatwa model to Domain WebsiteFatwa model
 */
export function mapWebsiteFatwaApiToDomain(api: WebsiteFatwaApi.WebsiteFatwa): WebsiteFatwa {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    categoryId: api.category_id,
    slug: api.slug,
    title: api.title,
    questionText: api.question_text,
    answerText: api.answer_text,
    referencesJson: api.references_json,
    status: api.status,
    publishedAt: api.published_at ? new Date(api.published_at) : null,
    isFeatured: api.is_featured,
    createdBy: api.created_by,
    updatedBy: api.updated_by,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain WebsiteFatwa model to API WebsiteFatwaInsert payload
 */
export function mapWebsiteFatwaDomainToInsert(domain: Partial<WebsiteFatwa>): WebsiteFatwaApi.WebsiteFatwaInsert {
  return {
    category_id: domain.categoryId,
    slug: domain.slug || '',
    title: domain.title || '',
    question_text: domain.questionText,
    answer_text: domain.answerText,
    references_json: domain.referencesJson,
    status: domain.status || 'draft',
    published_at: domain.publishedAt ? domain.publishedAt.toISOString() : null,
    is_featured: domain.isFeatured,
  };
}

/**
 * Convert Domain WebsiteFatwa model to API WebsiteFatwaUpdate payload
 */
export function mapWebsiteFatwaDomainToUpdate(domain: Partial<WebsiteFatwa>): WebsiteFatwaApi.WebsiteFatwaUpdate {
  return {
    category_id: domain.categoryId,
    slug: domain.slug,
    title: domain.title,
    question_text: domain.questionText,
    answer_text: domain.answerText,
    references_json: domain.referencesJson,
    status: domain.status,
    published_at: domain.publishedAt ? domain.publishedAt.toISOString() : undefined,
    is_featured: domain.isFeatured,
  };
}

/**
 * Convert API WebsiteFatwaCategory model to Domain WebsiteFatwaCategory model
 */
export function mapWebsiteFatwaCategoryApiToDomain(api: WebsiteFatwaApi.WebsiteFatwaCategory): WebsiteFatwaCategory {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    name: api.name,
    slug: api.slug,
    description: api.description,
    isActive: api.is_active,
    sortOrder: api.sort_order,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain WebsiteFatwaCategory model to API WebsiteFatwaCategoryInsert payload
 */
export function mapWebsiteFatwaCategoryDomainToInsert(domain: Partial<WebsiteFatwaCategory>): WebsiteFatwaApi.WebsiteFatwaCategoryInsert {
  return {
    name: domain.name || '',
    slug: domain.slug || '',
    description: domain.description,
    is_active: domain.isActive,
    sort_order: domain.sortOrder,
  };
}

/**
 * Convert Domain WebsiteFatwaCategory model to API WebsiteFatwaCategoryUpdate payload
 */
export function mapWebsiteFatwaCategoryDomainToUpdate(domain: Partial<WebsiteFatwaCategory>): WebsiteFatwaApi.WebsiteFatwaCategoryUpdate {
  return {
    name: domain.name,
    slug: domain.slug,
    description: domain.description,
    is_active: domain.isActive,
    sort_order: domain.sortOrder,
  };
}

/**
 * Convert API WebsiteFatwaQuestion model to Domain WebsiteFatwaQuestion model
 */
export function mapWebsiteFatwaQuestionApiToDomain(api: WebsiteFatwaApi.WebsiteFatwaQuestion): WebsiteFatwaQuestion {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    categoryId: api.category_id,
    name: api.name,
    email: api.email,
    phone: api.phone,
    questionText: api.question_text,
    isAnonymous: api.is_anonymous,
    status: api.status,
    submittedAt: api.submitted_at ? new Date(api.submitted_at) : null,
    assignedTo: api.assigned_to,
    internalNotes: api.internal_notes,
    answerDraft: api.answer_draft,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain WebsiteFatwaQuestion model to API WebsiteFatwaQuestionUpdate payload
 */
export function mapWebsiteFatwaQuestionDomainToUpdate(domain: Partial<WebsiteFatwaQuestion>): WebsiteFatwaApi.WebsiteFatwaQuestionUpdate {
  return {
    status: domain.status,
    assigned_to: domain.assignedTo,
    internal_notes: domain.internalNotes,
    answer_draft: domain.answerDraft,
  };
}

