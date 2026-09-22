import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search, Upload } from 'lucide-react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useDownloadExamAbsencesTemplate,
  useExamAbsencePenaltySettings,
  useExamStudentAbsences,
  useImportExamAbsences,
  useUpsertExamStudentAbsences,
} from '@/hooks/useExamAbsencePenalty';
import { useExamClasses, useExams, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';

type SortField = 'admissionNo' | 'studentName' | 'fatherName' | 'absenceCount';
type SortDirection = 'asc' | 'desc';

function examClassLabel(examClass: {
  id: string;
  classAcademicYear?: { sectionName?: string | null; class?: { name?: string | null } | null } | null;
}): string {
  const className =
    examClass.classAcademicYear?.class?.name ||
    examClass.classAcademicYear?.sectionName ||
    examClass.id;
  const sectionName = examClass.classAcademicYear?.sectionName;
  if (sectionName && !String(className).includes(String(sectionName))) {
    return `${className} — ${sectionName}`;
  }
  return String(className);
}

function compareText(a: string | null | undefined, b: string | null | undefined): number {
  const left = (a ?? '').trim();
  const right = (b ?? '').trim();
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  if (/^\d+$/.test(left) && /^\d+$/.test(right)) {
    return Number(left) - Number(right);
  }
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

export function ExamAbsenceEntryPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const canUpdate = useHasPermission('exams.update');
  const canRead = useHasPermission('exams.read');

  const { data: exams = [] } = useExams(profile?.organization_id);
  const latestExam = useLatestExamFromCurrentYear(profile?.organization_id);

  const [examId, setExamId] = useState('');
  const [examClassId, setExamClassId] = useState<string>('all');
  const [draftCounts, setDraftCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('studentName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const { data: settings } = useExamAbsencePenaltySettings(examId || undefined);
  const { data: examClasses = [] } = useExamClasses(examId || undefined);
  const { data: rows = [], isLoading } = useExamStudentAbsences(
    examId || undefined,
    examClassId === 'all' ? undefined : examClassId,
  );
  const upsert = useUpsertExamStudentAbsences();
  const downloadTemplate = useDownloadExamAbsencesTemplate();
  const importAbsences = useImportExamAbsences();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!examId && latestExam?.id) {
      setExamId(latestExam.id);
    }
  }, [examId, latestExam?.id]);

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const row of rows) {
      next[row.studentAdmissionId] = row.absenceCount;
    }
    setDraftCounts(next);
  }, [rows]);

  const classOptions = useMemo(
    () =>
      examClasses.map((examClass) => ({
        id: examClass.id,
        label: examClassLabel(examClass),
      })),
    [examClasses],
  );

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField],
  );

  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const filtered = term
      ? rows.filter((row) => {
          const name = (row.studentName ?? '').toLowerCase();
          const admissionNo = (row.admissionNo ?? '').toLowerCase();
          return name.includes(term) || admissionNo.includes(term);
        })
      : [...rows];

    const direction = sortDirection === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      let primary = 0;
      if (sortField === 'admissionNo') {
        primary = compareText(a.admissionNo, b.admissionNo);
      } else if (sortField === 'studentName') {
        primary = compareText(a.studentName, b.studentName);
      } else if (sortField === 'fatherName') {
        primary = compareText(a.fatherName, b.fatherName);
      } else {
        const aCount = draftCounts[a.studentAdmissionId] ?? a.absenceCount ?? 0;
        const bCount = draftCounts[b.studentAdmissionId] ?? b.absenceCount ?? 0;
        primary = aCount - bCount;
      }
      if (primary !== 0) return primary * direction;
      return compareText(a.studentName, b.studentName);
    });

    return filtered;
  }, [rows, searchTerm, sortField, sortDirection, draftCounts]);

  const SortHeaderButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: ReactNode;
  }) => {
    const isActive = sortField === field;
    const direction = isActive ? sortDirection : null;

    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 -ms-2 px-2 font-medium"
        onClick={() => handleSort(field)}
        aria-label={t('common.sort') || 'Sort'}
      >
        {children}
        {direction === 'asc' ? (
          <ArrowUp className="ms-1 h-3 w-3" />
        ) : direction === 'desc' ? (
          <ArrowDown className="ms-1 h-3 w-3" />
        ) : (
          <ArrowUpDown className="ms-1 h-3 w-3 opacity-50" />
        )}
      </Button>
    );
  };

  if (!canRead) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSave = async () => {
    if (!examId || !canUpdate) return;
    await upsert.mutateAsync({
      examId,
      rows: Object.entries(draftCounts).map(([studentAdmissionId, absenceCount]) => ({
        studentAdmissionId,
        absenceCount: Math.max(0, Number(absenceCount) || 0),
      })),
    });
  };

  const handleDownloadTemplate = () => {
    if (!examId) return;
    downloadTemplate.mutate({
      examId,
      examClassId: examClassId === 'all' ? undefined : examClassId,
    });
  };

  const handleImportFile = (file: File | undefined) => {
    if (!examId || !canUpdate || !file) return;
    importAbsences.mutate({ examId, file });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('examAbsencePenalty.absencesTitle') || 'Exam Absences'}
        description={
          t('examAbsencePenalty.absencesDescription') ||
          "Enter absence totals for this exam's period. Used when absence mark penalty is enabled for the exam."
        }
      />

      {examId && settings && !settings.isEnabled && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {t('examAbsencePenalty.disabledHint') ||
              'Absence mark penalty is currently off for this exam. You can still enter absences; enable the feature under Settings → Absence Mark Penalty.'}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('examAbsencePenalty.filters') || 'Filters'}</CardTitle>
          <CardDescription>
            {t('examAbsencePenalty.filtersHint') ||
              'Choose an exam and optionally filter by exam class.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('examAbsencePenalty.selectExam') || 'Select exam'}</Label>
            <Select
              value={examId}
              onValueChange={(value) => {
                setExamId(value);
                setExamClassId('all');
                setSearchTerm('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('examAbsencePenalty.selectExam') || 'Select exam'} />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('examAbsencePenalty.examClass') || 'Exam class'}</Label>
            <Select value={examClassId} onValueChange={setExamClassId} disabled={!examId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
                {classOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('examAbsencePenalty.students') || 'Students'}</CardTitle>
            <CardDescription>
              {isLoading
                ? t('common.loading') || 'Loading...'
                : searchTerm.trim()
                  ? `${filteredRows.length} / ${rows.length} ${t('common.students') || 'students'}`
                  : `${rows.length} ${t('common.students') || 'students'}`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              disabled={!examId || downloadTemplate.isPending}
              onClick={handleDownloadTemplate}
              aria-label={t('examAbsencePenalty.downloadTemplate') || 'Download Excel template'}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ms-2">
                {t('examAbsencePenalty.downloadTemplate') || 'Download template'}
              </span>
            </Button>
            {canUpdate && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => handleImportFile(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  disabled={!examId || importAbsences.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={t('examAbsencePenalty.importExcel') || 'Import Excel'}
                >
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline ms-2">
                    {t('examAbsencePenalty.importExcel') || 'Import Excel'}
                  </span>
                </Button>
                <Button
                  onClick={() => void handleSave()}
                  disabled={!examId || upsert.isPending || rows.length === 0}
                >
                  {t('common.save') || 'Save'}
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('examAbsencePenalty.excelHint') ||
              'Download the Excel template, fill the Absences column, then import. Matching uses admission number (or the template ID column).'}
          </p>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={!examId}
              placeholder={
                t('examAbsencePenalty.searchStudentsPlaceholder') ||
                'Search by name or admission number...'
              }
              className="ps-9"
              aria-label={t('common.search') || 'Search'}
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortHeaderButton field="admissionNo">
                      {t('common.admissionNo') || 'Admission No'}
                    </SortHeaderButton>
                  </TableHead>
                  <TableHead>
                    <SortHeaderButton field="studentName">
                      {t('common.studentName') || 'Student'}
                    </SortHeaderButton>
                  </TableHead>
                  <TableHead>
                    <SortHeaderButton field="fatherName">
                      {t('common.fatherName') || 'Father'}
                    </SortHeaderButton>
                  </TableHead>
                  <TableHead className="w-40">
                    <SortHeaderButton field="absenceCount">
                      {t('examAbsencePenalty.absenceCount') || 'Absences'}
                    </SortHeaderButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.studentAdmissionId}>
                    <TableCell>{row.admissionNo || '—'}</TableCell>
                    <TableCell>{row.studentName || '—'}</TableCell>
                    <TableCell>{row.fatherName || '—'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        disabled={!canUpdate}
                        value={draftCounts[row.studentAdmissionId] ?? 0}
                        onChange={(e) =>
                          setDraftCounts((prev) => ({
                            ...prev,
                            [row.studentAdmissionId]: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {!examId
                        ? t('examAbsencePenalty.selectExam') || 'Select exam'
                        : searchTerm.trim()
                          ? t('examAbsencePenalty.noSearchResults') || 'No students match your search'
                          : t('common.noData') || 'No students found'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ExamAbsenceEntryPage;
