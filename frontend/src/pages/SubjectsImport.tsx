import { Download, Upload, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useLanguage } from '@/hooks/useLanguage';
import { useRooms } from '@/hooks/useRooms';
import { subjectImportApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import type { ClassAcademicYear } from '@/types/domain/class';

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

type ValidationSheetResult = {
  sheet_name: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  valid_row_numbers?: number[];
  errors: ValidationError[];
};

type ValidationResult = {
  is_valid: boolean;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  sheets: ValidationSheetResult[];
};

type ImportCommitQueuedResponse = {
  accepted?: boolean;
  job_id?: string;
  status?: 'queued' | 'running' | 'completed' | 'failed';
  message?: string;
};

type ImportCommitStatusResponse = {
  job_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  created_subjects?: number;
  skipped_subjects?: number;
  created_templates?: number;
  skipped_templates?: number;
  created_class_subjects?: number;
  skipped_class_subjects?: number;
  error?: string | null;
  message?: string | null;
};

type ClassSheetDefaults = {
  room_id?: string | null;
  is_required?: boolean | null;
  hours_per_week?: number | null;
  credits?: number | null;
};

const REQUIRED_SUBJECT_FIELDS = ['name', 'code'] as const;

const SUBJECT_FIELD_OPTIONS: string[] = [
  'name',
  'code',
  'description',
  'is_active',
  'is_required',
  'credits',
  'hours_per_week',
  'notes',
];

const IMPORT_STATUS_POLL_MS = 3000;

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SubjectsImport() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const importPollCancelledRef = useRef(false);

  useEffect(() => {
    importPollCancelledRef.current = false;
    return () => {
      importPollCancelledRef.current = true;
    };
  }, []);

  const { data: academicYears } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const { data: classAcademicYears } = useClassAcademicYears(academicYearId ?? undefined);
  const { data: rooms } = useRooms(undefined, undefined, false);

  const [subjectFields, setSubjectFields] = useState<string[]>(() => [
    ...REQUIRED_SUBJECT_FIELDS,
    'description',
    'is_active',
    'is_required',
    'hours_per_week',
  ]);
  const [selectedClassAcademicYearIds, setSelectedClassAcademicYearIds] = useState<string[]>([]);
  const [classDefaults, setClassDefaults] = useState<Record<string, ClassSheetDefaults>>({});

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const normalizedSubjectFields = useMemo(() => {
    const set = new Set(subjectFields);
    REQUIRED_SUBJECT_FIELDS.forEach((f) => set.add(f));
    return Array.from(set);
  }, [subjectFields]);

  const canDownload = useMemo(() => {
    if (normalizedSubjectFields.length === 0) return false;
    if (!academicYearId) return false;
    if (selectedClassAcademicYearIds.length === 0) return false;
    return true;
  }, [normalizedSubjectFields.length, academicYearId, selectedClassAcademicYearIds.length]);

  const groupedClassSections = useMemo(() => {
    const groups = new Map<
      string,
      { classId: string; className: string; sections: ClassAcademicYear[] }
    >();

    for (const cay of classAcademicYears ?? []) {
      const classId = cay.classId || cay.class?.id || cay.id;
      const className = cay.class?.name ?? t('academic.subjects.selectClass') ?? 'Class';
      const existing = groups.get(classId);
      if (existing) {
        existing.sections.push(cay);
      } else {
        groups.set(classId, { classId, className, sections: [cay] });
      }
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      sections: [...group.sections].sort((a, b) =>
        (a.sectionName ?? '').localeCompare(b.sectionName ?? '', undefined, { sensitivity: 'base' })
      ),
    }));
  }, [classAcademicYears, t]);

  const toggleClassSection = (classAcademicYearId: string, checked: boolean) => {
    setSelectedClassAcademicYearIds((prev) =>
      checked
        ? Array.from(new Set([...prev, classAcademicYearId]))
        : prev.filter((id) => id !== classAcademicYearId)
    );
  };

  const flattenedErrors = useMemo(() => {
    const out: Array<{ sheet: string; row: number; field: string; message: string }> = [];
    if (!validation) return out;
    validation.sheets.forEach((s) => {
      s.errors.forEach((e) => out.push({ sheet: s.sheet_name, ...e }));
    });
    return out;
  }, [validation]);

  const toggleField = (list: string[], key: string, checked: boolean): string[] => {
    if (checked) return Array.from(new Set([...list, key]));
    return list.filter((k) => k !== key);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const setClassDefault = (classAcademicYearId: string, patch: ClassSheetDefaults) => {
    setClassDefaults((prev) => ({
      ...prev,
      [classAcademicYearId]: {
        ...(prev[classAcademicYearId] ?? {}),
        ...patch,
      },
    }));
  };

  const onDownloadTemplate = async () => {
    if (!canDownload || !academicYearId) return;
    setIsDownloading(true);
    try {
      const classDefaultsPayload = selectedClassAcademicYearIds.map((id) => ({
        class_academic_year_id: id,
        ...(classDefaults[id] ?? {}),
      }));

      const { blob, filename } = await subjectImportApi.downloadTemplate({
        subject_fields: normalizedSubjectFields,
        academic_year_id: academicYearId,
        class_academic_year_ids: selectedClassAcademicYearIds,
        class_defaults: classDefaultsPayload,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'subjects_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      showToast.success('toast.fileDownloaded');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showToast.error(message || 'toast.fileDownloadFailed');
    } finally {
      setIsDownloading(false);
    }
  };

  const onValidate = async () => {
    if (!uploadFile) return;
    setIsValidating(true);
    setValidation(null);
    try {
      const resp = await subjectImportApi.validate(uploadFile);
      const result = (resp as { result?: ValidationResult })?.result;
      if (!result) {
        throw new Error('Invalid response from server');
      }
      setValidation(result);
      showToast.success('events.success');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showToast.error(message || 'toast.error');
    } finally {
      setIsValidating(false);
    }
  };

  const onImport = async () => {
    if (!uploadFile) return;
    setIsImporting(true);
    let loadingToastId: string | number | undefined;
    try {
      const resp = (await subjectImportApi.commit(uploadFile)) as ImportCommitQueuedResponse;
      if (!resp?.accepted || !resp?.job_id) {
        throw new Error('Unexpected import response');
      }

      loadingToastId = showToast.loading('toast.processing');
      const jobId = resp.job_id;
      const maxPollAttempts = 600;

      for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
        if (importPollCancelledRef.current) {
          showToast.dismiss(loadingToastId);
          return;
        }
        await sleep(IMPORT_STATUS_POLL_MS);
        if (importPollCancelledRef.current) {
          showToast.dismiss(loadingToastId);
          return;
        }
        const status = (await subjectImportApi.commitStatus(jobId)) as ImportCommitStatusResponse;

        if (status.status === 'completed') {
          showToast.dismiss(loadingToastId);
          showToast.success('toast.subjectsImported', {
            count: status.created_subjects ?? 0,
          });
          if ((status.created_class_subjects ?? 0) > 0) {
            showToast.info('toast.subjectAssignmentsCreated', {
              count: status.created_class_subjects ?? 0,
            });
          }
          if ((status.skipped_subjects ?? 0) > 0 || (status.skipped_class_subjects ?? 0) > 0) {
            showToast.info('toast.subjectImportSkipped', {
              subjects: status.skipped_subjects ?? 0,
              assignments: status.skipped_class_subjects ?? 0,
            });
          }
          navigate('/settings/subjects?tab=classSubjects');
          return;
        }

        if (status.status === 'failed') {
          showToast.dismiss(loadingToastId);
          throw new Error(status.error || status.message || 'Subject import failed');
        }
      }

      showToast.dismiss(loadingToastId);
      throw new Error('Subject import is taking too long. Please check again shortly.');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showToast.error(message || 'toast.error');
    } finally {
      if (loadingToastId !== undefined) {
        showToast.dismiss(loadingToastId);
      }
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl overflow-x-hidden">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t('academic.subjects.importTitle')}</h1>
          <p className="text-muted-foreground hidden md:block">{t('academic.subjects.importSubtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/settings/subjects')} className="flex-shrink-0">
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('academic.subjects.backToSubjects')}</span>
        </Button>
      </div>

      <Tabs defaultValue="template">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="template" className="whitespace-nowrap flex-shrink-0">
            {t('academic.subjects.templateBuilder')}
          </TabsTrigger>
          <TabsTrigger value="upload" className="whitespace-nowrap flex-shrink-0">
            {t('academic.subjects.uploadImport')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('academic.subjects.subjectFields')}</CardTitle>
                <CardDescription className="hidden md:block">
                  {t('academic.subjects.templateFieldsHint')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SUBJECT_FIELD_OPTIONS.map((key) => {
                    const isRequired = (REQUIRED_SUBJECT_FIELDS as readonly string[]).includes(key);
                    const checked = normalizedSubjectFields.includes(key);
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sf-${key}`}
                          checked={checked}
                          disabled={isRequired}
                          onCheckedChange={(v) => setSubjectFields((prev) => toggleField(prev, key, v === true))}
                        />
                        <Label htmlFor={`sf-${key}`} className="text-sm">
                          <span>{humanizeKey(key)}</span>
                          {isRequired ? <span className="text-destructive"> *</span> : null}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('academic.subjects.classSheets')}</CardTitle>
                <CardDescription className="hidden md:block">
                  {t('academic.subjects.classSheetsHint')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('academic.subjects.selectAcademicYear')}</Label>
                  <Select
                    value={academicYearId ?? ''}
                    onValueChange={(v) => {
                      setAcademicYearId(v || null);
                      setSelectedClassAcademicYearIds([]);
                      setClassDefaults({});
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('academic.subjects.selectAcademicYear')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(academicYears ?? []).map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!academicYearId ? (
                  <p className="text-sm text-muted-foreground">
                    {t('academic.subjects.selectAcademicYearForClasses')}
                  </p>
                ) : groupedClassSections.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('academic.subjects.noClassesForYear')}</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {groupedClassSections.map((group) => {
                      const selectedSections = group.sections.filter((cay) =>
                        selectedClassAcademicYearIds.includes(cay.id)
                      );
                      const allSelected =
                        group.sections.length > 0 &&
                        group.sections.every((cay) => selectedClassAcademicYearIds.includes(cay.id));
                      const someSelected = selectedSections.length > 0 && !allSelected;

                      return (
                        <div key={group.classId} className="border rounded-md p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`class-group-${group.classId}`}
                              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                              onCheckedChange={(v) => {
                                const on = v === true;
                                const sectionIds = group.sections.map((cay) => cay.id);
                                setSelectedClassAcademicYearIds((prev) => {
                                  if (on) {
                                    return Array.from(new Set([...prev, ...sectionIds]));
                                  }
                                  return prev.filter((id) => !sectionIds.includes(id));
                                });
                              }}
                            />
                            <Label
                              htmlFor={`class-group-${group.classId}`}
                              className="text-sm font-medium"
                            >
                              {group.className}
                            </Label>
                          </div>

                          <div className="flex flex-wrap gap-2 pl-6">
                            {group.sections.map((cay) => {
                              const checked = selectedClassAcademicYearIds.includes(cay.id);
                              const sectionLabel =
                                cay.sectionName?.trim() ||
                                t('academic.classes.section') ||
                                'Section';

                              return (
                                <button
                                  key={cay.id}
                                  type="button"
                                  onClick={() => toggleClassSection(cay.id, !checked)}
                                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                                  aria-pressed={checked}
                                  aria-label={`${group.className} ${sectionLabel}`}
                                >
                                  <Badge
                                    variant={checked ? 'default' : 'outline'}
                                    className={cn(
                                      'cursor-pointer select-none',
                                      checked && 'hover:bg-primary/90'
                                    )}
                                  >
                                    {sectionLabel}
                                  </Badge>
                                </button>
                              );
                            })}
                          </div>

                          {selectedSections.length > 0 ? (
                            <div className="space-y-3 pl-6">
                              {selectedSections.map((cay) => (
                                <div key={cay.id} className="border rounded-md p-2 space-y-2 bg-muted/20">
                                  <div className="text-xs font-medium text-muted-foreground">
                                    {group.className}
                                    {cay.sectionName ? (
                                      <>
                                        {' '}
                                        <Badge variant="outline" className="align-middle">
                                          {cay.sectionName}
                                        </Badge>
                                      </>
                                    ) : null}
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">{t('academic.subjects.room')}</Label>
                                      <Select
                                        value={classDefaults[cay.id]?.room_id ?? '__none__'}
                                        onValueChange={(v) =>
                                          setClassDefault(cay.id, {
                                            room_id: v === '__none__' ? null : v,
                                          })
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder={t('academic.subjects.room')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="__none__">
                                            {t('common.none') || 'None'}
                                          </SelectItem>
                                          {(rooms ?? []).map((room) => (
                                            <SelectItem key={room.id} value={room.id}>
                                              {room.roomNumber || room.id}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">
                                        {t('academic.subjects.weeklyHours')}
                                      </Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={40}
                                        value={classDefaults[cay.id]?.hours_per_week ?? ''}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          setClassDefault(cay.id, {
                                            hours_per_week: raw === '' ? null : Number(raw),
                                          });
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button onClick={onDownloadTemplate} disabled={!canDownload || isDownloading} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {isDownloading ? t('common.loading') : t('academic.subjects.downloadTemplate')}
                  </span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('academic.subjects.uploadImport')}</CardTitle>
              <CardDescription className="hidden md:block">
                {t('academic.subjects.importRulesHint')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject-import-file">{t('academic.subjects.selectFile')}</Label>
                <Input
                  id="subject-import-file"
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => {
                    setUploadFile(e.target.files?.[0] ?? null);
                    setValidation(null);
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onValidate} disabled={!uploadFile || isValidating || isImporting}>
                  <CheckCircle2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {isValidating ? t('common.loading') : t('academic.subjects.validateFile')}
                  </span>
                </Button>
                <Button
                  onClick={onImport}
                  disabled={!uploadFile || !validation?.is_valid || isImporting || isValidating}
                >
                  <Upload className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">
                    {isImporting ? t('common.loading') : t('academic.subjects.importNow')}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {validation ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {validation.is_valid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                  {t('academic.subjects.validationSummary')}
                </CardTitle>
                <CardDescription>
                  {t('academic.subjects.rows')}: {validation.total_rows} · {t('academic.subjects.valid')}:{' '}
                  {validation.valid_rows} · {t('academic.subjects.invalid')}: {validation.invalid_rows}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {flattenedErrors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('academic.subjects.sheet')}</TableHead>
                          <TableHead>{t('academic.subjects.row')}</TableHead>
                          <TableHead>{t('academic.subjects.field')}</TableHead>
                          <TableHead>{t('academic.subjects.message')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {flattenedErrors.slice(0, 200).map((err, idx) => (
                          <TableRow key={`${err.sheet}-${err.row}-${err.field}-${idx}`}>
                            <TableCell>{err.sheet}</TableCell>
                            <TableCell>{err.row || '—'}</TableCell>
                            <TableCell>{err.field}</TableCell>
                            <TableCell>{err.message}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('academic.subjects.validationPassed')}</p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
