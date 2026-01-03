import { useMemo, useState, useCallback } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  useCourseStudents,
} from '@/hooks/useCourseStudents';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { CertificatePdfGenerator } from '@/components/short-term-courses/CertificatePdfGenerator';
import type { CourseStudent } from '@/types/domain/courseStudent';
import {
  Award,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Search,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { useAuth } from '@/hooks/useAuth';

export default function CourseCertificates() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    searchParams.get('course_id') || 'all'
  );
  const [search, setSearch] = useState('');
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<CourseStudent | null>(null);

  const { data: courses } = useShortTermCourses();
  const { data: studentsData, isLoading } = useCourseStudents();

  // Filter students to only show those with issued certificates
  const studentsWithCertificates = useMemo(() => {
    if (!studentsData) return [];
    return studentsData.filter(
      (student) => student.certificateIssued && student.completionStatus === 'completed'
    );
  }, [studentsData]);

  // Filter by course
  const filteredByCourse = useMemo(() => {
    if (selectedCourseId === 'all') return studentsWithCertificates;
    return studentsWithCertificates.filter((student) => student.courseId === selectedCourseId);
  }, [studentsWithCertificates, selectedCourseId]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return filteredByCourse;
    const searchLower = search.toLowerCase();
    return filteredByCourse.filter(
      (student) =>
        student.fullName?.toLowerCase().includes(searchLower) ||
        student.admissionNo?.toLowerCase().includes(searchLower) ||
        student.fatherName?.toLowerCase().includes(searchLower) ||
        student.guardianName?.toLowerCase().includes(searchLower)
    );
  }, [filteredByCourse, search]);

  const handleViewCertificate = (student: CourseStudent) => {
    setSelectedStudent(student);
    setCertificateDialogOpen(true);
  };

  const handleDownloadCertificate = (student: CourseStudent) => {
    setSelectedStudent(student);
    setCertificateDialogOpen(true);
    // The dialog will handle the download
  };

  const summary = useMemo(() => {
    return {
      total: studentsWithCertificates.length,
      byCourse: courses?.reduce((acc, course) => {
        acc[course.id] = studentsWithCertificates.filter(
          (s) => s.courseId === course.id
        ).length;
        return acc;
      }, {} as Record<string, number>) || {},
    };
  }, [studentsWithCertificates, courses]);

  const { profile } = useAuth();

  // Report export columns
  const reportColumns = useMemo(() => [
    { key: 'student_name', label: t('students.name') || 'Student' },
    { key: 'father_name', label: t('students.fatherName') || 'Father Name' },
    { key: 'admission_no', label: t('students.admissionNo') || 'Admission No' },
    { key: 'course_name', label: t('courses.courseName') || 'Course' },
    { key: 'certificate_number', label: 'Certificate #' },
    { key: 'issued_date', label: 'Issued Date' },
  ], [t]);

  // Transform data for report
  const transformCertificateData = useCallback((students: typeof filtered) => {
    return students.map((student) => ({
      student_name: student.fullName || '-',
      father_name: student.fatherName || '-',
      admission_no: student.admissionNo || '-',
      course_name: courses?.find((c) => c.id === student.courseId)?.name || '-',
      certificate_number: student.certificateIssuedDate ? formatDate(student.certificateIssuedDate) : '-',
      issued_date: student.certificateIssuedDate ? formatDate(student.certificateIssuedDate) : '-',
    }));
  }, [courses]);

  // Build filters summary
  const buildFiltersSummary = useCallback(() => {
    const filters: string[] = [];
    if (selectedCourseId && selectedCourseId !== 'all') {
      const course = courses?.find((c) => c.id === selectedCourseId);
      if (course) filters.push(`${t('courses.courseName') || 'Course'}: ${course.name}`);
    }
    if (search) {
      filters.push(`${t('common.search') || 'Search'}: ${search}`);
    }
    return filters.join(', ');
  }, [selectedCourseId, search, courses, t]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('courses.courseCertificates')}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1 hidden md:block">
            View, preview, and download certificates for completed course students.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Certificates</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-2xl font-bold">{summary.total}</div>
            <Award className="h-6 w-6 text-blue-500" />
          </CardContent>
        </Card>
        {courses?.slice(0, 3).map((course) => (
          <Card key={course.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground truncate">
                {course.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-bold">{summary.byCourse[course.id] || 0}</div>
              <GraduationCap className="h-6 w-6 text-emerald-500" />
            </CardContent>
          </Card>
        ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1 pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Issued Certificates</CardTitle>
              <p className="text-sm text-muted-foreground hidden md:block">
                Filter by course or search by name, admission number, or certificate number.
              </p>
            </div>
            <ReportExportButtons
              data={filtered}
              columns={reportColumns}
              reportKey="short_term_course_certificates"
              title={t('courses.courseCertificates') || 'Short-term Course Certificates Report'}
              transformData={transformCertificateData}
              buildFiltersSummary={buildFiltersSummary}
              schoolId={profile?.default_school_id}
              templateType="course_certificates"
              disabled={isLoading || filtered.length === 0}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{t('courses.courseName')}</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('courses.allCourses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('courses.allCourses')}</SelectItem>
                  {(courses || []).map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('common.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, admission #, or course"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {studentsWithCertificates.length === 0
                  ? 'No certificates have been issued yet.'
                  : 'No certificates found matching your filters.'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('students.name')}</TableHead>
                    <TableHead>{t('students.fatherName')}</TableHead>
                    <TableHead>{t('students.admissionNo')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('courses.courseName')}</TableHead>
                    <TableHead className="hidden md:table-cell">Certificate #</TableHead>
                    <TableHead className="hidden md:table-cell">Issued Date</TableHead>
                    <TableHead className="text-right w-[100px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="font-semibold leading-tight">{student.fullName || '-'}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {student.fatherName || '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {student.admissionNo || '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {courses?.find((c) => c.id === student.courseId)?.name || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {student.certificateIssuedDate ? (
                          <Badge variant="outline" className="font-mono">
                            {formatDate(student.certificateIssuedDate)}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {student.certificateIssuedDate
                          ? formatDate(student.certificateIssuedDate)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewCertificate(student)}
                            title="Preview Certificate"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadCertificate(student)}
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate PDF Generator Dialog */}
      {selectedStudent && (
        <CertificatePdfGenerator
          courseStudentId={selectedStudent.id}
          studentName={selectedStudent.fullName || ''}
          courseName={courses?.find((c) => c.id === selectedStudent.courseId)?.name || ''}
          courseId={selectedStudent.courseId}
          isOpen={certificateDialogOpen}
          onClose={() => {
            setCertificateDialogOpen(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
}

