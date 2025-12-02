// Schedule Slot API Types - Match Laravel API response (snake_case, DB columns)

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduleSlot {
    id: string;
    name: string;
    code: string;
    start_time: string;
    end_time: string;
    days_of_week: DayOfWeek[]; // JSONB array
    default_duration_minutes: number;
    academic_year_id: string | null;
    school_id: string | null;
    sort_order: number;
    is_active: boolean;
    description: string | null;
    organization_id: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Extended with relationship data
    academic_year?: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
    } | null;
    school?: {
        id: string;
        school_name: string;
    } | null;
}

export type ScheduleSlotInsert = Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'academic_year' | 'school'>;
export type ScheduleSlotUpdate = Partial<Omit<ScheduleSlot, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id' | 'academic_year' | 'school'>>;
