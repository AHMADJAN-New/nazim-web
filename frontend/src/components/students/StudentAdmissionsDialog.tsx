import { CalendarDays, GraduationCap, Pencil, Plus, School } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useStudentAdmissions, type AdmissionStatus, type StudentAdmission } from '@/hooks/useStudentAdmissions';
import { formatDate } from '@/lib/utils';
import type { Student } from '@/types/domain/student';

interface StudentAdmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onCreateAdmission?: (student: Student) => void;
  onEditAdmission?: (admission: StudentAdmission) => void;
}

const statusVariant = (
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

const getAdmissionStatusLabel = (
  status: AdmissionStatus,
  t: ReturnType<typeof useLanguage>['t']
) => {
  switch (status) {
    case 'pending':
      return t('admissions.pending') || 'Pending';
    case 'admitted':
      return t('admissions.admitted') || 'Admitted';
    case 'active':
      return t('events.active') || 'Active';
    case 'inactive':
      return t('events.inactive') || 'Inactive';
    case 'suspended':
      return t('students.suspended') || 'Suspended';
    case 'withdrawn':
      return t('admissions.withdrawn') || 'Withdrawn';
    case 'graduated':
      return t('students.graduated') || 'Graduated';
    default:
      return status;
  }
};

export function StudentAdmissionsDialog({
  open,
  onOpenChange,
  student,
  onCreateAdmission,
  onEditAdmission,
}: StudentAdmissionsDialogProps) {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const canReadAdmissions = Boolean(useHasPermission('student_admissions.read'));
  const canCreateAdmissions = Boolean(useHasPermission('student_admissions.create'));
  const canUpdateAdmissions = Boolean(useHasPermission('student_admissions.update'));

  const { data: admissions = [], isLoading } = useStudentAdmissions(
    profile?.organization_id,
    false,
    student?.id ? { student_id: student.id } : undefined,
    open && !!student?.id && canReadAdmissions
  );

  if (!student) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{student.fullName}</DialogTitle>
          <DialogDescription>
            {t('admissions.listDescription') || 'Review this student admission history and start a new admission when needed.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                {t('nav.admissions') || 'Admissions'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {student.admissionNumber || t('admissions.admissionNumber') || 'Admission #'}
                </Badge>
                <Badge variant="secondary">
                  {t(`students.${student.status}`) || student.status}
                </Badge>
                {student.latestAdmission ? (
                  <Badge variant={statusVariant(student.latestAdmission.enrollmentStatus)}>
                    {getAdmissionStatusLabel(student.latestAdmission.enrollmentStatus, t)}
                  </Badge>
                ) : null}
                {student.currentClass?.name ? (
                  <Badge variant="info">{student.currentClass.name}</Badge>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => onCreateAdmission?.(student)}
                  disabled={!canCreateAdmissions}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('admissions.newAdmission') || 'New Admission'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {!canReadAdmissions ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t('admissions.noPermissionToViewHistory') || 'You can start a new admission here, but you do not have permission to view this student admission history.'}
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : admissions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {t('admissions.noAdmissionsYet') || 'This student does not have any admission records yet.'}
              </CardContent>
            </Card>
          ) : (
            admissions.map((admission) => {
              const classLabel = admission.class?.name
                ? `${admission.class.name}${admission.classAcademicYear?.sectionName ? ` - ${admission.classAcademicYear.sectionName}` : ''}`
                : t('admissions.unassignedClass') || 'Not assigned to a class';
              const academicYearLabel =
                admission.academicYear?.name || admission.admissionYear || (t('academic.academicYears.academicYear') || 'Academic Year');

              return (
                <Card key={admission.id}>
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusVariant(admission.enrollmentStatus)}>
                            {getAdmissionStatusLabel(admission.enrollmentStatus, t)}
                          </Badge>
                          {admission.isLatestAdmissionForStudent ? (
                            <Badge variant="success">
                              {t('admissions.latest') || 'Latest'}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {admission.admissionDate ? formatDate(admission.admissionDate) : '—'}
                        </div>
                      </div>

                      {canUpdateAdmissions && onEditAdmission ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onEditAdmission(admission)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          {t('events.edit') || 'Edit'}
                        </Button>
                      ) : null}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <School className="h-3.5 w-3.5" />
                          {t('students.classSection') || 'Class / Section'}
                        </div>
                        <div className="mt-1 font-medium">{classLabel}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {admission.shift || (t('admissions.noShiftAssigned') || 'No shift assigned')}
                        </div>
                      </div>

                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {t('academic.academicYears.academicYear') || 'Academic Year'}
                        </div>
                        <div className="mt-1 font-medium">{academicYearLabel}</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          {admission.school?.schoolName || student.school?.schoolName || (t('students.school') || 'School')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StudentAdmissionsDialog;
