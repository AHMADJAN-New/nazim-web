import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, GraduationCap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Controller, FormProvider, useFieldArray, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { publicWebsiteApi } from '@/lib/api/client';
import { onlineAdmissionSchema, type OnlineAdmissionFormData } from '@/lib/validations/onlineAdmissions';
import { usePublicAdmissionFields } from '@/website/hooks/useWebsiteAdmissions';

const DOCUMENT_TYPE_KEYS: { value: string; key: string }[] = [
  { value: 'passport', key: 'documentTypePassport' },
  { value: 'tazkira', key: 'documentTypeTazkira' },
  { value: 'birth_certificate', key: 'documentTypeBirthCertificate' },
  { value: 'transcript', key: 'documentTypeTranscript' },
  { value: 'photo', key: 'documentTypePhoto' },
  { value: 'other', key: 'documentTypeOther' },
];

export default function PublicAdmissionsPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get('course');
  const schoolIdFromUrl = searchParams.get('school_id');
  const { data: extraFields = [] } = usePublicAdmissionFields();
  const [extraValues, setExtraValues] = useState<Record<string, string | string[] | boolean>>({});
  const [extraFiles, setExtraFiles] = useState<Record<string, File>>({});

  const { data: courseForBanner } = useQuery({
    queryKey: ['public-course-banner', courseIdFromUrl, schoolIdFromUrl ?? null],
    queryFn: async () => {
      if (!courseIdFromUrl) return null;
      const params = schoolIdFromUrl ? { school_id: schoolIdFromUrl } : undefined;
      const response = await publicWebsiteApi.getCourse(courseIdFromUrl, params);
      return response as { id: string; title: string } | null;
    },
    enabled: !!courseIdFromUrl,
  });

  const form = useForm<OnlineAdmissionFormData>({
    resolver: zodResolver(onlineAdmissionSchema),
    defaultValues: {
      documents: [],
      is_orphan: false,
      admission_year: new Date().getFullYear().toString(),
    },
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  const { fields: documents, append, remove } = useFieldArray({
    control,
    name: 'documents',
  });

  const enabledFields = useMemo(
    () => extraFields.filter((field) => field.isEnabled).sort((a, b) => a.sortOrder - b.sortOrder),
    [extraFields]
  );

  const missingExtraFields = () => {
    const required = enabledFields.filter((field) => field.isRequired);
    const missing: string[] = [];

    required.forEach((field) => {
      if (field.fieldType === 'file' || field.fieldType === 'photo') {
        if (!extraFiles[field.id]) {
          missing.push(field.label);
        }
        return;
      }

      const value = extraValues[field.id];
      if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        missing.push(field.label);
      }
    });

    return missing;
  };

  const onSubmit = async (data: OnlineAdmissionFormData) => {
    const missing = missingExtraFields();
    if (missing.length > 0) {
      showToast.error(t('toast.onlineAdmissionMissingFields'));
      return;
    }

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null || key === 'documents') return;
      if (value instanceof Date) {
        formData.append(key, value.toISOString().slice(0, 10));
        return;
      }
      if (typeof value === 'boolean') {
        formData.append(key, value ? '1' : '0');
        return;
      }
      if (typeof value === 'string' || typeof value === 'number') {
        formData.append(key, String(value));
      }
    });

    if (data.picture instanceof File) {
      formData.append('picture', data.picture);
    }
    if (data.guardian_picture instanceof File) {
      formData.append('guardian_picture', data.guardian_picture);
    }

    (data.documents || []).forEach((doc) => {
      if (doc?.file instanceof File) {
        formData.append('documents[]', doc.file);
        formData.append('document_types[]', doc.documentType || 'document');
      }
    });

    const extraFieldPayload = Object.entries(extraValues).map(([fieldId, value]) => ({
      field_id: fieldId,
      value: typeof value === 'boolean' ? (value ? 'true' : 'false') : value,
    }));
    formData.append('extra_fields', JSON.stringify(extraFieldPayload));

    Object.entries(extraFiles).forEach(([fieldId, file]) => {
      formData.append(`extra_files[${fieldId}]`, file);
    });

    try {
      await publicWebsiteApi.submitAdmission(formData);
      showToast.success(t('toast.onlineAdmissionSubmitted'));
      reset();
      setExtraValues({});
      setExtraFiles({});
    } catch (error: any) {
      showToast.error(error?.message || t('toast.onlineAdmissionSubmitFailed'));
    }
  };

  const handleExtraValueChange = (fieldId: string, value: string | string[] | boolean) => {
    setExtraValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleExtraFileChange = (fieldId: string, file?: File | null) => {
    setExtraFiles((prev) => {
      const next = { ...prev };
      if (file) {
        next[fieldId] = file;
      } else {
        delete next[fieldId];
      }
      return next;
    });
  };

  const renderExtraField = (field: (typeof enabledFields)[number]) => {
    const value = extraValues[field.id];
    const options = field.options || [];

    switch (field.fieldType) {
      case 'textarea':
      case 'address':
        return (
          <Textarea
            value={(value as string) || ''}
            onChange={(event) => handleExtraValueChange(field.id, event.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
      case 'select':
        return (
          <Select
            value={(value as string) || ''}
            onValueChange={(val) => handleExtraValueChange(field.id, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || t('websitePublic.selectType')} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'multiselect':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {options.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt.value);
              return (
                <label key={opt.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      const current = Array.isArray(value) ? value : [];
                      const next = event.target.checked
                        ? [...current, opt.value]
                        : current.filter((item) => item !== opt.value);
                      handleExtraValueChange(field.id, next);
                    }}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        );
      case 'date':
        return (
          <Input
            type="date"
            value={(value as string) || ''}
            onChange={(event) => handleExtraValueChange(field.id, event.target.value)}
          />
        );
      case 'toggle':
        return (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => handleExtraValueChange(field.id, checked)}
          />
        );
      case 'file':
      case 'photo':
        return (
          <Input
            type="file"
            accept={field.fieldType === 'photo' ? 'image/*' : undefined}
            onChange={(event) => handleExtraFileChange(field.id, event.target.files?.[0])}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={(value as string) || ''}
            onChange={(event) => handleExtraValueChange(field.id, event.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
      case 'email':
        return (
          <Input
            type="email"
            value={(value as string) || ''}
            onChange={(event) => handleExtraValueChange(field.id, event.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
      case 'phone':
        return (
          <Input
            type="tel"
            value={(value as string) || ''}
            onChange={(event) => handleExtraValueChange(field.id, event.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
      default:
        return (
          <Input
            value={(value as string) || ''}
            onChange={(event) => handleExtraValueChange(field.id, event.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
    }
  };

  const programsLink = schoolIdFromUrl
    ? `/public-site/programs?school_id=${schoolIdFromUrl}`
    : '/public-site/programs';
  const courseDetailLink = courseIdFromUrl
    ? `/public-site/courses/${courseIdFromUrl}${schoolIdFromUrl ? `?school_id=${schoolIdFromUrl}` : ''}`
    : programsLink;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl overflow-x-hidden">
      {courseForBanner && (
        <Card className="overflow-hidden border-emerald-200 bg-emerald-50/50">
          <CardContent className="py-4 flex flex-wrap items-center gap-3">
            <GraduationCap className="h-8 w-8 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800">{t('websitePublic.applyingInConnectionWith')}</p>
              <p className="text-lg font-semibold text-emerald-900 truncate">{courseForBanner.title}</p>
            </div>
            <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-800 hover:bg-emerald-100" asChild>
              <Link to={courseDetailLink}>{t('websitePublic.viewProgramDetails')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-2xl">{t('websitePublic.onlineAdmissions')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('websitePublic.submitApplicationIntro')}
          </p>
        </CardHeader>
      </Card>

      <FormProvider {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">{t('websitePublic.studentInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('websitePublic.fullName')}</Label>
              <Input {...register('full_name')} />
              {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.fatherName')}</Label>
              <Input {...register('father_name')} />
              {errors.father_name && <p className="text-sm text-destructive">{errors.father_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.grandfatherName')}</Label>
              <Input {...register('grandfather_name')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.motherName')}</Label>
              <Input {...register('mother_name')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.gender')}</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('websitePublic.selectGender')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{t('websitePublic.male')}</SelectItem>
                      <SelectItem value="female">{t('websitePublic.female')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
            </div>
            <div className="space-y-2">
              <CalendarFormField control={control} name="birth_date" label={t('websitePublic.birthDate')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.birthYear')}</Label>
              <Input {...register('birth_year')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.age')}</Label>
              <Input type="number" {...register('age', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.applyingGrade')}</Label>
              <Input {...register('applying_grade')} />
              {errors.applying_grade && <p className="text-sm text-destructive">{errors.applying_grade.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.admissionYear')}</Label>
              <Input {...register('admission_year')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.nationality')}</Label>
              <Input {...register('nationality')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.preferredLanguage')}</Label>
              <Input {...register('preferred_language')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('websitePublic.studentPhoto')}</Label>
              <Controller
                control={control}
                name="picture"
                render={({ field }) => (
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => field.onChange(event.target.files?.[0] || null)}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">{t('websitePublic.guardianInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('websitePublic.guardianName')}</Label>
              <Input {...register('guardian_name')} />
              {errors.guardian_name && <p className="text-sm text-destructive">{errors.guardian_name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.guardianRelation')}</Label>
              <Input {...register('guardian_relation')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.guardianPhone')}</Label>
              <Input {...register('guardian_phone')} />
              {errors.guardian_phone && <p className="text-sm text-destructive">{errors.guardian_phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.guardianTazkira')}</Label>
              <Input {...register('guardian_tazkira')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('websitePublic.guardianPhoto')}</Label>
              <Controller
                control={control}
                name="guardian_picture"
                render={({ field }) => (
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => field.onChange(event.target.files?.[0] || null)}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">{t('websitePublic.addressInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('websitePublic.homeAddress')}</Label>
              <Textarea {...register('home_address')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.originProvince')}</Label>
              <Input {...register('orig_province')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.originDistrict')}</Label>
              <Input {...register('orig_district')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.originVillage')}</Label>
              <Input {...register('orig_village')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.currentProvince')}</Label>
              <Input {...register('curr_province')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.currentDistrict')}</Label>
              <Input {...register('curr_district')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.currentVillage')}</Label>
              <Input {...register('curr_village')} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">{t('websitePublic.previousSchoolSection')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('websitePublic.previousSchool')}</Label>
              <Input {...register('previous_school')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.previousGradeLevel')}</Label>
              <Input {...register('previous_grade_level')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.previousAcademicYear')}</Label>
              <Input {...register('previous_academic_year')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('websitePublic.previousSchoolNotes')}</Label>
              <Textarea {...register('previous_school_notes')} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">{t('websitePublic.additionalDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('websitePublic.emergencyContactName')}</Label>
              <Input {...register('emergency_contact_name')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.emergencyContactPhone')}</Label>
              <Input {...register('emergency_contact_phone')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.familyIncome')}</Label>
              <Input {...register('family_income')} />
            </div>
            <div className="space-y-2 flex items-center justify-between border rounded-lg px-3 py-2">
              <div>
                <Label className="text-sm">{t('websitePublic.isOrphan')}</Label>
              </div>
              <Controller
                control={control}
                name="is_orphan"
                render={({ field }) => (
                  <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.disabilityStatus')}</Label>
              <Input {...register('disability_status')} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">{t('websitePublic.guarantorInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('websitePublic.guarantorName')}</Label>
              <Input {...register('zamin_name')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.guarantorPhone')}</Label>
              <Input {...register('zamin_phone')} />
            </div>
            <div className="space-y-2">
              <Label>{t('websitePublic.guarantorTazkira')}</Label>
              <Input {...register('zamin_tazkira')} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('websitePublic.guarantorAddress')}</Label>
              <Textarea {...register('zamin_address')} />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('websitePublic.documentsSection')}</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ documentType: 'other', file: null })}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('websitePublic.addDocument')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.length === 0 && (
              <p className="text-sm text-muted-foreground">{t('websitePublic.noDocumentsAdded')}</p>
            )}
            {documents.map((doc, index) => (
              <div key={doc.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="space-y-2">
                  <Label>{t('websitePublic.documentType')}</Label>
                  <Controller
                    control={control}
                    name={`documents.${index}.documentType`}
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('websitePublic.selectType')} />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPE_KEYS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(`websitePublic.${option.key}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('websitePublic.file')}</Label>
                  <div className="flex items-center gap-2">
                    <Controller
                      control={control}
                      name={`documents.${index}.file`}
                      render={({ field }) => (
                        <Input
                          type="file"
                          onChange={(event) => field.onChange(event.target.files?.[0] || null)}
                        />
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {enabledFields.length > 0 && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">{t('websitePublic.additionalFields')}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enabledFields.map((field) => (
                <div key={field.id} className="space-y-2 md:col-span-1">
                  <Label>
                    {field.label}
                    {field.isRequired && <span className="text-destructive"> *</span>}
                  </Label>
                  {renderExtraField(field)}
                  {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

          <div className="flex justify-end gap-3">
            <Button type="submit" disabled={isSubmitting} className="min-w-[160px]">
              {isSubmitting ? t('websitePublic.submitting') : t('websitePublic.submitAdmission')}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
