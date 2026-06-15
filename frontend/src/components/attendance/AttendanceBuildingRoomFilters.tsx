import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useBuildings } from '@/hooks/useBuildings';
import { useLanguage } from '@/hooks/useLanguage';
import { roomsApi } from '@/lib/api/client';
import { mapRoomApiToDomain } from '@/mappers/roomMapper';
import type * as RoomApi from '@/types/api/room';

type AttendanceBuildingRoomFiltersProps = {
  buildingId?: string;
  roomId?: string;
  onBuildingChange: (buildingId: string) => void;
  onRoomChange: (roomId: string) => void;
  className?: string;
};

export function AttendanceBuildingRoomFilters({
  buildingId = '',
  roomId = '',
  onBuildingChange,
  onRoomChange,
  className,
}: AttendanceBuildingRoomFiltersProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const schoolId = profile?.default_school_id ?? undefined;
  const organizationId = profile?.organization_id ?? undefined;

  const { data: buildings = [], isLoading: buildingsLoading } = useBuildings(schoolId, organizationId);

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', 'attendance-report-filters', schoolId, buildingId],
    queryFn: async () => {
      if (!schoolId || !buildingId) return [];
      const raw = await roomsApi.list({ school_id: schoolId, building_id: buildingId });
      return (raw as RoomApi.Room[]).map(mapRoomApiToDomain);
    },
    enabled: !!schoolId && !!buildingId,
  });

  const buildingOptions = useMemo(
    () => buildings.map((building) => ({ value: building.id, label: building.buildingName })),
    [buildings]
  );

  const roomOptions = useMemo(
    () => rooms.map((room) => ({ value: room.id, label: room.roomNumber })),
    [rooms]
  );

  const handleBuildingChange = (value: string) => {
    onBuildingChange(value);
    onRoomChange('');
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t('hostel.filterByBuilding')}</Label>
          <Combobox
            options={buildingOptions}
            value={buildingId}
            onValueChange={handleBuildingChange}
            placeholder={t('hostel.reports.allBuildings')}
            searchPlaceholder={t('hostel.building')}
            emptyText={t('hostel.reports.noBuildingsAvailable') || t('attendanceReports.noRecords')}
            disabled={buildingsLoading || !schoolId}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{t('hostel.room')}</Label>
          <Combobox
            options={roomOptions}
            value={roomId}
            onValueChange={onRoomChange}
            placeholder={t('hostel.reports.allRooms')}
            searchPlaceholder={t('hostel.room')}
            emptyText={t('hostel.noRoomsMatch') || t('attendanceReports.noRecords')}
            disabled={!buildingId || roomsLoading || !schoolId}
          />
        </div>
      </div>
    </div>
  );
}
