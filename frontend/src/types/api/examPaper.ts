import type { Subject } from './subject';
import type { Exam, ExamSubject } from './exam';
import type { Question, QuestionOption } from './question';

// Supported languages
export type ExamPaperLanguage = 'en' | 'ps' | 'fa' | 'ar';

export interface ExamPaperTemplate {
  id: string;
  organization_id: string;
  school_id: string;
  exam_id: string | null;
  exam_subject_id: string | null;
  subject_id: string;
  class_academic_year_id: string | null;
  template_file_id: string | null;
  title: string;
  language: ExamPaperLanguage;
  total_marks: number | null;
  duration_minutes: number | null;
  header_html: string | null;
  footer_html: string | null;
  instructions: string | null;
  is_default_for_exam_subject: boolean;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations
  subject?: Subject;
  exam?: Exam;
  exam_subject?: ExamSubject;
  school?: {
    id: string;
    school_name: string;
    school_name_arabic: string | null;
    school_name_pashto: string | null;
  };
  class_academic_year?: {
    id: string;
    class_id: string;
    academic_year_id: string;
    section_name: string | null;
    class?: {
      id: string;
      name: string;
    };
    academic_year?: {
      id: string;
      name: string;
    };
  };
  creator?: {
    id: string;
    full_name: string | null;
  };
  updater?: {
    id: string;
    full_name: string | null;
  };
  items?: ExamPaperItem[];
  items_count?: number;
  computed_total_marks?: number;
  has_marks_discrepancy?: boolean;
  print_status?: 'not_printed' | 'printing' | 'printed' | 'cancelled';
  copies_printed?: number;
  last_printed_at?: string | null;
  printed_by?: string | null;
  print_notes?: string | null;
}

export interface ExamPaperTemplateInsert {
  school_id: string;
  exam_id?: string | null;
  exam_subject_id?: string | null;
  subject_id: string;
  class_academic_year_id?: string | null;
  template_file_id?: string | null;
  title: string;
  language?: ExamPaperLanguage;
  total_marks?: number | null;
  duration_minutes?: number | null;
  header_html?: string | null;
  footer_html?: string | null;
  instructions?: string | null;
  is_default_for_exam_subject?: boolean;
  is_active?: boolean;
}

export type ExamPaperTemplateUpdate = Partial<Omit<ExamPaperTemplateInsert, 'school_id'>>;

export interface ExamPaperTemplateFilters {
  school_id?: string;
  exam_id?: string;
  exam_subject_id?: string;
  subject_id?: string;
  class_academic_year_id?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface ExamPaperItem {
  id: string;
  organization_id: string;
  school_id: string;
  exam_paper_template_id: string;
  question_id: string;
  section_label: string | null;
  position: number;
  marks_override: number | null;
  answer_lines_count: number | null;
  show_answer_lines: boolean | null;
  is_mandatory: boolean;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations
  question?: Question;
}

export interface ExamPaperItemInsert {
  question_id: string;
  section_label?: string | null;
  position?: number;
  marks_override?: number | null;
  answer_lines_count?: number | null;
  show_answer_lines?: boolean | null;
  is_mandatory?: boolean;
  notes?: string | null;
}

export type ExamPaperItemUpdate = Partial<Omit<ExamPaperItemInsert, 'question_id'>>;

export interface ExamPaperItemReorder {
  id: string;
  position: number;
  section_label?: string | null;
}

// Paper completeness stats for an exam
export interface ExamPaperStats {
  exam_id: string;
  total_subjects: number;
  subjects_with_template: number;
  subjects_without_template: number;
  completion_percentage: number;
  subjects: Array<{
    exam_subject_id: string;
    subject_id: string;
    subject_name: string;
    class_name: string;
    has_paper_template: boolean;
  }>;
}

// Preview types
export interface ExamPaperPreviewQuestion {
  number: number;
  item_id: string;
  question_id: string;
  type: string;
  difficulty: string;
  text: string;
  text_rtl: boolean;
  marks: number;
  is_mandatory: boolean;
  reference: string | null;
  options?: Array<{
    id: string;
    label: string;
    text: string;
    is_correct?: boolean;
  }>;
  correct_option?: QuestionOption;
  correct_answer?: string | null;
}

export interface ExamPaperPreviewSection {
  label: string;
  questions: ExamPaperPreviewQuestion[];
  total_marks: number;
}

export interface ExamPaperPreviewHeader {
  school_name: string;
  school_name_arabic: string | null;
  school_name_pashto: string | null;
  school_address: string | null;
  exam_name: string | null;
  subject_name: string;
  class_name: string | null;
  academic_year: string | null;
  duration_minutes: number | null;
  total_marks: number;
  date: string | null;
}

export interface ExamPaperPreview {
  template_id: string;
  title: string;
  language: ExamPaperLanguage;
  is_rtl: boolean;
  header: ExamPaperPreviewHeader;
  header_html: string | null;
  footer_html: string | null;
  instructions: string | null;
  sections: ExamPaperPreviewSection[];
  total_questions: number;
  total_marks: number;
  computed_total_marks: number;
  show_answers: boolean;
}

export interface AvailableTemplatesResponse {
  exam_subject: {
    id: string;
    subject_name: string;
    class_name: string;
  };
  templates: ExamPaperTemplate[];
}
