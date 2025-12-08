import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useExam, useExamClasses, useExamSummaryReport, 
  useExamClassReport, useExamStudentReport, useEnrollmentStats, useMarksProgress
} from '@/hooks/useExams';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, BarChart3, Users, CheckCircle, XCircle, 
  GraduationCap, Search, FileText, BookOpen
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

export function ExamReportsPage() {
  const { t } = useLanguage();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // Data hooks
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: examClasses } = useExamClasses(examId);
  const { data: summaryReport, isLoading: summaryLoading } = useExamSummaryReport(examId);
  const { data: enrollmentStats } = useEnrollmentStats(examId);
  const { data: marksProgress } = useMarksProgress(examId);
  const { data: studentAdmissions } = useStudentAdmissions(organizationId);

  // Permissions
  const hasViewReports = useHasPermission('exams.view_reports');

  // State for class report
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const { data: classReport, isLoading: classReportLoading } = useExamClassReport(
    examId, 
    selectedClassId || undefined
  );

  // State for student report
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const { data: studentReport, isLoading: studentReportLoading } = useExamStudentReport(
    examId,
    selectedStudentId || undefined
  );

  // Get class name from exam class
  const getClassName = (examClassId: string) => {
    const examClass = examClasses?.find(ec => ec.id === examClassId);
    if (!examClass?.classAcademicYear) return 'Class';
    const className = examClass.classAcademicYear.class?.name || 'Class';
    return examClass.classAcademicYear.sectionName 
      ? `${className} - ${examClass.classAcademicYear.sectionName}`
      : className;
  };

  // Filter students by search
  const filteredStudents = studentAdmissions?.filter(sa => 
    sa.student?.fullName?.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
    sa.rollNumber?.toLowerCase().includes(searchStudentQuery.toLowerCase())
  ) || [];

  const isLoading = examLoading || summaryLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('exams.notFound') || 'Exam not found'}</p>
          <Button variant="link" onClick={() => navigate('/exams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('exams.backToList') || 'Back to Exams'}
          </Button>
        </div>
      </div>
    );
  }

  if (!hasViewReports) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('common.noPermission') || 'You do not have permission to view reports'}</p>
          <Button variant="link" onClick={() => navigate('/exams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('exams.backToList') || 'Back to Exams'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/exams')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{exam.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('exams.reportsDescription') || 'View exam reports and analytics'}
          </p>
        </div>
        <Badge variant="outline">{exam.academicYear?.name || 'N/A'}</Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('exams.reports.summary') || 'Summary'}
          </TabsTrigger>
          <TabsTrigger value="classReport" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            {t('exams.reports.classMarkSheet') || 'Class Mark Sheet'}
          </TabsTrigger>
          <TabsTrigger value="studentReport" className="gap-2">
            <FileText className="h-4 w-4" />
            {t('exams.reports.studentResult') || 'Student Result'}
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('exams.totalClasses') || 'Total Classes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{summaryReport?.totals.classes || 0}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('exams.totalSubjects') || 'Total Subjects'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{summaryReport?.totals.subjects || 0}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('exams.enrolledStudents') || 'Enrolled Students'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{summaryReport?.totals.enrolledStudents || 0}</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('exams.resultsEntered') || 'Results Entered'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="text-2xl font-bold">{summaryReport?.totals.resultsEntered || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pass/Fail Summary */}
          {summaryReport?.passFail && (
            <Card>
              <CardHeader>
                <CardTitle>{t('exams.passFailSummary') || 'Pass/Fail Summary'}</CardTitle>
                <CardDescription>
                  {t('exams.passFailSummaryDescription') || 'Overall pass/fail statistics'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('exams.passed') || 'Passed'}</p>
                      <p className="text-2xl font-bold">{summaryReport.passFail.passCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                      <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('exams.failed') || 'Failed'}</p>
                      <p className="text-2xl font-bold">{summaryReport.passFail.failCount}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t('exams.passPercentage') || 'Pass Percentage'}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={summaryReport.passFail.passPercentage} className="flex-1" />
                      <span className="text-lg font-bold">{summaryReport.passFail.passPercentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enrollment Stats */}
          {enrollmentStats && (
            <Card>
              <CardHeader>
                <CardTitle>{t('exams.enrollmentStatus') || 'Enrollment Status'}</CardTitle>
                <CardDescription>
                  {t('exams.enrollmentStatusDescription') || 'Student enrollment by class'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('exams.overallEnrollment') || 'Overall Enrollment'}</span>
                    <span className="font-medium">{enrollmentStats.totalEnrolled} / {enrollmentStats.totalAvailable}</span>
                  </div>
                  <Progress value={enrollmentStats.overallPercentage} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('exams.class') || 'Class'}</TableHead>
                      <TableHead className="text-right">{t('exams.enrolled') || 'Enrolled'}</TableHead>
                      <TableHead className="text-right">{t('exams.available') || 'Available'}</TableHead>
                      <TableHead className="text-right">{t('exams.percentage') || 'Percentage'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollmentStats.classStats.map((cs) => (
                      <TableRow key={cs.examClassId}>
                        <TableCell className="font-medium">
                          {cs.className}{cs.sectionName ? ` - ${cs.sectionName}` : ''}
                        </TableCell>
                        <TableCell className="text-right">{cs.enrolledCount}</TableCell>
                        <TableCell className="text-right">{cs.availableCount}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={cs.enrollmentPercentage === 100 ? 'default' : 'secondary'}>
                            {cs.enrollmentPercentage.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Marks Progress */}
          {marksProgress && (
            <Card>
              <CardHeader>
                <CardTitle>{t('exams.marksEntryProgress') || 'Marks Entry Progress'}</CardTitle>
                <CardDescription>
                  {t('exams.marksEntryProgressDescription') || 'Progress of marks entry by subject'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{t('exams.overallProgress') || 'Overall Progress'}</span>
                    <span className="font-medium">{marksProgress.totalEntered} / {marksProgress.totalExpected}</span>
                  </div>
                  <Progress value={marksProgress.overallPercentage} />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('exams.subject') || 'Subject'}</TableHead>
                      <TableHead>{t('exams.class') || 'Class'}</TableHead>
                      <TableHead className="text-right">{t('exams.entered') || 'Entered'}</TableHead>
                      <TableHead className="text-right">{t('exams.total') || 'Total'}</TableHead>
                      <TableHead className="text-right">{t('exams.status') || 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marksProgress.subjectProgress.map((sp) => (
                      <TableRow key={sp.examSubjectId}>
                        <TableCell className="font-medium">{sp.subjectName}</TableCell>
                        <TableCell>{sp.className}</TableCell>
                        <TableCell className="text-right">{sp.resultsCount}</TableCell>
                        <TableCell className="text-right">{sp.enrolledCount}</TableCell>
                        <TableCell className="text-right">
                          {sp.isComplete ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {t('exams.complete') || 'Complete'}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              {sp.percentage.toFixed(0)}%
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Class Mark Sheet Tab */}
        <TabsContent value="classReport" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('exams.classMarkSheet') || 'Class Mark Sheet'}</CardTitle>
              <CardDescription>
                {t('exams.classMarkSheetDescription') || 'View marks for all students in a class'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>{t('exams.selectClass') || 'Select Class'}</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder={t('exams.selectClassPlaceholder') || 'Select a class'} />
                  </SelectTrigger>
                  <SelectContent>
                    {examClasses?.map((ec) => (
                      <SelectItem key={ec.id} value={ec.id}>
                        {getClassName(ec.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClassId && classReportLoading && (
                <Skeleton className="h-64 w-full" />
              )}

              {selectedClassId && classReport && !classReportLoading && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">{t('exams.student') || 'Student'}</TableHead>
                        <TableHead>{t('exams.rollNumber') || 'Roll No.'}</TableHead>
                        {classReport.subjects.map((subject) => (
                          <TableHead key={subject.id} className="text-center">
                            {subject.name}
                            <div className="text-xs text-muted-foreground">({subject.totalMarks})</div>
                          </TableHead>
                        ))}
                        <TableHead className="text-center">{t('exams.total') || 'Total'}</TableHead>
                        <TableHead className="text-center">{t('exams.percentage') || '%'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classReport.students.map((student) => (
                        <TableRow key={student.examStudentId}>
                          <TableCell className="sticky left-0 bg-background font-medium">
                            {student.student.fullName}
                          </TableCell>
                          <TableCell>{student.student.rollNumber || '—'}</TableCell>
                          {student.subjects.map((subject) => (
                            <TableCell key={subject.examSubjectId} className="text-center">
                              {subject.isAbsent ? (
                                <Badge variant="destructive">AB</Badge>
                              ) : subject.marksObtained !== null ? (
                                <span className={subject.isPass ? 'text-green-600' : 'text-red-600'}>
                                  {subject.marksObtained}
                                </span>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-medium">
                            {student.totals.obtained} / {student.totals.maximum}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={student.totals.percentage >= 33 ? 'default' : 'destructive'}>
                              {student.totals.percentage.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 text-sm text-muted-foreground">
                    {t('exams.totalStudents') || 'Total Students'}: {classReport.summary.totalStudents} | 
                    {t('exams.subjects') || 'Subjects'}: {classReport.summary.subjectsCount}
                  </div>
                </div>
              )}

              {selectedClassId && !classReportLoading && !classReport && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('exams.noClassReportData') || 'No data available for this class'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student Result Tab */}
        <TabsContent value="studentReport" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('exams.studentResult') || 'Student Result'}</CardTitle>
              <CardDescription>
                {t('exams.studentResultDescription') || 'View detailed result for a specific student'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <Label>{t('exams.searchStudent') || 'Search Student'}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('exams.searchStudentPlaceholder') || 'Search by name or roll number...'}
                      value={searchStudentQuery}
                      onChange={(e) => {
                        setSearchStudentQuery(e.target.value);
                        setSelectedStudentId('');
                      }}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {searchStudentQuery && filteredStudents.length > 0 && !selectedStudentId && (
                <div className="mb-4 border rounded-lg max-h-48 overflow-y-auto">
                  {filteredStudents.slice(0, 10).map((sa) => (
                    <button
                      key={sa.id}
                      className="w-full px-4 py-2 text-left hover:bg-muted flex items-center justify-between"
                      onClick={() => {
                        setSelectedStudentId(sa.studentId || '');
                        setSearchStudentQuery(sa.student?.fullName || '');
                      }}
                    >
                      <span className="font-medium">{sa.student?.fullName}</span>
                      <span className="text-sm text-muted-foreground">{sa.rollNumber}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedStudentId && studentReportLoading && (
                <Skeleton className="h-64 w-full" />
              )}

              {selectedStudentId && studentReport && !studentReportLoading && (
                <div className="space-y-6">
                  {/* Student Info */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('exams.studentName') || 'Student Name'}</p>
                        <p className="font-medium">{studentReport.student.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('exams.admissionNo') || 'Admission No.'}</p>
                        <p className="font-medium">{studentReport.student.admissionNo || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('exams.class') || 'Class'}</p>
                        <p className="font-medium">{studentReport.student.className || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('exams.rollNumber') || 'Roll No.'}</p>
                        <p className="font-medium">{studentReport.student.rollNumber || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Subject-wise Results */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('exams.subject') || 'Subject'}</TableHead>
                        <TableHead className="text-center">{t('exams.marksObtained') || 'Marks Obtained'}</TableHead>
                        <TableHead className="text-center">{t('exams.totalMarks') || 'Total'}</TableHead>
                        <TableHead className="text-center">{t('exams.result') || 'Result'}</TableHead>
                        <TableHead>{t('exams.remarks') || 'Remarks'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentReport.subjects.map((subject) => (
                        <TableRow key={subject.examSubjectId}>
                          <TableCell className="font-medium">{subject.subject.name}</TableCell>
                          <TableCell className="text-center">
                            {subject.isAbsent ? (
                              <Badge variant="destructive">AB</Badge>
                            ) : (
                              subject.marks.obtained ?? '—'
                            )}
                          </TableCell>
                          <TableCell className="text-center">{subject.marks.total}</TableCell>
                          <TableCell className="text-center">
                            {subject.isAbsent ? (
                              <Badge variant="destructive">{t('exams.absent') || 'Absent'}</Badge>
                            ) : subject.isPass ? (
                              <Badge variant="default">{t('exams.pass') || 'Pass'}</Badge>
                            ) : (
                              <Badge variant="destructive">{t('exams.fail') || 'Fail'}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{subject.remarks || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Summary */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('exams.totalMarksObtained') || 'Total Marks'}</p>
                        <p className="text-xl font-bold">
                          {studentReport.summary.totalMarksObtained} / {studentReport.summary.totalMaximumMarks}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('exams.percentage') || 'Percentage'}</p>
                        <p className="text-xl font-bold">{studentReport.summary.overallPercentage.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('exams.passed') || 'Passed'}</p>
                        <p className="text-xl font-bold text-green-600">{studentReport.summary.passedSubjects}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('exams.failed') || 'Failed'}</p>
                        <p className="text-xl font-bold text-red-600">{studentReport.summary.failedSubjects}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('exams.overallResult') || 'Overall Result'}</p>
                        <Badge 
                          variant={studentReport.summary.overallResult === 'pass' ? 'default' : 'destructive'}
                          className="text-lg"
                        >
                          {studentReport.summary.overallResult === 'pass' 
                            ? (t('exams.pass') || 'Pass')
                            : (t('exams.fail') || 'Fail')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedStudentId && !studentReportLoading && !studentReport && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('exams.noStudentReportData') || 'No data available for this student'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
