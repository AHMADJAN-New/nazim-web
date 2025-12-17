import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FeeStructureForm } from '@/components/fees/FeeStructureForm';
import {
  useCreateFeeStructure,
  useDeleteFeeStructure,
  useFeeStructures,
  useUpdateFeeStructure,
} from '@/hooks/useFees';
import { useLanguage } from '@/hooks/useLanguage';
import type { FeeStructureFormData } from '@/lib/validations/fees';
import type { FeeStructure } from '@/types/domain/fees';
import { showToast } from '@/lib/toast';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash } from 'lucide-react';

export default function FeeStructuresPage() {
  const { t } = useLanguage();
  const { data: structures = [], isLoading } = useFeeStructures();
  const createMutation = useCreateFeeStructure();
  const updateMutation = useUpdateFeeStructure();
  const deleteMutation = useDeleteFeeStructure();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

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
      // eslint-disable-next-line no-console
      console.debug('[FeeStructures] submit values', values);
      // eslint-disable-next-line no-console
      console.debug('[FeeStructures] payload', payload);
    }

    try {
      await createMutation.mutateAsync(payload);
      setOpen(false);
    } catch (error) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
        console.error('[FeeStructures] delete failed', error);
      }
      showToast.error((error as Error)?.message || t('toast.feeStructureDeleteFailed'));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('fees.structures')}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>{t('fees.addStructure')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('fees.addStructure')}</DialogTitle>
              <DialogDescription className="sr-only">{t('fees.addStructure')}</DialogDescription>
            </DialogHeader>
            <FeeStructureForm onSubmit={handleSubmit} isSubmitting={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('fees.structures')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fees.name')}</TableHead>
                  <TableHead>{t('fees.amount')}</TableHead>
                  <TableHead>{t('fees.feeType')}</TableHead>
                  <TableHead>{t('fees.required')}</TableHead>
                  <TableHead>{t('fees.active')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.map((structure) => (
                  <TableRow key={structure.id}>
                    <TableCell>{structure.name}</TableCell>
                    <TableCell>{structure.amount.toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{structure.feeType}</TableCell>
                    <TableCell>{structure.isRequired ? t('common.yes') : t('common.no')}</TableCell>
                    <TableCell>{structure.isActive ? t('common.yes') : t('common.no')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={actionsDisabled}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingStructure(structure);
                              setEditOpen(true);
                            }}
                            disabled={actionsDisabled}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(structure.id)}
                            disabled={actionsDisabled}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            {t('common.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <DialogTitle>{t('common.edit')}</DialogTitle>
            <DialogDescription className="sr-only">{t('common.edit')}</DialogDescription>
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
    </div>
  );
}

