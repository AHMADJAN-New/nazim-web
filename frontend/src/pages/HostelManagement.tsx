import {
  AlertCircle,
  BedDouble,
  Building2,
  CheckCircle2,
  FileDown,
  Search,
  Users,
} from 'lucide-react';
import { startTransition, useDeferredValue, useMemo, useState, type ReactNode } from 'react';

import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHostelOverview } from '@/hooks/useHostel';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import {
  filterAssignedBoarders,
  filterHostelRooms,
  filterUnassignedBoarders,
  flattenAssignedBoarders,
  getHostelRoomStatus,
  summarizeHostelRooms,
  type HostelStudentDirectoryRow,
  type HostelRoomStatus,
} from '@/lib/hostelManagementView';
import { cn } from '@/lib/utils';
import { HostelRoomOccupantsDialog } from '@/components/hostel/HostelRoomOccupantsDialog';
import { HostelWaitingRoomAssignDialog } from '@/components/hostel/HostelWaitingRoomAssignDialog';
import type {
  HostelBuildingReport,
  HostelRoom,
  HostelSummary,
  HostelUnassignedBoarder,
} from '@/types/domain/hostel';

type RoomStatusFilter = HostelRoomStatus | 'all';
type HostelTab = 'buildings' | 'rooms' | 'students' | 'waiting';

interface SelectOption {
  value: string;
  label: string;
}

interface HostelManagementLabels {
  searchPlaceholder: string;
  allAcademicYears: string;
  allClasses: string;
  allRooms: string;
  academicYear: string;
  classColumn: string;
  admissionNumber: string;
  occupiedRooms: string;
  boardersCount: string;
  capacity: string;
  residencyType: string;
  placement: string;
  student: string;
  fatherName: string;
  status: string;
  filtersNote: string;
  buildingOverview: string;
  roomsRegister: string;
  studentsRegister: string;
  waitingRegister: string;
  waitingStatus: string;
}

function getOccupancyRate(occupied: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((occupied / total) * 100);
}

function translateOrFallback(
  t: ReturnType<typeof useLanguage>['t'],
  key: Parameters<ReturnType<typeof useLanguage>['t']>[0],
  fallback: string
): string {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function formatCellValue(value: string | null | undefined, fallback = '-'): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

function buildUniqueOptions(
  items: Array<{ value: string | null | undefined; label: string | null | undefined }>,
  allLabel: string
): SelectOption[] {
  const uniqueItems = new Map<string, string>();

  items.forEach((item) => {
    const value = item.value?.trim();
    const label = item.label?.trim();
    if (!value || !label || uniqueItems.has(value)) {
      return;
    }

    uniqueItems.set(value, label);
  });

  const sorted = Array.from(uniqueItems.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((left, right) =>
      left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: 'base' })
    );

  return [{ value: 'all', label: allLabel }, ...sorted];
}

function getRoomStatusMeta(status: HostelRoomStatus, t: ReturnType<typeof useLanguage>['t']) {
  switch (status) {
    case 'full':
      return {
        label: translateOrFallback(t, 'hostel.full', 'Full'),
        className:
          'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300',
      };
    case 'occupied':
      return {
        label: t('hostel.occupied'),
        className:
          'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300',
      };
    case 'attention':
      return {
        label: t('hostel.needsAttention'),
        className:
          'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300',
      };
    default:
      return {
        label: t('hostel.available'),
        className: 'bg-muted border-border text-muted-foreground',
      };
  }
}

function getPlacementMeta(status: HostelRoomStatus, t: ReturnType<typeof useLanguage>['t']) {
  if (status === 'attention') {
    return {
      label: translateOrFallback(t, 'hostel.followUp', 'Follow up'),
      className:
        'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300',
    };
  }

  return {
    label: translateOrFallback(t, 'hostel.placedStatus', 'Placed'),
    className:
      'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300',
  };
}

