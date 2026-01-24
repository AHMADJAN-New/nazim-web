// Website Fatwa Domain Types - UI-friendly structure (camelCase, Date objects)

export interface WebsiteFatwa {
  id: string;
  organizationId: string;
  schoolId: string;
  categoryId?: string | null;
  slug: string;
  title: string;
  questionText?: string | null;
  answerText?: string | null;
  referencesJson?: any[] | null;
  status: string;
  publishedAt?: Date | null;
  isFeatured?: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface WebsiteFatwaCategory {
  id: string;
  organizationId: string;
  schoolId: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface WebsiteFatwaQuestion {
  id: string;
  organizationId: string;
  schoolId: string;
  categoryId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  questionText: string;
  isAnonymous?: boolean;
  status: string;
  submittedAt?: Date | null;
  assignedTo?: string | null;
  internalNotes?: string | null;
  answerDraft?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

