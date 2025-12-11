import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStudents } from '@/hooks/useStudents';
import { useExams } from '@/hooks/useExams';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { examsApi } from '@/lib/api/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { FileDown, Printer, Award, Calendar, User, MapPin, Phone, TrendingUp, BookOpen, Trophy } from 'lucide-react';
import { useHasPermission } from '@/hooks/usePermissions';
import { Separator } from '@/components/ui/separator';

export default function StudentExamReport() {
  const { t, locale, isRTL } = useLanguage();
  const canViewReports = useHasPermission('students.read');

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  const { data: students, isLoading: studentsLoading } = useStudents();
  const { data: exams, isLoading: examsLoading } = useExams();
  const { data: academicYears } = useAcademicYears();

  // Fetch student exam report
  const { data: reportData, isLoading: reportLoading, isFetching } = useQuery({
    queryKey: ['student-exam-report', selectedStudentId, selectedExamId],
    queryFn: async () => {
      if (!selectedStudentId || !selectedExamId) return null;
      // Using consolidated report endpoint - adjust as needed based on your backend
      const response = await examsApi.consolidatedClassReport(selectedExamId, selectedStudentId);
      return response.data;
    },
    enabled: Boolean(selectedStudentId && selectedExamId),
  });

  const selectedStudent = students?.find(s => s.id === selectedStudentId);
  const selectedExam = exams?.find(e => e.id === selectedExamId);
  const academicYear = academicYears?.find(y => y.id === selectedExam?.academicYearId);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    console.log('Download PDF');
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
        <h1 className="text-3xl font-bold tracking-tight">{t('studentReportCard.title')}</h1>
        <p className="text-muted-foreground mt-2">{t('studentReportCard.selectStudentPrompt')}</p>
      </div>

      {/* Selection Panel */}
      <Card>
        <CardHeader>
          <CardTitle>{t('studentReportCard.selectStudent')}</CardTitle>
          <CardDescription>{t('studentReportCard.selectStudentPrompt')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="student">{t('studentReportCard.selectStudent')}</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger id="student">
                  <SelectValue placeholder={t('studentReportCard.selectStudentPrompt')} />
                </SelectTrigger>
                <SelectContent>
                  {studentsLoading ? (
                    <SelectItem value="loading" disabled>
                      {t('common.loading')}
                    </SelectItem>
                  ) : students && students.length > 0 ? (
                    students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.fullName} - {student.rollNumber}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {t('students.noStudents')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Exam Selection */}
            <div className="space-y-2">
              <Label htmlFor="exam">{t('examReports.selectExam')}</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId} disabled={!selectedStudentId}>
                <SelectTrigger id="exam">
                  <SelectValue placeholder={t('examReports.selectExamPrompt')} />
                </SelectTrigger>
                <SelectContent>
                  {examsLoading ? (
                    <SelectItem value="loading" disabled>
                      {t('common.loading')}
                    </SelectItem>
                  ) : exams && exams.length > 0 ? (
                    exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {t('exams.noExams')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedStudentId && selectedExamId && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('studentReportCard.printCard')}
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                {t('studentReportCard.downloadPDF')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Card Display */}
      {selectedStudentId && selectedExamId && selectedStudent && (
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
          ) : (
            <>
              {/* Report Card Header */}
              <Card className="print:shadow-none border-2">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Award className="h-8 w-8 text-primary" />
                      <CardTitle className="text-3xl">{t('studentReportCard.title')}</CardTitle>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{t('studentReportCard.sessionYear')}: <span className="font-semibold">{academicYear?.name}</span></p>
                      <p>{t('examReports.examName')}: <span className="font-semibold">{selectedExam?.name}</span></p>
                    </div>
                  </div>
                </CardHeader>

                {/* Student Information Section */}
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-[auto_1fr] gap-6">
                    {/* Student Photo Placeholder */}
                    <div className="flex flex-col items-center">
                      <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/20">
                        <User className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{t('studentReportCard.studentPhoto')}</p>
                    </div>

                    {/* Student Details */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {t('studentReportCard.studentInformation')}
                      </h3>
                      <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[120px]">{t('students.fullName')}:</span>
                          <span className="text-sm font-semibold">{selectedStudent.fullName}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[120px]">{t('studentReportCard.rollNo')}:</span>
                          <span className="text-sm font-semibold">{selectedStudent.rollNumber}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[120px]">{t('studentReportCard.fatherName')}:</span>
                          <span className="text-sm font-semibold">{selectedStudent.fatherName || '-'}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[120px]">{t('studentReportCard.dateOfBirth')}:</span>
                          <span className="text-sm font-semibold">
                            {selectedStudent.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toLocaleDateString(locale) : '-'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[120px]">{t('classes.class')}:</span>
                          <span className="text-sm font-semibold">{selectedStudent.className || '-'}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm text-muted-foreground min-w-[120px]">{t('studentReportCard.admissionNo')}:</span>
                          <span className="text-sm font-semibold">{selectedStudent.admissionNumber || '-'}</span>
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
                          <TableHead className="text-center">{t('studentReportCard.marksObtained')}</TableHead>
                          <TableHead className="text-center">{t('studentReportCard.percentage')}</TableHead>
                          <TableHead className="text-center">{t('studentReportCard.grade')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData?.subjects?.map((subject: any, index: number) => {
                          const studentMarks = reportData.students?.[0]?.marks?.find((m: any) => m.subject_id === subject.id);
                          const percentage = studentMarks ? ((studentMarks.marks_obtained / subject.total_marks) * 100) : 0;

                          return (
                            <TableRow key={subject.id}>
                              <TableCell className="font-medium">{index + 1}</TableCell>
                              <TableCell className="font-medium">{subject.name}</TableCell>
                              <TableCell className="text-center">{subject.total_marks}</TableCell>
                              <TableCell className="text-center font-semibold">
                                {studentMarks?.marks_obtained || '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {studentMarks ? `${percentage.toFixed(2)}%` : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {studentMarks?.grade ? (
                                  <Badge variant={studentMarks.is_pass ? 'default' : 'destructive'}>
                                    {studentMarks.grade}
                                  </Badge>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-amber-50 dark:bg-amber-950/20 font-bold">
                          <TableCell colSpan={2} className="text-right">
                            {t('studentReportCard.grandTotal')}
                          </TableCell>
                          <TableCell className="text-center">
                            {reportData.students?.[0]?.total_marks || '-'}
                          </TableCell>
                          <TableCell className="text-center text-lg">
                            {reportData.students?.[0]?.total_obtained || '-'}
                          </TableCell>
                          <TableCell className="text-center text-lg">
                            {reportData.students?.[0]?.percentage?.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-center">
                            {reportData.students?.[0]?.overall_grade && (
                              <Badge
                                variant={reportData.students[0].result === 'pass' ? 'default' : 'destructive'}
                                className="text-base px-3 py-1"
                              >
                                {reportData.students[0].overall_grade}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
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
                          {reportData.students?.[0]?.percentage?.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('studentReportCard.overallGrade')}:</span>
                        <Badge variant="default" className="text-xl px-4 py-2">
                          {reportData.students?.[0]?.overall_grade || '-'}
                        </Badge>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">{t('examReports.result')}:</span>
                        {reportData.students?.[0]?.result === 'pass' ? (
                          <Badge variant="default" className="gap-1 text-base px-3 py-1">
                            <TrendingUp className="h-4 w-4" />
                            {t('examReports.pass')}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-base px-3 py-1">
                            {t('examReports.fail')}
                          </Badge>
                        )}
                      </div>
                      {reportData.students?.[0]?.rank && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('examReports.rank')}:</span>
                          <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-amber-500" />
                            <span className="text-xl font-bold">{reportData.students[0].rank}</span>
                          </div>
                        </div>
                      )}
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
                    <p>{t('studentReportCard.dateIssued')}: {new Date().toLocaleDateString(locale)}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
