import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Pencil, Trash2, Wrench, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  useAssets,
  useLogMaintenance,
  useUpdateMaintenance,
  useRemoveMaintenance,
} from '@/hooks/useAssets';
import { useHasPermission } from '@/hooks/usePermissions';
import type { Asset, AssetMaintenanceDomain } from '@/types/domain/asset';
import { LoadingSpinner } from '@/components/ui/loading';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

const maintenanceSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  maintenanceType: z.string().optional().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed']).default('scheduled'),
  performedOn: z.string().optional().nullable(),
  nextDueDate: z.string().optional().nullable(),
  cost: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => (val === '' || val === undefined ? null : Number(val))),
  vendor: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

export default function AssetMaintenanceTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<{ id: string; assetId: string; data: AssetMaintenanceDomain } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const canUpdate = useHasPermission('assets.update');

  const { assets = [] } = useAssets(undefined, false);

  // Memoized options for searchable asset combobox
  const assetOptions = useMemo<ComboboxOption[]>(() => {
    return assets.map((asset) => ({
      value: asset.id,
      label: `${asset.name} (${asset.assetTag})`,
    }));
  }, [assets]);

  const logMaintenance = useLogMaintenance();
  const updateMaintenance = useUpdateMaintenance();
  const removeMaintenance = useRemoveMaintenance();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      status: 'scheduled',
      cost: null,
    },
  });

  // Collect all maintenance records from all assets
  const allMaintenance = useMemo(() => {
    const maintenance: Array<{
      id: string;
      assetId: string;
      assetName: string;
      assetTag: string;
      data: AssetMaintenanceDomain;
    }> = [];

    assets.forEach((asset) => {
      if (asset.maintenanceRecords && asset.maintenanceRecords.length > 0) {
        asset.maintenanceRecords.forEach((record) => {
          maintenance.push({
            id: record.id,
            assetId: asset.id,
            assetName: asset.name,
            assetTag: asset.assetTag,
            data: record,
          });
        });
      }
    });

    return maintenance.sort((a, b) => {
      const dateA = a.data.performedOn ? new Date(a.data.performedOn).getTime() : 0;
      const dateB = b.data.performedOn ? new Date(b.data.performedOn).getTime() : 0;
      return dateB - dateA;
    });
  }, [assets]);

  const filteredMaintenance = useMemo(() => {
    if (statusFilter === 'all') return allMaintenance;
    return allMaintenance.filter((m) => m.data.status === statusFilter);
  }, [allMaintenance, statusFilter]);

  const openCreate = () => {
    setEditingMaintenance(null);
    reset({
      assetId: '',
      maintenanceType: null,
      status: 'scheduled',
      performedOn: null,
      nextDueDate: null,
      cost: null,
      vendor: null,
      notes: null,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (maintenance: { id: string; assetId: string; data: AssetMaintenanceDomain; assetName: string }) => {
    setEditingMaintenance({
      id: maintenance.id,
      assetId: maintenance.assetId,
      data: maintenance.data,
    });
    reset({
      assetId: maintenance.assetId,
      maintenanceType: maintenance.data.maintenanceType || null,
      status: maintenance.data.status,
      performedOn: maintenance.data.performedOn ? format(new Date(maintenance.data.performedOn), 'yyyy-MM-dd') : null,
      nextDueDate: maintenance.data.nextDueDate ? format(new Date(maintenance.data.nextDueDate), 'yyyy-MM-dd') : null,
      cost: maintenance.data.cost ?? null,
      vendor: maintenance.data.vendor || null,
      notes: maintenance.data.notes || null,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: MaintenanceFormValues) => {
    if (editingMaintenance) {
      updateMaintenance.mutate(
        {
          recordId: editingMaintenance.id,
          data: {
            maintenanceType: values.maintenanceType || null,
            status: values.status,
            performedOn: values.performedOn ? new Date(values.performedOn) : null,
            nextDueDate: values.nextDueDate ? new Date(values.nextDueDate) : null,
            cost: values.cost === null ? null : Number(values.cost),
            vendor: values.vendor || null,
            notes: values.notes || null,
          },
        },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    } else {
      logMaintenance.mutate(
        {
          assetId: values.assetId,
          maintenance: {
            maintenanceType: values.maintenanceType || null,
            status: values.status,
            performedOn: values.performedOn ? new Date(values.performedOn) : null,
            nextDueDate: values.nextDueDate ? new Date(values.nextDueDate) : null,
            cost: values.cost === null ? null : Number(values.cost),
            vendor: values.vendor || null,
            notes: values.notes || null,
          },
        },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    }
  };

  const handleDelete = (recordId: string) => {
    removeMaintenance.mutate(recordId);
  };

  const handleMarkCompleted = (maintenance: { id: string; assetId: string; data: AssetMaintenanceDomain }) => {
    updateMaintenance.mutate({
      recordId: maintenance.id,
      data: {
        status: 'completed',
        performedOn: maintenance.data.performedOn || new Date(),
      },
    });
  };

  const columns: ColumnDef<typeof filteredMaintenance[0]>[] = useMemo(
    () => [
      {
        accessorKey: 'asset',
        header: 'Asset',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.assetName}</p>
            <p className="text-xs text-muted-foreground">Tag: {row.original.assetTag}</p>
          </div>
        ),
      },
      {
        accessorKey: 'maintenanceType',
        header: 'Type',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.data.maintenanceType || 'General'}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.data.status;
          let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
          let className = '';
          
          if (status === 'completed') {
            variant = 'default';
            className = 'bg-green-500 hover:bg-green-600 text-white';
          } else if (status === 'in_progress') {
            variant = 'default';
            className = 'bg-blue-500 hover:bg-blue-600 text-white';
          } else if (status === 'scheduled') {
            variant = 'default';
            className = 'bg-yellow-500 hover:bg-yellow-600 text-white';
          }
          
          return (
            <Badge variant={variant} className={className}>
              {status.replace('_', ' ')}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'performedOn',
        header: 'Performed On',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.data.performedOn ? format(new Date(row.original.data.performedOn), 'MMM dd, yyyy') : 'N/A'}
          </span>
        ),
      },
      {
        accessorKey: 'nextDueDate',
        header: 'Next Due',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.data.nextDueDate ? format(new Date(row.original.data.nextDueDate), 'MMM dd, yyyy') : 'N/A'}
          </span>
        ),
      },
      {
        accessorKey: 'cost',
        header: 'Cost',
        cell: ({ row }) => (
          <span className="text-sm font-medium">
            {row.original.data.cost ? `$${Number(row.original.data.cost).toFixed(2)}` : 'N/A'}
          </span>
        ),
      },
      {
        accessorKey: 'vendor',
        header: 'Vendor',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.data.vendor || 'N/A'}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canUpdate && (
              <>
                {row.original.data.status !== 'completed' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleMarkCompleted(row.original)}
                    title="Mark as Completed"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => openEdit(row.original)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [canUpdate, updateMaintenance]
  );

  const { table } = useDataTable({
    data: filteredMaintenance,
    columns,
    pageCount: Math.ceil(filteredMaintenance.length / 25),
    paginationMeta: null,
  });

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canUpdate && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Log Maintenance
          </Button>
        )}
      </div>

      {/* Maintenance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Records</CardTitle>
          <CardDescription>Track all maintenance activities for your assets</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMaintenance.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              No maintenance records found
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
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <DataTablePagination table={table} pagination={null} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMaintenance ? 'Update Maintenance' : 'Log Maintenance'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!editingMaintenance && (
              <div>
                <Label>Asset *</Label>
                <Combobox
                  options={assetOptions}
                  value={watch('assetId') || ''}
                  onValueChange={(value) => setValue('assetId', value || undefined)}
                  placeholder="Search and select asset..."
                  searchPlaceholder="Search assets by name or tag..."
                  emptyText="No assets found."
                />
                {errors.assetId && <p className="text-sm text-destructive mt-1">{errors.assetId.message}</p>}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Maintenance Type</Label>
                <Input {...register('maintenanceType')} placeholder="Inspection, repair, etc." />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as any)}
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
                <Label>Performed On</Label>
                <Input type="date" {...register('performedOn')} />
              </div>
              <div>
                <Label>Next Due Date</Label>
                <Input type="date" {...register('nextDueDate')} />
              </div>
              <div>
                <Label>Cost</Label>
                <Input type="number" step="0.01" {...register('cost')} />
              </div>
              <div>
                <Label>Vendor</Label>
                <Input {...register('vendor')} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} {...register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={(editingMaintenance ? updateMaintenance.isPending : logMaintenance.isPending) || !canUpdate}>
                {editingMaintenance ? 'Update' : 'Log'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

