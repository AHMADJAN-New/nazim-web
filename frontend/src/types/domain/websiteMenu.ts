// Website Menu Domain Types - UI-friendly structure (camelCase, Date objects)

export interface WebsiteMenu {
  id: string;
  organizationId: string;
  schoolId: string;
  parentId?: string | null;
  label: string;
  url: string;
  sortOrder?: number;
  isVisible?: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  // Nested children for tree structure
  children?: WebsiteMenu[];
}

