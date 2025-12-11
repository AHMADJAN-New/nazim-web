// Grade Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as GradeApi from '@/types/api/grade';
import type { Grade, GradeDetails, GradeFormData } from '@/types/domain/grade';

/**
 * Convert API Grade model to Domain Grade model
 */
export function mapGradeApiToDomain(api: GradeApi.Grade): Grade {
    return {
        id: api.id,
        organizationId: api.organization_id,
        nameEn: api.name_en,
        nameAr: api.name_ar,
        namePs: api.name_ps,
        nameFa: api.name_fa,
        minPercentage: api.min_percentage,
        maxPercentage: api.max_percentage,
        order: api.order,
        isPass: api.is_pass,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    };
}

/**
 * Convert API GradeDetails model to Domain GradeDetails model
 */
export function mapGradeDetailsApiToDomain(api: GradeApi.GradeDetails): GradeDetails {
    return {
        id: api.id,
        name: api.name,
        nameEn: api.name_en,
        nameAr: api.name_ar,
        namePs: api.name_ps,
        nameFa: api.name_fa,
        minPercentage: api.min_percentage,
        maxPercentage: api.max_percentage,
        order: api.order,
        isPass: api.is_pass,
    };
}

/**
 * Convert Domain GradeFormData to API GradeInsert payload
 */
export function mapGradeDomainToInsert(domain: GradeFormData): GradeApi.GradeInsert {
    return {
        name_en: domain.nameEn,
        name_ar: domain.nameAr,
        name_ps: domain.namePs,
        name_fa: domain.nameFa,
        min_percentage: domain.minPercentage,
        max_percentage: domain.maxPercentage,
        order: domain.order,
        is_pass: domain.isPass,
    };
}

/**
 * Convert Domain GradeFormData to API GradeUpdate payload
 */
export function mapGradeDomainToUpdate(domain: Partial<GradeFormData>): GradeApi.GradeUpdate {
    const update: GradeApi.GradeUpdate = {};

    if (domain.nameEn !== undefined) update.name_en = domain.nameEn;
    if (domain.nameAr !== undefined) update.name_ar = domain.nameAr;
    if (domain.namePs !== undefined) update.name_ps = domain.namePs;
    if (domain.nameFa !== undefined) update.name_fa = domain.nameFa;
    if (domain.minPercentage !== undefined) update.min_percentage = domain.minPercentage;
    if (domain.maxPercentage !== undefined) update.max_percentage = domain.maxPercentage;
    if (domain.order !== undefined) update.order = domain.order;
    if (domain.isPass !== undefined) update.is_pass = domain.isPass;

    return update;
}
