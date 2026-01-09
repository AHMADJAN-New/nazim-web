import { useQuery } from '@tanstack/react-query';
import { FileDown, Printer, Award, Calendar, User, TrendingUp, BookOpen, Trophy, AlertCircle } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useExams, useExamStudents, useLatestExamFromCurrentYear, useExamClasses } from '@/hooks/useExams';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { formatDate } from '@/lib/utils';
import { calculateGrade } from '@/lib/utils/gradeCalculator';
import type { Student } from '@/types/domain/student';
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
    total_maximum_marks?: number;
    overall_percentage?: number;
    overall_result?: 'Pass' | 'Fail';
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
    <div className="flex flex-col items-center">
      <div className="w-32 h-32 rounded-lg border-2 border-border overflow-hidden bg-muted/20 flex items-center justify-center">
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
      <p className="text-xs text-muted-foreground mt-2">{t('studentReportCard.studentPhoto')}</p>
    </div>
  );
};

// Reusable Grade Card Component
function GradeCard({ reportData, selectedStudent, selectedExam, academicYear, t }: {
  reportData: StudentReportData | null;
  selectedStudent: any;
  selectedExam: any;
  academicYear: any;
  t: (key: string) => string;
}) {
  const { language } = useLanguage();
  const { data: profile } = useProfile();
  const { data: grades } = useGrades(profile?.organization_id);

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
    <>
      {/* Report Card Header with Badges */}
      <Card className="print:shadow-none border-2">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Award className="h-8 w-8 text-primary" />
            <CardTitle className="text-3xl">{t('events.title')}</CardTitle>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {reportData.exam?.name || selectedExam?.name ? (
              <Badge className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                <span className="opacity-70 mr-1">{t('examReports.examName')}:</span>
                <span className="font-semibold">{reportData.exam?.name || selectedExam?.name}</span>
              </Badge>
            ) : null}
            {reportData.student?.class ? (
              <Badge className="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800">
                <span className="opacity-70 mr-1">{t('search.class')}:</span>
                <span className="font-semibold">
                  {reportData.student?.class}{reportData.student?.section ? ` - ${reportData.student.section}` : ''}
                </span>
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
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-[auto_1fr] gap-6">
            {/* Student Photo */}
            <ReportCardStudentAvatar 
              studentId={reportData.student?.id || (selectedStudent && 'id' in selectedStudent ? selectedStudent.id : null)}
              picturePath={(selectedStudent && 'picturePath' in selectedStudent ? selectedStudent.picturePath : null)}
            />

            {/* Student Details */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                {t('courses.studentInformation')}
              </h3>
              <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground min-w-[120px]">{t('userManagement.fullName')}:</span>
                  <span className="text-sm font-semibold">
                    {reportData.student?.full_name || (selectedStudent && 'fullName' in selectedStudent ? selectedStudent.fullName : '') || '-'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground min-w-[120px]">{t('students.rollNo')}:</span>
                  <span className="text-sm font-semibold">
                    {reportData.student?.roll_number || (selectedStudent && 'rollNumber' in selectedStudent ? selectedStudent.rollNumber : null) || '-'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground min-w-[120px]">{t('examReports.fatherName')}:</span>
                  <span className="text-sm font-semibold">
                    {(selectedStudent && 'fatherName' in selectedStudent ? selectedStudent.fatherName : null) || '-'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground min-w-[120px]">{t('studentReportCard.dateOfBirth')}:</span>
                  <span className="text-sm font-semibold">
                    {(selectedStudent && 'dateOfBirth' in selectedStudent && selectedStudent.dateOfBirth
                      ? formatDate(selectedStudent.dateOfBirth)
                      : null) || '-'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm text-muted-foreground min-w-[120px]">{t('examReports.admissionNo')}:</span>
                  <span className="text-sm font-semibold">
                    {reportData.student?.admission_no || (selectedStudent && 'admissionNumber' in selectedStudent ? selectedStudent.admissionNumber : null) || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Academic Performance Section */}
      <Card className="print:shadow-none">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            {t('studentReportCard.academicPerformance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
                  <TableRow className="bg-amber-50 dark:bg-amber-950/20 font-bold">
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
      <div className="grid md:grid-cols-2 gap-6">
        {/* Result Card */}
        <Card className="print:shadow-none">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg">{t('studentReportCard.overallResult')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('studentReportCard.overallPercentage')}:</span>
                <span className="text-2xl font-bold text-primary">
                  {reportData.summary?.overall_percentage !== null && reportData.summary?.overall_percentage !== undefined
                    ? `${reportData.summary.overall_percentage.toFixed(2)}%`
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('studentReportCard.overallGrade')}:</span>
                <Badge variant="default" className="text-xl px-4 py-2">
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
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('examReports.result')}:</span>
                {reportData.summary?.overall_result?.toLowerCase() === 'pass' ? (
                  <Badge variant="default" className="gap-1 text-base px-3 py-1">
                    <TrendingUp className="h-4 w-4" />
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
        <Card className="print:shadow-none">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-lg">{t('studentReportCard.teacherRemarks')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="min-h-[100px] p-3 border rounded-md bg-muted/10">
                <p className="text-sm text-muted-foreground italic">
                  {t('studentReportCard.noRemarks')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signatures Section */}
      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>{t('studentReportCard.signatures')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-8 pt-8">
            <div className="text-center space-y-2">
              <div className="h-16 border-b-2 border-muted-foreground/20"></div>
              <p className="text-sm font-medium">{t('studentReportCard.classTeacher')}</p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-16 border-b-2 border-muted-foreground/20"></div>
              <p className="text-sm font-medium">{t('studentReportCard.principal')}</p>
            </div>
            <div className="text-center space-y-2">
              <div className="h-16 border-b-2 border-muted-foreground/20"></div>
              <p className="text-sm font-medium">{t('studentReportCard.parent')}</p>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>{t('studentReportCard.dateIssued')}: {new Date().toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function StudentExamReport() {
  const { t } = useLanguage();
  const canViewReports = useHasPermission('students.read');
  const { data: profile } = useProfile();

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const { data: studentAdmissions, isLoading: studentsLoading } = useStudentAdmissions(profile?.organization_id, false, {
    enrollment_status: 'active',
  });
  // Extract students from admissions
  const students: Student[] = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    return studentAdmissions
      .map(admission => admission.student)
      .filter((student): student is Student => student !== null && student !== undefined);
  }, [studentAdmissions]);
  const { data: exams, isLoading: examsLoading } = useExams();
  const { data: academicYears } = useAcademicYears();
  const { data: currentAcademicYear, isLoading: currentYearLoading } = useCurrentAcademicYear();
  const latestExam = useLatestExamFromCurrentYear();
  const { data: examClasses, isLoading: examClassesLoading } = useExamClasses(selectedExamId);
  const { data: examStudents = [], isLoading: examStudentsLoading } = useExamStudents(selectedExamId);

  // Auto-select latest exam from current academic year
  useEffect(() => {
    if (!selectedExamId && !examsLoading && !currentYearLoading && exams !== undefined) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (exams && exams.length > 0) {
        setSelectedExamId(exams[0].id);
      }
    }
  }, [exams, latestExam, selectedExamId, examsLoading, currentYearLoading]);

  // Auto-select first class when exam classes are loaded
  useEffect(() => {
    if (examClasses && examClasses.length > 0 && !selectedClassId && !examClassesLoading) {
      setSelectedClassId(examClasses[0].id);
    }
  }, [examClasses, selectedClassId, examClassesLoading]);

  // Reset class and students when exam changes
  useEffect(() => {
    setSelectedClassId('');
    setSelectedStudentIds([]);
  }, [selectedExamId]);

  // Reset students when class changes
  useEffect(() => {
    setSelectedStudentIds([]);
  }, [selectedClassId]);

  const selectedExam = exams?.find((e) => e.id === selectedExamId);
  const academicYear = academicYears?.find((y) => y.id === selectedExam?.academicYearId);

  // Filter exam students by selected class
  const filteredExamStudents = useMemo(() => {
    if (!selectedClassId || !examStudents) return [];
    return examStudents.filter((es) => es.examClass?.id === selectedClassId);
  }, [examStudents, selectedClassId]);

  // Build exam options with academic year context
  const examOptions: ComboboxOption[] = (exams || []).map((exam) => ({
    value: exam.id,
    label: `${exam.name}${exam.academicYear ? ` (${exam.academicYear.name})` : ''}`,
  }));

  // Build class options from exam classes
  const classOptions: ComboboxOption[] = (examClasses || []).map((examClass) => {
    const className = examClass.classAcademicYear?.class?.name || 'Unknown';
    const section = examClass.classAcademicYear?.sectionName || '';
    return {
      value: examClass.id,
      label: `${className}${section ? ` - ${section}` : ''}`,
    };
  });

  // Build student options from filtered exam enrollment (by class)
  // Searchable by name, roll number, and secret number
  const studentOptions: ComboboxOption[] = filteredExamStudents.map((es) => {
    const student = es.studentAdmission?.student;
    // Get roll number from student object or exam roll number
    const roll = (student && 'rollNumber' in student ? student.rollNumber : null) ?? es.examRollNumber ?? '';
    const secret = es.examSecretNumber ?? '';
    const name = (student && 'fullName' in student ? student.fullName : '') || '';
    const studentId = (student && 'id' in student ? student.id : null) || es.studentAdmission?.studentId || '';
    return {
      value: studentId,
      // Include roll and secret in label for searchability
      label: `${name}${roll ? ` • Roll ${roll}` : ''}${secret ? ` • Secret ${secret}` : ''}`,
    };
  });

  // Find exam_student_ids for selected students
  const examStudentIds = useMemo(() => {
    return selectedStudentIds
      .map((studentId) => {
        const examStudent = filteredExamStudents.find(
          (es) => es.studentAdmission?.student?.id === studentId || es.studentAdmission?.studentId === studentId
        );
        return examStudent?.id;
      })
      .filter((id): id is string => Boolean(id));
  }, [selectedStudentIds, filteredExamStudents]);

  // Fetch reports for all selected students using a single query with parallel fetching
  const { data: reportsData, isLoading: reportsLoading, isFetching: reportsFetching } = useQuery({
    queryKey: ['student-exam-reports', examStudentIds.join(','), selectedExamId],
    queryFn: async () => {
      if (!examStudentIds.length || !selectedExamId) return [];
      
      // Fetch all reports in parallel
      const reportPromises = examStudentIds.map(async (examStudentId) => {
        try {
          const response = await examsApi.studentReport(selectedExamId, examStudentId);
          // Handle both wrapped and unwrapped responses
          if (response && typeof response === 'object' && 'data' in response) {
            return (response as { data: StudentReportData }).data;
          }
          return response as StudentReportData;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error fetching student report:', error);
          }
          return null;
        }
      });
      
      return Promise.all(reportPromises);
    },
    enabled: Boolean(examStudentIds.length > 0 && selectedExamId),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === studentOptions.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(studentOptions.map((opt) => opt.value));
    }
  };

  if (!canViewReports) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('events.noPermission')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title={t('events.title')}
        description={t('studentReportCard.selectStudentPrompt')}
        icon={<Award className="h-5 w-5" />}
      />

      {/* Selection Panel */}
      <FilterPanel title={t('library.selectStudent')}>
        <div className="grid gap-4 md:grid-cols-3">
            {/* Exam Selection */}
            <div className="space-y-2">
              <Label htmlFor="exam">{t('examReports.selectExam')}</Label>
              <Combobox
                options={examOptions}
                value={selectedExamId}
                onValueChange={(val) => {
                  setSelectedExamId(val);
                }}
                placeholder={t('examReports.selectExamPrompt')}
                searchPlaceholder={t('events.search') || 'Search...'}
                emptyText={t('exams.noExams') || 'No exams'}
                disabled={examsLoading}
              />
              {selectedExam && academicYear && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('examReports.academicYear')}: <span className="font-semibold">{academicYear.name}</span>
                </p>
              )}
            </div>

            {/* Class Selection */}
            <div className="space-y-2">
              <Label htmlFor="class">{t('search.class')}</Label>
              <Combobox
                options={classOptions}
                value={selectedClassId}
                onValueChange={setSelectedClassId}
                placeholder={selectedExamId ? t('events.selectClass') || 'Select class' : t('examReports.selectExamFirst') || 'Select an exam first'}
                searchPlaceholder={t('events.search') || 'Search...'}
                emptyText={
                  selectedExamId
                    ? (examClassesLoading ? t('common.loading') || 'Loading...' : t('classes.noClasses') || 'No classes')
                    : t('examReports.selectExamFirst') || 'Select an exam first'
                }
                disabled={!selectedExamId || examClassesLoading}
              />
            </div>

            {/* Student Selection - Multi-select with checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="student">{t('library.selectStudent')}</Label>
                {studentOptions.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-7 text-xs"
                  >
                    {selectedStudentIds.length === studentOptions.length ? t('events.deselectAll') || 'Deselect All' : t('events.selectAll') || 'Select All'}
                  </Button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                {selectedClassId ? (
                  examStudentsLoading ? (
                    <div className="text-sm text-muted-foreground text-center py-4">{t('common.loading') || 'Loading...'}</div>
                  ) : studentOptions.length > 0 ? (
                    studentOptions.map((option, optIdx) => {
                      const isSelected = selectedStudentIds.includes(option.value);
                      return (
                        <div key={option.value || `student-option-${optIdx}`} className="flex items-center space-x-2">
                          <Checkbox
                            id={`student-${option.value}`}
                            checked={isSelected}
                            onCheckedChange={() => handleStudentToggle(option.value)}
                          />
                          <label
                            htmlFor={`student-${option.value}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {option.label}
                          </label>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">{t('students.noStudents') || 'No students'}</div>
                  )
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {selectedExamId ? t('examReports.selectClassFirst') || 'Select a class first' : t('examReports.selectExamFirst') || 'Select an exam first'}
                  </div>
                )}
              </div>
              {selectedStudentIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedStudentIds.length} {t('events.selected') || 'selected'}
                </p>
              )}
            </div>
          </div>

          {selectedStudentIds.length > 0 && selectedExamId && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('studentReportCard.printCard')}
              </Button>
              {reportsData && reportsData.length > 0 && reportsData.some(r => r !== null) && (
                <ReportExportButtons
                  data={reportsData.filter((r): r is StudentReportData => r !== null)}
                  columns={[
                    { key: 'studentName', label: t('userManagement.fullName') || 'Student Name' },
                    { key: 'rollNumber', label: t('students.rollNo') || 'Roll Number' },
                    { key: 'className', label: t('search.class') || 'Class' },
                    { key: 'subjects', label: t('events.subjects') || 'Subjects' },
                    { key: 'totalMarks', label: t('examReports.totalMarks') || 'Total Marks' },
                    { key: 'percentage', label: t('examReports.percentage') || 'Percentage' },
                    { key: 'grade', label: t('studentReportCard.grade') || 'Grade' },
                    { key: 'result', label: t('examReports.result') || 'Result' },
                  ]}
                  reportKey="student_report_card"
                  title={`${t('events.title') || 'Student Report Card'} - ${selectedExam?.name || ''}`}
                  transformData={(data) => data.map((report: StudentReportData) => {
                    // Build subjects list
                    const subjectsList = (report.subjects || []).map((s) => {
                      const subjectName = s.subject?.name || s.name || '-';
                      const marks = s.marks;
                      const isAbsent = s.is_absent;
                      if (isAbsent) {
                        return `${subjectName}: ${t('examReports.absent') || 'Absent'}`;
                      }
                      if (marks?.obtained !== null && marks?.obtained !== undefined) {
                        return `${subjectName}: ${marks.obtained}/${marks.total}`;
                      }
                      return `${subjectName}: -`;
                    }).join('; ');

                    return {
                      studentName: report.student?.full_name || '-',
                      rollNumber: report.student?.roll_number || '-',
                      className: report.student?.class
                        ? `${report.student.class}${report.student.section ? ` - ${report.student.section}` : ''}`
                        : '-',
                      subjects: subjectsList,
                      totalMarks: `${report.summary?.total_marks_obtained || 0}/${report.summary?.total_maximum_marks || 0}`,
                      percentage: report.summary?.overall_percentage !== null && report.summary?.overall_percentage !== undefined
                        ? `${report.summary.overall_percentage.toFixed(2)}%`
                        : '-',
                      grade: (() => {
                        const percentage = report.summary?.overall_percentage;
                        if (percentage !== null && percentage !== undefined) {
                          // Note: We can't call calculateGrade here directly as we don't have grades in scope
                          // The backend should include grade in the response
                          return '-';
                        }
                        return '-';
                      })(),
                      result: report.summary?.overall_result === 'Pass'
                        ? (t('events.pass') || 'Pass')
                        : (t('events.fail') || 'Fail'),
                    };
                  })}
                  buildFiltersSummary={() => {
                    const parts: string[] = [];
                    if (selectedExam?.name) parts.push(`Exam: ${selectedExam.name}`);
                    if (academicYear?.name) parts.push(`Academic Year: ${academicYear.name}`);
                    parts.push(`Students: ${selectedStudentIds.length}`);
                    return parts.join(' | ');
                  }}
                  schoolId={profile?.default_school_id}
                  templateType="student_report_card"
                  disabled={!reportsData || reportsData.length === 0}
                />
              )}
            </div>
          )}
      </FilterPanel>

      {/* Report Cards Display */}
      {selectedStudentIds.length > 0 && selectedExamId && (
        <>
          {examStudentIds.length === 0 && filteredExamStudents.length > 0 && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p>{t('leave.studentNotEnrolled') || 'Selected students are not enrolled in the selected exam.'}</p>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-6">
            {reportsLoading || reportsFetching ? (
              <Card>
                <CardContent className="py-12">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-3/4 mx-auto" />
                    <Skeleton className="h-6 w-1/2 mx-auto" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                </CardContent>
              </Card>
            ) : reportsData ? (
              reportsData.map((reportData, index) => {
                const studentId = selectedStudentIds[index];
                const selectedStudent = students?.find((s) => s.id === studentId);
                const uniqueKey = studentId || `report-${index}`;

                if (!reportData) {
                  return (
                    <Card key={`no-data-${uniqueKey}`}>
                      <CardContent className="flex items-center justify-center py-12">
                        <div className="text-center space-y-2">
                          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                          <p className="text-muted-foreground">{t('examReports.noDataAvailable') || 'No data available'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <div key={`report-${uniqueKey}`} className={selectedStudentIds.length > 1 ? 'break-inside-avoid page-break-after' : ''}>
                    <GradeCard
                      reportData={reportData}
                      selectedStudent={selectedStudent}
                      selectedExam={selectedExam}
                      academicYear={academicYear}
                      t={t}
                    />
                  </div>
                );
              })
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
