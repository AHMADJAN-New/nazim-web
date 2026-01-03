import React, { useState, useMemo, useCallback } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useShortTermCourses, useCourseStats } from '@/hooks/useShortTermCourses';
import { useCourseStudents } from '@/hooks/useCourseStudents';
import { useCourseAttendanceReport } from '@/hooks/useCourseAttendance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Users,
  GraduationCap,
  UserX,
  Clock,
  TrendingUp,
  Download,
  Calendar,
  Award,
  BarChart3,
} from 'lucide-react';
import { format } from 'date-fns';
// Import pdfmake for Arabic support - handle both default and named exports
import { PageHeader } from '@/components/layout/PageHeader';
import * as pdfMakeModule from 'pdfmake-arabic/build/pdfmake';
const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;

// Make pdfMake available globally for vfs_fonts
if (typeof window !== 'undefined') {
  (window as any).pdfMake = pdfMake;
}

// Use regular pdfmake vfs_fonts instead of pdfmake-arabic's (which has issues)
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { useLanguage } from '@/hooks/useLanguage';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { useAuth } from '@/hooks/useAuth';

// Set up fonts for Arabic/Pashto support
try {
  // Initialize VFS using Object.assign to avoid read-only error
  if (pdfFonts && typeof pdfFonts === 'object') {
    // pdfmake's vfs_fonts exports the VFS directly
    // Use Object.assign to merge VFS instead of direct assignment
    if (!(pdfMake as any).vfs) {
      (pdfMake as any).vfs = {};
    }
    Object.assign((pdfMake as any).vfs, pdfFonts);
  } else if (pdfFonts && (pdfFonts as any).vfs) {
    if (!(pdfMake as any).vfs) {
      (pdfMake as any).vfs = {};
    }
    Object.assign((pdfMake as any).vfs, (pdfFonts as any).vfs);
  }
} catch (error) {
  if (import.meta.env.DEV) {
    console.warn('Failed to initialize pdfmake fonts:', error);
  }
}

interface CourseStats {
  total_students: number;
  active_students: number;
  completed_students: number;
  dropped_students: number;
  attendance_rate: number;
  completion_rate: number;
}

