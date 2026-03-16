// Facility Domain Types - UI-friendly (camelCase)

export interface FacilityType {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgFacility {
  id: string;
  organizationId: string;
  facilityTypeId: string | null;
  name: string;
  address: string | null;
  areaSqm: number | null;
  city: string | null;
  district: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  financeAccountId: string | null;
  schoolId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  facilityType?: FacilityType | null;
  financeAccount?: { id: string; name: string; code: string | null; currentBalance?: number } | null;
  school?: { id: string; name?: string } | null;
  facilityStaffCount?: number;
  facilityDocuments?: FacilityDocument[];
}

export interface FacilityDocument {
  id: string;
  facilityId: string;
  organizationId: string;
  documentType: string;
  title: string;
  description: string | null;
  filePath: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedBy: string | null;
  documentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FacilityStaff {
  id: string;
  facilityId: string;
  role: string;
  staffId: string | null;
  displayName: string | null;
  phone: string | null;
  notes: string | null;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  staff?: { id: string; firstName?: string; fatherName?: string; employeeId?: string } | null;
}

export interface FacilityMaintenance {
  id: string;
  facilityId: string;
  maintainedAt: Date;
  description: string | null;
  status: string;
  costAmount: number | null;
  currencyId: string | null;
  expenseEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  currency?: { id: string; code: string; name: string } | null;
  expenseEntry?: { id: string; amount: number; date: string } | null;
}
