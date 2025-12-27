import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useExam, useExamClasses, useExams, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useProfile } from '@/hooks/useProfiles';
import {
  useRollNumberReport,
  useRollSlipsHtml,
  useSecretLabelsHtml,
} from '@/hooks/useExamNumbers';
import { useHasPermission } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Printer, Download, FileText, Hash, KeyRound,
  Search, List, Tag, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import type { RollNumberReportStudent } from '@/types/domain/exam';

export function ExamNumberReportsPage() {
  const { t } = useLanguage();
  const { examId: examIdFromParams } = useParams<{ examId?: string }>();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const organizationId = profile?.organization_id;

  // State for exam selection (when accessed individually)
  const [selectedExamId, setSelectedExamId] = useState<string | undefined>(undefined);

  // Determine which exam ID to use
  const examId = examIdFromParams || selectedExamId || undefined;

  // Fetch all exams for selector (only when accessed individually)
  const { data: allExams, isLoading: examsLoading } = useExams(organizationId);
  const latestExam = useLatestExamFromCurrentYear(organizationId);

  // Set exam from URL params (when accessed from exams page)
  useEffect(() => {
    if (examIdFromParams) {
      // Clear selectedExamId when URL has examId (use URL examId instead)
      setSelectedExamId(undefined);
    }
  }, [examIdFromParams]);

  // Auto-select latest exam from current academic year (only when accessed individually, no URL examId)
  useEffect(() => {
    if (!examIdFromParams && !selectedExamId) {
      if (latestExam) {
        setSelectedExamId(latestExam.id);
      } else if (allExams && allExams.length > 0) {
        // Fallback to first exam if no current year exam
        setSelectedExamId(allExams[0].id);
      }
    }
  }, [allExams, latestExam, selectedExamId, examIdFromParams]);

  // State
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('roll-list');
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  const [printType, setPrintType] = useState<'roll-slips' | 'secret-labels'>('roll-slips');
  const printFrameRef = useRef<HTMLIFrameElement>(null);

  // Data hooks
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: examClasses } = useExamClasses(examId);
  const { data: reportData, isLoading: reportLoading } = useRollNumberReport(examId, selectedClassId);
  const { data: rollSlipsHtml, isLoading: rollSlipsLoading, error: rollSlipsError } = useRollSlipsHtml(
    examId,
    selectedClassId,
    printType === 'roll-slips' && showPrintPreview
  );
  const { data: secretLabelsHtml, isLoading: secretLabelsLoading, error: secretLabelsError } = useSecretLabelsHtml(
    examId,
    selectedClassId,
    printType === 'secret-labels' && showPrintPreview
  );

  // Permissions
  const hasReadPermission = useHasPermission('exams.roll_numbers.read');
  const hasPrintPermission = useHasPermission('exams.numbers.print');
  const hasSecretNumberViewPermission = useHasPermission('exams.secret_numbers.read');

  // State for showing/hiding secret numbers
  const [showSecretNumbers, setShowSecretNumbers] = useState<boolean>(false);

  // Calculate summary from students data
  const summary = useMemo(() => {
    if (!reportData?.students || !Array.isArray(reportData.students)) {
      return {
        total: 0,
        withRollNumber: 0,
        missingRollNumber: 0,
        withSecretNumber: 0,
        missingSecretNumber: 0,
      };
    }

    const students = reportData.students;
    return {
      total: students.length,
      withRollNumber: students.filter(s => s.examRollNumber).length,
      missingRollNumber: students.filter(s => !s.examRollNumber).length,
      // Note: examSecretNumber may not be available in roll number report
      withSecretNumber: students.filter(s => (s as any).examSecretNumber).length,
      missingSecretNumber: students.filter(s => !(s as any).examSecretNumber).length,
    };
  }, [reportData?.students]);

  // Calculate class summaries
  const classSummaries = useMemo(() => {
    if (!reportData?.students || !Array.isArray(reportData.students)) return [];

    const classMap = new Map<string, {
      className: string;
      section: string | null;
      total: number;
      withRollNumber: number;
      withSecretNumber: number;
    }>();

    reportData.students.forEach(student => {
      // Use className + section as key to separate sections
      const key = `${student.className || 'Unknown'}_${student.section || 'no-section'}`;
      if (!classMap.has(key)) {
        classMap.set(key, {
          className: student.className || 'Unknown',
          section: student.section || null,
          total: 0,
          withRollNumber: 0,
          withSecretNumber: 0,
        });
      }
      const classSummary = classMap.get(key)!;
      classSummary.total++;
      if (student.examRollNumber) classSummary.withRollNumber++;
      // Note: examSecretNumber may not be available in roll number report
      // This will be 0 if not available, which is fine
      if ((student as any).examSecretNumber) classSummary.withSecretNumber++;
    });

    return Array.from(classMap.values());
  }, [reportData?.students]);

  // Filtered students based on search
  const filteredStudents = useMemo(() => {
    if (!reportData?.students) return [];
    if (!searchTerm) return reportData.students;

    const term = searchTerm.toLowerCase();
    return reportData.students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(term) ||
        s.studentCode?.toLowerCase().includes(term) ||
        s.examRollNumber?.toLowerCase().includes(term) ||
        s.className.toLowerCase().includes(term)
    );
  }, [reportData?.students, searchTerm]);

  // Handle print
  const handlePrint = useCallback((type: 'roll-slips' | 'secret-labels') => {
    setPrintType(type);
    setShowPrintPreview(true);
  }, []);

  // Execute print using iframe
  const executePrint = useCallback(() => {
    const iframe = printFrameRef.current;
    if (!iframe) return;

    const htmlContent = printType === 'roll-slips' ? rollSlipsHtml?.html : secretLabelsHtml?.html;
    if (!htmlContent) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Wait for content to load, then print
    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 500);
  }, [printType, rollSlipsHtml, secretLabelsHtml]);

  // Export as CSV
  const handleExportCsv = useCallback(() => {
    if (!reportData?.students) return;

    const headers = ['Roll Number', 'Student Code', 'Name', 'Father Name', 'Class', 'Section', 'Secret Number'];
    const rows = reportData.students.map((s) => [
      s.examRollNumber || '',
      s.studentCode || '',
      s.fullName,
      s.fatherName || '',
      s.className,
      s.section || '',
      s.examSecretNumber || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roll-numbers-${exam?.name || 'exam'}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [reportData, exam]);

  const isLoading = (examLoading || reportLoading || examsLoading) && !exam;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!hasReadPermission) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('common.noPermission') || 'You do not have permission to view this page'}</p>
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
        <Button variant="ghost" size="icon" onClick={() => navigate(`/exams`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t('exams.numberReports.title') || 'Exam Number Reports'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {exam ? exam.name + ' • ' : ''}{t('exams.numberReports.description') || 'Print roll slips, secret labels, and export lists'}
          </p>
        </div>
        {exam && (
          <Badge variant={exam.status === 'in_progress' ? 'default' : 'secondary'}>
            {exam.status}
          </Badge>
        )}
      </div>

      {/* Exam Selector - only show when accessed directly (without examId in URL) */}
      {!examIdFromParams && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('exams.selectExam') || 'Select Exam'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full max-w-md">
              <Select
                value={selectedExamId || ''}
                onValueChange={(v) => setSelectedExamId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.selectExamPlaceholder') || 'Select an exam...'} />
                </SelectTrigger>
                <SelectContent>
                  {allExams?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} {e.academicYear?.name ? `(${e.academicYear.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show content only when exam is selected */}
      {!exam && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('exams.selectExamFirst') || 'Please select an exam to continue'}</p>
        </div>
      )}

      {exam && (
        <>
          {/* Filter & Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{t('exams.numberReports.filter') || 'Filter & Export'}</CardTitle>
                  <CardDescription>
                    {t('exams.numberReports.filterDescription') || 'Select a class or view all students'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {hasPrintPermission && (
                    <>
                      <Button variant="outline" onClick={() => handlePrint('roll-slips')}>
                        <Hash className="h-4 w-4 mr-2" />
                        {t('exams.numberReports.printRollSlips') || 'Print Roll Slips'}
                      </Button>
                      <Button variant="outline" onClick={() => handlePrint('secret-labels')}>
                        <Tag className="h-4 w-4 mr-2" />
                        {t('exams.numberReports.printSecretLabels') || 'Print Secret Labels'}
                      </Button>
                    </>
                  )}
                  <Button variant="outline" onClick={handleExportCsv}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('exams.numberReports.exportCsv') || 'Export CSV'}
                  </Button>
                  {reportData?.students && reportData.students.length > 0 && (
                    <ReportExportButtons
                      data={filteredStudents}
                      columns={[
                        { key: 'rollNumber', label: t('exams.rollNumbers.rollNumber') || 'Roll Number' },
                        { key: 'studentCode', label: t('exams.studentCode') || 'Student Code' },
                        { key: 'studentName', label: t('exams.studentName') || 'Name' },
                        { key: 'fatherName', label: t('exams.fatherName') || 'Father Name' },
                        { key: 'className', label: t('exams.class') || 'Class' },
                        { key: 'section', label: t('common.section') || 'Section' },
                        ...(hasSecretNumberViewPermission ? [{ key: 'secretNumber', label: t('exams.secretNumbers.secretNumber') || 'Secret Number' }] : []),
                      ]}
                      reportKey="exam_roll_numbers"
                      title={`${t('exams.numberReports.title') || 'Exam Number Report'} - ${exam?.name || ''}`}
                      transformData={(data) => data.map((student: RollNumberReportStudent) => ({
                        rollNumber: student.examRollNumber || '-',
                        studentCode: student.studentCode || '-',
                        studentName: student.fullName || '-',
                        fatherName: student.fatherName || '-',
                        className: student.className || '-',
                        section: student.section || '-',
                        ...(hasSecretNumberViewPermission ? { secretNumber: student.examSecretNumber || '-' } : {}),
                      }))}
                      buildFiltersSummary={() => {
                        const parts: string[] = [];
                        if (exam?.name) parts.push(`Exam: ${exam.name}`);
                        if (selectedClassId) {
                          const selectedClass = examClasses?.find((c) => c.id === selectedClassId);
                          if (selectedClass) {
                            parts.push(`Class: ${selectedClass.classAcademicYear?.class?.name || ''}${selectedClass.classAcademicYear?.sectionName ? ` - ${selectedClass.classAcademicYear.sectionName}` : ''}`);
                          }
                        } else {
                          parts.push('Class: All Classes');
                        }
                        parts.push(`Total Students: ${filteredStudents.length}`);
                        return parts.join(' | ');
                      }}
                      schoolId={profile?.default_school_id}
                      templateType="exam_roll_numbers"
                      disabled={!reportData?.students || reportData.students.length === 0}
                    />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-64">
                  <Label className="sr-only">{t('exams.class') || 'Class'}</Label>
                  <Select
                    value={selectedClassId || 'all'}
                    onValueChange={(v) => setSelectedClassId(v === 'all' ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('exams.allClasses') || 'All Classes'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('exams.allClasses') || 'All Classes'}</SelectItem>
                      {examClasses?.map((ec) => (
                        <SelectItem key={ec.id} value={ec.id}>
                          {ec.classAcademicYear?.class?.name || 'Unknown'}
                          {ec.classAcademicYear?.sectionName && ` - ${ec.classAcademicYear.sectionName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('common.search') || 'Search by name, roll number, code...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {reportData && (
                  <div className="text-sm text-muted-foreground">
                    {summary.total} {t('exams.numberReports.students') || 'students'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs for different views */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="roll-list">
                <List className="h-4 w-4 mr-2" />
                {t('exams.numberReports.rollNumberList') || 'Roll Number List'}
              </TabsTrigger>
              <TabsTrigger value="summary">
                <FileText className="h-4 w-4 mr-2" />
                {t('exams.numberReports.summary') || 'Summary'}
              </TabsTrigger>
            </TabsList>

            {/* Roll Number List */}
            <TabsContent value="roll-list">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('exams.rollNumbers.rollNumber') || 'Roll Number'}</TableHead>
                        <TableHead>{t('exams.studentCode') || 'Student Code'}</TableHead>
                        <TableHead>{t('exams.studentName') || 'Name'}</TableHead>
                        <TableHead>{t('exams.fatherName') || 'Father Name'}</TableHead>
                        <TableHead>{t('exams.class') || 'Class'}</TableHead>
                        {hasSecretNumberViewPermission && (
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <span>{t('exams.secretNumbers.secretNumber') || 'Secret Number'}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setShowSecretNumbers(!showSecretNumbers)}
                                title={showSecretNumbers ? (t('common.hide') || 'Hide') : (t('common.show') || 'Show')}
                              >
                                {showSecretNumbers ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow key="no-students">
                          <TableCell colSpan={hasSecretNumberViewPermission ? 7 : 6} className="text-center py-8 text-muted-foreground">
                            {t('exams.numberReports.noStudents') || 'No students found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student: RollNumberReportStudent) => (
                          <TableRow key={student.examStudentId || `student-${student.fullName}-${student.studentCode}`}>
                            <TableCell className="font-mono">
                              {student.examRollNumber ? (
                                <Badge variant="default">{student.examRollNumber}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  {t('exams.rollNumbers.notAssigned') || 'Not assigned'}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{student.studentCode || '-'}</TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>{student.fatherName || '-'}</TableCell>
                            <TableCell>
                              {student.className}
                              {student.section && <span className="text-muted-foreground"> - {student.section}</span>}
                            </TableCell>
                            {hasSecretNumberViewPermission && (
                              <TableCell className="font-mono">
                                {showSecretNumbers && student.examSecretNumber ? (
                                  <Badge variant="secondary">{student.examSecretNumber}</Badge>
                                ) : showSecretNumbers && !student.examSecretNumber ? (
                                  <span className="text-muted-foreground">-</span>
                                ) : (
                                  <span className="text-muted-foreground">••••••</span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Roll Number Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Hash className="h-5 w-5" />
                      {t('exams.numberReports.rollNumberSummary') || 'Roll Number Summary'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportData && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('exams.numberReports.totalStudents') || 'Total Students'}</span>
                          <span className="font-bold text-xl">{summary.total}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('exams.numberReports.withRollNumber') || 'With Roll Number'}</span>
                          <span className="font-bold text-xl text-green-600">{summary.withRollNumber}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('exams.numberReports.withoutRollNumber') || 'Without Roll Number'}</span>
                          <span className="font-bold text-xl text-amber-600">{summary.missingRollNumber}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{t('exams.numberReports.progress') || 'Progress'}</span>
                            <span className="font-bold text-xl">
                              {summary.total > 0
                                ? Math.round((summary.withRollNumber / summary.total) * 100)
                                : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Secret Number Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <KeyRound className="h-5 w-5" />
                      {t('exams.numberReports.secretNumberSummary') || 'Secret Number Summary'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportData && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('exams.numberReports.totalStudents') || 'Total Students'}</span>
                          <span className="font-bold text-xl">{summary.total}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('exams.numberReports.withSecretNumber') || 'With Secret Number'}</span>
                          <span className="font-bold text-xl text-green-600">{summary.withSecretNumber}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">{t('exams.numberReports.withoutSecretNumber') || 'Without Secret Number'}</span>
                          <span className="font-bold text-xl text-amber-600">{summary.missingSecretNumber}</span>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">{t('exams.numberReports.progress') || 'Progress'}</span>
                            <span className="font-bold text-xl">
                              {summary.total > 0
                                ? Math.round((summary.withSecretNumber / summary.total) * 100)
                                : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Class Breakdown */}
                {classSummaries && classSummaries.length > 0 && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">{t('exams.numberReports.classBreakdown') || 'Class Breakdown'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('exams.class') || 'Class'}</TableHead>
                            <TableHead className="text-center">{t('exams.numberReports.totalStudents') || 'Total'}</TableHead>
                            <TableHead className="text-center">{t('exams.numberReports.withRollNumber') || 'Roll #'}</TableHead>
                            <TableHead className="text-center">{t('exams.numberReports.withSecretNumber') || 'Secret #'}</TableHead>
                            <TableHead className="text-center">{t('exams.numberReports.complete') || 'Complete'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {classSummaries.map((cs) => (
                            <TableRow key={`${cs.className}-${cs.section || 'no-section'}`}>
                              <TableCell>
                                {cs.className}
                                {cs.section && <span className="text-muted-foreground"> - {cs.section}</span>}
                              </TableCell>
                              <TableCell className="text-center">{cs.total}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={cs.withRollNumber === cs.total ? 'default' : 'secondary'}>
                                  {cs.withRollNumber}/{cs.total}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={cs.withSecretNumber === cs.total ? 'default' : 'secondary'}>
                                  {cs.withSecretNumber}/{cs.total}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {cs.withRollNumber === cs.total && cs.withSecretNumber === cs.total ? (
                                  <Badge variant="default" className="bg-green-600">
                                    {t('common.yes') || 'Yes'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                                    {t('common.no') || 'No'}
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
              </div>
            </TabsContent>
          </Tabs>

          {/* Print Preview Dialog */}
          <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {printType === 'roll-slips'
                    ? (t('exams.numberReports.rollSlipsPreview') || 'Roll Slips Preview')
                    : (t('exams.numberReports.secretLabelsPreview') || 'Secret Labels Preview')}
                </DialogTitle>
                <DialogDescription>
                  {t('exams.numberReports.printPreviewDescription') || 'Preview before printing'}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-auto border rounded-md bg-gray-50 min-h-[400px]">
                {(rollSlipsLoading || secretLabelsLoading) ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-8 w-32" />
                  </div>
                ) : (printType === 'roll-slips' && rollSlipsError) || (printType === 'secret-labels' && secretLabelsError) ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {t('exams.numberReports.errorLoadingPreview') || 'Error Loading Preview'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t('exams.numberReports.errorLoadingPreviewDescription') || 'Failed to load the print preview. Please try again or contact support if the issue persists.'}
                    </p>
                    <Button variant="outline" onClick={() => {
                      // Retry by closing and reopening
                      setShowPrintPreview(false);
                      setTimeout(() => setShowPrintPreview(true), 100);
                    }}>
                      {t('common.retry') || 'Retry'}
                    </Button>
                  </div>
                ) : (
                  <div
                    className="p-4"
                    dir="rtl"
                    style={{ direction: 'rtl' }}
                    dangerouslySetInnerHTML={{
                      __html: printType === 'roll-slips'
                        ? (rollSlipsHtml?.html || '<p class="text-center text-muted-foreground p-8">No content available. Please ensure roll numbers are assigned.</p>')
                        : (secretLabelsHtml?.html || '<p class="text-center text-muted-foreground p-8">No content available. Please ensure secret numbers are assigned.</p>'),
                    }}
                  />
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPrintPreview(false)}>
                  {t('common.cancel') || 'Cancel'}
                </Button>
                <Button onClick={executePrint} disabled={rollSlipsLoading || secretLabelsLoading}>
                  <Printer className="h-4 w-4 mr-2" />
                  {t('common.print') || 'Print'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Hidden iframe for printing */}
      <iframe
        ref={printFrameRef}
        style={{ position: 'absolute', left: '-9999px', width: '0', height: '0' }}
        title="Print Frame"
      />
    </div>
  );
}

export default ExamNumberReportsPage;
