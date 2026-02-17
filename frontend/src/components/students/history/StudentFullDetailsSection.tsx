import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, User, MapPin, Phone, Mail, Users, FileText, Building2, Heart, DollarSign } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';
import type { StudentBasicInfo } from '@/types/domain/studentHistory';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PrivateImage } from '@/components/PrivateImage';

interface StudentFullDetailsSectionProps {
  student: StudentBasicInfo;
}

export function StudentFullDetailsSection({ student }: StudentFullDetailsSectionProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Helper to render a field
  const renderField = (label: string, value: string | number | boolean | null | undefined, icon?: React.ReactNode) => {
    if (value === null || value === undefined || value === '') return null;
    
    return (
      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
        <div className="flex items-center gap-2 min-w-[140px] text-sm text-muted-foreground">
          {icon && <span className="h-4 w-4">{icon}</span>}
          <span>{label}:</span>
        </div>
        <div className="text-sm font-medium flex-1">
          {typeof value === 'boolean' ? (value ? t('common.yes') || 'Yes' : t('common.no') || 'No') : String(value)}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('studentHistory.fullDetails') || 'Full Student Details'}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Photo (when private URL or path available) */}
            {(student.picturePath || (student as { pictureUrl?: string | null }).pictureUrl) && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {t('students.photo') || 'Photo'}
                </h3>
                <div className="rounded-lg overflow-hidden border bg-muted/50 w-24 h-24 shrink-0">
                  <PrivateImage
                    src={(student as { pictureUrl?: string | null }).pictureUrl ?? student.picturePath ?? null}
                    alt={student.fullName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <Separator />
              </div>
            )}

            {/* Personal Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('studentHistory.personalInformation') || 'Personal Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderField(t('students.fullName') || 'Full Name', student.fullName)}
                {renderField(t('students.firstName') || 'First Name', student.firstName)}
                {renderField(t('students.lastName') || 'Last Name', student.lastName)}
                {renderField(t('students.fatherName') || 'Father Name', student.fatherName)}
                {renderField(t('students.grandfatherName') || 'Grandfather Name', student.grandfatherName)}
                {renderField(t('students.motherName') || 'Mother Name', student.motherName)}
                {renderField(t('students.gender') || 'Gender', student.gender)}
                {renderField(t('students.dateOfBirth') || 'Date of Birth', student.dateOfBirth ? formatDate(student.dateOfBirth) : null)}
                {renderField(t('students.birthYear') || 'Birth Year', student.birthYear)}
                {renderField(t('students.age') || 'Age', student.age ? `${student.age} ${t('common.years') || 'years'}` : null)}
                {renderField(t('students.nationality') || 'Nationality', student.nationality)}
                {renderField(t('students.preferredLanguage') || 'Preferred Language', student.preferredLanguage)}
                {renderField(t('students.isOrphan') || 'Is Orphan', student.isOrphan)}
                {renderField(t('students.disabilityStatus') || 'Disability Status', student.disabilityStatus)}
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {t('studentHistory.contactInformation') || 'Contact Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderField(t('students.phone') || 'Phone', student.phone, <Phone className="h-4 w-4" />)}
                {renderField(t('students.email') || 'Email', student.email, <Mail className="h-4 w-4" />)}
                {renderField(t('students.homeAddress') || 'Home Address', student.homeAddress, <MapPin className="h-4 w-4" />)}
                {renderField(t('students.emergencyContactName') || 'Emergency Contact Name', student.emergencyContactName)}
                {renderField(t('students.emergencyContactPhone') || 'Emergency Contact Phone', student.emergencyContactPhone)}
              </div>
            </div>

            <Separator />

            {/* Location Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('studentHistory.locationInformation') || 'Location Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    {t('studentHistory.originLocation') || 'Origin Location'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {renderField(t('students.province') || 'Province', student.origProvince)}
                    {renderField(t('students.district') || 'District', student.origDistrict)}
                    {renderField(t('students.village') || 'Village', student.origVillage)}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    {t('studentHistory.currentLocation') || 'Current Location'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {renderField(t('students.province') || 'Province', student.currProvince)}
                    {renderField(t('students.district') || 'District', student.currDistrict)}
                    {renderField(t('students.village') || 'Village', student.currVillage)}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Guardian Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('studentHistory.guardianInformation') || 'Guardian Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderField(t('students.guardianName') || 'Guardian Name', student.guardianName)}
                {renderField(t('students.guardianRelation') || 'Relation', student.guardianRelation)}
                {renderField(t('students.guardianPhone') || 'Guardian Phone', student.guardianPhone, <Phone className="h-4 w-4" />)}
                {renderField(t('students.guardianTazkira') || 'Guardian Tazkira', student.guardianTazkira)}
              </div>
            </div>

            <Separator />

            {/* Zamin (Guarantor) Information */}
            {(student.zaminName || student.zaminPhone || student.zaminTazkira || student.zaminAddress) && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {t('studentHistory.zaminInformation') || 'Zamin (Guarantor) Information'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {renderField(t('students.zaminName') || 'Zamin Name', student.zaminName)}
                    {renderField(t('students.zaminPhone') || 'Zamin Phone', student.zaminPhone, <Phone className="h-4 w-4" />)}
                    {renderField(t('students.zaminTazkira') || 'Zamin Tazkira', student.zaminTazkira)}
                    {renderField(t('students.zaminAddress') || 'Zamin Address', student.zaminAddress, <MapPin className="h-4 w-4" />)}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Academic Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t('studentHistory.academicInformation') || 'Academic Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderField(t('students.admissionYear') || 'Admission Year', student.admissionYear)}
                {renderField(t('students.applyingGrade') || 'Applying Grade', student.applyingGrade)}
                {renderField(t('students.previousSchool') || 'Previous School', student.previousSchool)}
                {renderField(t('students.admissionFeeStatus') || 'Admission Fee Status', student.admissionFeeStatus)}
              </div>
            </div>

            <Separator />

            {/* Financial Information */}
            {student.familyIncome && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    {t('studentHistory.financialInformation') || 'Financial Information'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {renderField(t('students.familyIncome') || 'Family Income', student.familyIncome)}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* System Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('studentHistory.systemInformation') || 'System Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {renderField(t('students.studentCode') || 'Student Code', student.studentCode)}
                {renderField(t('students.cardNumber') || 'Card Number', student.cardNumber)}
                {renderField(t('students.status') ?? 'Status', student.status)}
                {renderField(t('common.createdAt') || 'Created At', student.createdAt ? formatDate(student.createdAt) : null)}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}


