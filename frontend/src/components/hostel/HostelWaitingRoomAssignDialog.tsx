import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBuildings } from '@/hooks/useBuildings';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useUpdateStudentAdmission } from '@/hooks/useStudentAdmissions';
import { useHasPermission } from '@/hooks/usePermissions';
import { roomsApi } from '@/lib/api/client';
import { mapRoomApiToDomain } from '@/mappers/roomMapper';
import type * as RoomApi from '@/types/api/room';
import type { HostelUnassignedBoarder } from '@/types/domain/hostel';

export interface HostelWaitingRoomAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boarder: HostelUnassignedBoarder | null;
  onSuccess?: () => void;
}

export function HostelWaitingRoomAssignDialog({
  open,
  onOpenChange,
  boarder,
  onSuccess,
}: HostelWaitingRoomAssignDialogProps) {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const orgId = profile?.organization_id;
  const schoolId = profile?.default_school_id ?? undefined;

  const [buildingId, setBuildingId] = useState('');
  const [roomId, setRoomId] = useState('');

  const canUpdate = useHasPermission('student_admissions.update') === true;
  const updateAdmission = useUpdateStudentAdmission();

  const { data: buildings = [], isLoading: buildingsLoading } = useBuildings(schoolId, orgId);

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms', 'hostel-waiting-assign', schoolId, buildingId],
    queryFn: async () => {
      if (!schoolId || !buildingId) return [];
      const raw = await roomsApi.list({ school_id: schoolId, building_id: buildingId });
      return (raw as RoomApi.Room[]).map(mapRoomApiToDomain);
    },
    enabled: open && !!schoolId && !!buildingId,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!open) return;
    setBuildingId('');
    setRoomId('');
  }, [open, boarder?.id]);

  const roomOptions: ComboboxOption[] = useMemo(
    () =>
      rooms.map((room) => ({
        value: room.id,
        label: room.roomNumber
          ? room.building?.buildingName
            ? `${room.roomNumber} — ${room.building.buildingName}`
            : room.roomNumber
          : room.id,
      })),
    [rooms]
  );

  const studentLabel = boarder?.studentName?.trim() || t('hostel.student');

  const handleSubmit = async () => {
    if (!boarder || !roomId || !canUpdate) return;
    await updateAdmission.mutateAsync(
      { id: boarder.id, data: { roomId, isBoarder: true } },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const disableSubmit =
    !boarder || !buildingId || !roomId || !canUpdate || updateAdmission.isPending || buildingsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('hostel.waitingAssignRoomTitle')}</DialogTitle>
          <DialogDescription>
            {t('hostel.waitingAssignRoomDescription', { name: studentLabel })}
          </DialogDescription>
        </DialogHeader>

        {!schoolId ? (
          <Alert variant="destructive">
            <AlertDescription>{t('hostel.waitingNoSchoolContext')}</AlertDescription>
          </Alert>
        ) : null}

        {!canUpdate ? (
          <Alert>
            <AlertDescription>{t('hostel.waitingUpdatePermissionRequired')}</AlertDescription>
          </Alert>
        ) : null}

        {boarder ? (
          <div className="space-y-4 py-2">
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <p className="font-medium">{studentLabel}</p>
              <p className="text-muted-foreground text-xs">
                {[boarder.className, boarder.admissionNumber].filter(Boolean).join(' · ') ||
                  boarder.fatherName ||
                  ''}
              </p>
              {boarder.residencyTypeName ? (
                <p className="text-xs text-muted-foreground">
                  {t('hostel.residencyType')}: {boarder.residencyTypeName}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>{t('hostel.building')}</Label>
              <Select
                value={buildingId || '__none__'}
                onValueChange={(v) => {
                  setBuildingId(v === '__none__' ? '' : v);
                  setRoomId('');
                }}
                disabled={!schoolId || buildingsLoading || buildings.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('hostel.waitingSelectBuilding')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('hostel.waitingSelectBuilding')}</SelectItem>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.buildingName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('hostel.room')}</Label>
              <Combobox
                options={roomOptions}
                value={roomId}
                onValueChange={setRoomId}
                placeholder={t('hostel.waitingSelectRoom')}
                searchPlaceholder={t('admissions.searchRoom')}
                emptyText={t('admissions.noRoomsFound')}
                disabled={!buildingId || roomsLoading}
              />
              <p className="text-xs text-muted-foreground">{t('hostel.waitingRoomBuildingHint')}</p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateAdmission.isPending}>
            {t('events.cancel')}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={disableSubmit}>
            {updateAdmission.isPending ? t('events.processing') : t('hostel.waitingSaveAssignment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
