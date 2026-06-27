// Academic Year API Types - Match Laravel API response (snake_case, DB columns)

export interface AcademicYear {
    id: string;
    organization_id: string | null;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export interface AcademicYearDeletionBlocker {
    key: string;
    count: number;
    message: string;
}

export interface AcademicYearDeletionClassInstance {
    id: string;
    class_id: string;
    class_name: string;
    section_name: string | null;
    can_remove: boolean;
    active_student_count: number;
    blockers: AcademicYearDeletionBlocker[];
}

export interface AcademicYearDeletionCheck {
    can_delete: boolean;
    blockers: AcademicYearDeletionBlocker[];
    assigned_class_count: number;
    class_instances: AcademicYearDeletionClassInstance[];
}

export type AcademicYearInsert = Omit<AcademicYear, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type AcademicYearUpdate = Partial<Omit<AcademicYear, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>>;
