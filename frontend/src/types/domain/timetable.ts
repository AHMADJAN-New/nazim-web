// Timetable Domain Types - UI-friendly structure (camelCase, nested objects)

import type { DayName } from '@/types/api/timetable';

export interface Timetable {
    id: string;
    name: string;
    timetableType: string | null;
    description: string | null;
    organizationId: string | null;
    academicYearId: string | null;
    schoolId: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface TimetableEntry {
    id: string;
    timetableId: string;
    classAcademicYearId: string;
    subjectId: string;
    teacherId: string;
    scheduleSlotId: string;
    dayName: DayName;
    periodOrder: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    // Extended with relationship data
    classAcademicYear?: {
        id: string;
        sectionName: string | null;
        class?: { id: string; name: string; code: string } | null;
        academicYear?: { id: string; name: string } | null;
    } | null;
    subject?: { id: string; name: string; code: string } | null;
    teacher?: { id: string; fullName: string } | null;
    scheduleSlot?: { id: string; name: string; startTime: string; endTime: string } | null;
}

export interface TeacherPreference {
    id: string;
    teacherId: string;
    scheduleSlotIds: string[];
    organizationId: string | null;
    academicYearId: string | null;
    isActive: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
