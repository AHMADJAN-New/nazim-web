import { useQuery } from '@tanstack/react-query';
import { FileDown, Printer, Award, Calendar, User, TrendingUp, BookOpen, Trophy, AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useExams, useLatestExamFromCurrentYear, useExamClasses } from '@/hooks/useExams';
import { useExamStudentsWithNumbers } from '@/hooks/useExamNumbers';
import { useExportStudentExamReportCardsPdf } from '@/hooks/useExportStudentExamReportCardsPdf';
import { formatDate } from '@/lib/utils';
import { calculateGrade } from '@/lib/utils/gradeCalculator';
import { useGrades } from '@/hooks/useGrades';
import { examsApi } from '@/lib/api/client';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useProfile } from '@/hooks/useProfiles';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { useSchool } from '@/hooks/useSchools';
import { useCurrentOrganization } from '@/hooks/useOrganizations';

import './student-exam-report-print.css';

// Report data type matching API response
type StudentReportData = {
  exam?: {
    id: string;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
    academic_year?: string | null;
  };
  student?: {
    id: string | null;
    full_name: string;
    admission_no: string | null;
    roll_number: string | null;
    class: string | null;
    section: string | null;
    father_name?: string | null;
    birth_date?: string | null;
    birth_date_formatted?: string | null;
    picture_path?: string | null;
  };
  subjects?: Array<{
    exam_subject_id?: string;
    id?: string;
    subject?: {
      id: string;
      name: string;
    };
    name?: string;
    marks?: {
      obtained: number | null;
      total: number;
      percentage: number | null;
    };
    is_absent?: boolean;
    is_pass?: boolean | null;
  }>;
  summary?: {
    total_subjects?: number;
    passed_subjects?: number;
    failed_subjects?: number;
    absent_subjects?: number;
    total_marks_obtained?: number;
    total_marks_obtained_raw?: number;
    total_maximum_marks?: number;
    overall_percentage?: number;
    overall_result?: 'Pass' | 'Fail';
    overall_grade?: string | null;
    marks_cut?: number;
    absence_count?: number;
  };
};

// Component for authenticated student picture display in report card
const ReportCardStudentAvatar = ({ studentId, picturePath }: { studentId?: string | null; picturePath?: string | null }) => {
  const { t } = useLanguage();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Only fetch if picturePath exists and is not empty
    const hasPicture = picturePath && picturePath.trim() !== '' && studentId;
    
    if (hasPicture) {
      let currentBlobUrl: string | null = null;

      const fetchImage = async () => {
        try {
          const { apiClient } = await import('@/lib/api/client');
          const token = apiClient.getToken();
          const url = `/api/students/${studentId}/picture`;
          
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
              setImageUrl(null);
              setImageError(false);
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
          setImageUrl(null);
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
      // No picture path, show placeholder immediately
      setImageUrl(null);
      setImageError(false);
    }
  }, [studentId, picturePath]);

  return (
    <div className="src-student-photo-wrap flex flex-col items-center">
      <div className="src-photo-frame w-32 h-32 rounded-lg border-2 border-border overflow-hidden bg-muted/20 flex items-center justify-center print:w-[100px] print:h-[120px]">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt="Student"
            className="w-full h-full object-cover"
            onError={() => {
              setImageError(true);
              if (imageUrl && imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(imageUrl);
              }
              setImageUrl(null);
            }}
          />
        ) : (
          <User className="h-16 w-16 text-muted-foreground/50" />
        )}
      </div>
      <p className="src-photo-label text-xs text-muted-foreground mt-2">{t('studentReportCard.studentPhoto')}</p>
    </div>
  );
};

