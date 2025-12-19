import type { AssetAssignment, AssetHistory, AssetMaintenanceRecord, AssetStatus } from '../api/asset';

export interface Asset {
  id: string;
  organizationId: string;
  currencyId: string | null;
  financeAccountId: string | null;
  schoolId: string | null;
  buildingId: string | null;
  roomId: string | null;
  schoolName?: string | null;
  buildingName?: string | null;
  roomNumber?: string | null;
  name: string;
  assetTag: string;
  category: string | null;
  categoryId: string | null;
  categoryName?: string | null;
  serialNumber: string | null;
  purchaseDate: Date | null;
  purchasePrice: number | null;
  totalCopies?: number;
  totalCopiesCount?: number;
  availableCopiesCount?: number;
  status: AssetStatus;
  condition: string | null;
  vendor: string | null;
  warrantyExpiry: Date | null;
  locationNotes: string | null;
  notes: string | null;
  maintenanceEventsCount?: number;
  maintenanceCostTotal?: number | null;
  currency?: { id: string; code: string; name: string; symbol: string | null } | null;
  financeAccount?: { 
    id: string; 
    name: string; 
    code: string | null;
    currencyId: string | null;
    currency?: { id: string; code: string; name: string; symbol: string | null } | null;
  } | null;
  activeAssignment?: AssetAssignmentDomain | null;
  assignments?: AssetAssignmentDomain[];
  maintenanceRecords?: AssetMaintenanceDomain[];
  history?: AssetHistoryDomain[];
  copies?: AssetCopyDomain[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetCopyDomain {
  id: string;
  assetId: string;
  organizationId: string;
  copyCode: string | null;
  status: 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost' | 'disposed';
  acquiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetAssignmentDomain {
  id: string;
  assetId: string;
  assetCopyId: string | null;
  organizationId: string;
  assignedToType: 'staff' | 'student' | 'room' | 'other';
  assignedToId: string | null;
  assignedOn: Date | null;
  expectedReturnDate: Date | null;
  returnedOn: Date | null;
  status: 'active' | 'returned' | 'transferred';
  notes: string | null;
  assetCopy?: AssetCopyDomain | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetMaintenanceDomain {
  id: string;
  assetId: string;
  organizationId: string;
  maintenanceType: string | null;
  status: 'scheduled' | 'in_progress' | 'completed';
  performedOn: Date | null;
  nextDueDate: Date | null;
  cost: number;
  vendor: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetHistoryDomain {
  id: string;
  assetId: string;
  organizationId: string;
  eventType: string;
  description: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AssetStatusSummary = {
  status: string;
  total: number;
};

export type AssetMaintenanceRecord = AssetMaintenanceDomain;
export type AssetAssignment = AssetAssignmentDomain;
export type AssetHistory = AssetHistoryDomain;
export type AssetStatus = AssetStatus;
