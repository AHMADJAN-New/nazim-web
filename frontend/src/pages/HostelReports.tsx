import { useMemo, useState, useEffect } from 'react';
import { BarChart3, BedDouble, Building2, ShieldCheck, Users, Search, X, MapPin, UserCheck } from 'lucide-react';
import { useProfile } from '@/hooks/useProfiles';
import { useHostelOverview } from '@/hooks/useHostel';
import { useLanguage } from '@/hooks/useLanguage';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
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
  const { t } = useLanguage();
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

  // Pagination state for assigned boarders
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedPageSize, setAssignedPageSize] = useState(25);

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

  // Paginated assigned boarders
  const paginatedAssignedBoarders = useMemo(() => {
    const start = (assignedPage - 1) * assignedPageSize;
    const end = start + assignedPageSize;
    return filteredAssignedBoarders.slice(start, end);
  }, [filteredAssignedBoarders, assignedPage, assignedPageSize]);

  const assignedTotalPages = Math.ceil(filteredAssignedBoarders.length / assignedPageSize);

  // Reset pagination when filters change
  useEffect(() => {
    setAssignedPage(1);
  }, [assignedSearchQuery, selectedBuilding, selectedRoom]);

  // Pagination state for unassigned boarders
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedPageSize, setUnassignedPageSize] = useState(25);

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

  // Paginated unassigned boarders
  const paginatedUnassignedBoarders = useMemo(() => {
    const start = (unassignedPage - 1) * unassignedPageSize;
    const end = start + unassignedPageSize;
    return filteredUnassignedBoarders.slice(start, end);
  }, [filteredUnassignedBoarders, unassignedPage, unassignedPageSize]);

  const unassignedTotalPages = Math.ceil(filteredUnassignedBoarders.length / unassignedPageSize);

  // Reset pagination when filters change
  useEffect(() => {
    setUnassignedPage(1);
  }, [unassignedSearchQuery]);

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

  // Transform functions for report exports
  const transformBuildingReports = (data: BuildingReportRow[]) => {
    return data.map((row) => ({
      building_name: row.buildingName,
      total_rooms: row.totalRooms,
      occupied_rooms: row.occupiedRooms,
      boarders_assigned: row.boardersAssigned,
      wardens_covering: row.wardensCovering,
      utilization_rate: row.totalRooms > 0 ? ((row.occupiedRooms / row.totalRooms) * 100).toFixed(1) + '%' : '0%',
    }));
  };

  const transformWardenCoverage = (data: WardenCoverageRow[]) => {
    return data.map((row) => ({
      warden_name: row.wardenName,
      buildings: row.buildings,
      rooms: row.rooms,
      students: row.students,
    }));
  };

  const transformAssignedBoarders = (data: Array<HostelOccupant & { roomNumber: string; buildingName: string | null; roomId: string }>) => {
    return data.map((boarder) => ({
      student_name: boarder.studentName || '—',
      admission_number: boarder.admissionNumber || '—',
      building_name: boarder.buildingName || '—',
      room_number: boarder.roomNumber || '—',
      admission_year: boarder.admissionYear || '—',
    }));
  };

  const transformUnassignedBoarders = (data: HostelOccupant[]) => {
    return data.map((boarder) => ({
      student_name: boarder.studentName || '—',
      admission_number: boarder.admissionNumber || '—',
      class_name: boarder.className || '—',
      residency_type: boarder.residencyTypeName || 'Boarder',
    }));
  };

  // Build filters summary functions
  const buildBuildingFiltersSummary = () => {
    return `Total buildings: ${buildingReports.length}`;
  };

  const buildWardenFiltersSummary = () => {
    return `Total wardens: ${wardenCoverage.length}`;
  };

  const buildAssignedBoardersFiltersSummary = () => {
    const parts: string[] = [];
    if (assignedSearchQuery) parts.push(`Search: "${assignedSearchQuery}"`);
    if (selectedBuilding !== 'all') {
      const building = buildingsForFilter.find(b => b.id === selectedBuilding);
      if (building) parts.push(`Building: ${building.buildingName}`);
    }
    if (selectedRoom !== 'all') {
      const room = roomsForFilter.find(r => r.id === selectedRoom);
      if (room) parts.push(`Room: ${room.roomNumber}`);
    }
    return parts.length > 0 ? parts.join(' • ') : `Total assigned boarders: ${filteredAssignedBoarders.length}`;
  };

  const buildUnassignedBoardersFiltersSummary = () => {
    if (unassignedSearchQuery) {
      return `Search: "${unassignedSearchQuery}" • Total: ${filteredUnassignedBoarders.length}`;
    }
    return `Total unassigned boarders: ${filteredUnassignedBoarders.length}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('hostel.reports.hostelReporting') || 'Hostel reporting'}
            </CardTitle>
            <CardDescription>{t('hostel.reports.preparingReportData') || 'Preparing hostel reporting data...'}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text={t('hostel.reports.loadingHostelReports') || 'Loading hostel reports...'} />
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
            {t('hostel.reports.hostelReporting') || 'Hostel reporting'}
          </h1>
          <p className="text-muted-foreground">
            {t('hostel.reports.monitorUtilization') || 'Monitor hostel utilization by building, warden coverage, and unassigned boarders.'}
          </p>
        </div>
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
                <CardTitle>{t('hostel.reports.buildingUtilization') || 'Building utilization'}</CardTitle>
                <CardDescription>{t('hostel.reports.buildingUtilizationDescription') || 'Rooms, occupancy, and warden coverage by building.'}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{buildingReports.length} buildings</Badge>
                <ReportExportButtons
                  data={buildingReports}
                  columns={[
                    { key: 'building_name', label: t('hostel.reports.buildingColumn') || t('settings.buildings.buildingName') || 'Building', align: 'left' },
                    { key: 'total_rooms', label: t('hostel.reports.roomsColumn') || t('hostel.reports.rooms') || 'Rooms', align: 'left' },
                    { key: 'occupied_rooms', label: t('hostel.reports.occupiedColumn') || t('hostel.reports.occupiedRooms') || 'Occupied Rooms', align: 'left' },
                    { key: 'boarders_assigned', label: t('hostel.reports.boardersColumn') || t('hostel.reports.boardersAssigned') || 'Boarders Assigned', align: 'left' },
                    { key: 'wardens_covering', label: t('hostel.reports.roomsWithWardens') || 'Rooms With Wardens', align: 'left' },
                    { key: 'utilization_rate', label: t('hostel.reports.utilizationColumn') || 'Utilization Rate', align: 'left' },
                  ]}
                  reportKey="hostel_building_utilization"
                  title={t('hostel.reports.buildingUtilization') || 'Building Utilization Report'}
                  transformData={transformBuildingReports}
                  buildFiltersSummary={buildBuildingFiltersSummary}
                  templateType="hostel_building_utilization"
                  disabled={isLoading || buildingReports.length === 0}
                  buttonSize="sm"
                  buttonVariant="outline"
                />
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
                <CardTitle>{t('hostel.reports.wardenCoverage') || 'Warden coverage'}</CardTitle>
                <CardDescription>{t('hostel.reports.wardenCoverageDescription') || 'Room assignments and student counts per warden.'}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{wardenCoverage.length} wardens</Badge>
                <ReportExportButtons
                  data={wardenCoverage}
                  columns={[
                    { key: 'warden_name', label: t('hostel.reports.wardenName') || t('hostel.warden') || 'Warden', align: 'left' },
                    { key: 'buildings', label: t('hostel.reports.buildingsColumn') || t('hostel.reports.buildings') || 'Buildings', align: 'left' },
                    { key: 'rooms', label: t('hostel.reports.roomsColumn') || t('hostel.reports.rooms') || 'Rooms', align: 'left' },
                    { key: 'students', label: t('hostel.reports.studentsLabel') || t('hostel.reports.students') || 'Boarders', align: 'left' },
                  ]}
                  reportKey="hostel_warden_coverage"
                  title={t('hostel.reports.wardenCoverage') || 'Warden Coverage Report'}
                  transformData={transformWardenCoverage}
                  buildFiltersSummary={buildWardenFiltersSummary}
                  templateType="hostel_warden_coverage"
                  disabled={isLoading || wardenCoverage.length === 0}
                  buttonSize="sm"
                  buttonVariant="outline"
                />
              </div>
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
              <CardTitle>{t('hostel.reports.roomAndBuildingsTitle') || 'Room & Buildings Report'}</CardTitle>
              <CardDescription>{t('hostel.reports.roomAndBuildingsDescription') || 'All students assigned to rooms, organized by building and room.'}</CardDescription>
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
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t('hostel.reports.assignedBoarders') || 'Assigned Boarders'}</CardTitle>
                <CardDescription>{t('hostel.reports.assignedBoardersDescription') || 'All students currently assigned to rooms. Search and filter by building or room.'}</CardDescription>
              </div>
              <ReportExportButtons
                data={filteredAssignedBoarders}
                columns={[
                  { key: 'student_name', label: t('hostel.reports.student') || 'Student', align: 'left' },
                  { key: 'admission_number', label: t('hostel.reports.admissionNumberColumn') || 'Admission #', align: 'left' },
                  { key: 'building_name', label: t('hostel.reports.buildingColumn') || t('settings.buildings.buildingName') || 'Building', align: 'left' },
                  { key: 'room_number', label: t('hostel.reports.roomLabel') || t('settings.rooms.roomNumber') || 'Room', align: 'left' },
                  { key: 'admission_year', label: t('hostel.reports.admissionYearColumn') || 'Admission Year', align: 'left' },
                ]}
                reportKey="hostel_assigned_boarders"
                title={t('hostel.reports.assignedBoardersTitle') || t('hostel.reports.assignedBoarders') || 'Assigned Boarders Report'}
                transformData={transformAssignedBoarders}
                buildFiltersSummary={buildAssignedBoardersFiltersSummary}
                templateType="hostel_assigned_boarders"
                disabled={isLoading || filteredAssignedBoarders.length === 0}
                buttonSize="sm"
                buttonVariant="outline"
              />
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
                      paginatedAssignedBoarders.map((boarder) => (
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
              {filteredAssignedBoarders.length > 0 && assignedTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(assignedPage - 1) * assignedPageSize + 1} to {Math.min(assignedPage * assignedPageSize, filteredAssignedBoarders.length)} of {filteredAssignedBoarders.length} boarders
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={assignedPageSize.toString()} onValueChange={(value) => setAssignedPageSize(Number(value))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="25">25 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                      </SelectContent>
                    </Select>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setAssignedPage(Math.max(1, assignedPage - 1))}
                            className={assignedPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, assignedTotalPages) }, (_, i) => {
                          let pageNum: number;
                          if (assignedTotalPages <= 5) {
                            pageNum = i + 1;
                          } else if (assignedPage <= 3) {
                            pageNum = i + 1;
                          } else if (assignedPage >= assignedTotalPages - 2) {
                            pageNum = assignedTotalPages - 4 + i;
                          } else {
                            pageNum = assignedPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setAssignedPage(pageNum)}
                                isActive={assignedPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setAssignedPage(Math.min(assignedTotalPages, assignedPage + 1))}
                            className={assignedPage === assignedTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unassigned Boarders Tab */}
        <TabsContent value="unassigned-boarders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t('hostel.reports.unassignedBoarders') || 'Unassigned Boarders'}</CardTitle>
                <CardDescription>{t('hostel.reports.unassignedBoardersDescription') || 'Students marked as boarders who still need a room assignment.'}</CardDescription>
              </div>
              <ReportExportButtons
                data={filteredUnassignedBoarders}
                columns={[
                  { key: 'student_name', label: t('hostel.reports.student') || 'Student', align: 'left' },
                  { key: 'admission_number', label: t('hostel.reports.admissionNumberColumn') || 'Admission #', align: 'left' },
                  { key: 'class_name', label: t('hostel.reports.classColumn') || 'Class', align: 'left' },
                  { key: 'residency_type', label: t('hostel.reports.residencyTypeColumn') || 'Residency Type', align: 'left' },
                ]}
                reportKey="hostel_unassigned_boarders"
                title={t('hostel.reports.unassignedBoardersTitle') || t('hostel.reports.unassignedBoarders') || 'Unassigned Boarders Report'}
                transformData={transformUnassignedBoarders}
                buildFiltersSummary={buildUnassignedBoardersFiltersSummary}
                templateType="hostel_unassigned_boarders"
                disabled={isLoading || filteredUnassignedBoarders.length === 0}
                buttonSize="sm"
                buttonVariant="outline"
              />
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
                      paginatedUnassignedBoarders.map((admission) => (
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
              {filteredUnassignedBoarders.length > 0 && unassignedTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(unassignedPage - 1) * unassignedPageSize + 1} to {Math.min(unassignedPage * unassignedPageSize, filteredUnassignedBoarders.length)} of {filteredUnassignedBoarders.length} boarders
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={unassignedPageSize.toString()} onValueChange={(value) => setUnassignedPageSize(Number(value))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 per page</SelectItem>
                        <SelectItem value="25">25 per page</SelectItem>
                        <SelectItem value="50">50 per page</SelectItem>
                        <SelectItem value="100">100 per page</SelectItem>
                      </SelectContent>
                    </Select>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setUnassignedPage(Math.max(1, unassignedPage - 1))}
                            className={unassignedPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.min(5, unassignedTotalPages) }, (_, i) => {
                          let pageNum: number;
                          if (unassignedTotalPages <= 5) {
                            pageNum = i + 1;
                          } else if (unassignedPage <= 3) {
                            pageNum = i + 1;
                          } else if (unassignedPage >= unassignedTotalPages - 2) {
                            pageNum = unassignedTotalPages - 4 + i;
                          } else {
                            pageNum = unassignedPage - 2 + i;
                          }
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setUnassignedPage(pageNum)}
                                isActive={unassignedPage === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setUnassignedPage(Math.min(unassignedTotalPages, unassignedPage + 1))}
                            className={unassignedPage === unassignedTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HostelReports;
