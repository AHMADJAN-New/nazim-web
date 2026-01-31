// Website Page API Types - Match Laravel API response (snake_case, DB columns)

export interface WebsitePage {
  id: string;
  organization_id: string;
  school_id: string;
  slug: string;
  title: string;
  status: string;
  content_json?: any[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_image_path?: string | null;
  published_at?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type WebsitePageInsert = Omit<WebsitePage, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'created_by' | 'updated_by'>;
export type WebsitePageUpdate = Partial<WebsitePageInsert>;

