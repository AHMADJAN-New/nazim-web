import { User, GraduationCap, Home, FileText, Pencil, Trash2, DollarSign, UserRound, CalendarDays, Clock, School } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/useLanguage';
import { useSchools } from '@/hooks/useSchools';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useResidencyTypes } from '@/hooks/useResidencyTypes';
import { useRooms } from '@/hooks/useRooms';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useStudentAdmissions, type StudentAdmission, type AdmissionStatus } from '@/hooks/useStudentAdmissions';
import { cn, formatDate } from '@/lib/utils';

interface AdmissionDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admission: StudentAdmission | null;
  onEdit?: (admission: StudentAdmission) => void;
  onDelete?: (admission: StudentAdmission) => void;
  /** Switch the panel to another admission for the same student */
  onSelectAdmission?: (admission: StudentAdmission) => void;
}

const panelStatusVariant = (
  status: AdmissionStatus
): 'success' | 'info' | 'warning' | 'outline' | 'destructive' | 'secondary' => {
  switch (status) {
    case 'active':
      return 'success';
    case 'admitted':
      return 'info';
    case 'pending':
      return 'warning';
    case 'inactive':
      return 'secondary';
    case 'suspended':
      return 'warning';
    case 'withdrawn':
      return 'destructive';
    case 'graduated':
      return 'success';
    default:
      return 'secondary';
  }
};

const enrollmentLabel = (status: AdmissionStatus, t: ReturnType<typeof useLanguage>['t']) => {
  switch (status) {
    case 'pending':
      return t('admissions.pending');
    case 'admitted':
      return t('admissions.admitted');
    case 'active':
      return t('events.active');
    case 'inactive':
      return t('events.inactive');
    case 'suspended':
      return t('students.suspended');
    case 'withdrawn':
      return t('admissions.withdrawn');
    case 'graduated':
      return t('students.graduated');
    default:
      return status;
  }
};

