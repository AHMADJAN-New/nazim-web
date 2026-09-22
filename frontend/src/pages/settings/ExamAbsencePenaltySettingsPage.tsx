import { Copy, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  type AbsencePenaltyBandForm,
  useCopyExamAbsencePenaltySettings,
  useExamAbsencePenaltySettings,
  useUpdateExamAbsencePenaltySettings,
} from '@/hooks/useExamAbsencePenalty';
import { useExamClasses, useExams, useLatestExamFromCurrentYear } from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { showToast } from '@/lib/toast';
import { Navigate } from 'react-router-dom';

function emptyBand(): AbsencePenaltyBandForm {
  return { minAbsences: 0, maxAbsences: 4, marksPerAbsence: 0 };
}

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

function validateBands(bands: AbsencePenaltyBandForm[]): string | null {
  const sorted = [...bands].sort((a, b) => a.minAbsences - b.minAbsences);
  let previousMax: number | null = null;
  let openEndedSeen = false;

  for (const band of sorted) {
    if (band.minAbsences < 0 || band.marksPerAbsence < 0) {
      return 'Absence counts and marks per absence must be zero or greater.';
    }
    if (band.maxAbsences !== null && band.maxAbsences < band.minAbsences) {
      return 'Each band max must be greater than or equal to its min.';
    }
    if (openEndedSeen) {
      return 'Only the last band may leave max empty (open-ended).';
    }
    if (band.maxAbsences === null) {
      openEndedSeen = true;
    }
    if (previousMax !== null && band.minAbsences <= previousMax) {
      return 'Absence bands must not overlap.';
    }
    previousMax = band.maxAbsences;
  }

  return null;
}

export function ExamAbsencePenaltySettingsPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const canUpdate = useHasPermission('exams.update');
  const canRead = useHasPermission('exams.read');

  const { data: exams = [], isLoading: examsLoading } = useExams(profile?.organization_id);
  const latestExam = useLatestExamFromCurrentYear(profile?.organization_id);

  const [examId, setExamId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [examClassIds, setExamClassIds] = useState<string[]>([]);
  const [bands, setBands] = useState<AbsencePenaltyBandForm[]>([emptyBand()]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [sourceExamId, setSourceExamId] = useState('');
  const [copyExamClasses, setCopyExamClasses] = useState(true);

  const { data: settings, isLoading: settingsLoading } = useExamAbsencePenaltySettings(
    examId || undefined,
  );
  const { data: examClasses = [], isLoading: classesLoading } = useExamClasses(examId || undefined);
  const updateSettings = useUpdateExamAbsencePenaltySettings();
  const copySettings = useCopyExamAbsencePenaltySettings();

  useEffect(() => {
    if (!examId && latestExam?.id) {
      setExamId(latestExam.id);
    }
  }, [examId, latestExam?.id]);

  useEffect(() => {
    if (!settings || settings.examId !== examId) return;
    setIsEnabled(settings.isEnabled);
    setExamClassIds(settings.examClassIds);
    setBands(settings.bands.length > 0 ? settings.bands : [emptyBand()]);
  }, [settings, examId]);

  const sourceExamOptions = useMemo(
    () => exams.filter((exam) => exam.id !== examId),
    [exams, examId],
  );

  if (!canRead && !canUpdate) {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleExamClass = (id: string, checked: boolean) => {
    setExamClassIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((value) => value !== id);
    });
  };

  const updateBand = (index: number, patch: Partial<AbsencePenaltyBandForm>) => {
    setBands((prev) => prev.map((band, i) => (i === index ? { ...band, ...patch } : band)));
  };

  const handleSave = async () => {
    if (!examId || !canUpdate) return;

    const bandsToSave = isEnabled ? bands : bands;
    if (isEnabled) {
      const error = validateBands(bandsToSave);
      if (error) {
        showToast.error(error);
        return;
      }
    }

    await updateSettings.mutateAsync({
      examId,
      isEnabled,
      examClassIds,
      bands: bandsToSave,
    });
  };

  const handleCopy = async () => {
    if (!examId || !sourceExamId || !canUpdate) return;
    await copySettings.mutateAsync({
      sourceExamId,
      targetExamId: examId,
      copyExamClasses,
    });
    setCopyOpen(false);
    setSourceExamId('');
  };

  const isLoading = examsLoading || (!!examId && (settingsLoading || classesLoading));

  return (
    <div className="container mx-auto max-w-5xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('examAbsencePenalty.settingsTitle') || 'Absence Mark Penalty'}
        description={
          t('examAbsencePenalty.settingsDescription') ||
          'Configure absence mark cuts per exam. Penalty applies only to selected exam classes for that exam.'
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('examAbsencePenalty.selectExam') || 'Select exam'}</CardTitle>
          <CardDescription>
            {t('examAbsencePenalty.perExamHint') ||
              'Settings, bands, and class scope are stored per exam. Absences are entered separately for each exam period.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('examAbsencePenalty.selectExam') || 'Select exam'}</Label>
            <Select
              value={examId}
              onValueChange={(value) => {
                setExamId(value);
                setExamClassIds([]);
                setBands([emptyBand()]);
                setIsEnabled(false);
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
          {canUpdate && (
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full md:w-auto"
                disabled={!examId}
                onClick={() => setCopyOpen(true)}
              >
                <Copy className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">
                  {t('examAbsencePenalty.copyFromExam') || 'Copy from exam'}
                </span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {examId && (
        <Card>
          <CardHeader>
            <CardTitle>{t('examAbsencePenalty.enableTitle') || 'Enable for this exam'}</CardTitle>
            <CardDescription>
              {t('examAbsencePenalty.enableDescription') ||
                'When disabled, mark sheets for this exam are unchanged. You can still edit bands and classes.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="absence-penalty-enabled">
                {t('examAbsencePenalty.enabled') || "Apply absence penalty to this exam's totals"}
              </Label>
              <Switch
                id="absence-penalty-enabled"
                checked={isEnabled}
                disabled={!canUpdate || isLoading}
                onCheckedChange={setIsEnabled}
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-medium">
                    {t('examAbsencePenalty.examClasses') || 'Exam classes'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t('examAbsencePenalty.examClassesHint') ||
                      'Penalty applies only to students in selected exam classes. Empty selection means no cut.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    disabled={!canUpdate || examClasses.length === 0}
                    onClick={() => setExamClassIds(examClasses.map((c) => c.id))}
                  >
                    {t('common.selectAll') || 'Select all'}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    disabled={!canUpdate || examClassIds.length === 0}
                    onClick={() => setExamClassIds([])}
                  >
                    {t('common.clear') || 'Clear'}
                  </Button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-2">
                {examClasses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t('examAbsencePenalty.noExamClasses') || 'No classes assigned to this exam yet.'}
                  </p>
                ) : (
                  examClasses.map((examClass) => (
                    <label
                      key={examClass.id}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={examClassIds.includes(examClass.id)}
                        disabled={!canUpdate}
                        onCheckedChange={(value) =>
                          toggleExamClass(examClass.id, value === true)
                        }
                      />
                      <span>{examClassLabel(examClass)}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-medium">{t('examAbsencePenalty.bandsTitle') || 'Penalty bands'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('examAbsencePenalty.bandsHint') ||
                      'Progressive: each absence is priced by the band it falls in. Leave max empty for open-ended.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canUpdate}
                  onClick={() => setBands((prev) => [...prev, emptyBand()])}
                >
                  <Plus className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">{t('common.add') || 'Add'}</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('examAbsencePenalty.minAbsences') || 'From'}</TableHead>
                      <TableHead>{t('examAbsencePenalty.maxAbsences') || 'To'}</TableHead>
                      <TableHead>{t('examAbsencePenalty.marksPerAbsence') || 'Marks / absence'}</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bands.map((band, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={band.minAbsences}
                            disabled={!canUpdate}
                            onChange={(e) =>
                              updateBand(index, { minAbsences: Number(e.target.value) || 0 })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            placeholder={t('examAbsencePenalty.openEnded') || 'Open'}
                            value={band.maxAbsences ?? ''}
                            disabled={!canUpdate}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateBand(index, {
                                maxAbsences: value === '' ? null : Number(value) || 0,
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.5"
                            value={band.marksPerAbsence}
                            disabled={!canUpdate}
                            onChange={(e) =>
                              updateBand(index, { marksPerAbsence: Number(e.target.value) || 0 })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!canUpdate || bands.length <= 1}
                            onClick={() => setBands((prev) => prev.filter((_, i) => i !== index))}
                            aria-label={t('common.delete') || 'Delete'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {canUpdate && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>
                  {t('common.save') || 'Save'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('examAbsencePenalty.copyFromExam') || 'Copy from exam'}</DialogTitle>
            <DialogDescription>
              {t('examAbsencePenalty.copyDescription') ||
                'Copies enable flag and bands. Optionally copies selected exam classes when class IDs match. Absences are never copied.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('examAbsencePenalty.sourceExam') || 'Source exam'}</Label>
              <Select value={sourceExamId} onValueChange={setSourceExamId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('examAbsencePenalty.selectExam') || 'Select exam'} />
                </SelectTrigger>
                <SelectContent>
                  {sourceExamOptions.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={copyExamClasses}
                onCheckedChange={(value) => setCopyExamClasses(value === true)}
              />
              <span>
                {t('examAbsencePenalty.copyExamClasses') || 'Also copy selected exam classes'}
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={() => void handleCopy()}
              disabled={!sourceExamId || copySettings.isPending}
            >
              {t('examAbsencePenalty.copy') || 'Copy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ExamAbsencePenaltySettingsPage;
