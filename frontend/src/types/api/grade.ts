// Grade API Types - Match Laravel API response (snake_case, DB columns)

export interface Grade {
    id: string;
    organization_id: string;
    name_en: string;
    name_ar: string;
    name_ps: string;
    name_fa: string;
    min_percentage: number;
    max_percentage: number;
    order: number;
    is_pass: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type GradeInsert = Omit<Grade, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>;
export type GradeUpdate = Partial<Omit<Grade, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>>;

// Grade details returned by GradeCalculator
export interface GradeDetails {
    id: string;
    name: string;
    name_en: string;
    name_ar: string;
    name_ps: string;
    name_fa: string;
    min_percentage: number;
    max_percentage: number;
    order: number;
    is_pass: boolean;
}
