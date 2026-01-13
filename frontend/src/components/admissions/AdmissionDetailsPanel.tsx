import { User, GraduationCap, Home, FileText, Pencil, Trash2, DollarSign, X, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

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
import type { StudentAdmission, AdmissionStatus } from '@/hooks/useStudentAdmissions';
import { formatDate } from '@/lib/utils';

interface AdmissionDetailsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admission: StudentAdmission | null;
  onEdit?: (admission: StudentAdmission) => void;
  onDelete?: (admission: StudentAdmission) => void;
}

const statusVariant = (status: AdmissionStatus) => {
  switch (status) {
    case 'active':
      return 'default';
    case 'admitted':
    case 'pending':
      return 'secondary';
    case 'inactive':
    case 'suspended':
      return 'outline';
    case 'withdrawn':
      return 'destructive';
    case 'graduated':
      return 'default';
    default:
      return 'secondary';
  }
};

export function AdmissionDetailsPanel({ 
  open, 
  onOpenChange, 
  admission, 
  onEdit,
  onDelete 
}: AdmissionDetailsPanelProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const orgIdForQuery = profile?.organization_id;

  const { data: schools } = useSchools(orgIdForQuery);
  const { data: classAcademicYears } = useClassAcademicYears(admission?.academicYearId, orgIdForQuery);
  const { data: residencyTypes } = useResidencyTypes(orgIdForQuery);
  const { data: rooms } = useRooms(undefined, orgIdForQuery);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const student = admission?.student;

  // Fetch student picture
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
              'Accept': 'image/*',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
      
      fetchImage();
      
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
  const classAcademicYear = classAcademicYears?.find((cay) => cay.id === admission.classAcademicYearId);
  const residencyType = residencyTypes?.find((t) => t.id === admission.residencyTypeId);
  const room = rooms?.find((r) => r.id === admission.roomId);

  const InfoRow = ({ label, value }: { label: string; value: string | React.ReactNode | null | undefined }) => (
    <div className="flex justify-between items-start py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground text-right flex-1 ml-4">
        {value || '—'}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('admissions.admissionDetails') || 'Admission Details'}
          </SheetTitle>
          <SheetDescription>
            {admission.student?.fullName || admission.student?.full_name || 'Student'} - {t('admissions.admissionInformation') || 'Admission Information'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Student Image */}
          <div className="flex justify-center">
            <div className="relative">
              {imageUrl && !imageError ? (
                <img
                  src={imageUrl}
                  alt={admission.student?.fullName || admission.student?.full_name || 'Student'}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-border shadow-lg"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-muted flex items-center justify-center border-4 border-border shadow-lg">
                  <UserRound className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              {admission.student?.fullName || admission.student?.full_name || t('admissions.student') || 'Student'}
            </h3>
            {admission.student?.admissionNumber || admission.student?.admission_no ? (
              <p className="text-sm text-muted-foreground mt-1">
                {t('admissions.admissionNumber') || 'Admission #'}: {admission.student?.admissionNumber || admission.student?.admission_no}
              </p>
            ) : null}
          </div>
          <Separator />
          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onEdit(admission);
                  onOpenChange(false);
                }}
                className="flex-1 sm:flex-initial"
              >
                <Pencil className="h-4 w-4 mr-2" />
                {t('events.edit') || 'Edit'}
              </Button>
            )}
            {admission.studentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/students/${admission.studentId}/fees`)}
                className="flex-1 sm:flex-initial"
              >
                <DollarSign className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                {t('fees.studentFeeAssignments') || 'Fees'}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onDelete(admission);
                  onOpenChange(false);
                }}
                className="flex-1 sm:flex-initial text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('events.delete') || 'Delete'}
              </Button>
            )}
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {t('admissions.basicInfo') || 'Basic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow 
                label={t('admissions.student') || 'Student'} 
                value={admission.student?.fullName || admission.student?.full_name || '—'} 
              />
              <InfoRow 
                label={t('admissions.school') || 'School'} 
                value={school?.schoolName || '—'} 
              />
              <InfoRow 
                label={t('admissions.admissionNumber') || 'Admission Number'} 
                value={admission.student?.admissionNumber || admission.student?.admission_no || '—'} 
              />
              <InfoRow 
                label={t('events.status') || 'Status'} 
                value={
                  <Badge variant={statusVariant(admission.enrollmentStatus)}>
                    {admission.enrollmentStatus === 'pending' ? t('admissions.pending') :
                     admission.enrollmentStatus === 'admitted' ? t('admissions.admitted') :
                     admission.enrollmentStatus === 'active' ? t('events.active') :
                     admission.enrollmentStatus === 'inactive' ? t('events.inactive') :
                     admission.enrollmentStatus === 'suspended' ? t('students.suspended') :
                     admission.enrollmentStatus === 'withdrawn' ? t('admissions.withdrawn') :
                     admission.enrollmentStatus === 'graduated' ? t('students.graduated') :
                     admission.enrollmentStatus}
                  </Badge>
                } 
              />
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-4 w-4" />
                {t('students.academicInfo') || 'Academic Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow 
                label={t('admissions.academicYear') || 'Academic Year'} 
                value={admission.academicYear?.name || '—'} 
              />
              <InfoRow 
                label={t('search.class') || 'Class'} 
                value={admission.class?.name || '—'} 
              />
              <InfoRow 
                label={t('students.classSection') || 'Section'} 
                value={classAcademicYear?.sectionName || '—'} 
              />
              <InfoRow 
                label={t('admissions.shift') || 'Shift'} 
                value={admission.shift || '—'} 
              />
            </CardContent>
          </Card>

          {/* Residency Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4" />
                {t('admissions.residencyInfo') || 'Residency Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow 
                label={t('admissions.residencyType') || 'Residency Type'} 
                value={residencyType?.name || '—'} 
              />
              <InfoRow 
                label={t('admissions.roomDorm') || 'Room / Dorm'} 
                value={room ? `${room.roomNumber || ''}${room.building?.buildingName ? ` - ${room.building.buildingName}` : ''}`.trim() || room.id : '—'} 
              />
              <InfoRow 
                label={t('admissions.boarder') || 'Boarder'} 
                value={admission.isBoarder ? (t('admissions.boarderYes') || 'Yes') : (t('admissions.boarderNo') || 'No')} 
              />
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {t('admissions.additionalInfo') || 'Additional Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <InfoRow 
                label={t('admissions.admissionYear') || 'Admission Year'} 
                value={admission.admissionYear || '—'} 
              />
              <InfoRow 
                label={t('studentReportCard.admissionDate') || 'Admission Date'} 
                value={admission.admissionDate ? formatDate(admission.admissionDate) : '—'} 
              />
              <InfoRow 
                label={t('admissions.enrollmentType') || 'Enrollment Type'} 
                value={admission.enrollmentType || '—'} 
              />
              <InfoRow 
                label={t('admissions.feeStatus') || 'Fee Status'} 
                value={admission.feeStatus || '—'} 
              />
              {admission.placementNotes && (
                <div className="py-2 border-b last:border-0">
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    {t('admissions.placementNotes') || 'Placement Notes'}
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {admission.placementNotes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
