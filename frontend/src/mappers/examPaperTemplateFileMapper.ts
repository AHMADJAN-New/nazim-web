// ExamPaperTemplateFile Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as ExamPaperTemplateFileApi from '@/types/api/examPaperTemplateFile';
import type { ExamPaperTemplateFile } from '@/types/domain/examPaperTemplateFile';

/**
 * Convert API ExamPaperTemplateFile model to Domain ExamPaperTemplateFile model
 */
export function mapExamPaperTemplateFileApiToDomain(
  api: ExamPaperTemplateFileApi.ExamPaperTemplateFile
): ExamPaperTemplateFile {
  return {
    id: api.id,
    organizationId: api.organization_id,
    name: api.name,
    description: api.description,
    templateHtml: api.template_html,
    cssStyles: api.css_styles,
    language: api.language,
    isDefault: api.is_default,
    isActive: api.is_active,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain ExamPaperTemplateFile model to API ExamPaperTemplateFileInsert payload
 */
export function mapExamPaperTemplateFileDomainToInsert(
  domain: Partial<ExamPaperTemplateFile>
): ExamPaperTemplateFileApi.ExamPaperTemplateFileInsert {
  return {
    name: domain.name || '',
    description: domain.description ?? null,
    language: domain.language || 'en',
    template_html: domain.templateHtml || '',
    css_styles: domain.cssStyles ?? null,
    is_default: domain.isDefault ?? false,
    is_active: domain.isActive ?? true,
  };
}

/**
 * Convert Domain ExamPaperTemplateFile model to API ExamPaperTemplateFileUpdate payload
 */
export function mapExamPaperTemplateFileDomainToUpdate(
  domain: Partial<ExamPaperTemplateFile>
): ExamPaperTemplateFileApi.ExamPaperTemplateFileUpdate {
  return mapExamPaperTemplateFileDomainToInsert(domain);
}


