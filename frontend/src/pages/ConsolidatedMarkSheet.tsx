import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { Printer, Search, Award, TrendingUp, TrendingDown, UserRound } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

import { DataTable } from '@/components/data-table/data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
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
    roll_number: string;
    student_name: string;
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

// Component for displaying student picture in mark sheet table cell
function MarkSheetPictureCell({ studentId, picturePath, studentName }: { studentId?: string; picturePath?: string | null; studentName?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Only fetch if we have studentId (we'll try to fetch even if picturePath is not provided)
    const hasPicture = studentId;
    
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
      // No student ID or picture path, show placeholder immediately
      setImageUrl(null);
      setImageError(true);
    }
  }, [studentId, picturePath]);

  return (
    <div className="flex items-center justify-center w-10 h-10">
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={studentName || 'Student'}
          className="w-10 h-10 rounded-full object-cover border-2 border-border"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border">
          <UserRound className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// Reusable Mark Sheet Component
function MarkSheetTable({ report, academicYear, selectedExam }: { report: ReportData; academicYear?: any; selectedExam?: any }) {
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
      };
    });
    return studentsWithGrades.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  }, [report.students, grades, language]);

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
        header: () => <div className="w-12">{t('examReports.rank')}</div>,
        cell: ({ row }) => {
          const globalIndex = sortedStudents.findIndex(s => 
            ((s as any).id && row.original.id && (s as any).id === row.original.id) ||
            (s.roll_number === row.original.roll_number && s.admission_no === row.original.admission_no)
          );
          const rank = globalIndex >= 0 ? globalIndex + 1 : row.index + 1 + (page - 1) * pageSize;
          return (
            <div className="font-medium w-12">
              {rank === 1 && <Award className="h-4 w-4 text-yellow-500 inline mr-1" />}
              {rank}
            </div>
          );
        },
      },
      {
        id: 'picture',
        header: () => <div className="w-12">{t('students.picture') || 'Picture'}</div>,
        cell: ({ row }) => {
          const student = row.original;
          return (
            <MarkSheetPictureCell 
              studentId={(student as any).id || (student as any).student_id}
              picturePath={(student as any).picture_path || (student as any).picturePath}
              studentName={student.student_name}
            />
          );
        },
      },
      {
        accessorKey: 'student_name',
        header: t('examReports.studentName'),
        cell: ({ row }) => row.original.student_name,
      },
      {
        accessorKey: 'roll_number',
        header: t('examReports.rollNumber'),
        cell: ({ row }) => row.original.roll_number || '-',
      },
    ];

    // Add subject columns dynamically
    if (report.subjects) {
      report.subjects.forEach((subject: any, subjectIndex: number) => {
        baseColumns.push({
          id: `subject-${subject.id || subject.subject_id || subjectIndex}`,
          header: () => <div className="text-center">{subject.name}</div>,
          cell: ({ row }) => {
            const student = row.original;
            const subjectMark = student.subjects?.find((s: any) => 
              s.subject_id === subject.subject_id || s.subject_id === subject.id
            );
            return (
              <div className="text-center">
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
                      {subjectMark.marks_obtained}/{subjectMark.total_marks}
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
              {student.total_obtained}/{student.total_maximum}
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
              {student.percentage?.toFixed(2)}%
            </div>
          );
        },
      },
      {
        id: 'grade',
        header: () => <div className="text-center">{t('examReports.grade')}</div>,
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
                  {t('examReports.pass')}
                </Badge>
              ) : student.result === 'Fail' ? (
                <Badge variant="destructive" className="gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {t('examReports.fail')}
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
                <p className="text-sm text-muted-foreground">{t('examReports.totalStudents')}</p>
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

      {/* Student Results Table */}
      <Card className="print:shadow-none">
        <CardContent className="p-0">
          <DataTable 
            table={table}
            actionBar={<DataTablePagination table={table} />}
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
      rollNumber: student.roll_number || '-',
      studentName: student.student_name || '-',
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
            ? `${subjectMark.marks_obtained}/${subjectMark.total_marks}`
            : '-';
      } else {
        row[`subject_${subject.id || subject.subject_id}`] = '-';
      }
    });
    
    row.totalMarks = `${student.total_obtained || 0}/${student.total_maximum || 0}`;
    row.percentage = student.percentage !== null && student.percentage !== undefined
      ? `${student.percentage.toFixed(2)}%`
      : '-';
    row.grade = student.grade || '-';
    row.result = student.result === 'Pass'
      ? (t('examReports.pass') || 'Pass')
      : student.result === 'Fail'
        ? (t('examReports.fail') || 'Fail')
        : (t('examReports.incomplete') || 'Incomplete');
    
    return row;
  });
}

