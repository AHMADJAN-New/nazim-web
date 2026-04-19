import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useLanguage } from '@/hooks/useLanguage';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useResidencyTypes } from '@/hooks/useResidencyTypes';
import { useRooms } from '@/hooks/useRooms';
import { useBulkAssignAdmissionPlacement } from '@/hooks/useStudentAdmissions';
import { useProfile } from '@/hooks/useProfiles';
import type { Student } from '@/types/domain/student';
import type { AdmissionStatus } from '@/types/domain/studentAdmission';

function getEffectiveCapacity(cay?: { capacity: number | null; class?: { defaultCapacity?: number | null } | null }): number | null {
  if (!cay) return null;
  if (cay.capacity !== null && cay.capacity !== undefined) return cay.capacity;
  const d = cay.class?.defaultCapacity;
  if (d !== null && d !== undefined) return d;
  return null;
}

export interface BulkAssignAdmissionFromStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentIds: string[];
  studentsPreview: Student[];
  /** When set, pre-selects this academic year in the dialog */
  defaultAcademicYearId?: string | null;
  onSuccess?: () => void;
}

export function BulkAssignAdmissionFromStudentsDialog({
  open,
  onOpenChange,
  studentIds,
  studentsPreview,
  defaultAcademicYearId,
  onSuccess,
}: BulkAssignAdmissionFromStudentsDialogProps) {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const orgId = profile?.organization_id;

  const [academicYearId, setAcademicYearId] = useState<string>('');
  const [classAcademicYearId, setClassAcademicYearId] = useState<string>('');
  const [isBoarder, setIsBoarder] = useState(false);
  const [residencyTypeId, setResidencyTypeId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<AdmissionStatus | ''>('');
  const [onlyWithoutClass, setOnlyWithoutClass] = useState(true);

  const { data: academicYears = [] } = useAcademicYears(orgId);
  const { data: classAcademicYears = [] } = useClassAcademicYears(academicYearId || undefined, orgId);
  const { data: residencyTypes = [] } = useResidencyTypes(orgId);
  const { data: rooms = [] } = useRooms(undefined, orgId);

  const bulkAssign = useBulkAssignAdmissionPlacement();

  useEffect(() => {
    if (!open) return;
    const initialYear =
      (defaultAcademicYearId && defaultAcademicYearId !== 'all' ? defaultAcademicYearId : '') ||
      academicYears[0]?.id ||
      '';
    setAcademicYearId(initialYear);
    setClassAcademicYearId('');
    setIsBoarder(false);
    setResidencyTypeId('');
    setRoomId('');
    setEnrollmentStatus('');
    setOnlyWithoutClass(true);
  }, [open, defaultAcademicYearId, academicYears]);

  const roomOptions: ComboboxOption[] = useMemo(
    () =>
      (rooms || []).map((room) => ({
        value: room.id,
        label:
          room.roomNumber || room.building?.buildingName
            ? `${room.roomNumber ?? ''}${room.building?.buildingName ? ` — ${room.building.buildingName}` : ''}`.trim()
            : room.id,
      })),
    [rooms]
  );

  const previewRows = useMemo(() => {
    const set = new Set(studentIds);
    return studentsPreview.filter((s) => set.has(s.id));
  }, [studentIds, studentsPreview]);

  const handleSubmit = async () => {
    if (!classAcademicYearId || studentIds.length === 0) return;
    await bulkAssign.mutateAsync(
      {
        student_ids: studentIds,
        class_academic_year_id: classAcademicYearId,
        is_boarder: isBoarder,
        residency_type_id: residencyTypeId || null,
        room_id: isBoarder && roomId ? roomId : null,
        enrollment_status: enrollmentStatus || undefined,
        only_without_class: onlyWithoutClass,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess?.();
        },
      }
    );
  };

  const disableSubmit =
    !classAcademicYearId ||
    !academicYearId ||
    studentIds.length === 0 ||
    bulkAssign.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('admissions.bulkAssignFromStudentsTitle')}</DialogTitle>
          <DialogDescription>{t('admissions.bulkAssignFromStudentsDescription', { count: studentIds.length })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium text-foreground">{t('admissions.bulkAssignPreviewHeading')}</p>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-muted-foreground">
              {previewRows.slice(0, 12).map((s) => (
                <li key={s.id} className="truncate">
                  {s.fullName}
                  {s.applyingGrade ? (
                    <span className="text-xs"> — {t('students.applyingGrade')}: {s.applyingGrade}</span>
                  ) : null}
                </li>
              ))}
              {previewRows.length > 12 ? (
                <li className="text-xs">{t('admissions.bulkAssignPreviewMore', { count: previewRows.length - 12 })}</li>
              ) : null}
            </ul>
          </div>

          <div className="space-y-2">
            <Label>{t('admissions.academicYear')}</Label>
            <Select value={academicYearId} onValueChange={(v) => { setAcademicYearId(v); setClassAcademicYearId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder={t('admissions.selectAcademicYear')} />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('students.classSection')}</Label>
            <Select value={classAcademicYearId} onValueChange={setClassAcademicYearId} disabled={!academicYearId}>
              <SelectTrigger>
                <SelectValue placeholder={t('admissions.selectClassSection')} />
              </SelectTrigger>
              <SelectContent>
                {classAcademicYears.map((cay) => {
                  const cap = getEffectiveCapacity(cay);
                  const full = cap !== null && cay.currentStudentCount !== undefined && (cay.currentStudentCount ?? 0) >= cap;
                  return (
                    <SelectItem key={cay.id} value={cay.id} disabled={full}>
                      {cay.class?.name ?? cay.classId}
                      {cay.sectionName ? ` — ${cay.sectionName}` : ''}
                      {cap !== null && cay.currentStudentCount !== undefined ? (
                        <span className="text-muted-foreground"> ({cay.currentStudentCount}/{cap})</span>
                      ) : null}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-2 rounded-md border p-3">
            <Checkbox
              id="only-without-class"
              checked={onlyWithoutClass}
              onCheckedChange={(v) => setOnlyWithoutClass(v === true)}
            />
            <div className="grid gap-1">
              <Label htmlFor="only-without-class" className="cursor-pointer font-medium leading-none">
                {t('admissions.bulkAssignOnlyWithoutClass')}
              </Label>
              <p className="text-xs text-muted-foreground">{t('admissions.bulkAssignOnlyWithoutClassHint')}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('admissions.residencyType')}</Label>
              <Select
                value={residencyTypeId}
                onValueChange={(v) => {
                  setResidencyTypeId(v);
                  const rt = residencyTypes.find((x) => x.id === v);
                  if (rt?.code?.toLowerCase() === 'day') {
                    setIsBoarder(false);
                    setRoomId('');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admissions.selectResidency')} />
                </SelectTrigger>
                <SelectContent>
                  {residencyTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('admissions.boarder')}</Label>
              <Select
                value={isBoarder ? 'yes' : 'no'}
                onValueChange={(v) => {
                  const b = v === 'yes';
                  setIsBoarder(b);
                  if (!b) setRoomId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('admissions.boarderYes')}</SelectItem>
                  <SelectItem value="no">{t('admissions.boarderNo')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isBoarder ? (
            <div className="space-y-2">
              <Label>{t('admissions.roomDorm')}</Label>
              <Combobox
                options={roomOptions}
                value={roomId}
                onValueChange={setRoomId}
                placeholder={t('admissions.assignRoom')}
                searchPlaceholder={t('admissions.searchRoom')}
                emptyText={t('admissions.noRoomsFound')}
              />
              <p className="text-xs text-muted-foreground">{t('admissions.bulkAssignRoomHint')}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>{t('admissions.enrollmentStatus')} ({t('common.optional')})</Label>
            <Select value={enrollmentStatus || '__keep__'} onValueChange={(v) => setEnrollmentStatus(v === '__keep__' ? '' : (v as AdmissionStatus))}>
              <SelectTrigger>
                <SelectValue placeholder={t('admissions.bulkAssignKeepStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__keep__">{t('admissions.bulkAssignKeepStatus')}</SelectItem>
                <SelectItem value="pending">{t('admissions.pending')}</SelectItem>
                <SelectItem value="admitted">{t('admissions.admitted')}</SelectItem>
                <SelectItem value="active">{t('admissions.active')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={bulkAssign.isPending}>
            {t('events.cancel')}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={disableSubmit}>
            {bulkAssign.isPending ? t('events.processing') : t('admissions.bulkAssignSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