export default function CourseDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [reportType, setReportType] = useState<'enrollment' | 'attendance' | 'completion'>('enrollment');

  const { data: courses = [], isLoading: coursesLoading } = useShortTermCourses();
  const { data: allStudents = [] } = useCourseStudents();
  const { data: attendanceReport } = useCourseAttendanceReport(
    selectedCourseId && selectedCourseId !== 'all' ? { courseId: selectedCourseId } : undefined
  );

  // Calculate overall stats
  const overallStats = useMemo(() => {
    const activeCourses = courses.filter((c) => c.status === 'open').length;
    const closedCourses = courses.filter((c) => c.status === 'closed').length;
    const totalStudents = allStudents.length;
    const completedStudents = allStudents.filter((s) => s.status === 'completed').length;
    const droppedStudents = allStudents.filter((s) => s.status === 'dropped').length;
    const activeStudents = allStudents.filter((s) => s.status === 'enrolled').length;

    return {
      totalCourses: courses.length,
      activeCourses,
      closedCourses,
      totalStudents,
      completedStudents,
      droppedStudents,
      activeStudents,
      completionRate: totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0,
    };
  }, [courses, allStudents]);

  // Get course-specific students
  const courseStudents = useMemo(() => {
    if (!selectedCourseId || selectedCourseId === 'all') return allStudents;
    return allStudents.filter((s) => s.courseId === selectedCourseId);
  }, [selectedCourseId, allStudents]);

  const { profile } = useAuth();

  // Prepare data for attendance report export (when reportType is 'attendance')
  const attendanceReportData = useMemo(() => {
    if (reportType !== 'attendance' || !attendanceReport) return [];
    return courseStudents.map((student) => {
      const attendanceData = attendanceReport.find(
        (r: any) => r.course_student_id === student.id
      );
      return {
        ...student,
        attendance_rate: attendanceData?.attendance_rate || 0,
      };
    });
  }, [reportType, attendanceReport, courseStudents]);

  // Report export columns for attendance
  const attendanceReportColumns = useMemo(() => [
    { key: 'student_name', label: t('courses.student') || 'Student' },
    { key: 'father_name', label: t('courses.fatherName') || 'Father Name' },
    { key: 'course_name', label: t('courses.course') || 'Course' },
    { key: 'status', label: t('courses.status') || 'Status' },
    { key: 'registration_date', label: t('courses.registration') || 'Registration' },
    { key: 'attendance_rate', label: t('courses.attendanceRate') || 'Attendance Rate' },
  ], [t]);

  // Transform data for attendance report
  const transformAttendanceData = useCallback((students: typeof attendanceReportData) => {
    return students.map((student) => {
      const course = courses.find((c) => c.id === student.courseId);
      return {
        student_name: student.fullName || '-',
        father_name: student.fatherName || '-',
        course_name: course?.name || '-',
        status: student.status || '-',
        registration_date: student.registrationDate ? formatDate(student.registrationDate) : '-',
        attendance_rate: `${Math.round(student.attendance_rate || 0)}%`,
      };
    });
  }, [courses]);

  // Build filters summary for attendance report
  const buildAttendanceFiltersSummary = useCallback(() => {
    const filters: string[] = [];
    if (selectedCourseId && selectedCourseId !== 'all') {
      const course = courses.find((c) => c.id === selectedCourseId);
      if (course) filters.push(`${t('courses.courseName') || 'Course'}: ${course.name}`);
    }
    return filters.join(', ');
  }, [selectedCourseId, courses, t]);

  // Export functions
  const exportToCsv = () => {
    let csvContent = '';
    const headers = [t('courses.studentName'), t('courses.fatherName'), t('courses.course'), t('courses.status'), t('courses.registration'), t('courses.completionDate')];
    csvContent += headers.join(',') + '\n';

    courseStudents.forEach((student) => {
      const course = courses.find((c) => c.id === student.courseId);
      const row = [
        `"${student.fullName}"`,
        `"${student.fatherName}"`,
        `"${course?.name || ''}"`,
        student.status,
        student.registrationDate || '',
        student.completionDate || '',
      ];
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-students-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPdf = () => {
    const selectedCourse = courses.find((c) => c.id === selectedCourseId);
    const title = selectedCourse
      ? `${t('courses.courseReports')}: ${selectedCourse.name}`
      : t('courses.allCoursesReport');

    const tableBody = [
      [t('courses.studentName'), t('courses.fatherName'), t('courses.course'), t('courses.status'), t('courses.regDate')],
    ];

    courseStudents.forEach((student) => {
      const course = courses.find((c) => c.id === student.courseId);
      tableBody.push([
        student.fullName,
        student.fatherName,
        course?.name || '',
        student.status.charAt(0).toUpperCase() + student.status.slice(1),
        student.registrationDate ? formatDate(student.registrationDate) : '-',
      ]);
    });

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: title, style: 'header' },
        { text: `${t('courses.generated')} ${format(new Date(), 'MMM d, yyyy HH:mm')}`, style: 'subheader' },
        { text: '\n' },
        {
          text: `${t('courses.summary')}: ${courseStudents.length} ${t('nav.students') || 'students'}, ${courseStudents.filter((s) => s.status === 'completed').length} ${t('courses.completed')}, ${courseStudents.filter((s) => s.status === 'dropped').length} ${t('courses.dropped')}`,
          style: 'summary',
        },
        { text: '\n\n' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*', '*', 'auto', 'auto'],
            body: tableBody,
          },
          layout: {
            fillColor: function (rowIndex: number) {
              return rowIndex === 0 ? '#f3f4f6' : null;
            },
          },
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10],
        },
        subheader: {
          fontSize: 10,
          color: '#6b7280',
        },
        summary: {
          fontSize: 12,
          color: '#374151',
        },
      },
    };

    pdfMake.createPdf(docDefinition).download(
      `course-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('courses.courseDashboard')}
        secondaryActions={[
          {
            label: t('courses.management'),
            onClick: () => navigate('/short-term-courses'),
            icon: <BookOpen className="h-4 w-4" />,
            variant: 'outline',
          },
          {
            label: t('nav.attendance'),
            onClick: () => navigate('/course-attendance'),
            icon: <Calendar className="h-4 w-4" />,
            variant: 'outline',
          },
        ]}
      />

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('courses.totalCourses')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.activeCourses} {t('courses.active')}, {overallStats.closedCourses} {t('courses.closed')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('courses.totalStudents')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.activeStudents} {t('courses.currentlyEnrolled')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('courses.completed')}</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.completedStudents}</div>
            <Progress value={overallStats.completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {overallStats.completionRate}% {t('courses.completionRate')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('courses.dropped')}</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overallStats.droppedStudents}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.totalStudents > 0
                ? Math.round((overallStats.droppedStudents / overallStats.totalStudents) * 100)
                : 0}% {t('courses.dropRate')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course-Specific Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('courses.courseReports')}</CardTitle>
              <CardDescription>{t('courses.courseReportsDescription')}</CardDescription>
            </div>
            <div className="flex gap-2">
              {reportType === 'attendance' ? (
                <ReportExportButtons
                  data={attendanceReportData}
                  columns={attendanceReportColumns}
                  reportKey="short_term_course_attendance"
                  title={t('courses.courseReports') || 'Short-term Course Attendance Report'}
                  transformData={transformAttendanceData}
                  buildFiltersSummary={buildAttendanceFiltersSummary}
                  schoolId={profile?.default_school_id}
                  templateType="course_attendance"
                  disabled={attendanceReportData.length === 0}
                />
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={exportToCsv}>
                    <Download className="h-4 w-4 mr-1" />
                    {t('courses.csv')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToPdf}>
                    <Download className="h-4 w-4 mr-1" />
                    {t('courses.pdf')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="w-64">
              <Label>{t('courses.selectCourse')}</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('courses.allCourses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('courses.allCourses')}</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label>{t('courses.reportType')}</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrollment">{t('courses.enrollment')}</SelectItem>
                  <SelectItem value="attendance">{t('nav.attendance')}</SelectItem>
                  <SelectItem value="completion">{t('courses.completion')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Students Table */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('courses.student')}</TableHead>
                  <TableHead>{t('courses.course')}</TableHead>
                  <TableHead>{t('courses.status')}</TableHead>
                  <TableHead>{t('courses.registration')}</TableHead>
                  <TableHead>{t('courses.completionDate')}</TableHead>
                  {reportType === 'attendance' && <TableHead>{t('courses.attendanceRate')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={reportType === 'attendance' ? 6 : 5} className="text-center py-8">
                      {t('courses.noStudentsFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  courseStudents.map((student) => {
                    const course = courses.find((c) => c.id === student.courseId);
                    const attendanceData = attendanceReport?.find(
                      (r: any) => r.course_student_id === student.id
                    );
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.fullName}</p>
                            <p className="text-sm text-muted-foreground">{student.fatherName}</p>
                          </div>
                        </TableCell>
                        <TableCell>{course?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.status === 'completed'
                                ? 'default'
                                : student.status === 'dropped'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {student.registrationDate
                            ? formatDate(student.registrationDate)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {student.completionDate
                            ? formatDate(student.completionDate)
                            : '-'}
                        </TableCell>
                        {reportType === 'attendance' && (
                          <TableCell>
                            {attendanceData ? (
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={attendanceData.attendance_rate || 0}
                                  className="w-16"
                                />
                                <span className="text-sm">
                                  {Math.round(attendanceData.attendance_rate || 0)}%
                                </span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Course Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.slice(0, 6).map((course) => {
          const students = allStudents.filter((s) => s.courseId === course.id);
          const completed = students.filter((s) => s.status === 'completed').length;
          const dropped = students.filter((s) => s.status === 'dropped').length;
          const completionRate = students.length > 0 ? Math.round((completed / students.length) * 100) : 0;

          return (
            <Card key={course.id} className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/course-students?courseId=${course.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{course.name}</CardTitle>
                  <Badge variant={course.status === 'open' ? 'default' : 'secondary'}>
                    {course.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('common.total')}</span>
                    <span className="font-medium">{students.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('courses.completed')}</span>
                    <span className="font-medium text-green-600">{completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('courses.dropped')}</span>
                    <span className="font-medium text-red-600">{dropped}</span>
                  </div>
                  <Progress value={completionRate} className="mt-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {completionRate}% {t('courses.completion')}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
