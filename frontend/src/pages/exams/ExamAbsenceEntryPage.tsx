import { useEffect, useMemo, useState } from 'react';

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
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import {
  useExamAbsencePenaltySettings,
  useStudentAcademicYearAbsences,
  useUpsertStudentAcademicYearAbsences,
} from '@/hooks/useExamAbsencePenalty';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { Navigate } from 'react-router-dom';

export function ExamAbsenceEntryPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const canUpdate = useHasPermission('exams.update');
  const canRead = useHasPermission('exams.read');
  const { data: settings } = useExamAbsencePenaltySettings();
  const { data: currentYear } = useCurrentAcademicYear(profile?.organization_id);
  const { data: academicYears = [] } = useAcademicYears(profile?.organization_id);

  const [academicYearId, setAcademicYearId] = useState('');
  const [classAcademicYearId, setClassAcademicYearId] = useState<string>('all');
  const [draftCounts, setDraftCounts] = useState<Record<string, number>>({});

  const { data: classYears = [] } = useClassAcademicYears(
    academicYearId || undefined,
    profile?.organization_id,
  );

  const { data: rows = [], isLoading } = useStudentAcademicYearAbsences(
    academicYearId || undefined,
    classAcademicYearId === 'all' ? undefined : classAcademicYearId,
  );

  const upsert = useUpsertStudentAcademicYearAbsences();

  useEffect(() => {
    if (currentYear?.id && !academicYearId) {
      setAcademicYearId(currentYear.id);
    }
  }, [currentYear?.id, academicYearId]);

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const row of rows) {
      next[row.studentAdmissionId] = row.absenceCount;
    }
    setDraftCounts(next);
  }, [rows]);

  const classOptions = useMemo(
    () =>
      classYears.map((cay) => ({
        id: cay.id,
        label: [cay.class?.name, cay.sectionName].filter(Boolean).join(' - ') || cay.id,
      })),
    [classYears],
  );

  if (!canRead) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSave = async () => {
    if (!academicYearId) return;
    await upsert.mutateAsync({
      academicYearId,
      rows: Object.entries(draftCounts).map(([studentAdmissionId, absenceCount]) => ({
        studentAdmissionId,
        absenceCount: Math.max(0, Number(absenceCount) || 0),
      })),
    });
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('examAbsencePenalty.absencesTitle') || 'Yearly Absences'}
        description={
          t('examAbsencePenalty.absencesDescription') ||
          'Enter total absences from paper registers for the academic year. Used only when absence mark penalty is enabled.'
        }
      />

      {!settings?.isEnabled && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {t('examAbsencePenalty.disabledHint') ||
              'Absence mark penalty is currently off for this school. Enable it under Settings → Absence Mark Penalty.'}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('examAbsencePenalty.filters') || 'Filters'}</CardTitle>
          <CardDescription>
            {t('examAbsencePenalty.filtersHint') || 'Choose academic year and optionally a class.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('common.academicYear') || 'Academic Year'}</Label>
            <Select value={academicYearId} onValueChange={(value) => {
              setAcademicYearId(value);
              setClassAcademicYearId('all');
            }}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.select') || 'Select'} />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year: { id: string; name: string }) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('common.class') || 'Class'}</Label>
            <Select value={classAcademicYearId} onValueChange={setClassAcademicYearId}>
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
            <Button onClick={handleSave} disabled={!academicYearId || upsert.isPending || rows.length === 0}>
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
                  <TableHead className="w-40">{t('examAbsencePenalty.absenceCount') || 'Absences'}</TableHead>
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
                      {t('common.noData') || 'No students found'}
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
