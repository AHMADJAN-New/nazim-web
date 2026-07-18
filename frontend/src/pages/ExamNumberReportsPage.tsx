import {
  ArrowLeft, FileDown, FileText, Hash, KeyRound,
  Search, List, Tag, AlertCircle, Eye, EyeOff,
  ArrowUpDown, ArrowUp, ArrowDown, Loader2,
} from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  MultiSectionReportExportButtons,
  type MultiSectionReportSection,
} from '@/components/reports/MultiSectionReportExportButtons';
import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRollNumberReport,
  useRollSlipsHtml,
  useSecretLabelsHtml,
} from '@/hooks/useExamNumbers';
import { useExam, useExamClasses, useExams, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { useServerReport } from '@/hooks/useServerReport';
import { showToast } from '@/lib/toast';
import type { RollNumberReportStudent } from '@/types/domain/exam';

/** Screen-only styles so A4/label pages center inside the preview iframe (print output unchanged). */
function withPrintPreviewStyles(html: string): string {
  const style = `<style id="nazim-print-preview">
@media screen {
  html, body {
    margin: 0 !important;
    padding: 12px !important;
    width: 100% !important;
    min-height: 100% !important;
    box-sizing: border-box;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-start !important;
    background: #f3f4f6 !important;
  }
  .page {
    margin-left: auto !important;
    margin-right: auto !important;
    margin-bottom: 16px !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    flex-shrink: 0;
  }
}
</style>`;
  if (html.includes('</head>')) {
    return html.replace('</head>', `${style}</head>`);
  }
  return `${style}${html}`;
}

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
  const [secretLabelLayout, setSecretLabelLayout] = useState<'single' | 'grid'>('single');
  const [showReportProgress, setShowReportProgress] = useState<boolean>(false);
  const {
    generateReport,
    isGenerating: isGeneratingPdf,
    progress: reportProgress,
    status: reportStatus,
    fileName: reportFileName,
    error: reportError,
    downloadReport,
    reset: resetReport,
  } = useServerReport();

  // Data hooks
  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: examClasses } = useExamClasses(examId);
  const { data: reportData, isLoading: reportLoading } = useRollNumberReport(examId, selectedClassId);
  // Lightweight sample only — full document is generated when the user clicks Print
  const { data: rollSlipsHtml, isLoading: rollSlipsLoading, error: rollSlipsError } = useRollSlipsHtml(
    examId,
    selectedClassId,
    { enabled: showPrintPreview && printType === 'roll-slips', preview: true }
  );
  const { data: secretLabelsHtml, isLoading: secretLabelsLoading, error: secretLabelsError } = useSecretLabelsHtml(
    examId,
    selectedClassId,
    undefined,
    {
      enabled: showPrintPreview && printType === 'secret-labels',
      preview: true,
      layout: secretLabelLayout,
    }
  );

  // Permissions
  const hasReadPermission = useHasPermission('exams.roll_numbers.read');
  const hasPrintPermission = useHasPermission('exams.numbers.print');
  const hasSecretNumberViewPermission = useHasPermission('exams.secret_numbers.read');

  // State for showing/hiding secret numbers
  const [showSecretNumbers, setShowSecretNumbers] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'rollNumber' | 'secretNumber'>('rollNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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
      withSecretNumber: students.filter(s => s.examSecretNumber).length,
      missingSecretNumber: students.filter(s => !s.examSecretNumber).length,
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
      if (student.examSecretNumber) classSummary.withSecretNumber++;
    });

    return Array.from(classMap.values());
  }, [reportData?.students]);

  const compareOptionalNumeric = useCallback((a: string | null | undefined, b: string | null | undefined) => {
    const aEmpty = a == null || a === '';
    const bEmpty = b == null || b === '';
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
      return Number(a) - Number(b);
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }, []);

  const handleSort = useCallback((field: 'rollNumber' | 'secretNumber') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Filtered + sorted students
  const filteredStudents = useMemo(() => {
    if (!reportData?.students) return [];

    const term = searchTerm.toLowerCase().trim();
    const filtered = term
      ? reportData.students.filter(
          (s) =>
            s.fullName.toLowerCase().includes(term) ||
            s.fatherName?.toLowerCase().includes(term) ||
            s.studentCode?.toLowerCase().includes(term) ||
            s.cardNumber?.toLowerCase().includes(term) ||
            s.examRollNumber?.toLowerCase().includes(term) ||
            s.examSecretNumber?.toLowerCase().includes(term) ||
            s.className.toLowerCase().includes(term)
        )
      : [...reportData.students];

    const direction = sortDirection === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const primary =
        sortField === 'rollNumber'
          ? compareOptionalNumeric(a.examRollNumber, b.examRollNumber)
          : compareOptionalNumeric(a.examSecretNumber, b.examSecretNumber);
      if (primary !== 0) return primary * direction;
      return a.fullName.localeCompare(b.fullName);
    });

    return filtered;
  }, [reportData?.students, searchTerm, sortField, sortDirection, compareOptionalNumeric]);

  const listExportColumns = useMemo(
    () => [
      { key: 'rollNumber', label: t('exams.rollNumbers.rollNumber') || 'Roll Number' },
      ...(hasSecretNumberViewPermission
        ? [{ key: 'secretNumber', label: t('exams.secretNumbers.secretNumber') || 'Secret Number' }]
        : []),
      { key: 'studentName', label: t('exams.studentName') || 'Name' },
      { key: 'fatherName', label: t('examReports.fatherName') || 'Father Name' },
      { key: 'cardNumber', label: t('students.cardNumber') || 'Card Number' },
      { key: 'className', label: t('search.class') || 'Class' },
      { key: 'section', label: t('events.section') || 'Section' },
    ],
    [hasSecretNumberViewPermission, t]
  );

  /** One Excel sheet / PDF section per class+section (page break between sections). */
  const buildListExportSections = useCallback(async (): Promise<MultiSectionReportSection[]> => {
    if (filteredStudents.length === 0) return [];

    const groups = new Map<string, RollNumberReportStudent[]>();
    for (const student of filteredStudents) {
      const className = student.className?.trim() || 'Unknown';
      const section = student.section?.trim() || '';
      const key = `${className}\u0000${section}`;
      const list = groups.get(key);
      if (list) {
        list.push(student);
      } else {
        groups.set(key, [student]);
      }
    }

    const sanitizeSheetName = (name: string): string => {
      const cleaned = name.replace(/[\\/*?:\[\]]/g, '-').replace(/\s+/g, ' ').trim();
      return (cleaned || 'Sheet').slice(0, 31);
    };

    const usedSheetNames = new Set<string>();
    const uniqueSheetName = (base: string): string => {
      let name = sanitizeSheetName(base);
      if (!usedSheetNames.has(name)) {
        usedSheetNames.add(name);
        return name;
      }
      let n = 2;
      while (usedSheetNames.has(`${name.slice(0, 28)}_${n}`)) n += 1;
      const withSuffix = `${name.slice(0, 28)}_${n}`;
      usedSheetNames.add(withSuffix);
      return withSuffix;
    };

    return Array.from(groups.entries()).map(([key, students]) => {
      const [className, section] = key.split('\u0000');
      const title = section ? `${className} - ${section}` : className;
      return {
        title,
        sheetName: uniqueSheetName(title),
        columns: listExportColumns,
        rows: students.map((student) => ({
          rollNumber: student.examRollNumber || '-',
          ...(hasSecretNumberViewPermission
            ? { secretNumber: student.examSecretNumber || '-' }
            : {}),
          studentName: student.fullName || '-',
          fatherName: student.fatherName || '-',
          cardNumber: student.cardNumber || '-',
          className: student.className || '-',
          section: student.section || '-',
        })),
      };
    });
  }, [filteredStudents, hasSecretNumberViewPermission, listExportColumns]);

  const SortHeaderButton = ({
    field,
    children,
  }: {
    field: 'rollNumber' | 'secretNumber';
    children: ReactNode;
  }) => {
    const isActive = sortField === field;
    const direction = isActive ? sortDirection : null;

    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-8 -ml-2 px-2 font-medium"
        onClick={() => handleSort(field)}
      >
        {children}
        {direction === 'asc' ? (
          <ArrowUp className="h-3 w-3 ml-1" />
        ) : direction === 'desc' ? (
          <ArrowDown className="h-3 w-3 ml-1" />
        ) : (
          <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
        )}
      </Button>
    );
  };

  // Handle print
  const handlePrint = useCallback((type: 'roll-slips' | 'secret-labels') => {
    if (type === 'secret-labels' && summary.withSecretNumber === 0) {
      showToast.warning(t('exams.numberReports.emptySecretLabelsPreview'));
      return;
    }
    if (type === 'roll-slips' && summary.withRollNumber === 0) {
      showToast.warning(t('exams.numberReports.emptyRollSlipsPreview'));
      return;
    }
    setPrintType(type);
    setShowPrintPreview(true);
  }, [summary.withRollNumber, summary.withSecretNumber, t]);

  // Queue ZIP pack on the backend (GenerateReportJob) — one PDF per class/section(/subject)
  const executeDownloadPdf = useCallback(async () => {
    if (!examId || isGeneratingPdf) return;

    const isRollSlips = printType === 'roll-slips';
    const title = isRollSlips
      ? (t('exams.numberReports.printRollSlips') || 'Roll Slips')
      : (t('exams.numberReports.printSecretLabels') || 'Secret Labels');

    setShowReportProgress(true);
    resetReport();

    try {
      await generateReport({
        reportKey: isRollSlips ? 'exam_roll_slips' : 'exam_secret_labels',
        reportType: 'pdf',
        title: exam ? `${title} - ${exam.name}` : title,
        brandingId: profile?.default_school_id ?? undefined,
        templateName: isRollSlips ? 'roll-slips' : 'secret-labels',
        async: true,
        columns: [],
        rows: [],
        parameters: {
          exam_id: examId,
          ...(selectedClassId ? { exam_class_id: selectedClassId } : {}),
          ...(!isRollSlips ? { layout: secretLabelLayout } : {}),
          school_id: profile?.default_school_id,
        },
        onComplete: () => {
          showToast.success('exams.numberReports.zipDownloaded');
          void downloadReport();
        },
        onError: (error) => {
          showToast.error(error || 'exams.numberReports.zipDownloadFailed');
        },
      });
    } catch (error: unknown) {
      if (import.meta.env.DEV) {
        console.error('[ExamNumberReportsPage] ZIP queue failed:', error);
      }
      showToast.error(
        error instanceof Error && error.message
          ? error.message
          : 'exams.numberReports.zipDownloadFailed'
      );
    }
  }, [
    downloadReport,
    exam,
    examId,
    generateReport,
    isGeneratingPdf,
    printType,
    profile?.default_school_id,
    resetReport,
    secretLabelLayout,
    selectedClassId,
    t,
  ]);

  const isRollSlipsPreview = printType === 'roll-slips';
  const previewLoading = isRollSlipsPreview ? rollSlipsLoading : secretLabelsLoading;
  const previewError = isRollSlipsPreview ? rollSlipsError : secretLabelsError;
  const previewHtml = isRollSlipsPreview ? rollSlipsHtml?.html : secretLabelsHtml?.html;
  const previewTotal = isRollSlipsPreview ? rollSlipsHtml?.totalSlips : secretLabelsHtml?.totalLabels;
  const previewSampleCount = isRollSlipsPreview ? rollSlipsHtml?.previewCount : secretLabelsHtml?.previewCount;
  const hasPreviewContent = !!previewHtml && (
    (previewTotal ?? 0) > 0
    || previewHtml.includes('data-secret-number')
    || previewHtml.includes('class="slip"')
  );
  const previewDoc = useMemo(
    () => (previewHtml ? withPrintPreviewStyles(previewHtml) : ''),
    [previewHtml]
  );

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
          <p className="text-muted-foreground">{t('events.noPermission') || 'You do not have permission to view this page'}</p>
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
                  {reportData?.students && reportData.students.length > 0 && (
                    <MultiSectionReportExportButtons
                      reportKey="exam_roll_numbers"
                      title={`${t('exams.numberReports.title') || 'Exam Number Report'} - ${exam?.name || ''}`}
                      templateType="exam_roll_numbers"
                      schoolId={profile?.default_school_id}
                      disabled={filteredStudents.length === 0}
                      buildSections={buildListExportSections}
                      buildFiltersSummary={() => {
                        const parts: string[] = [];
                        if (exam?.name) parts.push(`Exam: ${exam.name}`);
                        if (selectedClassId) {
                          const selectedClass = examClasses?.find((c) => c.id === selectedClassId);
                          if (selectedClass) {
                            parts.push(
                              `Class: ${selectedClass.classAcademicYear?.class?.name || ''}${
                                selectedClass.classAcademicYear?.sectionName
                                  ? ` - ${selectedClass.classAcademicYear.sectionName}`
                                  : ''
                              }`
                            );
                          }
                        } else {
                          parts.push('Class: All Classes');
                        }
                        parts.push(`Total Students: ${filteredStudents.length}`);
                        return parts.join(' | ');
                      }}
                    />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="w-64">
                  <Label className="sr-only">{t('search.class') || 'Class'}</Label>
                  <Select
                    value={selectedClassId || 'all'}
                    onValueChange={(v) => setSelectedClassId(v === 'all' ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('students.allClasses') || 'All Classes'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('students.allClasses') || 'All Classes'}</SelectItem>
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
                    placeholder={t('events.search') || 'Search by name, roll number, code...'}
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
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <SortHeaderButton field="rollNumber">
                            {t('exams.rollNumbers.rollNumber') || 'Roll Number'}
                          </SortHeaderButton>
                        </TableHead>
                        {hasSecretNumberViewPermission && (
                          <TableHead>
                            <div className="flex items-center gap-1">
                              <SortHeaderButton field="secretNumber">
                                {t('exams.secretNumbers.secretNumber') || 'Secret Number'}
                              </SortHeaderButton>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => setShowSecretNumbers(!showSecretNumbers)}
                                title={showSecretNumbers ? (t('events.hide') || 'Hide') : (t('events.show') || 'Show')}
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
                        <TableHead>{t('exams.studentName') || 'Name'}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('examReports.fatherName') || 'Father Name'}</TableHead>
                        <TableHead className="hidden md:table-cell">{t('students.cardNumber') || 'Card Number'}</TableHead>
                        <TableHead className="hidden lg:table-cell">{t('search.class') || 'Class'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow key="no-students">
                          <TableCell colSpan={hasSecretNumberViewPermission ? 6 : 5} className="text-center py-8 text-muted-foreground">
                            {t('exams.numberReports.noStudents') || 'No students found'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student: RollNumberReportStudent) => (
                          <TableRow key={student.examStudentId || `student-${student.fullName}-${student.cardNumber || student.studentCode}`}>
                            <TableCell className="font-mono">
                              {student.examRollNumber ? (
                                <Badge variant="default">{student.examRollNumber}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-amber-600 border-amber-300">
                                  {t('exams.rollNumbers.notAssigned') || 'Not assigned'}
                                </Badge>
                              )}
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
                            <TableCell>
                              <div className="flex flex-col md:hidden gap-1">
                                <span>{student.fullName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {student.fatherName || '-'}
                                  {student.cardNumber ? ` · ${student.cardNumber}` : ''}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {student.className}{student.section && ` - ${student.section}`}
                                </span>
                              </div>
                              <div className="hidden md:block">{student.fullName}</div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{student.fatherName || '-'}</TableCell>
                            <TableCell className="hidden md:table-cell font-mono text-sm">{student.cardNumber || '-'}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {student.className}
                              {student.section && <span className="text-muted-foreground"> - {student.section}</span>}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  </div>
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
                            <TableHead>{t('search.class') || 'Class'}</TableHead>
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
                                    {t('events.yes') || 'Yes'}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                                    {t('events.no') || 'No'}
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
            <DialogContent className="flex h-[min(90vh,920px)] w-[min(96vw,1152px)] max-w-[min(96vw,1152px)] flex-col gap-4 overflow-hidden p-4 sm:p-6">
              <DialogHeader className="shrink-0">
                <DialogTitle>
                  {printType === 'roll-slips'
                    ? (t('exams.numberReports.rollSlipsPreview') || 'Roll Slips Preview')
                    : (t('exams.numberReports.secretLabelsPreview') || 'Secret Labels Preview')}
                </DialogTitle>
                <DialogDescription>
                  {previewTotal != null && previewSampleCount != null && previewSampleCount < previewTotal
                    ? (t('exams.numberReports.printPreviewSampleDescription', {
                        previewCount: previewSampleCount,
                        total: previewTotal,
                      }) || `Showing a sample of ${previewSampleCount} of ${previewTotal}. Click Print to generate the full document.`)
                    : printType === 'secret-labels' && previewTotal != null
                      ? (t('exams.numberReports.secretLabelsPreviewDescription', { count: previewTotal })
                        || `${previewTotal} labels (one per subject for each student with a secret number)`)
                      : (t('exams.numberReports.printPreviewDescription') || 'Preview before printing')}
                </DialogDescription>
              </DialogHeader>

              {printType === 'secret-labels' && (
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">
                    {t('exams.numberReports.secretLabelLayout') || 'Label layout'}
                  </Label>
                  <Select
                    value={secretLabelLayout}
                    onValueChange={(v) => setSecretLabelLayout(v === 'grid' ? 'grid' : 'single')}
                    disabled={isGeneratingPdf}
                  >
                    <SelectTrigger className="w-full sm:w-[320px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">
                        {t('exams.numberReports.secretLabelLayoutSingle') || 'Label printer — 1″ × 2″ (one label per page)'}
                      </SelectItem>
                      <SelectItem value="grid">
                        {t('exams.numberReports.secretLabelLayoutGrid') || 'A4 sheet — 35 labels per page'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border bg-muted/30">
                {previewLoading ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center">
                    <Skeleton className="h-8 w-32" />
                  </div>
                ) : previewError ? (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-8 text-center">
                    <AlertCircle className="mb-4 h-12 w-12 text-destructive" />
                    <h3 className="mb-2 text-lg font-semibold">
                      {t('exams.numberReports.errorLoadingPreview') || 'Error Loading Preview'}
                    </h3>
                    <p className="mb-4 text-muted-foreground">
                      {t('exams.numberReports.errorLoadingPreviewDescription') || 'Failed to load the print preview. Please try again or contact support if the issue persists.'}
                    </p>
                    <Button variant="outline" onClick={() => {
                      setShowPrintPreview(false);
                      setTimeout(() => setShowPrintPreview(true), 100);
                    }}>
                      {t('events.retry') || 'Retry'}
                    </Button>
                  </div>
                ) : !hasPreviewContent ? (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
                    <KeyRound className="h-12 w-12 text-muted-foreground" />
                    <p className="max-w-md text-muted-foreground">
                      {isRollSlipsPreview
                        ? (t('exams.numberReports.emptyRollSlipsPreview') || 'No students have roll numbers assigned. Assign roll numbers first.')
                        : (t('exams.numberReports.emptySecretLabelsPreview') || 'No students have secret numbers assigned. Assign secret numbers first.')}
                    </p>
                    {!isRollSlipsPreview && examId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPrintPreview(false);
                          navigate(`/exams/${examId}/secret-numbers`);
                        }}
                      >
                        <KeyRound className="mr-2 h-4 w-4" />
                        {t('exams.numberReports.goToAssignSecretNumbers') || 'Assign Secret Numbers'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <iframe
                    title={isRollSlipsPreview ? 'Roll slips preview' : 'Secret labels preview'}
                    srcDoc={previewDoc}
                    className="absolute inset-0 h-full w-full border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                )}
              </div>

              <DialogFooter className="shrink-0">
                <Button variant="outline" onClick={() => setShowPrintPreview(false)} disabled={isGeneratingPdf}>
                  {t('events.cancel') || 'Cancel'}
                </Button>
                <Button
                  onClick={() => void executeDownloadPdf()}
                  disabled={previewLoading || !hasPreviewContent || isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4 mr-2" />
                  )}
                  {isGeneratingPdf
                    ? (t('exams.numberReports.generatingZipShort') || 'Generating ZIP…')
                    : (t('exams.numberReports.downloadZip') || 'Download ZIP')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ReportProgressDialog
            open={showReportProgress}
            onOpenChange={setShowReportProgress}
            status={reportStatus}
            progress={reportProgress}
            fileName={reportFileName}
            error={reportError}
            onDownload={() => {
              void downloadReport();
            }}
            onClose={resetReport}
          />
        </>
      )}
    </div>
  );
}

export default ExamNumberReportsPage;
