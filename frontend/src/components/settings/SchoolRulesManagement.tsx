import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Save, ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import {
  useSchoolAdmissionRules,
  useUpdateSchoolAdmissionRules,
  type SchoolAdmissionRulesUpdate,
} from '@/hooks/useSchoolAdmissionRules';
/** Label keys used on the student profile rules page (PDF). Backend uses these. */
const RULES_LABEL_KEYS: { key: string; label: string }[] = [
  { key: 'commitments_title', label: 'Page title (تعهدات، ضمانت، او تائید)' },
  { key: 'commitment_title', label: 'Commitment section (تعهد نامه)' },
  { key: 'guarantee_title', label: 'Guarantee section (ضمانت نامه)' },
  { key: 'approval_title', label: 'Approval section (تائيد نامه)' },
  { key: 'signature', label: 'Signature' },
  { key: 'guarantor_signature', label: 'Guarantor signature' },
  { key: 'approval_admission', label: 'Approval admission text' },
  { key: 'was_admitted', label: 'Was admitted' },
  { key: 'approval_fee', label: 'Approval fee' },
  { key: 'approval_date', label: 'Approval date' },
  { key: 'approval_signature', label: 'Approval signature' },
  { key: 'stamp', label: 'Stamp' },
];

const schoolRulesSchema = z.object({
  commitmentItems: z
    .array(z.object({ text: z.string().min(1, 'Required').max(1000, 'Max 1000 characters') }))
    .min(1, 'At least one commitment item is required'),
  guaranteeText: z.string().min(1, 'Required').max(2000, 'Max 2000 characters'),
  labels: z.record(z.string().max(500)).optional(),
});

type SchoolRulesFormData = z.infer<typeof schoolRulesSchema>;

interface SchoolRulesManagementProps {
  schoolId: string;
  schoolName: string;
}

export function SchoolRulesManagement({ schoolId, schoolName }: SchoolRulesManagementProps) {
  const { t } = useLanguage();
  const hasUpdatePermission = useHasPermission('school_branding.update');

  const { data: rules, isLoading } = useSchoolAdmissionRules(schoolId);
  const updateRules = useUpdateSchoolAdmissionRules();

  const [labelsOpen, setLabelsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<SchoolRulesFormData>({
    resolver: zodResolver(schoolRulesSchema),
    defaultValues: {
      commitmentItems: [{ text: '' }],
      guaranteeText: '',
      labels: {},
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'commitmentItems',
  });

  // Reset form when rules are loaded (content + labels from DB)
  useEffect(() => {
    if (rules) {
      reset({
        commitmentItems: rules.commitmentItems.map((text) => ({ text })),
        guaranteeText: rules.guaranteeText,
        labels: rules.labels ?? {},
      });
    } else {
      reset({
        commitmentItems: [{ text: '' }],
        guaranteeText: '',
        labels: {},
      });
    }
  }, [rules, reset]);

  const onSubmit = async (data: SchoolRulesFormData) => {
    if (!hasUpdatePermission) {
      return;
    }

    const updateData: SchoolAdmissionRulesUpdate = {
      commitmentItems: data.commitmentItems.map((item) => item.text),
      guaranteeText: data.guaranteeText,
    };
    if (data.labels && Object.keys(data.labels).length > 0) {
      updateData.labels = data.labels;
    }

    updateRules.mutate({
      schoolId,
      ...updateData,
    });
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>
          {t('schools.schoolRules') || 'School Rules'} - {schoolName}
        </CardTitle>
        <CardDescription>
          {t('schools.editSchoolRules') || 'Manage admission rules (شرائط و تعهدات) for this school'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Commitment Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {t('schools.commitmentItems') || 'Commitment Items (تعهد نامه)'}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ text: '' })}
                disabled={!hasUpdatePermission}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('common.add') || 'Add'}
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('schools.noCommitmentItems') || 'No commitment items. Click "Add" to add one.'}
              </p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <div className="flex flex-col gap-1 mt-3">
                    {hasUpdatePermission && index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => move(index, index - 1)}
                        className="h-6 w-6 p-0"
                        title={t('common.moveUp') || 'Move up'}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                    )}
                    {hasUpdatePermission && index < fields.length - 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => move(index, index + 1)}
                        className="h-6 w-6 p-0"
                        title={t('common.moveDown') || 'Move down'}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex-1">
                    <Textarea
                      {...register(`commitmentItems.${index}.text`)}
                      placeholder={`${t('schools.commitmentItem') || 'Commitment item'} ${index + 1}`}
                      className="min-h-[80px]"
                      disabled={!hasUpdatePermission}
                    />
                    {errors.commitmentItems?.[index]?.text && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.commitmentItems[index]?.text?.message}
                      </p>
                    )}
                  </div>
                  {hasUpdatePermission && fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="mt-3"
                      title={t('common.delete') || 'Delete'}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {errors.commitmentItems && (
              <p className="text-sm text-destructive">
                {errors.commitmentItems.message || 'At least one commitment item is required'}
              </p>
            )}
          </div>

          {/* Guarantee Text */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">
              {t('schools.guaranteeText') || 'Guarantee Text (ضمانت نامه)'}
            </Label>
            <Textarea
              {...register('guaranteeText')}
              placeholder={t('schools.guaranteeTextPlaceholder') || 'Enter guarantee text...'}
              className="min-h-[120px]"
              disabled={!hasUpdatePermission}
            />
            {errors.guaranteeText && (
              <p className="text-sm text-destructive">{errors.guaranteeText.message}</p>
            )}
          </div>

          {/* Section labels (used on student profile PDF rules page) */}
          <Collapsible open={labelsOpen} onOpenChange={setLabelsOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-between">
                <span>
                  {t('schools.sectionLabels') || 'Section labels (PDF rules page)'}
                </span>
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${labelsOpen ? 'rotate-90' : ''}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-4 space-y-3 border-t mt-4">
                <p className="text-sm text-muted-foreground">
                  {t('schools.sectionLabelsDescription') ||
                    'Labels shown on the second page of the student profile PDF. Leave blank to use server defaults.'}
                </p>
                {RULES_LABEL_KEYS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-sm font-normal text-muted-foreground">{label}</Label>
                    <Input
                      {...register(`labels.${key}`)}
                      placeholder={label}
                      className="font-normal"
                      disabled={!hasUpdatePermission}
                    />
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Save Button */}
          {hasUpdatePermission && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="submit"
                disabled={updateRules.isPending || !isDirty}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateRules.isPending
                  ? t('common.saving') || 'Saving...'
                  : t('common.save') || 'Save'}
              </Button>
            </div>
          )}

          {!hasUpdatePermission && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t('common.noPermission') || 'You do not have permission to edit school rules'}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