export function AdmissionDetailsPanel({
  open,
  onOpenChange,
  admission,
  onEdit,
  onDelete,
  onSelectAdmission,
}: AdmissionDetailsPanelProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const orgIdForQuery = profile?.organization_id;
  const canReadAdmissions = Boolean(useHasPermission('student_admissions.read'));

  const { data: schools } = useSchools(orgIdForQuery);
  const { data: classAcademicYears } = useClassAcademicYears(admission?.academicYearId ?? undefined, orgIdForQuery);
  const { data: residencyTypes } = useResidencyTypes(orgIdForQuery);
  const { data: rooms } = useRooms(undefined, orgIdForQuery);

  const { data: studentAdmissionsList = [], isLoading: loadingStudentAdmissions } = useStudentAdmissions(
    orgIdForQuery,
    false,
    admission?.studentId ? { student_id: admission.studentId } : undefined,
    open && !!admission?.studentId && canReadAdmissions
  );

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const student = admission?.student;

  const sortedStudentAdmissions = useMemo(() => {
    return [...studentAdmissionsList].sort(
      (a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime()
    );
  }, [studentAdmissionsList]);

  const cayFromApi = admission?.classAcademicYear;
  const resolvedCay = useMemo(
    () => classAcademicYears?.find((c) => c.id === admission?.classAcademicYearId),
    [classAcademicYears, admission?.classAcademicYearId]
  );

  const sectionName = cayFromApi?.sectionName ?? resolvedCay?.sectionName ?? null;
  const classNameDisplay = admission?.class?.name ?? resolvedCay?.class?.name ?? null;
  const teacherDisplay = cayFromApi?.teacher?.fullName ?? resolvedCay?.teacher?.fullName ?? null;
  const classroomLine = useMemo(() => {
    const r = cayFromApi?.room ?? resolvedCay?.room;
    if (!r?.roomNumber) return null;
    const b = r.building?.buildingName;
    return b ? `${r.roomNumber} — ${b}` : r.roomNumber;
  }, [cayFromApi, resolvedCay]);
  const sectionNotesDisplay = (cayFromApi?.notes ?? resolvedCay?.notes)?.trim() || null;

  useEffect(() => {
    const hasPicture = student?.picturePath && student.picturePath.trim() !== '' && student?.id;

    if (hasPicture && open) {
      let currentBlobUrl: string | null = null;

      const fetchImage = async () => {
        try {
          const { apiClient } = await import('@/lib/api/client');
          const token = apiClient.getToken();
          const url = `/api/students/${student.id}/picture`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Accept: 'image/*',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
          });

          if (!response.ok) {
            if (response.status === 404) {
              setImageError(true);
              return;
            }
            throw new Error(`Failed to fetch image: ${response.status}`);
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          currentBlobUrl = blobUrl;
          setImageUrl(blobUrl);
          setImageError(false);
        } catch (error) {
          if (import.meta.env.DEV && error instanceof Error && !error.message.includes('404')) {
            console.error('Failed to fetch student picture:', error);
          }
          setImageError(true);
        }
      };

      void fetchImage();

      return () => {
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
        }
      };
    } else {
      setImageUrl(null);
      setImageError(true);
    }
  }, [student?.id, student?.picturePath, open]);

  if (!admission) return null;

  const school = schools?.find((s) => s.id === admission.schoolId);
  const residencyType = residencyTypes?.find((rt) => rt.id === admission.residencyTypeId);
  const room = rooms?.find((r) => r.id === admission.roomId);

  const InfoRow = ({ label, value }: { label: string; value: string | React.ReactNode | null | undefined }) => (
    <div className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="text-sm font-medium text-foreground sm:max-w-[65%] sm:text-end">{value ?? '—'}</div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <div className="shrink-0 space-y-1 border-b bg-gradient-to-br from-primary/5 via-background to-background px-5 pb-4 pt-6">
          <SheetHeader className="space-y-2 text-start">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="text-xl font-semibold tracking-tight">
                {t('admissions.admissionDetails')}
              </SheetTitle>
              <Badge variant={panelStatusVariant(admission.enrollmentStatus)} className="shrink-0">
                {enrollmentLabel(admission.enrollmentStatus, t)}
              </Badge>
              {admission.isLatestAdmissionForStudent ? (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {t('admissions.latest')}
                </Badge>
              ) : null}
            </div>
            <SheetDescription className="text-sm text-muted-foreground">
              {admission.student?.fullName || admission.student?.full_name || t('admissions.student')} ·{' '}
              {admission.academicYear?.name || t('academic.academicYears.academicYear')}
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mx-auto flex max-w-full flex-col gap-5">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
              <div className="relative shrink-0">
                {imageUrl && !imageError ? (
                  <img
                    src={imageUrl}
                    alt={admission.student?.fullName || admission.student?.full_name || 'Student'}
                    className="h-24 w-24 rounded-full border-4 border-background object-cover shadow-md sm:h-28 sm:w-28"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-border bg-muted shadow-md sm:h-28 sm:w-28">
                    <UserRound className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1 text-center sm:text-start">
                <h3 className="text-lg font-semibold leading-tight">
                  {admission.student?.fullName || admission.student?.full_name || t('admissions.student')}
                </h3>
                {admission.student?.admissionNumber || admission.student?.admission_no ? (
                  <p className="font-mono text-sm text-muted-foreground">
                    {t('admissions.admissionNumber')}: {admission.student?.admissionNumber || admission.student?.admission_no}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">{school?.schoolName || '—'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {onEdit ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onEdit(admission);
                    onOpenChange(false);
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  {t('events.edit')}
                </Button>
              ) : null}
              {admission.studentId ? (
                <Button variant="outline" size="sm" onClick={() => navigate(`/students/${admission.studentId}/fees`)}>
                  <DollarSign className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                  {t('fees.studentFeeAssignments')}
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    onDelete(admission);
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('events.delete')}
                </Button>
              ) : null}
            </div>

            <Card className="overflow-hidden border-primary/15 shadow-sm">
              <CardHeader className="space-y-0 border-b bg-muted/30 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {t('admissions.classPlacement')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 p-3 sm:grid-cols-2">
                <InfoRow label={t('admissions.academicYear')} value={admission.academicYear?.name || '—'} />
                <InfoRow label={t('search.class')} value={classNameDisplay || '—'} />
                <InfoRow label={t('students.classSection')} value={sectionName || '—'} />
                <InfoRow
                  label={t('admissions.shift')}
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {admission.shift?.trim() ? admission.shift : '—'}
                    </span>
                  }
                />
                <InfoRow label={t('admissions.homeroomTeacher')} value={teacherDisplay || '—'} />
                <InfoRow label={t('admissions.homeroomRoom')} value={classroomLine || '—'} />
                {sectionNotesDisplay ? (
                  <div className="sm:col-span-2">
                    <InfoRow label={t('admissions.sectionNotes')} value={<span className="whitespace-pre-wrap">{sectionNotesDisplay}</span>} />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="space-y-0 border-b bg-muted/30 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <User className="h-4 w-4 text-primary" />
                  {t('admissions.basicInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 p-3 sm:grid-cols-2">
                <InfoRow label={t('admissions.student')} value={admission.student?.fullName || admission.student?.full_name || '—'} />
                <InfoRow label={t('admissions.school')} value={school?.schoolName || '—'} />
                <InfoRow
                  label={t('events.status')}
                  value={
                    <Badge variant={panelStatusVariant(admission.enrollmentStatus)}>
                      {enrollmentLabel(admission.enrollmentStatus, t)}
                    </Badge>
                  }
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="space-y-0 border-b bg-muted/30 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Home className="h-4 w-4 text-primary" />
                  {t('admissions.residencyInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 p-3 sm:grid-cols-2">
                <InfoRow label={t('admissions.residencyType')} value={residencyType?.name || '—'} />
                <InfoRow
                  label={t('admissions.roomDorm')}
                  value={
                    admission.isBoarder
                      ? (room
                          ? `${room.roomNumber || ''}${room.building?.buildingName ? ` — ${room.building.buildingName}` : ''}`.trim() ||
                            room.id
                          : '—')
                      : t('admissions.notRequired')
                  }
                />
                <InfoRow
                  label={t('admissions.boarder')}
                  value={admission.isBoarder ? t('admissions.boarderYes') : t('admissions.boarderNo')}
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden shadow-sm">
              <CardHeader className="space-y-0 border-b bg-muted/30 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" />
                  {t('admissions.additionalInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 p-3 sm:grid-cols-2">
                <InfoRow label={t('admissions.admissionYear')} value={admission.admissionYear || '—'} />
                <InfoRow
                  label={t('studentReportCard.admissionDate')}
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {admission.admissionDate ? formatDate(admission.admissionDate) : '—'}
                    </span>
                  }
                />
                <InfoRow label={t('admissions.enrollmentType')} value={admission.enrollmentType || '—'} />
                <InfoRow label={t('admissions.feeStatus')} value={admission.feeStatus || '—'} />
                {admission.placementNotes ? (
                  <div className="sm:col-span-2">
                    <InfoRow
                      label={t('admissions.placementNotes')}
                      value={<span className="whitespace-pre-wrap">{admission.placementNotes}</span>}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {canReadAdmissions && admission.studentId ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">{t('admissions.allAdmissionsForStudent')}</h4>
                  {loadingStudentAdmissions ? (
                    <span className="text-xs text-muted-foreground">{t('common.loading')}</span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{t('admissions.selectAdmissionHint')}</p>
                <div className="space-y-2">
                  {sortedStudentAdmissions.map((row) => {
                    const active = row.id === admission.id;
                    const yearName = row.academicYear?.name || row.admissionYear || '—';
                    const cls = row.class?.name || t('admissions.unassignedClass');
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => {
                          if (active) return;
                          onSelectAdmission?.(row);
                        }}
                        className={cn(
                          'w-full rounded-lg border p-3 text-start transition-colors',
                          active
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <School className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium">{yearName}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="truncate text-sm text-muted-foreground">{cls}</span>
                          </div>
                          <Badge variant={panelStatusVariant(row.enrollmentStatus)} className="shrink-0 text-xs">
                            {enrollmentLabel(row.enrollmentStatus, t)}
                          </Badge>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {row.admissionDate ? <span>{formatDate(row.admissionDate)}</span> : null}
                          {row.isLatestAdmissionForStudent ? (
                            <Badge variant="outline" className="text-[10px]">
                              {t('admissions.latest')}
                            </Badge>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <Separator className="opacity-60" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
