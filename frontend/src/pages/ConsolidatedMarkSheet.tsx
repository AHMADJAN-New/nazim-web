import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Printer, Search, Award, TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { SplitDataTable } from '@/components/data-table/split-data-table';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { TopStudentsDialog, type TopStudentReportRow } from '@/components/reports/TopStudentsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useExams, useExamClasses, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useGrades } from '@/hooks/useGrades';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { examsApi } from '@/lib/api/client';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataTable } from '@/hooks/use-data-table';
import { useProfile } from '@/hooks/useProfiles';
import { calculateGrade } from '@/lib/utils/gradeCalculator';
import { MultiSectionReportExportButtons } from '@/components/reports/MultiSectionReportExportButtons';
import type { MultiSectionReportSection } from '@/components/reports/MultiSectionReportExportButtons';
import {
  fetchAllConsolidatedMarkSheetRows,
  getConsolidatedExportIdentityColumns,
  mapConsolidatedIdentityFields,
} from '@/lib/reporting/consolidatedMarkSheetExport';
import { formatMark, formatPercentage } from '@/lib/reporting/markFormat';
import { getTopStudentsWithTies } from '@/lib/reporting/studentRanking';

// Report data type
type ReportData = {
  exam?: {
    id: string;
    name: string;
    status: string;
    start_date?: string;
    end_date?: string;
    academic_year?: { id: string; name: string };
  };
  class?: {
    id: string;
    name: string;
    section?: string;
  };
  subjects?: Array<{ 
    id: string; 
    subject_id: string;
    name: string; 
    total_marks?: number;
    passing_marks?: number;
  }>;
  students?: Array<{
    roll_number: string | null;
    student_name: string;
    father_name?: string | null;
    admission_no?: string;
    subjects: Array<{
      subject_id: string;
      subject_name: string;
      marks_obtained: number | null;
      total_marks: number;
      passing_marks: number | null;
      is_absent: boolean;
      is_pass: boolean | null;
    }>;
    total_obtained: number;
    total_maximum: number;
    percentage: number;
    grade: string | null;
    grade_details?: {
      name: string;
      name_en: string;
      name_ar: string;
      name_ps: string;
      name_fa: string;
      min_percentage: number;
      max_percentage: number;
      is_pass: boolean;
    };
    result: 'Pass' | 'Fail' | 'Incomplete';
    has_incomplete_marks: boolean;
  }>;
  summary?: {
    total_students: number;
    subjects_count: number;
    pass_count: number;
    fail_count: number;
    incomplete_count: number;
  };
};

type ConsolidatedStudent = NonNullable<ReportData['students']>[number];

function hasValidConsolidatedMarks(student: ConsolidatedStudent): boolean {
  if (!Number.isFinite(Number(student.total_maximum)) || Number(student.total_maximum) <= 0) {
    return false;
  }

  return student.subjects.some(
    (subject) =>
      !subject.is_absent &&
      subject.marks_obtained !== null &&
      Number.isFinite(Number(subject.marks_obtained))
  );
}

const EXPORT_PAGE_SIZE = 200;

