import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, GraduationCap, Calendar, Star, RefreshCw, ExternalLink } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';

import * as z from 'zod';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';


import { useAcademicYears, useCreateAcademicYear, useUpdateAcademicYear, useDeleteAcademicYear, useSetCurrentAcademicYear, useAcademicYearDeletionCheck, type AcademicYear } from '@/hooks/useAcademicYears';
import { useLanguage } from '@/hooks/useLanguage';
import { CalendarFormField } from '@/components/ui/calendar-form-field';

import { useState, useMemo } from 'react';

import { ReportExportButtons } from '@/components/reports/ReportExportButtons';
import { useHasPermission } from '@/hooks/usePermissions';
import { useProfile } from '@/hooks/useProfiles';
import { formatDate, formatDateTime } from '@/lib/utils';
import { dateToLocalYYYYMMDD } from '@/lib/dateUtils';
import {
  buildAcademicYearClassesLink,
  buildClassYearBlockerLink,
  CLASS_YEAR_BLOCKER_KEYS,
  hasClassYearBlockerLink,
} from '@/lib/classYearBlockerLinks';

const academicYearSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional().nullable(),
  status: z.enum(['active', 'archived', 'planned']).default('active'),
  is_current: z.boolean().default(false),
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate > startDate;
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type AcademicYearFormData = z.infer<typeof academicYearSchema>;

