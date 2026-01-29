// Website Media Category API Types - Match Laravel API response (snake_case, DB columns)

export interface WebsiteMediaCategory {
  id: string;
  organization_id: string;
  school_id: string;
  name: string;
  slug: string;
  description?: string | null;
  cover_image_path?: string | null;
  sort_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type WebsiteMediaCategoryInsert = Omit<
  WebsiteMediaCategory,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
>;

export type WebsiteMediaCategoryUpdate = Partial<WebsiteMediaCategoryInsert>;
