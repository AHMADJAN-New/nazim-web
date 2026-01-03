// Subject Mapper - Converts between API (snake_case) and Domain (camelCase) models

import { mapClassApiToDomain } from './classMapper';

import type * as SubjectApi from '@/types/api/subject';
import type { Subject, ClassSubjectTemplate, ClassSubject } from '@/types/domain/subject';

/**
 * Convert API Subject model to Domain Subject model
 */
export function mapSubjectApiToDomain(api: SubjectApi.Subject): Subject {
    return {
        id: api.id,
        organizationId: api.organization_id,
        name: api.name,
        code: api.code,
        description: api.description,
        isActive: api.is_active,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    };
}

/**
 * Convert Domain Subject model to API SubjectInsert payload
 */
export function mapSubjectDomainToInsert(domain: Partial<Subject>): SubjectApi.SubjectInsert {
    return {
        organization_id: domain.organizationId || null,
        name: domain.name || '',
        code: domain.code || '',
        description: domain.description || null,
        is_active: domain.isActive ?? true,
    };
}

/**
 * Convert Domain Subject model to API SubjectUpdate payload
 */
export function mapSubjectDomainToUpdate(domain: Partial<Subject>): SubjectApi.SubjectUpdate {
    return mapSubjectDomainToInsert(domain);
}

/**
 * Convert API ClassSubjectTemplate model to Domain ClassSubjectTemplate model
 */
export function mapClassSubjectTemplateApiToDomain(api: SubjectApi.ClassSubjectTemplate): ClassSubjectTemplate {
    return {
        id: api.id,
        classId: api.class_id,
        subjectId: api.subject_id,
        organizationId: api.organization_id,
        isRequired: api.is_required,
        credits: api.credits,
        hoursPerWeek: api.hours_per_week,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
        subject: api.subject ? mapSubjectApiToDomain(api.subject) : undefined,
        class: api.class ? {
            id: api.class.id,
            organizationId: null,
            name: api.class.name,
            code: api.class.code,
            gradeLevel: null,
            description: null,
            defaultCapacity: 30,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        } : undefined,
    };
}

/**
 * Convert Domain ClassSubjectTemplate model to API ClassSubjectTemplateInsert payload
 */
export function mapClassSubjectTemplateDomainToInsert(domain: Partial<ClassSubjectTemplate>): SubjectApi.ClassSubjectTemplateInsert {
    return {
        class_id: domain.classId || '',
        subject_id: domain.subjectId || '',
        organization_id: domain.organizationId || null,
        is_required: domain.isRequired ?? false,
        credits: domain.credits || null,
        hours_per_week: domain.hoursPerWeek || null,
    };
}

/**
 * Convert Domain ClassSubjectTemplate model to API ClassSubjectTemplateUpdate payload
 */
export function mapClassSubjectTemplateDomainToUpdate(domain: Partial<ClassSubjectTemplate>): SubjectApi.ClassSubjectTemplateUpdate {
    return mapClassSubjectTemplateDomainToInsert(domain);
}

/**
 * Convert API ClassSubject model to Domain ClassSubject model
 */
export function mapClassSubjectApiToDomain(api: SubjectApi.ClassSubject): ClassSubject {
    // Parse class academic year if available
    const classAcademicYear = api.class_academic_year ? {
        id: api.class_academic_year.id,
        classId: api.class_academic_year.class_id,
        academicYearId: api.class_academic_year.academic_year_id,
        sectionName: api.class_academic_year.section_name,
        class: api.class_academic_year.class ? {
            id: api.class_academic_year.class.id,
            organizationId: null,
            name: api.class_academic_year.class.name,
            code: api.class_academic_year.class.code,
            gradeLevel: null,
            description: null,
            defaultCapacity: 30,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        } : undefined,
        academicYear: api.class_academic_year.academic_year ? {
            id: api.class_academic_year.academic_year.id,
            name: api.class_academic_year.academic_year.name,
            startDate: api.class_academic_year.academic_year.start_date ? new Date(api.class_academic_year.academic_year.start_date) : new Date(),
            endDate: api.class_academic_year.academic_year.end_date ? new Date(api.class_academic_year.academic_year.end_date) : new Date(),
        } : undefined,
    } : undefined;

    return {
        id: api.id,
        classSubjectTemplateId: api.class_subject_template_id,
        classAcademicYearId: api.class_academic_year_id,
        subjectId: api.subject_id,
        organizationId: api.organization_id,
        teacherId: api.teacher_id,
        roomId: api.room_id,
        credits: api.credits,
        hoursPerWeek: api.hours_per_week,
        isRequired: api.is_required,
        notes: api.notes,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
        subject: api.subject ? mapSubjectApiToDomain(api.subject) : undefined,
        classSubjectTemplate: api.class_subject_template ? mapClassSubjectTemplateApiToDomain(api.class_subject_template) : undefined,
        classAcademicYear,
        teacher: api.teacher ? {
            id: api.teacher.id,
            fullName: api.teacher.full_name,
        } : undefined,
        room: api.room ? {
            id: api.room.id,
            roomNumber: api.room.room_number,
        } : undefined,
    };
}

/**
 * Convert Domain ClassSubject model to API ClassSubjectInsert payload
 */
export function mapClassSubjectDomainToInsert(domain: Partial<ClassSubject>): SubjectApi.ClassSubjectInsert {
    return {
        class_subject_template_id: domain.classSubjectTemplateId || null,
        class_academic_year_id: domain.classAcademicYearId || '',
        subject_id: domain.subjectId || '',
        organization_id: domain.organizationId || null,
        teacher_id: domain.teacherId || null,
        room_id: domain.roomId || null,
        credits: domain.credits || null,
        hours_per_week: domain.hoursPerWeek || null,
        is_required: domain.isRequired ?? false,
        notes: domain.notes || null,
    };
}

/**
 * Convert Domain ClassSubject model to API ClassSubjectUpdate payload
 */
export function mapClassSubjectDomainToUpdate(domain: Partial<ClassSubject>): SubjectApi.ClassSubjectUpdate {
    return mapClassSubjectDomainToInsert(domain);
}
