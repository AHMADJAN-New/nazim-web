export interface ExamPaperTemplateFile {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  template_html: string;
  css_styles: string | null;
  language: 'en' | 'ps' | 'fa' | 'ar';
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ExamPaperTemplateFileInsert {
  name: string;
  description?: string | null;
  language: 'en' | 'ps' | 'fa' | 'ar';
  template_html: string;
  css_styles?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export type ExamPaperTemplateFileUpdate = Partial<ExamPaperTemplateFileInsert>;


