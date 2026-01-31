// Website Fatwa API Types - Match Laravel API response (snake_case, DB columns)

export interface WebsiteFatwa {
  id: string;
  organization_id: string;
  school_id: string;
  category_id?: string | null;
  slug: string;
  title: string;
  question_text?: string | null;
  answer_text?: string | null;
  references_json?: any[] | null;
  status: string;
  published_at?: string | null;
  is_featured?: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface WebsiteFatwaCategory {
  id: string;
  organization_id: string;
  school_id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface WebsiteFatwaQuestion {
  id: string;
  organization_id: string;
  school_id: string;
  category_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  question_text: string;
  is_anonymous?: boolean;
  status: string;
  submitted_at?: string | null;
  assigned_to?: string | null;
  internal_notes?: string | null;
  answer_draft?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type WebsiteFatwaInsert = Omit<WebsiteFatwa, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type WebsiteFatwaUpdate = Partial<WebsiteFatwaInsert>;

export type WebsiteFatwaCategoryInsert = Omit<WebsiteFatwaCategory, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type WebsiteFatwaCategoryUpdate = Partial<WebsiteFatwaCategoryInsert>;

export type WebsiteFatwaQuestionUpdate = Partial<Pick<WebsiteFatwaQuestion, 'status' | 'assigned_to' | 'internal_notes' | 'answer_draft'>>;

