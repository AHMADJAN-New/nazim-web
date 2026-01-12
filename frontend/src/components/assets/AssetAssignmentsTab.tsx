import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef, flexRender } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useDataTable } from '@/hooks/use-data-table';
import {
  useAssets,
  useAssignAsset,
  useUpdateAssignment,
  useRemoveAssignment,
} from '@/hooks/useAssets';
import { useRooms } from '@/hooks/useRooms';
import { useStaff } from '@/hooks/useStaff';
import { useStudents } from '@/hooks/useStudents';
import { useHasPermission } from '@/hooks/usePermissions';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Asset, AssetAssignmentDomain } from '@/types/domain/asset';
import { LoadingSpinner } from '@/components/ui/loading';

import { useLanguage } from '@/hooks/useLanguage';

const assignmentSchema = z.object({
  assetId: z.string().min(1, 'Asset is required'),
  assignedToType: z.enum(['staff', 'student', 'room', 'other']),
  assignedToId: z.string().optional().nullable(),
  assignedOn: z.string().optional().nullable(),
  expectedReturnDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

export default function AssetAssignmentsTab() {
  const { t } = useLanguage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<{ id: string; assetId: string; data: AssetAssignmentDomain } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const canUpdate = useHasPermission('assets.update');

  const { assets = [] } = useAssets(undefined, false);
  const { data: staff } = useStaff();
  const { data: students } = useStudents();
  const { rooms } = useRooms(undefined, undefined, true);

  const assignAsset = useAssignAsset();
  const updateAssignment = useUpdateAssignment();
  const removeAssignment = useRemoveAssignment();

  const formMethods = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      assignedToType: 'staff',
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = formMethods;

  // Collect all assignments from all assets
  const allAssignments = useMemo(() => {
    const assignments: Array<{
      id: string;
      assetId: string;
      assetName: string;
      assetTag: string;
      data: AssetAssignmentDomain;
    }> = [];

    assets.forEach((asset) => {
      if (asset.assignments && asset.assignments.length > 0) {
        asset.assignments.forEach((assignment) => {
          assignments.push({
            id: assignment.id,
            assetId: asset.id,
            assetName: asset.name,
            assetTag: asset.assetTag,
            data: assignment,
          });
        });
      }
    });

    return assignments.sort((a, b) => {
      const dateA = a.data.assignedOn ? new Date(a.data.assignedOn).getTime() : 0;
      const dateB = b.data.assignedOn ? new Date(b.data.assignedOn).getTime() : 0;
      return dateB - dateA;
    });
  }, [assets]);

  const filteredAssignments = useMemo(() => {
    if (statusFilter === 'all') return allAssignments;
    return allAssignments.filter((a) => a.data.status === statusFilter);
  }, [allAssignments, statusFilter]);

  const openCreate = () => {
    setEditingAssignment(null);
    reset({
      assetId: '',
      assignedToType: 'staff',
      assignedToId: null,
      assignedOn: null,
      expectedReturnDate: null,
      notes: null,
    });
    setIsDialogOpen(true);
  };

  const openEdit = (assignment: { id: string; assetId: string; data: AssetAssignmentDomain; assetName: string }) => {
    setEditingAssignment({
      id: assignment.id,
      assetId: assignment.assetId,
      data: assignment.data,
    });
    reset({
      assetId: assignment.assetId,
      assignedToType: assignment.data.assignedToType,
      assignedToId: assignment.data.assignedToId || null,
      assignedOn: assignment.data.assignedOn ? formatDate(assignment.data.assignedOn) : null,
      expectedReturnDate: assignment.data.expectedReturnDate ? formatDate(assignment.data.expectedReturnDate) : null,
      notes: assignment.data.notes || null,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (values: AssignmentFormValues) => {
    if (editingAssignment) {
      updateAssignment.mutate(
        {
          assignmentId: editingAssignment.id,
          data: {
            assignedOn: values.assignedOn ? new Date(values.assignedOn) : null,
            expectedReturnDate: values.expectedReturnDate ? new Date(values.expectedReturnDate) : null,
            notes: values.notes || null,
            status: editingAssignment.data.status,
          },
        },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    } else {
      assignAsset.mutate(
        {
          assetId: values.assetId,
          assignment: {
            assignedToType: values.assignedToType,
            assignedToId: values.assignedToId || null,
            assignedOn: values.assignedOn ? new Date(values.assignedOn) : null,
            expectedReturnDate: values.expectedReturnDate ? new Date(values.expectedReturnDate) : null,
            notes: values.notes || null,
          },
        },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    }
  };

  const handleDelete = (assignmentId: string) => {
    // Find the assignment to get the assetId
    const assignment = allAssignments.find(a => a.id === assignmentId);
    removeAssignment.mutate({ 
      assignmentId, 
      assetId: assignment?.assetId 
    });
  };

  const getAssigneeName = (assignment: AssetAssignmentDomain) => {
    if (!assignment.assignedToId) return 'Unspecified';
    
    if (assignment.assignedToType === 'staff') {
      const staffMember = staff?.find((s) => s.id === assignment.assignedToId);
      if (!staffMember) return 'Unknown Staff';
      // Try fullName first, then profile.fullName, then employeeId
      return staffMember.fullName || staffMember.profile?.fullName || staffMember.employeeId || 'Unknown Staff';
    }
    
    if (assignment.assignedToType === 'student') {
      const student = students?.find((s) => s.id === assignment.assignedToId);
      if (!student) return 'Unknown Student';
      return student.fullName || 'Unknown Student';
    }
    
    if (assignment.assignedToType === 'room') {
      const room = rooms?.find((r) => r.id === assignment.assignedToId);
      if (!room) return 'Unknown Room';
      return room.roomNumber 
        ? `${room.roomNumber}${room.building?.buildingName ? ` (${room.building.buildingName})` : ''}`
        : 'Unknown Room';
    }
    
    return 'Other';
  };

  const columns: ColumnDef<typeof filteredAssignments[0]>[] = useMemo(
    () => [
      {
        accessorKey: 'asset',
        header: 'Asset',
        cell: ({ row }) => {
          const asset = assets.find(a => a.id === row.original.assetId);
          const totalCopies = asset?.totalCopiesCount ?? asset?.totalCopies ?? 1;
          const availableCopies = asset?.availableCopiesCount ?? totalCopies;
          const assignedCopies = totalCopies - availableCopies;
          return (
            <div>
              <p className="font-semibold">{row.original.assetName}</p>
              <p className="text-xs text-muted-foreground">Tag: {row.original.assetTag}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Available: {availableCopies}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Total: {totalCopies}
                </Badge>
                {assignedCopies > 0 && (
                  <Badge variant="default" className="text-xs bg-blue-500 hover:bg-blue-600 text-white">
                    Assigned: {assignedCopies}
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'assignedTo',
        header: 'Assigned To',
        cell: ({ row }) => {
          const assigneeName = getAssigneeName(row.original.data);
          const assigneeType = row.original.data.assignedToType;
          return (
            <div>
              <p className="font-semibold">{assigneeName}</p>
              <p className="text-xs text-muted-foreground capitalize">{assigneeType}</p>
            </div>
          );
        },
      },
      {
        accessorKey: 'assignedOn',
        header: 'Assigned On',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.data.assignedOn ? formatDate(row.original.data.assignedOn) : 'N/A'}
          </span>
        ),
      },
      {
        accessorKey: 'expectedReturn',
        header: 'Expected Return',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.data.expectedReturnDate ? formatDate(row.original.data.expectedReturnDate) : 'N/A'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.data.status;
          let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'secondary';
          let className = '';
          
          if (status === 'active') {
            variant = 'default';
            className = 'bg-green-500 hover:bg-green-600 text-white';
          } else if (status === 'returned') {
            variant = 'default';
            className = 'bg-blue-500 hover:bg-blue-600 text-white';
          } else if (status === 'transferred') {
            variant = 'default';
            className = 'bg-yellow-500 hover:bg-yellow-600 text-white';
          }
          
          return (
            <Badge variant={variant} className={className}>
              {status}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            {canUpdate && (
              <>
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
    [canUpdate, staff, students, rooms]
  );

  const { table } = useDataTable({
    data: filteredAssignments,
    columns,
    pageCount: Math.ceil(filteredAssignments.length / pageSize),
    paginationMeta: null,
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

  // Transform assignments for export
  const transformAssignmentsForExport = (data: typeof filteredAssignments): Record<string, any>[] => {
    return data.map((a) => ({
      asset_name: a.assetName || '',
      asset_tag: a.assetTag || '',
      assigned_to: getAssigneeName(a.data),
      assigned_to_type: a.data.assignedToType || '',
      assigned_on: a.data.assignedOn ? formatDate(a.data.assignedOn) : 'N/A',
      expected_return: a.data.expectedReturnDate ? formatDate(a.data.expectedReturnDate) : 'N/A',
      status: a.data.status || '',
      notes: a.data.notes || '',
    }));
  };

  // Build filters summary
  const buildFiltersSummary = (): string => {
    const parts: string[] = [];
    if (statusFilter !== 'all') {
      parts.push(`Status: ${statusFilter}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'All assignments';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-semibold">Asset Assignments</h1>
            <p className="text-sm text-muted-foreground">Manage and track all asset assignments</p>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canUpdate && (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> New Assignment
          </Button>
        )}
      </div>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Asset Assignments</CardTitle>
              <CardDescription>Track all asset assignments across your organization</CardDescription>
            </div>
            <ReportExportButtons
              data={filteredAssignments}
              columns={[
                { key: 'asset_name', label: 'Asset Name', align: 'left' },
                { key: 'asset_tag', label: 'Asset Tag', align: 'left' },
                { key: 'assigned_to', label: 'Assigned To', align: 'left' },
                { key: 'assigned_to_type', label: 'Type', align: 'left' },
                { key: 'assigned_on', label: 'Assigned On', align: 'left' },
                { key: 'expected_return', label: 'Expected Return', align: 'left' },
                { key: 'status', label: 'Status', align: 'left' },
                { key: 'notes', label: 'Notes', align: 'left' },
              ]}
              reportKey="assets_assignments"
              title="Assets Assignments Report"
              transformData={transformAssignmentsForExport}
              buildFiltersSummary={buildFiltersSummary}
              templateType="assets_assignments"
              disabled={filteredAssignments.length === 0}
              buttonSize="sm"
              buttonVariant="outline"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="flex h-24 items-center justify-center text-muted-foreground">
              No assignments found
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
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                        No assignments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <DataTablePagination 
                table={table} 
                pagination={null}
                showPageSizeSelector={true}
                showTotalCount={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? 'Update Assignment' : 'Create Assignment'}</DialogTitle>
            <DialogDescription>
              {editingAssignment ? 'Update the asset assignment details.' : 'Assign an asset to a staff member, student, or room.'}
            </DialogDescription>
          </DialogHeader>
          <FormProvider {...formMethods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {!editingAssignment && (
              <div>
                <Label>Asset *</Label>
                <Select
                  value={watch('assetId') || 'none'}
                  onValueChange={(value) => setValue('assetId', value === 'none' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} ({asset.assetTag})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assetId && <p className="text-sm text-destructive">{errors.assetId.message}</p>}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label>Type *</Label>
                <Select
                  value={watch('assignedToType')}
                  onValueChange={(value) => setValue('assignedToType', value as any)}
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
              <div>
                <Label>Assignee</Label>
                <Select
                  value={watch('assignedToId') || 'none'}
                  onValueChange={(value) => setValue('assignedToId', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unspecified</SelectItem>
                    {watch('assignedToType') === 'staff' &&
                      staff?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.fullName || s.profile?.fullName || s.employeeId || 'Unknown Staff'}
                        </SelectItem>
                      ))}
                    {watch('assignedToType') === 'student' &&
                      students?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.fullName}
                        </SelectItem>
                      ))}
                    {watch('assignedToType') === 'room' &&
                      rooms?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.roomNumber} ({r.building?.buildingName})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <CalendarFormField control={control} name="assignedOn" label="Assigned On" />
              </div>
              <div>
                <CalendarFormField control={control} name="expectedReturnDate" label="Expected Return Date" />
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
              <Button type="submit" disabled={(editingAssignment ? updateAssignment.isPending : assignAsset.isPending) || !canUpdate}>
                {editingAssignment ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </div>
  );
}

