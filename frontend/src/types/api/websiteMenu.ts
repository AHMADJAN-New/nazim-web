// Website Menu API Types - Match Laravel API response (snake_case, DB columns)

export interface WebsiteMenu {
  id: string;
  organization_id: string;
  school_id: string;
  parent_id?: string | null;
  label: string;
  url: string;
  sort_order?: number;
  is_visible?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type WebsiteMenuInsert = Omit<WebsiteMenu, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type WebsiteMenuUpdate = Partial<WebsiteMenuInsert>;

