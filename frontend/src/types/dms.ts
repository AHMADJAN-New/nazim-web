export interface IncomingDocument {
  id: string;
  full_indoc_number?: string | null;
  subject?: string | null;
  sender_org?: string | null;
  sender_name?: string | null;
  sender_address?: string | null;
  received_date?: string | null;
  description?: string | null;
  pages_count?: number | null;
  attachments_count?: number | null;
  status?: string | null;
  security_level_key?: string | null;
  routing_department_id?: string | null;
  notes?: string | null;
  external_doc_number?: string | null;
  external_doc_date?: string | null;
  is_manual_number?: boolean | null;
  manual_indoc_number?: string | null;
  academic_year_id?: string | null;
}

export interface OutgoingDocument {
  id: string;
  organization_id?: string;
  school_id?: string | null;
  academic_year_id?: string | null;
  template_id?: string | null;
  letterhead_id?: string | null;
  full_outdoc_number?: string | null;
  subject?: string | null;
  recipient_type?: string | null;
  issue_date?: string | null;
  description?: string | null;
  pages_count?: number | null;
  attachments_count?: number | null;
  status?: string | null;
  security_level_key?: string | null;
  pdf_path?: string | null;
  page_layout?: string | null;
  body_html?: string | null;
  template_variables?: Record<string, any> | null;
  is_manual_number?: boolean | null;
  manual_outdoc_number?: string | null;
  external_doc_number?: string | null;
  external_doc_date?: string | null;
  notes?: string | null;
  template?: LetterTemplate | null;
  letterhead?: Letterhead | null;
}

export type LetterType =
  | 'application'
  | 'moe_letter'
  | 'parent_letter'
  | 'announcement'
  | 'official'
  | 'student_letter'
  | 'staff_letter'
  | 'general';

export interface LetterTypeEntity {
  id: string;
  organization_id: string;
  school_id?: string | null;
  key: string;
  name: string;
  description?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateVariable {
  name: string;
  label?: string;
  type?: 'text' | 'date' | 'number' | 'boolean';
  default?: string;
  required?: boolean;
  description?: string;
}

export interface LetterTemplate {
  id: string;
  organization_id: string;
  school_id?: string | null;
  name: string;
  category: string;
  letterhead_id?: string | null;
  letter_type?: LetterType | null;
  body_html?: string | null;
  template_file_path?: string | null;
  template_file_type?: 'html' | 'word' | 'pdf' | 'image';
  variables?: TemplateVariable[] | null;
  header_structure?: Record<string, any> | null;
  allow_edit_body?: boolean;
  default_security_level_key?: string | null;
  page_layout?: string;
  is_mass_template?: boolean;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  letterhead?: Letterhead | null;
}

export interface Letterhead {
  id: string;
  organization_id: string;
  school_id?: string | null;
  name: string;
  file_path: string;
  file_type?: 'pdf' | 'image' | 'html';
  letter_type?: LetterType | null;
  default_for_layout?: string | null;
  position?: 'header' | 'background' | 'watermark';
  preview_url?: string | null;
  file_url?: string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DmsDashboardStats {
  incoming: { week: number; month: number };
  outgoing: { week: number; month: number };
  pending_routed: number;
  confidential_plus: number;
}
