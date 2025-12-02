// Class Domain Types - UI-friendly structure (camelCase, nested objects)

export interface AcademicYear {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isCurrent?: boolean;
}

export interface Teacher {
    id: string;
    fullName: string;
}

export interface Room {
    id: string;
    roomNumber: string;
    building?: {
        id: string;
        buildingName: string;
    };
}

export interface Class {
    id: string;
    organizationId: string | null;
    name: string;
    code: string;
    gradeLevel: number | null;
    description: string | null;
    defaultCapacity: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface ClassAcademicYear {
    id: string;
    classId: string;
    academicYearId: string;
    organizationId: string | null;
    sectionName: string | null;
    teacherId: string | null;
    roomId: string | null;
    capacity: number | null;
    currentStudentCount: number;
    isActive: boolean;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    // Extended with relationship data
    class?: Class;
    academicYear?: AcademicYear;
    teacher?: Teacher;
    room?: Room;
}
