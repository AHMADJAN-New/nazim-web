import { AlertCircle, BarChart3, BedDouble, Building2, ShieldCheck, Users, Search, X, MapPin, UserCheck, ChevronDown } from 'lucide-react';
import { Fragment, useMemo, useState, useEffect } from 'react';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination';
import type { HostelRoom, HostelOccupant, HostelUnassignedBoarder } from '@/types/domain/hostel';
import { hostelMetricBadgeVariant } from '@/lib/hostelReportBadges';
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

type AssignedBoarderRow = HostelOccupant & {
  roomNumber: string;
  buildingName: string | null;
  buildingId: string | null;
  roomId: string;
  /** Matches `wardenCoverage[].wardenName` (includes translated “not assigned”). */
  wardenDisplayName: string;
};

interface RoomOccupantTableRow {
  buildingId: string | null;
  buildingName: string | null;
  roomId: string;
  roomNumber: string;
  wardenName: string | null;
  occupant: HostelOccupant;
}

const COLLAPSIBLE_STUDENTS_PAGE_SIZE = 25;

function occupantClassFilterKey(o: HostelOccupant): string | null {
  if (o.classId) return `class:${o.classId}`;
  if (o.classAcademicYearId) return `cay:${o.classAcademicYearId}`;
  const n = o.className?.trim();
  if (n) return `name:${n}`;
  return null;
}

function occupantMatchesClassFilter(o: HostelOccupant, filter: string): boolean {
  if (filter === 'all') return true;
  return occupantClassFilterKey(o) === filter;
}

function occupantMatchesAcademicYearFilter(o: HostelOccupant, filter: string): boolean {
  if (filter === 'all') return true;
  if (!o.academicYearId) return false;
  return o.academicYearId === filter;
}

/** Admission is to an academic year; show that year's name (same as admissions flow). */
function hostelReportAcademicYearDisplay(o: Pick<HostelOccupant, 'academicYearName' | 'admissionYear'>): string {
  const name = o.academicYearName?.trim();
  if (name) return name;
  const fallback = o.admissionYear?.trim();
  return fallback || '—';
}

