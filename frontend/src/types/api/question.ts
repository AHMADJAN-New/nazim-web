import type { Subject } from './subject';

// Question types
export type QuestionType = 'mcq' | 'short' | 'descriptive' | 'true_false' | 'essay';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  label?: string;
  text: string;
  is_correct?: boolean;
}

export interface Question {
  id: string;
  organization_id: string;
  school_id: string;
  subject_id: string;
  class_academic_year_id: string | null;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  marks: number;
  text: string;
  text_rtl: boolean;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  reference: string | null;
  tags: string[] | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Relations
  subject?: Subject;
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
}

export interface QuestionInsert {
  school_id: string;
  subject_id: string;
  class_academic_year_id?: string | null;
  type: QuestionType;
  difficulty?: QuestionDifficulty;
  marks?: number;
  text: string;
  text_rtl?: boolean;
  options?: QuestionOption[] | null;
  correct_answer?: string | null;
  reference?: string | null;
  tags?: string[] | null;
  is_active?: boolean;
}

export type QuestionUpdate = Partial<QuestionInsert>;

export interface QuestionFilters {
  school_id?: string;
  subject_id?: string;
  class_academic_year_id?: string;
  type?: QuestionType;
  difficulty?: QuestionDifficulty;
  is_active?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface QuestionPaginatedResponse {
  current_page: number;
  data: Question[];
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

export interface QuestionBulkUpdatePayload {
  question_ids: string[];
  is_active: boolean;
}
