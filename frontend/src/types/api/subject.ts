// Subject API Types - Match Laravel API response (snake_case, DB columns)

// Subject type definition
export interface Subject {
    id: string;
    organization_id: string | null;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type SubjectInsert = Omit<Subject, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type SubjectUpdate = Partial<Omit<Subject, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>>;

// Class Subject Template type definition
export interface ClassSubjectTemplate {
    id: string;
    class_id: string;
    subject_id: string;
    organization_id: string | null;
    is_required: boolean;
    credits: number | null;
    hours_per_week: number | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Extended with relationship data
    subject?: Subject;
    class?: {
        id: string;
        name: string;
        code: string;
    };
}

export type ClassSubjectTemplateInsert = Omit<ClassSubjectTemplate, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'subject' | 'class'>;
export type ClassSubjectTemplateUpdate = Partial<Omit<ClassSubjectTemplate, 'id' | 'class_id' | 'subject_id' | 'organization_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'subject' | 'class'>>;

// Class Subject type definition
export interface ClassSubject {
    id: string;
    class_subject_template_id: string | null;
    class_academic_year_id: string;
    subject_id: string;
    organization_id: string | null;
    teacher_id: string | null;
    room_id: string | null;
    credits: number | null;
    hours_per_week: number | null;
    is_required: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Extended with relationship data
    subject?: Subject;
    class_subject_template?: ClassSubjectTemplate;
    class_academic_year?: {
        id: string;
        class_id: string;
        academic_year_id: string;
        section_name: string | null;
        class?: {
            id: string;
            name: string;
            code: string;
        };
        academic_year?: {
            id: string;
            name: string;
            start_date: string;
            end_date: string;
        };
    };
    teacher?: {
        id: string;
        full_name: string;
    };
    room?: {
        id: string;
        room_number: string;
    };
}

export type ClassSubjectInsert = Omit<ClassSubject, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'subject' | 'class_subject_template' | 'class_academic_year' | 'teacher' | 'room'>;
export type ClassSubjectUpdate = Partial<Omit<ClassSubject, 'id' | 'class_subject_template_id' | 'class_academic_year_id' | 'subject_id' | 'organization_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'subject' | 'class_subject_template' | 'class_academic_year' | 'teacher' | 'room'>>;
