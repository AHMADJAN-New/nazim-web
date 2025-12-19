import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FeeExceptionForm } from '@/components/fees/FeeExceptionForm';
import {
  useCreateFeeException,
  useUpdateFeeException,
  useDeleteFeeException,
  useFeeExceptions,
  useFeeAssignments,
  useFeeStructures,
} from '@/hooks/useFees';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import type { FeeExceptionFormData } from '@/lib/validations/fees';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useCurrentAcademicYear } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import type { Student } from '@/types/domain/student';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Eye, Pencil, Trash2, Plus } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { FeeException } from '@/types/domain/fees';

export default function FeeExceptionsPage() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: academicYears = [], isLoading: academicYearsLoading } = useAcademicYears();
  const { data: currentAcademicYear, isLoading: currentAcademicYearLoading } = useCurrentAcademicYear();

  // Initialize with empty string to keep Select controlled (never undefined)
  const [filterAcademicYear, setFilterAcademicYear] = useState<string>('');
  const [filterClassAy, setFilterClassAy] = useState<string>('all');
  const [editingException, setEditingException] = useState<FeeException | null>(null);
  const [deletingException, setDeletingException] = useState<FeeException | null>(null);
  const [viewingException, setViewingException] = useState<FeeException | null>(null);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [open, setOpen] = useState(false);

  // Auto-select current academic year, or fall back to first academic year
  useEffect(() => {
    if (academicYearsLoading || currentAcademicYearLoading) {
      return;
    }

    if (filterAcademicYear === '' && academicYears.length > 0) {
      const currentYearFromList = academicYears.find(ay => ay.isCurrent === true);
      
      if (currentYearFromList) {
        if (import.meta.env.DEV) {
          console.log('[FeeExceptionsPage] Auto-selecting current academic year from list:', currentYearFromList.id, currentYearFromList.name);
        }
        setFilterAcademicYear(currentYearFromList.id);
        return;
      }

      if (currentAcademicYear) {
        if (import.meta.env.DEV) {
          console.log('[FeeExceptionsPage] Auto-selecting current academic year from hook:', currentAcademicYear.id, currentAcademicYear.name);
        }
        setFilterAcademicYear(currentAcademicYear.id);
        return;
      }

      if (import.meta.env.DEV) {
        console.log('[FeeExceptionsPage] No current year found, falling back to first academic year:', academicYears[0].id, academicYears[0].name);
      }
      setFilterAcademicYear(academicYears[0].id);
    }
  }, [academicYears, academicYearsLoading, currentAcademicYear, currentAcademicYearLoading, filterAcademicYear]);

  const { data: classAcademicYears = [] } = useClassAcademicYears(filterAcademicYear || undefined);
  const { data: exceptions = [], isLoading, error } = useFeeExceptions({
    academicYearId: filterAcademicYear || undefined,
    classAcademicYearId: filterClassAy === 'all' ? undefined : filterClassAy,
  });
  const { data: assignments = [] } = useFeeAssignments({
    academicYearId: filterAcademicYear || undefined,
    classAcademicYearId: filterClassAy === 'all' ? undefined : filterClassAy,
  });
  const { data: structures = [] } = useFeeStructures({
    academicYearId: filterAcademicYear || undefined,
    classAcademicYearId: filterClassAy === 'all' ? undefined : filterClassAy,
  });
  const { data: studentAdmissions } = useStudentAdmissions(profile?.organization_id, false, {
    enrollment_status: 'active',
  });
  // Extract students from admissions
  const students: Student[] = useMemo(() => {
    if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
    return studentAdmissions
      .map(admission => admission.student)
      .filter((student): student is Student => student !== null && student !== undefined);
  }, [studentAdmissions]);

  const createException = useCreateFeeException();
  const updateException = useUpdateFeeException();
  const deleteException = useDeleteFeeException();

  const classAyById = useMemo(
    () => Object.fromEntries(classAcademicYears.map((cay) => [cay.id, cay])),
    [classAcademicYears],
  );
  const structuresById = useMemo(
    () => Object.fromEntries(structures.map((s) => [s.id, s])),
    [structures],
  );
  const assignmentsById = useMemo(
    () => Object.fromEntries(assignments.map((a) => [a.id, a])),
    [assignments],
  );
  const studentsById = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students],
  );

  const assignmentOptions = useMemo(
    () =>
      assignments.map((assignment) => {
        const className =
          assignment.classAcademicYearId &&
          (classAyById[assignment.classAcademicYearId]?.class?.name ??
            assignment.classAcademicYearId);
        const structureName = structuresById[assignment.feeStructureId]?.name ?? assignment.feeStructureId;
        return {
          value: assignment.id,
          label: `${structureName} - ${className ?? t('common.notAvailable')}`,
          studentId: assignment.studentId,
          classAcademicYearId: assignment.classAcademicYearId,
          academicYearId: assignment.academicYearId,
        };
      }),
    [assignments, classAyById, structuresById, t],
  );

  // Get exception type badge
  const getExceptionTypeBadge = (type: string) => {
    const typeLower = type.toLowerCase();
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let className = '';

    switch (typeLower) {
      case 'discount_percentage':
        variant = 'default';
        className = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        break;
      case 'discount_fixed':
        variant = 'secondary';
        className = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
        break;
      case 'waiver':
        variant = 'destructive';
        className = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
        break;
      case 'custom':
        variant = 'outline';
        className = 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
        break;
      default:
        variant = 'outline';
        className = 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    }

    return (
      <Badge variant={variant} className={className}>
        {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </Badge>
    );
  };

  // Get active status badge
  const getActiveBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
          Active
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800">
        Inactive
      </Badge>
    );
  };

  const handleView = (exception: FeeException, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setViewingException(exception);
    setSidePanelOpen(true);
  };

  const handleEdit = (exception: FeeException, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingException(exception);
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingException) return;
    try {
      await deleteException.mutateAsync(deletingException.id);
      setDeletingException(null);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleSubmit = async (values: FeeExceptionFormData) => {
    try {
      // Convert form data (snake_case) to domain type (camelCase)
      const domainData: Partial<FeeException> = {
        feeAssignmentId: values.fee_assignment_id,
        studentId: values.student_id,
        exceptionType: values.exception_type,
        exceptionAmount: values.exception_amount,
        exceptionReason: values.exception_reason,
        approvedByUserId: values.approved_by_user_id,
        approvedAt: values.approved_at ? new Date(values.approved_at) : null,
        validFrom: values.valid_from ? new Date(values.valid_from) : new Date(),
        validTo: values.valid_to ? new Date(values.valid_to) : null,
        isActive: values.is_active ?? true,
        notes: values.notes ?? null,
        organizationId: values.organization_id,
      };

      if (editingException) {
        await updateException.mutateAsync({
          id: editingException.id,
          ...domainData,
        });
        setEditingException(null);
      } else {
        await createException.mutateAsync(domainData);
      }
      setOpen(false);
    } catch (error) {
      // Error is handled by the mutation
      if (import.meta.env.DEV) {
        console.error('[FeeExceptionsPage] Error submitting form:', error);
      }
    }
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingException(null);
  };

  const handleOpenDialog = () => {
    setEditingException(null);
    setOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('fees.exceptions')}</h1>
        <Dialog open={open} onOpenChange={(isOpen) => {
          if (!isOpen) {
            handleCloseDialog();
          } else {
            handleOpenDialog();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('fees.addException')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingException ? t('fees.editException') : t('fees.addException')}</DialogTitle>
              <DialogDescription className="sr-only">
                {editingException ? t('fees.editException') : t('fees.addException')}
              </DialogDescription>
            </DialogHeader>
            {assignmentOptions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>{t('fees.noAssignmentsAvailable') || 'No fee assignments available. Please create fee assignments first.'}</p>
                <p className="text-sm mt-2">{t('fees.selectAcademicYearAndClass') || 'Make sure you have selected an academic year and class with fee assignments.'}</p>
              </div>
            ) : (
              <FeeExceptionForm
                defaultValues={editingException ? {
                  fee_assignment_id: editingException.feeAssignmentId,
                  student_id: editingException.studentId,
                  exception_type: editingException.exceptionType,
                  exception_amount: editingException.exceptionAmount,
                  exception_reason: editingException.exceptionReason,
                  approved_by_user_id: editingException.approvedByUserId,
                  approved_at: editingException.approvedAt ? editingException.approvedAt.toISOString().slice(0, 10) : '',
                  valid_from: editingException.validFrom ? editingException.validFrom.toISOString().slice(0, 10) : '',
                  valid_to: editingException.validTo ? editingException.validTo.toISOString().slice(0, 10) : '',
                  is_active: editingException.isActive,
                  notes: editingException.notes ?? '',
                  organization_id: editingException.organizationId,
                } : {
                  approved_by_user_id: profile?.id ?? '',
                  approved_at: new Date().toISOString().slice(0, 10),
                  valid_from: new Date().toISOString().slice(0, 10),
                  is_active: true,
                  organization_id: profile?.organization_id ?? '',
                }}
                assignments={assignmentOptions}
                classAcademicYears={classAcademicYears}
                academicYears={academicYears}
                currentAcademicYearId={currentAcademicYear?.id}
                onSubmit={handleSubmit}
                isSubmitting={createException.isPending || updateException.isPending}
                onCancel={handleCloseDialog}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('fees.filters')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium">{t('fees.academicYear')}</span>
            <Select
              value={filterAcademicYear || ''}
              onValueChange={(val) => {
                setFilterAcademicYear(val || '');
                setFilterClassAy('all');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fees.selectAcademicYear')} />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((ay) => (
                  <SelectItem key={ay.id} value={ay.id}>
                    {ay.name} {ay.isCurrent && `(${t('academic.academicYears.current')})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-sm font-medium">{t('fees.class')}</span>
            <Select
              value={filterClassAy}
              onValueChange={(val) => setFilterClassAy(val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('fees.selectClass')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('fees.allClasses')}</SelectItem>
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
          <CardTitle>{t('fees.exceptions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : error ? (
            <p className="text-destructive text-center py-8">
              {t('common.error') || 'Error loading data'}: {error instanceof Error ? error.message : String(error)}
            </p>
          ) : exceptions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t('common.noData') || 'No data available'}</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('fees.student')}</TableHead>
                    <TableHead>{t('fees.class')}</TableHead>
                    <TableHead>{t('fees.structure')}</TableHead>
                    <TableHead>{t('fees.exceptionType')}</TableHead>
                    <TableHead className="text-right">{t('fees.exceptionAmount')}</TableHead>
                    <TableHead>{t('fees.status')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exceptions.map((exception) => {
                    const assignment = assignmentsById[exception.feeAssignmentId];
                    const student = studentsById[exception.studentId];
                    const studentName = student?.fullName || exception.studentId || 'Unknown';
                    const className = assignment?.classAcademicYearId
                      ? (classAyById[assignment.classAcademicYearId]?.class?.name ?? assignment.classAcademicYearId)
                      : '-';
                    const structureName = assignment
                      ? (structuresById[assignment.feeStructureId]?.name ?? assignment.feeStructureId)
                      : '-';

                    return (
                      <TableRow
                        key={exception.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleView(exception)}
                      >
                        <TableCell>
                          <div className="font-medium">{studentName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">
                            {className}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{structureName}</div>
                        </TableCell>
                        <TableCell>{getExceptionTypeBadge(exception.exceptionType)}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">{formatCurrency(exception.exceptionAmount)}</span>
                        </TableCell>
                        <TableCell>{getActiveBadge(exception.isActive)}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={(e) => handleView(exception, e)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={(e) => handleEdit(exception, e)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingException(exception);
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
            </>
          )}
        </CardContent>
      </Card>

      {/* View Side Panel */}
      <Sheet open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('fees.exceptionDetails')}</SheetTitle>
            <SheetDescription>{t('fees.exceptionDetailsDescription')}</SheetDescription>
          </SheetHeader>
          {viewingException && (() => {
            const currentAssignment = assignmentsById[viewingException.feeAssignmentId];
            const studentId = viewingException.studentId;
            const academicYearId = currentAssignment?.academicYearId || filterAcademicYear;
            
            // Get all assignments for this student in the same academic year
            const studentAssignments = assignments.filter(
              (a) => a.studentId === studentId && a.academicYearId === academicYearId
            );

            // Calculate totals
            const totalOriginalAmount = studentAssignments.reduce((sum, a) => sum + (a.originalAmount || a.assignedAmount), 0);
            const currentAssignmentOriginal = currentAssignment?.originalAmount || currentAssignment?.assignedAmount || 0;
            const otherFeesTotal = totalOriginalAmount - currentAssignmentOriginal;
            const afterExceptionAmount = currentAssignment?.assignedAmount || 0;
            const totalPayable = studentAssignments.reduce((sum, a) => sum + a.assignedAmount, 0);
            const totalPaid = studentAssignments.reduce((sum, a) => sum + a.paidAmount, 0);
            const totalRemaining = studentAssignments.reduce((sum, a) => sum + a.remainingAmount, 0);

            return (
              <div className="mt-6 space-y-6">
                {/* Student Information */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{t('fees.student') || 'Student'}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.student') || 'Student'}</p>
                      <p className="font-medium">
                        {studentsById[viewingException.studentId]?.fullName || viewingException.studentId || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.class') || 'Class'}</p>
                      <p className="font-medium">
                        {currentAssignment?.classAcademicYearId
                          ? (classAyById[currentAssignment.classAcademicYearId || '']?.class?.name ?? '-')
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fee Structure Information */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{t('fees.feeStructure') || 'Fee Structure'}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.structure') || 'Structure'}</p>
                      <p className="font-medium">
                        {currentAssignment
                          ? (structuresById[currentAssignment.feeStructureId]?.name ?? '-')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.exceptionType') || 'Exception Type'}</p>
                      <div className="mt-1">{getExceptionTypeBadge(viewingException.exceptionType)}</div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-3 border-t pt-4">
                  <h3 className="text-lg font-semibold">{t('fees.financialSummary') || 'Financial Summary'}</h3>
                  
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">{t('fees.totalFee') || 'Total Fee (All Assignments)'}</span>
                        <span className="font-semibold">{formatCurrency(totalOriginalAmount)}</span>
                      </div>
                      
                      {studentAssignments.length > 1 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">{t('fees.otherFees') || 'Other Fees'}</span>
                          <span className="font-medium">{formatCurrency(otherFeesTotal)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-medium text-muted-foreground">{t('fees.currentFeeOriginal') || 'Current Fee (Original)'}</span>
                        <span className="font-medium">{formatCurrency(currentAssignmentOriginal)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">{t('fees.exceptionAmount') || 'Exception Amount'}</span>
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          -{formatCurrency(viewingException.exceptionAmount)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-medium">{t('fees.afterException') || 'After Exception'}</span>
                        <span className="font-semibold">{formatCurrency(afterExceptionAmount)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">{t('fees.totalPayable') || 'Total Payable'}</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(totalPayable)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-medium text-muted-foreground">{t('fees.totalPaid') || 'Total Paid'}</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(totalPaid)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-sm font-medium text-muted-foreground">{t('fees.totalRemaining') || 'Total Remaining'}</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(totalRemaining)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {studentAssignments.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {t('fees.allStudentFees') || 'All Student Fees'} ({studentAssignments.length})
                      </p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {studentAssignments.map((assignment) => {
                          const structure = structuresById[assignment.feeStructureId];
                          const isCurrent = assignment.id === viewingException.feeAssignmentId;
                          return (
                            <div
                              key={assignment.id}
                              className={`p-3 rounded-lg border ${
                                isCurrent
                                  ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700'
                                  : 'bg-muted/30 border-border'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {structure?.name || assignment.feeStructureId}
                                    {isCurrent && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        {t('fees.current') || 'Current'}
                                      </Badge>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">{t('fees.assigned') || 'Assigned'}: </span>
                                  <span className="font-medium">{formatCurrency(assignment.assignedAmount)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{t('fees.paid') || 'Paid'}: </span>
                                  <span className="font-medium text-green-600">{formatCurrency(assignment.paidAmount)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">{t('fees.remaining') || 'Remaining'}: </span>
                                  <span className="font-medium text-red-600">{formatCurrency(assignment.remainingAmount)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Exception Details */}
                <div className="space-y-2 border-t pt-4">
                  <h3 className="text-lg font-semibold">{t('fees.exceptionDetails') || 'Exception Details'}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.exceptionAmount') || 'Exception Amount'}</p>
                      <p className="font-medium">{formatCurrency(viewingException.exceptionAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.status') || 'Status'}</p>
                      <div className="mt-1">{getActiveBadge(viewingException.isActive)}</div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.validFrom') || 'Valid From'}</p>
                      <p className="font-medium">
                        {viewingException.validFrom ? viewingException.validFrom.toLocaleDateString() : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.validTo') || 'Valid To'}</p>
                      <p className="font-medium">
                        {viewingException.validTo ? viewingException.validTo.toLocaleDateString() : '-'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('fees.exceptionReason') || 'Reason'}</p>
                    <p className="font-medium">{viewingException.exceptionReason}</p>
                  </div>
                  {viewingException.notes && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.notes') || 'Notes'}</p>
                      <p className="font-medium">{viewingException.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingException} onOpenChange={(open) => !open && setDeletingException(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('fees.confirmDeleteException')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
