// Facility Mapper - API (snake_case) <-> Domain (camelCase)

import type * as FacilityApi from '@/types/api/facility';
import type {
  FacilityType,
  OrgFacility,
  FacilityStaff,
  FacilityMaintenance,
  FacilityDocument,
} from '@/types/domain/facility';

const parseDecimal = (value: string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return parseFloat(value) || 0;
};

export function mapFacilityTypeApiToDomain(api: FacilityApi.FacilityType): FacilityType {
  return {
    id: api.id,
    organizationId: api.organization_id,
    name: api.name,
    code: api.code,
    displayOrder: api.display_order ?? 0,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
  };
}

export function mapFacilityTypeDomainToInsert(domain: Partial<FacilityType>): FacilityApi.FacilityTypeInsert {
  return {
    name: domain.name ?? '',
    code: domain.code ?? null,
    display_order: domain.displayOrder ?? 0,
  };
}

export function mapOrgFacilityApiToDomain(api: FacilityApi.OrgFacility): OrgFacility {
  return {
    id: api.id,
    organizationId: api.organization_id,
    facilityTypeId: api.facility_type_id ?? null,
    name: api.name,
    address: api.address ?? null,
    areaSqm: api.area_sqm != null ? parseDecimal(api.area_sqm) : null,
    city: api.city ?? null,
    district: api.district ?? null,
    landmark: api.landmark ?? null,
    latitude: api.latitude != null ? parseDecimal(api.latitude) : null,
    longitude: api.longitude != null ? parseDecimal(api.longitude) : null,
    financeAccountId: api.finance_account_id ?? null,
    schoolId: api.school_id ?? null,
    isActive: api.is_active ?? true,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    facilityType: api.facility_type ? mapFacilityTypeApiToDomain(api.facility_type) : null,
    financeAccount: api.finance_account
      ? {
          id: api.finance_account.id,
          name: api.finance_account.name,
          code: api.finance_account.code,
          currentBalance: api.finance_account.current_balance != null ? parseDecimal(api.finance_account.current_balance) : undefined,
        }
      : null,
    school: api.school ? { id: api.school.id, name: api.school.name } : null,
    facilityStaffCount: api.facility_staff_count,
    facilityDocuments: api.facility_documents?.map(mapFacilityDocumentApiToDomain),
  };
}

export function mapFacilityDocumentApiToDomain(api: FacilityApi.FacilityDocument): FacilityDocument {
  return {
    id: api.id,
    facilityId: api.facility_id,
    organizationId: api.organization_id,
    documentType: api.document_type,
    title: api.title,
    description: api.description ?? null,
    filePath: api.file_path,
    fileName: api.file_name,
    mimeType: api.mime_type ?? null,
    fileSize: api.file_size ?? null,
    uploadedBy: api.uploaded_by ?? null,
    documentDate: api.document_date ? new Date(api.document_date) : null,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
  };
}

export function mapOrgFacilityDomainToInsert(domain: Partial<OrgFacility>): FacilityApi.OrgFacilityInsert {
  return {
    facility_type_id: domain.facilityTypeId ?? null,
    name: domain.name ?? '',
    address: domain.address ?? null,
    area_sqm: domain.areaSqm ?? null,
    city: domain.city ?? null,
    district: domain.district ?? null,
    landmark: domain.landmark ?? null,
    latitude: domain.latitude ?? null,
    longitude: domain.longitude ?? null,
    finance_account_id: domain.financeAccountId ?? null,
    school_id: domain.schoolId ?? null,
    is_active: domain.isActive ?? true,
  };
}

export function mapOrgFacilityDomainToUpdate(domain: Partial<OrgFacility>): FacilityApi.OrgFacilityUpdate {
  return mapOrgFacilityDomainToInsert(domain);
}

export function mapFacilityStaffApiToDomain(api: FacilityApi.FacilityStaff): FacilityStaff {
  return {
    id: api.id,
    facilityId: api.facility_id,
    role: api.role,
    staffId: api.staff_id ?? null,
    displayName: api.display_name ?? null,
    phone: api.phone ?? null,
    notes: api.notes ?? null,
    startDate: api.start_date ? new Date(api.start_date) : null,
    endDate: api.end_date ? new Date(api.end_date) : null,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    staff: api.staff
      ? {
          id: api.staff.id,
          firstName: api.staff.first_name,
          fatherName: api.staff.father_name,
          employeeId: api.staff.employee_id,
        }
      : null,
  };
}

export function mapFacilityStaffDomainToInsert(domain: Partial<FacilityStaff>): FacilityApi.FacilityStaffInsert {
  return {
    role: domain.role ?? '',
    staff_id: domain.staffId ?? null,
    display_name: domain.displayName ?? null,
    phone: domain.phone ?? null,
    notes: domain.notes ?? null,
    start_date: domain.startDate ? new Date(domain.startDate).toISOString().slice(0, 10) : undefined,
    end_date: domain.endDate ? new Date(domain.endDate).toISOString().slice(0, 10) : undefined,
  };
}

export function mapFacilityMaintenanceApiToDomain(api: FacilityApi.FacilityMaintenance): FacilityMaintenance {
  return {
    id: api.id,
    facilityId: api.facility_id,
    maintainedAt: new Date(api.maintained_at),
    description: api.description ?? null,
    status: api.status ?? 'pending',
    costAmount: api.cost_amount != null ? parseDecimal(api.cost_amount) : null,
    currencyId: api.currency_id ?? null,
    expenseEntryId: api.expense_entry_id ?? null,
    createdAt: new Date(api.created_at),
    updatedAt: new Date(api.updated_at),
    currency: api.currency ? { id: api.currency.id, code: api.currency.code, name: api.currency.name } : null,
    expenseEntry: api.expense_entry
      ? {
          id: api.expense_entry.id,
          amount: parseDecimal(api.expense_entry.amount),
          date: api.expense_entry.date,
        }
      : null,
  };
}

export function mapFacilityMaintenanceDomainToInsert(domain: Partial<FacilityMaintenance>): FacilityApi.FacilityMaintenanceInsert {
  return {
    maintained_at: domain.maintainedAt ? new Date(domain.maintainedAt).toISOString().slice(0, 10) : '',
    description: domain.description ?? null,
    status: domain.status ?? 'pending',
    cost_amount: domain.costAmount ?? null,
    currency_id: domain.currencyId ?? null,
    expense_entry_id: domain.expenseEntryId ?? null,
  };
}
