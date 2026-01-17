import { BarChart3, BedDouble, Building2, ShieldCheck, Users, Search, X, MapPin, UserCheck } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import type { HostelRoom, HostelOccupant } from '@/types/domain/hostel';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useHostelOverview } from '@/hooks/useHostel';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';

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
      const staffName = room.staffName || t('hostel.notAssigned');

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
      <div className="container mx-auto p-4 md:p-6">
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
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('hostel.reports.hostelReporting') || 'Hostel reporting'}
        description={t('hostel.reports.monitorUtilization') || 'Monitor hostel utilization by building, warden coverage, and unassigned boarders.'}
        icon={<BarChart3 className="h-5 w-5" />}
        showDescriptionOnMobile={false}
      />

      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('hostel.reports.boardersCardTitle')}
          value={totals.boarders}
          icon={BedDouble}
          description={`${totals.assignedBoarders} ${t('hostel.reports.assignedToRooms')}`}
          color="blue"
        />
        <StatsCard
          title={t('hostel.reports.unassignedBoardersCardTitle')}
          value={totals.unassignedBoarders}
          icon={Users}
          description={t('hostel.reports.waitingForRoomPlacement')}
          color="amber"
        />
        <StatsCard
          title={t('hostel.reports.buildingsTracked')}
          value={totals.buildings}
          icon={Building2}
          description={t('hostel.reports.acrossRooms').replace('{count}', totals.roomsCount.toString())}
          color="purple"
        />
        <StatsCard
          title={t('hostel.reports.wardensWithAssignments')}
          value={totals.wardens}
          icon={ShieldCheck}
          description={t('hostel.reports.roomsCurrentlySupervised')}
          color="green"
        />
      </div>

      {/* Tabs for different report sections */}
      <Tabs defaultValue="building-utilization" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1">
          <TabsTrigger value="building-utilization" className="flex items-center gap-1 sm:gap-2">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">{t('hostel.reports.buildingsTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="warden-coverage" className="flex items-center gap-1 sm:gap-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">{t('hostel.reports.wardensTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="room-buildings" className="flex items-center gap-1 sm:gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">{t('hostel.reports.roomsTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="assigned-boarders" className="flex items-center gap-1 sm:gap-2">
            <UserCheck className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">{t('hostel.reports.assignedTab')}</span>
            {allAssignedBoarders.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs flex-shrink-0">
                {allAssignedBoarders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unassigned-boarders" className="flex items-center gap-1 sm:gap-2">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs sm:text-sm">{t('hostel.reports.unassignedTab')}</span>
            {totals.unassignedBoarders > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs flex-shrink-0">
                {totals.unassignedBoarders}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Building Utilization Tab */}
        <TabsContent value="building-utilization" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t('hostel.reports.buildingUtilization') || 'Building utilization'}</CardTitle>
                <CardDescription className="hidden md:block">{t('hostel.reports.buildingUtilizationDescription') || 'Rooms, occupancy, and warden coverage by building.'}</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="hidden sm:inline-flex">{t('hostel.reports.buildingsCount').replace('{count}', buildingReports.length.toString())}</Badge>
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
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <div className="inline-block min-w-full align-middle px-4 md:px-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('hostel.reports.buildingHeader')}</TableHead>
                          <TableHead>{t('hostel.reports.roomsHeader')}</TableHead>
                          <TableHead>{t('hostel.reports.occupiedHeader')}</TableHead>
                          <TableHead>{t('hostel.reports.boardersHeader')}</TableHead>
                          <TableHead>{t('hostel.reports.roomsWithWardensHeader')}</TableHead>
                          <TableHead>{t('hostel.reports.utilizationHeader')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {buildingReports.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              {t('hostel.reports.noBuildingDataAvailable')}
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
                                    {t('hostel.reports.occupiedOfTotal').replace('{occupied}', row.occupiedRooms.toString()).replace('{total}', row.totalRooms.toString())}
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
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Warden Coverage Tab */}
        <TabsContent value="warden-coverage" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t('hostel.reports.wardenCoverage') || 'Warden coverage'}</CardTitle>
                <CardDescription className="hidden md:block">{t('hostel.reports.wardenCoverageDescription') || 'Room assignments and student counts per warden.'}</CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="hidden sm:inline-flex">{t('hostel.reports.wardensCount').replace('{count}', wardenCoverage.length.toString())}</Badge>
                <ReportExportButtons
                  data={wardenCoverage}
                  columns={[
                    { key: 'warden_name', label: t('hostel.reports.wardenName') || t('settings.warden') || 'Warden', align: 'left' },
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
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <div className="inline-block min-w-full align-middle px-4 md:px-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('hostel.reports.wardenHeader')}</TableHead>
                          <TableHead>{t('hostel.reports.buildingsHeader')}</TableHead>
                          <TableHead>{t('hostel.reports.roomsHeader')}</TableHead>
                          <TableHead>{t('hostel.reports.boardersHeader')}</TableHead>
                          <TableHead>{t('hostel.reports.coverageHeader')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wardenCoverage.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              {t('hostel.reports.noWardensAssigned')}
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
                                  {t('hostel.reports.studentsCount').replace('{count}', warden.students.toString())}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
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
                  <p className="text-center text-muted-foreground py-8">{t('hostel.reports.noBuildingsAvailable')}</p>
                ) : (
                  buildingsForFilter.map((building) => {
                    const buildingRooms = hostelOverview?.rooms.filter((r) => r.buildingId === building.id) || [];
                    const totalStudentsInBuilding = buildingRooms.reduce((sum, room) => sum + room.occupants.length, 0);

                    if (buildingRooms.length === 0) return null;

                    return (
                      <div key={building.id} className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
                          <div>
                            <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                              <span className="truncate">{building.buildingName}</span>
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {t('hostel.reports.roomsAndBoarders').replace('{rooms}', buildingRooms.length.toString()).replace('{boarders}', totalStudentsInBuilding.toString())}
                            </p>
                          </div>
                          <Badge variant="outline" className="self-start sm:self-auto">
                            {t('hostel.reports.occupiedCount').replace('{occupied}', building.occupiedRooms.toString()).replace('{total}', building.roomCount.toString())}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {buildingRooms.map((room) => (
                            <Card key={room.id} className="border-l-4 border-l-primary">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base">{t('hostel.reports.roomNumber').replace('{number}', room.roomNumber)}</CardTitle>
                                    {room.staffName && (
                                      <Badge variant="secondary" className="text-xs">
                                        {t('hostel.reports.wardenLabel').replace('{name}', room.staffName)}
                                      </Badge>
                                    )}
                                  </div>
                                  <Badge variant={room.occupants.length > 0 ? 'default' : 'secondary'}>
                                    {t('hostel.reports.boardersCount').replace('{count}', room.occupants.length.toString())}
                                  </Badge>
                                </div>
                              </CardHeader>
                              {room.occupants.length > 0 && (
                                <CardContent>
                                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                    {room.occupants.map((occupant) => (
                                      <div
                                        key={occupant.id}
                                        className="flex items-center gap-2 p-2 rounded-md border bg-card"
                                      >
                                        <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">{occupant.studentName || t('hostel.reports.student')}</p>
                                          <p className="text-xs text-muted-foreground truncate">
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
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t('hostel.reports.assignedBoarders') || 'Assigned Boarders'}</CardTitle>
                <CardDescription className="hidden md:block">{t('hostel.reports.assignedBoardersDescription') || 'All students currently assigned to rooms. Search and filter by building or room.'}</CardDescription>
              </div>
              <div className="flex-shrink-0">
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterPanel 
                title={t('events.filters') || 'Search & Filter'}
                defaultOpenDesktop={true}
                defaultOpenMobile={false}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="assigned-search">{t('events.search')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="assigned-search"
                        placeholder={t('hostel.reports.searchPlaceholder')}
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
                  </div>
                  <div className="w-full md:w-[200px]">
                    <Label htmlFor="building-filter">{t('hostel.building')}</Label>
                    <Select value={selectedBuilding} onValueChange={(value) => {
                      setSelectedBuilding(value);
                      setSelectedRoom('all'); // Reset room when building changes
                    }}>
                      <SelectTrigger id="building-filter">
                        <SelectValue placeholder={t('hostel.reports.allBuildings')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allBuildings')}</SelectItem>
                        {buildingsForFilter.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.buildingName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-[200px]">
                    <Label htmlFor="room-filter">{t('hostel.room')}</Label>
                    <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                      <SelectTrigger id="room-filter">
                        <SelectValue placeholder={t('hostel.reports.allRooms')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allRooms')}</SelectItem>
                        {roomsForFilter.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {t('hostel.reports.roomNumber').replace('{number}', room.roomNumber)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FilterPanel>

              <div className="overflow-x-auto -mx-4 md:mx-0">
                <div className="inline-block min-w-full align-middle px-4 md:px-0">
                  <div className="rounded-md border">
                    <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('hostel.reports.studentHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.admissionNumberHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.buildingHeaderAssigned')}</TableHead>
                      <TableHead>{t('hostel.reports.roomHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.admissionYearHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignedBoarders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          {allAssignedBoarders.length === 0
                            ? t('hostel.reports.noBoardersAssignedYet')
                            : t('hostel.reports.noBoardersFoundMatching')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAssignedBoarders.map((boarder) => (
                        <TableRow key={boarder.id}>
                          <TableCell className="font-medium">{boarder.studentName || t('hostel.reports.student')}</TableCell>
                          <TableCell>{boarder.admissionNumber || '—'}</TableCell>
                          <TableCell>{boarder.buildingName || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{t('hostel.reports.roomNumber').replace('{number}', boarder.roomNumber)}</Badge>
                          </TableCell>
                          <TableCell>{boarder.admissionYear || '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              {filteredAssignedBoarders.length > 0 && assignedTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('hostel.reports.showingBoarders')
                      .replace('{start}', ((assignedPage - 1) * assignedPageSize + 1).toString())
                      .replace('{end}', Math.min(assignedPage * assignedPageSize, filteredAssignedBoarders.length).toString())
                      .replace('{total}', filteredAssignedBoarders.length.toString())}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={assignedPageSize.toString()} onValueChange={(value) => setAssignedPageSize(Number(value))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">{t('hostel.reports.perPage').replace('{count}', '10')}</SelectItem>
                        <SelectItem value="25">{t('hostel.reports.perPage').replace('{count}', '25')}</SelectItem>
                        <SelectItem value="50">{t('hostel.reports.perPage').replace('{count}', '50')}</SelectItem>
                        <SelectItem value="100">{t('hostel.reports.perPage').replace('{count}', '100')}</SelectItem>
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
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t('hostel.reports.unassignedBoarders') || 'Unassigned Boarders'}</CardTitle>
                <CardDescription className="hidden md:block">{t('hostel.reports.unassignedBoardersDescription') || 'Students marked as boarders who still need a room assignment.'}</CardDescription>
              </div>
              <div className="flex-shrink-0">
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <FilterPanel 
                title={t('events.filters') || 'Search & Filter'}
                defaultOpenDesktop={true}
                defaultOpenMobile={false}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="unassigned-search">{t('events.search')}</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="unassigned-search"
                        placeholder={t('hostel.reports.searchUnassignedPlaceholder')}
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
                  </div>
                </div>
              </FilterPanel>

              <div className="overflow-x-auto -mx-4 md:mx-0">
                <div className="inline-block min-w-full align-middle px-4 md:px-0">
                  <div className="rounded-md border">
                    <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('hostel.reports.studentHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.admissionNumberHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.classHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.residencyTypeHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnassignedBoarders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {unassignedBoarders.length === 0
                            ? t('hostel.reports.allBoardersPlaced')
                            : t('hostel.reports.noBoardersFoundMatchingUnassigned')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUnassignedBoarders.map((admission) => (
                        <TableRow key={admission.id}>
                          <TableCell className="font-medium">{admission.studentName || t('hostel.reports.student')}</TableCell>
                          <TableCell>{admission.admissionNumber || '—'}</TableCell>
                          <TableCell>{admission.className || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{admission.residencyTypeName || t('hostel.boarders')}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
              {filteredUnassignedBoarders.length > 0 && unassignedTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {t('hostel.reports.showingBoarders')
                      .replace('{start}', ((unassignedPage - 1) * unassignedPageSize + 1).toString())
                      .replace('{end}', Math.min(unassignedPage * unassignedPageSize, filteredUnassignedBoarders.length).toString())
                      .replace('{total}', filteredUnassignedBoarders.length.toString())}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={unassignedPageSize.toString()} onValueChange={(value) => setUnassignedPageSize(Number(value))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">{t('hostel.reports.perPage').replace('{count}', '10')}</SelectItem>
                        <SelectItem value="25">{t('hostel.reports.perPage').replace('{count}', '25')}</SelectItem>
                        <SelectItem value="50">{t('hostel.reports.perPage').replace('{count}', '50')}</SelectItem>
                        <SelectItem value="100">{t('hostel.reports.perPage').replace('{count}', '100')}</SelectItem>
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
