// Class Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as ClassApi from '@/types/api/class';
import type { Class, ClassAcademicYear, AcademicYear, Teacher, Room } from '@/types/domain/class';

/**
 * Convert API Class model to Domain Class model
 */
export function mapClassApiToDomain(api: ClassApi.Class): Class {
    return {
        id: api.id,
        organizationId: api.organization_id,
        name: api.name,
        code: api.code,
        gradeLevel: api.grade_level,
        description: api.description,
        defaultCapacity: api.default_capacity,
        isActive: api.is_active,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    };
}

/**
 * Convert Domain Class model to API ClassInsert payload
 */
export function mapClassDomainToInsert(domain: Partial<Class>): ClassApi.ClassInsert {
    return {
        organization_id: domain.organizationId || null,
        name: domain.name || '',
        code: domain.code || '',
        grade_level: domain.gradeLevel || null,
        description: domain.description || null,
        default_capacity: domain.defaultCapacity ?? 30,
        is_active: domain.isActive ?? true,
    };
}

/**
 * Convert Domain Class model to API ClassUpdate payload
 */
export function mapClassDomainToUpdate(domain: Partial<Class>): ClassApi.ClassUpdate {
    return mapClassDomainToInsert(domain);
}

/**
 * Convert API ClassAcademicYear model to Domain ClassAcademicYear model
 */
export function mapClassAcademicYearApiToDomain(api: ClassApi.ClassAcademicYear): ClassAcademicYear {
    // Parse academic year if available
    const academicYear: AcademicYear | undefined = api.academic_year ? {
        id: api.academic_year.id,
        name: api.academic_year.name,
        startDate: api.academic_year.start_date ? new Date(api.academic_year.start_date) : new Date(),
        endDate: api.academic_year.end_date ? new Date(api.academic_year.end_date) : new Date(),
        isCurrent: api.academic_year.is_current,
    } : undefined;

    // Parse teacher if available
    const teacher: Teacher | undefined = api.teacher ? {
        id: api.teacher.id,
        fullName: api.teacher.full_name,
    } : undefined;

    // Parse room if available
    const room: Room | undefined = api.room ? {
        id: api.room.id,
        roomNumber: api.room.room_number,
        building: api.room.building ? {
            id: api.room.building.id,
            buildingName: api.room.building.building_name,
        } : undefined,
    } : undefined;

    // Parse class if available
    const classRelation: Class | undefined = api.class ? mapClassApiToDomain(api.class) : undefined;

    return {
        id: api.id,
        classId: api.class_id,
        academicYearId: api.academic_year_id,
        organizationId: api.organization_id,
        sectionName: api.section_name,
        teacherId: api.teacher_id,
        roomId: api.room_id,
        capacity: api.capacity,
        currentStudentCount: api.current_student_count,
        isActive: api.is_active,
        notes: api.notes,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
        class: classRelation,
        academicYear,
        teacher,
        room,
    };
}

/**
 * Convert Domain ClassAcademicYear model to API ClassAcademicYearInsert payload
 */
export function mapClassAcademicYearDomainToInsert(domain: Partial<ClassAcademicYear>): ClassApi.ClassAcademicYearInsert {
    if (!domain.classId) {
        throw new Error('Class ID is required');
    }
    if (!domain.academicYearId) {
        throw new Error('Academic Year ID is required');
    }
    
    return {
        class_id: domain.classId,
        academic_year_id: domain.academicYearId,
        organization_id: domain.organizationId || null,
        section_name: domain.sectionName || null,
        teacher_id: domain.teacherId || null,
        room_id: domain.roomId || null,
        capacity: domain.capacity || null,
        current_student_count: domain.currentStudentCount ?? 0,
        is_active: domain.isActive ?? true,
        notes: domain.notes || null,
    };
}

/**
 * Convert Domain ClassAcademicYear model to API ClassAcademicYearUpdate payload
 */
export function mapClassAcademicYearDomainToUpdate(domain: Partial<ClassAcademicYear>): ClassApi.ClassAcademicYearUpdate {
    return {
        section_name: domain.sectionName !== undefined ? (domain.sectionName || null) : undefined,
        room_id: domain.roomId !== undefined ? (domain.roomId || null) : undefined,
        capacity: domain.capacity !== undefined ? domain.capacity : undefined,
        teacher_id: domain.teacherId !== undefined ? (domain.teacherId || null) : undefined,
        is_active: domain.isActive !== undefined ? domain.isActive : undefined,
        notes: domain.notes !== undefined ? (domain.notes || null) : undefined,
    };
}
