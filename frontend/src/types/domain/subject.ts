// Subject Domain Types - UI-friendly structure (camelCase, nested objects)

import type { Class } from './class';
import type { AcademicYear } from './class';

export interface Subject {
    id: string;
    organizationId: string | null;
    name: string;
    code: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface ClassSubjectTemplate {
    id: string;
    classId: string;
    subjectId: string;
    organizationId: string | null;
    isRequired: boolean;
    credits: number | null;
    hoursPerWeek: number | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    // Extended with relationship data
    subject?: Subject;
    class?: Class;
}

export interface ClassSubject {
    id: string;
    classSubjectTemplateId: string | null;
    classAcademicYearId: string;
    subjectId: string;
    organizationId: string | null;
    teacherId: string | null;
    roomId: string | null;
    credits: number | null;
    hoursPerWeek: number | null;
    isRequired: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    // Extended with relationship data
    subject?: Subject;
    classSubjectTemplate?: ClassSubjectTemplate;
    classAcademicYear?: {
        id: string;
        classId: string;
        academicYearId: string;
        sectionName: string | null;
        class?: Class;
        academicYear?: AcademicYear;
    };
    teacher?: {
        id: string;
        fullName: string;
    };
    room?: {
        id: string;
        roomNumber: string;
    };
}
