import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feeExceptionSchema, type FeeExceptionFormData } from '@/lib/validations/fees';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { useLanguage } from '@/hooks/useLanguage';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { useAuth } from '@/hooks/useAuth';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useEffect, useMemo, useState } from 'react';

interface FeeExceptionFormProps {
  defaultValues?: Partial<FeeExceptionFormData>;
  assignments?: Array<{
    label: string;
    value: string;
    studentId: string;
    classAcademicYearId?: string | null;
    academicYearId?: string;
  }>;
  classAcademicYears?: Array<{
    id: string;
    class?: { name: string };
    sectionName?: string | null;
  }>;
  academicYears?: Array<{
    id: string;
    name: string;
    isCurrent?: boolean;
  }>;
  currentAcademicYearId?: string;
  onSubmit: (values: FeeExceptionFormData) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function FeeExceptionForm({
  defaultValues,
  assignments = [],
  classAcademicYears = [],
  academicYears = [],
  currentAcademicYearId,
  onSubmit,
  onCancel,
  isSubmitting,
}: FeeExceptionFormProps) {
  const { t } = useLanguage();
  const { profile } = useAuth();
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>(currentAcademicYearId || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  // Get student admissions with filters (active status, class, academic year)
  const { data: studentAdmissions = [] } = useStudentAdmissions(profile?.organization_id, false, {
    enrollment_status: 'active',
    class_academic_year_id: selectedClassId || undefined,
    academic_year_id: selectedAcademicYearId || undefined,
  });
  
  // No need for client-side filtering - already filtered by API
  const filteredStudents = studentAdmissions;

  // Create class options
  const classOptions: ComboboxOption[] = useMemo(
    () =>
      classAcademicYears.map((cay) => ({
        value: cay.id,
        label: `${cay.class?.name ?? cay.id}${cay.sectionName ? ` - ${cay.sectionName}` : ''}`,
      })),
    [classAcademicYears]
  );

  // Create academic year options
  const academicYearOptions: ComboboxOption[] = useMemo(
    () =>
      academicYears.map((ay) => ({
        value: ay.id,
        label: `${ay.name}${ay.isCurrent ? ` (${t('academic.academicYears.current')})` : ''}`,
      })),
    [academicYears, t]
  );

  // Create student options (searchable)
  const studentOptions: ComboboxOption[] = useMemo(() => {
    return filteredStudents.map((admission) => {
      const student = admission.student;
      const name = student?.fullName || 'Unknown';
      const admissionNo = student?.admissionNumber || '';
      const rollNumber = student?.rollNumber || '';
      
      let label = name;
      if (admissionNo) label += ` (${admissionNo})`;
      if (rollNumber) label += ` • Roll ${rollNumber}`;
      
      return {
        value: admission.studentId,
        label,
      };
    });
  }, [filteredStudents]);

  // Filter assignments by class, academic year, and student
  const filteredAssignments = useMemo(() => {
    if (!selectedClassId || !selectedAcademicYearId) {
      return [];
    }
    
    return assignments.filter((assignment) => {
      // Filter by class
      if (assignment.classAcademicYearId !== selectedClassId) {
        return false;
      }
      
      // Filter by academic year
      if (assignment.academicYearId !== selectedAcademicYearId) {
        return false;
      }
      
      // Filter by student if selected
      if (selectedStudentId && assignment.studentId !== selectedStudentId) {
        return false;
      }
      
      return true;
    });
  }, [assignments, selectedClassId, selectedAcademicYearId, selectedStudentId]);

  const form = useForm<FeeExceptionFormData>({
    resolver: zodResolver(feeExceptionSchema),
    defaultValues: {
      fee_assignment_id: defaultValues?.fee_assignment_id ?? '',
      student_id: defaultValues?.student_id ?? '',
      exception_type: defaultValues?.exception_type ?? 'discount_fixed',
      exception_amount: defaultValues?.exception_amount ?? 0,
      exception_reason: defaultValues?.exception_reason ?? '',
      approved_by_user_id: defaultValues?.approved_by_user_id ?? profile?.id ?? '',
      approved_at: defaultValues?.approved_at ?? '',
      valid_from: defaultValues?.valid_from ?? '',
      valid_to: defaultValues?.valid_to ?? '',
      is_active: defaultValues?.is_active ?? true,
      notes: defaultValues?.notes ?? '',
      organization_id: defaultValues?.organization_id ?? profile?.organization_id ?? '',
    },
  });

  // Reset form when defaultValues change (for edit mode or new form)
  useEffect(() => {
    const resetValues = {
      fee_assignment_id: defaultValues?.fee_assignment_id ?? '',
      student_id: defaultValues?.student_id ?? '',
      exception_type: defaultValues?.exception_type ?? 'discount_fixed',
      exception_amount: defaultValues?.exception_amount ?? 0,
      exception_reason: defaultValues?.exception_reason ?? '',
      approved_by_user_id: defaultValues?.approved_by_user_id ?? profile?.id ?? '',
      approved_at: defaultValues?.approved_at ?? (defaultValues ? '' : new Date().toISOString().slice(0, 10)),
      valid_from: defaultValues?.valid_from ?? (defaultValues ? '' : new Date().toISOString().slice(0, 10)),
      valid_to: defaultValues?.valid_to ?? '',
      is_active: defaultValues?.is_active ?? true,
      notes: defaultValues?.notes ?? '',
      organization_id: defaultValues?.organization_id ?? profile?.organization_id ?? '',
    };
    form.reset(resetValues);
  }, [defaultValues, form, profile]);

  // Set approved_by_user_id and organization_id when form values change
  useEffect(() => {
    if (profile?.id && !form.getValues('approved_by_user_id')) {
      form.setValue('approved_by_user_id', profile.id);
    }
    if (profile?.organization_id && !form.getValues('organization_id')) {
      form.setValue('organization_id', profile.organization_id);
    }
  }, [form, profile]);

  // Set default academic year when currentAcademicYearId is available
  useEffect(() => {
    if (currentAcademicYearId && !selectedAcademicYearId) {
      setSelectedAcademicYearId(currentAcademicYearId);
    }
  }, [currentAcademicYearId, selectedAcademicYearId]);

  // Reset student when class changes
  useEffect(() => {
    if (selectedClassId) {
      setSelectedStudentId('');
      form.setValue('student_id', '');
    }
  }, [selectedClassId, form]);

  // Update form when student is selected
  useEffect(() => {
    if (selectedStudentId) {
      form.setValue('student_id', selectedStudentId);
    }
  }, [selectedStudentId, form]);

  const handleSubmit = async (values: FeeExceptionFormData) => {
    // Ensure required fields are set
    const submitValues: FeeExceptionFormData = {
      ...values,
      approved_by_user_id: values.approved_by_user_id || profile?.id || '',
      organization_id: values.organization_id || profile?.organization_id || '',
    };
    await onSubmit(submitValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Class Selection */}
        <FormItem>
          <FormLabel>{t('fees.class')}</FormLabel>
          <Combobox
            options={classOptions}
            value={selectedClassId}
            onValueChange={(val) => {
              setSelectedClassId(val);
            }}
            placeholder={t('fees.selectClass') || 'Select class...'}
            searchPlaceholder={t('common.search') || 'Search classes...'}
            emptyText={t('common.noResults') || 'No classes found.'}
          />
        </FormItem>

        {/* Academic Year Selection */}
        <FormItem>
          <FormLabel>{t('fees.academicYear')}</FormLabel>
          <Combobox
            options={academicYearOptions}
            value={selectedAcademicYearId}
            onValueChange={(val) => {
              setSelectedAcademicYearId(val);
            }}
            placeholder={t('fees.selectAcademicYear') || 'Select academic year...'}
            searchPlaceholder={t('common.search') || 'Search academic years...'}
            emptyText={t('common.noResults') || 'No academic years found.'}
          />
        </FormItem>

        {/* Student Selection (only shown when class is selected) */}
        {selectedClassId && (
          <FormItem>
            <FormLabel>{t('fees.student')}</FormLabel>
            <Combobox
              options={studentOptions}
              value={selectedStudentId}
              onValueChange={(val) => {
                setSelectedStudentId(val);
              }}
              placeholder={t('fees.selectStudent') || 'Select student...'}
              searchPlaceholder={t('common.search') || 'Search students...'}
              emptyText={t('common.noResults') || 'No students found.'}
            />
          </FormItem>
        )}

        {/* Fee Assignment Selection */}
        <FormField
          control={form.control}
          name="fee_assignment_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fees.assignment')}</FormLabel>
              <Select
                value={field.value ?? ''}
                onValueChange={(val) => {
                  field.onChange(val);
                  // Don't auto-select student - keep selections independent
                }}
                disabled={!selectedClassId || !selectedAcademicYearId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('fees.selectAssignment')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredAssignments.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
              {(!selectedClassId || !selectedAcademicYearId) && (
                <FormDescription>
                  {t('fees.selectClassAndAcademicYearFirst') || 'Please select class and academic year first.'}
                </FormDescription>
              )}
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="exception_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.exceptionType')}</FormLabel>
                <Select value={field.value ?? 'discount_fixed'} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('fees.exceptionType')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="discount_percentage">{t('fees.exceptionTypes.discount_percentage')}</SelectItem>
                    <SelectItem value="discount_fixed">{t('fees.exceptionTypes.discount_fixed')}</SelectItem>
                    <SelectItem value="waiver">{t('fees.exceptionTypes.waiver')}</SelectItem>
                    <SelectItem value="custom">{t('fees.exceptionTypes.custom')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="exception_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.exceptionAmount')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <CalendarFormField control={form.control} name="valid_from" label={t('fees.validFrom')} />

          <CalendarFormField control={form.control} name="valid_to" label={t('fees.validTo')} />
        </div>

        <FormField
          control={form.control}
          name="exception_reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fees.exceptionReason')}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={t('fees.exceptionReasonPlaceholder') || 'Enter the reason for this exception...'} 
                  value={field.value ?? ''} 
                  onChange={field.onChange}
                  rows={3}
                  className="resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="approved_by_user_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fees.approvedBy') || 'Approved By'}</FormLabel>
                <FormControl>
                  <Input 
                    type="text"
                    value={profile?.full_name || profile?.email || field.value || ''} 
                    onChange={() => {}} // Read-only
                    disabled
                    className="bg-muted"
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  {t('fees.currentUserWillBeApprover') || 'Current user will be set as approver'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <CalendarFormField control={form.control} name="approved_at" label={t('fees.approvedAt') || 'Approved At'} />
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">{t('fees.isActive') || 'Active'}</FormLabel>
                <FormDescription>
                  {t('fees.isActiveDescription') || 'Whether this exception is currently active'}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value ?? true}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('fees.notes')}</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder={t('fees.notesPlaceholder') || 'Enter any additional notes...'} 
                  value={field.value ?? ''} 
                  onChange={field.onChange}
                  rows={3}
                  className="resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

