// Facility API Types - Match Laravel API response (snake_case)

export interface FacilityType {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FacilityTypeInsert {
  name: string;
  code?: string | null;
  display_order?: number;
}

export type FacilityTypeUpdate = Partial<FacilityTypeInsert>;

export interface OrgFacility {
  id: string;
  organization_id: string;
  facility_type_id: string | null;
  name: string;
  address: string | null;
  area_sqm: string | null;
  city: string | null;
  district: string | null;
  landmark: string | null;
  latitude: string | null;
  longitude: string | null;
  finance_account_id: string | null;
  school_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  facility_type?: FacilityType | null;
  finance_account?: { id: string; name: string; code: string | null; current_balance?: string } | null;
  school?: { id: string; name?: string } | null;
  facility_staff_count?: number;
  facility_documents?: FacilityDocument[];
}

export interface OrgFacilityInsert {
  facility_type_id?: string | null;
  name: string;
  address?: string | null;
  area_sqm?: number | null;
  city?: string | null;
  district?: string | null;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  finance_account_id?: string | null;
  school_id?: string | null;
  is_active?: boolean;
}

export interface FacilityDocument {
  id: string;
  facility_id: string;
  organization_id: string;
  document_type: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  document_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FacilityDocumentInsert {
  document_type: string;
  title: string;
  description?: string | null;
  document_date?: string | null;
  file: File;
}

export type OrgFacilityUpdate = Partial<OrgFacilityInsert>;

export interface FacilityStaff {
  id: string;
  facility_id: string;
  role: string;
  staff_id: string | null;
  display_name: string | null;
  phone: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  staff?: { id: string; first_name?: string; father_name?: string; employee_id?: string } | null;
}

export interface FacilityStaffInsert {
  role: string;
  staff_id?: string | null;
  display_name?: string | null;
  phone?: string | null;
  notes?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export type FacilityStaffUpdate = Partial<FacilityStaffInsert>;

export interface FacilityMaintenance {
  id: string;
  facility_id: string;
  maintained_at: string;
  description: string | null;
  status: string;
  cost_amount: string | null;
  currency_id: string | null;
  expense_entry_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  currency?: { id: string; code: string; name: string } | null;
  expense_entry?: { id: string; amount: string; date: string } | null;
}

export interface FacilityMaintenanceInsert {
  maintained_at: string;
  description?: string | null;
  status?: string;
  cost_amount?: number | null;
  currency_id?: string | null;
  expense_entry_id?: string | null;
}

export type FacilityMaintenanceUpdate = Partial<FacilityMaintenanceInsert>;
