import type * as AssetApi from '@/types/api/asset';
import type { Asset, AssetAssignmentDomain, AssetMaintenanceDomain, AssetHistoryDomain, AssetCopyDomain } from '@/types/domain/asset';

export const mapAssetApiToDomain = (api: AssetApi.Asset): Asset => ({
  id: api.id,
  organizationId: api.organization_id,
  schoolId: api.school_id,
  buildingId: api.building_id,
  roomId: api.room_id,
  schoolName: api.school?.school_name ?? null,
  buildingName: api.building?.building_name ?? null,
  roomNumber: api.room?.room_number ?? null,
  name: api.name,
  assetTag: api.asset_tag,
  category: api.category,
  categoryId: api.category_id ?? null,
  categoryName: api.category?.name ?? null,
  serialNumber: api.serial_number,
  purchaseDate: api.purchase_date ? new Date(api.purchase_date) : null,
  purchasePrice: api.purchase_price !== null && api.purchase_price !== undefined ? Number(api.purchase_price) : null,
  totalCopies: api.total_copies ?? api.total_copies_count ?? 1,
  totalCopiesCount: api.total_copies_count ?? api.total_copies ?? 1,
  availableCopiesCount: api.available_copies_count ?? 0,
  status: api.status,
  condition: api.condition,
  vendor: api.vendor,
  warrantyExpiry: api.warranty_expiry ? new Date(api.warranty_expiry) : null,
  locationNotes: api.location_notes,
  notes: api.notes,
  maintenanceEventsCount: api.maintenance_events_count,
  maintenanceCostTotal:
    api.maintenance_cost_total !== undefined && api.maintenance_cost_total !== null
      ? Number(api.maintenance_cost_total)
      : null,
  activeAssignment: api.active_assignment ? mapAssetAssignmentApiToDomain(api.active_assignment) : null,
  assignments: api.assignments?.map(mapAssetAssignmentApiToDomain),
  maintenanceRecords: api.maintenance_records?.map(mapAssetMaintenanceApiToDomain),
  history: api.history?.map(mapAssetHistoryApiToDomain),
  copies: api.copies?.map(mapAssetCopyApiToDomain),
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
});

export const mapAssetCopyApiToDomain = (api: AssetApi.AssetCopy): AssetCopyDomain => ({
  id: api.id,
  assetId: api.asset_id,
  organizationId: api.organization_id,
  copyCode: api.copy_code,
  status: api.status,
  acquiredAt: api.acquired_at ? new Date(api.acquired_at) : null,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
});

export const mapAssetAssignmentApiToDomain = (
  api: AssetApi.AssetAssignment
): AssetAssignmentDomain => ({
  id: api.id,
  assetId: api.asset_id,
  assetCopyId: api.asset_copy_id,
  organizationId: api.organization_id,
  assignedToType: api.assigned_to_type,
  assignedToId: api.assigned_to_id,
  assignedOn: api.assigned_on ? new Date(api.assigned_on) : null,
  expectedReturnDate: api.expected_return_date ? new Date(api.expected_return_date) : null,
  returnedOn: api.returned_on ? new Date(api.returned_on) : null,
  status: api.status,
  notes: api.notes,
  assetCopy: api.asset_copy ? mapAssetCopyApiToDomain(api.asset_copy) : null,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
});

export const mapAssetMaintenanceApiToDomain = (
  api: AssetApi.AssetMaintenanceRecord
): AssetMaintenanceDomain => ({
  id: api.id,
  assetId: api.asset_id,
  organizationId: api.organization_id,
  maintenanceType: api.maintenance_type,
  status: api.status,
  performedOn: api.performed_on ? new Date(api.performed_on) : null,
  nextDueDate: api.next_due_date ? new Date(api.next_due_date) : null,
  cost: api.cost !== undefined && api.cost !== null ? Number(api.cost) : 0,
  vendor: api.vendor,
  notes: api.notes,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
});

export const mapAssetHistoryApiToDomain = (api: AssetApi.AssetHistory): AssetHistoryDomain => ({
  id: api.id,
  assetId: api.asset_id,
  organizationId: api.organization_id,
  eventType: api.event_type,
  description: api.description,
  metadata: api.metadata ?? null,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
});

