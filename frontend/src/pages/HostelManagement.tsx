import { useMemo, useState } from 'react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import type { HostelRoom, HostelSummary } from '@/types/domain/hostel';

export function HostelManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const orgId = profile?.organization_id;

  const { data: hostelOverview, isLoading } = useHostelOverview(orgId);

  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

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
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Warden</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No rooms match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.roomNumber}</TableCell>
                      <TableCell>{room.buildingName || 'Unassigned'}</TableCell>
                      <TableCell>{room.staffName || 'Not assigned'}</TableCell>
                      <TableCell>
                        <Badge variant={room.occupants.length > 0 ? 'default' : 'secondary'}>
                          {room.occupants.length} student{room.occupants.length === 1 ? '' : 's'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {room.occupants.length === 0 ? (
                          <span className="text-muted-foreground">No students assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {room.occupants.map((student) => (
                              <Badge key={student.id} variant="outline">
                                {student.studentName || 'Student'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default HostelManagement;
