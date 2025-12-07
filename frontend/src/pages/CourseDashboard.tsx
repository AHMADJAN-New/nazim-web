import React, { useState, useMemo } from 'react';
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
import pdfMake from 'pdfmake-arabic/build/pdfmake';
import pdfFonts from 'pdfmake-arabic/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

interface CourseStats {
  total_students: number;
  active_students: number;
  completed_students: number;
  dropped_students: number;
  attendance_rate: number;
  completion_rate: number;
}

export default function CourseDashboard() {
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

  // Export functions
  const exportToCsv = () => {
    let csvContent = '';
    const headers = ['Student Name', 'Father Name', 'Course', 'Status', 'Registration Date', 'Completion Date'];
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
      ? `Course Report: ${selectedCourse.name}`
      : 'All Courses Report';

    const tableBody = [
      ['Student Name', 'Father Name', 'Course', 'Status', 'Reg. Date'],
    ];

    courseStudents.forEach((student) => {
      const course = courses.find((c) => c.id === student.courseId);
      tableBody.push([
        student.fullName,
        student.fatherName,
        course?.name || '',
        student.status.charAt(0).toUpperCase() + student.status.slice(1),
        student.registrationDate ? format(new Date(student.registrationDate), 'MMM d, yyyy') : '-',
      ]);
    });

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        { text: title, style: 'header' },
        { text: `Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, style: 'subheader' },
        { text: '\n' },
        {
          text: `Summary: ${courseStudents.length} students, ${courseStudents.filter((s) => s.status === 'completed').length} completed, ${courseStudents.filter((s) => s.status === 'dropped').length} dropped`,
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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Course Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/short-term-courses')}>
            <BookOpen className="h-4 w-4 mr-2" />
            Manage Courses
          </Button>
          <Button variant="outline" onClick={() => navigate('/course-attendance')}>
            <Calendar className="h-4 w-4 mr-2" />
            Attendance
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalCourses}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.activeCourses} active, {overallStats.closedCourses} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.activeStudents} currently enrolled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overallStats.completedStudents}</div>
            <Progress value={overallStats.completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {overallStats.completionRate}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Dropped</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overallStats.droppedStudents}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.totalStudents > 0
                ? Math.round((overallStats.droppedStudents / overallStats.totalStudents) * 100)
                : 0}% drop rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course-Specific Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Course Reports</CardTitle>
              <CardDescription>View and export detailed course reports</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCsv}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPdf}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="w-64">
              <Label>Select Course</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrollment">Enrollment</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                  <SelectItem value="completion">Completion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Students Table */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Completion</TableHead>
                  {reportType === 'attendance' && <TableHead>Attendance Rate</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={reportType === 'attendance' ? 6 : 5} className="text-center py-8">
                      No students found
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
                            ? format(new Date(student.registrationDate), 'MMM d, yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {student.completionDate
                            ? format(new Date(student.completionDate), 'MMM d, yyyy')
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
                    <span className="text-muted-foreground">Students</span>
                    <span className="font-medium">{students.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium text-green-600">{completed}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dropped</span>
                    <span className="font-medium text-red-600">{dropped}</span>
                  </div>
                  <Progress value={completionRate} className="mt-2" />
                  <p className="text-xs text-muted-foreground text-right">
                    {completionRate}% completion
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
