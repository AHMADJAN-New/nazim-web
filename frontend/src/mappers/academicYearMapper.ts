// Academic Year Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as AcademicYearApi from '@/types/api/academicYear';
import type { AcademicYear } from '@/types/domain/academicYear';

/**
 * Convert API AcademicYear model to Domain AcademicYear model
 */
export function mapAcademicYearApiToDomain(api: AcademicYearApi.AcademicYear): AcademicYear {
    return {
        id: api.id,
        organizationId: api.organization_id,
        name: api.name,
        startDate: api.start_date ? new Date(api.start_date) : new Date(),
        endDate: api.end_date ? new Date(api.end_date) : new Date(),
        isCurrent: api.is_current,
        description: api.description,
        status: api.status,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    };
}

/**
 * Convert Domain AcademicYear model to API AcademicYearInsert payload
 */
export function mapAcademicYearDomainToInsert(domain: Partial<AcademicYear>): AcademicYearApi.AcademicYearInsert {
    return {
        organization_id: domain.organizationId || null,
        name: domain.name || '',
        start_date: domain.startDate ? domain.startDate.toISOString().split('T')[0] : '',
        end_date: domain.endDate ? domain.endDate.toISOString().split('T')[0] : '',
        is_current: domain.isCurrent ?? false,
        description: domain.description || null,
        status: domain.status || 'active',
    };
}

/**
 * Convert Domain AcademicYear model to API AcademicYearUpdate payload
 */
export function mapAcademicYearDomainToUpdate(domain: Partial<AcademicYear>): AcademicYearApi.AcademicYearUpdate {
    return mapAcademicYearDomainToInsert(domain);
}
