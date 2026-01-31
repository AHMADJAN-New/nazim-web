// Website Media Category Domain Types - UI-friendly structure (camelCase, Date objects)

export interface WebsiteMediaCategory {
  id: string;
  organizationId: string;
  schoolId: string;
  name: string;
  slug: string;
  description?: string | null;
  coverImagePath?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
