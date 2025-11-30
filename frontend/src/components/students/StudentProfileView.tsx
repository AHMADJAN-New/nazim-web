import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useSchools } from '@/hooks/useSchools';
import { useProfile } from '@/hooks/useProfiles';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useStudentDocuments,
  useStudentEducationalHistory,
  useStudentDisciplineRecords,
  type Student,
} from '@/hooks/useStudents';
import { StudentProfilePrint } from './StudentProfilePrint';
import { generateStudentProfilePdf } from '@/lib/studentProfilePdf';
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
import { Button } from '@/components/ui/button';

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

export function StudentProfileView({ open, onOpenChange, student }: StudentProfileViewProps) {
  const { data: profile } = useProfile();
  const { isRTL, t } = useLanguage();
  const yesText = isRTL ? 'هو' : 'Yes';
  const noText = isRTL ? 'نه' : 'No';
  const isSuperAdmin = profile?.role === 'super_admin';
  const orgIdForQuery = isSuperAdmin ? undefined : profile?.organization_id;
  const { data: schools } = useSchools(orgIdForQuery);
  
  // Fetch documents, history, and discipline records
  const { data: documents } = useStudentDocuments(student?.id);
  const { data: educationalHistory } = useStudentEducationalHistory(student?.id);
  const { data: disciplineRecords } = useStudentDisciplineRecords(student?.id);

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
        fatherName: 'Father Name',
        idNumber: 'ID Number',
        grandfatherName: 'Grandfather Name',
        birthYear: 'Birth Year',
        tazkiraNumber: 'National ID',
        admissionSection: 'Admission Details',
        cardNumber: 'Card Number',
        admissionNo: 'Admission No',
        admissionYear: 'Admission Year',
        applyingGrade: 'Applying Grade',
        schoolLabel: 'School',
        addressSection: 'Address Information',
        originProvince: 'Origin Province',
        originDistrict: 'Origin District',
        originVillage: 'Origin Village',
        currentProvince: 'Current Province',
        currentDistrict: 'Current District',
        currentVillage: 'Current Village',
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
        admissionDateLabel: 'Admission Date',
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
    return date.toLocaleDateString();
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
    if (!student?.school_id || !schools) return null;
    return schools.find(s => s.id === student.school_id)?.school_name || null;
  }, [student?.school_id, schools]);

  const [pictureUrl, setPictureUrl] = useState<string | null>(null);

  // Fetch signed URL for student picture (bucket is private)
  useEffect(() => {
    if (!student?.picture_path || !student?.organization_id) {
      setPictureUrl(null);
      return;
    }

    const schoolPath = student.school_id ? `${student.school_id}/` : '';
    const path = `${student.organization_id}/${schoolPath}${student.id}/picture/${student.picture_path}`;
    
    supabase.storage
      .from('student-files')
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (error) {
          console.error('Error creating signed URL for student picture:', error);
          setPictureUrl(null);
        } else if (data) {
          setPictureUrl(data.signedUrl);
        }
      });
  }, [student?.picture_path, student?.organization_id, student?.school_id, student?.id]);

  const guardianPictureUrl = useMemo(() => {
    if (!student?.guardian_picture_path) return null;
    if (student.guardian_picture_path.startsWith('http')) {
      return student.guardian_picture_path;
    }
    return null;
  }, [student?.guardian_picture_path]);

  const statusBadgeVariant = (status: Student['student_status']) => {
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

  const feeStatusBadgeVariant = (status: Student['admission_fee_status']) => {
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
      await generateStudentProfilePdf({
        student,
        schoolName,
        pictureUrl,
        guardianPictureUrl,
        isRTL,
        educationalHistory: educationalHistory || [],
        disciplineRecords: disciplineRecords || [],
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Fallback to window.print if PDF generation fails
      window.print();
    }
  };

  if (!student) return null;

  return (
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
              {t('common.print') || 'Print'}
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
                        alt={student.full_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <UserCircle className="w-20 h-20 text-muted-foreground" />
                    )}
                  </div>
                  {student.is_orphan && (
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
                    <h2 className="text-3xl font-bold">{student.full_name}</h2>
                    <p className="text-muted-foreground text-lg">
                      {student.father_name}
                      {student.grandfather_name && ` ${student.grandfather_name}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={statusBadgeVariant(student.student_status)} className="text-sm px-3 py-1">
                      {student.student_status.charAt(0).toUpperCase() + student.student_status.slice(1)}
                    </Badge>
                    <Badge variant={feeStatusBadgeVariant(student.admission_fee_status)} className="text-sm px-3 py-1">
                      Fee: {student.admission_fee_status.charAt(0).toUpperCase() + student.admission_fee_status.slice(1)}
                    </Badge>
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      {student.gender === 'male' ? 'Male' : 'Female'}
                    </Badge>
                    {student.applying_grade && (
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        Grade {student.applying_grade}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {student.admission_no && (
                      <div>
                        <div className="text-muted-foreground">{t('students.admissionNo') || 'Admission No'}</div>
                        <div className="font-semibold">{student.admission_no}</div>
                      </div>
                    )}
                    {student.card_number && (
                      <div>
                        <div className="text-muted-foreground">{t('students.cardNumber') || 'Card Number'}</div>
                        <div className="font-semibold">{student.card_number}</div>
                      </div>
                    )}
                    {student.age && (
                      <div>
                        <div className="text-muted-foreground">{t('students.age') || 'Age'}</div>
                        <div className="font-semibold">{student.age} {t('common.years') || 'years'}</div>
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
              <InfoRow label={t('students.fullName') || 'Full Name'} value={student.full_name} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('students.fatherName') || 'Father Name'} value={student.father_name} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('students.grandfatherName') || 'Grandfather Name'} value={student.grandfather_name} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('students.motherName') || 'Mother Name'} value={student.mother_name} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('students.gender') || 'Gender'} value={student.gender === 'male' ? t('students.male') : t('students.female')} icon={<User className="w-4 h-4" />} />
              <InfoRow label={t('students.birthYear') || 'Birth Year'} value={student.birth_year} icon={<Calendar className="w-4 h-4" />} />
              <InfoRow label={t('students.birthDate') || 'Birth Date'} value={student.birth_date} icon={<Calendar className="w-4 h-4" />} />
              <InfoRow label={t('students.age') || 'Age'} value={student.age ? `${student.age} ${t('common.years') || 'years'}` : null} icon={<Calendar className="w-4 h-4" />} />
              <InfoRow label={t('students.nationality') || 'Nationality'} value={student.nationality} icon={<Shield className="w-4 h-4" />} />
              <InfoRow label={t('students.preferredLanguage') || 'Preferred Language'} value={student.preferred_language} icon={<FileText className="w-4 h-4" />} />
              <InfoRow label={t('students.previousSchool') || 'Previous School'} value={student.previous_school} icon={<School className="w-4 h-4" />} />
            </InfoSection>

            <InfoSection title={t('students.admissionInfo') || 'Admission Information'}>
              <InfoRow label={t('students.admissionNo') || 'Admission Number'} value={student.admission_no} icon={<FileText className="w-4 h-4" />} />
              <InfoRow label={t('students.cardNumber') || 'Card Number'} value={student.card_number} icon={<FileText className="w-4 h-4" />} />
              <InfoRow label={t('students.admissionYear') || 'Admission Year'} value={student.admission_year} icon={<Calendar className="w-4 h-4" />} />
              <InfoRow label={t('students.applyingGrade') || 'Applying Grade'} value={student.applying_grade} icon={<School className="w-4 h-4" />} />
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
                  <InfoRow label={t('students.originProvince') || 'Province'} value={student.orig_province} />
                  <InfoRow label={t('students.originDistrict') || 'District'} value={student.orig_district} />
                  <InfoRow label={t('students.originVillage') || 'Village'} value={student.orig_village} />
                  {!student.orig_province && !student.orig_district && !student.orig_village && (
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
                  <InfoRow label={t('students.currentProvince') || 'Province'} value={student.curr_province} />
                  <InfoRow label={t('students.currentDistrict') || 'District'} value={student.curr_district} />
                  <InfoRow label={t('students.currentVillage') || 'Village'} value={student.curr_village} />
                  <InfoRow label={t('students.homeAddress') || 'Home Address'} value={student.home_address} />
                  {!student.curr_province && !student.curr_district && !student.curr_village && !student.home_address && (
                    <div className="text-sm text-muted-foreground py-4 text-center col-span-2">{t('students.noCurrentAddress') || 'No current address recorded'}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Guardian and Guarantor Information - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-grid print-section">
            <InfoSection title={t('students.guardianInfo') || 'Guardian Information'}>
              <InfoRow label={t('students.guardianName') || 'Guardian Name'} value={student.guardian_name} icon={<Users className="w-4 h-4" />} />
              <InfoRow label={t('students.relation') || 'Relation'} value={student.guardian_relation} icon={<Users className="w-4 h-4" />} />
              <InfoRow label={t('students.phone') || 'Phone'} value={student.guardian_phone} icon={<Phone className="w-4 h-4" />} />
              <InfoRow label={t('students.guardianTazkira') || 'Tazkira'} value={student.guardian_tazkira} icon={<FileText className="w-4 h-4" />} />
              {!student.guardian_name && !student.guardian_phone && (
                <div className="text-sm text-muted-foreground py-4 text-center">{t('students.noGuardianInfo') || 'No guardian information recorded'}</div>
              )}
            </InfoSection>

            {(student.zamin_name || student.zamin_phone || student.zamin_tazkira || student.zamin_address) ? (
              <InfoSection title={t('students.guarantorInfo') || 'Guarantor (Zamin) Information'}>
                <InfoRow label={t('students.name') || 'Name'} value={student.zamin_name} icon={<Users className="w-4 h-4" />} />
                <InfoRow label={t('students.phone') || 'Phone'} value={student.zamin_phone} icon={<Phone className="w-4 h-4" />} />
                <InfoRow label={t('students.zaminTazkira') || 'Tazkira'} value={student.zamin_tazkira} icon={<FileText className="w-4 h-4" />} />
                <InfoRow label={t('students.zaminAddress') || 'Address'} value={student.zamin_address} icon={<MapPin className="w-4 h-4" />} />
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
                  <InfoRow label={t('students.disabilityStatus') || 'Disability Status'} value={student.disability_status} icon={<AlertCircle className="w-4 h-4" />} />
                  <InfoRow label={t('students.emergencyContactName') || 'Emergency Contact Name'} value={student.emergency_contact_name} icon={<Phone className="w-4 h-4" />} />
                  <InfoRow label={t('students.emergencyContactPhone') || 'Emergency Contact Phone'} value={student.emergency_contact_phone} icon={<Phone className="w-4 h-4" />} />
                  {!student.disability_status && !student.emergency_contact_name && !student.emergency_contact_phone && (
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
                  <InfoRow label={t('students.familyIncome') || 'Family Income / Support'} value={student.family_income} icon={<FileText className="w-4 h-4" />} />
                  {!student.family_income && (
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
                          {new Date(doc.created_at).toLocaleDateString()} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'}
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
                            {new Date(record.start_date).toLocaleDateString()} - {new Date(record.end_date).toLocaleDateString()}
                          </div>
                        )}
                        {record.start_date && !record.end_date && (
                          <div>
                            <span className="font-medium">{t('students.startDate') || 'Start Date'}:</span>{' '}
                            {new Date(record.start_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      {record.achievements && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">{t('students.achievements') || 'Achievements'}:</span>{' '}
                          <span className="text-muted-foreground">{record.achievements}</span>
                        </div>
                      )}
                      {record.notes && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">{t('students.notes') || 'Notes'}:</span>{' '}
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
                            {t(`students.severity${record.severity.charAt(0).toUpperCase() + record.severity.slice(1)}`) || record.severity}
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
                        {new Date(record.incident_date).toLocaleDateString()}
                      </div>
                      {record.description && (
                        <div className="text-sm mb-2">
                          <span className="font-medium">{t('students.description') || 'Description'}:</span>{' '}
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
                          {t('students.resolved') || 'Resolved'} on {new Date(record.resolved_date).toLocaleDateString()}
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
  );
}

export default StudentProfileView;

