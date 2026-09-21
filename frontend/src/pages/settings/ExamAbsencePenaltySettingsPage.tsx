import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  type AbsencePenaltyBandForm,
  useExamAbsencePenaltySettings,
  useUpdateExamAbsencePenaltySettings,
} from '@/hooks/useExamAbsencePenalty';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { showToast } from '@/lib/toast';

function emptyBand(): AbsencePenaltyBandForm {
  return { minAbsences: 0, maxAbsences: 4, marksPerAbsence: 0 };
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
  const canUpdate = useHasPermission('exams.update');
  const { data: settings, isLoading } = useExamAbsencePenaltySettings();
  const updateSettings = useUpdateExamAbsencePenaltySettings();

  const [isEnabled, setIsEnabled] = useState(false);
  const [bands, setBands] = useState<AbsencePenaltyBandForm[]>([emptyBand()]);

  useEffect(() => {
    if (!settings) return;
    setIsEnabled(settings.isEnabled);
    setBands(settings.bands.length > 0 ? settings.bands : [emptyBand()]);
  }, [settings]);

  const handleSave = async () => {
    if (isEnabled) {
      const error = validateBands(bands);
      if (error) {
        showToast.error(error);
        return;
      }
    }

    await updateSettings.mutateAsync({
      isEnabled,
      bands: isEnabled ? bands : [],
    });
  };

  const updateBand = (index: number, patch: Partial<AbsencePenaltyBandForm>) => {
    setBands((prev) => prev.map((band, i) => (i === index ? { ...band, ...patch } : band)));
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6 overflow-x-hidden p-4 md:p-6">
      <PageHeader
        title={t('examAbsencePenalty.settingsTitle') || 'Absence Mark Penalty'}
        description={
          t('examAbsencePenalty.settingsDescription') ||
          'Optionally cut exam grand totals based on yearly absences. Off by default.'
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('examAbsencePenalty.enableTitle') || 'Enable for this school'}</CardTitle>
          <CardDescription>
            {t('examAbsencePenalty.enableDescription') ||
              'When disabled, mark sheets behave exactly as they do today.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="absence-penalty-enabled">
              {t('examAbsencePenalty.enabled') || 'Apply absence penalty to exam totals'}
            </Label>
            <Switch
              id="absence-penalty-enabled"
              checked={isEnabled}
              disabled={!canUpdate || isLoading}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {isEnabled && (
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
          )}

          {canUpdate && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateSettings.isPending || isLoading}>
                {t('common.save') || 'Save'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ExamAbsencePenaltySettingsPage;
