import type * as ExamTypeApi from '@/types/api/examType';
import type { ExamType, ExamTypeInsert, ExamTypeUpdate } from '@/types/domain/examType';

/**
 * Convert API ExamType model to Domain ExamType model
 */
export function mapExamTypeApiToDomain(api: ExamTypeApi.ExamType): ExamType {
  return {
    id: api.id,
    organizationId: api.organization_id,
    name: api.name,
    code: api.code,
    description: api.description,
    displayOrder: api.display_order,
    isActive: api.is_active,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
  };
}

/**
 * Convert Domain ExamType model to API ExamTypeInsert payload
 */
export function mapExamTypeDomainToInsert(domain: ExamTypeInsert): ExamTypeApi.ExamTypeInsert {
  return {
    name: domain.name,
    code: domain.code ?? null,
    description: domain.description ?? null,
    display_order: domain.displayOrder,
    is_active: domain.isActive ?? true,
  };
}

/**
 * Convert Domain ExamType model to API ExamTypeUpdate payload
 */
export function mapExamTypeDomainToUpdate(domain: ExamTypeUpdate): ExamTypeApi.ExamTypeUpdate {
  return {
    name: domain.name,
    code: domain.code ?? null,
    description: domain.description ?? null,
    display_order: domain.displayOrder,
    is_active: domain.isActive,
  };
}
