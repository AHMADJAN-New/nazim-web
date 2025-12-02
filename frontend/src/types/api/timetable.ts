// Timetable API Types - Match Laravel API response (snake_case, DB columns)

// Day of week type for timetable entries
export type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'all_year';

// Timetable type definition
export interface Timetable {
    id: string;
    name: string;
    timetable_type: string | null;
    description: string | null;
    organization_id: string | null;
    academic_year_id: string | null;
    school_id: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type TimetableInsert = Omit<Timetable, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
    entries?: TimetableEntryInsert[];
};

export type TimetableUpdate = Partial<Omit<Timetable, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>>;

// Timetable Entry type definition
export interface TimetableEntry {
    id: string;
    timetable_id: string;
    class_academic_year_id: string;
    subject_id: string;
    teacher_id: string;
    schedule_slot_id: string;
    day_name: DayName;
    period_order: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Extended with relationship data
    class_academic_year?: {
        id: string;
        section_name: string | null;
        class?: { id: string; name: string; code: string } | null;
        academic_year?: { id: string; name: string } | null;
    } | null;
    subject?: { id: string; name: string; code: string } | null;
    teacher?: { id: string; full_name: string } | null;
    schedule_slot?: { id: string; name: string; start_time: string; end_time: string } | null;
}

export type TimetableEntryInsert = Omit<TimetableEntry, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'class_academic_year' | 'subject' | 'teacher' | 'schedule_slot'>;
export type TimetableEntryUpdate = Partial<Omit<TimetableEntry, 'id' | 'timetable_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'class_academic_year' | 'subject' | 'teacher' | 'schedule_slot'>>;

// Teacher Timetable Preference type definition
export interface TeacherPreference {
    id: string;
    teacher_id: string;
    schedule_slot_ids: string[]; // JSONB array
    organization_id: string | null;
    academic_year_id: string | null;
    is_active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type TeacherPreferenceInsert = Omit<TeacherPreference, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type TeacherPreferenceUpdate = Partial<Omit<TeacherPreference, 'id' | 'teacher_id' | 'organization_id' | 'created_at' | 'updated_at' | 'deleted_at'>>;
