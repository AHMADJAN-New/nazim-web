// Schedule Slot Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as ScheduleSlotApi from '@/types/api/scheduleSlot';
import type { ScheduleSlot } from '@/types/domain/scheduleSlot';

/**
 * Convert API ScheduleSlot model to Domain ScheduleSlot model
 */
export function mapScheduleSlotApiToDomain(api: ScheduleSlotApi.ScheduleSlot): ScheduleSlot {
    // Parse days_of_week JSONB array
    let daysOfWeek: ScheduleSlotApi.DayOfWeek[] = [];
    if (Array.isArray(api.days_of_week)) {
        daysOfWeek = api.days_of_week;
    } else if (typeof api.days_of_week === 'string') {
        try {
            daysOfWeek = JSON.parse(api.days_of_week);
        } catch {
            daysOfWeek = [];
        }
    }

    return {
        id: api.id,
        name: api.name,
        code: api.code,
        startTime: api.start_time,
        endTime: api.end_time,
        daysOfWeek,
        defaultDurationMinutes: api.default_duration_minutes || 45,
        academicYearId: api.academic_year_id,
        schoolId: api.school_id,
        sortOrder: api.sort_order,
        isActive: api.is_active,
        description: api.description,
        organizationId: api.organization_id,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
        academicYear: api.academic_year ? {
            id: api.academic_year.id,
            name: api.academic_year.name,
            startDate: api.academic_year.start_date ? new Date(api.academic_year.start_date) : new Date(),
            endDate: api.academic_year.end_date ? new Date(api.academic_year.end_date) : new Date(),
        } : null,
        school: api.school ? {
            id: api.school.id,
            schoolName: api.school.school_name,
        } : null,
    };
}

/**
 * Convert Domain ScheduleSlot model to API ScheduleSlotInsert payload
 */
export function mapScheduleSlotDomainToInsert(domain: Partial<ScheduleSlot>): ScheduleSlotApi.ScheduleSlotInsert {
    return {
        name: domain.name || '',
        code: domain.code || '',
        start_time: domain.startTime || '',
        end_time: domain.endTime || '',
        days_of_week: domain.daysOfWeek || [],
        default_duration_minutes: domain.defaultDurationMinutes ?? 45,
        academic_year_id: domain.academicYearId || null,
        school_id: domain.schoolId || null,
        sort_order: domain.sortOrder ?? 1,
        is_active: domain.isActive ?? true,
        description: domain.description || null,
        organization_id: domain.organizationId || null,
    };
}

/**
 * Convert Domain ScheduleSlot model to API ScheduleSlotUpdate payload
 */
export function mapScheduleSlotDomainToUpdate(domain: Partial<ScheduleSlot>): ScheduleSlotApi.ScheduleSlotUpdate {
    return mapScheduleSlotDomainToInsert(domain);
}