export function AcademicYearsManagement() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const hasCreatePermission = useHasPermission('academic_years.create');
  const hasUpdatePermission = useHasPermission('academic_years.update');
  const hasDeletePermission = useHasPermission('academic_years.delete');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { data: academicYears, isLoading } = useAcademicYears(profile?.organization_id);
  const createAcademicYear = useCreateAcademicYear();
  const updateAcademicYear = useUpdateAcademicYear();
  const deleteAcademicYear = useDeleteAcademicYear();
  const setCurrentAcademicYear = useSetCurrentAcademicYear();
  const { data: deletionCheck, isLoading: deletionCheckLoading } = useAcademicYearDeletionCheck(
    selectedAcademicYear,
    isDeleteDialogOpen && !!selectedAcademicYear
  );

  const getBlockerLabel = (key: string, count: number, fallbackMessage?: string) => {
    if (key === 'class_academic_years') {
      return t('academic.academicYears.deleteBlockedClassAssignments', { count });
    }
    const translationKey = CLASS_YEAR_BLOCKER_KEYS[key];
    if (translationKey) {
      return t(translationKey, { count });
    }
    return fallbackMessage || `${count}`;
  };

  const formMethods = useForm<AcademicYearFormData>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      status: 'active',
      is_current: false,
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = formMethods;

  const isCurrentValue = watch('is_current');
  const statusValue = watch('status');

  const filteredAcademicYears = useMemo(() => {
    if (!academicYears) return [];
    const query = (searchQuery || '').toLowerCase();
    let filtered = academicYears.filter((year) =>
      year.name?.toLowerCase().includes(query) ||
      (year.description && year.description.toLowerCase().includes(query))
    );
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter((year) => year.status === statusFilter);
    }
    
    return filtered;
  }, [academicYears, searchQuery, statusFilter]);

  const handleOpenDialog = (academicYearId?: string) => {
    if (academicYearId) {
      const year = academicYears?.find((y) => y.id === academicYearId);
      if (year) {
        // Convert Date objects to YYYY-MM-DD format for date inputs
        const startDate = year.startDate instanceof Date 
          ? dateToLocalYYYYMMDD(year.startDate instanceof Date ? year.startDate : new Date(year.startDate))
          : year.startDate ? dateToLocalYYYYMMDD(new Date(year.startDate)) : '';
        const endDate = year.endDate instanceof Date
          ? dateToLocalYYYYMMDD(year.endDate instanceof Date ? year.endDate : new Date(year.endDate))
          : year.endDate ? dateToLocalYYYYMMDD(new Date(year.endDate)) : '';
        
        reset({
          name: year.name || '',
          start_date: startDate,
          end_date: endDate,
          description: year.description || '',
          status: year.status as 'active' | 'archived' | 'planned',
          is_current: year.isCurrent, // Use camelCase from domain model
        });
        setSelectedAcademicYear(academicYearId);
      }
    } else {
      reset({
        name: '',
        start_date: '',
        end_date: '',
        description: '',
        status: 'active',
        is_current: false,
      });
      setSelectedAcademicYear(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedAcademicYear(null);
    reset({
      name: '',
      start_date: '',
      end_date: '',
      description: '',
      status: 'active',
      is_current: false,
    });
  };

  const onSubmit = (data: AcademicYearFormData) => {
    if (selectedAcademicYear) {
      updateAcademicYear.mutate(
        { 
          id: selectedAcademicYear, 
          name: data.name,
          startDate: data.start_date,
          endDate: data.end_date,
          description: data.description,
          status: data.status,
          isCurrent: data.is_current,
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createAcademicYear.mutate({
        name: data.name,
        startDate: data.start_date, // Map snake_case to camelCase
        endDate: data.end_date, // Map snake_case to camelCase
        description: data.description,
        status: data.status,
        isCurrent: data.is_current,
        organizationId: profile?.organization_id || null,
      }, {
        onSuccess: () => {
          handleCloseDialog();
        },
      });
    }
  };

  const handleDeleteClick = (academicYearId: string) => {
    setSelectedAcademicYear(academicYearId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedAcademicYear) {
      deleteAcademicYear.mutate(selectedAcademicYear, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedAcademicYear(null);
        },
      });
    }
  };

  const handleSetCurrent = (academicYearId: string) => {
    setCurrentAcademicYear.mutate(academicYearId);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'archived':
        return 'secondary';
      case 'planned':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('academic.academicYears.active');
      case 'archived':
        return t('academic.academicYears.archived');
      case 'planned':
        return t('academic.academicYears.planned');
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">{t('common.loading')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden" data-tour="academic-years-page">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 hidden sm:inline-flex" />
                {t('academic.academicYears.management')}
              </CardTitle>
              <CardDescription className="hidden md:block">
                {t('academic.academicYears.title')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {hasCreatePermission && (
                <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto" data-tour="academic-years-create-button">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline ml-2">{t('academic.academicYears.addAcademicYear')}</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('academic.academicYears.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t('events.filterByStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('subjects.all')} {t('academic.academicYears.status')}</SelectItem>
                  <SelectItem value="active">{t('academic.academicYears.active')}</SelectItem>
                  <SelectItem value="archived">{t('academic.academicYears.archived')}</SelectItem>
                  <SelectItem value="planned">{t('academic.academicYears.planned')}</SelectItem>
                </SelectContent>
              </Select>
              <ReportExportButtons
                data={filteredAcademicYears}
                columns={[
                  { key: 'name', label: t('academic.academicYears.name') },
                  { key: 'startDate', label: t('academic.academicYears.startDate') },
                  { key: 'endDate', label: t('academic.academicYears.endDate') },
                  { key: 'status', label: t('academic.academicYears.status') },
                  { key: 'isCurrent', label: t('academic.academicYears.isCurrent') },
                ]}
                reportKey="academic_years"
                title={t('academic.academicYears.management') || 'Academic Years Report'}
                transformData={(data) => data.map((year) => ({
                  name: year.name || '',
                  startDate: formatDate(year.startDate),
                  endDate: formatDate(year.endDate instanceof Date ? year.endDate : year.endDate),
                  status: getStatusLabel(year.status),
                  isCurrent: year.isCurrent ? t('academic.academicYears.current') : '-',
                }))}
                buildFiltersSummary={() => {
                  const filters: string[] = [];
                  if (searchQuery) filters.push(`Search: ${searchQuery}`);
                  if (statusFilter !== 'all') filters.push(`Status: ${getStatusLabel(statusFilter)}`);
                  return filters.length > 0 ? filters.join(' | ') : '';
                }}
                schoolId={profile?.default_school_id}
                templateType="academic_years"
                disabled={filteredAcademicYears.length === 0}
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('academic.academicYears.name')}</TableHead>
                  <TableHead>{t('academic.academicYears.startDate')}</TableHead>
                  <TableHead>{t('academic.academicYears.endDate')}</TableHead>
                  <TableHead>{t('academic.academicYears.status')}</TableHead>
                  <TableHead>{t('academic.academicYears.isCurrent')}</TableHead>
                  <TableHead className="text-right">{t('events.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAcademicYears.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {searchQuery 
                        ? t('academic.academicYears.noAcademicYearsFound')
                        : t('academic.academicYears.noAcademicYearsMessage')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAcademicYears.map((year) => (
                    <TableRow key={year.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {year.name}
                          {year.isCurrent && (
                            <Badge variant="default" className="gap-1">
                              <Star className="h-3 w-3" />
                              {t('academic.academicYears.current')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(year.startDate)}
                      </TableCell>
                      <TableCell>
                        {formatDate(year.endDate instanceof Date ? year.endDate : year.endDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(year.status)}>
                          {getStatusLabel(year.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                          {year.isCurrent ? (
                          <Badge variant="default">{t('academic.academicYears.current')}</Badge>
                        ) : (
                          hasUpdatePermission && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetCurrent(year.id)}
                              className="flex-shrink-0"
                              title={t('academic.academicYears.setAsCurrent')}
                            >
                              <Star className="h-4 w-4" />
                              <span className="hidden sm:inline ml-2">{t('academic.academicYears.setAsCurrent')}</span>
                            </Button>
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5 sm:gap-2">
                          {hasUpdatePermission && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(year.id)}
                              className="flex-shrink-0"
                              aria-label={t('academic.academicYears.editAcademicYear')}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {hasDeletePermission && !year.isCurrent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(year.id)}
                              title="Delete academic year"
                              className="flex-shrink-0"
                              aria-label={t('events.delete')}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <FormProvider {...formMethods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
              <DialogTitle>
                {selectedAcademicYear 
                  ? t('academic.academicYears.editAcademicYear')
                  : t('academic.academicYears.addAcademicYear')}
              </DialogTitle>
              <DialogDescription>
                {selectedAcademicYear
                  ? t('academic.academicYears.management')
                  : t('academic.academicYears.management')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  {t('academic.academicYears.name')} *
                </Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={t('academic.academicYears.name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <CalendarFormField control={control} name="start_date" label={t('academic.academicYears.startDate') + ' *'} required />
                  {errors.start_date && (
                    <p className="text-sm text-destructive">{errors.start_date.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <CalendarFormField control={control} name="end_date" label={t('academic.academicYears.endDate') + ' *'} required />
                  {errors.end_date && (
                    <p className="text-sm text-destructive">{errors.end_date.message}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">
                  {t('academic.academicYears.description')}
                </Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder={t('academic.academicYears.description')}
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">
                  {t('academic.academicYears.status')}
                </Label>
                <Select
                  value={statusValue || 'active'}
                  onValueChange={(value) => setValue('status', value as 'active' | 'archived' | 'planned')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('academic.academicYears.active')}</SelectItem>
                    <SelectItem value="archived">{t('academic.academicYears.archived')}</SelectItem>
                    <SelectItem value="planned">{t('academic.academicYears.planned')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_current"
                  checked={isCurrentValue}
                  onCheckedChange={(checked) => setValue('is_current', checked)}
                />
                <Label htmlFor="is_current" className="cursor-pointer">
                  {t('academic.academicYears.isCurrent')}
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('events.cancel')}
              </Button>
              <Button type="submit">
                {t('events.save')}
              </Button>
            </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="flex w-[calc(100%-2rem)] max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <AlertDialogHeader className="shrink-0 space-y-2 px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
            <AlertDialogTitle>
              {deletionCheck && !deletionCheck.can_delete
                ? t('academic.academicYears.deleteBlockedTitle')
                : t('events.delete')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6">
            <AlertDialogDescription asChild>
              <div className="space-y-3 pb-4 text-sm text-muted-foreground">
                {deletionCheckLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>{t('academic.academicYears.checkingDeletion')}</span>
                  </div>
                ) : deletionCheck?.can_delete ? (
                  <p>{t('academic.academicYears.deleteConfirm')}</p>
                ) : (
                  <>
                    <p>{t('academic.academicYears.deleteBlockedHint')}</p>
                    {deletionCheck?.blockers && deletionCheck.blockers.length > 0 && (
                      <ul className="list-disc space-y-2 ps-5">
                        {deletionCheck.blockers.map((blocker) => (
                          <li key={blocker.key} className="list-item">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                              <span className="min-w-0 break-words">{getBlockerLabel(blocker.key, blocker.count, blocker.message)}</span>
                              {selectedAcademicYear && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto shrink-0 self-start p-0 text-primary"
                                  asChild
                                >
                                  <a
                                    href={buildAcademicYearClassesLink(selectedAcademicYear)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="me-1.5 h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">{t('academic.academicYears.openYearClassesLink')}</span>
                                    <span className="sm:hidden">{t('academic.classes.openBlockerLink')}</span>
                                  </a>
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    {deletionCheck?.class_instances && deletionCheck.class_instances.length > 0 && (
                      <div className="space-y-3 rounded-md border p-3">
                        {deletionCheck.class_instances.map((instance) => (
                          <div key={instance.id} className="space-y-2">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                              <span className="min-w-0 break-words font-medium">
                                {instance.class_name}
                                {instance.section_name ? ` (${instance.section_name})` : ''}
                              </span>
                              {selectedAcademicYear && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto shrink-0 self-start p-0 text-primary"
                                  asChild
                                >
                                  <a
                                    href={buildAcademicYearClassesLink(selectedAcademicYear, instance.id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="me-1.5 h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">{t('academic.academicYears.openYearClassesLink')}</span>
                                    <span className="sm:hidden">{t('academic.classes.openBlockerLink')}</span>
                                  </a>
                                </Button>
                              )}
                            </div>
                            {!instance.can_remove && instance.blockers.length > 0 && (
                              <ul className="list-disc space-y-1 ps-5 text-muted-foreground">
                                {instance.blockers.map((blocker) => {
                                  const blockerLink = hasClassYearBlockerLink(blocker.key)
                                    ? buildClassYearBlockerLink(blocker.key, {
                                        classAcademicYearId: instance.id,
                                        academicYearId: selectedAcademicYear ?? undefined,
                                        classId: instance.class_id,
                                      })
                                    : null;
                                  return (
                                    <li key={`${instance.id}-${blocker.key}`}>
                                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                        <span className="min-w-0 break-words">{getBlockerLabel(blocker.key, blocker.count, blocker.message)}</span>
                                        {blockerLink && (
                                          <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto shrink-0 self-start p-0 text-primary"
                                            asChild
                                          >
                                            <a href={blockerLink} target="_blank" rel="noopener noreferrer">
                                              <ExternalLink className="me-1.5 h-3.5 w-3.5" />
                                              <span className="hidden sm:inline">{t('academic.classes.openBlockerLink')}</span>
                                              <span className="sm:hidden">{t('common.open')}</span>
                                            </a>
                                          </Button>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </div>
          <AlertDialogFooter className="shrink-0 gap-2 border-t px-4 py-3 sm:px-6 sm:py-4">
            <AlertDialogCancel className="mt-0">{t('events.cancel')}</AlertDialogCancel>
            {deletionCheck?.can_delete !== false && (
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deletionCheckLoading || (deletionCheck ? !deletionCheck.can_delete : false)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {t('events.delete')}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

