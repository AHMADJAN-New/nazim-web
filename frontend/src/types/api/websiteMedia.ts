// Website Media API Types - Match Laravel API response (snake_case, DB columns)

export interface WebsiteMedia {
  id: string;
  organization_id: string;
  school_id: string;
  category_id?: string | null;
  type: string;
  file_path: string;
  file_name?: string | null;
  alt_text?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type WebsiteMediaInsert = Omit<WebsiteMedia, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type WebsiteMediaUpdate = Partial<WebsiteMediaInsert>;

