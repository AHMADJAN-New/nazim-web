import { useState } from 'react';
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/useRooms';
import { useBuildings } from '@/hooks/useBuildings';
import { useStaff } from '@/hooks/useStaff';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Search, DoorOpen } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoadingSpinner } from '@/components/ui/loading';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef } from '@tanstack/react-table';
import type { Room } from '@/types/domain/room';

const roomSchema = z.object({
  room_number: z.string().min(1, 'Room number is required').max(100, 'Room number must be 100 characters or less'),
  building_id: z.string().min(1, 'Building is required'),
  staff_id: z.string().nullable().optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

export function RoomsManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('rooms.create');
  const hasUpdatePermission = useHasPermission('rooms.update');
  const hasDeletePermission = useHasPermission('rooms.delete');
  // Use paginated version of the hook
  const { 
    rooms, 
    isLoading: roomsLoading, 
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useRooms(undefined, profile?.organization_id, true);
  const { data: buildings, isLoading: buildingsLoading } = useBuildings();
  const { data: staff, isLoading: staffLoading } = useStaff();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      staff_id: null,
    },
  });

  const isLoading = roomsLoading || buildingsLoading || staffLoading;

  // Client-side filtering for search
  // Note: When search is active, we filter the current page's results
  // For full search across all pages, consider implementing server-side search
  const filteredRooms = rooms?.filter((room) => {
    if (!searchQuery) return true; // Show all if no search query
    const query = (searchQuery || '').toLowerCase();
    const matchesSearch =
      room.roomNumber?.toLowerCase().includes(query) ||
      room.building?.buildingName?.toLowerCase().includes(query) ||
      room.staff?.profile?.fullName?.toLowerCase().includes(query);
    return matchesSearch;
  }) || [];

  // Define columns for DataTable
  const columns: ColumnDef<Room>[] = [
    {
      accessorKey: 'roomNumber',
      header: 'Room Number',
      cell: ({ row }) => <span className="font-medium">{row.original.roomNumber}</span>,
    },
    {
      accessorKey: 'building',
      header: 'Building',
      cell: ({ row }) => row.original.building?.buildingName || 'N/A',
    },
    {
      accessorKey: 'staff',
      header: 'Staff/Warden',
      cell: ({ row }) => row.original.staff?.profile?.fullName || (
        <span className="text-muted-foreground">No staff assigned</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return date instanceof Date
          ? date.toLocaleDateString()
          : new Date(date).toLocaleDateString();
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {hasUpdatePermission && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDialog(row.original.id)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {hasDeletePermission && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(row.original.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Use DataTable hook for pagination integration
  const { table } = useDataTable({
    data: filteredRooms,
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

  const handleOpenDialog = (roomId?: string) => {
    if (roomId) {
      const room = rooms?.find((r) => r.id === roomId);
      if (room) {
        reset({
          room_number: room.roomNumber,
          building_id: room.buildingId,
          staff_id: room.staffId || null,
        });
        setSelectedRoom(roomId);
      }
    } else {
      reset({
        room_number: '',
        building_id: '',
        staff_id: null,
      });
      setSelectedRoom(null);
    }
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (roomId: string) => {
    setSelectedRoom(roomId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedRoom) {
      deleteRoom.mutate(selectedRoom, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedRoom(null);
        },
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedRoom(null);
    reset();
  };

  const onSubmit = (data: RoomFormData) => {
    if (selectedRoom) {
      updateRoom.mutate(
        {
          id: selectedRoom,
          roomNumber: data.room_number,
          buildingId: data.building_id,
          staffId: data.staff_id || null,
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createRoom.mutate(
        {
          roomNumber: data.room_number,
          buildingId: data.building_id,
          staffId: data.staff_id || null,
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5" />
              Rooms Management
            </CardTitle>
            <CardDescription>Manage rooms, assign buildings and staff</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text="Loading rooms..." />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5" />
                Rooms Management
              </CardTitle>
              <CardDescription>Manage rooms, assign buildings and staff</CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by room number, building, or staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : typeof header.column.columnDef.header === 'function'
                          ? header.column.columnDef.header({ column: header.column })
                          : header.column.columnDef.header}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                      {searchQuery ? 'No rooms found matching your search' : 'No rooms found. Add your first room.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.column.columnDef.cell
                            ? cell.column.columnDef.cell({ row })
                            : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination - Always show when using paginated mode */}
          <DataTablePagination
            table={table}
            paginationMeta={pagination ?? null}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            showPageSizeSelector={true}
            showTotalCount={true}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedRoom ? 'Edit Room' : 'Add New Room'}
              </DialogTitle>
              <DialogDescription>
                {selectedRoom
                  ? 'Update the room information below.'
                  : 'Enter the room details to add a new room.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="room_number">Room Number</Label>
                <Input
                  id="room_number"
                  {...register('room_number')}
                  placeholder="Enter room number"
                />
                {errors.room_number && (
                  <p className="text-sm text-destructive">{errors.room_number.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="building_id">Building</Label>
                <Controller
                  name="building_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings?.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.buildingName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.building_id && (
                  <p className="text-sm text-destructive">{errors.building_id.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="staff_id">Staff/Warden (Optional)</Label>
                <Controller
                  name="staff_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                      value={field.value || 'none'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff member (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No staff assigned</SelectItem>
                        {staff?.map((staffMember) => (
                          <SelectItem key={staffMember.id} value={staffMember.id}>
                            {staffMember.profile?.fullName || `Staff ${staffMember.employeeId}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending}>
                {selectedRoom ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the room
              {selectedRoom &&
                rooms?.find((r) => r.id === selectedRoom) &&
                ` "${rooms.find((r) => r.id === selectedRoom)?.roomNumber}"`}
              . If this room is in use, the deletion will fail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

