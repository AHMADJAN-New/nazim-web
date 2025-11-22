import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFiscalYears, useCreateFiscalYear, useUpdateFiscalYear, useDeleteFiscalYear, useCloseFiscalYear } from '@/hooks/finance/useFinancialLookups';
import { useProfile } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { fiscalYearSchema } from '@/lib/finance/schemas';
import type { FiscalYear } from '@/types/finance';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, Calendar, Lock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type FiscalYearFormData = z.infer<typeof fiscalYearSchema>;

export function FiscalYearsPage() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('finance.fiscal_years.create');
  const hasUpdatePermission = useHasPermission('finance.fiscal_years.update');
  const hasDeletePermission = useHasPermission('finance.fiscal_years.delete');
  const hasClosePermission = useHasPermission('finance.fiscal_years.close');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: fiscalYears, isLoading } = useFiscalYears();
  const createFiscalYear = useCreateFiscalYear();
  const updateFiscalYear = useUpdateFiscalYear();
  const deleteFiscalYear = useDeleteFiscalYear();
  const closeFiscalYear = useCloseFiscalYear();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FiscalYearFormData>({
    resolver: zodResolver(fiscalYearSchema),
    defaultValues: {
      is_current: false,
      is_closed: false,
    },
  });

  const isCurrentValue = watch('is_current');
  const isClosedValue = watch('is_closed');

  const filteredFiscalYears = useMemo(() => {
    if (!fiscalYears) return [];
    return fiscalYears.filter((fy) =>
      fy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fy.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fy.description && fy.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [fiscalYears, searchQuery]);

  const handleOpenDialog = (fiscalYearId?: string) => {
    if (fiscalYearId) {
      const fy = fiscalYears?.find((f) => f.id === fiscalYearId);
      if (fy) {
        reset({
          name: fy.name,
          code: fy.code,
          start_date: fy.start_date,
          end_date: fy.end_date,
          description: fy.description || '',
          is_current: fy.is_current,
          is_closed: fy.is_closed,
        });
        setSelectedFiscalYear(fiscalYearId);
      }
    } else {
      reset({
        name: '',
        code: '',
        start_date: '',
        end_date: '',
        description: '',
        is_current: false,
        is_closed: false,
      });
      setSelectedFiscalYear(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedFiscalYear(null);
    reset();
  };

  const onSubmit = (data: FiscalYearFormData) => {
    if (selectedFiscalYear) {
      updateFiscalYear.mutate(
        { id: selectedFiscalYear, ...data },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createFiscalYear.mutate(data, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDelete = () => {
    if (selectedFiscalYear) {
      deleteFiscalYear.mutate(selectedFiscalYear, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedFiscalYear(null);
        },
      });
    }
  };

  const handleClose = () => {
    if (selectedFiscalYear) {
      closeFiscalYear.mutate(selectedFiscalYear, {
        onSuccess: () => {
          setIsCloseDialogOpen(false);
          setSelectedFiscalYear(null);
        },
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fiscal Years
              </CardTitle>
              <CardDescription>
                Manage fiscal/academic year periods for financial reporting
              </CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fiscal Year
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search fiscal years..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredFiscalYears.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No fiscal years found matching your search.' : 'No fiscal years found. Add one to get started.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFiscalYears.map((fy) => (
                    <TableRow key={fy.id}>
                      <TableCell className="font-mono font-medium">{fy.code}</TableCell>
                      <TableCell>
                        {fy.name}
                        {fy.is_current && (
                          <Badge variant="default" className="ml-2">Current</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(fy.start_date)}</TableCell>
                      <TableCell>{formatDate(fy.end_date)}</TableCell>
                      <TableCell>
                        {fy.is_closed ? (
                          <Badge variant="secondary">
                            <Lock className="h-3 w-3 mr-1" />
                            Closed
                          </Badge>
                        ) : (
                          <Badge variant="outline">Open</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {hasUpdatePermission && !fy.is_closed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(fy.id)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasClosePermission && !fy.is_closed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedFiscalYear(fy.id);
                                setIsCloseDialogOpen(true);
                              }}
                            >
                              <Lock className="h-4 w-4 mr-1" />
                              Close
                            </Button>
                          )}
                          {hasDeletePermission && !fy.is_closed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedFiscalYear(fy.id);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFiscalYear ? 'Edit Fiscal Year' : 'Add Fiscal Year'}
            </DialogTitle>
            <DialogDescription>
              {selectedFiscalYear
                ? 'Update the fiscal year details below.'
                : 'Fill in the details to create a new fiscal year.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  {...register('code')}
                  placeholder="FY2024"
                  maxLength={50}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Fiscal Year 2024"
                  maxLength={100}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date')}
                />
                {errors.start_date && (
                  <p className="text-sm text-destructive">{errors.start_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date')}
                />
                {errors.end_date && (
                  <p className="text-sm text-destructive">{errors.end_date.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Optional description"
                rows={3}
                maxLength={500}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_current"
                checked={isCurrentValue}
                onCheckedChange={(checked) => setValue('is_current', checked)}
              />
              <Label htmlFor="is_current">Set as Current Fiscal Year</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createFiscalYear.isPending || updateFiscalYear.isPending}
              >
                {selectedFiscalYear ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Confirmation Dialog */}
      <AlertDialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Fiscal Year?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the fiscal year and prevent further modifications. 
              This action cannot be undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFiscalYear(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClose}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Close Fiscal Year
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the fiscal year. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedFiscalYear(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