// Component for individual class report in multiple classes tab
function ClassReportTab({ examClass, examId, academicYear, selectedExam }: { examClass: any; examId: string; academicYear?: any; selectedExam?: any }) {
  const { t } = useLanguage();
  
  const { data: classReport, isLoading, isFetching } = useQuery<ReportData>({
    queryKey: ['consolidated-report', examId, examClass.id],
    queryFn: async () => {
      const response = await examsApi.consolidatedClassReport(examId, examClass.id);
      return (response as { data?: unknown }).data ?? response;
    },
    enabled: Boolean(examId && examClass.id),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return (
    <TabsContent value={examClass.id} className="space-y-6">
      {isLoading || isFetching ? (
        <Card>
          <CardContent className="py-12">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : classReport ? (
        <MarkSheetTable report={classReport} academicYear={academicYear} selectedExam={selectedExam} />
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Search className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('examReports.noDataAvailable')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  );
}

// Reusable Mark Sheet Component
function MarkSheetTable({
  report,
  academicYear,
  selectedExam,
  onViewAllTopStudents,
}: {
  report: ReportData;
  academicYear?: any;
  selectedExam?: any;
  onViewAllTopStudents?: () => void;
}) {
  const { t, language } = useLanguage();
  const { data: profile } = useProfile();
  const { data: grades } = useGrades(profile?.organization_id);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sortedStudents = useMemo(() => {
    if (!report.students) return [];
    // Calculate grades for each student
    const studentsWithGrades = report.students.map((student) => {
      const gradeInfo = calculateGrade(student.percentage, grades || [], language);
      return {
        ...student,
        grade: gradeInfo?.name || student.grade || '-',
        gradeDetails: gradeInfo,
        ranking_eligible: hasValidConsolidatedMarks(student),
      };
    });
    const sorted = studentsWithGrades.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    let currentRank = 0;
    let previousPercentage: number | null = null;

    return sorted.map((student, index) => {
      if (!student.ranking_eligible) {
        return { ...student, computedRank: null };
      }

      if (currentRank === 0 || student.percentage !== previousPercentage) {
        currentRank += 1;
      }
      previousPercentage = student.percentage;

      return { ...student, computedRank: currentRank };
    });
  }, [report.students, grades, language]);

  const topStudents = useMemo(() => getTopStudentsWithTies(sortedStudents), [sortedStudents]);

  // Paginate students
  const paginatedStudents = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedStudents.slice(startIndex, endIndex);
  }, [sortedStudents, page, pageSize]);

  // Calculate pagination meta
  const paginationMeta = useMemo(() => {
    const total = sortedStudents.length;
    const lastPage = Math.ceil(total / pageSize);
    return {
      current_page: page,
      per_page: pageSize,
      total,
      last_page: lastPage,
      from: sortedStudents.length > 0 ? (page - 1) * pageSize + 1 : 0,
      to: Math.min(page * pageSize, total),
    };
  }, [sortedStudents.length, page, pageSize]);

  // Define columns for DataTable
  const columns: ColumnDef<any>[] = useMemo(() => {
    const baseColumns: ColumnDef<any>[] = [
      {
        id: 'rank',
        header: () => <div className="whitespace-nowrap">{t('examReports.rank')}</div>,
        cell: ({ row }) => {
          const rank = row.original.computedRank;
          return (
            <div className="whitespace-nowrap font-medium">
              {rank === 1 && <Award className="h-4 w-4 text-yellow-500 inline mr-1" />}
              {rank ?? '-'}
            </div>
          );
        },
      },
      {
        accessorKey: 'student_name',
        header: () => (
          <div className="whitespace-nowrap text-start">
            {t('examReports.studentName')}
          </div>
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-start font-medium">
            {row.original.student_name}
          </div>
        ),
      },
      {
        accessorKey: 'father_name',
        header: () => (
          <div className="whitespace-nowrap text-start">
            {t('examReports.fatherName') || 'Father Name'}
          </div>
        ),
        cell: ({ row }) => (
          <div className="whitespace-nowrap text-start">
            {row.original.father_name || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'roll_number',
        header: () => <div className="whitespace-nowrap">{t('students.rollNumber')}</div>,
        cell: ({ row }) => <div className="whitespace-nowrap">{row.original.roll_number || '-'}</div>,
      },
      {
        id: 'admission_no',
        header: () => <div className="whitespace-nowrap">{t('examReports.admissionNo') || 'Admission No'}</div>,
        cell: ({ row }) => <div className="whitespace-nowrap">{row.original.admission_no || '-'}</div>,
      },
    ];

    // Add subject columns dynamically
    if (report.subjects) {
      report.subjects.forEach((subject: any, subjectIndex: number) => {
        baseColumns.push({
          id: `subject-${subject.id || subject.subject_id || subjectIndex}`,
          header: () => (
            <div className="whitespace-nowrap text-center">
              <div>{subject.name}</div>
              {subject.total_marks !== null && subject.total_marks !== undefined && (
                <div className="mt-0.5 whitespace-nowrap text-xs font-normal text-muted-foreground">
                  {t('studentReportCard.maxMarks') || 'Max Marks'}: {formatMark(subject.total_marks)}
                </div>
              )}
            </div>
          ),
          cell: ({ row }) => {
            const student = row.original;
            const subjectMark = student.subjects?.find((s: any) => 
              s.subject_id === subject.subject_id || s.subject_id === subject.id
            );
            return (
              <div className="whitespace-nowrap text-center">
                {subjectMark ? (
                  subjectMark.is_absent ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t('examReports.absent') || 'Absent'}
                    </Badge>
                  ) : subjectMark.marks_obtained !== null ? (
                    <Badge 
                      variant={subjectMark.is_pass ? 'default' : 'destructive'}
                      className="font-semibold"
                    >
                      {formatMark(subjectMark.marks_obtained)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            );
          },
        });
      });
    }

    // Add total, percentage, grade, and result columns
    baseColumns.push(
      {
        id: 'total_marks',
        header: () => <div className="text-center">{t('examReports.totalMarks')}</div>,
        cell: ({ row }) => {
          const student = row.original;
          return (
            <div className="text-center font-medium">
              {formatMark(student.total_obtained)}/{formatMark(student.total_maximum)}
            </div>
          );
        },
      },
      {
        id: 'percentage',
        header: () => <div className="text-center">{t('examReports.percentage')}</div>,
        cell: ({ row }) => {
          const student = row.original;
          return (
            <div className="text-center font-semibold">
              {formatPercentage(student.percentage)}
            </div>
          );
        },
      },
      {
        id: 'grade',
        header: () => <div className="text-center">{t('studentReportCard.grade')}</div>,
        cell: ({ row }) => {
          const student = row.original;
          return (
            <div className="text-center">
              {student.grade && student.grade !== '-' ? (
                <Badge variant={(student.gradeDetails?.isPass ?? student.result === 'Pass') ? 'default' : 'destructive'}>
                  {student.grade}
                </Badge>
              ) : (
                '-'
              )}
            </div>
          );
        },
      },
      {
        id: 'result',
        header: () => <div className="text-center">{t('examReports.result')}</div>,
        cell: ({ row }) => {
          const student = row.original;
          return (
            <div className="text-center">
              {student.result === 'Pass' ? (
                <Badge variant="default" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {t('events.pass')}
                </Badge>
              ) : student.result === 'Fail' ? (
                <Badge variant="destructive" className="gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {t('events.fail')}
                </Badge>
              ) : (
                <Badge variant="outline">{t('examReports.incomplete') || 'Incomplete'}</Badge>
              )}
            </div>
          );
        },
      }
    );

    return baseColumns;
  }, [t, report.subjects, sortedStudents, page, pageSize]);

  // Use DataTable hook for pagination integration
  const { table } = useDataTable({
    data: paginatedStudents,
    columns,
    pageCount: paginationMeta.last_page,
    paginationMeta,
    initialState: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (newPagination) => {
      setPage(newPagination.pageIndex + 1);
      setPageSize(newPagination.pageSize);
    },
  });

  return (
    <>
      {/* Report Header with Badges */}
      <Card className="print:shadow-none">
        <CardHeader className="text-center border-b pb-4">
          <CardTitle className="text-2xl mb-4">{t('examReports.consolidatedReport')}</CardTitle>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {report.exam?.name || selectedExam?.name ? (
              <Badge className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                <span className="opacity-70 mr-1">{t('examReports.examName')}:</span>
                <span className="font-semibold">{report.exam?.name || selectedExam?.name}</span>
              </Badge>
            ) : null}
            {report.class?.name ? (
              <Badge className="px-3 py-1.5 text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800">
                <span className="opacity-70 mr-1">{t('examReports.className')}:</span>
                <span className="font-semibold">
                  {report.class?.name}{report.class?.section ? ` - ${report.class.section}` : ''}
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

        {/* Statistics Summary */}
        {report.summary && (
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('students.totalStudents')}</p>
                <p className="text-2xl font-bold">{report.summary.total_students}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('examReports.studentsPassed')}</p>
                <p className="text-2xl font-bold text-green-600">{report.summary.pass_count}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('examReports.studentsFailed')}</p>
                <p className="text-2xl font-bold text-red-600">{report.summary.fail_count}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('examReports.incomplete') || 'Incomplete'}</p>
                <p className="text-2xl font-bold text-yellow-600">{report.summary.incomplete_count}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {topStudents.length > 0 && (
        <Card className="print:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                {t('events.topPerformers') || 'Top Performers'}
              </CardTitle>
              <CardDescription className="mt-1">
                {t('examReports.topThreeOverallPositionsDescription') || 'Top three overall positions, including every student tied at the cutoff.'}
              </CardDescription>
            </div>
            {onViewAllTopStudents && (
              <Button type="button" variant="outline" size="sm" onClick={onViewAllTopStudents}>
                {t('events.viewAll') || 'View all top students'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {topStudents.map((student, index) => (
                <div
                  key={`${student.roll_number || student.student_name}-${index}`}
                  className="flex items-center gap-3 rounded-lg border bg-muted/20 p-4"
                >
                  <Trophy className={`h-8 w-8 flex-shrink-0 ${
                    student.computedRank === 1
                      ? 'text-yellow-500'
                      : student.computedRank === 2
                        ? 'text-gray-400'
                        : 'text-orange-600'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{student.student_name || 'Unknown'}</p>
                      <Badge variant="outline">#{student.computedRank}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {t('examReports.fatherName') || 'Father Name'}: {student.father_name || '-'}
                    </p>
                    <p className="text-sm font-medium">
                      {formatMark(student.total_obtained)}/{formatMark(student.total_maximum)} · {formatPercentage(student.percentage)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Results Table */}
      <Card className="print:shadow-none">
        <CardContent className="max-w-full overflow-hidden p-0">
          <SplitDataTable
            table={table}
            actionBar={<DataTablePagination table={table} paginationMeta={paginationMeta} />}
            identityColumnIds={['rank', 'student_name', 'father_name', 'roll_number', 'admission_no']}
            summaryColumnIds={['total_marks', 'percentage', 'grade', 'result']}
          />
        </CardContent>
      </Card>
    </>
  );
}

// Helper function to transform class report data for export
function transformClassReportData(report: ReportData, t: (key: string) => string): Record<string, any>[] {
  if (!report.students || report.students.length === 0) return [];
  
  // Sort students by percentage (highest first)
  const sortedStudents = [...report.students].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  
  return sortedStudents.map((student: any, index: number) => {
    const row: Record<string, any> = {
      rank: index + 1,
      ...mapConsolidatedIdentityFields(student),
    };
    
    // Add subject marks
    (report.subjects || []).forEach((subject: any) => {
      const subjectMark = student.subjects?.find((s: any) =>
        s.subject_id === subject.subject_id || s.subject_id === subject.id
      );
      if (subjectMark) {
        row[`subject_${subject.id || subject.subject_id}`] = subjectMark.is_absent
          ? (t('examReports.absent') || 'Absent')
          : subjectMark.marks_obtained !== null
            ? formatMark(subjectMark.marks_obtained)
            : '-';
      } else {
        row[`subject_${subject.id || subject.subject_id}`] = '-';
      }
    });
    
    row.totalMarks = `${formatMark(student.total_obtained)}/${formatMark(student.total_maximum)}`;
    row.percentage = formatPercentage(student.percentage);
    row.grade = student.grade || '-';
    row.result = student.result === 'Pass'
      ? (t('events.pass') || 'Pass')
      : student.result === 'Fail'
        ? (t('events.fail') || 'Fail')
        : (t('examReports.incomplete') || 'Incomplete');
    
    return row;
  });
}

// Helper function to get columns for export
function getExportColumns(report: ReportData, t: (key: string) => string): Array<{ key: string; label: string }> {
  return [
    ...getConsolidatedExportIdentityColumns(t),
    ...(report.subjects || []).map((subject: any) => ({
      key: `subject_${subject.id || subject.subject_id}`,
      label: subject.total_marks !== null && subject.total_marks !== undefined
        ? `${subject.name || 'Subject'} (${t('studentReportCard.maxMarks') || 'Max Marks'}: ${formatMark(subject.total_marks)})`
        : subject.name || 'Subject',
    })),
    { key: 'totalMarks', label: t('examReports.totalMarks') || 'Total Marks' },
    { key: 'percentage', label: t('examReports.percentage') || 'Percentage' },
    { key: 'grade', label: t('studentReportCard.grade') || 'Grade' },
    { key: 'result', label: t('examReports.result') || 'Result' },
  ];
}

export default function ConsolidatedMarkSheet() {
  const { t } = useLanguage();
  const canViewReports = useHasPermission('exams.read');
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'single' | 'multiple'>('single');
  const [topStudentsOpen, setTopStudentsOpen] = useState(false);

  const { data: exams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);
  const { data: examClasses, isLoading: classesLoading } = useExamClasses(selectedExamId);
  const { data: academicYears } = useAcademicYears();

  // Auto-select latest exam from current academic year
  useEffect(() => {
    if (!selectedExamId && !examsLoading) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (exams && exams.length > 0) {
        // Fallback to first exam if no current year exam
        setSelectedExamId(exams[0].id);
      }
    }
  }, [exams, latestExam, selectedExamId, examsLoading]);

  // Auto-select first class when exam classes are loaded
  useEffect(() => {
    if (selectedExamId && examClasses && examClasses.length > 0 && !selectedClassId && !classesLoading) {
      setSelectedClassId(examClasses[0].id);
    }
  }, [examClasses, selectedClassId, selectedExamId, classesLoading]);

  // Fetch consolidated report for single class
  const { data: report, isLoading: reportLoading, isFetching } = useQuery<ReportData>({
    queryKey: ['consolidated-report', selectedExamId, selectedClassId],
    queryFn: async () => {
      if (!selectedExamId || !selectedClassId) return null;
      const response = await examsApi.consolidatedClassReport(selectedExamId, selectedClassId);
      return (response as { data?: unknown }).data ?? response;
    },
    enabled: Boolean(selectedExamId && selectedClassId && activeTab === 'single'),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch all classes for multiple classes view
  const { data: allExamClasses } = useExamClasses(selectedExamId);

  const selectedExam = exams?.find(e => e.id === selectedExamId);
  const selectedClass = examClasses?.find(c => c.id === selectedClassId);
  const academicYear = academicYears?.find(y => y.id === selectedExam?.academicYearId);
  const classLabel = selectedClass
    ? `${selectedClass.classAcademicYear?.class?.name ?? ''}${selectedClass.classAcademicYear?.sectionName ? ` - ${selectedClass.classAcademicYear.sectionName}` : ''}`
    : undefined;

  const examOptions: ComboboxOption[] = (exams || []).map((exam) => ({
    value: exam.id,
    label: `${exam.name}${exam.academicYear ? ` (${exam.academicYear.name})` : ''}`,
  }));

  const classOptions: ComboboxOption[] = (examClasses || []).map((cls) => {
    const className = cls.classAcademicYear?.class?.name ?? t('search.class') ?? 'Class';
    const section = cls.classAcademicYear?.sectionName ? ` - ${cls.classAcademicYear.sectionName}` : '';
    return {
      value: cls.id,
      label: `${className}${section}`,
    };
  });

  const topStudentClassOptions = useMemo(
    () => (allExamClasses || []).map((examClass) => {
      const className = examClass.classAcademicYear?.class?.name ?? t('search.class') ?? 'Class';
      const section = examClass.classAcademicYear?.sectionName ? ` - ${examClass.classAcademicYear.sectionName}` : '';
      return { id: examClass.id, label: `${className}${section}` };
    }),
    [allExamClasses, t]
  );

  const loadTopStudentRows = useCallback(async (classIds: string[]): Promise<TopStudentReportRow[]> => {
    if (!selectedExamId) return [];

    const rowsByClass = await Promise.all(classIds.map(async (classId) => {
      const examClass = allExamClasses?.find((item) => item.id === classId);
      if (!examClass) return [];

      const fullReport = (await fetchAllConsolidatedMarkSheetRows(async (requestedPage) =>
        examsApi.consolidatedClassReport(selectedExamId, classId, {
          page: requestedPage,
          per_page: EXPORT_PAGE_SIZE,
        })
      )) as ReportData;

      const className = `${examClass.classAcademicYear?.class?.name ?? t('search.class') ?? 'Class'}${
        examClass.classAcademicYear?.sectionName ? ` - ${examClass.classAcademicYear.sectionName}` : ''
      }`;

      const rankableStudents = (fullReport.students || []).map((student) => ({
        ...student,
        ranking_eligible: hasValidConsolidatedMarks(student),
      }));

      return getTopStudentsWithTies(rankableStudents).map((student) => ({
        classId,
        className,
        rank: student.computedRank,
        rollNumber: student.roll_number || '-',
        studentName: student.student_name || '-',
        fatherName: student.father_name || '-',
        marksObtained: `${formatMark(student.total_obtained)}/${formatMark(student.total_maximum)}`,
        percentage: student.percentage,
        result: student.result === 'Pass'
          ? (t('events.pass') || 'Pass')
          : student.result === 'Fail'
            ? (t('events.fail') || 'Fail')
            : (t('examReports.incomplete') || 'Incomplete'),
      }));
    }));

    return rowsByClass.flat();
  }, [allExamClasses, selectedExamId, t]);

  const buildMultiClassSections = async (): Promise<MultiSectionReportSection[]> => {
    if (!allExamClasses || allExamClasses.length === 0 || !selectedExamId) return [];

    const sections: MultiSectionReportSection[] = [];

    for (const examClass of allExamClasses) {
      try {
        const classReport = (await fetchAllConsolidatedMarkSheetRows(async (requestedPage) =>
          examsApi.consolidatedClassReport(selectedExamId, examClass.id, {
            page: requestedPage,
            per_page: EXPORT_PAGE_SIZE,
          })
        )) as ReportData;

        if (!classReport?.students || classReport.students.length === 0) continue;

        const baseClassName = examClass.classAcademicYear?.class?.name ?? t('search.class') ?? 'Class';
        const sectionName = examClass.classAcademicYear?.sectionName ? ` - ${examClass.classAcademicYear.sectionName}` : '';
        const fullClassName = `${baseClassName}${sectionName}`;

        sections.push({
          title: fullClassName,
          sheetName: fullClassName,
          columns: getExportColumns(classReport, t),
          rows: transformClassReportData(classReport, t),
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[ConsolidatedMarkSheet] Failed to fetch class report for export:', error);
        }
      }
    }

    return sections;
  };

  const getAllStudentsForCurrentClassExport = async () => {
    if (!selectedExamId || !selectedClassId) return [];

    const fullReport = (await fetchAllConsolidatedMarkSheetRows(async (requestedPage) =>
      examsApi.consolidatedClassReport(selectedExamId, selectedClassId, {
        page: requestedPage,
        per_page: EXPORT_PAGE_SIZE,
      })
    )) as ReportData;

    return fullReport.students ?? [];
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('examReports.consolidatedMarkSheet')}</h1>
        <p className="text-muted-foreground mt-2">{t('examReports.consolidatedMarkSheetDescription')}</p>
      </div>

      {/* Selection Panel */}
      <Card>
        <CardHeader>
          <CardTitle>{t('examReports.selectReportType')}</CardTitle>
          <CardDescription>{t('examReports.selectExamPrompt')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Exam Selection with academic year */}
            <div className="space-y-2">
              <Label htmlFor="exam">{t('examReports.selectExam')}</Label>
              <Combobox
                options={examOptions}
                value={selectedExamId}
                onValueChange={(val) => {
                  setSelectedExamId(val);
                  setSelectedClassId(''); // Reset class when exam changes
                }}
                placeholder={t('examReports.selectExamPrompt')}
                searchPlaceholder={t('events.search') || 'Search...'}
                emptyText={t('exams.noExams') || 'No exams'}
                disabled={examsLoading}
              />
            </div>

            {/* Class Selection filtered by exam - only show in single class tab */}
            {activeTab === 'single' && (
              <div className="space-y-2">
                <Label htmlFor="class">{t('events.selectClass')}</Label>
                <Combobox
                  options={classOptions}
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  placeholder={t('examReports.selectClassPrompt')}
                  searchPlaceholder={t('events.search') || 'Search...'}
                  emptyText={selectedExamId ? (classesLoading ? t('common.loading') || 'Loading...' : t('classes.noClasses')) : t('examReports.selectExamFirst') || 'Select an exam first'}
                  disabled={!selectedExamId || classesLoading}
                />
              </div>
            )}
          </div>

          {selectedExamId && (
            <div className="flex gap-2 mt-4">
              <MultiSectionReportExportButtons
                reportKey="consolidated_mark_sheet"
                title={`${t('examReports.consolidatedMarkSheet') || 'Consolidated Mark Sheet'} - ${report?.exam?.name || selectedExam?.name || ''} - ${report?.class?.name || classLabel || ''}`
                  .replace(/\s+-\s+-\s+/g, ' - ')
                  .replace(/\s+-\s*$/g, '')}
                templateType="consolidated_mark_sheet"
                schoolId={profile?.default_school_id || undefined}
                showPrint
                showExcel={false}
                showPdf={false}
                disabled={!report || !report.students || report.students.length === 0}
                buildFiltersSummary={() => {
                  const parts: string[] = [];
                  if (report?.exam?.name || selectedExam?.name) parts.push(`Exam: ${report?.exam?.name || selectedExam?.name}`);
                  if (report?.class?.name || classLabel) parts.push(`Class: ${report?.class?.name || classLabel}`);
                  if (academicYear?.name) parts.push(`Academic Year: ${academicYear.name}`);
                  return parts.join(' | ');
                }}
                buildSections={async () => {
                  if (!selectedExamId || !selectedClassId) return [];
                  const fullReport = (await fetchAllConsolidatedMarkSheetRows(async (requestedPage) =>
                    examsApi.consolidatedClassReport(selectedExamId, selectedClassId, {
                      page: requestedPage,
                      per_page: EXPORT_PAGE_SIZE,
                    })
                  )) as ReportData;

                  if (!fullReport.students || fullReport.students.length === 0) return [];
                  const className = fullReport.class?.name || classLabel || (t('search.class') || 'Class');
                  return [
                    {
                      title: className,
                      sheetName: className,
                      columns: getExportColumns(fullReport, t),
                      rows: transformClassReportData(fullReport, t),
                    },
                  ];
                }}
              />
              {report && report.students && report.students.length > 0 && (
                <ReportExportButtons
                  data={report.students}
                  getExportData={getAllStudentsForCurrentClassExport}
                  columns={getExportColumns(report, t)}
                  reportKey="consolidated_mark_sheet"
                  title={`${t('examReports.consolidatedMarkSheet') || 'Consolidated Mark Sheet'} - ${report.exam?.name || selectedExam?.name || ''} - ${report.class?.name || classLabel || ''}`}
                  transformData={(data) => {
                    // Sort students by percentage (highest first)
                    const sortedData = [...data].sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0));
                    return sortedData.map((student: any, index: number) => {
                      const row: Record<string, any> = {
                        rank: index + 1,
                        ...mapConsolidatedIdentityFields(student),
                      };
                      // Add subject marks
                      (report.subjects || []).forEach((subject: any) => {
                        const subjectMark = student.subjects?.find((s: any) =>
                          s.subject_id === subject.subject_id || s.subject_id === subject.id
                        );
                        if (subjectMark) {
                          row[`subject_${subject.id || subject.subject_id}`] = subjectMark.is_absent
                            ? (t('examReports.absent') || 'Absent')
                            : subjectMark.marks_obtained !== null
                              ? formatMark(subjectMark.marks_obtained)
                              : '-';
                        } else {
                          row[`subject_${subject.id || subject.subject_id}`] = '-';
                        }
                      });
                      row.totalMarks = `${formatMark(student.total_obtained)}/${formatMark(student.total_maximum)}`;
                      row.percentage = formatPercentage(student.percentage);
                      row.grade = student.grade || '-';
                      row.result = student.result === 'Pass'
                        ? (t('events.pass') || 'Pass')
                        : student.result === 'Fail'
                          ? (t('events.fail') || 'Fail')
                          : (t('examReports.incomplete') || 'Incomplete');
                      return row;
                    });
                  }}
                  buildFiltersSummary={() => {
                    const parts: string[] = [];
                    if (report.exam?.name || selectedExam?.name) parts.push(`Exam: ${report.exam?.name || selectedExam?.name}`);
                    if (report.class?.name) parts.push(`Class: ${report.class.name}${report.class.section ? ` - ${report.class.section}` : ''}`);
                    if (academicYear?.name) parts.push(`Academic Year: ${academicYear.name}`);
                    if (report.summary) {
                      parts.push(`Total Students: ${report.summary.total_students}`);
                      parts.push(`Pass: ${report.summary.pass_count} | Fail: ${report.summary.fail_count}`);
                    }
                    return parts.join(' | ');
                  }}
                  schoolId={profile?.default_school_id}
                  templateType="consolidated_mark_sheet"
                  disabled={!report || !report.students || report.students.length === 0}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Single vs Multiple Classes */}
      {selectedExamId && (
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'single' | 'multiple')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">{t('examReports.singleClass') || 'Single Class'}</TabsTrigger>
            <TabsTrigger value="multiple">{t('examReports.multipleClasses') || 'Multiple Classes'}</TabsTrigger>
          </TabsList>

          {/* Single Class Tab */}
          <TabsContent value="single" className="space-y-6">
            {selectedClassId ? (
              <>
                {reportLoading || isFetching ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-3/4 mx-auto" />
                        <Skeleton className="h-6 w-1/2 mx-auto" />
                        <Skeleton className="h-64 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ) : report ? (
                  <MarkSheetTable
                    report={report}
                    academicYear={academicYear}
                    selectedExam={selectedExam}
                    onViewAllTopStudents={() => setTopStudentsOpen(true)}
                  />
                ) : (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center space-y-2">
                        <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">{t('examReports.noDataAvailable')}</p>
                        <p className="text-sm text-muted-foreground">{t('examReports.noMarksEntered')}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">{t('examReports.selectClassPrompt')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Multiple Classes Tab */}
          <TabsContent value="multiple" className="space-y-6">
            {allExamClasses && allExamClasses.length > 0 ? (
              <>
                {/* Export Buttons for Multiple Classes */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{t('examReports.exportMultipleClasses') || 'Export Multiple Classes'}</CardTitle>
                        <CardDescription>
                          {t('examReports.exportMultipleClassesDescription') || 'Export all classes in one file. Excel: Each class in a separate sheet. PDF: All classes with page breaks.'}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setTopStudentsOpen(true)}>
                          <Trophy className="me-2 h-4 w-4 text-amber-500" />
                          {t('events.topPerformers') || 'Top students'}
                        </Button>
                        <MultiSectionReportExportButtons
                          reportKey="consolidated_mark_sheet_multiple"
                          title={`${t('examReports.consolidatedMarkSheet') || 'Consolidated Mark Sheet'} - ${selectedExam?.name || ''} - ${t('examReports.multipleClasses') || 'Multiple Classes'}`.replace(/\s+-\s+-\s+/g, ' - ').replace(/\s+-\s*$/g, '')}
                          templateType="consolidated_mark_sheet"
                          schoolId={profile?.default_school_id || undefined}
                          showPrint
                          buildFiltersSummary={() => {
                            const parts: string[] = [];
                            if (selectedExam?.name) parts.push(`Exam: ${selectedExam.name}`);
                            if (academicYear?.name) parts.push(`Academic Year: ${academicYear.name}`);
                            parts.push(`Total Classes: ${allExamClasses.length}`);
                            return parts.join(' | ');
                          }}
                          buildSections={buildMultiClassSections}
                        />
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Tabs defaultValue={allExamClasses[0]?.id} className="w-full">
                  <TabsList className="w-full overflow-x-auto">
                    {allExamClasses.map((examClass) => {
                      const className = examClass.classAcademicYear?.class?.name ?? t('search.class') ?? 'Class';
                      const section = examClass.classAcademicYear?.sectionName ? ` - ${examClass.classAcademicYear.sectionName}` : '';
                      return (
                        <TabsTrigger key={examClass.id} value={examClass.id} className="whitespace-nowrap">
                          {className}{section}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  {allExamClasses.map((examClass) => (
                    <ClassReportTab 
                      key={examClass.id} 
                      examClass={examClass} 
                      examId={selectedExamId}
                      academicYear={academicYear}
                      selectedExam={selectedExam}
                    />
                  ))}
                </Tabs>
              </>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">{t('classes.noClasses') || 'No classes found for this exam'}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!selectedExamId && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Search className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('examReports.selectExamPrompt')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <TopStudentsDialog
        open={topStudentsOpen}
        onOpenChange={setTopStudentsOpen}
        currentClassId={selectedClassId}
        classes={topStudentClassOptions}
        examName={selectedExam?.name}
        subjectName={t('examReports.consolidatedReport') || 'Overall class totals'}
        marksLabel={t('examReports.totalMarks') || 'Total Marks'}
        schoolId={profile?.default_school_id || undefined}
        loadRows={loadTopStudentRows}
      />
    </div>
  );
}
