// Website Event Domain Types - UI-friendly structure (camelCase, Date objects)

export interface WebsiteEvent {
  id: string;
  organizationId: string;
  schoolId: string;
  title: string;
  location?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  isPublic?: boolean;
  summary?: string | null;
  contentJson?: any[] | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

