import { format } from 'date-fns';
import { MoreHorizontal, Pencil, Trash, Eye, FileText, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { FeeStructureForm } from '@/components/fees/FeeStructureForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClasses, useClassAcademicYears } from '@/hooks/useClasses';
import {
  useCreateFeeStructure,
  useDeleteFeeStructure,
  useFeeStructures,
  useUpdateFeeStructure,
} from '@/hooks/useFees';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { FeeStructureFormData } from '@/lib/validations/fees';
import type { FeeStructure } from '@/types/domain/fees';

export default function FeeStructuresPage() {
  const { t } = useLanguage();
  const {
    data: structures = [],
    isLoading,
    pagination,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useFeeStructures(undefined, true);
  const { data: classes = [] } = useClasses();
  const { data: academicYears = [] } = useAcademicYears();
  const createMutation = useCreateFeeStructure();
  const updateMutation = useUpdateFeeStructure();
  const deleteMutation = useDeleteFeeStructure();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [viewingStructure, setViewingStructure] = useState<FeeStructure | null>(null);

  // Create lookup maps for classes and academic years
  const classesById = useMemo(() => {
    const map = new Map();
    classes.forEach((cls) => {
      map.set(cls.id, cls);
    });
    return map;
  }, [classes]);

  const academicYearsById = useMemo(() => {
    const map = new Map();
    academicYears.forEach((year) => {
      map.set(year.id, year);
    });
    return map;
  }, [academicYears]);

  // Get class academic years for all structures (fetch when viewing structure has academic year)
  const classAcademicYearsData = useClassAcademicYears(
    viewingStructure?.academicYearId || '',
  );
  const viewingClassAcademicYear = viewingStructure?.classAcademicYearId
    ? classAcademicYearsData.data?.find((cay) => cay.id === viewingStructure.classAcademicYearId)
    : null;

  // Fee type badge colors
  const getFeeTypeBadgeVariant = (feeType: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      monthly: 'default',
      one_time: 'secondary',
      semester: 'outline',
      annual: 'default',
      quarterly: 'secondary',
      custom: 'outline',
    };
    return variants[feeType] || 'outline';
  };

  const getFeeTypeBadgeColor = (feeType: string) => {
    const colors: Record<string, string> = {
      monthly: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100',
      one_time: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-100',
      semester: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100',
      annual: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-100',
      quarterly: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-100',
      custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-100',
    };
    return colors[feeType] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-100';
  };

  const toFormDefaults = (structure: FeeStructure | null): Partial<FeeStructureFormData> => {
    if (!structure) return {};
    const formatDate = (date?: Date | null) => (date ? format(date, 'yyyy-MM-dd') : '');

    return {
      academic_year_id: structure.academicYearId || '',
      name: structure.name || '',
      code: structure.code || '',
      description: structure.description || '',
      fee_type: structure.feeType,
      amount: structure.amount ?? 0,
      currency_id: structure.currencyId || '',
      due_date: formatDate(structure.dueDate),
      start_date: formatDate(structure.startDate),
      end_date: formatDate(structure.endDate),
      class_id: structure.classId || '',
      class_academic_year_id: structure.classAcademicYearId || '',
      is_active: structure.isActive,
      is_required: structure.isRequired,
      display_order: structure.displayOrder ?? 0,
      school_id: structure.schoolId || '',
    };
  };

  const actionsDisabled = useMemo(
    () => createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    [createMutation.isPending, deleteMutation.isPending, updateMutation.isPending],
  );

  const handleSubmit = async (values: FeeStructureFormData) => {
    const payload: Partial<FeeStructure> = {
      academicYearId: values.academic_year_id,
      name: values.name,
      code: values.code || null,
      description: values.description || null,
      feeType: values.fee_type as FeeStructure['feeType'],
      amount: Number(values.amount),
      currencyId: values.currency_id || null,
      dueDate: values.due_date ? new Date(values.due_date) : undefined,
      startDate: values.start_date ? new Date(values.start_date) : undefined,
      endDate: values.end_date ? new Date(values.end_date) : undefined,
      classId: values.class_id || null,
      classAcademicYearId: values.class_academic_year_id || null,
      isActive: values.is_active ?? true,
      isRequired: values.is_required ?? true,
      displayOrder:
        values.display_order === '' || values.display_order === undefined || values.display_order === null
          ? undefined
          : Number(values.display_order),
      schoolId: values.school_id || null,
    };

    if (import.meta.env.DEV) {
       
      console.debug('[FeeStructures] submit values', values);
       
      console.debug('[FeeStructures] payload', payload);
    }

    try {
      await createMutation.mutateAsync(payload);
      setOpen(false);
    } catch (error) {
      if (import.meta.env.DEV) {
         
        console.error('[FeeStructures] submit failed', error);
      }
      showToast.error(
        (error as Error)?.message || t('toast.feeStructureCreateFailed') || 'Failed to save fee structure',
      );
    }
  };

  const handleUpdate = async (values: FeeStructureFormData) => {
    if (!editingStructure) return;

    const payload: Partial<FeeStructure> = {
      academicYearId: values.academic_year_id,
      name: values.name,
      code: values.code || null,
      description: values.description || null,
      feeType: values.fee_type as FeeStructure['feeType'],
      amount: Number(values.amount),
      currencyId: values.currency_id || null,
      dueDate: values.due_date ? new Date(values.due_date) : undefined,
      startDate: values.start_date ? new Date(values.start_date) : undefined,
      endDate: values.end_date ? new Date(values.end_date) : undefined,
      classId: values.class_id || null,
      classAcademicYearId: values.class_academic_year_id || null,
      isActive: values.is_active ?? true,
      isRequired: values.is_required ?? true,
      displayOrder:
        values.display_order === '' || values.display_order === undefined || values.display_order === null
          ? undefined
          : Number(values.display_order),
      schoolId: values.school_id || null,
    };

    try {
      await updateMutation.mutateAsync({ id: editingStructure.id, data: payload });
      setEditOpen(false);
      setEditingStructure(null);
    } catch (error) {
      if (import.meta.env.DEV) {
         
        console.error('[FeeStructures] update failed', error);
      }
      showToast.error((error as Error)?.message || t('toast.feeStructureUpdateFailed'));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      if (import.meta.env.DEV) {
         
        console.error('[FeeStructures] delete failed', error);
      }
      showToast.error((error as Error)?.message || t('toast.feeStructureDeleteFailed'));
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('fees.structures')}
        icon={<FileText className="h-5 w-5" />}
        primaryAction={{
          label: t('fees.addStructure'),
          onClick: () => setOpen(true),
          icon: <Plus className="h-4 w-4" />,
        }}
        rightSlot={
          <ReportExportButtons
            data={structures}
            columns={[
              { key: 'name', label: t('events.name'), align: 'left' },
              { key: 'code', label: t('events.code'), align: 'left' },
              { key: 'amount', label: t('fees.amount'), align: 'right' },
              { key: 'feeType', label: t('fees.feeType'), align: 'left' },
              { key: 'className', label: t('academic.classes.class'), align: 'left' },
              { key: 'academicYear', label: t('academic.academicYears.academicYear'), align: 'left' },
              { key: 'dueDate', label: t('fees.dueDate'), align: 'left' },
              { key: 'isRequired', label: t('events.required'), align: 'center' },
              { key: 'isActive', label: t('events.active'), align: 'center' },
            ]}
            reportKey="fee_structures"
            title={t('fees.structures') || 'Fee Structures'}
            transformData={(data) =>
              data.map((structure) => ({
                name: structure.name,
                code: structure.code || '-',
                amount: formatCurrency(structure.amount),
                feeType: structure.feeType?.replace('_', ' ').toUpperCase() || '-',
                className: classesById.get(structure.classId)?.name || '-',
                academicYear: academicYearsById.get(structure.academicYearId)?.name || '-',
                dueDate: structure.dueDate ? formatDate(structure.dueDate) : '-',
                isRequired: structure.isRequired ? t('events.yes') : t('events.no'),
                isActive: structure.isActive ? t('events.yes') : t('events.no'),
              }))
            }
            templateType="fee_structures"
            disabled={isLoading || structures.length === 0}
          />
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('fees.addStructure')}</DialogTitle>
            <DialogDescription className="sr-only">{t('fees.addStructure')}</DialogDescription>
          </DialogHeader>
          <FeeStructureForm onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>{t('fees.structures')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('events.name')}</TableHead>
                    <TableHead>{t('fees.amount')}</TableHead>
                    <TableHead>{t('fees.feeType')}</TableHead>
                    <TableHead>{t('academic.classes.class')}</TableHead>
                    <TableHead>{t('academic.academicYears.academicYear')}</TableHead>
                    <TableHead>{t('events.required')}</TableHead>
                    <TableHead>{t('events.active')}</TableHead>
                    <TableHead className="text-right">{t('events.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.map((structure) => {
                    const classData = structure.classId ? classesById.get(structure.classId) : null;
                    const academicYear = academicYearsById.get(structure.academicYearId);

                    return (
                      <TableRow
                        key={structure.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setViewingStructure(structure);
                          setViewOpen(true);
                        }}
                      >
                        <TableCell className="font-medium">{structure.name}</TableCell>
                        <TableCell>{structure.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getFeeTypeBadgeColor(structure.feeType)}>
                            {structure.feeType.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {classData ? (
                            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                              {classData.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {academicYear ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                              {academicYear.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={structure.isRequired ? 'default' : 'outline'}>
                            {structure.isRequired ? t('events.yes') : t('events.no')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={structure.isActive ? 'default' : 'secondary'}>
                            {structure.isActive ? t('events.yes') : t('events.no')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={actionsDisabled}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{t('events.actions')}</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() => {
                                  setViewingStructure(structure);
                                  setViewOpen(true);
                                }}
                                disabled={actionsDisabled}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                {t('events.view')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingStructure(structure);
                                  setEditOpen(true);
                                }}
                                disabled={actionsDisabled}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                {t('events.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(structure.id)}
                                disabled={actionsDisabled}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                {t('events.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                    options: { data: structures },
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

      <Dialog
        open={editOpen}
        onOpenChange={(val) => {
          setEditOpen(val);
          if (!val) setEditingStructure(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('events.edit')}</DialogTitle>
            <DialogDescription className="sr-only">{t('events.edit')}</DialogDescription>
          </DialogHeader>
          <FeeStructureForm
            defaultValues={toFormDefaults(editingStructure)}
            onSubmit={handleUpdate}
            isSubmitting={updateMutation.isPending}
            onCancel={() => {
              setEditOpen(false);
              setEditingStructure(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Side Panel for Viewing Details */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          {viewingStructure && (
            <>
              <SheetHeader>
                <SheetTitle>{viewingStructure.name}</SheetTitle>
                <SheetDescription>{t('fees.structureDetails')}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('events.basicInformation')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('events.name')}</p>
                      <p className="text-sm font-medium">{viewingStructure.name}</p>
                    </div>
                    {viewingStructure.code && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('events.code')}</p>
                        <p className="text-sm font-medium">{viewingStructure.code}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.feeType')}</p>
                      <Badge className={getFeeTypeBadgeColor(viewingStructure.feeType)}>
                        {viewingStructure.feeType.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('fees.amount')}</p>
                      <p className="text-sm font-medium">{viewingStructure.amount.toFixed(2)}</p>
                    </div>
                  </div>
                  {viewingStructure.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('events.description')}</p>
                      <p className="text-sm">{viewingStructure.description}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Class and Academic Year */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('academic.academicInformation')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingStructure.classId && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('academic.classes.class')}</p>
                        {classesById.get(viewingStructure.classId) ? (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300">
                            {classesById.get(viewingStructure.classId)?.name}
                          </Badge>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                    )}
                    {viewingStructure.academicYearId && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('academic.academicYears.academicYear')}</p>
                        {academicYearsById.get(viewingStructure.academicYearId) ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                            {academicYearsById.get(viewingStructure.academicYearId)?.name}
                          </Badge>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>
                    )}
                    {viewingClassAcademicYear && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('academic.classes.section')}</p>
                        <p className="text-sm">{viewingClassAcademicYear.sectionName || t('events.default')}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Dates */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('events.dates')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingStructure.startDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('events.startDate')}</p>
                        <p className="text-sm">{format(viewingStructure.startDate, 'PPP')}</p>
                      </div>
                    )}
                    {viewingStructure.endDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('events.endDate')}</p>
                        <p className="text-sm">{format(viewingStructure.endDate, 'PPP')}</p>
                      </div>
                    )}
                    {viewingStructure.dueDate && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('fees.dueDate')}</p>
                        <p className="text-sm">{format(viewingStructure.dueDate, 'PPP')}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('events.status')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('events.active')}</p>
                      <Badge variant={viewingStructure.isActive ? 'default' : 'secondary'}>
                        {viewingStructure.isActive ? t('events.yes') : t('events.no')}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('events.required')}</p>
                      <Badge variant={viewingStructure.isRequired ? 'default' : 'outline'}>
                        {viewingStructure.isRequired ? t('events.yes') : t('events.no')}
                      </Badge>
                    </div>
                    {viewingStructure.displayOrder !== undefined && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('events.displayOrder')}</p>
                        <p className="text-sm">{viewingStructure.displayOrder}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Metadata */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('events.metadata')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {viewingStructure.createdAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('events.createdAt')}</p>
                        <p className="text-sm">{format(viewingStructure.createdAt, 'PPP p')}</p>
                      </div>
                    )}
                    {viewingStructure.updatedAt && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{t('events.updatedAt')}</p>
                        <p className="text-sm">{format(viewingStructure.updatedAt, 'PPP p')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