// Helper function to get columns for export
function getExportColumns(report: ReportData, t: (key: string) => string): Array<{ key: string; label: string }> {
  return [
    { key: 'rank', label: t('examReports.rank') || 'Rank' },
    { key: 'rollNumber', label: t('examReports.rollNumber') || 'Roll Number' },
    { key: 'studentName', label: t('examReports.studentName') || 'Student Name' },
    ...(report.subjects || []).map((subject: any) => ({
      key: `subject_${subject.id || subject.subject_id}`,
      label: subject.name || 'Subject',
    })),
    { key: 'totalMarks', label: t('examReports.totalMarks') || 'Total Marks' },
    { key: 'percentage', label: t('examReports.percentage') || 'Percentage' },
    { key: 'grade', label: t('examReports.grade') || 'Grade' },
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
    const className = cls.classAcademicYear?.class?.name ?? t('classes.class') ?? 'Class';
    const section = cls.classAcademicYear?.sectionName ? ` - ${cls.classAcademicYear.sectionName}` : '';
    return {
      value: cls.id,
      label: `${className}${section}`,
    };
  });

  const buildMultiClassSections = async (): Promise<MultiSectionReportSection[]> => {
    if (!allExamClasses || allExamClasses.length === 0 || !selectedExamId) return [];

    const sections: MultiSectionReportSection[] = [];

    for (const examClass of allExamClasses) {
      try {
        const response = await examsApi.consolidatedClassReport(selectedExamId, examClass.id);
        const classReport = ((response as { data?: unknown }).data ?? response) as ReportData;

        if (!classReport?.students || classReport.students.length === 0) continue;

        const baseClassName = examClass.classAcademicYear?.class?.name ?? t('classes.class') ?? 'Class';
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

  if (!canViewReports) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('common.noPermission')}</p>
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
                searchPlaceholder={t('common.search') || 'Search...'}
                emptyText={t('exams.noExams') || 'No exams'}
                disabled={examsLoading}
              />
            </div>

            {/* Class Selection filtered by exam - only show in single class tab */}
            {activeTab === 'single' && (
              <div className="space-y-2">
                <Label htmlFor="class">{t('examReports.selectClass')}</Label>
                <Combobox
                  options={classOptions}
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  placeholder={t('examReports.selectClassPrompt')}
                  searchPlaceholder={t('common.search') || 'Search...'}
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
                  if (!report?.students || report.students.length === 0) return [];
                  const className = report?.class?.name || classLabel || (t('classes.class') || 'Class');
                  return [
                    {
                      title: className,
                      sheetName: className,
                      columns: getExportColumns(report, t),
                      rows: transformClassReportData(report, t),
                    },
                  ];
                }}
              />
              {report && report.students && report.students.length > 0 && (
                <ReportExportButtons
                  data={report.students}
                  columns={[
                    { key: 'rank', label: t('examReports.rank') || 'Rank' },
                    { key: 'rollNumber', label: t('examReports.rollNumber') || 'Roll Number' },
                    { key: 'studentName', label: t('examReports.studentName') || 'Student Name' },
                    ...(report.subjects || []).map((subject: any) => ({
                      key: `subject_${subject.id || subject.subject_id}`,
                      label: subject.name || 'Subject',
                    })),
                    { key: 'totalMarks', label: t('examReports.totalMarks') || 'Total Marks' },
                    { key: 'percentage', label: t('examReports.percentage') || 'Percentage' },
                    { key: 'grade', label: t('examReports.grade') || 'Grade' },
                    { key: 'result', label: t('examReports.result') || 'Result' },
                  ]}
                  reportKey="consolidated_mark_sheet"
                  title={`${t('examReports.consolidatedMarkSheet') || 'Consolidated Mark Sheet'} - ${report.exam?.name || selectedExam?.name || ''} - ${report.class?.name || classLabel || ''}`}
                  transformData={(data) => {
                    // Sort students by percentage (highest first)
                    const sortedData = [...data].sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0));
                    return sortedData.map((student: any, index: number) => {
                      const row: Record<string, any> = {
                        rank: index + 1,
                        rollNumber: student.roll_number || '-',
                        studentName: student.student_name || '-',
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
                              ? `${subjectMark.marks_obtained}/${subjectMark.total_marks}`
                              : '-';
                        } else {
                          row[`subject_${subject.id || subject.subject_id}`] = '-';
                        }
                      });
                      row.totalMarks = `${student.total_obtained || 0}/${student.total_maximum || 0}`;
                      row.percentage = student.percentage !== null && student.percentage !== undefined
                        ? `${student.percentage.toFixed(2)}%`
                        : '-';
                      row.grade = student.grade || '-';
                      row.result = student.result === 'Pass'
                        ? (t('examReports.pass') || 'Pass')
                        : student.result === 'Fail'
                          ? (t('examReports.fail') || 'Fail')
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
                  <MarkSheetTable report={report} academicYear={academicYear} selectedExam={selectedExam} />
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
                  </CardHeader>
                </Card>

                <Tabs defaultValue={allExamClasses[0]?.id} className="w-full">
                  <TabsList className="w-full overflow-x-auto">
                    {allExamClasses.map((examClass) => {
                      const className = examClass.classAcademicYear?.class?.name ?? t('classes.class') ?? 'Class';
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
    </div>
  );
}
