import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Trash2, Users, GraduationCap, Plus } from 'lucide-react';
import { Eye, ExternalLink } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import type { ZodIssue } from 'zod';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import {
  useFeeAssignments,
  useBulkAssignFeeAssignments,
  useFeeStructures,
  useUpdateFeeAssignment,
  useDeleteFeeAssignment,
  type FeeAssignment,
} from '@/hooks/useFees';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { feeAssignmentSchema, type FeeAssignmentFormData } from '@/lib/validations/fees';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAcademicYears, useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDate, formatCurrency } from '@/lib/utils';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';

export default function FeeAssignmentsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: academicYears = [], isLoading: academicYearsLoading } = useAcademicYears();
  const { data: currentAcademicYear, isLoading: currentAcademicYearLoading } = useCurrentAcademicYear();

  // Initialize with empty string to keep Select controlled (never undefined)
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('');
  const [filterClassAy, setFilterClassAy] = useState<string>('all'); // Use 'all' instead of undefined to keep controlled
  const [editingAssignment, setEditingAssignment] = useState<FeeAssignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<FeeAssignment | null>(null);
  const [viewingAssignment, setViewingAssignment] = useState<FeeAssignment | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  // Auto-select current academic year, or fall back to first academic year
  // This logic matches FeeReportsPage for consistency
  useEffect(() => {
    // Only run if we're not loading and no academic year is selected
    if (academicYearsLoading || currentAcademicYearLoading) {
      return; // Wait for data to load
    }

    if (filterAcademicYear === '' && academicYears.length > 0) {
      // First, try to find current year from the list (most reliable)
      const currentYearFromList = academicYears.find(ay => ay.isCurrent === true);
      
      if (currentYearFromList) {
        // Use the current year from the list
        if (import.meta.env.DEV) {
          console.log('[FeeAssignmentsPage] Auto-selecting current academic year from list:', currentYearFromList.id, currentYearFromList.name);
        }
        setFilterAcademicYear(currentYearFromList.id);
        return;
      }

      // Fall back to the hook result if available
      if (currentAcademicYear) {
        if (import.meta.env.DEV) {
          console.log('[FeeAssignmentsPage] Auto-selecting current academic year from hook:', currentAcademicYear.id, currentAcademicYear.name);
        }
        setFilterAcademicYear(currentAcademicYear.id);
        return;
      }

      // Finally, fall back to first academic year if no current year is set
      if (import.meta.env.DEV) {
        console.log('[FeeAssignmentsPage] No current year found, falling back to first academic year:', academicYears[0].id, academicYears[0].name);
      }
      setFilterAcademicYear(academicYears[0].id);
    }
  }, [academicYears, academicYearsLoading, currentAcademicYear, currentAcademicYearLoading, filterAcademicYear]);
  const { data: classAcademicYears = [] } = useClassAcademicYears(filterAcademicYear || undefined);
  const { data: structures = [] } = useFeeStructures({
    academicYearId: filterAcademicYear || undefined,
    classAcademicYearId: filterClassAy === 'all' ? undefined : filterClassAy,
  });

  const classAyById = useMemo(
    () => Object.fromEntries(classAcademicYears.map((cay) => [cay.id, cay])),
    [classAcademicYears],
  );

  const {
    data: assignments = [],
    isLoading,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
    refetch: refetchAssignments,
  } = useFeeAssignments(
    {
      academicYearId: filterAcademicYear || undefined,
      classAcademicYearId: filterClassAy === 'all' ? undefined : filterClassAy,
    },
    true
  );

  // Check for view query param and auto-open side panel
  useEffect(() => {
    const viewAssignmentId = searchParams.get('view');
    if (viewAssignmentId && assignments.length > 0) {
      const assignment = assignments.find(a => a.id === viewAssignmentId);
      if (assignment) {
        setViewingAssignment(assignment);
        setSidePanelOpen(true);
        // Clean up URL
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, assignments, setSearchParams]);
  const createMutation = useBulkAssignFeeAssignments();
  const updateMutation = useUpdateFeeAssignment();
  const deleteMutation = useDeleteFeeAssignment();
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
      if (editingAssignment) {
        await updateMutation.mutateAsync({
          id: editingAssignment.id,
          data: {
            feeStructureId: values.fee_structure_id || editingAssignment.feeStructureId,
            assignedAmount: values.assigned_amount ?? editingAssignment.assignedAmount,
            dueDate: values.due_date ? new Date(values.due_date) : editingAssignment.dueDate,
            paymentPeriodStart: values.payment_period_start ? new Date(values.payment_period_start) : editingAssignment.paymentPeriodStart,
            paymentPeriodEnd: values.payment_period_end ? new Date(values.payment_period_end) : editingAssignment.paymentPeriodEnd,
            notes: values.notes || editingAssignment.notes,
          },
        });
        setEditingAssignment(null);
      } else {
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
      }
      form.reset();
      setOpen(false);
      // Refetch assignments to show updated data
      await refetchAssignments();
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
       
      console.error('[FeeAssignments] validation errors', errors);
    }

    showToast.error(firstError || t('toast.feeAssignmentCreateFailed'));
  };

  // Get status badge with appropriate colors
  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let className = '';

    switch (statusLower) {
      case 'paid':
        variant = 'default';
        className = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
        break;
      case 'partial':
        variant = 'secondary';
        className = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
        break;
      case 'pending':
        variant = 'outline';
        className = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800';
        break;
      case 'overdue':
        variant = 'destructive';
        className = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
        break;
      case 'waived':
        variant = 'secondary';
        className = 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
        break;
      default:
        variant = 'outline';
        className = 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }

    return (
      <Badge variant={variant} className={className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Get fee type badge
  const getFeeTypeBadge = (feeType: string | undefined) => {
    if (!feeType) return null;
    
    const typeLower = feeType.toLowerCase();
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let className = '';

    switch (typeLower) {
      case 'monthly':
        variant = 'default';
        className = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        break;
      case 'one_time':
      case 'one-time':
        variant = 'secondary';
        className = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
        break;
      case 'semester':
        variant = 'outline';
        className = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
        break;
      case 'annual':
        variant = 'default';
        className = 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800';
        break;
      default:
        variant = 'outline';
    }

    return (
      <Badge variant={variant} className={className}>
        {feeType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  // Get combined structure name and fee type badge
  const getStructureBadge = (structureName: string | undefined, feeType: string | undefined) => {
    if (!structureName && !feeType) return null;
    
    const typeLower = feeType?.toLowerCase() || '';
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let className = '';

    switch (typeLower) {
      case 'monthly':
        variant = 'default';
        className = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        break;
      case 'one_time':
      case 'one-time':
        variant = 'secondary';
        className = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
        break;
      case 'semester':
        variant = 'outline';
        className = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
        break;
      case 'annual':
        variant = 'default';
        className = 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800';
        break;
      default:
        variant = 'outline';
    }

    const formattedType = feeType ? feeType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
    const badgeText = structureName && formattedType 
      ? `${structureName} (${formattedType})`
      : structureName || formattedType || 'N/A';

    return (
      <Badge variant={variant} className={className}>
        {badgeText}
      </Badge>
    );
  };

  const handleView = (assignment: FeeAssignment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setViewingAssignment(assignment);
    setSidePanelOpen(true);
  };

  const handleEdit = (assignment: FeeAssignment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingAssignment(assignment);
    form.reset({
      fee_structure_id: assignment.feeStructureId,
      academic_year_id: assignment.academicYearId,
      class_academic_year_id: assignment.classAcademicYearId || '',
      assigned_amount: assignment.assignedAmount,
      due_date: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
      payment_period_start: assignment.paymentPeriodStart
        ? new Date(assignment.paymentPeriodStart).toISOString().split('T')[0]
        : '',
      payment_period_end: assignment.paymentPeriodEnd
        ? new Date(assignment.paymentPeriodEnd).toISOString().split('T')[0]
        : '',
      notes: assignment.notes || '',
      school_id: assignment.schoolId || '',
    });
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingAssignment) return;
    try {
      await deleteMutation.mutateAsync(deletingAssignment.id);
      setDeletingAssignment(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const structuresById = useMemo(
    () => Object.fromEntries(structures.map((s) => [s.id, s])),
    [structures],
  );

  // Group assignments by class
  const assignmentsByClass = useMemo(() => {
    const grouped = new Map<string, FeeAssignment[]>();
    assignments.forEach((assignment) => {
      const key = assignment.classAcademicYearId || 'unknown';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(assignment);
    });
    return Array.from(grouped.entries()).map(([classId, assignments]) => ({
      classId,
      className: classAyById[classId]?.class?.name || classId,
      assignments,
      totalAssigned: assignments.reduce((sum, a) => sum + a.assignedAmount, 0),
      totalPaid: assignments.reduce((sum, a) => sum + a.paidAmount, 0),
      totalRemaining: assignments.reduce((sum, a) => sum + a.remainingAmount, 0),
    }));
  }, [assignments, classAyById]);


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

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setEditingAssignment(null);
      form.reset();
    }
  }, [open, form]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('fees.assignments')}
        icon={<GraduationCap className="h-5 w-5" />}
        primaryAction={{
          label: t('fees.addAssignment'),
          onClick: () => {
            setEditingAssignment(null);
            form.reset();
            setOpen(true);
          },
          icon: <Plus className="h-4 w-4" />,
        }}
        rightSlot={
          <ReportExportButtons
            data={assignments}
            columns={[
              { key: 'studentName', label: t('fees.student'), align: 'left' },
              { key: 'className', label: t('search.class'), align: 'left' },
              { key: 'structureName', label: t('fees.structure'), align: 'left' },
              { key: 'assignedAmount', label: t('fees.amountAssigned'), align: 'right' },
              { key: 'paidAmount', label: t('fees.paid'), align: 'right' },
              { key: 'remainingAmount', label: t('fees.remaining'), align: 'right' },
              { key: 'dueDate', label: t('fees.dueDate'), align: 'left' },
              { key: 'status', label: t('events.status'), align: 'center' },
            ]}
            reportKey="fee_assignments"
            title={t('fees.assignments') || 'Fee Assignments'}
            transformData={(data) =>
              data.map((assignment) => ({
                studentName: (assignment as any).student?.full_name || assignment.studentId || 'Unknown',
                className: classAyById[assignment.classAcademicYearId || '']?.class?.name || assignment.classAcademicYearId || '-',
                structureName: structuresById[assignment.feeStructureId]?.name || assignment.feeStructureId || '-',
                assignedAmount: formatCurrency(assignment.assignedAmount),
                paidAmount: formatCurrency(assignment.paidAmount),
                remainingAmount: formatCurrency(assignment.remainingAmount),
                dueDate: assignment.dueDate ? formatDate(assignment.dueDate) : '-',
                status: assignment.status?.charAt(0).toUpperCase() + assignment.status?.slice(1) || '-',
              }))
            }
            buildFiltersSummary={() => {
              const parts: string[] = [];
              const ay = academicYears.find(a => a.id === filterAcademicYear);
              if (ay) parts.push(`${t('fees.academicYear')}: ${ay.name}`);
              if (filterClassAy !== 'all') {
                const cay = classAcademicYears.find(c => c.id === filterClassAy);
                if (cay) parts.push(`${t('search.class')}: ${cay.class?.name || filterClassAy}`);
              }
              return parts.join(' | ');
            }}
            templateType="fee_assignments"
            disabled={isLoading || assignments.length === 0}
          />
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? t('fees.editAssignment') : t('fees.addAssignment')}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingAssignment ? t('fees.editAssignment') : t('fees.addAssignment')}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, handleError)} className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                          disabled={!!editingAssignment}
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
                        <FormLabel>{t('search.class')}</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value || ''}
                            onValueChange={(value) => {
                              field.onChange(value);
                              const selected = classAcademicYears.find((cay) => cay.id === value);
                              form.setValue('class_id', selected?.classId || '');
                            }}
                            disabled={!!editingAssignment}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('events.selectClass')} />
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
                              if (structure?.amount && !editingAssignment) {
                                form.setValue('assigned_amount', structure.amount);
                              }
                            }}
                            disabled={!!editingAssignment}
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

                  <CalendarFormField control={form.control} name="due_date" label={t('fees.dueDate')} />

                  <CalendarFormField control={form.control} name="payment_period_start" label={t('fees.paymentPeriodStart')} />

                  <CalendarFormField control={form.control} name="payment_period_end" label={t('fees.paymentPeriodEnd')} />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('events.notes')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setEditingAssignment(null);
                    }}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {t('events.cancel')}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending
                      ? t('events.saving')
                      : editingAssignment
                        ? t('events.update')
                        : t('events.save')}
                  </Button>
                </div>
              </form>
            </Form>
            </DialogContent>
          </Dialog>

      <FilterPanel title={t('events.filters')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium">{t('fees.academicYear')}</span>
            <Select
              value={filterAcademicYear || ''}
              onValueChange={async (val) => {
                setFilterAcademicYear(val || '');
                setFilterClassAy('all'); // Reset to 'all' when academic year changes
                // Refetch assignments when academic year changes
                await refetchAssignments();
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
            <span className="text-sm font-medium">{t('search.class')}</span>
            <Select
              value={filterClassAy}
              onValueChange={async (val) => {
                setFilterClassAy(val);
                // Refetch assignments when class filter changes
                await refetchAssignments();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('events.selectClass')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('students.allClasses')}</SelectItem>
                {classAcademicYears.map((cay) => (
                  <SelectItem key={cay.id} value={cay.id}>
                    {cay.class?.name ?? cay.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterPanel>

      <Tabs defaultValue="classes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            {t('fees.assignedClasses') || 'Assigned Classes'}
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('table.students') || 'Students'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle>{t('fees.assignedClasses') || 'Assigned Classes'}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>{t('common.loading')}</p>
              ) : assignmentsByClass.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t('events.noData') || 'No data available'}</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('search.class')}</TableHead>
                      <TableHead>{t('fees.structure')}</TableHead>
                      <TableHead className="text-right">{t('fees.amountAssigned')}</TableHead>
                      <TableHead className="text-right">{t('fees.paid')}</TableHead>
                      <TableHead className="text-right">{t('fees.remaining')}</TableHead>
                      <TableHead>{t('events.status')}</TableHead>
                      <TableHead className="text-right">{t('events.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignmentsByClass.map((classGroup) =>
                      classGroup.assignments.map((assignment) => (
                        <TableRow 
                          key={assignment.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleView(assignment)}
                        >
                          <TableCell>
                            <div className="font-medium">{classGroup.className}</div>
                          </TableCell>
                          <TableCell>
                            {getStructureBadge(
                              structuresById[assignment.feeStructureId]?.name ?? assignment.feeStructureId,
                              structuresById[assignment.feeStructureId]?.feeType
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold">{formatCurrency(assignment.assignedAmount)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {formatCurrency(assignment.paidAmount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={assignment.remainingAmount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                              {formatCurrency(assignment.remainingAmount)}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={(e) => handleView(assignment, e)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => handleEdit(assignment, e)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingAssignment(assignment);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )),
                    )}
                  </TableBody>
                </Table>
                </div>
                {pagination && (
                  <DataTablePagination
                    table={{
                      getState: () => ({
                        pagination: { pageIndex: page - 1, pageSize },
                      }),
                      setPageIndex: (index: number) => {
                        setPage(index + 1);
                      },
                      setPageSize: (size: number) => {
                        setPageSize(size);
                        setPage(1);
                      },
                      getPageCount: () => pagination.last_page,
                      getRowCount: () => pagination.total,
                      getRowModel: () => ({ rows: [] }),
                      options: { data: assignments },
                    } as any}
                    paginationMeta={pagination}
                    onPageChange={setPage}
                    onPageSizeChange={(newPageSize) => {
                      setPageSize(newPageSize);
                      setPage(1);
                    }}
                    showPageSizeSelector={true}
                    showTotalCount={true}
                  />
                )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>{t('table.students') || 'Students'}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>{t('common.loading')}</p>
              ) : assignments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">{t('events.noData') || 'No data available'}</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('fees.student')}</TableHead>
                      <TableHead>{t('search.class')}</TableHead>
                      <TableHead>{t('fees.structure')}</TableHead>
                      <TableHead className="text-right">{t('fees.amountAssigned')}</TableHead>
                      <TableHead className="text-right">{t('fees.paid')}</TableHead>
                      <TableHead className="text-right">{t('fees.remaining')}</TableHead>
                      <TableHead>{t('events.status')}</TableHead>
                      <TableHead className="text-right">{t('events.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => {
                      // Get student name from assignment (if loaded via relationship)
                      // The backend loads student relationship, but mapper doesn't preserve it
                      // So we access it from the raw API response if available
                      const studentName = (assignment as any).student?.full_name || assignment.studentId || 'Unknown';
                      return (
                        <TableRow 
                          key={assignment.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleView(assignment)}
                        >
                          <TableCell>
                            <div className="font-medium">{studentName}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                              {(classAyById[assignment.classAcademicYearId || '']?.class?.name) ?? (assignment.classAcademicYearId || '-')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStructureBadge(
                              structuresById[assignment.feeStructureId]?.name ?? assignment.feeStructureId,
                              structuresById[assignment.feeStructureId]?.feeType
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold">{formatCurrency(assignment.assignedAmount)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {formatCurrency(assignment.paidAmount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={assignment.remainingAmount > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                              {formatCurrency(assignment.remainingAmount)}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(assignment.status)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={(e) => handleView(assignment, e)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => handleEdit(assignment, e)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingAssignment(assignment);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
                {pagination && (
                  <DataTablePagination
                    table={{
                      getState: () => ({
                        pagination: { pageIndex: page - 1, pageSize },
                      }),
                      setPageIndex: (index: number) => {
                        setPage(index + 1);
                      },
                      setPageSize: (size: number) => {
                        setPageSize(size);
                        setPage(1);
                      },
                      getPageCount: () => pagination.last_page,
                      getRowCount: () => pagination.total,
                      getRowModel: () => ({ rows: [] }),
                      options: { data: assignments },
                    } as any}
                    paginationMeta={pagination}
                    onPageChange={setPage}
                    onPageSizeChange={(newPageSize) => {
                      setPageSize(newPageSize);
                      setPage(1);
                    }}
                    showPageSizeSelector={true}
                    showTotalCount={true}
                  />
                )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deletingAssignment} onOpenChange={(open) => !open && setDeletingAssignment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('events.confirmDelete') || 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('fees.deleteAssignmentConfirm') || 'Are you sure you want to delete this fee assignment? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAssignment(null)}>
              {t('events.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('events.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Side Panel for Viewing Assignment Details */}
      <Sheet open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('fees.assignmentDetails') || 'Fee Assignment Details'}</SheetTitle>
            <SheetDescription>
              {t('fees.viewAssignmentDetails') || 'View detailed information about this fee assignment'}
            </SheetDescription>
          </SheetHeader>
          
          {viewingAssignment && (
            <div className="mt-6 space-y-6">
              {/* Student Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t('fees.student') || 'Student'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('fees.studentName') || 'Name'}</p>
                    <p className="font-medium">
                      {(viewingAssignment as any).student?.full_name || viewingAssignment.studentId || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('fees.studentId') || 'Student ID'}</p>
                    <p className="font-medium">{viewingAssignment.studentId}</p>
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate(`/students/${viewingAssignment.studentId}/fees`);
                      setSidePanelOpen(false);
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('fees.viewStudentFees') || 'View Student Fee Statement'}
                  </Button>
                </div>
              </div>

              {/* Fee Structure Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t('fees.feeStructure') || 'Fee Structure'}</h3>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('fees.structure') || 'Structure'}</p>
                  {getStructureBadge(
                    structuresById[viewingAssignment.feeStructureId]?.name ?? viewingAssignment.feeStructureId,
                    structuresById[viewingAssignment.feeStructureId]?.feeType
                  ) || (
                    <p className="font-medium">N/A</p>
                  )}
                </div>
              </div>

              {/* Class Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t('search.class') || 'Class'}</h3>
                <div>
                  <p className="text-sm text-muted-foreground">{t('fees.className') || 'Class Name'}</p>
                  <p className="font-medium">
                    {(classAyById[viewingAssignment.classAcademicYearId || '']?.class?.name) ?? 
                     (viewingAssignment.classAcademicYearId || 'N/A')}
                  </p>
                </div>
              </div>

              {/* Financial Information */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t('fees.financialDetails') || 'Financial Details'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('fees.originalAmount') || 'Original Amount'}</p>
                    <p className="font-medium">{formatCurrency(viewingAssignment.originalAmount ?? viewingAssignment.assignedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('fees.assignedAmount') || 'Assigned Amount'}</p>
                    <p className="font-medium">{formatCurrency(viewingAssignment.assignedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('fees.paid') || 'Paid'}</p>
                    <p className="font-medium text-green-600">{formatCurrency(viewingAssignment.paidAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('fees.remaining') || 'Remaining'}</p>
                    <p className="font-medium text-red-600">{formatCurrency(viewingAssignment.remainingAmount)}</p>
                  </div>
                </div>
              </div>

              {/* Status and Dates */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{t('fees.statusAndDates') || 'Status & Dates'}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('events.status') || 'Status'}</p>
                    <p className="font-medium capitalize">{viewingAssignment.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('fees.dueDate') || 'Due Date'}</p>
                    <p className="font-medium">
                      {viewingAssignment.dueDate 
                        ? formatDate(viewingAssignment.dueDate) 
                        : 'N/A'}
                    </p>
                  </div>
                  {viewingAssignment.paymentPeriodStart && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('fees.paymentPeriodStart') || 'Period Start'}</p>
                      <p className="font-medium">
                        {formatDate(viewingAssignment.paymentPeriodStart)}
                      </p>
                    </div>
                  )}
                  {viewingAssignment.paymentPeriodEnd && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('fees.paymentPeriodEnd') || 'Period End'}</p>
                      <p className="font-medium">
                        {formatDate(viewingAssignment.paymentPeriodEnd)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {viewingAssignment.notes && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{t('events.notes') || 'Notes'}</h3>
                  <p className="text-sm text-muted-foreground">{viewingAssignment.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    handleEdit(viewingAssignment);
                    setSidePanelOpen(false);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('events.edit') || 'Edit'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeletingAssignment(viewingAssignment);
                    setSidePanelOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('events.delete') || 'Delete'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
