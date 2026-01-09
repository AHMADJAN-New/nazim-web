import { ColumnDef } from '@tanstack/react-table';
import { BedDouble, Building2, FileDown, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataTable } from '@/hooks/use-data-table';
import { useHostelOverview } from '@/hooks/useHostel';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import type { HostelRoom, HostelSummary } from '@/types/domain/hostel';

export function HostelManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const orgId = profile?.organization_id;

  const { data: hostelOverview, isLoading } = useHostelOverview(orgId);

  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const rooms: HostelRoom[] = hostelOverview?.rooms ?? [];
  const buildings = hostelOverview?.buildings ?? [];
  const summary: HostelSummary =
    hostelOverview?.summary ??
    {
      totalRooms: 0,
      occupiedRooms: 0,
      totalStudentsInRooms: 0,
      totalBuildings: 0,
      uniqueWardens: 0,
      unassignedBoarders: 0,
      occupancyRate: 0,
    };

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rooms.filter((room) => {
      if (buildingFilter !== 'all' && room.buildingId !== buildingFilter) return false;
      if (!term) return true;

      return (
        room.roomNumber.toLowerCase().includes(term) ||
        (room.buildingName || '').toLowerCase().includes(term) ||
        (room.staffName || '').toLowerCase().includes(term) ||
        room.occupants.some((student) =>
          student.studentName?.toLowerCase().includes(term) ||
          student.admissionNumber?.toLowerCase().includes(term)
        )
      );
    });
  }, [rooms, buildingFilter, search]);

  // Paginated rooms
  const paginatedRooms = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredRooms.slice(start, end);
  }, [filteredRooms, page, pageSize]);

  const totalPages = Math.ceil(filteredRooms.length / pageSize);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [buildingFilter, search]);

  // Create pagination meta for DataTable (client-side pagination)
  const paginationMeta = useMemo(() => {
    if (filteredRooms.length === 0) return null;
    const totalPages = Math.ceil(filteredRooms.length / pageSize);
    return {
      current_page: page,
      from: (page - 1) * pageSize + 1,
      last_page: totalPages,
      per_page: pageSize,
      to: Math.min(page * pageSize, filteredRooms.length),
      total: filteredRooms.length,
    };
  }, [filteredRooms.length, page, pageSize]);

  // Define columns for DataTable
  const columns: ColumnDef<HostelRoom>[] = useMemo(() => [
    {
      accessorKey: 'roomNumber',
      header: t('hostel.room'),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.roomNumber}</span>
      ),
    },
    {
      accessorKey: 'buildingName',
      header: t('settings.building'),
      cell: ({ row }) => row.original.buildingName || t('hostel.unassigned'),
    },
    {
      accessorKey: 'staffName',
      header: t('settings.warden'),
      cell: ({ row }) => row.original.staffName || t('hostel.notAssigned'),
    },
    {
      accessorKey: 'occupants',
      header: t('hostel.occupancy'),
      cell: ({ row }) => {
        const count = row.original.occupants.length;
        return (
          <Badge variant={count > 0 ? 'default' : 'secondary'}>
            {count} {count === 1 ? t('hostel.student') : t('hostel.studentPlural')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'students',
      header: t('table.students'),
      cell: ({ row }) => {
        const occupants = row.original.occupants;
        if (occupants.length === 0) {
          return <span className="text-muted-foreground">{t('hostel.noStudentsAssigned')}</span>;
        }
        return (
          <div className="flex flex-wrap gap-2">
            {occupants.map((student) => (
              <Badge key={student.id} variant="outline">
                {student.studentName || t('hostel.student')}
              </Badge>
            ))}
          </div>
        );
      },
    },
  ], [t]);

  // Use DataTable hook for pagination integration
  const { table } = useDataTable({
    data: paginatedRooms,
    columns,
    pageCount: paginationMeta?.last_page,
    paginationMeta,
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

  const exportCsv = () => {
    const headers = [
      t('settings.roomNumber'),
      t('settings.building'),
      t('settings.warden'),
      t('hostel.occupancy'),
      t('table.students'),
    ];

    const rows = filteredRooms.map((room) => [
      room.roomNumber,
      room.buildingName || t('hostel.unassigned'),
      room.staffName || t('hostel.notAssigned'),
      room.occupants.length.toString(),
      room.occupants.map((student) => student.studentName || '').join(' | '),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hostel-occupancy-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BedDouble className="h-5 w-5" />
              Hostel Management
            </CardTitle>
            <CardDescription>Loading hostel occupancy and assignments...</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text="Loading hostel data..." />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('students.hostel') || 'Hostel Management'}
        description="Monitor hostel occupancy, room assignments, and warden coverage."
        icon={<BedDouble className="h-5 w-5" />}
        rightSlot={
          <Button onClick={exportCsv} variant="outline" size="sm" disabled={filteredRooms.length === 0} className="flex-shrink-0">
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">{t('hostel.exportOccupancyCsv')}</span>
          </Button>
        }
        showDescriptionOnMobile={false}
      />

      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rooms occupied</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.occupiedRooms}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalRooms} total rooms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students in hostel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalStudentsInRooms}</div>
            <p className="text-xs text-muted-foreground">
              {summary.unassignedBoarders} boarders waiting for rooms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buildings</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalBuildings}</div>
            <p className="text-xs text-muted-foreground">Across the hostel network</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warden coverage</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.uniqueWardens}</div>
            <p className="text-xs text-muted-foreground">Rooms with assigned wardens</p>
          </CardContent>
        </Card>
      </div>

      <FilterPanel 
        title={t('events.filters') || 'Search & Filter'}
        defaultOpenDesktop={true}
        defaultOpenMobile={false}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="w-full md:w-[200px]">
            <Label htmlFor="building-filter">Building</Label>
            <Select value={buildingFilter} onValueChange={setBuildingFilter}>
              <SelectTrigger id="building-filter">
                <SelectValue placeholder={t('hostel.filterByBuilding')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All buildings</SelectItem>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.buildingName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-0">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder={t('hostel.searchRoomsPlaceholder')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </FilterPanel>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Room occupancy</CardTitle>
              <CardDescription className="hidden md:block">Track students per room and warden assignments.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle px-4 md:px-0">
              <DataTable table={table} />
            </div>
          </div>

          <DataTablePagination
            table={table}
            paginationMeta={paginationMeta}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            showPageSizeSelector={true}
            showTotalCount={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default HostelManagement;
