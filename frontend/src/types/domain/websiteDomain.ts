// Website Domain Domain Types - UI-friendly structure (camelCase, Date objects)

export interface WebsiteDomain {
  id: string;
  organizationId: string;
  schoolId: string;
  domain: string;
  isPrimary?: boolean;
  verificationStatus?: string | null;
  sslStatus?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

