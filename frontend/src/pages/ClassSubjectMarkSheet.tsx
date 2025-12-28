import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useExams, useExamClasses, useExamSubjects, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useGrades } from '@/hooks/useGrades';
import { examsApi } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/hooks/useLanguage';
import { useDataTable } from '@/hooks/use-data-table';
import { DataTable } from '@/components/data-table/data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { ColumnDef } from '@tanstack/react-table';
import { FileDown, Printer, Search, Award, TrendingUp, TrendingDown, Trophy, UserRound } from 'lucide-react';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { calculateGrade } from '@/lib/utils/gradeCalculator';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { MultiSectionReportExportButtons, type MultiSectionReportSection } from '@/components/reports/MultiSectionReportExportButtons';
import { useServerReport } from '@/hooks/useServerReport';
import { showToast } from '@/lib/toast';

// Report data type
type ClassSubjectReportData = {
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
  subject?: {
    id: string;
    subject_id: string;
    name: string;
    code?: string;
    total_marks: number;
    passing_marks: number | null;
  };
  students?: Array<{
    id?: string;
    rank?: number | null;
    student_name: string;
    name?: string; // Alias for student_name for compatibility
    roll_number: string;
    admission_no?: string;
    father_name?: string;
    secret_number?: string;
    picture_path?: string | null;
    picturePath?: string | null;
    marks_obtained: number | null;
    total_marks?: number;
    passing_marks?: number | null;
    percentage: number | null;
    grade?: string | null;
    result?: 'pass' | 'fail' | 'absent';
    is_absent: boolean;
    is_pass: boolean | null;
  }>;
  summary?: {
    total_students: number;
    present_students: number;
    absent_students: number;
    pass_count: number;
    fail_count: number;
    average_marks?: number;
    highest_marks?: number;
    lowest_marks?: number;
  };
};

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
          
          // Use AbortController to prevent browser from logging errors for expected failures
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          try {
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'image/*',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              credentials: 'include',
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              // 404 and 500 are both expected (no picture or server error) - just show placeholder
              // Don't throw to avoid browser console errors
              if (response.status === 404 || response.status === 500) {
                setImageError(true);
                return;
              }
              // Only throw for other errors
              throw new Error(`Failed to fetch image: ${response.status}`);
            }
            
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            currentBlobUrl = blobUrl;
            setImageUrl(blobUrl);
            setImageError(false);
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            // Handle abort (timeout) and network errors silently
            if (fetchError.name === 'AbortError' || fetchError.message?.includes('Failed to fetch')) {
              setImageError(true);
              return;
            }
            // Re-throw only unexpected errors
            throw fetchError;
          }
        } catch (error) {
          // Silently handle errors - 404 and 500 are expected when picture doesn't exist
          // Only log unexpected errors in development
          if (import.meta.env.DEV && error instanceof Error && !error.message.includes('404') && !error.message.includes('500')) {
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

// Helper function to transform subject report data for export
function transformSubjectReportData(report: ClassSubjectReportData, t: (key: string) => string): Record<string, any>[] {
  if (!report.students || report.students.length === 0) return [];
  
  // Sort students by marks (highest first), then by name
  const sortedStudents = [...report.students].sort((a, b) => {
    if (a.marks_obtained !== null && b.marks_obtained !== null) {
      return b.marks_obtained - a.marks_obtained;
    }
    if (a.marks_obtained !== null) return -1;
    if (b.marks_obtained !== null) return 1;
    const nameA = (a.student_name || a.name || '').toLowerCase();
    const nameB = (b.student_name || b.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  return sortedStudents.map((student: any, index: number) => {
    const row: Record<string, any> = {
      rank: student.rank ?? (index + 1),
      rollNumber: student.roll_number || '-',
      studentName: student.student_name || student.name || '-',
      marksObtained: student.is_absent 
        ? (t('examReports.absent') || 'Absent')
        : (student.marks_obtained !== null ? student.marks_obtained : '-'),
      totalMarks: report.subject?.total_marks || '-',
      percentage: student.percentage !== null && student.percentage !== undefined
        ? `${student.percentage.toFixed(2)}%`
        : '-',
      grade: student.grade || '-',
      result: student.is_absent
        ? (t('examReports.absent') || 'Absent')
        : (student.is_pass === true
            ? (t('examReports.pass') || 'Pass')
            : (student.is_pass === false
                ? (t('examReports.fail') || 'Fail')
                : '-')),
    };
    return row;
  });
}

// Helper function to get columns for export
function getExportColumns(report: ClassSubjectReportData, t: (key: string) => string): Array<{ key: string; label: string }> {
  return [
    { key: 'rank', label: t('examReports.rank') || 'Rank' },
    { key: 'rollNumber', label: t('examReports.rollNumber') || 'Roll Number' },
    { key: 'studentName', label: t('examReports.studentName') || 'Student Name' },
    { key: 'marksObtained', label: t('examReports.obtainedMarks') || 'Obtained Marks' },
    { key: 'totalMarks', label: t('examReports.totalMarks') || 'Total Marks' },
    { key: 'percentage', label: t('examReports.percentage') || 'Percentage' },
    { key: 'grade', label: t('examReports.grade') || 'Grade' },
    { key: 'result', label: t('examReports.result') || 'Result' },
  ];
}

// Reusable Subject Mark Sheet Component
function SubjectMarkSheetTable({ report, academicYear, selectedExam }: { report: ClassSubjectReportData; academicYear?: any; selectedExam?: any }) {
  const { t, language } = useLanguage();
  const { data: profile } = useProfile();
  const { data: grades } = useGrades(profile?.organization_id);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sortedStudents = useMemo(() => {
    if (!report.students) return [];
    // Map API response to component format and calculate result
    const mappedStudents = report.students.map((student) => {
      // Calculate result from is_pass and is_absent
      let result: 'pass' | 'fail' | 'absent' = 'absent';
      if (!student.is_absent) {
        if (student.is_pass === true) {
          result = 'pass';
        } else if (student.is_pass === false) {
          result = 'fail';
        }
      }
      
      // Calculate grade from percentage using grades table
      const gradeInfo = calculateGrade(student.percentage, grades || [], language);
      const gradeName = gradeInfo?.name || student.grade || '-';
      
      return {
        ...student,
        name: student.student_name || student.name || 'Unknown', // Use student_name from API
        result,
        rank: student.rank ?? null, // Use rank from API if available
        grade: gradeName, // Use calculated grade from grades table
        gradeDetails: gradeInfo, // Store full grade details
      };
    });
    
    // Sort by marks (highest first), then by name
    // Note: Backend already provides ranks, but we sort here for display consistency
    const sorted = mappedStudents.sort((a, b) => {
      // Sort by marks (highest first), then by name
      if (a.marks_obtained !== null && b.marks_obtained !== null) {
        return b.marks_obtained - a.marks_obtained;
      }
      if (a.marks_obtained !== null) return -1;
      if (b.marks_obtained !== null) return 1;
      // Handle undefined/null names
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
    
    // If ranks are not provided by backend, calculate them based on sorted order
    // (but backend should provide ranks, so this is a fallback)
    return sorted.map((student, index) => {
      if (student.rank === null || student.rank === undefined) {
        // Calculate rank based on position in sorted array (only for students with marks)
        if (student.marks_obtained !== null && !student.is_absent) {
          // Find position among students with marks
          const studentsWithMarks = sorted.filter(s => s.marks_obtained !== null && !s.is_absent);
          const rankIndex = studentsWithMarks.findIndex(s => 
            s.roll_number === student.roll_number || 
            s.admission_no === student.admission_no
          );
          return { ...student, rank: rankIndex >= 0 ? rankIndex + 1 : null };
        }
      }
      return student;
    });
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
  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      id: 'rank',
      header: () => <div className="w-12">{t('examReports.rank')}</div>,
      cell: ({ row, table }) => {
        const student = row.original;
        const globalIndex = sortedStudents.findIndex(s => 
          (s.id && student.id && s.id === student.id) ||
          (s.roll_number === student.roll_number && s.admission_no === student.admission_no)
        );
        const rank = student.rank ?? (globalIndex >= 0 ? globalIndex + 1 : row.index + 1 + (page - 1) * pageSize);
        return (
          <div className="font-medium w-12">
            {rank === 1 && <Trophy className="h-4 w-4 text-yellow-500 inline mr-1" />}
            {rank === 2 && <Trophy className="h-4 w-4 text-gray-400 inline mr-1" />}
            {rank === 3 && <Trophy className="h-4 w-4 text-orange-600 inline mr-1" />}
            {rank || '-'}
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
            studentId={student.id} 
            picturePath={student.picture_path || student.picturePath}
            studentName={student.name || student.student_name}
          />
        );
      },
    },
    {
      accessorKey: 'name',
      header: t('examReports.studentName'),
      cell: ({ row }) => {
        const student = row.original;
        return <div className="font-medium">{student.name || student.student_name || 'Unknown'}</div>;
      },
    },
    {
      accessorKey: 'roll_number',
      header: t('examReports.rollNumber'),
      cell: ({ row }) => row.original.roll_number || '-',
    },
    {
      id: 'admission_no',
      header: t('students.admissionNo') || 'Admission No',
      cell: ({ row }) => row.original.admission_no || '-',
    },
    {
      id: 'father_name',
      header: t('students.fatherName') || 'Father Name',
      cell: ({ row }) => row.original.father_name || '-',
    },
    {
      id: 'class_name',
      header: t('examReports.className') || 'Class',
      cell: () => <div className="font-medium">{report.class?.name || ''}{report.class?.section ? ` - ${report.class.section}` : ''}</div>,
    },
    {
      id: 'subject_name',
      header: t('examReports.subjectName') || 'Subject',
      cell: () => <div className="font-medium">{report.subject?.name || '-'}</div>,
    },
    {
      id: 'marks_obtained',
      header: () => <div className="text-center">{t('examReports.obtainedMarks')}</div>,
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="text-center">
            {student.is_absent ? (
              <Badge variant="outline" className="text-muted-foreground">
                {t('examReports.absent') || 'Absent'}
              </Badge>
            ) : student.marks_obtained !== null && student.marks_obtained !== undefined ? (
              <Badge 
                variant={student.is_pass ? 'default' : 'destructive'}
                className="font-semibold"
              >
                {student.marks_obtained}
              </Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      id: 'total_marks',
      header: () => <div className="text-center">{t('examReports.totalMarks')}</div>,
      cell: () => <div className="text-center font-medium">{report.subject?.total_marks ?? '-'}</div>,
    },
    {
      id: 'passing_marks',
      header: () => <div className="text-center">{t('examReports.passingMarks') || 'Passing Marks'}</div>,
      cell: () => <div className="text-center">{report.subject?.passing_marks ?? '-'}</div>,
    },
    {
      id: 'percentage',
      header: () => <div className="text-center">{t('examReports.percentage')}</div>,
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="text-center font-semibold">
            {student.percentage !== null && student.percentage !== undefined 
              ? `${student.percentage.toFixed(2)}%`
              : '-'}
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
              <Badge variant={(student.gradeDetails?.isPass ?? student.result === 'pass') ? 'default' : 'destructive'}>
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
            {student.result === 'pass' ? (
              <Badge variant="default" className="gap-1">
                <TrendingUp className="h-3 w-3" />
                {t('examReports.pass')}
              </Badge>
            ) : student.result === 'fail' ? (
              <Badge variant="destructive" className="gap-1">
                <TrendingDown className="h-3 w-3" />
                {t('examReports.fail')}
              </Badge>
            ) : (
              <Badge variant="outline">{t('examReports.absent')}</Badge>
            )}
          </div>
        );
      },
    },
  ], [t, report.subject?.total_marks, report.subject?.passing_marks, report.subject?.name, report.class?.name, report.class?.section, sortedStudents, page, pageSize]);

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
          <CardTitle className="text-2xl mb-4">{t('examReports.subjectReport')}</CardTitle>
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
            {report.subject?.name ? (
              <Badge className="px-3 py-1.5 text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                <span className="opacity-70 mr-1">{t('examReports.subjectName')}:</span>
                <span className="font-semibold">{report.subject?.name}</span>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('examReports.totalStudents')}</p>
                <p className="text-2xl font-bold">{report.summary.total_students}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('examReports.classAverage')}</p>
                <p className="text-2xl font-bold">{report.summary.average_marks?.toFixed(2) ?? '-'}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('examReports.highestMarks')}</p>
                <p className="text-2xl font-bold text-green-600">{report.summary.highest_marks ?? '-'}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('examReports.lowestMarks')}</p>
                <p className="text-2xl font-bold text-red-600">{report.summary.lowest_marks ?? '-'}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('examReports.passPercentage')}</p>
                <p className="text-2xl font-bold">
                  {report.summary.total_students > 0 
                    ? ((report.summary.pass_count / report.summary.total_students) * 100).toFixed(2) 
                    : '0.00'}%
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Top Performers */}
      {sortedStudents.length > 0 && (
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              {t('common.topPerformers') || 'Top Performers'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {sortedStudents.slice(0, 3).map((student: any, index: number) => (
                <div
                  key={student.id || student.admission_no || student.roll_number || `top-${index}`}
                  className="flex items-center gap-3 p-4 border rounded-lg bg-muted/20"
                >
                  <div className="flex-shrink-0">
                    {index === 0 && <Trophy className="h-8 w-8 text-yellow-500" />}
                    {index === 1 && <Trophy className="h-8 w-8 text-gray-400" />}
                    {index === 2 && <Trophy className="h-8 w-8 text-orange-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{student.name || student.student_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {student.marks_obtained !== null 
                        ? `${student.marks_obtained}/${report.subject?.total_marks} (${student.percentage?.toFixed(2)}%)`
                        : t('examReports.absent') || 'Absent'}
                    </p>
                    {student.grade && (
                      <Badge variant="outline" className="mt-1">
                        {student.grade}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Results Table */}
      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle>{t('examReports.studentStatistics')}</CardTitle>
        </CardHeader>
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

// Component for individual class/subject report in multiple subjects tab
function ClassSubjectReportTab({ examClass, examId, subjectId, academicYear, selectedExam }: { examClass: any; examId: string; subjectId: string; academicYear?: any; selectedExam?: any }) {
  const { t } = useLanguage();
  
  // Check if subject exists in this class
  const { data: classSubjects } = useExamSubjects(examId, examClass.id);
  const subjectExistsInClass = classSubjects?.some(s => s.id === subjectId);
  
  const { data: classReport, isLoading, isFetching, error } = useQuery<ClassSubjectReportData>({
    queryKey: ['class-subject-report', examId, examClass.id, subjectId],
    queryFn: async () => {
      const response = await examsApi.classSubjectMarkSheet(examId, examClass.id, subjectId);
      return (response as { data?: unknown }).data ?? response;
    },
    enabled: Boolean(examId && examClass.id && subjectId && subjectExistsInClass),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false, // Don't retry on 404 errors
  });

  return (
    <TabsContent value={examClass.id} className="space-y-6">
      {!subjectExistsInClass ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Search className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('examReports.subjectNotInClass') || 'This subject is not available for this class'}</p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading || isFetching ? (
        <Card>
          <CardContent className="py-12">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      ) : error || !classReport ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Search className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('examReports.noDataAvailable')}</p>
              {error && (
                <p className="text-sm text-destructive">
                  {(error as Error)?.message || 'Failed to load report'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <SubjectMarkSheetTable report={classReport} academicYear={academicYear} selectedExam={selectedExam} />
      )}
    </TabsContent>
  );
}

export default function ClassSubjectMarkSheet() {
  const { t } = useLanguage();
  const canViewReports = useHasPermission('exams.read');
  const { data: profile } = useProfile();
  const { selectedSchoolId } = useSchoolContext();
  const organizationId = profile?.organization_id;

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'single' | 'multiple'>('single');

  const { data: exams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);
  const { data: examClasses, isLoading: classesLoading } = useExamClasses(selectedExamId);
  const { data: examSubjects, isLoading: subjectsLoading } = useExamSubjects(selectedExamId, selectedClassId);
  const { data: academicYears } = useAcademicYears();
  const { data: currentAcademicYear, isLoading: currentYearLoading } = useCurrentAcademicYear(organizationId);

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
    if (selectedExamId && examClasses && examClasses.length > 0 && !selectedClassId && !classesLoading) {
      setSelectedClassId(examClasses[0].id);
    }
  }, [examClasses, selectedClassId, selectedExamId, classesLoading]);

  // Auto-select first subject when subjects are loaded
  useEffect(() => {
    if (selectedClassId && examSubjects && examSubjects.length > 0 && !selectedSubjectId && !subjectsLoading) {
      setSelectedSubjectId(examSubjects[0].id);
    }
  }, [examSubjects, selectedSubjectId, selectedClassId, subjectsLoading]);

  // Fetch class-subject report for single class/subject
  const { data: report, isLoading: reportLoading, isFetching } = useQuery<ClassSubjectReportData>({
    queryKey: ['class-subject-report', selectedExamId, selectedClassId, selectedSubjectId],
    queryFn: async () => {
      if (!selectedExamId || !selectedClassId || !selectedSubjectId) return null;
      const response = await examsApi.classSubjectMarkSheet(selectedExamId, selectedClassId, selectedSubjectId);
      return (response as { data?: unknown }).data ?? response;
    },
    enabled: Boolean(selectedExamId && selectedClassId && selectedSubjectId && activeTab === 'single'),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Fetch all classes for multiple subjects view
  const { data: allExamClasses } = useExamClasses(selectedExamId);
  // Fetch all subjects for all classes (for multiple subjects export)
  const { data: allSubjects } = useExamSubjects(selectedExamId, undefined);

  const selectedExam = exams?.find(e => e.id === selectedExamId);
  const selectedClass = examClasses?.find(c => c.id === selectedClassId);
  const selectedSubject = examSubjects?.find(s => s.id === selectedSubjectId);
  const academicYear = academicYears?.find(y => y.id === selectedExam?.academicYearId);

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

  const subjectOptions: ComboboxOption[] = (examSubjects || []).map((subj) => ({
    value: subj.id,
    label: subj.subject?.name ?? subj.classSubject?.subject?.name ?? t('subjects.subject') ?? 'Subject',
  }));

  // Build sections for multiple subjects export (each subject of each class = one sheet)
  const buildMultiSubjectSections = useCallback(async (): Promise<MultiSectionReportSection[]> => {
    if (!allExamClasses || allExamClasses.length === 0 || !selectedExamId) return [];

    const sections: MultiSectionReportSection[] = [];
    const { examSubjectsApi } = await import('@/lib/api/client');

    for (const examClass of allExamClasses) {
      // Fetch subjects for this class via API
      let subjectsForClass: any[] = [];
      try {
        const subjectsResponse = await examSubjectsApi.list({ exam_id: selectedExamId, exam_class_id: examClass.id });
        subjectsForClass = ((subjectsResponse as { data?: unknown }).data ?? subjectsResponse) as any[];
        if (Array.isArray(subjectsForClass)) {
          // Already an array
        } else if (subjectsForClass && typeof subjectsForClass === 'object' && 'data' in subjectsForClass) {
          subjectsForClass = (subjectsForClass as any).data || [];
        } else {
          subjectsForClass = [];
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[ClassSubjectMarkSheet] Failed to fetch subjects for class:', error);
        }
        continue; // Skip this class if we can't get its subjects
      }

      if (!subjectsForClass || subjectsForClass.length === 0) continue;

      for (const subject of subjectsForClass) {
        try {
          const response = await examsApi.classSubjectMarkSheet(selectedExamId, examClass.id, subject.id);
          const subjectReport = ((response as { data?: unknown }).data ?? response) as ClassSubjectReportData;

          if (!subjectReport?.students || subjectReport.students.length === 0) continue;

          const baseClassName = examClass.classAcademicYear?.class?.name ?? t('classes.class') ?? 'Class';
          const sectionName = examClass.classAcademicYear?.sectionName ? ` - ${examClass.classAcademicYear.sectionName}` : '';
          const fullClassName = `${baseClassName}${sectionName}`;
          const subjectName = subject.subject?.name ?? subject.classSubject?.subject?.name ?? t('subjects.subject') ?? 'Subject';

          sections.push({
            title: `${fullClassName} - ${subjectName}`,
            sheetName: `${fullClassName} - ${subjectName}`.substring(0, 31), // Excel sheet name limit
            columns: getExportColumns(subjectReport, t),
            rows: transformSubjectReportData(subjectReport, t),
          });
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[ClassSubjectMarkSheet] Failed to fetch subject report for export:', error);
          }
          // Continue to next subject/class
        }
      }
    }

    return sections;
  }, [allExamClasses, selectedExamId, t]);

  // Helper function to print PDF from download URL
  const printPdfFromReport = useCallback(async (downloadUrl: string) => {
    try {
      const url = new URL(downloadUrl);
      let endpoint = url.pathname;
      if (endpoint.startsWith('/api/')) endpoint = endpoint.substring(4);
      if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;

      const { apiClient } = await import('@/lib/api/client');
      const { blob } = await apiClient.requestFile(endpoint);

      const blobUrl = window.URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      iframe.src = blobUrl;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } finally {
            const cleanup = () => {
              setTimeout(() => {
                if (iframe.parentNode) document.body.removeChild(iframe);
                window.URL.revokeObjectURL(blobUrl);
                window.removeEventListener('afterprint', cleanup);
              }, 500);
            };
            window.addEventListener('afterprint', cleanup);
            setTimeout(cleanup, 30000);
          }
        }, 800);
      };
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to print PDF');
    }
  }, []);

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
        <h1 className="text-3xl font-bold tracking-tight">{t('examReports.classSubjectMarkSheet')}</h1>
        <p className="text-muted-foreground mt-2">{t('examReports.classSubjectMarkSheetDescription')}</p>
      </div>

      {/* Selection Panel */}
      <Card>
        <CardHeader>
          <CardTitle>{t('examReports.selectReportType')}</CardTitle>
          <CardDescription>{t('examReports.selectExamPrompt')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-4 ${activeTab === 'single' ? 'md:grid-cols-3' : 'md:grid-cols-1'}`}>
            {/* Exam Selection */}
            <div className="space-y-2">
              <Label htmlFor="exam">{t('examReports.selectExam')}</Label>
              <Combobox
                options={examOptions}
                value={selectedExamId}
                onValueChange={(val) => {
                  setSelectedExamId(val);
                  setSelectedClassId('');
                  setSelectedSubjectId('');
                }}
                placeholder={t('examReports.selectExamPrompt')}
                searchPlaceholder={t('common.search') || 'Search...'}
                emptyText={t('exams.noExams') || 'No exams'}
                disabled={examsLoading}
              />
              {selectedExam && academicYear && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    {t('examReports.academicYear')}: <span className="font-semibold">{academicYear.name}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Class Selection - only show in single subject tab */}
            {activeTab === 'single' && (
              <div className="space-y-2">
                <Label htmlFor="class">{t('examReports.selectClass')}</Label>
                <Combobox
                  options={classOptions}
                  value={selectedClassId}
                  onValueChange={(val) => {
                    setSelectedClassId(val);
                    setSelectedSubjectId('');
                  }}
                  placeholder={t('examReports.selectClassPrompt')}
                  searchPlaceholder={t('common.search') || 'Search...'}
                  emptyText={
                    selectedExamId
                      ? (classesLoading ? t('common.loading') || 'Loading...' : t('classes.noClasses'))
                      : t('examReports.selectExamFirst') || 'Select an exam first'
                  }
                  disabled={!selectedExamId || classesLoading}
                />
              </div>
            )}

            {/* Subject Selection - only show in single subject tab */}
            {activeTab === 'single' && (
              <div className="space-y-2">
                <Label htmlFor="subject">{t('examReports.selectSubject')}</Label>
                <Combobox
                  options={subjectOptions}
                  value={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                  placeholder={t('examReports.selectSubjectPrompt')}
                  searchPlaceholder={t('common.search') || 'Search...'}
                  emptyText={
                    selectedClassId
                      ? (subjectsLoading ? t('common.loading') || 'Loading...' : t('subjects.noSubjects'))
                      : t('examReports.selectClassPrompt') || 'Select a class first'
                  }
                  disabled={!selectedClassId || subjectsLoading}
                />
              </div>
            )}
          </div>

          {selectedExamId && activeTab === 'single' && selectedClassId && selectedSubjectId && (
            <div className="flex gap-2 mt-4">
              <MultiSectionReportExportButtons
                reportKey="class_subject_mark_sheet"
                title={`${t('examReports.classSubjectMarkSheet') || 'Class Subject Mark Sheet'} - ${selectedExam?.name || ''} - ${selectedClass?.classAcademicYear?.class?.name || ''}${selectedClass?.classAcademicYear?.sectionName ? ` - ${selectedClass.classAcademicYear.sectionName}` : ''} - ${selectedSubject?.subject?.name || selectedSubject?.classSubject?.subject?.name || ''}`}
                templateType="class_subject_academic_year"
                schoolId={selectedSchoolId || profile?.default_school_id}
                buildSections={async () => {
                  // For single subject, create one section
                  if (!report || !report.students || report.students.length === 0) return [];
                  return [{
                    title: `${selectedClass?.classAcademicYear?.class?.name || ''}${selectedClass?.classAcademicYear?.sectionName ? ` - ${selectedClass.classAcademicYear.sectionName}` : ''} - ${selectedSubject?.subject?.name || selectedSubject?.classSubject?.subject?.name || ''}`,
                    sheetName: `${selectedClass?.classAcademicYear?.class?.name || ''} - ${selectedSubject?.subject?.name || selectedSubject?.classSubject?.subject?.name || ''}`.substring(0, 31),
                    columns: getExportColumns(report, t),
                    rows: transformSubjectReportData(report, t),
                  }];
                }}
                buildFiltersSummary={() => {
                  const parts: string[] = [];
                  if (selectedExam?.name) parts.push(`Exam: ${selectedExam.name}`);
                  if (selectedClass?.classAcademicYear?.class?.name) {
                    parts.push(`Class: ${selectedClass.classAcademicYear.class.name}${selectedClass.classAcademicYear.sectionName ? ` - ${selectedClass.classAcademicYear.sectionName}` : ''}`);
                  }
                  if (selectedSubject?.subject?.name || selectedSubject?.classSubject?.subject?.name) {
                    parts.push(`Subject: ${selectedSubject.subject?.name || selectedSubject.classSubject?.subject?.name}`);
                  }
                  if (academicYear?.name) parts.push(`Academic Year: ${academicYear.name}`);
                  return parts.join(' | ');
                }}
                showPrint={true}
              />
            </div>
          )}

          {selectedExamId && activeTab === 'multiple' && (
            <div className="flex gap-2 mt-4">
              <MultiSectionReportExportButtons
                reportKey="class_subject_mark_sheet"
                title={`${t('examReports.classSubjectMarkSheet') || 'Class Subject Mark Sheet'} - ${selectedExam?.name || ''} - All Subjects`}
                templateType="class_subject_academic_year"
                schoolId={selectedSchoolId || profile?.default_school_id}
                buildSections={buildMultiSubjectSections}
                buildFiltersSummary={() => {
                  const parts: string[] = [];
                  if (selectedExam?.name) parts.push(`Exam: ${selectedExam.name}`);
                  if (academicYear?.name) parts.push(`Academic Year: ${academicYear.name}`);
                  parts.push('All Classes & All Subjects');
                  return parts.join(' | ');
                }}
                showPrint={true}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Single vs Multiple Subjects */}
      {selectedExamId && (
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'single' | 'multiple')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">{t('examReports.singleSubject') || 'Single Subject'}</TabsTrigger>
            <TabsTrigger value="multiple">{t('examReports.multipleSubjects') || 'Multiple Subjects'}</TabsTrigger>
          </TabsList>

          {/* Single Subject Tab */}
          <TabsContent value="single" className="space-y-6">
            {selectedClassId && selectedSubjectId ? (
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
                  <SubjectMarkSheetTable report={report} academicYear={academicYear} selectedExam={selectedExam} />
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
                    <p className="text-sm text-muted-foreground">{t('examReports.selectSubjectPrompt')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Multiple Subjects Tab */}
          <TabsContent value="multiple" className="space-y-6">
            {allExamClasses && allExamClasses.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>{t('examReports.multipleSubjects') || 'Multiple Subjects'}</CardTitle>
                  <CardDescription>
                    {t('examReports.multipleSubjectsDescription') || 'Export all subjects for all classes. Each subject of each class will be in a separate sheet in Excel, or separate pages in PDF.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      {t('examReports.useExportButtons') || 'Use the export buttons above to generate reports for all subjects across all classes.'}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold">{allExamClasses.length}</p>
                        <p className="text-sm text-muted-foreground">{t('classes.classes') || 'Classes'}</p>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <p className="text-2xl font-bold">{allSubjects?.length || 0}</p>
                        <p className="text-sm text-muted-foreground">{t('subjects.subjects') || 'Subjects'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

      {(!selectedExamId) && (
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
