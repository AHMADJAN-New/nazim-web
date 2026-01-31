// Website Announcement API Types - Match Laravel API response (snake_case, DB columns)

export interface WebsiteAnnouncement {
  id: string;
  organization_id: string;
  school_id: string;
  title: string;
  content?: string | null;
  status: string;
  published_at?: string | null;
  expires_at?: string | null;
  is_pinned?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type WebsiteAnnouncementInsert = Omit<WebsiteAnnouncement, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type WebsiteAnnouncementUpdate = Partial<WebsiteAnnouncementInsert>;

