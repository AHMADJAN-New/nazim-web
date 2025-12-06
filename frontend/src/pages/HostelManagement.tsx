import { useMemo, useState, useEffect } from 'react';
import { BedDouble, Building2, FileDown, ShieldCheck, Users } from 'lucide-react';
import { useProfile } from '@/hooks/useProfiles';
import { useHostelOverview } from '@/hooks/useHostel';
import { useLanguage } from '@/hooks/useLanguage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table/data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { LoadingSpinner } from '@/components/ui/loading';
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
      header: 'Room',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.roomNumber}</span>
      ),
    },
    {
      accessorKey: 'buildingName',
      header: 'Building',
      cell: ({ row }) => row.original.buildingName || 'Unassigned',
    },
    {
      accessorKey: 'staffName',
      header: 'Warden',
      cell: ({ row }) => row.original.staffName || 'Not assigned',
    },
    {
      accessorKey: 'occupants',
      header: 'Occupancy',
      cell: ({ row }) => {
        const count = row.original.occupants.length;
        return (
          <Badge variant={count > 0 ? 'default' : 'secondary'}>
            {count} student{count === 1 ? '' : 's'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'students',
      header: 'Students',
      cell: ({ row }) => {
        const occupants = row.original.occupants;
        if (occupants.length === 0) {
          return <span className="text-muted-foreground">No students assigned</span>;
        }
        return (
          <div className="flex flex-wrap gap-2">
            {occupants.map((student) => (
              <Badge key={student.id} variant="outline">
                {student.studentName || 'Student'}
              </Badge>
            ))}
          </div>
        );
      },
    },
  ], []);

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
      'Room Number',
      'Building',
      'Warden',
      'Occupancy',
      'Students',
    ];

    const rows = filteredRooms.map((room) => [
      room.roomNumber,
      room.buildingName || 'Unassigned',
      room.staffName || 'Not assigned',
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
      <div className="container mx-auto p-6">
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BedDouble className="h-6 w-6" />
            {t('nav.hostel')}
          </h1>
          <p className="text-muted-foreground">
            Monitor hostel occupancy, room assignments, and warden coverage.
          </p>
        </div>
        <Button onClick={exportCsv} variant="outline" disabled={filteredRooms.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />
          Export occupancy CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Room occupancy</CardTitle>
              <CardDescription>Track students per room and warden assignments.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by building" />
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
              <Input
                placeholder="Search rooms, wardens, or students"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable table={table} />

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