// Reusable Grade Card Component
function GradeCard({
  reportData,
  selectedExam,
  academicYear,
  schoolName,
  organizationName,
  t,
  isRTL,
}: {
  reportData: StudentReportData | null;
  selectedExam: any;
  academicYear: any;
  schoolName?: string | null;
  organizationName?: string | null;
  t: (key: string) => string;
  isRTL: boolean;
}) {
  const { language } = useLanguage();
  const { data: profile } = useProfile();
  const { data: grades } = useGrades(profile?.organization_id);

  const examName = reportData?.exam?.name || selectedExam?.name;
  const classLabel = reportData?.student?.class
    ? `${reportData.student.class}${reportData.student.section ? ` - ${reportData.student.section}` : ''}`
    : null;
  const displaySchoolName = schoolName || organizationName || '';

  if (!reportData) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="student-report-card space-y-4 print:space-y-0" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* School banner â€” prominent in print, subtle on screen */}
      <div className="src-school-banner hidden print:block rounded-t-md">
        {displaySchoolName ? (
          <h2 className="src-school-name">{displaySchoolName}</h2>
        ) : null}
        <p className="src-report-title">{t('nav.studentReportCard')}</p>
        <p className="src-exam-meta">
          {[examName, classLabel, academicYear?.name].filter(Boolean).join(' Â· ')}
        </p>
      </div>

      {/* Report Card Header with Badges (screen) */}
      <Card className="src-card-section print:shadow-none border-2 print:border-0">
        <CardHeader className="text-center border-b pb-4 src-print-hide">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Award className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">{t('nav.studentReportCard')}</CardTitle>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {examName ? (
              <Badge className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                <span className="opacity-70 mr-1">{t('examReports.examName')}:</span>
                <span className="font-semibold">{examName}</span>
              </Badge>
            ) : null}
            {classLabel ? (
              <Badge className="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800">
                <span className="opacity-70 mr-1">{t('search.class')}:</span>
                <span className="font-semibold">{classLabel}</span>
              </Badge>
            ) : null}
            {academicYear ? (
              <Badge className="px-3 py-1.5 text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border border-orange-200 dark:border-orange-800">
                <span className="opacity-70 mr-1">{t('examReports.academicYear')}:</span>
                <span className="font-semibold">{academicYear.name}</span>
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        {/* Student Information Section */}
        <CardContent className="src-section-body pt-6 print:pt-0 print:px-0">
          <div className="src-student-info-grid grid md:grid-cols-[auto_1fr] gap-6">
            <ReportCardStudentAvatar
              studentId={reportData.student?.id || null}
              picturePath={reportData.student?.picture_path || null}
            />

            <div>
              <h3 className="src-section-title text-lg font-semibold mb-4 flex items-center gap-2 src-print-hide">
                <BookOpen className="h-5 w-5 text-primary" />
                {t('courses.studentInformation')}
              </h3>
              <div className="src-info-fields grid md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="src-info-row flex items-start gap-2">
                  <span className="src-info-label text-sm text-muted-foreground min-w-[120px]">{t('userManagement.fullName')}:</span>
                  <span className="src-info-value text-sm font-semibold">
                    {reportData.student?.full_name || '-'}
                  </span>
                </div>
                <div className="src-info-row flex items-start gap-2">
                  <span className="src-info-label text-sm text-muted-foreground min-w-[120px]">{t('students.rollNo')}:</span>
                  <span className="src-info-value text-sm font-semibold">
                    {reportData.student?.roll_number || '-'}
                  </span>
                </div>
                <div className="src-info-row flex items-start gap-2">
                  <span className="src-info-label text-sm text-muted-foreground min-w-[120px]">{t('examReports.fatherName')}:</span>
                  <span className="src-info-value text-sm font-semibold">
                    {reportData.student?.father_name || '-'}
                  </span>
                </div>
                <div className="src-info-row flex items-start gap-2">
                  <span className="src-info-label text-sm text-muted-foreground min-w-[120px]">{t('studentReportCard.dateOfBirth')}:</span>
                  <span className="src-info-value text-sm font-semibold">
                    {reportData.student?.birth_date_formatted
                      || (reportData.student?.birth_date ? formatDate(reportData.student.birth_date) : null)
                      || '-'}
                  </span>
                </div>
                <div className="src-info-row flex items-start gap-2">
                  <span className="src-info-label text-sm text-muted-foreground min-w-[120px]">{t('examReports.admissionNo')}:</span>
                  <span className="src-info-value text-sm font-semibold">
                    {reportData.student?.admission_no || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Performance Section */}
      <Card className="src-card-section print:shadow-none">
        <CardHeader className="src-section-header bg-muted/30 print:bg-transparent">
          <CardTitle className="src-section-title flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500 src-print-hide" />
            {t('studentReportCard.academicPerformance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="src-grades-table overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t('studentReportCard.subjectName')}</TableHead>
                  <TableHead className="text-center">{t('studentReportCard.maxMarks')}</TableHead>
                  <TableHead className="text-center">{t('examReports.marksObtained')}</TableHead>
                  <TableHead className="text-center">{t('studentReportCard.percentage')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.subjects?.map((subject: any, index: number) => {
                  // The subject object already contains marks information
                  const marks = subject.marks;
                  const isAbsent = subject.is_absent;
                  const percentage = marks?.percentage || null;
                  const subjectName = subject.subject?.name || subject.name || '-';
                  const marksObtained = isAbsent ? null : (marks?.obtained ?? null);
                  const totalMarks = marks?.total || '-';
                  const isPass = subject.is_pass;

                  return (
                    <TableRow key={`${subject.exam_subject_id || subject.id || `subject-${index}`}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{subjectName}</TableCell>
                      <TableCell className="text-center">{totalMarks}</TableCell>
                      <TableCell className="text-center font-semibold">
                        {isAbsent ? (
                          <Badge variant="outline" className="text-xs">
                            {t('examReports.absent') || 'Absent'}
                          </Badge>
                        ) : marksObtained !== null ? (
                          <Badge
                            className={`text-xs ${
                              isPass
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800'
                            }`}
                          >
                            {marksObtained}/{totalMarks}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {!isAbsent && marks?.percentage !== null && marks?.percentage !== undefined
                          ? `${marks.percentage.toFixed(2)}%`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {reportData.summary && (
                  <TableRow className="src-total-row bg-amber-50 dark:bg-amber-950/20 font-bold">
                    <TableCell colSpan={2} className="text-right">
                      {t('studentReportCard.grandTotal')}
                    </TableCell>
                    <TableCell className="text-center">
                      {reportData.summary.total_maximum_marks ?? '-'}
                    </TableCell>
                    <TableCell className="text-center text-lg">
                      {reportData.summary.total_marks_obtained ?? '-'}
                    </TableCell>
                    <TableCell className="text-center text-lg">
                      {reportData.summary.overall_percentage !== null && reportData.summary.overall_percentage !== undefined
                        ? `${reportData.summary.overall_percentage.toFixed(2)}%`
                        : '-'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Overall Result & Remarks */}
      <div className="src-summary-grid grid md:grid-cols-2 gap-6 print:gap-0">
        {/* Result Card */}
        <Card className="src-card-section print:shadow-none">
          <CardHeader className="src-section-header bg-muted/30 print:bg-transparent">
            <CardTitle className="src-section-title text-lg">{t('studentReportCard.overallResult')}</CardTitle>
          </CardHeader>
          <CardContent className="src-section-body pt-6 print:pt-0">
            <div className="space-y-4">
              {reportData.summary?.marks_cut !== undefined && (
                <>
                  <div className="src-result-stat flex justify-between items-center">
                    <span className="text-muted-foreground">{t('examAbsencePenalty.absenceCount') || 'Absences'}:</span>
                    <span className="font-semibold">{reportData.summary.absence_count ?? 0}</span>
                  </div>
                  <div className="src-result-stat flex justify-between items-center">
                    <span className="text-muted-foreground">{t('examAbsencePenalty.marksCut') || 'Marks cut'}:</span>
                    <span className="font-semibold">{reportData.summary.marks_cut}</span>
                  </div>
                  {reportData.summary.total_marks_obtained_raw !== undefined && (
                    <div className="src-result-stat flex justify-between items-center">
                      <span className="text-muted-foreground">{t('examAbsencePenalty.totalRaw') || 'Raw total'}:</span>
                      <span className="font-semibold">
                        {reportData.summary.total_marks_obtained_raw}/{reportData.summary.total_maximum_marks ?? '-'}
                      </span>
                    </div>
                  )}
                </>
              )}
              <div className="src-result-stat flex justify-between items-center">
                <span className="text-muted-foreground">{t('studentReportCard.overallPercentage')}:</span>
                <span className="src-result-value text-2xl font-bold text-primary">
                  {reportData.summary?.overall_percentage !== null && reportData.summary?.overall_percentage !== undefined
                    ? `${reportData.summary.overall_percentage.toFixed(2)}%`
                    : '-'}
                </span>
              </div>
              <div className="src-result-stat flex justify-between items-center">
                <span className="text-muted-foreground">{t('studentReportCard.overallGrade')}:</span>
                <Badge variant="default" className="text-xl px-4 py-2 print:text-base print:px-2 print:py-1">
                  {(() => {
                    const overallPercentage = reportData.summary?.overall_percentage;
                    if (overallPercentage !== null && overallPercentage !== undefined) {
                      const gradeInfo = calculateGrade(overallPercentage, grades || [], language);
                      return gradeInfo?.name || '-';
                    }
                    return '-';
                  })()}
                </Badge>
              </div>
              <Separator className="src-print-hide" />
              <div className="src-result-stat flex justify-between items-center">
                <span className="text-muted-foreground">{t('examReports.result')}:</span>
                {reportData.summary?.overall_result?.toLowerCase() === 'pass' ? (
                  <Badge variant="default" className="gap-1 text-base px-3 py-1">
                    <TrendingUp className="h-4 w-4 src-print-hide" />
                    {t('events.pass')}
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-base px-3 py-1">
                    {t('events.fail')}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card className="src-card-section print:shadow-none">
          <CardHeader className="src-section-header bg-muted/30 print:bg-transparent">
            <CardTitle className="src-section-title text-lg">{t('studentReportCard.teacherRemarks')}</CardTitle>
          </CardHeader>
          <CardContent className="src-section-body pt-6 print:pt-0">
            <div className="src-remarks-box min-h-[100px] p-3 border rounded-md bg-muted/10">
              <p className="text-sm text-muted-foreground italic">
                {t('studentReportCard.noRemarks')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signatures Section */}
      <Card className="src-card-section print:shadow-none">
        <CardHeader className="src-section-header">
          <CardTitle className="src-section-title">{t('studentReportCard.signatures')}</CardTitle>
        </CardHeader>
        <CardContent className="src-section-body">
          <div className="src-signatures-grid grid grid-cols-3 gap-8 pt-8 print:pt-4">
            <div className="text-center space-y-2">
              <div className="src-signature-line h-16 border-b-2 border-muted-foreground/20 print:h-10 print:border-b print:border-black"></div>
              <p className="src-signature-label text-sm font-medium">{t('studentReportCard.classTeacher')}</p>
            </div>
            <div className="text-center space-y-2">
              <div className="src-signature-line h-16 border-b-2 border-muted-foreground/20 print:h-10 print:border-b print:border-black"></div>
              <p className="src-signature-label text-sm font-medium">{t('studentReportCard.principal')}</p>
            </div>
            <div className="text-center space-y-2">
              <div className="src-signature-line h-16 border-b-2 border-muted-foreground/20 print:h-10 print:border-b print:border-black"></div>
              <p className="src-signature-label text-sm font-medium">{t('studentReportCard.parent')}</p>
            </div>
          </div>
          <div className="src-date-issued mt-6 text-center text-sm text-muted-foreground">
            <p>{t('studentReportCard.dateIssued')}: {formatDate(new Date())}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

