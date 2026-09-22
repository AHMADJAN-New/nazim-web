import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

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
  useExamAbsencePenaltySettings,
  useExamStudentAbsences,
  useUpsertExamStudentAbsences,
} from '@/hooks/useExamAbsencePenalty';
import { useExamClasses, useExams, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';

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

  const { data: settings } = useExamAbsencePenaltySettings(examId || undefined);
  const { data: examClasses = [] } = useExamClasses(examId || undefined);
  const { data: rows = [], isLoading } = useExamStudentAbsences(
    examId || undefined,
    examClassId === 'all' ? undefined : examClassId,
  );
  const upsert = useUpsertExamStudentAbsences();

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

  return (
    <div className="container mx-auto max-w-6xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('examAbsencePenalty.absencesTitle') || 'Exam Absences'}
        description={
          t('examAbsencePenalty.absencesDescription') ||
          'Enter absence totals for this exam\'s period. Used when absence mark penalty is enabled for the exam.'
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
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('examAbsencePenalty.students') || 'Students'}</CardTitle>
            <CardDescription>
              {isLoading
                ? t('common.loading') || 'Loading...'
                : `${rows.length} ${t('common.students') || 'students'}`}
            </CardDescription>
          </div>
          {canUpdate && (
            <Button
              onClick={() => void handleSave()}
              disabled={!examId || upsert.isPending || rows.length === 0}
            >
              {t('common.save') || 'Save'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.admissionNo') || 'Admission No'}</TableHead>
                  <TableHead>{t('common.studentName') || 'Student'}</TableHead>
                  <TableHead>{t('common.fatherName') || 'Father'}</TableHead>
                  <TableHead className="w-40">
                    {t('examAbsencePenalty.absenceCount') || 'Absences'}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
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
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      {!examId
                        ? t('examAbsencePenalty.selectExam') || 'Select exam'
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
