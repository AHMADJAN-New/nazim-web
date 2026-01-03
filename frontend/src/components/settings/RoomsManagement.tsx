import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Search, DoorOpen } from 'lucide-react';
import { useState } from 'react';

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
import { useLanguage } from '@/hooks/useLanguage';

import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';

import { LoadingSpinner } from '@/components/ui/loading';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';


import type { Room } from '@/types/domain/room';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { useBuildings } from '@/hooks/useBuildings';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/useRooms';
import { useStaff } from '@/hooks/useStaff';
import { formatDate, formatDateTime } from '@/lib/utils';

const roomSchema = z.object({
  room_number: z.string().min(1, 'Room number is required').max(100, 'Room number must be 100 characters or less'),
  building_id: z.string().min(1, 'Building is required'),
  staff_id: z.string().nullable().optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

// Room report row type - dates should be ISO strings for backend formatting
interface RoomReportRow {
  room_number: string;
  building_name: string;
  staff_name: string;
  school_name?: string;
  organization_name?: string;
  created_at: string; // ISO date string - backend will format based on user's calendar preference
}

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

  // Transform rooms data for export - pass dates as ISO strings for backend formatting
  const transformRoomsForExport = (roomsToTransform: Room[]): RoomReportRow[] => {
    return roomsToTransform.map((room: Room) => {
      const roomBuilding = buildings?.find((b) => b.id === room.buildingId);

      return {
        room_number: room.roomNumber,
        building_name: roomBuilding?.buildingName || t('settings.rooms.na'),
        staff_name: room.staff?.profile?.fullName || t('settings.rooms.noStaffAssigned'),
        // Pass date as ISO string - backend DateConversionService will format it based on user's calendar preference
        created_at: room.createdAt instanceof Date 
          ? room.createdAt.toISOString().slice(0, 10) 
          : room.createdAt,
      };
    });
  };

  // Build filters summary string
  const buildFiltersSummary = (): string => {
    const parts: string[] = [];

    if (searchQuery) {
      parts.push(`${t('common.search')}: ${searchQuery}`);
    }

    return parts.length > 0 ? parts.join(' | ') : '';
  };

  // Client-side filtering for search
  // Note: When search is active, we filter the current page's results
  // For full search across all pages, consider implementing server-side search
  const filteredRooms = (rooms as unknown as Room[] | undefined)?.filter((room: Room) => {
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
      header: t('settings.rooms.roomNumber'),
      cell: ({ row }) => <span className="font-medium">{row.original.roomNumber}</span>,
    },
    {
      accessorKey: 'building',
      header: t('settings.rooms.building'),
      cell: ({ row }) => row.original.building?.buildingName || t('settings.rooms.na'),
    },
    {
      accessorKey: 'staff',
      header: t('settings.rooms.staffWarden'),
      cell: ({ row }) => row.original.staff?.profile?.fullName || (
        <span className="text-muted-foreground">{t('settings.rooms.noStaffAssigned')}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: t('settings.rooms.createdAt'),
      cell: ({ row }) => {
        const date = row.original.createdAt;
        return date instanceof Date
          ? formatDate(date)
          : formatDate(date);
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-right">{t('common.actions')}</div>,
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
      const room = (rooms as unknown as Room[] | undefined)?.find((r: Room) => r.id === roomId);
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
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5" />
              {t('settings.rooms.management')}
            </CardTitle>
            <CardDescription>{t('settings.rooms.title')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text={t('settings.rooms.loadingRooms')} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('settings.rooms.management')}
        description={t('settings.rooms.title')}
        icon={<DoorOpen className="h-5 w-5" />}
        primaryAction={hasCreatePermission ? {
          label: t('settings.rooms.addRoom'),
          onClick: () => handleOpenDialog(),
          icon: <Plus className="h-4 w-4" />,
        } : undefined}
        rightSlot={
          <ReportExportButtons
            data={filteredRooms}
            columns={[
              { key: 'room_number', label: t('settings.rooms.roomNumber'), align: 'left' },
              { key: 'building_name', label: t('settings.rooms.building'), align: 'left' },
              { key: 'staff_name', label: t('settings.rooms.staffWarden'), align: 'left' },
              { key: 'created_at', label: t('settings.rooms.createdAt'), align: 'left' },
            ]}
            reportKey="rooms"
            title={t('settings.rooms.reportTitle') || 'Rooms Report'}
            transformData={transformRoomsForExport}
            buildFiltersSummary={buildFiltersSummary}
            templateType="rooms"
            disabled={isLoading}
            errorNoSchool={t('settings.rooms.exportErrorNoSchool')}
            errorNoData={t('settings.rooms.exportErrorNoRooms')}
            successPdf={t('settings.rooms.exportSuccessPdf')}
            successExcel={t('settings.rooms.exportSuccessExcel')}
            errorPdf={t('settings.rooms.exportErrorPdf')}
            errorExcel={t('settings.rooms.exportErrorExcel')}
          />
        }
        showDescriptionOnMobile={false}
        mobilePrimaryActionVariant="icon"
      />

      <FilterPanel 
        title={t('common.filters') || 'Search & Filter'}
        defaultOpenDesktop={true}
        defaultOpenMobile={false}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1 min-w-0">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder={t('settings.rooms.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>{t('settings.rooms.management')}</CardTitle>
              <CardDescription className="hidden md:block">{t('settings.rooms.title')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle px-4 md:px-0">
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
                          ? header.column.columnDef.header({ column: header.column, header, table: table })
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
                      {searchQuery ? t('settings.rooms.noRoomsFound') : t('settings.rooms.noRoomsMessage')}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {cell.column.columnDef.cell && typeof cell.column.columnDef.cell === 'function'
                            ? cell.column.columnDef.cell({ row, column: cell.column, cell, getValue: cell.getValue, renderValue: cell.renderValue, table: table })
                            : cell.column.columnDef.cell}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
              </div>
            </div>
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
        <DialogContent className="w-[95vw] sm:max-w-[500px]">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedRoom ? t('settings.rooms.editRoom') : t('settings.rooms.addRoom')}
              </DialogTitle>
              <DialogDescription>
                {selectedRoom
                  ? t('settings.rooms.update')
                  : t('settings.rooms.create')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="room_number">{t('settings.rooms.roomNumber')}</Label>
                <Input
                  id="room_number"
                  {...register('room_number')}
                  placeholder={t('settings.rooms.roomNumber')}
                />
                {errors.room_number && (
                  <p className="text-sm text-destructive">{errors.room_number.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="building_id">{t('settings.rooms.building')}</Label>
                <Controller
                  name="building_id"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('settings.rooms.selectBuilding')} />
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
                <Label htmlFor="staff_id">{t('settings.rooms.staffWardenOptional')}</Label>
                <Controller
                  name="staff_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                      value={field.value || 'none'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('settings.rooms.selectStaff')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('settings.rooms.noStaffAssigned')}</SelectItem>
                        {staff?.map((staffMember) => (
                          <SelectItem key={staffMember.id} value={staffMember.id}>
                            {staffMember.profile?.fullName || `${t('settings.rooms.staffWarden')} ${staffMember.employeeId}`}
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
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending}>
                {selectedRoom ? t('settings.rooms.update') : t('settings.rooms.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.rooms.deleteConfirm')}
              {selectedRoom &&
                rooms?.find((r) => r.id === selectedRoom) &&
                ` "${(rooms as unknown as Room[] | undefined)?.find((r: Room) => r.id === selectedRoom)?.roomNumber}"`}
              {t('settings.rooms.deleteConfirmRooms')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

