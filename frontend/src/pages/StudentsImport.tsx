import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { useResidencyTypes } from '@/hooks/useResidencyTypes';
import { useRooms } from '@/hooks/useRooms';
import { useResourceUsage } from '@/hooks/useSubscription';
import { studentImportApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

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

const REQUIRED_STUDENT_FIELDS = ['full_name', 'father_name'] as const;

const STUDENT_FIELD_OPTIONS: string[] = [
  'admission_no',
  'student_code',
  ...REQUIRED_STUDENT_FIELDS,
  'card_number',
  'grandfather_name',
  'mother_name',
  'birth_year',
  'birth_date',
  'age',
  'admission_year',
  'orig_province',
  'orig_district',
  'orig_village',
  'curr_province',
  'curr_district',
  'curr_village',
  'nationality',
  'preferred_language',
  'previous_school',
  'guardian_name',
  'guardian_relation',
  'guardian_phone',
  'guardian_tazkira',
  'home_address',
  'zamin_name',
  'zamin_phone',
  'zamin_tazkira',
  'zamin_address',
  'applying_grade',
  'is_orphan',
  'admission_fee_status',
  'student_status',
  'disability_status',
  'emergency_contact_name',
  'emergency_contact_phone',
  'family_income',
];

// Admission fields shown in the template builder are END-USER fields only.
// We intentionally hide all *_id fields; class/year/room/residency are embedded via template metadata.
const ADMISSION_FIELD_OPTIONS: string[] = [
  'admission_year',
  'admission_date',
  'enrollment_status',
  'enrollment_type',
  'shift',
  'is_boarder',
  'fee_status',
  'placement_notes',
];

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type ClassSheetDefaults = {
  room_id?: string | null;
  residency_type_id?: string | null;
  shift?: string | null;
  enrollment_status?: string | null;
  is_boarder?: boolean | null;
};

export default function StudentsImport() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: academicYears } = useAcademicYears();
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const { data: classAcademicYears } = useClassAcademicYears(academicYearId ?? undefined);
  const { data: rooms } = useRooms(undefined, undefined, false);
  const { data: residencyTypes } = useResidencyTypes();
  
  // Check subscription limits for students
  const studentUsage = useResourceUsage('students');

  const [studentFields, setStudentFields] = useState<string[]>(
    () => ['admission_no', ...REQUIRED_STUDENT_FIELDS, 'gender'] // gender is optional but selected by default
  );
  const [admissionFields, setAdmissionFields] = useState<string[]>(() => []);

  const [selectedClassAcademicYearIds, setSelectedClassAcademicYearIds] = useState<string[]>([]);
  const [classDefaults, setClassDefaults] = useState<Record<string, ClassSheetDefaults>>({});

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Check if limit is reached
  const isLimitReached = !studentUsage.isUnlimited && studentUsage.remaining === 0;
  const canUploadFile = !isLimitReached;

  const requiresAcademicYear = selectedClassAcademicYearIds.length > 0;

  const normalizedStudentFields = useMemo(() => {
    const set = new Set(studentFields);
    REQUIRED_STUDENT_FIELDS.forEach((f) => set.add(f));
    return Array.from(set);
  }, [studentFields]);

  const canDownload = useMemo(() => {
    if (normalizedStudentFields.length === 0) return false;
    if (requiresAcademicYear && !academicYearId) return false;
    return true;
  }, [normalizedStudentFields.length, requiresAcademicYear, academicYearId]);

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
    if (!canDownload) return;
    setIsDownloading(true);
    try {
      const classDefaultsPayload =
        selectedClassAcademicYearIds.length > 0
          ? selectedClassAcademicYearIds.map((id) => ({
              class_academic_year_id: id,
              ...(classDefaults[id] ?? {}),
            }))
          : undefined;

      const { blob, filename } = await studentImportApi.downloadTemplate({
        student_fields: normalizedStudentFields,
        admission_fields: admissionFields,
        // Only send academic_year_id when generating class-specific templates.
        academic_year_id: selectedClassAcademicYearIds.length > 0 ? academicYearId : null,
        class_academic_year_ids: selectedClassAcademicYearIds.length > 0 ? selectedClassAcademicYearIds : undefined,
        class_defaults: classDefaultsPayload,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'students_import_template.xlsx';
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
      const resp = await studentImportApi.validate(uploadFile);
      const result = (resp as { result?: ValidationResult; limit_warning?: any })?.result;
      const limitWarning = (resp as { limit_warning?: any })?.limit_warning;
      
      if (!result) {
        throw new Error('Invalid response from server');
      }
      
      // If there's a limit warning, adjust validation result to only allow remaining rows
      let adjustedResult = result;
      if (limitWarning && !studentUsage.isUnlimited && studentUsage.remaining !== -1) {
        const remaining = studentUsage.remaining;
        const validRowsToKeep = Math.min(result.valid_rows, remaining);
        
        if (validRowsToKeep < result.valid_rows) {
          // Filter validation to only keep first N valid rows
          adjustedResult = {
            ...result,
            valid_rows: validRowsToKeep,
            invalid_rows: result.total_rows - validRowsToKeep,
            is_valid: validRowsToKeep > 0,
            sheets: result.sheets.map((sheet) => {
              const validRowNumbers = sheet.valid_row_numbers || [];
              const keptRows = validRowNumbers.slice(0, validRowsToKeep);
              const excludedRows = validRowNumbers.slice(validRowsToKeep);
              
              // Mark excluded rows as errors
              const newErrors = [...sheet.errors];
              excludedRows.forEach((rowNum) => {
                newErrors.push({
                  row: rowNum,
                  field: 'limit',
                  message: `Cannot import: Only ${remaining} student slot(s) remaining. This row exceeds the limit.`,
                });
              });
              
              return {
                ...sheet,
                valid_rows: keptRows.length,
                invalid_rows: sheet.total_rows - keptRows.length,
                valid_row_numbers: keptRows,
                errors: newErrors,
              };
            }),
          };
        }
      }
      
      setValidation(adjustedResult);
      
      if (limitWarning) {
        showToast.warning(
          limitWarning.message || 
          `Import contains ${limitWarning.total_rows || result.total_rows} students, but only ${limitWarning.remaining || studentUsage.remaining} slots remaining. Only the first ${Math.min(result.valid_rows, limitWarning.remaining || studentUsage.remaining)} valid rows will be imported.`
        );
      } else {
        showToast.success('events.success');
      }
    } catch (e: any) {
      const message = e instanceof Error ? e.message : String(e);
      
      // Check if it's a limit error
      if (e?.code === 'LIMIT_REACHED' || message.includes('limit') || message.includes('LIMIT_REACHED')) {
        showToast.error(message || 'Student limit reached. Please upgrade your plan.');
      } else {
        showToast.error(message || 'toast.error');
      }
    } finally {
      setIsValidating(false);
    }
  };

  const onImport = async () => {
    if (!uploadFile) return;
    setIsImporting(true);
    try {
      const resp = await studentImportApi.commit(uploadFile);
      const createdStudents = (resp as any)?.created_students ?? 0;
      const createdAdmissions = (resp as any)?.created_admissions ?? 0;

      showToast.success('toast.studentsImported', { count: createdStudents });
      if (createdAdmissions > 0) {
        showToast.info('toast.admissionsCreated', { count: createdAdmissions });
      }
      navigate('/students');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      showToast.error(message || 'toast.error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl overflow-x-hidden">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t('students.importTitle')}</h1>
          <p className="text-muted-foreground hidden md:block">{t('students.importSubtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/students')} className="flex-shrink-0">
          {t('students.backToStudents')}
        </Button>
      </div>

      <Tabs defaultValue="template">
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="template" className="whitespace-nowrap flex-shrink-0">{t('students.templateBuilder')}</TabsTrigger>
          <TabsTrigger value="upload" className="whitespace-nowrap flex-shrink-0">{t('students.uploadImport')}</TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('students.studentFields')}</CardTitle>
                <CardDescription className="hidden md:block">{t('students.templateFieldsHint')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {STUDENT_FIELD_OPTIONS.map((key) => {
                    const isRequired = (REQUIRED_STUDENT_FIELDS as readonly string[]).includes(key);
                    const checked = normalizedStudentFields.includes(key);
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sf-${key}`}
                          checked={checked}
                          disabled={isRequired}
                          onCheckedChange={(v) => setStudentFields((prev) => toggleField(prev, key, v === true))}
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
                <CardTitle>{t('students.admissionFields')}</CardTitle>
                <CardDescription className="hidden md:block">{t('students.admissionFieldsHint')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ADMISSION_FIELD_OPTIONS.map((key) => {
                    const checked = admissionFields.includes(key);
                    return (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={`af-${key}`}
                          checked={checked}
                          onCheckedChange={(v) => setAdmissionFields((prev) => toggleField(prev, key, v === true))}
                        />
                        <Label htmlFor={`af-${key}`} className="text-sm">
                          <span>{humanizeKey(key)}</span>
                        </Label>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label>{t('students.academicYearOptional')}</Label>
                  <Select
                    value={academicYearId ?? 'none'}
                    onValueChange={(v) => {
                      const next = v === 'none' ? null : v;
                      setAcademicYearId(next);
                      setSelectedClassAcademicYearIds([]);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('students.selectAcademicYear')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('events.none')}</SelectItem>
                      {academicYears?.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('students.classTemplates')}</Label>
                  {!academicYearId ? (
                    <p className="text-sm text-muted-foreground">{t('students.selectAcademicYearForClasses')}</p>
                  ) : (
                    <div className="border rounded-md p-3 max-h-[260px] overflow-auto space-y-2">
                      {classAcademicYears?.length ? (
                        classAcademicYears.map((cay) => {
                          const label = `${cay.class?.name ?? 'Class'}${cay.sectionName ? ` - ${cay.sectionName}` : ''}`;
                          const checked = selectedClassAcademicYearIds.includes(cay.id);
                          return (
                            <div key={cay.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`cay-${cay.id}`}
                                checked={checked}
                                onCheckedChange={(v) =>
                                  setSelectedClassAcademicYearIds((prev) => {
                                    const next = toggleField(prev, cay.id, v === true);
                                    // Keep defaults map in sync
                                    setClassDefaults((prevDefaults) => {
                                      const copy = { ...prevDefaults };
                                      if (next.includes(cay.id)) {
                                        copy[cay.id] = copy[cay.id] ?? {};
                                      } else {
                                        delete copy[cay.id];
                                      }
                                      return copy;
                                    });
                                    return next;
                                  })
                                }
                              />
                              <Label htmlFor={`cay-${cay.id}`} className="text-sm">
                                {label}
                              </Label>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">{t('students.noClassesForYear')}</p>
                      )}
                    </div>
                  )}
                  {requiresAcademicYear && !academicYearId ? (
                    <p className="text-sm text-destructive">{t('students.academicYearRequiredForClassTemplates')}</p>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button onClick={onDownloadTemplate} disabled={!canDownload || isDownloading} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{t('students.downloadTemplate')}</span>
                    <span className="sm:hidden">{t('events.download') || 'Download'}</span>
                  </Button>
                </div>

                {selectedClassAcademicYearIds.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="text-sm font-medium">{t('students.admissionDefaults')}</div>
                    <div className="text-xs text-muted-foreground">{t('students.admissionDefaultsHint')}</div>

                    <div className="space-y-3">
                      {selectedClassAcademicYearIds.map((cayId) => {
                        const cay = classAcademicYears?.find((x) => x.id === cayId);
                        const label = `${cay?.class?.name ?? 'Class'}${cay?.sectionName ? ` - ${cay.sectionName}` : ''}`;
                        const defaults = classDefaults[cayId] ?? {};

                        return (
                          <div key={cayId} className="border rounded-md p-3 space-y-2">
                            <div className="text-sm font-medium">{label}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label>{t('students.defaultResidencyType')}</Label>
                                <Select
                                  value={defaults.residency_type_id ?? 'none'}
                                  onValueChange={(v) => setClassDefault(cayId, { residency_type_id: v === 'none' ? null : v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('events.select')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">{t('events.none')}</SelectItem>
                                    {(residencyTypes as any[])?.map((rt) => (
                                      <SelectItem key={rt.id} value={rt.id}>
                                        {rt.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label>{t('students.defaultRoom')}</Label>
                                <Select
                                  value={defaults.room_id ?? 'none'}
                                  onValueChange={(v) => setClassDefault(cayId, { room_id: v === 'none' ? null : v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t('events.select')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">{t('events.none')}</SelectItem>
                                    {(Array.isArray(rooms) ? rooms : (rooms as any)?.data)?.map((room: any) => (
                                      <SelectItem key={room.id} value={room.id}>
                                        {room.roomNumber ?? room.room_number ?? room.name ?? room.id}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{t('students.importRulesHint')}</div>
                  <div>{t('students.admissionFieldsHint')}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('students.uploadImport')}</CardTitle>
              <CardDescription className="hidden md:block">{t('students.uploadImportHint')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLimitReached && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('students.limitReached') || 
                     `Student limit reached (${studentUsage.current}/${studentUsage.limit}). Please upgrade your plan to import more students.`}
                  </AlertDescription>
                </Alert>
              )}
              
              {!isLimitReached && !studentUsage.isUnlimited && studentUsage.remaining !== -1 && studentUsage.remaining < 10 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('students.limitWarning', { remaining: studentUsage.remaining })}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="xlsx">{t('students.selectXlsx')}</Label>
                <Input
                  id="xlsx"
                  type="file"
                  accept=".xlsx"
                  disabled={!canUploadFile}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setUploadFile(f);
                    setValidation(null);
                  }}
                />
                {!canUploadFile && (
                  <p className="text-sm text-muted-foreground">
                    {t('students.uploadDisabled') || 'File upload is disabled because the student limit has been reached.'}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="secondary" 
                  onClick={onValidate} 
                  disabled={!canUploadFile || !uploadFile || isValidating}
                  className="flex-1 sm:flex-initial"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('students.validateFile')}</span>
                  <span className="sm:hidden">{t('students.validate') || 'Validate'}</span>
                </Button>
                <Button 
                  onClick={onImport} 
                  disabled={!canUploadFile || !uploadFile || !validation?.is_valid || isImporting}
                  className="flex-1 sm:flex-initial"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('students.importNow')}</span>
                  <span className="sm:hidden">{t('events.import') || 'Import'}</span>
                </Button>
              </div>
              
              {validation && !studentUsage.isUnlimited && studentUsage.remaining !== -1 && validation.valid_rows > studentUsage.remaining && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('students.importLimited', { 
                      validRows: validation.valid_rows, 
                      remaining: studentUsage.remaining 
                    })}
                  </AlertDescription>
                </Alert>
              )}

              {validation && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {validation.is_valid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                    <div className="text-sm">
                      <span className="font-medium">{t('students.validationSummary')}</span>
                      <span className="text-muted-foreground">
                        {' '}
                        — {t('students.rows')}: {validation.total_rows}, {t('students.valid')}: {validation.valid_rows}, {t('students.invalid')}: {validation.invalid_rows}
                      </span>
                    </div>
                  </div>

                  {validation.valid_rows > 0 && (
                    <div className="border rounded-md p-3 bg-green-50 dark:bg-green-950/20">
                      <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                        {t('students.validRows')} ({validation.valid_rows})
                      </div>
                      <div className="text-xs text-muted-foreground space-y-2">
                        {validation.sheets.map((sheet) => {
                          if (sheet.valid_rows === 0) return null;
                          const validRows = sheet.valid_row_numbers || [];
                          if (validRows.length === 0) return null;
                          return (
                            <div key={sheet.sheet_name} className="flex items-start gap-2">
                              <span className="font-medium min-w-[120px]">{sheet.sheet_name}:</span>
                              <span className="flex-1">
                                {validRows.length === 1
                                  ? `Row ${validRows[0]}`
                                  : validRows.length <= 10
                                    ? `Rows ${validRows.join(', ')}`
                                    : `Rows ${validRows.slice(0, 10).join(', ')}${validRows.length > 10 ? `, ... and ${validRows.length - 10} more` : ''}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!validation.is_valid && flattenedErrors.length > 0 && (
                    <div className="border rounded-md overflow-x-auto max-h-[420px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('students.sheet')}</TableHead>
                            <TableHead>{t('students.row')}</TableHead>
                            <TableHead>{t('students.field')}</TableHead>
                            <TableHead>{t('students.message')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {flattenedErrors.slice(0, 200).map((e, idx) => (
                            <TableRow key={`${e.sheet}-${e.row}-${e.field}-${idx}`}>
                              <TableCell className="font-medium">{e.sheet}</TableCell>
                              <TableCell>{e.row}</TableCell>
                              <TableCell className="font-mono text-xs">{e.field}</TableCell>
                              <TableCell>{e.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


