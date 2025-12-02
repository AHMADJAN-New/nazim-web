// Class API Types - Match Laravel API response (snake_case, DB columns)

// Class type definition
export interface Class {
    id: string;
    organization_id: string | null;
    name: string;
    code: string;
    grade_level: number | null;
    description: string | null;
    default_capacity: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type ClassInsert = Omit<Class, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type ClassUpdate = Partial<Omit<Class, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>>;

// Class Academic Year type definition
export interface ClassAcademicYear {
    id: string;
    class_id: string;
    academic_year_id: string;
    organization_id: string | null;
    section_name: string | null;
    teacher_id: string | null;
    room_id: string | null;
    capacity: number | null;
    current_student_count: number;
    is_active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Extended with relationship data
    class?: Class;
    academic_year?: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        is_current?: boolean;
    };
    teacher?: {
        id: string;
        full_name: string;
    };
    room?: {
        id: string;
        room_number: string;
        building?: {
            id: string;
            building_name: string;
        };
    };
}

export type ClassAcademicYearInsert = Omit<ClassAcademicYear, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'class' | 'academic_year' | 'teacher' | 'room'>;
export type ClassAcademicYearUpdate = Partial<Omit<ClassAcademicYear, 'id' | 'class_id' | 'academic_year_id' | 'organization_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'class' | 'academic_year' | 'teacher' | 'room'>>;