export function HostelReports() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const orgId = profile?.organization_id;

  const { data: hostelOverview, isLoading, isError, error, refetch } = useHostelOverview(orgId);
  const unassignedBoarders = hostelOverview?.unassignedBoarders ?? [];
  
  // Search and filter states
  const [assignedSearchQuery, setAssignedSearchQuery] = useState('');
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [roomBuildingsSubTab, setRoomBuildingsSubTab] = useState<string>('all');
  const [buildingStudentOpen, setBuildingStudentOpen] = useState<Record<string, boolean>>({});
  const [wardenStudentOpen, setWardenStudentOpen] = useState<Record<string, boolean>>({});

  const [assignedClassFilter, setAssignedClassFilter] = useState('all');
  const [assignedAcademicYearFilter, setAssignedAcademicYearFilter] = useState('all');
  const [unassignedClassFilter, setUnassignedClassFilter] = useState('all');
  const [unassignedAcademicYearFilter, setUnassignedAcademicYearFilter] = useState('all');
  const [roomsTabClassFilter, setRoomsTabClassFilter] = useState('all');
  const [roomsTabAcademicYearFilter, setRoomsTabAcademicYearFilter] = useState('all');
  const [roomsTabRoomFilter, setRoomsTabRoomFilter] = useState('all');
  const [roomsTabSearch, setRoomsTabSearch] = useState('');
  const [roomsTablePage, setRoomsTablePage] = useState(1);
  const [roomsTablePageSize, setRoomsTablePageSize] = useState(25);
  const [collapsibleClassFilter, setCollapsibleClassFilter] = useState('all');
  const [collapsibleAcademicYearFilter, setCollapsibleAcademicYearFilter] = useState('all');
  const [collapsibleRoomFilter, setCollapsibleRoomFilter] = useState('all');
  const [buildingStudentPageById, setBuildingStudentPageById] = useState<Record<string, number>>({});
  const [wardenStudentPageByName, setWardenStudentPageByName] = useState<Record<string, number>>({});

  const buildingReports: BuildingReportRow[] = (hostelOverview?.buildings ?? [])
    .map((building) => ({
      buildingId: building.id,
      buildingName: building.buildingName,
      totalRooms: building.roomCount,
      occupiedRooms: building.occupiedRooms,
      boardersAssigned: building.studentsInRooms,
      wardensCovering: building.wardensAssigned,
    }))
    .sort((a, b) => b.boardersAssigned - a.boardersAssigned);

  const wardenCoverage: WardenCoverageRow[] = useMemo(() => {
    if (!hostelOverview) return [];

    const map = new Map<string, { buildings: Set<string>; rooms: number; students: number }>();

    (hostelOverview.rooms ?? []).forEach((room: HostelRoom) => {
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
  }, [hostelOverview, t]);

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
  const allAssignedBoarders = useMemo((): AssignedBoarderRow[] => {
    if (!hostelOverview) return [];
    const notAssigned = t('hostel.notAssigned');
    const boarders: AssignedBoarderRow[] = [];
    (hostelOverview.rooms ?? []).forEach((room) => {
      room.occupants.forEach((occupant) => {
        boarders.push({
          ...occupant,
          roomNumber: room.roomNumber,
          buildingName: room.buildingName,
          buildingId: room.buildingId,
          roomId: room.id,
          wardenDisplayName: room.staffName || notAssigned,
        });
      });
    });
    return boarders;
  }, [hostelOverview, t]);

  const roomOccupantTableRows = useMemo((): RoomOccupantTableRow[] => {
    if (!hostelOverview) return [];
    const rows: RoomOccupantTableRow[] = [];
    (hostelOverview.rooms ?? []).forEach((room) => {
      room.occupants.forEach((occupant) => {
        rows.push({
          buildingId: room.buildingId,
          buildingName: room.buildingName,
          roomId: room.id,
          roomNumber: room.roomNumber,
          wardenName: room.staffName,
          occupant,
        });
      });
    });
    return rows;
  }, [hostelOverview]);

  const filteredBoardersForCollapsibleLists = useMemo(() => {
    let list = allAssignedBoarders;
    if (collapsibleClassFilter !== 'all') {
      list = list.filter((b) => occupantMatchesClassFilter(b, collapsibleClassFilter));
    }
    if (collapsibleAcademicYearFilter !== 'all') {
      list = list.filter((b) => occupantMatchesAcademicYearFilter(b, collapsibleAcademicYearFilter));
    }
    if (collapsibleRoomFilter !== 'all') {
      list = list.filter((b) => b.roomId === collapsibleRoomFilter);
    }
    return list;
  }, [allAssignedBoarders, collapsibleClassFilter, collapsibleAcademicYearFilter, collapsibleRoomFilter]);

  const boardersByBuildingIdFiltered = useMemo(() => {
    const m = new Map<string, AssignedBoarderRow[]>();
    filteredBoardersForCollapsibleLists.forEach((b) => {
      if (!b.buildingId) return;
      if (!m.has(b.buildingId)) m.set(b.buildingId, []);
      m.get(b.buildingId)!.push(b);
    });
    return m;
  }, [filteredBoardersForCollapsibleLists]);

  const boardersByWardenDisplayNameFiltered = useMemo(() => {
    const m = new Map<string, AssignedBoarderRow[]>();
    filteredBoardersForCollapsibleLists.forEach((b) => {
      if (!m.has(b.wardenDisplayName)) m.set(b.wardenDisplayName, []);
      m.get(b.wardenDisplayName)!.push(b);
    });
    return m;
  }, [filteredBoardersForCollapsibleLists]);

  const assignedClassFilterOptions = useMemo(() => {
    const m = new Map<string, string>();
    allAssignedBoarders.forEach((b) => {
      const key = occupantClassFilterKey(b);
      if (!key) return;
      m.set(key, b.className?.trim() || '—');
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allAssignedBoarders]);

  const assignedAcademicYearFilterOptions = useMemo(() => {
    const m = new Map<string, string>();
    allAssignedBoarders.forEach((b) => {
      if (!b.academicYearId) return;
      m.set(b.academicYearId, b.academicYearName?.trim() || b.academicYearId);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allAssignedBoarders]);

  const unassignedClassFilterOptions = useMemo(() => {
    const m = new Map<string, string>();
    unassignedBoarders.forEach((b) => {
      const key = occupantClassFilterKey(b);
      if (!key) return;
      m.set(key, b.className?.trim() || '—');
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [unassignedBoarders]);

  const unassignedAcademicYearFilterOptions = useMemo(() => {
    const m = new Map<string, string>();
    unassignedBoarders.forEach((b) => {
      if (!b.academicYearId) return;
      m.set(b.academicYearId, b.academicYearName?.trim() || b.academicYearId);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [unassignedBoarders]);

  const collapsibleRoomFilterOptions = useMemo(() => {
    const m = new Map<string, { roomNumber: string; buildingLabel: string }>();
    allAssignedBoarders.forEach((b) => {
      m.set(b.roomId, {
        roomNumber: b.roomNumber,
        buildingLabel: b.buildingName || '—',
      });
    });
    return Array.from(m.entries()).sort((a, b) => a[1].roomNumber.localeCompare(b[1].roomNumber));
  }, [allAssignedBoarders]);

  const roomTabBaseRows = useMemo(() => {
    if (roomBuildingsSubTab === 'all') return roomOccupantTableRows;
    return roomOccupantTableRows.filter((r) => r.buildingId === roomBuildingsSubTab);
  }, [roomOccupantTableRows, roomBuildingsSubTab]);

  const roomsTabClassFilterOptions = useMemo(() => {
    const m = new Map<string, string>();
    roomTabBaseRows.forEach((row) => {
      const o = row.occupant;
      const key = occupantClassFilterKey(o);
      if (!key) return;
      m.set(key, o.className?.trim() || '—');
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [roomTabBaseRows]);

  const roomsTabAcademicYearFilterOptions = useMemo(() => {
    const m = new Map<string, string>();
    roomTabBaseRows.forEach((row) => {
      const o = row.occupant;
      if (!o.academicYearId) return;
      m.set(o.academicYearId, o.academicYearName?.trim() || o.academicYearId);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [roomTabBaseRows]);

  const roomsTabRoomFilterOptions = useMemo(() => {
    const m = new Map<string, string>();
    roomTabBaseRows.forEach((row) => {
      m.set(row.roomId, row.roomNumber);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [roomTabBaseRows]);

  const filteredRoomTabRows = useMemo(() => {
    let rows = roomTabBaseRows;
    if (roomsTabClassFilter !== 'all') {
      rows = rows.filter((r) => occupantMatchesClassFilter(r.occupant, roomsTabClassFilter));
    }
    if (roomsTabAcademicYearFilter !== 'all') {
      rows = rows.filter((r) => occupantMatchesAcademicYearFilter(r.occupant, roomsTabAcademicYearFilter));
    }
    if (roomsTabRoomFilter !== 'all') {
      rows = rows.filter((r) => r.roomId === roomsTabRoomFilter);
    }
    if (roomsTabSearch.trim()) {
      const q = roomsTabSearch.trim().toLowerCase();
      rows = rows.filter((r) => {
        const o = r.occupant;
        return (
          o.studentName?.toLowerCase().includes(q) ||
          o.fatherName?.toLowerCase().includes(q) ||
          o.className?.toLowerCase().includes(q) ||
          o.admissionNumber?.toLowerCase().includes(q) ||
          o.academicYearName?.toLowerCase().includes(q) ||
          r.roomNumber.toLowerCase().includes(q) ||
          (r.buildingName || '').toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [
    roomTabBaseRows,
    roomsTabClassFilter,
    roomsTabAcademicYearFilter,
    roomsTabRoomFilter,
    roomsTabSearch,
  ]);

  const paginatedRoomTabRows = useMemo(() => {
    const start = (roomsTablePage - 1) * roomsTablePageSize;
    return filteredRoomTabRows.slice(start, start + roomsTablePageSize);
  }, [filteredRoomTabRows, roomsTablePage, roomsTablePageSize]);

  const roomsTabTotalPages = Math.max(1, Math.ceil(filteredRoomTabRows.length / roomsTablePageSize));

  const buildingsWithRooms = useMemo(() => {
    if (!hostelOverview) return [];
    const ids = new Set(
      (hostelOverview.rooms ?? [])
        .map((r) => r.buildingId)
        .filter((id): id is string => !!id)
    );
    return (hostelOverview.buildings ?? []).filter((b) => ids.has(b.id));
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
          boarder.fatherName?.toLowerCase().includes(query) ||
          boarder.className?.toLowerCase().includes(query) ||
          boarder.admissionNumber?.toLowerCase().includes(query) ||
          boarder.roomNumber?.toLowerCase().includes(query) ||
          boarder.buildingName?.toLowerCase().includes(query) ||
          boarder.academicYearName?.toLowerCase().includes(query)
      );
    }

    // Building filter
    if (selectedBuilding !== 'all') {
      filtered = filtered.filter((boarder) => boarder.buildingId === selectedBuilding);
    }

    // Room filter
    if (selectedRoom !== 'all') {
      filtered = filtered.filter((boarder) => boarder.roomId === selectedRoom);
    }

    if (assignedClassFilter !== 'all') {
      filtered = filtered.filter((boarder) => occupantMatchesClassFilter(boarder, assignedClassFilter));
    }
    if (assignedAcademicYearFilter !== 'all') {
      filtered = filtered.filter((boarder) =>
        occupantMatchesAcademicYearFilter(boarder, assignedAcademicYearFilter)
      );
    }

    return filtered;
  }, [
    allAssignedBoarders,
    assignedSearchQuery,
    selectedBuilding,
    selectedRoom,
    assignedClassFilter,
    assignedAcademicYearFilter,
  ]);

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
  }, [assignedSearchQuery, selectedBuilding, selectedRoom, assignedClassFilter, assignedAcademicYearFilter]);

  // Pagination state for unassigned boarders
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [unassignedPageSize, setUnassignedPageSize] = useState(25);

  // Filter unassigned boarders
  const filteredUnassignedBoarders = useMemo(() => {
    let list = unassignedBoarders;
    if (unassignedSearchQuery) {
      const query = unassignedSearchQuery.toLowerCase();
      list = list.filter(
        (boarder) =>
          boarder.studentName?.toLowerCase().includes(query) ||
          boarder.fatherName?.toLowerCase().includes(query) ||
          boarder.admissionNumber?.toLowerCase().includes(query) ||
          boarder.className?.toLowerCase().includes(query) ||
          boarder.academicYearName?.toLowerCase().includes(query)
      );
    }
    if (unassignedClassFilter !== 'all') {
      list = list.filter((b) => occupantMatchesClassFilter(b, unassignedClassFilter));
    }
    if (unassignedAcademicYearFilter !== 'all') {
      list = list.filter((b) => occupantMatchesAcademicYearFilter(b, unassignedAcademicYearFilter));
    }
    return list;
  }, [
    unassignedBoarders,
    unassignedSearchQuery,
    unassignedClassFilter,
    unassignedAcademicYearFilter,
  ]);

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
  }, [unassignedSearchQuery, unassignedClassFilter, unassignedAcademicYearFilter]);

  useEffect(() => {
    setRoomsTablePage(1);
  }, [
    roomBuildingsSubTab,
    roomsTabClassFilter,
    roomsTabAcademicYearFilter,
    roomsTabRoomFilter,
    roomsTabSearch,
    roomsTablePageSize,
  ]);

  useEffect(() => {
    setBuildingStudentPageById({});
    setWardenStudentPageByName({});
  }, [collapsibleClassFilter, collapsibleAcademicYearFilter, collapsibleRoomFilter]);

  useEffect(() => {
    setRoomsTabRoomFilter('all');
  }, [roomBuildingsSubTab]);

  // Get rooms and buildings for filters
  const buildingsForFilter = useMemo(() => {
    return hostelOverview?.buildings ?? [];
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

  const transformAssignedBoarders = (data: AssignedBoarderRow[]) => {
    return data.map((boarder) => ({
      student_name: boarder.studentName || '—',
      father_name: boarder.fatherName || '—',
      class_name: boarder.className || '—',
      admission_number: boarder.admissionNumber || '—',
      building_name: boarder.buildingName || '—',
      room_number: boarder.roomNumber || '—',
      admission_year: hostelReportAcademicYearDisplay(boarder),
    }));
  };

  const transformUnassignedBoarders = (data: HostelUnassignedBoarder[]) => {
    return data.map((boarder) => ({
      student_name: boarder.studentName || '—',
      father_name: boarder.fatherName || '—',
      admission_number: boarder.admissionNumber || '—',
      class_name: boarder.className || '—',
      academic_year: hostelReportAcademicYearDisplay(boarder),
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
      const building = buildingsForFilter.find((b) => b.id === selectedBuilding);
      if (building) parts.push(`Building: ${building.buildingName}`);
    }
    if (selectedRoom !== 'all') {
      const room = roomsForFilter.find((r) => r.id === selectedRoom);
      if (room) parts.push(`Room: ${room.roomNumber}`);
    }
    if (assignedClassFilter !== 'all') {
      const label = assignedClassFilterOptions.find(([k]) => k === assignedClassFilter)?.[1];
      if (label) parts.push(`${t('hostel.reports.filterClass')}: ${label}`);
    }
    if (assignedAcademicYearFilter !== 'all') {
      const label = assignedAcademicYearFilterOptions.find(([k]) => k === assignedAcademicYearFilter)?.[1];
      if (label) parts.push(`${t('hostel.reports.filterAcademicYear')}: ${label}`);
    }
    return parts.length > 0 ? parts.join(' • ') : `Total assigned boarders: ${filteredAssignedBoarders.length}`;
  };

  const buildUnassignedBoardersFiltersSummary = () => {
    const parts: string[] = [];
    if (unassignedSearchQuery) parts.push(`Search: "${unassignedSearchQuery}"`);
    if (unassignedClassFilter !== 'all') {
      const label = unassignedClassFilterOptions.find(([k]) => k === unassignedClassFilter)?.[1];
      if (label) parts.push(`${t('hostel.reports.filterClass')}: ${label}`);
    }
    if (unassignedAcademicYearFilter !== 'all') {
      const label = unassignedAcademicYearFilterOptions.find(([k]) => k === unassignedAcademicYearFilter)?.[1];
      if (label) parts.push(`${t('hostel.reports.filterAcademicYear')}: ${label}`);
    }
    if (parts.length > 0) {
      return `${parts.join(' • ')} • Total: ${filteredUnassignedBoarders.length}`;
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

  if (isError) {
    const message = error instanceof Error ? error.message : '';
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {t('toast.hostelOverviewLoadFailed')}
            </CardTitle>
            {message ? (
              <CardDescription className="text-destructive">{message}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              {t('common.retry')}
            </Button>
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
            <span className="hidden sm:inline text-xs sm:text-sm">{t('hostel.reports.buildingsTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="warden-coverage" className="flex items-center gap-1 sm:gap-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">{t('hostel.reports.wardensTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="room-buildings" className="flex items-center gap-1 sm:gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">{t('hostel.reports.roomsTab')}</span>
          </TabsTrigger>
          <TabsTrigger value="assigned-boarders" className="flex items-center gap-1 sm:gap-2">
            <UserCheck className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">{t('hostel.reports.assignedTab')}</span>
            {allAssignedBoarders.length > 0 && (
              <Badge variant={hostelMetricBadgeVariant(3)} className="ml-1 shrink-0 text-xs">
                {allAssignedBoarders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unassigned-boarders" className="flex items-center gap-1 sm:gap-2">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline text-xs sm:text-sm">{t('hostel.reports.unassignedTab')}</span>
            {totals.unassignedBoarders > 0 && (
              <Badge variant="warning" className="ml-1 shrink-0 text-xs">
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
                <Badge variant={hostelMetricBadgeVariant(0)} className="hidden sm:inline-flex shrink-0 text-xs">
                  {t('hostel.reports.buildingsCount').replace('{count}', buildingReports.length.toString())}
                </Badge>
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
            <CardContent className="space-y-4">
              <FilterPanel
                title={t('hostel.reports.filterStudentListsTitle')}
                defaultOpenDesktop={true}
                defaultOpenMobile={false}
              >
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                  <div className="min-w-0">
                    <Label htmlFor="building-collapsible-class-filter">{t('hostel.reports.filterClass')}</Label>
                    <Select value={collapsibleClassFilter} onValueChange={setCollapsibleClassFilter}>
                      <SelectTrigger id="building-collapsible-class-filter">
                        <SelectValue placeholder={t('hostel.reports.allClasses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allClasses')}</SelectItem>
                        {assignedClassFilterOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="building-collapsible-year-filter">{t('hostel.reports.filterAcademicYear')}</Label>
                    <Select value={collapsibleAcademicYearFilter} onValueChange={setCollapsibleAcademicYearFilter}>
                      <SelectTrigger id="building-collapsible-year-filter">
                        <SelectValue placeholder={t('hostel.reports.allAcademicYears')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allAcademicYears')}</SelectItem>
                        {assignedAcademicYearFilterOptions.map(([id, name]) => (
                          <SelectItem key={id} value={id}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="building-collapsible-room-filter">{t('hostel.reports.filterRoom')}</Label>
                    <Select value={collapsibleRoomFilter} onValueChange={setCollapsibleRoomFilter}>
                      <SelectTrigger id="building-collapsible-room-filter">
                        <SelectValue placeholder={t('hostel.reports.allRooms')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allRooms')}</SelectItem>
                        {collapsibleRoomFilterOptions.map(([roomId, meta]) => (
                          <SelectItem key={roomId} value={roomId}>
                            {t('hostel.reports.roomNumber').replace('{number}', meta.roomNumber)} — {meta.buildingLabel}
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
                            const studentsInBuilding = boardersByBuildingIdFiltered.get(row.buildingId) ?? [];
                            const open = !!buildingStudentOpen[row.buildingId];
                            const bPage = buildingStudentPageById[row.buildingId] ?? 1;
                            const bStart = (bPage - 1) * COLLAPSIBLE_STUDENTS_PAGE_SIZE;
                            const paginatedBuildingStudents = studentsInBuilding.slice(
                              bStart,
                              bStart + COLLAPSIBLE_STUDENTS_PAGE_SIZE
                            );
                            const buildingStudentTotalPages = Math.max(
                              1,
                              Math.ceil(studentsInBuilding.length / COLLAPSIBLE_STUDENTS_PAGE_SIZE)
                            );
                            return (
                              <Fragment key={row.buildingId}>
                                <TableRow>
                                  <TableCell className="font-medium">{row.buildingName}</TableCell>
                                  <TableCell>
                                    <Badge variant={hostelMetricBadgeVariant(1)} className="shrink-0 text-xs">
                                      {row.totalRooms}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={row.occupiedRooms > 0 ? 'success' : 'muted'} className="shrink-0 text-xs">
                                      {t('hostel.reports.occupiedOfTotal').replace('{occupied}', row.occupiedRooms.toString()).replace('{total}', row.totalRooms.toString())}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="boarder" className="shrink-0 text-xs">
                                      {row.boardersAssigned}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{row.wardensCovering}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-muted rounded-full h-2 min-w-[48px]">
                                        <div
                                          className="bg-primary h-2 rounded-full"
                                          style={{ width: `${utilizationRate}%` }}
                                        />
                                      </div>
                                      <span className="text-sm text-muted-foreground w-12 text-right tabular-nums">
                                        {utilizationRate.toFixed(0)}%
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-transparent">
                                  <TableCell colSpan={6} className="p-0 border-t bg-muted/30">
                                    <Collapsible
                                      open={open}
                                      onOpenChange={(next) =>
                                        setBuildingStudentOpen((prev) => ({ ...prev, [row.buildingId]: next }))
                                      }
                                    >
                                      <CollapsibleTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="w-full justify-between rounded-none px-4 py-2 h-auto font-normal"
                                        >
                                          <span className="text-sm">{t('hostel.reports.studentListBuilding')}</span>
                                          <span className="flex items-center gap-2">
                                            <Badge variant="info" className="shrink-0 text-xs">
                                              {studentsInBuilding.length}
                                            </Badge>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                          </span>
                                        </Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="overflow-x-auto px-2 pb-3">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>{t('hostel.reports.studentHeader')}</TableHead>
                                                <TableHead>{t('hostel.reports.fatherHeader')}</TableHead>
                                                <TableHead>{t('hostel.reports.classHeader')}</TableHead>
                                                <TableHead>{t('hostel.reports.roomHeader')}</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {studentsInBuilding.length === 0 ? (
                                                <TableRow>
                                                  <TableCell colSpan={4} className="text-muted-foreground text-sm">
                                                    {t('hostel.reports.noBoardersAssignedYet')}
                                                  </TableCell>
                                                </TableRow>
                                              ) : (
                                                paginatedBuildingStudents.map((b) => (
                                                  <TableRow key={b.id}>
                                                    <TableCell className="font-medium">{b.studentName || '—'}</TableCell>
                                                    <TableCell>{b.fatherName || '—'}</TableCell>
                                                    <TableCell>{b.className || '—'}</TableCell>
                                                    <TableCell>
                                                      <Badge variant="muted" className="shrink-0 text-xs">
                                                        {t('hostel.reports.roomNumber').replace('{number}', b.roomNumber)}
                                                      </Badge>
                                                    </TableCell>
                                                  </TableRow>
                                                ))
                                              )}
                                            </TableBody>
                                          </Table>
                                        </div>
                                        {studentsInBuilding.length > COLLAPSIBLE_STUDENTS_PAGE_SIZE ? (
                                          <div className="flex flex-col gap-2 px-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-xs text-muted-foreground">
                                              {t('hostel.reports.showingBoarders')
                                                .replace('{start}', (bStart + 1).toString())
                                                .replace(
                                                  '{end}',
                                                  Math.min(bStart + COLLAPSIBLE_STUDENTS_PAGE_SIZE, studentsInBuilding.length).toString()
                                                )
                                                .replace('{total}', studentsInBuilding.length.toString())}
                                            </p>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8"
                                                disabled={bPage <= 1}
                                                onClick={() =>
                                                  setBuildingStudentPageById((prev) => ({
                                                    ...prev,
                                                    [row.buildingId]: Math.max(1, bPage - 1),
                                                  }))
                                                }
                                              >
                                                {t('common.previous')}
                                              </Button>
                                              <span className="text-xs tabular-nums px-1">
                                                {bPage} / {buildingStudentTotalPages}
                                              </span>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8"
                                                disabled={bPage >= buildingStudentTotalPages}
                                                onClick={() =>
                                                  setBuildingStudentPageById((prev) => ({
                                                    ...prev,
                                                    [row.buildingId]: Math.min(buildingStudentTotalPages, bPage + 1),
                                                  }))
                                                }
                                              >
                                                {t('common.next')}
                                              </Button>
                                            </div>
                                          </div>
                                        ) : null}
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </TableCell>
                                </TableRow>
                              </Fragment>
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
                <Badge variant={hostelMetricBadgeVariant(2)} className="hidden sm:inline-flex shrink-0 text-xs">
                  {t('hostel.reports.wardensCount').replace('{count}', wardenCoverage.length.toString())}
                </Badge>
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
            <CardContent className="space-y-4">
              <FilterPanel
                title={t('hostel.reports.filterStudentListsTitle')}
                defaultOpenDesktop={true}
                defaultOpenMobile={false}
              >
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                  <div className="min-w-0">
                    <Label htmlFor="warden-collapsible-class-filter">{t('hostel.reports.filterClass')}</Label>
                    <Select value={collapsibleClassFilter} onValueChange={setCollapsibleClassFilter}>
                      <SelectTrigger id="warden-collapsible-class-filter">
                        <SelectValue placeholder={t('hostel.reports.allClasses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allClasses')}</SelectItem>
                        {assignedClassFilterOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="warden-collapsible-year-filter">{t('hostel.reports.filterAcademicYear')}</Label>
                    <Select value={collapsibleAcademicYearFilter} onValueChange={setCollapsibleAcademicYearFilter}>
                      <SelectTrigger id="warden-collapsible-year-filter">
                        <SelectValue placeholder={t('hostel.reports.allAcademicYears')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allAcademicYears')}</SelectItem>
                        {assignedAcademicYearFilterOptions.map(([id, name]) => (
                          <SelectItem key={id} value={id}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <Label htmlFor="warden-collapsible-room-filter">{t('hostel.reports.filterRoom')}</Label>
                    <Select value={collapsibleRoomFilter} onValueChange={setCollapsibleRoomFilter}>
                      <SelectTrigger id="warden-collapsible-room-filter">
                        <SelectValue placeholder={t('hostel.reports.allRooms')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allRooms')}</SelectItem>
                        {collapsibleRoomFilterOptions.map(([roomId, meta]) => (
                          <SelectItem key={roomId} value={roomId}>
                            {t('hostel.reports.roomNumber').replace('{number}', meta.roomNumber)} — {meta.buildingLabel}
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
                          wardenCoverage.map((warden) => {
                            const studentsForWarden = boardersByWardenDisplayNameFiltered.get(warden.wardenName) ?? [];
                            const open = !!wardenStudentOpen[warden.wardenName];
                            const wPage = wardenStudentPageByName[warden.wardenName] ?? 1;
                            const wStart = (wPage - 1) * COLLAPSIBLE_STUDENTS_PAGE_SIZE;
                            const paginatedWardenStudents = studentsForWarden.slice(
                              wStart,
                              wStart + COLLAPSIBLE_STUDENTS_PAGE_SIZE
                            );
                            const wardenStudentTotalPages = Math.max(
                              1,
                              Math.ceil(studentsForWarden.length / COLLAPSIBLE_STUDENTS_PAGE_SIZE)
                            );
                            return (
                              <Fragment key={warden.wardenName}>
                                <TableRow>
                                  <TableCell className="font-medium">{warden.wardenName}</TableCell>
                                  <TableCell>
                                    <Badge variant="info" className="shrink-0 text-xs">
                                      {warden.buildings}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={hostelMetricBadgeVariant(1)} className="shrink-0 text-xs">
                                      {warden.rooms}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="boarder" className="shrink-0 text-xs">
                                      {warden.students}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={warden.students > 0 ? 'success' : 'muted'} className="shrink-0 text-xs">
                                      {t('hostel.reports.studentsCount').replace('{count}', warden.students.toString())}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                                <TableRow className="hover:bg-transparent">
                                  <TableCell colSpan={5} className="p-0 border-t bg-muted/30">
                                    <Collapsible
                                      open={open}
                                      onOpenChange={(next) =>
                                        setWardenStudentOpen((prev) => ({ ...prev, [warden.wardenName]: next }))
                                      }
                                    >
                                      <CollapsibleTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="w-full justify-between rounded-none px-4 py-2 h-auto font-normal"
                                        >
                                          <span className="text-sm">{t('hostel.reports.studentListWarden')}</span>
                                          <span className="flex items-center gap-2">
                                            <Badge variant="info" className="shrink-0 text-xs">
                                              {studentsForWarden.length}
                                            </Badge>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                          </span>
                                        </Button>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent>
                                        <div className="overflow-x-auto px-2 pb-3">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>{t('hostel.reports.studentHeader')}</TableHead>
                                                <TableHead>{t('hostel.reports.fatherHeader')}</TableHead>
                                                <TableHead>{t('hostel.reports.classHeader')}</TableHead>
                                                <TableHead>{t('hostel.reports.buildingHeaderAssigned')}</TableHead>
                                                <TableHead>{t('hostel.reports.roomHeader')}</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {studentsForWarden.length === 0 ? (
                                                <TableRow>
                                                  <TableCell colSpan={5} className="text-muted-foreground text-sm">
                                                    {t('hostel.reports.noBoardersAssignedYet')}
                                                  </TableCell>
                                                </TableRow>
                                              ) : (
                                                paginatedWardenStudents.map((b) => (
                                                  <TableRow key={b.id}>
                                                    <TableCell className="font-medium">{b.studentName || '—'}</TableCell>
                                                    <TableCell>{b.fatherName || '—'}</TableCell>
                                                    <TableCell>{b.className || '—'}</TableCell>
                                                    <TableCell>{b.buildingName || '—'}</TableCell>
                                                    <TableCell>
                                                      <Badge variant="muted" className="shrink-0 text-xs">
                                                        {t('hostel.reports.roomNumber').replace('{number}', b.roomNumber)}
                                                      </Badge>
                                                    </TableCell>
                                                  </TableRow>
                                                ))
                                              )}
                                            </TableBody>
                                          </Table>
                                        </div>
                                        {studentsForWarden.length > COLLAPSIBLE_STUDENTS_PAGE_SIZE ? (
                                          <div className="flex flex-col gap-2 px-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
                                            <p className="text-xs text-muted-foreground">
                                              {t('hostel.reports.showingBoarders')
                                                .replace('{start}', (wStart + 1).toString())
                                                .replace(
                                                  '{end}',
                                                  Math.min(wStart + COLLAPSIBLE_STUDENTS_PAGE_SIZE, studentsForWarden.length).toString()
                                                )
                                                .replace('{total}', studentsForWarden.length.toString())}
                                            </p>
                                            <div className="flex items-center gap-1">
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8"
                                                disabled={wPage <= 1}
                                                onClick={() =>
                                                  setWardenStudentPageByName((prev) => ({
                                                    ...prev,
                                                    [warden.wardenName]: Math.max(1, wPage - 1),
                                                  }))
                                                }
                                              >
                                                {t('common.previous')}
                                              </Button>
                                              <span className="text-xs tabular-nums px-1">
                                                {wPage} / {wardenStudentTotalPages}
                                              </span>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8"
                                                disabled={wPage >= wardenStudentTotalPages}
                                                onClick={() =>
                                                  setWardenStudentPageByName((prev) => ({
                                                    ...prev,
                                                    [warden.wardenName]: Math.min(wardenStudentTotalPages, wPage + 1),
                                                  }))
                                                }
                                              >
                                                {t('common.next')}
                                              </Button>
                                            </div>
                                          </div>
                                        ) : null}
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </TableCell>
                                </TableRow>
                              </Fragment>
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

        {/* Room & Buildings Report Tab */}
        <TabsContent value="room-buildings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('hostel.reports.roomAndBuildingsTitle') || 'Room & Buildings Report'}</CardTitle>
              <CardDescription>{t('hostel.reports.roomAndBuildingsDescription') || 'All students assigned to rooms, organized by building and room.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {buildingsForFilter.length === 0 || !hostelOverview?.rooms?.length ? (
                <p className="text-center text-muted-foreground py-8">{t('hostel.reports.noBuildingsAvailable')}</p>
              ) : (
                <Tabs value={roomBuildingsSubTab} onValueChange={setRoomBuildingsSubTab} className="w-full space-y-4">
                  <div className="overflow-x-auto -mx-1 px-1">
                    <TabsList className="inline-flex h-auto min-h-10 w-max max-w-full flex-nowrap justify-start gap-1 p-1">
                      <TabsTrigger value="all" className="flex shrink-0 items-center gap-1.5 px-2 sm:px-3">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span className="hidden sm:inline text-xs">{t('hostel.reports.allBuildingsTab')}</span>
                        {roomOccupantTableRows.length > 0 ? (
                          <Badge variant={hostelMetricBadgeVariant(0)} className="shrink-0 text-xs">
                            {roomOccupantTableRows.length}
                          </Badge>
                        ) : null}
                      </TabsTrigger>
                      {buildingsWithRooms.map((b, i) => {
                        const count = roomOccupantTableRows.filter((r) => r.buildingId === b.id).length;
                        return (
                          <TabsTrigger key={b.id} value={b.id} className="max-w-[160px] shrink-0 px-2 sm:px-3">
                            <span className="truncate text-xs">{b.buildingName}</span>
                            {count > 0 ? (
                              <Badge variant={hostelMetricBadgeVariant(i + 1)} className="ml-1 shrink-0 text-xs">
                                {count}
                              </Badge>
                            ) : null}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>
                  <TabsContent value={roomBuildingsSubTab} className="mt-0 space-y-4">
                    <FilterPanel
                      title={t('events.filters') || 'Search & Filter'}
                      defaultOpenDesktop={true}
                      defaultOpenMobile={false}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                          <div className="min-w-0">
                            <Label htmlFor="rooms-tab-class">{t('hostel.reports.filterClass')}</Label>
                            <Select value={roomsTabClassFilter} onValueChange={setRoomsTabClassFilter}>
                              <SelectTrigger id="rooms-tab-class">
                                <SelectValue placeholder={t('hostel.reports.allClasses')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t('hostel.reports.allClasses')}</SelectItem>
                                {roomsTabClassFilterOptions.map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor="rooms-tab-year">{t('hostel.reports.filterAcademicYear')}</Label>
                            <Select value={roomsTabAcademicYearFilter} onValueChange={setRoomsTabAcademicYearFilter}>
                              <SelectTrigger id="rooms-tab-year">
                                <SelectValue placeholder={t('hostel.reports.allAcademicYears')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t('hostel.reports.allAcademicYears')}</SelectItem>
                                {roomsTabAcademicYearFilterOptions.map(([id, name]) => (
                                  <SelectItem key={id} value={id}>
                                    {name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="min-w-0">
                            <Label htmlFor="rooms-tab-room">{t('hostel.reports.filterRoom')}</Label>
                            <Select value={roomsTabRoomFilter} onValueChange={setRoomsTabRoomFilter}>
                              <SelectTrigger id="rooms-tab-room">
                                <SelectValue placeholder={t('hostel.reports.allRooms')} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t('hostel.reports.allRooms')}</SelectItem>
                                {roomsTabRoomFilterOptions.map(([roomId, roomNumber]) => (
                                  <SelectItem key={roomId} value={roomId}>
                                    {t('hostel.reports.roomNumber').replace('{number}', roomNumber)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <Label htmlFor="rooms-tab-search">{t('events.search')}</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              id="rooms-tab-search"
                              placeholder={t('hostel.reports.searchRoomsTablePlaceholder')}
                              value={roomsTabSearch}
                              onChange={(e) => setRoomsTabSearch(e.target.value)}
                              className="pl-10"
                            />
                            {roomsTabSearch ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                                onClick={() => setRoomsTabSearch('')}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </FilterPanel>
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('hostel.reports.buildingHeader')}</TableHead>
                            <TableHead>{t('hostel.reports.roomHeader')}</TableHead>
                            <TableHead>{t('hostel.reports.wardenColumnHeader')}</TableHead>
                            <TableHead>{t('hostel.reports.studentHeader')}</TableHead>
                            <TableHead>{t('hostel.reports.fatherHeader')}</TableHead>
                            <TableHead>{t('hostel.reports.classHeader')}</TableHead>
                            <TableHead>{t('hostel.reports.admissionNumberHeader')}</TableHead>
                            <TableHead>{t('hostel.reports.academicYearHeader')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRoomTabRows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center text-muted-foreground">
                                {roomTabBaseRows.length === 0
                                  ? t('hostel.reports.noBoardersAssignedYet')
                                  : t('hostel.reports.noBoardersFoundMatching')}
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedRoomTabRows.map((row) => {
                              const o = row.occupant;
                              const wardenLabel = row.wardenName || t('hostel.notAssigned');
                              return (
                                <TableRow key={`${row.roomId}-${o.id}`}>
                                  <TableCell className="font-medium whitespace-nowrap">{row.buildingName || '—'}</TableCell>
                                  <TableCell>
                                    <Badge variant="muted" className="shrink-0 text-xs">
                                      {t('hostel.reports.roomNumber').replace('{number}', row.roomNumber)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">{wardenLabel}</TableCell>
                                  <TableCell className="font-medium">{o.studentName || '—'}</TableCell>
                                  <TableCell>{o.fatherName || '—'}</TableCell>
                                  <TableCell>{o.className || '—'}</TableCell>
                                  <TableCell>
                                    <Badge variant="muted" className="shrink-0 text-xs">
                                      {o.admissionNumber || '—'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{hostelReportAcademicYearDisplay(o)}</TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    {filteredRoomTabRows.length > 0 && roomsTabTotalPages > 1 ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-muted-foreground">
                          {t('hostel.reports.showingBoarders')
                            .replace('{start}', ((roomsTablePage - 1) * roomsTablePageSize + 1).toString())
                            .replace(
                              '{end}',
                              Math.min(roomsTablePage * roomsTablePageSize, filteredRoomTabRows.length).toString()
                            )
                            .replace('{total}', filteredRoomTabRows.length.toString())}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select
                            value={roomsTablePageSize.toString()}
                            onValueChange={(value) => setRoomsTablePageSize(Number(value))}
                          >
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
                                  onClick={() => setRoomsTablePage(Math.max(1, roomsTablePage - 1))}
                                  className={
                                    roomsTablePage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                                  }
                                />
                              </PaginationItem>
                              {Array.from({ length: Math.min(5, roomsTabTotalPages) }, (_, i) => {
                                let pageNum: number;
                                if (roomsTabTotalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (roomsTablePage <= 3) {
                                  pageNum = i + 1;
                                } else if (roomsTablePage >= roomsTabTotalPages - 2) {
                                  pageNum = roomsTabTotalPages - 4 + i;
                                } else {
                                  pageNum = roomsTablePage - 2 + i;
                                }
                                return (
                                  <PaginationItem key={pageNum}>
                                    <PaginationLink
                                      onClick={() => setRoomsTablePage(pageNum)}
                                      isActive={roomsTablePage === pageNum}
                                      className="cursor-pointer"
                                    >
                                      {pageNum}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              })}
                              <PaginationItem>
                                <PaginationNext
                                  onClick={() =>
                                    setRoomsTablePage(Math.min(roomsTabTotalPages, roomsTablePage + 1))
                                  }
                                  className={
                                    roomsTablePage === roomsTabTotalPages
                                      ? 'pointer-events-none opacity-50'
                                      : 'cursor-pointer'
                                  }
                                />
                              </PaginationItem>
                            </PaginationContent>
                          </Pagination>
                        </div>
                      </div>
                    ) : null}
                  </TabsContent>
                </Tabs>
              )}
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
                    { key: 'father_name', label: t('hostel.reports.fatherHeader') || 'Father', align: 'left' },
                    { key: 'class_name', label: t('hostel.reports.classColumn') || 'Class', align: 'left' },
                    { key: 'admission_number', label: t('hostel.reports.admissionNumberColumn') || 'Admission #', align: 'left' },
                    { key: 'building_name', label: t('hostel.reports.buildingColumn') || t('settings.buildings.buildingName') || 'Building', align: 'left' },
                    { key: 'room_number', label: t('hostel.reports.roomLabel') || t('settings.rooms.roomNumber') || 'Room', align: 'left' },
                    { key: 'admission_year', label: t('hostel.reports.academicYearColumn') || 'Academic year', align: 'left' },
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
                  <div className="w-full md:w-[200px]">
                    <Label htmlFor="assigned-class-filter">{t('hostel.reports.filterClass')}</Label>
                    <Select value={assignedClassFilter} onValueChange={setAssignedClassFilter}>
                      <SelectTrigger id="assigned-class-filter">
                        <SelectValue placeholder={t('hostel.reports.allClasses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allClasses')}</SelectItem>
                        {assignedClassFilterOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-[200px]">
                    <Label htmlFor="assigned-year-filter">{t('hostel.reports.filterAcademicYear')}</Label>
                    <Select value={assignedAcademicYearFilter} onValueChange={setAssignedAcademicYearFilter}>
                      <SelectTrigger id="assigned-year-filter">
                        <SelectValue placeholder={t('hostel.reports.allAcademicYears')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allAcademicYears')}</SelectItem>
                        {assignedAcademicYearFilterOptions.map(([id, name]) => (
                          <SelectItem key={id} value={id}>
                            {name}
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
                      <TableHead>{t('hostel.reports.fatherHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.classHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.admissionNumberHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.buildingHeaderAssigned')}</TableHead>
                      <TableHead>{t('hostel.reports.roomHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.academicYearHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssignedBoarders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          {allAssignedBoarders.length === 0
                            ? t('hostel.reports.noBoardersAssignedYet')
                            : t('hostel.reports.noBoardersFoundMatching')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedAssignedBoarders.map((boarder) => (
                        <TableRow key={boarder.id}>
                          <TableCell className="font-medium">{boarder.studentName || t('hostel.reports.student')}</TableCell>
                          <TableCell>{boarder.fatherName || '—'}</TableCell>
                          <TableCell>{boarder.className || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="muted" className="shrink-0 text-xs">
                              {boarder.admissionNumber || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell>{boarder.buildingName || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="info" className="shrink-0 text-xs">
                              {t('hostel.reports.roomNumber').replace('{number}', boarder.roomNumber)}
                            </Badge>
                          </TableCell>
                          <TableCell>{hostelReportAcademicYearDisplay(boarder)}</TableCell>
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
                    { key: 'father_name', label: t('hostel.reports.fatherHeader') || 'Father', align: 'left' },
                    { key: 'admission_number', label: t('hostel.reports.admissionNumberColumn') || 'Admission #', align: 'left' },
                    { key: 'class_name', label: t('hostel.reports.classColumn') || 'Class', align: 'left' },
                    { key: 'academic_year', label: t('hostel.reports.academicYearColumn') || 'Academic year', align: 'left' },
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
                <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
                  <div className="flex-1 min-w-0 md:min-w-[200px]">
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
                  <div className="w-full md:w-[200px]">
                    <Label htmlFor="unassigned-class-filter">{t('hostel.reports.filterClass')}</Label>
                    <Select value={unassignedClassFilter} onValueChange={setUnassignedClassFilter}>
                      <SelectTrigger id="unassigned-class-filter">
                        <SelectValue placeholder={t('hostel.reports.allClasses')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allClasses')}</SelectItem>
                        {unassignedClassFilterOptions.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-[200px]">
                    <Label htmlFor="unassigned-year-filter">{t('hostel.reports.filterAcademicYear')}</Label>
                    <Select value={unassignedAcademicYearFilter} onValueChange={setUnassignedAcademicYearFilter}>
                      <SelectTrigger id="unassigned-year-filter">
                        <SelectValue placeholder={t('hostel.reports.allAcademicYears')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('hostel.reports.allAcademicYears')}</SelectItem>
                        {unassignedAcademicYearFilterOptions.map(([id, name]) => (
                          <SelectItem key={id} value={id}>
                            {name}
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
                      <TableHead>{t('hostel.reports.fatherHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.admissionNumberHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.classHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.academicYearHeader')}</TableHead>
                      <TableHead>{t('hostel.reports.residencyTypeHeader')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUnassignedBoarders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {unassignedBoarders.length === 0
                            ? t('hostel.reports.allBoardersPlaced')
                            : t('hostel.reports.noBoardersFoundMatchingUnassigned')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUnassignedBoarders.map((admission) => (
                        <TableRow key={admission.id}>
                          <TableCell className="font-medium">{admission.studentName || t('hostel.reports.student')}</TableCell>
                          <TableCell>{admission.fatherName || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="muted" className="shrink-0 text-xs">
                              {admission.admissionNumber || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell>{admission.className || '—'}</TableCell>
                          <TableCell>{hostelReportAcademicYearDisplay(admission)}</TableCell>
                          <TableCell>
                            <Badge variant="info" className="shrink-0 text-xs">
                              {admission.residencyTypeName || t('hostel.boarders')}
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
