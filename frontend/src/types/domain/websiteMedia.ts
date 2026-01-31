// Website Media Domain Types - UI-friendly structure (camelCase, Date objects)

export interface WebsiteMedia {
  id: string;
  organizationId: string;
  schoolId: string;
  categoryId?: string | null;
  type: string;
  filePath: string;
  fileName?: string | null;
  altText?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

