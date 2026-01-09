import { GraduationCap, Calendar, Building2, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import type { AdmissionRecord } from '@/types/domain/studentHistory';

interface AdmissionsSectionProps {
  admissions: AdmissionRecord[];
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const lowerStatus = status.toLowerCase();
  if (['active', 'admitted'].includes(lowerStatus)) return 'default';
  if (['pending'].includes(lowerStatus)) return 'secondary';
  if (['withdrawn', 'suspended', 'inactive'].includes(lowerStatus)) return 'destructive';
  return 'outline';
}

export function AdmissionsSection({ admissions }: AdmissionsSectionProps) {
  const { t } = useLanguage();

  if (admissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('studentHistory.noAdmissions') || 'No admission records found'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {admissions.map((admission, index) => (
        <Card key={admission.id} className={index === 0 ? 'border-primary' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">
                  {admission.class?.name || t('studentHistory.unknownClass') || 'Unknown Class'}
                  {admission.classAcademicYear?.sectionName && (
                    <span className="text-muted-foreground font-normal">
                      {' '}({admission.classAcademicYear.sectionName})
                    </span>
                  )}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {index === 0 && (
                  <Badge variant="outline" className="text-xs">
                    {t('studentHistory.current') || 'Current'}
                  </Badge>
                )}
                <Badge variant={getStatusBadgeVariant(admission.enrollmentStatus)}>
                  {admission.enrollmentStatus}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('studentHistory.admissionDate') || 'Admission Date'}</p>
                  <p className="font-medium">{admission.admissionDate ? formatDate(admission.admissionDate) : '-'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('studentHistory.academicYear') || 'Academic Year'}</p>
                  <p className="font-medium">{admission.academicYear?.name || '-'}</p>
                </div>
              </div>
              
              {admission.school && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">{t('studentHistory.school') || 'School'}</p>
                    <p className="font-medium">{admission.school.name}</p>
                  </div>
                </div>
              )}
              
              {admission.residencyType && (
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">{t('studentHistory.residencyType') || 'Residency'}</p>
                    <p className="font-medium">{admission.residencyType.name}</p>
                  </div>
                </div>
              )}
            </div>
            
            {(admission.shift || admission.enrollmentType || admission.isBoarder) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {admission.shift && (
                  <Badge variant="outline" className="text-xs">
                    {admission.shift} {t('studentHistory.shift') || 'Shift'}
                  </Badge>
                )}
                {admission.enrollmentType && (
                  <Badge variant="outline" className="text-xs">
                    {admission.enrollmentType}
                  </Badge>
                )}
                {admission.isBoarder && (
                  <Badge variant="secondary" className="text-xs">
                    {t('studentHistory.boarder') || 'Boarder'}
                  </Badge>
                )}
              </div>
            )}
            
            {admission.placementNotes && (
              <p className="text-sm text-muted-foreground pt-2 border-t">
                {admission.placementNotes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