export function HostelManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const orgId = profile?.organization_id;
  const { data: hostelOverview, isLoading, isError, error, refetch } = useHostelOverview(orgId);

  const [activeTab, setActiveTab] = useState<HostelTab>('rooms');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatusFilter>('all');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [waitingBoarder, setWaitingBoarder] = useState<HostelUnassignedBoarder | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<HostelRoom | null>(null);

  const rooms: HostelRoom[] = hostelOverview?.rooms ?? [];
  const buildings: HostelBuildingReport[] = hostelOverview?.buildings ?? [];
  const unassignedBoarders = hostelOverview?.unassignedBoarders ?? [];
  const summary: HostelSummary = hostelOverview?.summary ?? {
    totalRooms: 0,
    occupiedRooms: 0,
    totalStudentsInRooms: 0,
    totalBuildings: 0,
    uniqueWardens: 0,
    unassignedBoarders: 0,
    occupancyRate: 0,
  };

  const labels = useMemo(
    () => ({
      searchPlaceholder: translateOrFallback(
        t,
        'hostel.searchRoomsPlaceholder',
        'Search student, father, room, class, or year'
      ),
      allAcademicYears: translateOrFallback(t, 'hostel.allAcademicYears', 'All academic years'),
      allClasses: translateOrFallback(t, 'hostel.allClasses', 'All classes'),
      allRooms: translateOrFallback(t, 'hostel.reports.allRooms', 'All rooms'),
      academicYear: translateOrFallback(t, 'hostel.reports.academicYearColumn', 'Academic year'),
      classColumn: translateOrFallback(t, 'hostel.reports.classColumn', 'Class'),
      admissionNumber: translateOrFallback(
        t,
        'hostel.reports.admissionNumberColumn',
        'Admission no.'
      ),
      occupiedRooms: translateOrFallback(t, 'hostel.occupiedRooms', 'Occupied rooms'),
      boardersCount: translateOrFallback(t, 'hostel.boardersCount', 'Boarders'),
      capacity: translateOrFallback(t, 'hostel.capacity', 'Capacity'),
      residencyType: translateOrFallback(t, 'hostel.residencyType', 'Residency'),
      placement: translateOrFallback(t, 'hostel.placement', 'Placement'),
      student: translateOrFallback(t, 'hostel.student', 'Student'),
      fatherName: translateOrFallback(t, 'hostel.fatherName', 'Father name'),
      status: translateOrFallback(t, 'common.status', 'Status'),
      filtersNote: translateOrFallback(
        t,
        'hostel.roomFiltersDisabledForWaiting',
        'Building, room, and status filters apply to allocated rooms only. Needs follow up means room setup is incomplete (missing building or warden).'
      ),
      buildingOverview: translateOrFallback(t, 'hostel.buildingOverview', 'Building overview'),
      roomsRegister: translateOrFallback(t, 'hostel.roomsRegister', 'Room register'),
      studentsRegister: translateOrFallback(t, 'hostel.studentsRegister', 'Student register'),
      waitingRegister: translateOrFallback(t, 'hostel.waitingRegister', 'Waiting register'),
      waitingStatus: translateOrFallback(t, 'hostel.awaitingRoom', 'Awaiting room'),
    }),
    [t]
  );

  /** Building/room/status filters apply to Rooms and Students tab lists only. */
  const isRoomsOrStudentsTab = activeTab === 'rooms' || activeTab === 'students';
  const allAssignedStudents = useMemo(() => flattenAssignedBoarders(rooms), [rooms]);

  const filteredRooms = useMemo(
    () =>
      filterHostelRooms(rooms, {
        buildingId: isRoomsOrStudentsTab && buildingFilter !== 'all' ? buildingFilter : undefined,
        roomId: isRoomsOrStudentsTab && roomFilter !== 'all' ? roomFilter : undefined,
        academicYearId: academicYearFilter !== 'all' ? academicYearFilter : undefined,
        classId: classFilter !== 'all' ? classFilter : undefined,
        search: deferredSearch,
        status: isRoomsOrStudentsTab ? roomStatusFilter : 'all',
      }),
    [
      rooms,
      isRoomsOrStudentsTab,
      buildingFilter,
      roomFilter,
      academicYearFilter,
      classFilter,
      deferredSearch,
      roomStatusFilter,
    ]
  );

  const assignedStudents = useMemo(
    () =>
      filterAssignedBoarders(allAssignedStudents, {
        buildingId: isRoomsOrStudentsTab && buildingFilter !== 'all' ? buildingFilter : undefined,
        roomId: isRoomsOrStudentsTab && roomFilter !== 'all' ? roomFilter : undefined,
        academicYearId: academicYearFilter !== 'all' ? academicYearFilter : undefined,
        classId: classFilter !== 'all' ? classFilter : undefined,
        search: deferredSearch,
        roomStatus: isRoomsOrStudentsTab ? roomStatusFilter : 'all',
      }),
    [
      allAssignedStudents,
      isRoomsOrStudentsTab,
      buildingFilter,
      roomFilter,
      academicYearFilter,
      classFilter,
      deferredSearch,
      roomStatusFilter,
    ]
  );

  const visibleUnassignedBoarders = useMemo(
    () =>
      filterUnassignedBoarders(unassignedBoarders, {
        academicYearId: academicYearFilter !== 'all' ? academicYearFilter : undefined,
        classId: classFilter !== 'all' ? classFilter : undefined,
        search: deferredSearch,
      }),
    [unassignedBoarders, academicYearFilter, classFilter, deferredSearch]
  );

  const filteredSummary = useMemo(() => summarizeHostelRooms(filteredRooms), [filteredRooms]);
  const allRoomSummary = useMemo(() => summarizeHostelRooms(rooms), [rooms]);
  const fullRoomsCount = useMemo(
    () => filteredRooms.filter((room) => getHostelRoomStatus(room) === 'full').length,
    [filteredRooms]
  );

  const buildingOptions = useMemo(
    () =>
      buildUniqueOptions(
        buildings.map((building) => ({ value: building.id, label: building.buildingName })),
        t('hostel.allBuildingsOption')
      ),
    [buildings, t]
  );

  const roomOptions = useMemo(() => {
    const scopedRooms =
      buildingFilter === 'all'
        ? rooms
        : rooms.filter((room) => room.buildingId === buildingFilter);

    const sortedRooms = [...scopedRooms].sort((left, right) => {
      const buildingCompare = (left.buildingName ?? '').localeCompare(right.buildingName ?? '');
      if (buildingCompare !== 0) {
        return buildingCompare;
      }

      return left.roomNumber.localeCompare(right.roomNumber, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    return [
      { value: 'all', label: labels.allRooms },
      ...sortedRooms.map((room) => ({
        value: room.id,
        label: room.buildingName ? `${room.roomNumber} - ${room.buildingName}` : room.roomNumber,
      })),
    ];
  }, [rooms, buildingFilter, labels.allRooms]);

  const academicYearOptions = useMemo(
    () =>
      buildUniqueOptions(
        [...allAssignedStudents, ...unassignedBoarders].map((row) => ({
          value: row.academicYearId,
          label: row.academicYearName || row.admissionYear,
        })),
        labels.allAcademicYears
      ),
    [allAssignedStudents, unassignedBoarders, labels.allAcademicYears]
  );

  const classOptions = useMemo(
    () =>
      buildUniqueOptions(
        [...allAssignedStudents, ...unassignedBoarders].map((row) => ({
          value: row.classId,
          label: row.className,
        })),
        labels.allClasses
      ),
    [allAssignedStudents, unassignedBoarders, labels.allClasses]
  );

  const visibleBuildings = useMemo(() => {
    const sorted = [...buildings].sort((left, right) => {
      const studentDelta = right.studentsInRooms - left.studentsInRooms;
      if (studentDelta !== 0) {
        return studentDelta;
      }

      const roomDelta = right.occupiedRooms - left.occupiedRooms;
      if (roomDelta !== 0) {
        return roomDelta;
      }

      return left.buildingName.localeCompare(right.buildingName);
    });

    if (buildingFilter === 'all') {
      return sorted;
    }

    return sorted.filter((building) => building.id === buildingFilter);
  }, [buildings, buildingFilter]);

  const hasActiveFilters =
    buildingFilter !== 'all' ||
    roomFilter !== 'all' ||
    roomStatusFilter !== 'all' ||
    academicYearFilter !== 'all' ||
    classFilter !== 'all' ||
    search.trim().length > 0;

  const exportCsv = () => {
    const headers = [
      t('hostel.room'),
      t('hostel.building'),
      t('hostel.warden'),
      labels.status,
      labels.boardersCount,
      t('hostel.students'),
    ];

    const rows = filteredRooms.map((room) => {
      const roomStatus = getHostelRoomStatus(room);
      const statusLabel = getRoomStatusMeta(roomStatus, t).label;

      return [
        room.roomNumber,
        room.buildingName || t('hostel.unassigned'),
        room.staffName || t('hostel.notAssigned'),
        statusLabel,
        String(room.occupants.length),
        room.occupants
          .map((student) =>
            [
              student.studentName || labels.student,
              student.className || '',
              student.admissionNumber || '',
            ]
              .filter(Boolean)
              .join(' / ')
          )
          .join(' | '),
      ];
    });

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

  const handleTabChange = (nextTab: string) => {
    const resolvedTab = nextTab as HostelTab;
    setActiveTab(resolvedTab);

    if (resolvedTab === 'waiting') {
      setBuildingFilter('all');
      setRoomFilter('all');
      setRoomStatusFilter('all');
    }
    if (resolvedTab === 'buildings') {
      setRoomFilter('all');
      setRoomStatusFilter('all');
    }
  };

  const clearFilters = () => {
    setBuildingFilter('all');
    setRoomFilter('all');
    setRoomStatusFilter('all');
    setAcademicYearFilter('all');
    setClassFilter('all');
    startTransition(() => setSearch(''));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-12 shadow-sm">
          <BedDouble className="h-10 w-10 text-muted-foreground/40" />
          <LoadingSpinner size="lg" text={t('hostel.loadingHostelData')} />
        </div>
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : '';

    return (
      <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
        <div className="space-y-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="font-semibold text-destructive">{t('toast.hostelOverviewLoadFailed')}</p>
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="mt-2 rounded-xl"
          >
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  const occupancyRate = Math.round(summary.occupancyRate);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('students.hostel')}
        description={t('hostel.monitorOccupancyAssignments')}
        icon={<BedDouble className="h-5 w-5" />}
        primaryAction={{
          label: t('hostel.exportOccupancyCsv'),
          onClick: exportCsv,
          icon: <FileDown className="h-4 w-4" />,
          disabled: filteredRooms.length === 0,
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard
          title={t('hostel.studentsInHostel')}
          value={summary.totalStudentsInRooms}
          icon={<Users className="h-4 w-4" />}
        />
        <SummaryMetricCard
          title={t('hostel.rooms')}
          value={summary.totalRooms}
          icon={<BedDouble className="h-4 w-4" />}
        />
        <SummaryMetricCard
          title={t('hostel.boardersWaitingForRooms')}
          value={summary.unassignedBoarders}
          icon={<AlertCircle className="h-4 w-4" />}
          highlight={summary.unassignedBoarders > 0}
        />
        <SummaryMetricCard
          title={t('hostel.needsAttention')}
          value={allRoomSummary.roomsNeedingAttention}
          icon={<AlertCircle className="h-4 w-4" />}
          highlight={allRoomSummary.roomsNeedingAttention > 0}
        />
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">{t('hostel.overallOccupancy')}</span>
            <span className="font-semibold tabular-nums">{occupancyRate}%</span>
          </div>
          <Progress value={occupancyRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {summary.occupiedRooms} / {summary.totalRooms} {labels.occupiedRooms.toLowerCase()}
          </p>
        </div>
      </div>

      <FilterPanel title={t('hostel.filters')} defaultOpenDesktop defaultOpenMobile={false}>
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{labels.filtersNote}</p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 self-start text-xs">
                {t('hostel.clearAll')}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9 text-sm"
                placeholder={labels.searchPlaceholder}
                value={search}
                onChange={(event) => startTransition(() => setSearch(event.target.value))}
              />
            </div>

            <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
              <SelectTrigger className="h-10 w-full sm:w-[180px]">
                <SelectValue placeholder={labels.allAcademicYears} />
              </SelectTrigger>
              <SelectContent>
                {academicYearOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-10 w-full sm:w-[180px]">
                <SelectValue placeholder={labels.allClasses} />
              </SelectTrigger>
              <SelectContent>
                {classOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={buildingFilter}
              onValueChange={(value) => {
                setBuildingFilter(value);
                setRoomFilter('all');
              }}
              disabled={activeTab === 'waiting'}
            >
              <SelectTrigger className="h-10 w-full sm:w-[180px]">
                <SelectValue placeholder={t('hostel.allBuildingsOption')} />
              </SelectTrigger>
              <SelectContent>
                {buildingOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roomFilter} onValueChange={setRoomFilter} disabled={!isRoomsOrStudentsTab}>
              <SelectTrigger className="h-10 w-full sm:w-[180px]">
                <SelectValue placeholder={labels.allRooms} />
              </SelectTrigger>
              <SelectContent>
                {roomOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={roomStatusFilter}
              onValueChange={(value) => setRoomStatusFilter(value as RoomStatusFilter)}
              disabled={!isRoomsOrStudentsTab}
            >
              <SelectTrigger className="h-10 w-full sm:w-[170px]">
                <SelectValue placeholder={labels.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{labels.allRooms}</SelectItem>
                <SelectItem value="full">{translateOrFallback(t, 'hostel.full', 'Full')}</SelectItem>
                <SelectItem value="occupied">{t('hostel.occupied')}</SelectItem>
                <SelectItem value="attention">{t('hostel.needsAttention')}</SelectItem>
                <SelectItem value="empty">{t('hostel.available')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{filteredRooms.length}</span>{' '}
              {t('hostel.rooms').toLowerCase()}
            </span>
            <span>
              <span className="font-medium text-foreground">{assignedStudents.length}</span>{' '}
              {t('hostel.studentPlural')}
            </span>
            <span>
              <span className="font-medium text-foreground">
                {visibleUnassignedBoarders.length}
              </span>{' '}
              {t('hostel.waiting').toLowerCase()}
            </span>
            {filteredSummary.roomsNeedingAttention > 0 && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" />
                <span className="font-medium">{filteredSummary.roomsNeedingAttention}</span>{' '}
                {t('hostel.needsAttention').toLowerCase()}
              </span>
            )}
            {fullRoomsCount > 0 && (
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <BedDouble className="h-3 w-3" />
                <span className="font-medium">{fullRoomsCount}</span>{' '}
                {translateOrFallback(t, 'hostel.fullRooms', 'full rooms')}
              </span>
            )}
          </div>
        </div>
      </FilterPanel>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid min-h-11 w-full grid-cols-2 gap-1 rounded-2xl p-1 sm:grid-cols-4">
          <TabsTrigger
            value="buildings"
            className="gap-1.5 rounded-xl text-xs sm:text-sm"
            aria-label={t('hostel.buildingOverview')}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('hostel.buildingOverview')}</span>
            <span className="ml-1 text-[10px] font-semibold opacity-70">({visibleBuildings.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-1.5 rounded-xl text-xs sm:text-sm" aria-label={t('hostel.rooms')}>
            <BedDouble className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('hostel.rooms')}</span>
            <span className="ml-1 text-[10px] font-semibold opacity-70">({filteredRooms.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="students"
            className="gap-1.5 rounded-xl text-xs sm:text-sm"
            aria-label={t('hostel.students')}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('hostel.students')}</span>
            <span className="ml-1 text-[10px] font-semibold opacity-70">
              ({assignedStudents.length})
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="waiting"
            className="gap-1.5 rounded-xl text-xs sm:text-sm"
            aria-label={t('hostel.waiting')}
          >
            <AlertCircle
              className={cn(
                'h-3.5 w-3.5',
                visibleUnassignedBoarders.length > 0 && 'text-amber-500'
              )}
            />
            <span className="hidden sm:inline">{t('hostel.waiting')}</span>
            <span
              className={cn(
                'ml-1 text-[10px] font-semibold opacity-70',
                visibleUnassignedBoarders.length > 0 &&
                  'text-amber-600 opacity-100 dark:text-amber-400'
              )}
            >
              ({visibleUnassignedBoarders.length})
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buildings" className="mt-0">
          {visibleBuildings.length > 0 ? (
            <BuildingOverviewTable
              buildings={visibleBuildings}
              buildingFilter={buildingFilter}
              labels={labels}
              summary={summary}
              t={t}
            />
          ) : (
            <EmptyState
              icon={<Building2 className="h-10 w-10 text-muted-foreground/30" />}
              title={t('hostel.reports.noBuildingDataAvailable')}
            />
          )}
        </TabsContent>

        <TabsContent value="rooms" className="mt-0">
          {filteredRooms.length > 0 ? (
            <RoomsRegisterTable
              rooms={filteredRooms}
              labels={labels}
              t={t}
              onSelectRoom={(room) => setSelectedRoom(room)}
            />
          ) : (
            <EmptyState
              icon={<BedDouble className="h-10 w-10 text-muted-foreground/30" />}
              title={t('hostel.noRoomsMatch')}
            />
          )}
        </TabsContent>

        <TabsContent value="students" className="mt-0">
          {assignedStudents.length > 0 ? (
            <StudentsRegisterTable students={assignedStudents} labels={labels} t={t} />
          ) : (
            <EmptyState
              icon={<Users className="h-10 w-10 text-muted-foreground/30" />}
              title={t('hostel.noStudentsMatch')}
            />
          )}
        </TabsContent>

        <TabsContent value="waiting" className="mt-0">
          {visibleUnassignedBoarders.length > 0 ? (
            <WaitingRegisterTable
              boarders={visibleUnassignedBoarders}
              labels={labels}
              t={t}
              onSelectBoarder={(boarder) => setWaitingBoarder(boarder)}
            />
          ) : (
            <EmptyState
              icon={
                unassignedBoarders.length === 0 ? (
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                ) : (
                  <Users className="h-10 w-10 text-muted-foreground/30" />
                )
              }
              title={
                unassignedBoarders.length === 0 ? t('hostel.allPlaced') : t('hostel.noWaitingMatch')
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <HostelWaitingRoomAssignDialog
        open={waitingBoarder !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWaitingBoarder(null);
          }
        }}
        boarder={waitingBoarder}
        onSuccess={() => void refetch()}
      />

      <HostelRoomOccupantsDialog
        open={selectedRoom !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRoom(null);
          }
        }}
        room={selectedRoom}
      />
    </div>
  );
}

function BuildingOverviewTable({
  buildings,
  buildingFilter,
  labels,
  summary,
  t,
}: {
  buildings: HostelBuildingReport[];
  buildingFilter: string;
  labels: HostelManagementLabels;
  summary: HostelSummary;
  t: ReturnType<typeof useLanguage>['t'];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">{labels.buildingOverview}</h2>
            <p className="text-xs text-muted-foreground">
              {summary.totalBuildings} {t('hostel.buildings').toLowerCase()}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {buildings.length} / {summary.totalBuildings}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[780px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">{t('hostel.building')}</TableHead>
              <TableHead>{t('hostel.rooms')}</TableHead>
              <TableHead>{labels.occupiedRooms}</TableHead>
              <TableHead>{labels.boardersCount}</TableHead>
              <TableHead>{t('hostel.warden')}</TableHead>
              <TableHead className="text-left">{t('hostel.overallOccupancy')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {buildings.map((building) => {
              const rate = getOccupancyRate(building.occupiedRooms, building.roomCount);

              return (
                <TableRow
                  key={building.id}
                  className={cn(buildingFilter === building.id && 'bg-primary/5')}
                >
                  <TableCell className="text-left font-medium">{building.buildingName}</TableCell>
                  <TableCell>{building.roomCount}</TableCell>
                  <TableCell>{building.occupiedRooms}</TableCell>
                  <TableCell>{building.studentsInRooms}</TableCell>
                  <TableCell>{building.wardensAssigned}</TableCell>
                  <TableCell className="w-[220px] text-left">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{rate}%</span>
                        <span>
                          {building.occupiedRooms} / {building.roomCount}
                        </span>
                      </div>
                      <Progress value={rate} className="h-2" />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RoomsRegisterTable({
  rooms,
  labels,
  t,
  onSelectRoom,
}: {
  rooms: HostelRoom[];
  labels: HostelManagementLabels;
  t: ReturnType<typeof useLanguage>['t'];
  onSelectRoom: (room: HostelRoom) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-1 border-b bg-muted/20 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">{labels.roomsRegister}</h2>
          <p className="text-xs text-muted-foreground">
            {rooms.length} {t('hostel.rooms').toLowerCase()}
          </p>
        </div>
        <p className="text-xs text-muted-foreground sm:max-w-[280px] sm:text-end">
          {t('hostel.roomClickRowHint')}
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[1040px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">{t('hostel.room')}</TableHead>
              <TableHead className="text-left">{t('hostel.building')}</TableHead>
              <TableHead className="text-left">{t('hostel.warden')}</TableHead>
              <TableHead>{labels.status}</TableHead>
              <TableHead>{labels.capacity}</TableHead>
              <TableHead>{labels.boardersCount}</TableHead>
              <TableHead className="text-left">{t('hostel.students')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => {
              const roomStatus = getHostelRoomStatus(room);
              const statusMeta = getRoomStatusMeta(roomStatus, t);

              return (
                <TableRow
                  key={room.id}
                  className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50"
                  tabIndex={0}
                  role="button"
                  aria-label={t('hostel.roomOccupantsTitle', { room: room.roomNumber })}
                  onClick={() => onSelectRoom(room)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectRoom(room);
                    }
                  }}
                >
                  <TableCell className="text-left font-medium">{room.roomNumber}</TableCell>
                  <TableCell className="text-left">
                    {formatCellValue(room.buildingName, t('hostel.unassigned'))}
                  </TableCell>
                  <TableCell className="text-left">
                    {formatCellValue(room.staffName, t('hostel.notAssigned'))}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-lg border px-2 py-1 text-xs font-medium',
                        statusMeta.className
                      )}
                    >
                      {statusMeta.label}
                    </span>
                  </TableCell>
                <TableCell>{room.capacity ?? '-'}</TableCell>
                <TableCell>
                  {room.capacity && room.capacity > 0
                    ? `${room.occupants.length} / ${room.capacity}`
                    : room.occupants.length}
                </TableCell>
                  <TableCell className="text-left">
                    {room.occupants.length > 0 ? (
                      <div className="space-y-2">
                        {room.occupants.slice(0, 2).map((student) => (
                          <div key={student.id}>
                            <p className="text-sm font-medium">
                              {student.studentName || labels.student}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {[student.className, student.admissionNumber]
                                .filter(Boolean)
                                .join(' / ') || formatCellValue(student.fatherName)}
                            </p>
                          </div>
                        ))}
                        {room.occupants.length > 2 && (
                          <p className="text-xs font-medium text-muted-foreground">
                            +{room.occupants.length - 2} {t('hostel.studentPlural')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {t('hostel.noStudentsAssigned')}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StudentsRegisterTable({
  students,
  labels,
  t,
}: {
  students: HostelStudentDirectoryRow[];
  labels: HostelManagementLabels;
  t: ReturnType<typeof useLanguage>['t'];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/20 px-5 py-3.5">
        <div>
          <h2 className="text-sm font-semibold">{labels.studentsRegister}</h2>
          <p className="text-xs text-muted-foreground">
            {students.length} {t('hostel.studentPlural')}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[1240px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">{labels.student}</TableHead>
              <TableHead className="text-left">{labels.fatherName}</TableHead>
              <TableHead className="text-left">{labels.classColumn}</TableHead>
              <TableHead className="text-left">{labels.academicYear}</TableHead>
              <TableHead className="text-left">{labels.admissionNumber}</TableHead>
              <TableHead className="text-left">{t('hostel.building')}</TableHead>
              <TableHead className="text-left">{t('hostel.room')}</TableHead>
              <TableHead className="text-left">{t('hostel.warden')}</TableHead>
              <TableHead>{labels.placement}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const placementMeta = getPlacementMeta(student.roomStatus, t);

              return (
                <TableRow key={student.id}>
                  <TableCell className="text-left font-medium">
                    {student.studentName || labels.student}
                  </TableCell>
                  <TableCell className="text-left">{formatCellValue(student.fatherName)}</TableCell>
                  <TableCell className="text-left">{formatCellValue(student.className)}</TableCell>
                  <TableCell className="text-left">
                    {formatCellValue(student.academicYearName || student.admissionYear)}
                  </TableCell>
                  <TableCell className="text-left">
                    {formatCellValue(student.admissionNumber)}
                  </TableCell>
                  <TableCell className="text-left">
                    {formatCellValue(student.buildingName, t('hostel.unassigned'))}
                  </TableCell>
                  <TableCell className="text-left">{student.roomNumber}</TableCell>
                  <TableCell className="text-left">
                    {formatCellValue(student.staffName, t('hostel.notAssigned'))}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'inline-flex rounded-lg border px-2 py-1 text-xs font-medium',
                        placementMeta.className
                      )}
                    >
                      {placementMeta.label}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function WaitingRegisterTable({
  boarders,
  labels,
  t,
  onSelectBoarder,
}: {
  boarders: HostelUnassignedBoarder[];
  labels: HostelManagementLabels;
  t: ReturnType<typeof useLanguage>['t'];
  onSelectBoarder: (boarder: HostelUnassignedBoarder) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-1 border-b bg-muted/20 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">{labels.waitingRegister}</h2>
          <p className="text-xs text-muted-foreground">
            {boarders.length} {labels.waitingStatus.toLowerCase()}
          </p>
        </div>
        <p className="text-xs text-muted-foreground sm:max-w-[280px] sm:text-end">
          {t('hostel.waitingClickRowToAssign')}
        </p>
        <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5" />
          {boarders.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">{labels.student}</TableHead>
              <TableHead className="text-left">{labels.fatherName}</TableHead>
              <TableHead className="text-left">{labels.classColumn}</TableHead>
              <TableHead className="text-left">{labels.academicYear}</TableHead>
              <TableHead className="text-left">{labels.admissionNumber}</TableHead>
              <TableHead className="text-left">{labels.residencyType}</TableHead>
              <TableHead>{labels.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boarders.map((boarder) => (
              <TableRow
                key={boarder.id}
                className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50"
                tabIndex={0}
                role="button"
                aria-label={t('hostel.waitingAssignRoomTitle')}
                onClick={() => onSelectBoarder(boarder)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelectBoarder(boarder);
                  }
                }}
              >
                <TableCell className="text-left font-medium">
                  {boarder.studentName || labels.student}
                </TableCell>
                <TableCell className="text-left">{formatCellValue(boarder.fatherName)}</TableCell>
                <TableCell className="text-left">{formatCellValue(boarder.className)}</TableCell>
                <TableCell className="text-left">
                  {formatCellValue(boarder.academicYearName || boarder.admissionYear)}
                </TableCell>
                <TableCell className="text-left">
                  {formatCellValue(boarder.admissionNumber)}
                </TableCell>
                <TableCell className="text-left">
                  {formatCellValue(boarder.residencyTypeName)}
                </TableCell>
                <TableCell>
                  <span className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                    {labels.waitingStatus}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-4 py-16 text-center shadow-sm">
      {icon}
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold">{title}</p>
      </div>
    </div>
  );
}

function SummaryMetricCard({
  title,
  value,
  icon,
  highlight = false,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground',
            highlight && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
          )}
        >
          {icon}
        </span>
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tracking-tight tabular-nums',
          highlight && 'text-amber-600 dark:text-amber-400'
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default HostelManagement;
