import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useExams } from '@/hooks/useExams';
import { useClasses } from '@/hooks/useClasses';
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
import { FileDown, Printer, Search, Award, TrendingUp, TrendingDown } from 'lucide-react';
import { useHasPermission } from '@/hooks/usePermissions';

export default function ConsolidatedMarkSheet() {
  const { t, locale } = useLanguage();
  const canViewReports = useHasPermission('exams.read');

  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const { data: exams, isLoading: examsLoading } = useExams();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: academicYears } = useAcademicYears();

  // Fetch consolidated report
  const { data: report, isLoading: reportLoading, isFetching } = useQuery({
    queryKey: ['consolidated-report', selectedExamId, selectedClassId],
    queryFn: async () => {
      if (!selectedExamId || !selectedClassId) return null;
      const response = await examsApi.consolidatedClassReport(selectedExamId, selectedClassId);
      return response.data;
    },
    enabled: Boolean(selectedExamId && selectedClassId),
  });

  const selectedExam = exams?.find(e => e.id === selectedExamId);
  const selectedClass = classes?.find(c => c.id === selectedClassId);
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
          </div>

          {selectedExamId && selectedClassId && (
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
      {selectedExamId && selectedClassId && (
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
                  <CardTitle className="text-2xl">{t('examReports.consolidatedReport')}</CardTitle>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{t('examReports.examName')}: <span className="font-semibold">{selectedExam?.name}</span></p>
                    <p>{t('examReports.className')}: <span className="font-semibold">{selectedClass?.name}</span></p>
                    {academicYear && (
                      <p>{t('examReports.academicYear')}: <span className="font-semibold">{academicYear.name}</span></p>
                    )}
                  </div>
                </CardHeader>

                {/* Statistics Summary */}
                {report.statistics && (
                  <CardContent className="py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('examReports.totalStudents')}</p>
                        <p className="text-2xl font-bold">{report.statistics.total_students}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('examReports.studentsPassed')}</p>
                        <p className="text-2xl font-bold text-green-600">{report.statistics.students_passed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('examReports.studentsFailed')}</p>
                        <p className="text-2xl font-bold text-red-600">{report.statistics.students_failed}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">{t('examReports.classAverage')}</p>
                        <p className="text-2xl font-bold">{report.statistics.class_average?.toFixed(2)}%</p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Student Results Table */}
              <Card className="print:shadow-none">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">{t('examReports.rank')}</TableHead>
                          <TableHead>{t('examReports.studentName')}</TableHead>
                          <TableHead>{t('examReports.rollNumber')}</TableHead>
                          {report.subjects?.map((subject: any) => (
                            <TableHead key={subject.id} className="text-center">
                              {subject.name}
                            </TableHead>
                          ))}
                          <TableHead className="text-center">{t('examReports.totalMarks')}</TableHead>
                          <TableHead className="text-center">{t('examReports.percentage')}</TableHead>
                          <TableHead className="text-center">{t('examReports.grade')}</TableHead>
                          <TableHead className="text-center">{t('examReports.result')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.students?.map((student: any, index: number) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.rank === 1 && <Award className="h-4 w-4 text-yellow-500 inline mr-1" />}
                              {student.rank}
                            </TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{student.roll_number}</TableCell>
                            {report.subjects?.map((subject: any) => {
                              const mark = student.marks?.find((m: any) => m.subject_id === subject.id);
                              return (
                                <TableCell key={subject.id} className="text-center">
                                  {mark ? (
                                    <div>
                                      <div>{mark.marks_obtained}/{subject.total_marks}</div>
                                      {mark.grade && (
                                        <div className="text-xs text-muted-foreground">{mark.grade}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="text-center font-medium">
                              {student.total_obtained}/{student.total_marks}
                            </TableCell>
                            <TableCell className="text-center">
                              {student.percentage?.toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-center">
                              {student.overall_grade && (
                                <Badge variant={student.result === 'pass' ? 'default' : 'destructive'}>
                                  {student.overall_grade}
                                </Badge>
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

              {/* Subject-wise Performance */}
              {report.subject_statistics && (
                <Card className="print:shadow-none">
                  <CardHeader>
                    <CardTitle>{t('examReports.subjectWisePerformance')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('examReports.subjectName')}</TableHead>
                          <TableHead className="text-center">{t('examReports.classAverage')}</TableHead>
                          <TableHead className="text-center">{t('examReports.highestMarks')}</TableHead>
                          <TableHead className="text-center">{t('examReports.lowestMarks')}</TableHead>
                          <TableHead className="text-center">{t('examReports.passPercentage')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.subject_statistics.map((stat: any) => (
                          <TableRow key={stat.subject_id}>
                            <TableCell className="font-medium">{stat.subject_name}</TableCell>
                            <TableCell className="text-center">{stat.average?.toFixed(2)}%</TableCell>
                            <TableCell className="text-center">{stat.highest}</TableCell>
                            <TableCell className="text-center">{stat.lowest}</TableCell>
                            <TableCell className="text-center">{stat.pass_percentage?.toFixed(2)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

      {!selectedExamId && !selectedClassId && (
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
