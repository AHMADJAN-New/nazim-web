// School API Types - Match Laravel API response (snake_case, DB columns)

export interface School {
    id: string;
    organization_id: string;
    school_name: string;
    school_name_arabic: string | null;
    school_name_pashto: string | null;
    school_address: string | null;
    school_phone: string | null;
    school_email: string | null;
    school_website: string | null;
    logo_path: string | null;
    header_image_path: string | null;
    footer_text: string | null;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    font_family: string;
    report_font_size: string;
    primary_logo_binary: string | null; // Base64 encoded binary data
    primary_logo_mime_type: string | null;
    primary_logo_filename: string | null;
    primary_logo_size: number | null;
    secondary_logo_binary: string | null; // Base64 encoded binary data
    secondary_logo_mime_type: string | null;
    secondary_logo_filename: string | null;
    secondary_logo_size: number | null;
    ministry_logo_binary: string | null; // Base64 encoded binary data
    ministry_logo_mime_type: string | null;
    ministry_logo_filename: string | null;
    ministry_logo_size: number | null;
    primary_logo_usage: string;
    secondary_logo_usage: string;
    ministry_logo_usage: string;
    header_text: string | null;
    table_alternating_colors: boolean;
    show_page_numbers: boolean;
    show_generation_date: boolean;
    report_logo_selection: string;
    show_primary_logo: boolean;
    show_secondary_logo: boolean;
    show_ministry_logo: boolean;
    primary_logo_position: string;
    secondary_logo_position: string | null;
    ministry_logo_position: string | null;
    calendar_preference: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type SchoolInsert = Omit<School, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type SchoolUpdate = Partial<Omit<School, 'id' | 'organization_id' | 'created_at' | 'updated_at' | 'deleted_at'>>;
