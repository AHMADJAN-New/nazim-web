export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost' | 'disposed';

export interface Asset {
  id: string;
  organization_id: string;
  currency_id: string | null;
  finance_account_id: string | null;
  school_id: string | null;
  building_id: string | null;
  room_id: string | null;
  name: string;
  asset_tag: string;
  category: string | null;
  category_id: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  total_copies?: number;
  total_copies_count?: number;
  available_copies_count?: number;
  status: AssetStatus;
  condition: string | null;
  vendor: string | null;
  warranty_expiry: string | null;
  location_notes: string | null;
  notes: string | null;
  maintenance_events_count?: number;
  maintenance_cost_total?: number | string | null;
  building?: { id: string; building_name: string } | null;
  room?: { id: string; room_number: string; building_id?: string | null } | null;
  school?: { id: string; school_name: string } | null;
  category?: { id: string; name: string; code: string | null } | null;
  currency?: { id: string; code: string; name: string; symbol: string | null } | null;
  finance_account?: { 
    id: string; 
    name: string; 
    code: string | null;
    currency_id: string | null;
    currency?: { id: string; code: string; name: string; symbol: string | null } | null;
  } | null;
  active_assignment?: AssetAssignment | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  assignments?: AssetAssignment[];
  maintenance_records?: AssetMaintenanceRecord[];
  history?: AssetHistory[];
  copies?: AssetCopy[];
}

export interface AssetCopy {
  id: string;
  asset_id: string;
  organization_id: string;
  copy_code: string | null;
  status: 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost' | 'disposed';
  acquired_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface AssetInsert {
  name: string;
  asset_tag: string;
  category?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_price?: number | null;
  total_copies?: number;
  status?: AssetStatus;
  condition?: string | null;
  vendor?: string | null;
  warranty_expiry?: string | null;
  location_notes?: string | null;
  notes?: string | null;
  school_id?: string | null;
  building_id?: string | null;
  room_id?: string | null;
  currency_id?: string | null;
  finance_account_id?: string | null;
}

export type AssetUpdate = Partial<AssetInsert>;

export interface AssetAssignment {
  id: string;
  asset_id: string;
  asset_copy_id: string | null;
  organization_id: string;
  assigned_to_type: 'staff' | 'student' | 'room' | 'other';
  assigned_to_id: string | null;
  assigned_on: string | null;
  expected_return_date: string | null;
  returned_on: string | null;
  status: 'active' | 'returned' | 'transferred';
  notes: string | null;
  created_at: string;
  updated_at: string;
  asset_copy?: AssetCopy | null;
}

export interface AssetMaintenanceRecord {
  id: string;
  asset_id: string;
  organization_id: string;
  maintenance_type: string | null;
  status: 'scheduled' | 'in_progress' | 'completed';
  performed_on: string | null;
  next_due_date: string | null;
  cost: number | string;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetHistory {
  id: string;
  asset_id: string;
  organization_id: string;
  event_type: string;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface AssetStats {
  status_counts: Record<string, number>;
  total_purchase_value: number;
  maintenance_cost_total: number;
  asset_count: number;
}

export interface AssetAssignmentInsert {
  assigned_to_type: 'staff' | 'student' | 'room' | 'other';
  assigned_to_id?: string | null;
  assigned_on?: string | null;
  expected_return_date?: string | null;
  notes?: string | null;
}

export interface AssetAssignmentUpdate {
  status?: 'active' | 'returned' | 'transferred';
  assigned_on?: string | null;
  expected_return_date?: string | null;
  returned_on?: string | null;
  notes?: string | null;
}

export interface AssetMaintenanceInsert {
  maintenance_type?: string | null;
  status?: 'scheduled' | 'in_progress' | 'completed';
  performed_on?: string | null;
  next_due_date?: string | null;
  cost?: number | null;
  vendor?: string | null;
  notes?: string | null;
}

export type AssetMaintenanceUpdate = AssetMaintenanceInsert;
