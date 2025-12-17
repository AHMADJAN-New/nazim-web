import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FeeExceptionForm } from '@/components/fees/FeeExceptionForm';
import { useCreateFeeException, useFeeAssignments, useFeeStructures } from '@/hooks/useFees';
import { useLanguage } from '@/hooks/useLanguage';
import type { FeeExceptionFormData } from '@/lib/validations/fees';
import { useAcademicYears } from '@/hooks/useAcademicYears';
import { useClassAcademicYears } from '@/hooks/useClasses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect } from 'react';

export default function FeeExceptionsPage() {
  const { t } = useLanguage();
  const [filterAcademicYear, setFilterAcademicYear] = useState<string | undefined>(undefined);
  const [filterClassAy, setFilterClassAy] = useState<string | undefined>(undefined);

  const { data: academicYears = [] } = useAcademicYears();
  const { data: classAcademicYears = [] } = useClassAcademicYears(filterAcademicYear);
  const { data: assignments = [], isLoading } = useFeeAssignments({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });
  const { data: structures = [] } = useFeeStructures({
    academicYearId: filterAcademicYear,
    classAcademicYearId: filterClassAy,
  });
  const createException = useCreateFeeException();
  const [open, setOpen] = useState(false);

  const classAyById = useMemo(
    () => Object.fromEntries(classAcademicYears.map((cay) => [cay.id, cay])),
    [classAcademicYears],
  );
  const structuresById = useMemo(
    () => Object.fromEntries(structures.map((s) => [s.id, s])),
    [structures],
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
        };
      }),
    [assignments, classAyById, structuresById, t],
  );

  useEffect(() => {
    if (!filterAcademicYear && academicYears.length > 0) {
      const firstAy = academicYears[0];
      setFilterAcademicYear(firstAy.id);
    }
  }, [academicYears, filterAcademicYear]);

  const handleSubmit = async (values: FeeExceptionFormData) => {
    await createException.mutateAsync(values);
    setOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('fees.exceptions')}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>{t('fees.addException')}</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('fees.addException')}</DialogTitle>
              <DialogDescription className="sr-only">{t('fees.addException')}</DialogDescription>
            </DialogHeader>
            <FeeExceptionForm
              assignments={assignmentOptions}
              onSubmit={handleSubmit}
              isSubmitting={createException.isPending}
              onCancel={() => setOpen(false)}
            />
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
                  <TableHead>{t('fees.status')}</TableHead>
                  <TableHead>{t('fees.amountAssigned')}</TableHead>
                  <TableHead>{t('fees.remaining')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>
                      {assignment.classAcademicYearId &&
                        (classAyById[assignment.classAcademicYearId]?.class?.name ??
                          assignment.classAcademicYearId)}
                    </TableCell>
                    <TableCell>{structuresById[assignment.feeStructureId]?.name ?? assignment.feeStructureId}</TableCell>
                    <TableCell className="capitalize">{assignment.status}</TableCell>
                    <TableCell>{assignment.assignedAmount.toFixed(2)}</TableCell>
                    <TableCell>{assignment.remainingAmount.toFixed(2)}</TableCell>
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

