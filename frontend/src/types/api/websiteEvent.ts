// Website Event API Types - Match Laravel API response (snake_case, DB columns)

export interface WebsiteEvent {
  id: string;
  organization_id: string;
  school_id: string;
  title: string;
  location?: string | null;
  starts_at: string;
  ends_at?: string | null;
  is_public?: boolean;
  summary?: string | null;
  content_json?: any[] | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type WebsiteEventInsert = Omit<WebsiteEvent, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type WebsiteEventUpdate = Partial<WebsiteEventInsert>;

