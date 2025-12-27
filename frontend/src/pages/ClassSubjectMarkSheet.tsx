import { useState, useEffect, useMemo, useRef } from 'react';
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
import { calculateGrade } from '@/lib/utils/gradeCalculator';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';

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
      cell: ({ row }) => row.original.roll_number,
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
            ) : student.marks_obtained !== null ? (
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
      cell: () => <div className="text-center">{report.subject?.total_marks ?? '-'}</div>,
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
  ], [t, report.subject?.total_marks, sortedStudents, page, pageSize]);

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

// Component for individual class/subject report in multiple classes tab
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
  const organizationId = profile?.organization_id;

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'single' | 'multiple'>('single');
  const [activeClassTabId, setActiveClassTabId] = useState<string>(''); // Track active class tab in multiple classes view

  const { data: exams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);
  const { data: examClasses, isLoading: classesLoading } = useExamClasses(selectedExamId);
  
  // For single class tab, get subjects for selected class
  // For multiple classes tab, get subjects for the active class tab (or first class if none selected)
  const classIdForSubjects = activeTab === 'multiple' && examClasses && examClasses.length > 0
    ? (activeClassTabId || examClasses[0].id)
    : selectedClassId;
  
  const { data: examSubjects, isLoading: subjectsLoading } = useExamSubjects(
    selectedExamId, 
    classIdForSubjects
  );
  const { data: academicYears } = useAcademicYears();
  const { data: currentAcademicYear, isLoading: currentYearLoading } = useCurrentAcademicYear(organizationId);

  // Auto-select latest exam from current academic year
  useEffect(() => {
    // Only auto-select if no exam is selected and both exams and current academic year are loaded
    if (!selectedExamId && !examsLoading && !currentYearLoading && exams !== undefined) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (exams && exams.length > 0) {
        // Fallback to first exam if no current year exam found
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

  // Auto-select first class tab in multiple classes view
  useEffect(() => {
    if (activeTab === 'multiple' && examClasses && examClasses.length > 0) {
      if (!activeClassTabId || !examClasses.find(c => c.id === activeClassTabId)) {
        setActiveClassTabId(examClasses[0].id);
      }
    } else if (activeTab === 'single') {
      // Reset active class tab when switching to single tab
      setActiveClassTabId('');
    }
  }, [activeTab, examClasses, activeClassTabId]);

  // Track previous classId to detect class changes
  const prevClassIdRef = useRef<string>('');
  
  // Auto-select first subject when class changes (for both single and multiple tabs)
  useEffect(() => {
    if (examSubjects && examSubjects.length > 0 && !subjectsLoading && classIdForSubjects) {
      // Check if class has actually changed
      const classChanged = prevClassIdRef.current !== classIdForSubjects;
      
      if (classChanged) {
        // Always select first subject when class changes
        setSelectedSubjectId(examSubjects[0].id);
        prevClassIdRef.current = classIdForSubjects;
      } else {
        // If class hasn't changed, check if current subject exists
        const subjectExists = selectedSubjectId && examSubjects.some(s => s.id === selectedSubjectId);
        if (!subjectExists && selectedSubjectId) {
          // Select first subject if current subject doesn't exist in this class
          setSelectedSubjectId(examSubjects[0].id);
        }
      }
    }
  }, [classIdForSubjects, examSubjects, subjectsLoading, selectedSubjectId]); // Re-run when class changes

  // Auto-select first subject when exam subjects are loaded (initial load only)
  useEffect(() => {
    if (examSubjects && examSubjects.length > 0 && !selectedSubjectId && !subjectsLoading) {
      if (activeTab === 'single' && selectedClassId) {
        setSelectedSubjectId(examSubjects[0].id);
      } else if (activeTab === 'multiple' && selectedExamId && examClasses && examClasses.length > 0) {
        // In multiple classes tab, auto-select first subject and first class
        const firstClass = selectedClassId || examClasses[0].id;
        setSelectedSubjectId(examSubjects[0].id);
        if (!selectedClassId) {
          setSelectedClassId(firstClass);
        }
      }
    }
  }, [examSubjects, selectedSubjectId, selectedClassId, selectedExamId, subjectsLoading, activeTab, examClasses]);

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

  // Fetch all classes for multiple classes view
  const { data: allExamClasses } = useExamClasses(selectedExamId);

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

  const handlePrint = () => {
    window.print();
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
            {/* Exam Selection with academic year */}
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
              {/* Show academic year below exam selection */}
              {selectedExam && academicYear && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    {t('examReports.academicYear')}: <span className="font-semibold">{academicYear.name}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Class Selection filtered by exam - only show in single tab */}
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

            {/* Subject Selection filtered by exam + class - only show in single tab */}
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

          {/* Subject Badges - Show in both tabs, filtered by class */}
          {selectedExamId && classIdForSubjects && examSubjects && examSubjects.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label>
                {t('examReports.selectSubject')}
                {activeTab === 'multiple' && examClasses && examClasses.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({t('examReports.subjectsForClass') || 'Subjects for'} {examClasses.find(c => c.id === classIdForSubjects)?.classAcademicYear?.class?.name || ''})
                  </span>
                )}
              </Label>
              <div className="flex flex-wrap gap-2">
                {examSubjects.map((subject) => {
                  const subjectName = subject.subject?.name ?? subject.classSubject?.subject?.name ?? t('subjects.subject') ?? 'Subject';
                  const isSelected = selectedSubjectId === subject.id;
                  
                  return (
                    <Badge
                      key={subject.id}
                      variant={isSelected ? 'default' : 'outline'}
                      className="cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                      onClick={() => {
                        setSelectedSubjectId(subject.id);
                        // In multiple classes tab, also select first class when subject is selected
                        if (activeTab === 'multiple' && examClasses && examClasses.length > 0) {
                          // Use selected class if available, otherwise use first class
                          const targetClassId = selectedClassId || examClasses[0].id;
                          if (!selectedClassId) {
                            setSelectedClassId(targetClassId);
                          }
                        }
                      }}
                    >
                      {subjectName}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {selectedExamId && selectedSubjectId && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('examReports.print')}
              </Button>
              {report && report.students && report.students.length > 0 && (
                <ReportExportButtons
                  data={report.students}
                  columns={[
                    { key: 'rank', label: t('examReports.rank') },
                    { key: 'rollNumber', label: t('examReports.rollNumber') },
                    { key: 'studentName', label: t('examReports.studentName') },
                    { key: 'marksObtained', label: t('examReports.obtainedMarks') },
                    { key: 'totalMarks', label: t('examReports.totalMarks') },
                    { key: 'percentage', label: t('examReports.percentage') },
                    { key: 'grade', label: t('examReports.grade') },
                    { key: 'result', label: t('examReports.result') },
                  ]}
                  reportKey="class_subject_academic_year"
                  title={`${t('examReports.classSubjectMarkSheet') || 'Class Subject Mark Sheet'} - ${report.exam?.name || ''} - ${report.class?.name || ''} - ${report.subject?.name || ''}`}
                  transformData={(data) => data.map((student: any) => ({
                    rank: student.rank || '-',
                    rollNumber: student.roll_number || '-',
                    studentName: student.name || student.student_name || '-',
                    marksObtained: student.is_absent ? t('examReports.absent') : (student.marks_obtained !== null ? student.marks_obtained : '-'),
                    totalMarks: report.subject?.total_marks || '-',
                    percentage: student.percentage !== null && student.percentage !== undefined ? `${student.percentage.toFixed(2)}%` : '-',
                    grade: student.grade || '-',
                    result: student.result === 'pass' ? t('examReports.pass') : student.result === 'fail' ? t('examReports.fail') : t('examReports.absent'),
                  }))}
                  buildFiltersSummary={() => {
                    const parts: string[] = [];
                    if (report.exam?.name) parts.push(`Exam: ${report.exam.name}`);
                    if (report.class?.name) parts.push(`Class: ${report.class.name}${report.class.section ? ` - ${report.class.section}` : ''}`);
                    if (report.subject?.name) parts.push(`Subject: ${report.subject.name}`);
                    if (academicYear?.name) parts.push(`Academic Year: ${academicYear.name}`);
                    return parts.join(' | ');
                  }}
                  schoolId={profile?.default_school_id}
                  templateType="class_subject_academic_year"
                  disabled={!report || !report.students || report.students.length === 0}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs for Single vs Multiple Classes */}
      {selectedExamId && selectedSubjectId && (
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
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Multiple Classes Tab */}
          <TabsContent value="multiple" className="space-y-6">
            {allExamClasses && allExamClasses.length > 0 ? (
              <Tabs 
                value={activeClassTabId || allExamClasses[0]?.id} 
                onValueChange={setActiveClassTabId}
                className="w-full"
              >
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
                  <ClassSubjectReportTab 
                    key={examClass.id} 
                    examClass={examClass} 
                    examId={selectedExamId}
                    subjectId={selectedSubjectId}
                    academicYear={academicYear}
                    selectedExam={selectedExam}
                  />
                ))}
              </Tabs>
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

      {(!selectedExamId || !selectedSubjectId) && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Search className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('examReports.selectExamPrompt')}</p>
              <p className="text-sm text-muted-foreground">{t('examReports.selectSubjectPrompt')}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
