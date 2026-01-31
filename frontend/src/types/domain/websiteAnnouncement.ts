// Website Announcement Domain Types - UI-friendly structure (camelCase, Date objects)

export interface WebsiteAnnouncement {
  id: string;
  organizationId: string;
  schoolId: string;
  title: string;
  content?: string | null;
  status: string;
  publishedAt?: Date | null;
  expiresAt?: Date | null;
  isPinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

