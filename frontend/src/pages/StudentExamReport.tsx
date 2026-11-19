import { useQuery } from '@tanstack/react-query';
import { Printer, Award, User, AlertCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  CombinedExamResultCard,
  type CombinedReportCard,
} from '@/components/exams/CombinedExamResultCard';

import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useExams, useLatestExamFromCurrentYear, useExamClasses } from '@/hooks/useExams';
import { useExamStudentsWithNumbers } from '@/hooks/useExamNumbers';
import {
  translateCombinedExamError,
  useExportStudentExamReportCardsPdf,
} from '@/hooks/useExportStudentExamReportCardsPdf';
import { getReportLocaleOptions } from '@/lib/reporting/reportLocaleOptions';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';
import { kashfCardTextFor } from '@/lib/exams/kashfCardText';
import { calculateGrade } from '@/lib/utils/gradeCalculator';
import { useGrades } from '@/hooks/useGrades';
import { examsApi } from '@/lib/api/client';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
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
      passing?: number | null;
    };
    is_absent?: boolean;
    is_pass?: boolean | null;
    grade_name?: string | null;
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
    overall_result?: 'Pass' | 'Fail' | 'Incomplete';
    overall_grade?: string | null;
    marks_cut?: number;
    absence_count?: number;
  };
};

// Component for authenticated student picture display in report card
const ReportCardStudentAvatar = ({
  studentId,
  picturePath,
}: {
  studentId?: string | null;
  picturePath?: string | null;
}) => {
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
              Accept: 'image/*',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      <p className="src-photo-label text-xs text-muted-foreground mt-2">
        {t('studentReportCard.studentPhoto')}
      </p>
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
}: {
  reportData: StudentReportData | null;
  selectedExam: any;
  academicYear: any;
  schoolName?: string | null;
  organizationName?: string | null;
}) {
  const { data: profile } = useProfile();
  const { language } = useLanguage();
  const kashfCardText = kashfCardTextFor(language);
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

  const subjects = reportData.subjects ?? [];
  const half = Math.ceil(subjects.length / 2);
  const leftSubjects = subjects.slice(0, half);
  const rightSubjects = subjects.slice(half);
  const rowCount = Math.max(leftSubjects.length, rightSubjects.length);
  const summary = reportData.summary;
  const passingValues = subjects
    .map((subject) => subject.marks?.passing)
    .filter((value): value is number => value !== null && value !== undefined);
  const fullValues = subjects
    .map((subject) => subject.marks?.total)
    .filter((value): value is number => typeof value === 'number');
  const passingUniform =
    passingValues.length > 0 && passingValues.every((value) => value === passingValues[0]);
  const fullUniform = fullValues.length > 0 && fullValues.every((value) => value === fullValues[0]);
  const minimumValue =
    passingValues.length === 0
      ? null
      : passingUniform
        ? passingValues[0]
        : passingValues.reduce((sum, value) => sum + value, 0);
  const maximumValue = fullUniform ? fullValues[0] : summary?.total_maximum_marks;
  const overallPercentage = summary?.overall_percentage;
  const resultKey =
    summary?.overall_result === 'Pass'
      ? 'pass'
      : summary?.overall_result === 'Incomplete'
        ? 'incomplete'
        : 'fail';
  const calculatedGrade =
    resultKey !== 'incomplete' && overallPercentage !== null && overallPercentage !== undefined
      ? calculateGrade(overallPercentage, grades || [], language)?.name
      : null;
  const overallGrade =
    resultKey === 'incomplete' ? '—' : summary?.overall_grade || calculatedGrade || '—';
  const resultLabel =
    resultKey === 'pass'
      ? kashfCardText.pass
      : resultKey === 'incomplete'
        ? kashfCardText.incomplete
        : kashfCardText.fail;
  const studentName = reportData.student?.full_name || '—';
  const fatherName = reportData.student?.father_name || '—';
  const birthLabel =
    reportData.student?.birth_date_formatted ||
    (reportData.student?.birth_date ? formatDate(reportData.student.birth_date) : null) ||
    '—';

  const formatMark = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    const number = Number(value);
    if (Math.abs(number - Math.round(number)) < 0.001) return String(Math.round(number));
    return String(Math.round(number * 100) / 100);
  };

  const subjectGrade = (subject: (typeof subjects)[number]) => {
    if (subject.is_absent) return null;
    if (subject.grade_name) return subject.grade_name;
    const percentage = subject.marks?.percentage;
    if (percentage === null || percentage === undefined) return null;
    return calculateGrade(percentage, grades || [], language)?.name ?? null;
  };

  const renderMark = (subject: (typeof subjects)[number] | undefined) => {
    if (!subject) return null;
    if (subject.is_absent) {
      return <span className="kashf-fail">{kashfCardText.absent}</span>;
    }
    const obtained = subject.marks?.obtained;
    if (obtained === null || obtained === undefined) return <span>—</span>;
    const total = subject.marks?.total;
    const percentage = subject.marks?.percentage;
    const grade = subjectGrade(subject);
    const tone = subject.is_pass === false ? 'kashf-fail' : subject.is_pass ? 'kashf-pass' : '';
    return (
      <span className={tone}>
        <span dir="ltr">
          {formatMark(obtained)}
          {typeof total === 'number' ? ` / ${formatMark(total)}` : ''}
        </span>
        {(percentage !== null && percentage !== undefined) || grade ? (
          <span className="kashf-mark-meta">
            {percentage !== null && percentage !== undefined ? `${formatMark(percentage)}%` : ''}
            {grade ? `${percentage !== null && percentage !== undefined ? ' · ' : ''}${grade}` : ''}
          </span>
        ) : null}
      </span>
    );
  };

  return (
    <article className="kashf-sheet student-report-card" dir="rtl">
      <header className="kashf-head">
        <div className="kashf-head-side">
          <ReportCardStudentAvatar
            studentId={reportData.student?.id || null}
            picturePath={reportData.student?.picture_path || null}
          />
        </div>
        <div className="kashf-head-text">
          {displaySchoolName ? <p className="kashf-school">{displaySchoolName}</p> : null}
          <h2 className="kashf-title">{kashfCardText.title}</h2>
          <p className="kashf-exam">
            {[examName, academicYear?.name, classLabel].filter(Boolean).join(' — ')}
          </p>
        </div>
        <div className="kashf-head-side" />
      </header>

      <div className="kashf-identity">
        <div>
          <p className="text-xs text-muted-foreground">{kashfCardText.fullName}</p>
          <p className="text-sm font-semibold">{studentName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{kashfCardText.fatherName}</p>
          <p className="text-sm font-semibold">{fatherName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{kashfCardText.rollNumber}</p>
          <p className="text-sm font-semibold" dir="ltr">
            {reportData.student?.roll_number || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{kashfCardText.className}</p>
          <p className="text-sm font-semibold">{classLabel || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{kashfCardText.admissionNo}</p>
          <p className="text-sm font-semibold" dir="ltr">
            {reportData.student?.admission_no || '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{kashfCardText.dateOfBirth}</p>
          <p className="text-sm font-semibold">{birthLabel}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{kashfCardText.subject}</TableHead>
              <TableHead className="text-center">{kashfCardText.marks}</TableHead>
              <TableHead>{kashfCardText.subject}</TableHead>
              <TableHead className="text-center">{kashfCardText.marks}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }, (_, index) => {
              const left = leftSubjects[index];
              const right = rightSubjects[index];
              return (
                <TableRow key={left?.exam_subject_id || left?.id || `row-${index}`}>
                  <TableCell className="font-medium">
                    {left?.subject?.name || left?.name || '—'}
                  </TableCell>
                  <TableCell className="text-center">{renderMark(left)}</TableCell>
                  <TableCell className="font-medium">
                    {right ? right.subject?.name || right.name || '—' : ''}
                  </TableCell>
                  <TableCell className="text-center">{renderMark(right)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="kashf-totals">
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">
            {passingUniform ? kashfCardText.minimumMarks : kashfCardText.passingTotal}
          </p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {formatMark(minimumValue)}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.maximumMarks}</p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {formatMark(maximumValue)}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.obtainedMarks}</p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {formatMark(summary?.total_marks_obtained)}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.totalMarks}</p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {formatMark(summary?.total_maximum_marks)}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.overallPercentage}</p>
          <p className="text-base font-semibold tabular-nums" dir="ltr">
            {overallPercentage !== null && overallPercentage !== undefined
              ? `${formatMark(overallPercentage)}%`
              : '—'}
          </p>
        </div>
        <div className="kashf-stat">
          <p className="text-xs text-muted-foreground">{kashfCardText.overallGrade}</p>
          <p className="text-base font-semibold">{overallGrade}</p>
        </div>
        {summary?.marks_cut !== undefined ? (
          <>
            <div className="kashf-stat">
              <p className="text-xs text-muted-foreground">{kashfCardText.absenceCount}</p>
              <p className="text-base font-semibold tabular-nums" dir="ltr">
                {summary.absence_count ?? 0}
              </p>
            </div>
            <div className="kashf-stat">
              <p className="text-xs text-muted-foreground">{kashfCardText.marksCut}</p>
              <p className="text-base font-semibold tabular-nums" dir="ltr">
                {formatMark(summary.marks_cut)}
              </p>
            </div>
            {summary.total_marks_obtained_raw !== undefined ? (
              <div className="kashf-stat">
                <p className="text-xs text-muted-foreground">{kashfCardText.totalRaw}</p>
                <p className="text-base font-semibold tabular-nums" dir="ltr">
                  {formatMark(summary.total_marks_obtained_raw)}/
                  {formatMark(summary.total_maximum_marks)}
                </p>
              </div>
            ) : null}
          </>
        ) : null}
        <div className={`kashf-stat kashf-verdict kashf-${resultKey}`}>
          <p className="text-xs text-muted-foreground">{kashfCardText.overallResult}</p>
          <p className="text-base font-semibold">{resultLabel}</p>
        </div>
      </div>

      <p className="kashf-attest">
        {kashfCardText.attestationLead(displaySchoolName || '—')}
        <strong>{studentName}</strong>
        {kashfCardText.attestationBetween}
        <strong>{fatherName}</strong>
        {kashfCardText.attestationEnding(resultKey, examName || '—', overallGrade)}
      </p>
      <p className="kashf-conduct">{kashfCardText.conduct}</p>

      <div className="kashf-signs">
        <div>
          <i />
          <span>{kashfCardText.principal}</span>
        </div>
        <div>
          <i />
          <span>{kashfCardText.schoolSeal}</span>
        </div>
      </div>

      <footer className="kashf-foot">
        <span>
          {kashfCardText.dateIssued}: {formatDate(new Date())}
        </span>
      </footer>
    </article>
  );
}

export default function StudentExamReport() {
  const { t, language } = useLanguage();
  const canViewReports = useHasPermission('students.read');
  const { data: profile } = useProfile();
  const { data: organization } = useCurrentOrganization();
  const { data: school } = useSchool(profile?.default_school_id ?? '');
  const exportPdf = useExportStudentExamReportCardsPdf();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const [selectedExamStudentIds, setSelectedExamStudentIds] = useState<string[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedSecondExamId, setSelectedSecondExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const { data: exams, isLoading: examsLoading } = useExams();
  const { data: academicYears } = useAcademicYears();
  const { isLoading: currentYearLoading } = useCurrentAcademicYear();
  const latestExam = useLatestExamFromCurrentYear();
  const { data: examClasses, isLoading: examClassesLoading } = useExamClasses(selectedExamId);

  const { data: studentsWithNumbers, isLoading: examStudentsLoading } = useExamStudentsWithNumbers(
    selectedExamId && selectedClassId ? selectedExamId : undefined,
    selectedClassId || undefined,
  );
  const classStudents = studentsWithNumbers?.students ?? [];

  useEffect(() => {
    if (!selectedExamId && !examsLoading && !currentYearLoading && exams !== undefined) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (exams && exams.length > 0) {
        setSelectedExamId(exams[0].id);
      }
    }
  }, [exams, latestExam, selectedExamId, examsLoading, currentYearLoading]);

  useEffect(() => {
    if (examClasses && examClasses.length > 0 && !selectedClassId && !examClassesLoading) {
      setSelectedClassId(examClasses[0].id);
    }
  }, [examClasses, selectedClassId, examClassesLoading]);

  useEffect(() => {
    setSelectedClassId('');
    setSelectedExamStudentIds([]);
    setSelectedSecondExamId('');
  }, [selectedExamId]);

  useEffect(() => {
    setSelectedExamStudentIds([]);
  }, [selectedClassId]);

  const selectedExam = exams?.find((e) => e.id === selectedExamId);
  const academicYear = academicYears?.find((y) => y.id === selectedExam?.academicYearId);

  const examOptions: ComboboxOption[] = (exams || []).map((exam) => ({
    value: exam.id,
    label: `${exam.name}${exam.academicYear ? ` (${exam.academicYear.name})` : ''}`,
  }));

  const secondExamOptions: ComboboxOption[] = useMemo(
    () =>
      (exams || [])
        .filter(
          (exam) =>
            exam.id !== selectedExamId && exam.academicYearId === selectedExam?.academicYearId,
        )
        .map((exam) => ({
          value: exam.id,
          label: exam.name,
        })),
    [exams, selectedExam?.academicYearId, selectedExamId],
  );

  const classOptions: ComboboxOption[] = (examClasses || []).map((examClass) => {
    const className = examClass.classAcademicYear?.class?.name || 'Unknown';
    const section = examClass.classAcademicYear?.sectionName || '';
    return {
      value: examClass.id,
      label: `${className}${section ? ` - ${section}` : ''}`,
    };
  });

  const studentOptions: ComboboxOption[] = classStudents.map((es) => {
    const roll = es.examRollNumber ?? '';
    const secret = es.examSecretNumber ?? '';
    const name = es.fullName || '';
    return {
      value: es.examStudentId,
      label: `${name}${roll ? ` • Roll ${roll}` : ''}${secret ? ` • Secret ${secret}` : ''}`,
    };
  });

  const {
    data: reportsData,
    isLoading: reportsLoading,
    isFetching: reportsFetching,
  } = useQuery({
    queryKey: ['student-exam-reports', selectedExamStudentIds.join(','), selectedExamId, language],
    queryFn: async () => {
      if (!selectedExamStudentIds.length || !selectedExamId) return [];

      const reportPromises = selectedExamStudentIds.map(async (examStudentId) => {
        try {
          const response = await examsApi.studentReport(selectedExamId, examStudentId, language);
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
    enabled: Boolean(selectedExamStudentIds.length > 0 && selectedExamId && !selectedSecondExamId),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const {
    data: combinedCards,
    isLoading: combinedLoading,
    isFetching: combinedFetching,
    error: combinedError,
  } = useQuery({
    queryKey: [
      'combined-student-exam-reports',
      profile?.organization_id,
      profile?.default_school_id ?? null,
      selectedExamId,
      selectedSecondExamId,
      selectedExamStudentIds.join(','),
      language,
    ],
    queryFn: async () => {
      const locale = getReportLocaleOptions(language);
      const response = await examsApi.combinedStudentReports(selectedExamId, {
        second_exam_id: selectedSecondExamId,
        exam_student_ids: selectedExamStudentIds,
        language: locale.language,
        calendar_preference: locale.calendarPreference,
      });
      return (response.cards ?? []) as CombinedReportCard[];
    },
    enabled: Boolean(
      selectedExamStudentIds.length > 0 &&
      selectedExamId &&
      selectedSecondExamId &&
      profile?.organization_id &&
      profile?.default_school_id,
    ),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const translateRef = useRef(t);
  translateRef.current = t;
  const combinedErrorMessage = combinedError instanceof Error ? combinedError.message : '';

  useEffect(() => {
    if (!combinedErrorMessage) return;
    const translate = translateRef.current;
    showToast.error(
      translateCombinedExamError(combinedErrorMessage, translate) ||
        translate('examReports.noDataAvailable'),
    );
  }, [combinedErrorMessage]);

  const handlePrint = () => {
    if (!selectedExamId || selectedExamStudentIds.length === 0) return;
    setExportDialogOpen(true);
    exportPdf.mutate({
      examId: selectedExamId,
      secondExamId: selectedSecondExamId || undefined,
      examStudentIds: selectedExamStudentIds,
      brandingId: profile?.default_school_id || undefined,
    });
  };

  const handleStudentToggle = (examStudentId: string) => {
    setSelectedExamStudentIds((prev) =>
      prev.includes(examStudentId)
        ? prev.filter((id) => id !== examStudentId)
        : [...prev, examStudentId],
    );
  };

  const handleSelectAll = () => {
    if (selectedExamStudentIds.length === studentOptions.length) {
      setSelectedExamStudentIds([]);
    } else {
      setSelectedExamStudentIds(studentOptions.map((opt) => opt.value));
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
    <div className="student-exam-report-page container mx-auto py-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('nav.examReports')}
        description={t('studentReportCard.selectStudentPrompt')}
        icon={<Award className="h-5 w-5" />}
        className="no-print"
      />

      <FilterPanel title={t('library.selectStudent')} className="no-print">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                {t('examReports.academicYear')}:{' '}
                <span className="font-semibold">{academicYear.name}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="second-exam">{t('studentReportCard.combineWithExam')}</Label>
            <Combobox
              options={[
                { value: '__single__', label: t('studentReportCard.singleExamCard') },
                ...secondExamOptions,
              ]}
              value={selectedSecondExamId || '__single__'}
              onValueChange={(val) => setSelectedSecondExamId(val === '__single__' ? '' : val)}
              placeholder={t('studentReportCard.singleExamCard')}
              searchPlaceholder={t('events.search')}
              emptyText={t('exams.noExams')}
              disabled={!selectedExamId || examsLoading}
            />
            <p className="text-xs text-muted-foreground">{t('studentReportCard.combineHint')}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="class">{t('search.class')}</Label>
            <Combobox
              options={classOptions}
              value={selectedClassId}
              onValueChange={setSelectedClassId}
              placeholder={
                selectedExamId
                  ? t('events.selectClass') || 'Select class'
                  : t('examReports.selectExamFirst') || 'Select an exam first'
              }
              searchPlaceholder={t('events.search') || 'Search...'}
              emptyText={
                selectedExamId
                  ? examClassesLoading
                    ? t('common.loading') || 'Loading...'
                    : t('classes.noClasses') || 'No classes'
                  : t('examReports.selectExamFirst') || 'Select an exam first'
              }
              disabled={!selectedExamId || examClassesLoading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="student">{t('library.selectStudent')}</Label>
              {studentOptions.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-7 text-xs">
                  {selectedExamStudentIds.length === studentOptions.length
                    ? t('events.deselectAll') || 'Deselect All'
                    : t('events.selectAll') || 'Select All'}
                </Button>
              )}
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
              {selectedClassId ? (
                examStudentsLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {t('common.loading') || 'Loading...'}
                  </div>
                ) : studentOptions.length > 0 ? (
                  studentOptions.map((option, optIdx) => {
                    const isSelected = selectedExamStudentIds.includes(option.value);
                    return (
                      <div
                        key={option.value || `student-option-${optIdx}`}
                        className="flex items-center space-x-2"
                      >
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
                  <div className="text-sm text-muted-foreground text-center py-4">
                    {t('students.noStudents') || 'No students'}
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  {selectedExamId
                    ? t('examReports.selectClassFirst') || 'Select a class first'
                    : t('examReports.selectExamFirst') || 'Select an exam first'}
                </div>
              )}
            </div>
            {selectedExamStudentIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedExamStudentIds.length} {t('events.selected') || 'selected'}
              </p>
            )}
          </div>
        </div>

        {selectedExamStudentIds.length > 0 && selectedExamId && (
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={handlePrint}
              disabled={exportPdf.isPending || exportPdf.isPolling}
              aria-label={
                selectedSecondExamId
                  ? t('studentReportCard.exportCombinedPdf')
                  : t('studentReportCard.printCard')
              }
            >
              <Printer className="h-4 w-4" />
              <span className="ms-2 hidden sm:inline">
                {exportPdf.isPolling
                  ? t('studentReportCard.generating')
                  : selectedSecondExamId
                    ? t('studentReportCard.exportCombinedPdf')
                    : t('studentReportCard.printCard')}
              </span>
            </Button>
            {!selectedSecondExamId &&
              reportsData &&
              reportsData.length > 0 &&
              reportsData.some((r) => r !== null) && (
                <ReportExportButtons
                  data={reportsData.filter((r): r is StudentReportData => r !== null)}
                  columns={[
                    { key: 'studentName', label: t('userManagement.fullName') || 'Student Name' },
                    { key: 'rollNumber', label: t('students.rollNo') || 'Roll Number' },
                    { key: 'className', label: t('search.class') || 'Class' },
                    { key: 'subjects', label: t('events.subjects') || 'Subjects' },
                    {
                      key: 'absenceCount',
                      label: t('examAbsencePenalty.absenceCount') || 'Absences',
                    },
                    { key: 'marksCut', label: t('examAbsencePenalty.marksCut') || 'Marks cut' },
                    { key: 'totalMarks', label: t('examReports.totalMarks') || 'Total Marks' },
                    { key: 'percentage', label: t('examReports.percentage') || 'Percentage' },
                    { key: 'grade', label: t('studentReportCard.grade') || 'Grade' },
                    { key: 'result', label: t('examReports.result') || 'Result' },
                  ]}
                  reportKey="student_report_card_summary"
                  title={`${t('nav.studentReportCard') || 'Student Report Card'} - ${selectedExam?.name || ''}`}
                  transformData={(data) =>
                    data.map((report: StudentReportData) => {
                      const subjectsList = (report.subjects || [])
                        .map((s) => {
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
                        })
                        .join('; ');

                      return {
                        studentName: report.student?.full_name || '-',
                        rollNumber: report.student?.roll_number || '-',
                        className: report.student?.class
                          ? `${report.student.class}${report.student.section ? ` - ${report.student.section}` : ''}`
                          : '-',
                        subjects: subjectsList,
                        absenceCount: report.summary?.absence_count ?? '-',
                        marksCut: report.summary?.marks_cut ?? '-',
                        totalMarks: `${report.summary?.total_marks_obtained || 0}/${report.summary?.total_maximum_marks || 0}`,
                        percentage:
                          report.summary?.overall_percentage !== null &&
                          report.summary?.overall_percentage !== undefined
                            ? `${report.summary.overall_percentage.toFixed(2)}%`
                            : '-',
                        grade: report.summary?.overall_grade || '-',
                        result:
                          report.summary?.overall_result === 'Pass'
                            ? t('events.pass') || 'Pass'
                            : report.summary?.overall_result === 'Incomplete'
                              ? t('examReports.incomplete') || 'Incomplete'
                              : t('events.fail') || 'Fail',
                      };
                    })
                  }
                  buildFiltersSummary={() => {
                    const parts: string[] = [];
                    if (selectedExam?.name) parts.push(`Exam: ${selectedExam.name}`);
                    if (academicYear?.name) parts.push(`Academic Year: ${academicYear.name}`);
                    parts.push(`Students: ${selectedExamStudentIds.length}`);
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

      {selectedExamStudentIds.length > 0 && selectedExamId && selectedSecondExamId && (
        <div className="space-y-6">
          {combinedLoading || combinedFetching ? (
            <Card>
              <CardContent className="py-12">
                <div className="space-y-4">
                  <Skeleton className="mx-auto h-8 w-3/4" />
                  <Skeleton className="mx-auto h-6 w-1/2" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </CardContent>
            </Card>
          ) : combinedError ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="space-y-2 text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {translateCombinedExamError(
                      combinedError instanceof Error ? combinedError.message : '',
                      t,
                    ) || t('examReports.noDataAvailable')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : combinedCards && combinedCards.length > 0 ? (
            combinedCards.map((card) => (
              <CombinedExamResultCard
                key={card.student.exam_student_id || card.student.id || card.student.full_name}
                card={card}
                schoolName={school?.schoolName}
                organizationName={organization?.name}
              />
            ))
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">{t('examReports.noDataAvailable')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {selectedExamStudentIds.length > 0 && selectedExamId && !selectedSecondExamId && (
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
              const examStudentId = selectedExamStudentIds[index];
              const uniqueKey = examStudentId || `report-${index}`;

              if (!reportData) {
                return (
                  <Card key={`no-data-${uniqueKey}`}>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center space-y-2">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">
                          {t('examReports.noDataAvailable') || 'No data available'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <div key={`report-${uniqueKey}`}>
                  <GradeCard
                    reportData={reportData}
                    selectedExam={selectedExam}
                    academicYear={academicYear}
                    schoolName={school?.schoolName}
                    organizationName={organization?.name}
                  />
                </div>
              );
            })
          ) : null}
        </div>
      )}

      <ReportProgressDialog
        open={
          exportDialogOpen &&
          (exportPdf.isPending || exportPdf.isPolling || exportPdf.status !== null)
        }
        onOpenChange={(open) => {
          setExportDialogOpen(open);
          if (!open) {
            exportPdf.reset();
          }
        }}
        status={exportPdf.status}
        progress={exportPdf.progress}
        fileName={exportPdf.fileName}
        error={exportPdf.error}
        onDownload={() => {
          void exportPdf.downloadReport();
        }}
        onClose={() => {
          setExportDialogOpen(false);
          exportPdf.reset();
        }}
      />
    </div>
  );
}