export const mapAssetDomainToInsert = (domain: Partial<Asset>): AssetApi.AssetInsert => ({
  name: domain.name || '',
  asset_tag: domain.assetTag || '',
  category: domain.category ?? null,
  serial_number: domain.serialNumber ?? null,
  purchase_date: domain.purchaseDate ? domain.purchaseDate.toISOString().split('T')[0] : null,
  purchase_price: domain.purchasePrice ?? null,
  total_copies: domain.totalCopies ?? 1,
  status: domain.status,
  condition: domain.condition ?? null,
  vendor: domain.vendor ?? null,
  warranty_expiry: domain.warrantyExpiry ? domain.warrantyExpiry.toISOString().split('T')[0] : null,
  location_notes: domain.locationNotes ?? null,
  notes: domain.notes ?? null,
  school_id: domain.schoolId && domain.schoolId !== 'none' ? domain.schoolId : null,
  building_id: domain.buildingId && domain.buildingId !== 'none' ? domain.buildingId : null,
  room_id: domain.roomId && domain.roomId !== 'none' ? domain.roomId : null,
});

export const mapAssetDomainToUpdate = (domain: Partial<Asset>): AssetApi.AssetUpdate => ({
  name: domain.name,
  asset_tag: domain.assetTag,
  category: domain.category,
  serial_number: domain.serialNumber,
  purchase_date: domain.purchaseDate ? domain.purchaseDate.toISOString().split('T')[0] : null,
  purchase_price: domain.purchasePrice ?? null,
  status: domain.status,
  condition: domain.condition,
  vendor: domain.vendor,
  warranty_expiry: domain.warrantyExpiry ? domain.warrantyExpiry.toISOString().split('T')[0] : null,
  location_notes: domain.locationNotes,
  notes: domain.notes,
  school_id: domain.schoolId && domain.schoolId !== 'none' ? domain.schoolId : null,
  building_id: domain.buildingId && domain.buildingId !== 'none' ? domain.buildingId : null,
  room_id: domain.roomId && domain.roomId !== 'none' ? domain.roomId : null,
});

export const mapAssetAssignmentDomainToInsert = (
  assignment: Partial<AssetAssignmentDomain>
): AssetApi.AssetAssignmentInsert => ({
  assigned_to_type: assignment.assignedToType || 'other',
  assigned_to_id: assignment.assignedToId,
  assigned_on: assignment.assignedOn ? assignment.assignedOn.toISOString().split('T')[0] : null,
  expected_return_date: assignment.expectedReturnDate
    ? assignment.expectedReturnDate.toISOString().split('T')[0]
    : null,
  notes: assignment.notes,
});

export const mapAssetAssignmentDomainToUpdate = (
  assignment: Partial<AssetAssignmentDomain>
): AssetApi.AssetAssignmentUpdate => ({
  status: assignment.status,
  assigned_on: assignment.assignedOn ? assignment.assignedOn.toISOString().split('T')[0] : null,
  expected_return_date: assignment.expectedReturnDate
    ? assignment.expectedReturnDate.toISOString().split('T')[0]
    : null,
  returned_on: assignment.returnedOn ? assignment.returnedOn.toISOString().split('T')[0] : null,
  notes: assignment.notes,
});

export const mapAssetMaintenanceDomainToInsert = (
  maintenance: Partial<AssetMaintenanceDomain>
): AssetApi.AssetMaintenanceInsert => ({
  maintenance_type: maintenance.maintenanceType ?? null,
  status: maintenance.status,
  performed_on: maintenance.performedOn ? maintenance.performedOn.toISOString().split('T')[0] : null,
  next_due_date: maintenance.nextDueDate ? maintenance.nextDueDate.toISOString().split('T')[0] : null,
  cost: maintenance.cost !== undefined && maintenance.cost !== null ? Number(maintenance.cost) : 0,
  vendor: maintenance.vendor ?? null,
  notes: maintenance.notes ?? null,
});

export const mapAssetMaintenanceDomainToUpdate = (
  maintenance: Partial<AssetMaintenanceDomain>
): AssetApi.AssetMaintenanceUpdate => ({
  maintenance_type: maintenance.maintenanceType ?? null,
  status: maintenance.status,
  performed_on: maintenance.performedOn ? maintenance.performedOn.toISOString().split('T')[0] : null,
  next_due_date: maintenance.nextDueDate ? maintenance.nextDueDate.toISOString().split('T')[0] : null,
  cost: maintenance.cost !== undefined && maintenance.cost !== null ? Number(maintenance.cost) : 0,
  vendor: maintenance.vendor ?? null,
  notes: maintenance.notes ?? null,
});
