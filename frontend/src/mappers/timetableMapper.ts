// Timetable Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as TimetableApi from '@/types/api/timetable';
import type { Timetable, TimetableEntry, TeacherPreference } from '@/types/domain/timetable';

/**
 * Convert API Timetable model to Domain Timetable model
 */
export function mapTimetableApiToDomain(api: TimetableApi.Timetable): Timetable {
    return {
        id: api.id,
        name: api.name,
        timetableType: api.timetable_type,
        description: api.description,
        organizationId: api.organization_id,
        academicYearId: api.academic_year_id,
        schoolId: api.school_id,
        isActive: api.is_active,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    };
}

/**
 * Convert Domain Timetable model to API TimetableInsert payload
 */
export function mapTimetableDomainToInsert(domain: Partial<Timetable>): TimetableApi.TimetableInsert {
    return {
        name: domain.name || '',
        timetable_type: domain.timetableType || null,
        description: domain.description || null,
        organization_id: domain.organizationId || null,
        academic_year_id: domain.academicYearId || null,
        school_id: domain.schoolId || null,
        is_active: domain.isActive ?? true,
    };
}

/**
 * Convert Domain Timetable model to API TimetableUpdate payload
 */
export function mapTimetableDomainToUpdate(domain: Partial<Timetable>): TimetableApi.TimetableUpdate {
    return mapTimetableDomainToInsert(domain);
}

/**
 * Convert API TimetableEntry model to Domain TimetableEntry model
 */
export function mapTimetableEntryApiToDomain(api: TimetableApi.TimetableEntry): TimetableEntry {
    return {
        id: api.id,
        timetableId: api.timetable_id,
        classAcademicYearId: api.class_academic_year_id,
        subjectId: api.subject_id,
        teacherId: api.teacher_id,
        scheduleSlotId: api.schedule_slot_id,
        dayName: api.day_name,
        periodOrder: api.period_order,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
        classAcademicYear: api.class_academic_year ? {
            id: api.class_academic_year.id,
            sectionName: api.class_academic_year.section_name,
            class: api.class_academic_year.class ? {
                id: api.class_academic_year.class.id,
                name: api.class_academic_year.class.name,
                code: api.class_academic_year.class.code,
            } : null,
            academicYear: api.class_academic_year.academic_year ? {
                id: api.class_academic_year.academic_year.id,
                name: api.class_academic_year.academic_year.name,
            } : null,
        } : null,
        subject: api.subject ? {
            id: api.subject.id,
            name: api.subject.name,
            code: api.subject.code,
        } : null,
        teacher: api.teacher ? {
            id: api.teacher.id,
            fullName: api.teacher.full_name,
            employeeId: api.teacher.employee_id || null,
        } : null,
        scheduleSlot: api.schedule_slot ? {
            id: api.schedule_slot.id,
            name: api.schedule_slot.name,
            startTime: api.schedule_slot.start_time,
            endTime: api.schedule_slot.end_time,
        } : null,
    };
}

/**
 * Convert Domain TimetableEntry model to API TimetableEntryInsert payload
 */
export function mapTimetableEntryDomainToInsert(domain: Partial<TimetableEntry>): TimetableApi.TimetableEntryInsert {
    return {
        timetable_id: domain.timetableId || '',
        class_academic_year_id: domain.classAcademicYearId || '',
        subject_id: domain.subjectId || '',
        teacher_id: domain.teacherId || '',
        schedule_slot_id: domain.scheduleSlotId || '',
        day_name: domain.dayName || 'monday',
        period_order: domain.periodOrder ?? 0,
    };
}

/**
 * Convert Domain TimetableEntry model to API TimetableEntryUpdate payload
 */
export function mapTimetableEntryDomainToUpdate(domain: Partial<TimetableEntry>): TimetableApi.TimetableEntryUpdate {
    return mapTimetableEntryDomainToInsert(domain);
}

/**
 * Convert API TeacherPreference model to Domain TeacherPreference model
 */
export function mapTeacherPreferenceApiToDomain(api: TimetableApi.TeacherPreference): TeacherPreference {
    return {
        id: api.id,
        teacherId: api.teacher_id,
        scheduleSlotIds: api.schedule_slot_ids || [],
        organizationId: api.organization_id,
        academicYearId: api.academic_year_id,
        isActive: api.is_active,
        notes: api.notes,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    };
}

/**
 * Convert Domain TeacherPreference model to API TeacherPreferenceInsert payload
 */
export function mapTeacherPreferenceDomainToInsert(domain: Partial<TeacherPreference>): TimetableApi.TeacherPreferenceInsert {
    return {
        teacher_id: domain.teacherId || '',
        schedule_slot_ids: domain.scheduleSlotIds || [],
        organization_id: domain.organizationId || null,
        academic_year_id: domain.academicYearId || null,
        is_active: domain.isActive ?? true,
        notes: domain.notes || null,
    };
}

/**
 * Convert Domain TeacherPreference model to API TeacherPreferenceUpdate payload
 */
export function mapTeacherPreferenceDomainToUpdate(domain: Partial<TeacherPreference>): TimetableApi.TeacherPreferenceUpdate {
    return mapTeacherPreferenceDomainToInsert(domain);
}
