import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useExams } from '@/hooks/useExams';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
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
import { FileDown, Printer, Search, Award, TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { useHasPermission } from '@/hooks/usePermissions';

export default function ClassSubjectMarkSheet() {
  const { t, locale } = useLanguage();
  const canViewReports = useHasPermission('exams.read');

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  const { data: exams, isLoading: examsLoading } = useExams();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const { data: academicYears } = useAcademicYears();

  // Fetch class-subject report
  const { data: report, isLoading: reportLoading, isFetching } = useQuery({
    queryKey: ['class-subject-report', selectedExamId, selectedClassId, selectedSubjectId],
    queryFn: async () => {
      if (!selectedExamId || !selectedClassId || !selectedSubjectId) return null;
      const response = await examsApi.classSubjectMarkSheet(selectedExamId, selectedClassId, selectedSubjectId);
      return response.data;
    },
    enabled: Boolean(selectedExamId && selectedClassId && selectedSubjectId),
  });

  const selectedExam = exams?.find(e => e.id === selectedExamId);
  const selectedClass = classes?.find(c => c.id === selectedClassId);
  const selectedSubject = subjects?.find(s => s.id === selectedSubjectId);
  const academicYear = academicYears?.find(y => y.id === selectedExam?.academicYearId);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    console.log('Download PDF');
  };

  const handleDownloadExcel = () => {
    // TODO: Implement Excel download
    console.log('Download Excel');
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
          <div className="grid gap-4 md:grid-cols-3">
            {/* Exam Selection */}
            <div className="space-y-2">
              <Label htmlFor="exam">{t('examReports.selectExam')}</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
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

            {/* Class Selection */}
            <div className="space-y-2">
              <Label htmlFor="class">{t('examReports.selectClass')}</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedExamId}>
                <SelectTrigger id="class">
                  <SelectValue placeholder={t('examReports.selectClassPrompt')} />
                </SelectTrigger>
                <SelectContent>
                  {classesLoading ? (
                    <SelectItem value="loading" disabled>
                      {t('common.loading')}
                    </SelectItem>
                  ) : classes && classes.length > 0 ? (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {t('classes.noClasses')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
              <Label htmlFor="subject">{t('examReports.selectSubject')}</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedClassId}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder={t('examReports.selectSubjectPrompt')} />
                </SelectTrigger>
                <SelectContent>
                  {subjectsLoading ? (
                    <SelectItem value="loading" disabled>
                      {t('common.loading')}
                    </SelectItem>
                  ) : subjects && subjects.length > 0 ? (
                    subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {t('subjects.noSubjects')}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedExamId && selectedClassId && selectedSubjectId && (
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                {t('examReports.print')}
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                {t('examReports.downloadPDF')}
              </Button>
              <Button variant="outline" onClick={handleDownloadExcel}>
                <FileDown className="h-4 w-4 mr-2" />
                {t('examReports.downloadExcel')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Display */}
      {selectedExamId && selectedClassId && selectedSubjectId && (
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
            <>
              {/* Report Header */}
              <Card className="print:shadow-none">
                <CardHeader className="text-center border-b">
                  <CardTitle className="text-2xl">{t('examReports.subjectReport')}</CardTitle>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{t('examReports.examName')}: <span className="font-semibold">{selectedExam?.name}</span></p>
                    <p>{t('examReports.className')}: <span className="font-semibold">{selectedClass?.name}</span></p>
                    <p>{t('examReports.subjectName')}: <span className="font-semibold">{selectedSubject?.name}</span></p>
                    {academicYear && (
                      <p>{t('examReports.academicYear')}: <span className="font-semibold">{academicYear.name}</span></p>
                    )}
                  </div>
                </CardHeader>

                {/* Statistics Summary */}
                {report.statistics && (
                  <CardContent className="py-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('examReports.totalStudents')}</p>
                        <p className="text-2xl font-bold">{report.statistics.total_students}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('examReports.classAverage')}</p>
                        <p className="text-2xl font-bold">{report.statistics.average?.toFixed(2)}%</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('examReports.highestMarks')}</p>
                        <p className="text-2xl font-bold text-green-600">{report.statistics.highest}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('examReports.lowestMarks')}</p>
                        <p className="text-2xl font-bold text-red-600">{report.statistics.lowest}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('examReports.passPercentage')}</p>
                        <p className="text-2xl font-bold">{report.statistics.pass_percentage?.toFixed(2)}%</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Student Results Table */}
              <Card className="print:shadow-none">
                <CardHeader>
                  <CardTitle>{t('examReports.studentStatistics')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">{t('examReports.rank')}</TableHead>
                          <TableHead>{t('examReports.studentName')}</TableHead>
                          <TableHead>{t('examReports.rollNumber')}</TableHead>
                          <TableHead className="text-center">{t('examReports.obtainedMarks')}</TableHead>
                          <TableHead className="text-center">{t('examReports.totalMarks')}</TableHead>
                          <TableHead className="text-center">{t('examReports.percentage')}</TableHead>
                          <TableHead className="text-center">{t('examReports.grade')}</TableHead>
                          <TableHead className="text-center">{t('examReports.result')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.students?.map((student: any, index: number) => (
                          <TableRow key={student.id} className={index < 3 ? 'bg-muted/30' : ''}>
                            <TableCell className="font-medium">
                              {student.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500 inline mr-1" />}
                              {student.rank === 2 && <Trophy className="h-4 w-4 text-gray-400 inline mr-1" />}
                              {student.rank === 3 && <Trophy className="h-4 w-4 text-orange-600 inline mr-1" />}
                              {student.rank}
                            </TableCell>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.roll_number}</TableCell>
                            <TableCell className="text-center font-medium">
                              {student.marks_obtained ?? '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {report.subject?.total_marks ?? '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {student.percentage !== null && student.percentage !== undefined ? (
                                <span className="font-medium">{student.percentage.toFixed(2)}%</span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {student.grade ? (
                                <Badge variant={student.result === 'pass' ? 'default' : 'destructive'}>
                                  {student.grade}
                                </Badge>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-center">
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
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Top Performers */}
              {report.students && report.students.length > 0 && (
                <Card className="print:shadow-none">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-yellow-500" />
                      {t('common.topPerformers')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      {report.students.slice(0, 3).map((student: any, index: number) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-3 p-4 border rounded-lg bg-muted/20"
                        >
                          <div className="flex-shrink-0">
                            {index === 0 && <Trophy className="h-8 w-8 text-yellow-500" />}
                            {index === 1 && <Trophy className="h-8 w-8 text-gray-400" />}
                            {index === 2 && <Trophy className="h-8 w-8 text-orange-600" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{student.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {student.marks_obtained}/{report.subject?.total_marks} ({student.percentage?.toFixed(2)}%)
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
            </>
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
      )}

      {(!selectedExamId || !selectedClassId || !selectedSubjectId) && (
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
