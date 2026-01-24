// Website Domain API Types - Match Laravel API response (snake_case, DB columns)

export interface WebsiteDomain {
  id: string;
  organization_id: string;
  school_id: string;
  domain: string;
  is_primary?: boolean;
  verification_status?: string | null;
  ssl_status?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type WebsiteDomainInsert = Omit<WebsiteDomain, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type WebsiteDomainUpdate = Partial<WebsiteDomainInsert>;

