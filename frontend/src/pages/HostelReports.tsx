import { useMemo } from 'react';
import { BarChart3, BedDouble, Building2, FileDown, ShieldCheck, Users } from 'lucide-react';
import { useProfile } from '@/hooks/useProfiles';
import { useHostelOverview } from '@/hooks/useHostel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import type { HostelRoom } from '@/types/domain/hostel';

interface BuildingReportRow {
  buildingId: string;
  buildingName: string;
  totalRooms: number;
  occupiedRooms: number;
  boardersAssigned: number;
  wardensCovering: number;
}

interface WardenCoverageRow {
  wardenName: string;
  buildings: number;
  rooms: number;
  students: number;
}

export function HostelReports() {
  const { data: profile } = useProfile();
  const orgId = profile?.organization_id;

  const { data: hostelOverview, isLoading } = useHostelOverview(orgId);
  const unassignedBoarders = hostelOverview?.unassignedBoarders ?? [];

  const buildingReports: BuildingReportRow[] =
    hostelOverview?.buildings
      .map((building) => ({
        buildingId: building.id,
        buildingName: building.buildingName,
        totalRooms: building.roomCount,
        occupiedRooms: building.occupiedRooms,
        boardersAssigned: building.studentsInRooms,
        wardensCovering: building.wardensAssigned,
      }))
      .sort((a, b) => b.boardersAssigned - a.boardersAssigned) || [];

  const wardenCoverage: WardenCoverageRow[] = useMemo(() => {
    if (!hostelOverview) return [];

    const map = new Map<string, { buildings: Set<string>; rooms: number; students: number }>();

    hostelOverview.rooms.forEach((room: HostelRoom) => {
      const staffName = room.staffName || 'Not assigned';

      if (!map.has(staffName)) {
        map.set(staffName, { buildings: new Set<string>(), rooms: 0, students: 0 });
      }

      const entry = map.get(staffName)!;
      entry.rooms += 1;
      if (room.buildingId) {
        entry.buildings.add(room.buildingId);
      }
      entry.students += room.occupants.length;
    });

    return Array.from(map.entries())
      .map(([wardenName, info]) => ({
        wardenName,
        buildings: info.buildings.size,
        rooms: info.rooms,
        students: info.students,
      }))
      .sort((a, b) => b.students - a.students);
  }, [hostelOverview]);

  const totals = useMemo(
    () => ({
      roomsCount: hostelOverview?.summary.totalRooms || 0,
      boarders:
        (hostelOverview?.summary.totalStudentsInRooms || 0) +
        (hostelOverview?.summary.unassignedBoarders || 0),
      assignedBoarders: hostelOverview?.summary.totalStudentsInRooms || 0,
      buildings: hostelOverview?.summary.totalBuildings || 0,
      wardens: new Set(wardenCoverage.map((warden) => warden.wardenName)).size,
      unassignedBoarders: hostelOverview?.summary.unassignedBoarders || 0,
    }),
    [hostelOverview, wardenCoverage]
  );

  const exportBuildingCsv = () => {
    const headers = ['Building', 'Rooms', 'Occupied Rooms', 'Boarders Assigned', 'Rooms With Wardens'];
    const rows = buildingReports.map((row) => [
      row.buildingName,
      row.totalRooms.toString(),
      row.occupiedRooms.toString(),
      row.boardersAssigned.toString(),
      row.wardensCovering.toString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hostel-building-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Hostel reporting
            </CardTitle>
            <CardDescription>Preparing hostel reporting data...</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text="Loading hostel reports..." />
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
            <BarChart3 className="h-6 w-6" />
            Hostel reporting
          </h1>
          <p className="text-muted-foreground">
            Monitor hostel utilization by building, warden coverage, and unassigned boarders.
          </p>
        </div>
        <Button variant="outline" onClick={exportBuildingCsv} disabled={buildingReports.length === 0}>
          <FileDown className="h-4 w-4 mr-2" />
          Export building report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Boarders</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.boarders}</div>
            <p className="text-xs text-muted-foreground">{totals.assignedBoarders} assigned to rooms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned boarders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.unassignedBoarders}</div>
            <p className="text-xs text-muted-foreground">Waiting for room placement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buildings tracked</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.buildings}</div>
            <p className="text-xs text-muted-foreground">Across {totals.roomsCount} rooms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wardens with assignments</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.wardens}</div>
            <p className="text-xs text-muted-foreground">Rooms currently supervised</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Building utilization</CardTitle>
            <CardDescription>Rooms, occupancy, and warden coverage by building.</CardDescription>
          </div>
          <Badge variant="outline">{buildingReports.length} buildings</Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Building</TableHead>
                  <TableHead>Rooms</TableHead>
                  <TableHead>Occupied</TableHead>
                  <TableHead>Boarders</TableHead>
                  <TableHead>Rooms with wardens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buildingReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No building data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  buildingReports.map((row) => (
                    <TableRow key={row.buildingId}>
                      <TableCell className="font-medium">{row.buildingName}</TableCell>
                      <TableCell>{row.totalRooms}</TableCell>
                      <TableCell>
                        <Badge variant={row.occupiedRooms > 0 ? 'default' : 'secondary'}>
                          {row.occupiedRooms} of {row.totalRooms}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.boardersAssigned}</TableCell>
                      <TableCell>{row.wardensCovering}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Warden coverage</CardTitle>
            <CardDescription>Room assignments and student counts per warden.</CardDescription>
          </div>
          <Badge variant="outline">{wardenCoverage.length} wardens</Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Warden</TableHead>
                  <TableHead>Buildings</TableHead>
                  <TableHead>Rooms</TableHead>
                  <TableHead>Boarders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wardenCoverage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No wardens assigned to rooms yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  wardenCoverage.map((warden) => (
                    <TableRow key={warden.wardenName}>
                      <TableCell className="font-medium">{warden.wardenName}</TableCell>
                      <TableCell>{warden.buildings}</TableCell>
                      <TableCell>{warden.rooms}</TableCell>
                      <TableCell>{warden.students}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unassigned boarders</CardTitle>
          <CardDescription>Students marked as boarders who still need a room.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Admission #</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Residency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedBoarders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      All boarders have been placed in rooms.
                    </TableCell>
                  </TableRow>
                ) : (
                  unassignedBoarders.map((admission) => (
                    <TableRow key={admission.id}>
                      <TableCell className="font-medium">{admission.studentName || 'Student'}</TableCell>
                      <TableCell>{admission.admissionNumber || '—'}</TableCell>
                      <TableCell>{admission.className || '—'}</TableCell>
                      <TableCell>{admission.residencyTypeName || 'Boarder'}</TableCell>
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

export default HostelReports;
