import { useMemo, useState } from 'react';
import { BarChart3, BedDouble, Building2, FileDown, ShieldCheck, Users, Search, X, MapPin, UserCheck } from 'lucide-react';
import { useProfile } from '@/hooks/useProfiles';
import { useHostelOverview } from '@/hooks/useHostel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import type { HostelRoom, HostelOccupant } from '@/types/domain/hostel';

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
  
  // Search and filter states
  const [assignedSearchQuery, setAssignedSearchQuery] = useState('');
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');

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

  // Get all assigned boarders from rooms
  const allAssignedBoarders = useMemo(() => {
    if (!hostelOverview) return [];
    const boarders: Array<HostelOccupant & { roomNumber: string; buildingName: string | null; roomId: string }> = [];
    hostelOverview.rooms.forEach((room) => {
      room.occupants.forEach((occupant) => {
        boarders.push({
          ...occupant,
          roomNumber: room.roomNumber,
          buildingName: room.buildingName,
          roomId: room.id,
        });
      });
    });
    return boarders;
  }, [hostelOverview]);

  // Filter assigned boarders
  const filteredAssignedBoarders = useMemo(() => {
    let filtered = allAssignedBoarders;

    // Search filter
    if (assignedSearchQuery) {
      const query = assignedSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (boarder) =>
          boarder.studentName?.toLowerCase().includes(query) ||
          boarder.admissionNumber?.toLowerCase().includes(query) ||
          boarder.roomNumber?.toLowerCase().includes(query) ||
          boarder.buildingName?.toLowerCase().includes(query)
      );
    }

    // Building filter
    if (selectedBuilding !== 'all') {
      filtered = filtered.filter((boarder) => {
        const room = hostelOverview?.rooms.find((r) => r.id === boarder.roomId);
        return room?.buildingId === selectedBuilding;
      });
    }

    // Room filter
    if (selectedRoom !== 'all') {
      filtered = filtered.filter((boarder) => boarder.roomId === selectedRoom);
    }

    return filtered;
  }, [allAssignedBoarders, assignedSearchQuery, selectedBuilding, selectedRoom, hostelOverview]);

  // Filter unassigned boarders
  const filteredUnassignedBoarders = useMemo(() => {
    if (!unassignedSearchQuery) return unassignedBoarders;
    const query = unassignedSearchQuery.toLowerCase();
    return unassignedBoarders.filter(
      (boarder) =>
        boarder.studentName?.toLowerCase().includes(query) ||
        boarder.admissionNumber?.toLowerCase().includes(query) ||
        boarder.className?.toLowerCase().includes(query)
    );
  }, [unassignedBoarders, unassignedSearchQuery]);

  // Get rooms and buildings for filters
  const buildingsForFilter = useMemo(() => {
    return hostelOverview?.buildings || [];
  }, [hostelOverview]);

  const roomsForFilter = useMemo(() => {
    if (!hostelOverview) return [];
    if (selectedBuilding === 'all') {
      return hostelOverview.rooms;
    }
    return hostelOverview.rooms.filter((room) => room.buildingId === selectedBuilding);
  }, [hostelOverview, selectedBuilding]);

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

      {/* Tabs for different report sections */}
      <Tabs defaultValue="building-utilization" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="building-utilization" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Building Utilization
          </TabsTrigger>
          <TabsTrigger value="warden-coverage" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Warden Coverage
          </TabsTrigger>
          <TabsTrigger value="room-buildings" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Room & Buildings
          </TabsTrigger>
          <TabsTrigger value="assigned-boarders" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Assigned Boarders
            {allAssignedBoarders.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {allAssignedBoarders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unassigned-boarders" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Unassigned
            {totals.unassignedBoarders > 0 && (
              <Badge variant="destructive" className="ml-1">
                {totals.unassignedBoarders}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Building Utilization Tab */}
        <TabsContent value="building-utilization" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Building utilization</CardTitle>
                <CardDescription>Rooms, occupancy, and warden coverage by building.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{buildingReports.length} buildings</Badge>
                <Button variant="outline" size="sm" onClick={exportBuildingCsv} disabled={buildingReports.length === 0}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
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
                      <TableHead>Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buildingReports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No building data available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      buildingReports.map((row) => {
                        const utilizationRate = row.totalRooms > 0 ? (row.occupiedRooms / row.totalRooms) * 100 : 0;
                        return (
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
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-2">
                                  <div
                                    className="bg-primary h-2 rounded-full"
                                    style={{ width: `${utilizationRate}%` }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground w-12 text-right">
                                  {utilizationRate.toFixed(0)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warden Coverage Tab */}
        <TabsContent value="warden-coverage" className="space-y-4">
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
                      <TableHead>Coverage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {wardenCoverage.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                          <TableCell>
                            <Badge variant={warden.students > 0 ? 'default' : 'secondary'}>
                              {warden.students} students
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Room & Buildings Report Tab */}
        <TabsContent value="room-buildings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Room & Buildings Report</CardTitle>
              <CardDescription>All students assigned to rooms, organized by building and room.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {buildingsForFilter.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No buildings available.</p>
                ) : (
                  buildingsForFilter.map((building) => {
                    const buildingRooms = hostelOverview?.rooms.filter((r) => r.buildingId === building.id) || [];
                    const totalStudentsInBuilding = buildingRooms.reduce((sum, room) => sum + room.occupants.length, 0);

                    if (buildingRooms.length === 0) return null;

                    return (
                      <div key={building.id} className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                          <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              <Building2 className="h-5 w-5" />
                              {building.buildingName}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {buildingRooms.length} rooms • {totalStudentsInBuilding} boarders
                            </p>
                          </div>
                          <Badge variant="outline">
                            {building.occupiedRooms}/{building.roomCount} occupied
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {buildingRooms.map((room) => (
                            <Card key={room.id} className="border-l-4 border-l-primary">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base">Room {room.roomNumber}</CardTitle>
                                    {room.staffName && (
                                      <Badge variant="secondary" className="text-xs">
                                        Warden: {room.staffName}
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge variant={room.occupants.length > 0 ? 'default' : 'secondary'}>
                                    {room.occupants.length} boarders
                                  </Badge>
                                </div>
                              </CardHeader>
                              {room.occupants.length > 0 && (
                                <CardContent>
                                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                    {room.occupants.map((occupant) => (
                                      <div
                                        key={occupant.id}
                                        className="flex items-center gap-2 p-2 rounded-md border bg-card"
                                      >
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{occupant.studentName || 'Student'}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {occupant.admissionNumber || '—'}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              )}
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assigned Boarders Tab */}
        <TabsContent value="assigned-boarders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Boarders</CardTitle>
              <CardDescription>All students currently assigned to rooms. Search and filter by building or room.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, admission number, room, or building..."
                    value={assignedSearchQuery}
                    onChange={(e) => setAssignedSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  {assignedSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setAssignedSearchQuery('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select value={selectedBuilding} onValueChange={(value) => {
                  setSelectedBuilding(value);
                  setSelectedRoom('all'); // Reset room when building changes
                }}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="All buildings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All buildings</SelectItem>
                    {buildingsForFilter.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.buildingName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="All rooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rooms</SelectItem>
                    {roomsForFilter.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.roomNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission #</TableHead>
                      <TableHead>Building</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Admission Year</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignedBoarders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {allAssignedBoarders.length === 0
                            ? 'No boarders assigned to rooms yet.'
                            : 'No boarders found matching your search criteria.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAssignedBoarders.map((boarder) => (
                        <TableRow key={boarder.id}>
                          <TableCell className="font-medium">{boarder.studentName || 'Student'}</TableCell>
                          <TableCell>{boarder.admissionNumber || '—'}</TableCell>
                          <TableCell>{boarder.buildingName || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Room {boarder.roomNumber}</Badge>
                          </TableCell>
                          <TableCell>{boarder.admissionYear || '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unassigned Boarders Tab */}
        <TabsContent value="unassigned-boarders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Unassigned Boarders</CardTitle>
              <CardDescription>Students marked as boarders who still need a room assignment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, admission number, or class..."
                  value={unassignedSearchQuery}
                  onChange={(e) => setUnassignedSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {unassignedSearchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setUnassignedSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission #</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Residency Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnassignedBoarders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {unassignedBoarders.length === 0
                            ? 'All boarders have been placed in rooms.'
                            : 'No boarders found matching your search criteria.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUnassignedBoarders.map((admission) => (
                        <TableRow key={admission.id}>
                          <TableCell className="font-medium">{admission.studentName || 'Student'}</TableCell>
                          <TableCell>{admission.admissionNumber || '—'}</TableCell>
                          <TableCell>{admission.className || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{admission.residencyTypeName || 'Boarder'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HostelReports;
