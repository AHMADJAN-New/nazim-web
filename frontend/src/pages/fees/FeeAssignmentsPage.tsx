import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFeeAssignments, useBulkAssignFeeAssignments, useFeeStructures } from '@/hooks/useFees';
import { feeAssignmentSchema, type FeeAssignmentFormData } from '@/lib/validations/fees';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLanguage } from '@/hooks/useLanguage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useEffect } from 'react';
import { showToast } from '@/lib/toast';
import type { ZodIssue } from 'zod';

export default function FeeAssignmentsPage() {
  const { t } = useLanguage();
  const [filterAcademicYear, setFilterAcademicYear] = useState<string | undefined>(undefined);
  const [filterClassAy, setFilterClassAy] = useState<string | undefined>(undefined);

  const { data: academicYears = [] } = useAcademicYears();
  const { data: classAcademicYears = [] } = useClassAcademicYears(filterAcademicYear);
  const { data: structures = [] } = useFeeStructures({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });

  const classAyById = useMemo(
    () => Object.fromEntries(classAcademicYears.map((cay) => [cay.id, cay])),
    [classAcademicYears],
  );

  const { data: assignments = [], isLoading } = useFeeAssignments({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });
  const createMutation = useBulkAssignFeeAssignments();
  const [open, setOpen] = useState(false);

  const form = useForm<FeeAssignmentFormData>({
    resolver: zodResolver(feeAssignmentSchema),
    defaultValues: {
      fee_structure_id: '',
      academic_year_id: '',
      class_id: '',
      class_academic_year_id: '',
      assigned_amount: undefined,
      due_date: '',
      payment_period_start: '',
      payment_period_end: '',
      notes: '',
      school_id: '',
    },
  });

  const handleSubmit = async (values: FeeAssignmentFormData) => {
    try {
      const classAy = classAcademicYears.find((cay) => cay.id === values.class_academic_year_id);
      await createMutation.mutateAsync({
        feeStructureId: values.fee_structure_id,
        academicYearId: values.academic_year_id,
        classId: classAy?.classId || values.class_id,
        classAcademicYearId: values.class_academic_year_id,
        assignedAmount: values.assigned_amount,
        dueDate: values.due_date,
        paymentPeriodStart: values.payment_period_start ?? null,
        paymentPeriodEnd: values.payment_period_end ?? null,
        notes: values.notes,
      schoolId: values.school_id ? values.school_id : null,
      });
      form.reset();
      setOpen(false);
    } catch (error) {
      const message = (error as Error)?.message || t('toast.feeAssignmentCreateFailed');
      showToast.error(message);
    }
  };

  const handleError = (errors: unknown) => {
    const firstError =
      (Array.isArray((errors as any)?.issues) &&
        ((errors as any).issues as ZodIssue[])[0]?.message) ||
      (typeof errors === 'object' && errors !== null && 'root' in (errors as any)
        ? (errors as any).root?.message
        : undefined);

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('[FeeAssignments] validation errors', errors);
    }

    showToast.error(firstError || t('toast.feeAssignmentCreateFailed'));
  };

  const structuresById = useMemo(
    () => Object.fromEntries(structures.map((s) => [s.id, s])),
    [structures],
  );

  useEffect(() => {
    if (!filterAcademicYear && academicYears.length > 0) {
      const firstAy = academicYears[0];
      setFilterAcademicYear(firstAy.id);
      form.setValue('academic_year_id', firstAy.id);
    }
  }, [academicYears, filterAcademicYear, form]);

  // Keep form academic year in sync with selected filter
  useEffect(() => {
    if (filterAcademicYear && form.getValues('academic_year_id') !== filterAcademicYear) {
      form.setValue('academic_year_id', filterAcademicYear);
      form.setValue('class_academic_year_id', '');
      form.setValue('class_id', '');
    }
  }, [filterAcademicYear, form]);

  // Prefill class academic year when available and none selected
  useEffect(() => {
    const selectedClassAy = form.getValues('class_academic_year_id');
    if (!selectedClassAy && classAcademicYears.length === 1) {
      const onlyCay = classAcademicYears[0];
      form.setValue('class_academic_year_id', onlyCay.id);
      form.setValue('class_id', onlyCay.classId || '');
    }
  }, [classAcademicYears, form]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('fees.assignments')}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>{t('fees.addAssignment')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{t('fees.addAssignment')}</DialogTitle>
              <DialogDescription className="sr-only">{t('fees.addAssignment')}</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit, handleError)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="academic_year_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fees.academicYear')}</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || ''}
                            onValueChange={(value) => {
                              field.onChange(value);
                              form.setValue('class_academic_year_id', '');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('fees.selectAcademicYear')} />
                            </SelectTrigger>
                            <SelectContent>
                              {academicYears.map((ay) => (
                                <SelectItem key={ay.id} value={ay.id}>
                                  {ay.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="class_academic_year_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fees.class')}</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || ''}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const selected = classAcademicYears.find((cay) => cay.id === value);
                              form.setValue('class_id', selected?.classId || '');
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('fees.selectClass')} />
                            </SelectTrigger>
                            <SelectContent>
                              {classAcademicYears.map((cay) => (
                                <SelectItem key={cay.id} value={cay.id}>
                                  {cay.class?.name ?? cay.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fee_structure_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fees.structure')}</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || ''}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const structure = structuresById[value];
                              if (structure?.amount) {
                                form.setValue('assigned_amount', structure.amount);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('fees.selectStructure')} />
                            </SelectTrigger>
                            <SelectContent>
                              {structures.map((structure) => (
                                <SelectItem key={structure.id} value={structure.id}>
                                  {structure.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assigned_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fees.amountAssigned')}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fees.dueDate')}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_period_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fees.paymentPeriodStart')}</FormLabel>
                        <FormControl>
                          <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_period_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('fees.paymentPeriodEnd')}</FormLabel>
                        <FormControl>
                          <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('fees.notes')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={createMutation.isPending}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('fees.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm font-medium">{t('fees.academicYear')}</span>
            <Select
              value={filterAcademicYear || ''}
              onValueChange={(val) => {
                setFilterAcademicYear(val || undefined);
                setFilterClassAy(undefined);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fees.selectAcademicYear')} />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.id} value={ay.id}>
                    {ay.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-sm font-medium">{t('fees.class')}</span>
            <Select value={filterClassAy || ''} onValueChange={(val) => setFilterClassAy(val || undefined)}>
              <SelectTrigger>
                <SelectValue placeholder={t('fees.selectClass')} />
              </SelectTrigger>
              <SelectContent>
                {classAcademicYears.map((cay) => (
                  <SelectItem key={cay.id} value={cay.id}>
                    {cay.class?.name ?? cay.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('fees.assignments')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fees.class')}</TableHead>
                  <TableHead>{t('fees.structure')}</TableHead>
                  <TableHead>{t('fees.amountAssigned')}</TableHead>
                  <TableHead>{t('fees.paid')}</TableHead>
                  <TableHead>{t('fees.remaining')}</TableHead>
                  <TableHead>{t('fees.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {classAyById[assignment.classAcademicYearId || '']?.class?.name ??
                        assignment.classAcademicYearId}
                    </TableCell>
                    <TableCell>{structuresById[assignment.feeStructureId]?.name ?? assignment.feeStructureId}</TableCell>
                    <TableCell>{assignment.assignedAmount.toFixed(2)}</TableCell>
                    <TableCell>{assignment.paidAmount.toFixed(2)}</TableCell>
                    <TableCell>{assignment.remainingAmount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{assignment.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

