import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Wrench, History, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useDataTable } from '@/hooks/use-data-table';
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useAssetStats,
  useAssignAsset,
  useAssetAssignments,
  useAssetMaintenance,
  useLogMaintenance,
  useAssetHistory,
} from '@/hooks/useAssets';
import { useBuildings } from '@/hooks/useBuildings';
import { useHasPermission } from '@/hooks/usePermissions';
import { useRooms } from '@/hooks/useRooms';
import { useSchools } from '@/hooks/useSchools';
import { useStaff } from '@/hooks/useStaff';
import { useStudents } from '@/hooks/useStudents';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Asset, AssetAssignmentDomain, AssetMaintenanceDomain } from '@/types/domain/asset';
import { LoadingSpinner } from '@/components/ui/loading';


const assetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  assetTag: z.string().min(1, 'Asset tag is required'),
  status: z.enum(['available', 'assigned', 'maintenance', 'retired', 'lost', 'disposed']).default('available'),
  category: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  purchasePrice: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val === '' || val === undefined ? null : Number(val))),
  purchaseDate: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  schoolId: z.string().optional().nullable(),
  buildingId: z.string().optional().nullable(),
  roomId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type AssetFormValues = z.infer<typeof assetSchema>;

const assignmentSchema = z.object({
  assignedToType: z.enum(['staff', 'student', 'room', 'other']),
  assignedToId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

const maintenanceSchema = z.object({
  maintenanceType: z.string().optional().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed']).default('scheduled'),
  cost: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val === '' || val === undefined ? null : Number(val))),
  notes: z.string().optional().nullable(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

export function AssetManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();

  const canCreate = useHasPermission('assets.create');
  const canUpdate = useHasPermission('assets.update');
  const canDelete = useHasPermission('assets.delete');

  const {
    assets = [],
    isLoading,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useAssets(
    {
      search,
      status: statusFilter,
    },
    true
  );

  const { data: stats } = useAssetStats();
  const { data: schools } = useSchools();
  const { data: buildings } = useBuildings();
  const { rooms } = useRooms(undefined, undefined, true);
  const { data: staff } = useStaff();
  const { data: students } = useStudents();
  const assignments = useAssetAssignments(selectedAssetId);
  const maintenance = useAssetMaintenance(selectedAssetId);
  const history = useAssetHistory(selectedAssetId);

  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const assignAsset = useAssignAsset();
  const logMaintenance = useLogMaintenance();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      status: 'available',
      purchasePrice: null,
    },
  });

  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      assignedToType: 'staff',
    },
  });

  const maintenanceForm = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      status: 'scheduled',
      cost: null,
    },
  });

  useEffect(() => {
    if (!selectedAssetId && assets && (assets as Asset[]).length > 0) {
      setSelectedAssetId((assets as Asset[])[0].id);
    }
  }, [assets, selectedAssetId]);

  const openCreate = () => {
    setEditingAsset(null);
    reset({
      name: '',
      assetTag: '',
      status: 'available',
      category: '',
      purchasePrice: null,
      purchaseDate: null,
      warrantyExpiry: null,
      vendor: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const openEdit = (asset: Asset) => {
    setEditingAsset(asset);
    reset({
      name: asset.name,
      assetTag: asset.assetTag,
      status: asset.status,
      category: asset.category || '',
      serialNumber: asset.serialNumber || '',
      purchasePrice: asset.purchasePrice ?? null,
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString().split('T')[0] : null,
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.toISOString().split('T')[0] : null,
      vendor: asset.vendor || '',
      notes: asset.notes || '',
      schoolId: asset.schoolId || undefined,
      buildingId: asset.buildingId || undefined,
      roomId: asset.roomId || undefined,
    });
    setIsDialogOpen(true);
  };

  const onSubmitAsset = (values: AssetFormValues) => {
    const payload: Partial<Asset> = {
      name: values.name,
      assetTag: values.assetTag,
      status: values.status,
      category: values.category || null,
      serialNumber: values.serialNumber || null,
      purchasePrice: values.purchasePrice === null ? null : Number(values.purchasePrice),
      purchaseDate: values.purchaseDate ? new Date(values.purchaseDate) : null,
      warrantyExpiry: values.warrantyExpiry ? new Date(values.warrantyExpiry) : null,
      vendor: values.vendor || null,
      notes: values.notes || null,
      schoolId: values.schoolId || null,
      buildingId: values.buildingId || null,
      roomId: values.roomId || null,
    };

    if (editingAsset) {
      updateAsset.mutate({ id: editingAsset.id, data: payload }, { onSuccess: () => setIsDialogOpen(false) });
    } else {
      createAsset.mutate(payload, { onSuccess: () => setIsDialogOpen(false) });
    }
  };

  const handleDelete = (assetId: string) => {
    deleteAsset.mutate(assetId);
  };

  const handleAssign = (values: AssignmentFormValues) => {
    if (!selectedAssetId) return;
    const payload: Partial<AssetAssignmentDomain> = {
      assignedToType: values.assignedToType,
      assignedToId: values.assignedToId || null,
      notes: values.notes || null,
    };
    assignAsset.mutate({ assetId: selectedAssetId, assignment: payload }, { onSuccess: () => assignmentForm.reset() });
  };

  const handleLogMaintenance = (values: MaintenanceFormValues) => {
    if (!selectedAssetId) return;
    const payload: Partial<AssetMaintenanceDomain> = {
      maintenanceType: values.maintenanceType || null,
      status: values.status,
      cost: values.cost === null ? null : Number(values.cost),
      notes: values.notes || null,
    };
    logMaintenance.mutate({ assetId: selectedAssetId, maintenance: payload }, { onSuccess: () => maintenanceForm.reset() });
  };

  const columns: ColumnDef<Asset>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Asset',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">Tag: {row.original.assetTag}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge>{row.original.status}</Badge>,
      },
      {
        accessorKey: 'purchasePrice',
        header: 'Value',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {row.original.purchasePrice ? `$${row.original.purchasePrice.toFixed(2)}` : 'N/A'}
          </span>
        ),
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.roomNumber && <div>Room: {row.original.roomNumber}</div>}
            {!row.original.roomNumber && row.original.buildingName && <div>Building: {row.original.buildingName}</div>}
            {!row.original.roomNumber && !row.original.buildingName && row.original.schoolName && (
              <div>School: {row.original.schoolName}</div>
            )}
            {!row.original.roomNumber && !row.original.buildingName && !row.original.schoolName && <div>Unassigned</div>}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canUpdate && (
              <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canDelete, canUpdate]
  );

  const { table } = useDataTable({
    data: assets as Asset[],
    columns,
    pageCount: pagination?.last_page,
    paginationMeta: pagination ?? null,
    initialState: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (newPagination) => {
      setPage(newPagination.pageIndex + 1);
      setPageSize(newPagination.pageSize);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asset Management</h1>
          <p className="text-sm text-muted-foreground">
            Track assets, assignments, maintenance, and history with organization-aware controls.
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Asset
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Assets</CardDescription>
            <CardTitle className="text-2xl">{stats?.asset_count ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Purchase Value</CardDescription>
            <CardTitle className="text-2xl">${(stats?.total_purchase_value || 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Maintenance Spend</CardDescription>
            <CardTitle className="text-2xl">${(stats?.maintenance_cost_total || 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Available</CardDescription>
            <CardTitle className="text-2xl">{stats?.status_counts?.available ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[240px]">
          <Input
            placeholder="Search assets by name, tag, or serial"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter || 'all'} onValueChange={(value) => setStatusFilter(value === 'all' ? undefined : value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="disposed">Disposed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assets</CardTitle>
          <CardDescription>Multi-tenant filtered list with current assignments and status.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-24 items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={row.original.id === selectedAssetId ? 'bg-muted/50' : ''}
                      onClick={() => setSelectedAssetId(row.original.id)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination && <DataTablePagination table={table} pagination={pagination} />}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedAssetId && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Assign assets to staff, students, rooms, or mark as other.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="grid grid-cols-1 gap-3 md:grid-cols-4"
                onSubmit={assignmentForm.handleSubmit(handleAssign)}
              >
                <div className="md:col-span-1">
                  <Label>Type</Label>
                  <Select
                    value={assignmentForm.watch('assignedToType')}
                    onValueChange={(value) => assignmentForm.setValue('assignedToType', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Assignee</Label>
                  <Select
                    value={assignmentForm.watch('assignedToId') || 'none'}
                    onValueChange={(value) => assignmentForm.setValue('assignedToId', value === 'none' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unspecified</SelectItem>
                      {assignmentForm.watch('assignedToType') === 'staff' &&
                        staff?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.fullName || s.profile?.fullName || s.employeeId || 'Unknown Staff'}
                          </SelectItem>
                        ))}
                      {assignmentForm.watch('assignedToType') === 'student' &&
                        students?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.fullName}
                          </SelectItem>
                        ))}
                      {assignmentForm.watch('assignedToType') === 'room' &&
                        rooms?.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.roomNumber} ({r.building?.buildingName})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1 flex items-end">
                  <Button type="submit" className="w-full" disabled={assignAsset.isPending || !canUpdate}>
                    <ShieldCheck className="h-4 w-4 mr-2" /> Assign
                  </Button>
                </div>
              </form>

              <ScrollArea className="h-48 rounded-md border p-3">
                {assignments.data && assignments.data.length > 0 ? (
                  <div className="space-y-3">
                    {assignments.data.map((assignment) => (
                      <div key={assignment.id} className="flex items-center justify-between rounded-md border p-2">
                        <div>
                          <p className="font-medium capitalize">{assignment.assigned_to_type}</p>
                          <p className="text-xs text-muted-foreground">Status: {assignment.status}</p>
                        </div>
                        <Badge variant={assignment.status === 'active' ? 'default' : 'secondary'}>
                          {assignment.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No assignments yet.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Maintenance</CardTitle>
              <CardDescription>Track maintenance schedules and costs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form className="space-y-2" onSubmit={maintenanceForm.handleSubmit(handleLogMaintenance)}>
                <div>
                  <Label>Type</Label>
                  <Input {...maintenanceForm.register('maintenanceType')} placeholder="Inspection, repair, etc." />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={maintenanceForm.watch('status')}
                    onValueChange={(value) => maintenanceForm.setValue('status', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Cost</Label>
                  <Input type="number" step="0.01" {...maintenanceForm.register('cost')} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea rows={3} {...maintenanceForm.register('notes')} />
                </div>
                <Button type="submit" className="w-full" disabled={logMaintenance.isPending || !canUpdate}>
                  <Wrench className="h-4 w-4 mr-2" /> Log Maintenance
                </Button>
              </form>

              <ScrollArea className="h-48 rounded-md border p-2">
                {maintenance.data && maintenance.data.length > 0 ? (
                  <div className="space-y-3">
                    {maintenance.data.map((m) => (
                      <div key={m.id} className="rounded-md border p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{m.maintenance_type || 'General'}</span>
                          <Badge variant={m.status === 'completed' ? 'default' : 'outline'}>{m.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cost: {m.cost ? `$${Number(m.cost).toFixed(2)}` : 'N/A'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No maintenance records yet.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedAssetId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> History
            </CardTitle>
            <CardDescription>Audit-friendly history of changes and actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {history.data && history.data.length > 0 ? (
                  history.data.map((item) => (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold capitalize">{item.event_type.replace('_', ' ')}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(item.created_at)}
                        </span>
                      </div>
                      {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No history available.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Update Asset' : 'Create Asset'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitAsset)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Asset Tag</Label>
                <Input {...register('assetTag')} />
                {errors.assetTag && <p className="text-sm text-destructive">{errors.assetTag.message}</p>}
              </div>
              <div>
                <Label>Status</Label>
                <Select value={watch('status') || 'available'} onValueChange={(value) => setValue('status', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Input {...register('category')} />
              </div>
              <div>
                <Label>Serial Number</Label>
                <Input {...register('serialNumber')} />
              </div>
              <div>
                <Label>Purchase Price</Label>
                <Input type="number" step="0.01" {...register('purchasePrice')} />
              </div>
              <div>
                <Label>Purchase Date</Label>
                <CalendarFormField control={assignmentForm.control} name="purchaseDate" label="Category" />
              </div>
              <div>
                <Label>Warranty Expiry</Label>
                <CalendarFormField control={assignmentForm.control} name="warrantyExpiry" label="Purchase Price" />
              </div>
              <div>
                <Label>Vendor</Label>
                <Input {...register('vendor')} />
              </div>
              <div>
                <Label>School</Label>
                <Select
                  value={watch('schoolId') || 'none'}
                  onValueChange={(value) => setValue('schoolId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {schools?.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.schoolName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Building</Label>
                <Select
                  value={watch('buildingId') || 'none'}
                  onValueChange={(value) => setValue('buildingId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {buildings?.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.buildingName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Room</Label>
                <Select
                  value={watch('roomId') || 'none'}
                  onValueChange={(value) => setValue('roomId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {rooms?.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.roomNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} {...register('notes')} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={(editingAsset ? updateAsset.isPending : createAsset.isPending) || !canUpdate}>
                {editingAsset ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AssetManagement;
