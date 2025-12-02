import { useState, useMemo } from 'react';
import { useAcademicYears, useCreateAcademicYear, useUpdateAcademicYear, useDeleteAcademicYear, useSetCurrentAcademicYear, type AcademicYear } from '@/hooks/useAcademicYears';
import { useProfile, useIsSuperAdmin } from '@/hooks/useProfiles';
import { useHasPermission } from '@/hooks/usePermissions';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useSchools } from '@/hooks/useSchools';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Search, GraduationCap, Calendar, Star } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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
  const isSuperAdmin = useIsSuperAdmin();
  const hasCreatePermission = useHasPermission('academic_years.create');
  const hasUpdatePermission = useHasPermission('academic_years.update');
  const hasDeletePermission = useHasPermission('academic_years.delete');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>(profile?.organization_id);
  
  const { data: organizations } = useOrganizations();
  const { data: schools } = useSchools();
  const { data: academicYears, isLoading } = useAcademicYears(selectedOrganizationId);
  
  // Create a map of organization_id to school name(s)
  const organizationToSchoolMap = useMemo(() => {
    if (!schools) return {};
    const map: Record<string, string> = {};
    schools.forEach((school) => {
      if (school.organization_id) {
        // If multiple schools per org, show first one or concatenate
        if (!map[school.organization_id]) {
          map[school.organization_id] = school.school_name;
        } else {
          // If multiple schools, show first one (or could show "School 1, School 2")
          // For now, just keep the first one
        }
      }
    });
    return map;
  }, [schools]);
  const createAcademicYear = useCreateAcademicYear();
  const updateAcademicYear = useUpdateAcademicYear();
  const deleteAcademicYear = useDeleteAcademicYear();
  const setCurrentAcademicYear = useSetCurrentAcademicYear();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AcademicYearFormData>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      status: 'active',
      is_current: false,
    },
  });

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
        // Safely extract date part, handling undefined/null values
        const startDate = year.start_date ? (year.start_date.includes('T') ? year.start_date.split('T')[0] : year.start_date) : '';
        const endDate = year.end_date ? (year.end_date.includes('T') ? year.end_date.split('T')[0] : year.end_date) : '';
        
        reset({
          name: year.name || '',
          start_date: startDate,
          end_date: endDate,
          description: year.description || '',
          status: year.status as 'active' | 'archived' | 'planned',
          is_current: year.is_current,
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
          ...data,
          organization_id: selectedOrganizationId || profile?.organization_id || null,
        },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      createAcademicYear.mutate({
        ...data,
        organization_id: selectedOrganizationId || profile?.organization_id || null,
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
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">{t('common.loading')}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {t('academic.academicYears.management')}
              </CardTitle>
              <CardDescription>
                {t('academic.academicYears.title')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Select
                  value={selectedOrganizationId || 'all'}
                  onValueChange={(value) => {
                    setSelectedOrganizationId(value === 'all' ? undefined : value);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {organizations?.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button 
                onClick={() => handleOpenDialog()}
                disabled={!hasCreatePermission}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('academic.academicYears.addAcademicYear')}
              </Button>
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
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">{t('academic.academicYears.active')}</SelectItem>
                  <SelectItem value="archived">{t('academic.academicYears.archived')}</SelectItem>
                  <SelectItem value="planned">{t('academic.academicYears.planned')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('academic.academicYears.name')}</TableHead>
                  <TableHead>{t('academic.academicYears.startDate')}</TableHead>
                  <TableHead>{t('academic.academicYears.endDate')}</TableHead>
                  <TableHead>{t('academic.academicYears.status')}</TableHead>
                  <TableHead>{t('academic.academicYears.isCurrent')}</TableHead>
                  {isSuperAdmin && <TableHead>Type</TableHead>}
                  <TableHead className="text-right">{t('students.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAcademicYears.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperAdmin ? 7 : 6} className="text-center text-muted-foreground">
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
                          {year.is_current && (
                            <Badge variant="default" className="gap-1">
                              <Star className="h-3 w-3" />
                              {t('academic.academicYears.current')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(year.start_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(year.end_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(year.status)}>
                          {getStatusLabel(year.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {year.is_current ? (
                          <Badge variant="default">{t('academic.academicYears.current')}</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetCurrent(year.id)}
                            disabled={!hasUpdatePermission || (year.organization_id === null && !isSuperAdmin)}
                          >
                            {t('academic.academicYears.setAsCurrent')}
                          </Button>
                        )}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          <Badge variant="outline">
                            {year.organization_id === null 
                              ? t('academic.academicYears.globalType')
                              : organizationToSchoolMap[year.organization_id] || 'Unknown School'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(year.id)}
                            disabled={!hasUpdatePermission || (year.organization_id === null && !isSuperAdmin)}
                            title={year.organization_id === null && !isSuperAdmin ? t('academic.academicYears.cannotDeleteGlobal') : ''}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(year.id)}
                            disabled={!hasDeletePermission || (year.organization_id === null && !isSuperAdmin) || year.is_current}
                            title={
                              year.is_current 
                                ? t('academic.academicYears.cannotDeleteCurrent')
                                : year.organization_id === null && !isSuperAdmin 
                                  ? t('academic.academicYears.cannotDeleteGlobal') 
                                  : ''
                            }
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
              {isSuperAdmin && (
                <div className="grid gap-2">
                  <Label htmlFor="organization_id">Organization</Label>
                  <Select
                    value={selectedOrganizationId || 'global'}
                    onValueChange={(value) => {
                      setSelectedOrganizationId(value === 'global' ? undefined : value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (Available to all)</SelectItem>
                      {organizations?.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start_date">
                    {t('academic.academicYears.startDate')} *
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...register('start_date')}
                  />
                  {errors.start_date && (
                    <p className="text-sm text-destructive">{errors.start_date.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end_date">
                    {t('academic.academicYears.endDate')} *
                  </Label>
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
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('academic.academicYears.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

