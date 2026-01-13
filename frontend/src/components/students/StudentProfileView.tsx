import { 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  FileText, 
  School, 
  Users, 
  Shield,
  Heart,
  AlertCircle,
  Home,
  UserCircle,
  Printer,
  BookOpen,
  AlertTriangle,
  Download,
  CheckCircle
} from 'lucide-react';
import React, { useMemo, useState, useEffect, memo } from 'react';

import { StudentProfilePrint } from './StudentProfilePrint';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useSchools } from '@/hooks/useSchools';
import {
  useStudentDocuments,
  useStudentEducationalHistory,
  useStudentDisciplineRecords,
  usePrintStudentProfile,
} from '@/hooks/useStudents';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { Student } from '@/types/domain/student';

interface StudentProfileViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

interface InfoRowProps {
  label: string;
  value: string | number | null | undefined;
  icon?: React.ReactNode;
}

function InfoRow({ label, value, icon }: InfoRowProps) {
  if (!value) return null;
  
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="text-base font-semibold break-words">{String(value)}</div>
      </div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
      </CardContent>
    </Card>
  );
}

// PERFORMANCE: Memoized to prevent unnecessary re-renders
export const StudentProfileView = memo(function StudentProfileView({ open, onOpenChange, student }: StudentProfileViewProps) {
  const { data: profile } = useProfile();
  const { isRTL, t } = useLanguage();
  const yesText = isRTL ? 'هو' : 'Yes';
  const noText = isRTL ? 'نه' : 'No';
  const hasStudentsPermission = useHasPermission('students.read');
  const orgIdForQuery = profile?.organization_id;
  const { data: schools } = useSchools(orgIdForQuery);
  
  // Fetch documents, history, and discipline records - only when dialog is open
  // PERFORMANCE: Conditional fetching prevents unnecessary API calls when dialog is closed
  const { data: documents } = useStudentDocuments(open ? student?.id : undefined);
  const { data: educationalHistory } = useStudentEducationalHistory(open ? student?.id : undefined);
  const { data: disciplineRecords } = useStudentDisciplineRecords(open ? student?.id : undefined);
  const printProfile = usePrintStudentProfile();

  const printText = isRTL
    ? {
        title: 'د زده کوونکي انفرادي معلومات',
        personal: 'شخصي معلومات',
        guardianLabel: 'سرپرست',
        studentLabel: 'زده کونکی',
        name: 'نوم',
        fatherName: 'د پلار نوم',
        idNumber: 'ID',
        grandfatherName: 'د نیکه نوم',
        birthYear: 'د زیږون کال',
        tazkiraNumber: 'تذکره نمبر',
        admissionSection: 'د داخلې معلومات',
        cardNumber: 'کارډ نمبر',
        admissionNo: 'اساس نمبر',
        admissionYear: 'د شمولیت کال',
        applyingGrade: 'د داخلې درجه',
        schoolLabel: 'مدرسه / ښوونځی',
        addressSection: 'استوګنځای معلومات',
        originProvince: 'اصلي ولایت',
        originDistrict: 'اصلي ولسوالۍ',
        originVillage: 'اصلي کلی',
        currentProvince: 'فعلي ولایت',
        currentDistrict: 'فعلي ولسوالۍ',
        currentVillage: 'فعلي کلی',
        homeAddress: 'فعلي ادرس',
        guardianSection: 'د سرپرست معلومات',
        guardianName: 'د سرپرست نوم',
        guardianRelation: 'تړاو',
        guardianPhone: 'ټیلیفون',
        guardianTazkira: 'تذکره',
        guarantorName: 'د ضامن نوم',
        guarantorPhone: 'د ضامن ټیلیفون',
        guarantorTazkira: 'د ضامن تذکره',
        guarantorAddress: 'د ضامن ادرس',
        otherInfo: 'نور معلومات',
        isOrphan: 'یتیم دی؟',
        feeStatus: 'د داخلې فیس حالت',
        createdAt: 'ریکارډ جوړ شوی',
        updatedAt: 'ریکارډ تازه شوی',
        termsTitle: 'تعهدات، ضمانت، او تائید',
        pledgeTitle: 'تعهد نامه',
        guaranteeTitle: 'ضمانت نامه',
        confirmationTitle: 'تایید نامه',
        pledgeList: [
          'د مدرسې ټول قوانين به په ځان عملي کوم.',
          'د مدرسې د قوانينو تر څنګ شرعي اصول به هم رعايتوم.',
          'د مدرسې د ټولو استاذانو او اراکينو احترام به کوم.',
          'له قوانينو سرغړونه او يا غير حاضري په صورت کې د ادارې پرېکړه منم.',
          'د کوچني او لوي موبايل په اړه د مدرسې قانون ته غاړه ږدم.'
        ],
        guaranteeText:
          'ذکر شوي شرائط او ضوابط زما د علم مطابق سم دي؛ له همدې امله د ياد زده کوونکي د قوانينو پابندۍ ضمانت کوم.',
        confirmationIntro:
          'د داخلې ناظم له لوري مذکور طالب العلم ته په درجه لاندې داخله ورکړل شوه.',
        admissionFeeLabel: 'د داخلې فیس',
        admissionDateLabel: 'د داخلې تاریخ',
        supervisorSignature: 'د ناظم لاسلیک',
        stampLabel: 'مهر',
        signatureLabel: 'امضا',
        guardianSignature: 'د ضامن لاسلیک'
      }
    : {
        title: 'Student Profile Sheet',
        personal: 'Personal Information',
        guardianLabel: 'Guardian',
        studentLabel: 'Student',
        name: 'Full Name',
        fatherName: t('examReports.fatherName'),
        idNumber: 'ID Number',
        grandfatherName: t('staff.grandfatherName'),
        birthYear: 'Birth Year',
        tazkiraNumber: 'National ID',
        admissionSection: 'Admission Details',
        cardNumber: 'Card Number',
        admissionNo: 'Admission No',
        admissionYear: 'Admission Year',
        applyingGrade: 'Applying Grade',
        schoolLabel: 'School',
        addressSection: 'Address Information',
        originProvince: t('staff.originProvince'),
        originDistrict: t('staff.originDistrict'),
        originVillage: t('staff.originVillage'),
        currentProvince: t('staff.currentProvince'),
        currentDistrict: t('staff.currentDistrict'),
        currentVillage: t('staff.currentVillage'),
        homeAddress: 'Current Address',
        guardianSection: 'Guardian & Guarantor',
        guardianName: 'Guardian Name',
        guardianRelation: 'Relationship',
        guardianPhone: 'Phone',
        guardianTazkira: 'National ID',
        guarantorName: 'Guarantor Name',
        guarantorPhone: 'Guarantor Phone',
        guarantorTazkira: 'Guarantor ID',
        guarantorAddress: 'Guarantor Address',
        otherInfo: 'Other Details',
        isOrphan: 'Orphan?',
        feeStatus: 'Admission Fee Status',
        createdAt: 'Record Created',
        updatedAt: 'Record Updated',
        termsTitle: 'Terms, Guarantee & Confirmation',
        pledgeTitle: 'Pledge',
        guaranteeTitle: 'Guarantee',
        confirmationTitle: 'Confirmation',
        pledgeList: [
          'I will abide by all school regulations.',
          'I will respect Islamic values and school staff.',
          'I will protect school property and resources.',
          'I accept disciplinary decisions in case of violations.',
          'I accept the school policy regarding mobile phones.'
        ],
        guaranteeText:
          'I certify that the above student will honor all school policies. I accept responsibility for any violations.',
        confirmationIntro:
          'The student has been admitted to the following grade:',
        admissionFeeLabel: 'Admission Fee',
        admissionDateLabel: t('studentReportCard.admissionDate'),
        supervisorSignature: 'Supervisor Signature',
        stampLabel: 'Stamp',
        signatureLabel: 'Signature',
        guardianSignature: 'Guarantor Signature'
      };

  const displayValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    return String(value).trim();
  };

  const boolToText = (value?: boolean | null) => (value ? yesText : noText);
  const formatDate = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return formatDate(date);
  };
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  const printableValue = (value?: string | number | null) => {
    const val = displayValue(value);
    if (!val) return '&nbsp;';
    return escapeHtml(val);
  };
  const printableDate = (value?: string | null) => {
    const val = formatDate(value);
    if (!val) return '&nbsp;';
    return escapeHtml(val);
  };

  const schoolName = useMemo(() => {
    if (!student?.schoolId || !schools) return null;
    return schools.find(s => s.id === student.schoolId)?.schoolName || null;
  }, [student?.schoolId, schools]);

  const [pictureUrl, setPictureUrl] = useState<string | null>(null);

  // Fetch student picture with authentication headers and convert to blob URL
  useEffect(() => {
    if (!student?.id || !student?.picturePath) {
      setPictureUrl(null);
      return;
    }

    let currentBlobUrl: string | null = null;

    // Fetch image with authentication headers
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
          // 404 is expected if student has no picture - don't treat as error
          if (response.status === 404) {
            setPictureUrl(null);
            return;
          }
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        currentBlobUrl = blobUrl;
        setPictureUrl(blobUrl);
      } catch (error) {
        // Only log non-404 errors
        if (import.meta.env.DEV && error instanceof Error && !error.message.includes('404')) {
          console.error('Failed to fetch student picture:', error);
        }
        setPictureUrl(null);
      }
    };
    
    fetchImage();
    
    // Cleanup blob URL on unmount or when student changes
    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [student?.id, student?.picturePath]);

  const guardianPictureUrl = useMemo(() => {
    if (!student?.guardianPicturePath) return null;
    if (student.guardianPicturePath.startsWith('http')) {
      return student.guardianPicturePath;
    }
    return null;
  }, [student?.guardianPicturePath]);

  const statusBadgeVariant = (status: Student['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'admitted':
        return 'secondary';
      case 'applied':
        return 'outline';
      case 'withdrawn':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const feeStatusBadgeVariant = (status: Student['admissionFeeStatus']) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'destructive';
      case 'waived':
        return 'secondary';
      case 'partial':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handlePrint = async () => {
    if (!student) return;
    
    try {
      await printProfile.mutateAsync(student.id);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  if (!student) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto w-[95vw] md:w-full">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{t('students.studentProfile') || 'Student Profile'}</DialogTitle>
              <DialogDescription>
                {t('students.studentProfile') || 'Complete student information and records'}
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="no-print"
            >
              <Printer className="h-4 w-4 mr-2" />
              {t('events.print') || 'Print'}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 student-profile-screen">
          {/* Header Section with Picture */}
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 print-header print-section">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full border-4 border-background shadow-lg overflow-hidden bg-muted flex items-center justify-center">
                    {pictureUrl ? (
                      <img
                        src={pictureUrl}
                        alt={student.fullName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <UserCircle className="w-20 h-20 text-muted-foreground" />
                    )}
                  </div>
                  {student.isOrphan && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                      <Badge variant="destructive" className="shadow-md">
                        <Heart className="w-3 h-3 mr-1" />
                        {t('students.orphan') || 'Orphan'}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h2 className="text-3xl font-bold">{student.fullName}</h2>
                    <p className="text-muted-foreground text-lg">
                      {student.fatherName}
                      {student.grandfatherName && ` ${student.grandfatherName}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {student.status && (
                      <Badge variant={statusBadgeVariant(student.status)} className="text-sm px-3 py-1">
                        {t(`students.${student.status}`) || student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </Badge>
                    )}
                    {student.admissionFeeStatus && (
                      <Badge variant={feeStatusBadgeVariant(student.admissionFeeStatus)} className="text-sm px-3 py-1">
                        {t('students.fee') || 'Fee'}: {t(`students.${student.admissionFeeStatus}`) || student.admissionFeeStatus.charAt(0).toUpperCase() + student.admissionFeeStatus.slice(1)}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {student.gender === 'male' ? t('students.male') : t('students.female')}
                    </Badge>
                    {student.applyingGrade && (
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {t('studentReportCard.grade') || 'Grade'} {student.applyingGrade}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {student.admissionNumber && (
                      <div>
                        <div className="text-muted-foreground">{t('examReports.admissionNo') || 'Admission No'}</div>
                        <div className="font-semibold">{student.admissionNumber}</div>
                      </div>
                    )}
                    {student.cardNumber && (
                      <div>
                        <div className="text-muted-foreground">{t('attendanceReports.cardNumber') || 'Card Number'}</div>
                        <div className="font-semibold">{student.cardNumber}</div>
                      </div>
                    )}
                    {student.age && (
                      <div>
                        <div className="text-muted-foreground">{t('students.age') || 'Age'}</div>
                        <div className="font-semibold">{student.age} {t('events.years') || 'years'}</div>
                      </div>
                    )}
                    {schoolName && (
                      <div>
                        <div className="text-muted-foreground">{t('students.school') || 'School'}</div>
                        <div className="font-semibold">{schoolName}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information and Admission Information - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-grid print-section">
            <InfoSection title={t('students.personalInfo') || 'Personal Information'}>
              <InfoRow label={t('userManagement.fullName') || 'Full Name'} value={student.fullName} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('examReports.fatherName') || 'Father Name'} value={student.fatherName} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('students.grandfatherName') || 'Grandfather Name'} value={student.grandfatherName} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('studentReportCard.motherName') || 'Mother Name'} value={student.motherName} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('students.gender') || 'Gender'} value={student.gender === 'male' ? t('students.male') : t('students.female')} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('students.birthYear') || 'Birth Year'} value={student.birthYear} icon={<Calendar className="w-4 h-4" />} />
              <InfoRow label={t('students.birthDate') || 'Birth Date'} value={student.birthDate} icon={<Calendar className="w-4 h-4" />} />
              <InfoRow label={t('students.age') || 'Age'} value={student.age ? `${student.age} ${t('events.years') || 'years'}` : null} icon={<Calendar className="w-4 h-4" />} />
              <InfoRow label={t('students.nationality') || 'Nationality'} value={student.nationality} icon={<Shield className="w-4 h-4" />} />
              <InfoRow label={t('students.preferredLanguage') || 'Preferred Language'} value={student.preferredLanguage} icon={<FileText className="w-4 h-4" />} />
              <InfoRow label={t('students.previousSchool') || 'Previous School'} value={student.previousSchool} icon={<School className="w-4 h-4" />} />
            </InfoSection>

            <InfoSection title={t('students.admissionInfo') || 'Admission Information'}>
              <InfoRow label={t('examReports.admissionNo') || 'Admission Number'} value={student.admissionNumber} icon={<FileText className="w-4 h-4" />} />
              <InfoRow label={t('attendanceReports.cardNumber') || 'Card Number'} value={student.cardNumber} icon={<FileText className="w-4 h-4" />} />
              <InfoRow label={t('students.admissionYear') || 'Admission Year'} value={student.admissionYear} icon={<Calendar className="w-4 h-4" />} />
              <InfoRow label={t('students.applyingGrade') || 'Applying Grade'} value={student.applyingGrade} icon={<School className="w-4 h-4" />} />
              <InfoRow label={t('students.school') || 'School'} value={schoolName} icon={<School className="w-4 h-4" />} />
            </InfoSection>
          </div>

          {/* Address Information - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-grid print-section">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {t('students.originAddress') || 'Origin Address'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label={t('students.originProvince') || 'Province'} value={student.origProvince} />
                  <InfoRow label={t('students.originDistrict') || 'District'} value={student.origDistrict} />
                  <InfoRow label={t('students.originVillage') || 'Village'} value={student.origVillage} />
                  {!student.origProvince && !student.origDistrict && !student.origVillage && (
                    <div className="text-sm text-muted-foreground py-4 text-center col-span-2">{t('students.noOriginAddress') || 'No origin address recorded'}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  {t('students.currentAddress') || 'Current Address'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label={t('students.currentProvince') || 'Province'} value={student.currProvince} />
                  <InfoRow label={t('students.currentDistrict') || 'District'} value={student.currDistrict} />
                  <InfoRow label={t('students.currentVillage') || 'Village'} value={student.currVillage} />
                  <InfoRow label={t('students.homeAddress') || 'Home Address'} value={student.homeAddress} />
                  {!student.currProvince && !student.currDistrict && !student.currVillage && !student.homeAddress && (
                    <div className="text-sm text-muted-foreground py-4 text-center col-span-2">{t('students.noCurrentAddress') || 'No current address recorded'}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guardian and Guarantor Information - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-grid print-section">
            <InfoSection title={t('students.guardianInfo') || 'Guardian Information'}>
              <InfoRow label={t('students.guardianName') || 'Guardian Name'} value={student.guardianName} icon={<Users className="w-4 h-4" />} />
              <InfoRow label={t('students.relation') || 'Relation'} value={student.guardianRelation} icon={<Users className="w-4 h-4" />} />
              <InfoRow label={t('events.phone') || 'Phone'} value={student.guardianPhone} icon={<Phone className="w-4 h-4" />} />
              <InfoRow label={t('students.guardianTazkira') || 'Tazkira'} value={student.guardianTazkira} icon={<FileText className="w-4 h-4" />} />
              {!student.guardianName && !student.guardianPhone && (
                <div className="text-sm text-muted-foreground py-4 text-center">{t('students.noGuardianInfo') || 'No guardian information recorded'}</div>
              )}
            </InfoSection>

            {(student.zaminName || student.zaminPhone || student.zaminTazkira || student.zaminAddress) ? (
              <InfoSection title={t('students.guarantorInfo') || 'Guarantor (Zamin) Information'}>
                <InfoRow label={t('events.name') || 'Name'} value={student.zaminName} icon={<Users className="w-4 h-4" />} />
                <InfoRow label={t('events.phone') || 'Phone'} value={student.zaminPhone} icon={<Phone className="w-4 h-4" />} />
                <InfoRow label={t('students.zaminTazkira') || 'Tazkira'} value={student.zaminTazkira} icon={<FileText className="w-4 h-4" />} />
                <InfoRow label={t('students.zaminAddress') || 'Address'} value={student.zaminAddress} icon={<MapPin className="w-4 h-4" />} />
              </InfoSection>
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t('students.guarantorInfo') || 'Guarantor (Zamin) Information'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground py-4 text-center">{t('students.noGuarantorInfo') || 'No guarantor information recorded'}</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Other Information - Split into two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-grid print-section">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {t('students.emergencyInfo') || 'Emergency & Special Information'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label={t('students.disabilityStatus') || 'Disability Status'} value={student.disabilityStatus} icon={<AlertCircle className="w-4 h-4" />} />
                  <InfoRow label={t('students.emergencyContactName') || 'Emergency Contact Name'} value={student.emergencyContactName} icon={<Phone className="w-4 h-4" />} />
                  <InfoRow label={t('students.emergencyContactPhone') || 'Emergency Contact Phone'} value={student.emergencyContactPhone} icon={<Phone className="w-4 h-4" />} />
                  {!student.disabilityStatus && !student.emergencyContactName && !student.emergencyContactPhone && (
                    <div className="text-sm text-muted-foreground py-4 text-center col-span-2">{t('students.noEmergencyInfo') || 'No emergency information recorded'}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t('students.financialInfo') || 'Financial & Support Information'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label={t('students.familyIncome') || 'Family Income / Support'} value={student.familyIncome} icon={<FileText className="w-4 h-4" />} />
                  {!student.familyIncome && (
                    <div className="text-sm text-muted-foreground py-4 text-center col-span-2">{t('students.noFinancialInfo') || 'No financial information recorded'}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Documents Section */}
          <Card className="print-section">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t('students.studentDocuments') || 'Student Documents'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documents && documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {doc.document_type}
                          </Badge>
                          <span className="font-medium truncate">{doc.file_name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDate(doc.created_at)} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} ${t('events.kb') || 'KB'}` : '—'}
                        </div>
                        {doc.description && (
                          <div className="text-sm text-muted-foreground mt-1">{doc.description}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  {t('students.noDocuments') || 'No documents uploaded yet'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Educational History Section */}
          <Card className="print-section">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {t('students.educationalHistory') || 'Educational History'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {educationalHistory && educationalHistory.length > 0 ? (
                <div className="space-y-4">
                  {educationalHistory.map((record) => (
                    <div key={record.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold text-base">{record.institution_name}</div>
                        {record.academic_year && (
                          <Badge variant="outline">{record.academic_year}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {record.grade_level && (
                          <div>
                            <span className="font-medium">{t('students.gradeLevel') || 'Grade'}:</span> {record.grade_level}
                          </div>
                        )}
                        {record.start_date && record.end_date && (
                          <div>
                            <span className="font-medium">{t('students.period') || 'Period'}:</span>{' '}
                            {formatDate(record.start_date)} {t('events.to') || '-'} {formatDate(record.end_date)}
                          </div>
                        )}
                        {record.start_date && !record.end_date && (
                          <div>
                            <span className="font-medium">{t('events.startDate') || 'Start Date'}:</span>{' '}
                            {formatDate(record.start_date)}
                          </div>
                        )}
                      </div>
                      {record.achievements && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">{t('studentReportCard.achievements') || 'Achievements'}:</span>{' '}
                          <span className="text-muted-foreground">{record.achievements}</span>
                        </div>
                      )}
                      {record.notes && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">{t('events.notes') || 'Notes'}:</span>{' '}
                          <span className="text-muted-foreground">{record.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  {t('students.noEducationalHistory') || 'No educational history recorded'}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discipline Records Section */}
          <Card className="print-section">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                {t('students.disciplineRecords') || 'Discipline Records'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {disciplineRecords && disciplineRecords.length > 0 ? (
                <div className="space-y-4">
                  {disciplineRecords.map((record) => (
                    <div key={record.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{record.incident_type}</div>
                          <Badge
                            variant="outline"
                            className={
                              record.severity === 'severe'
                                ? 'bg-red-100 text-red-800'
                                : record.severity === 'major'
                                  ? 'bg-orange-100 text-orange-800'
                                  : record.severity === 'moderate'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-blue-100 text-blue-800'
                            }
                          >
                            {record.severity 
                              ? (t(`students.severity${record.severity.charAt(0).toUpperCase() + record.severity.slice(1)}`) || record.severity)
                              : (t('events.unknown') || 'Unknown')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.resolved ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {t('students.resolved') || 'Resolved'}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700">
                              {t('students.disciplinePending') || 'Pending'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        {formatDate(record.incident_date)}
                      </div>
                      {record.description && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">{t('events.description') || 'Description'}:</span>{' '}
                          <span className="text-muted-foreground">{record.description}</span>
                        </div>
                      )}
                      {record.action_taken && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">{t('students.actionTaken') || 'Action Taken'}:</span>{' '}
                          <span className="text-muted-foreground">{record.action_taken}</span>
                        </div>
                      )}
                      {record.resolved && record.resolved_date && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {t('students.resolved') || 'Resolved'} {t('events.on') || 'on'} {formatDate(record.resolved_date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  {t('students.noDisciplineRecords') || 'No discipline records'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {student && (
          <div className="student-profile-print-layout" style={{ display: 'none' }}>
            <StudentProfilePrint
              student={student}
              schoolName={schoolName}
              pictureUrl={pictureUrl}
              guardianPictureUrl={guardianPictureUrl}
              isRTL={isRTL}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
    
    {/* Report Progress Dialog */}
    <ReportProgressDialog
      open={printProfile.isGenerating || printProfile.status !== null}
      onOpenChange={(open) => {
        if (!open) {
          printProfile.reset();
        }
      }}
      status={printProfile.status}
      progress={printProfile.progress}
      fileName={printProfile.fileName}
      error={printProfile.error}
      onDownload={() => {
        printProfile.downloadReport();
        // Also open print dialog
        printProfile.openPrintDialog();
      }}
      onClose={() => {
        printProfile.reset();
      }}
    />
    </>
  );
});

export default StudentProfileView;

