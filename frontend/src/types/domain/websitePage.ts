// Website Page Domain Types - UI-friendly structure (camelCase, Date objects)

export interface WebsitePage {
  id: string;
  organizationId: string;
  schoolId: string;
  slug: string;
  title: string;
  status: string;
  contentJson?: any[] | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImagePath?: string | null;
  publishedAt?: Date | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

