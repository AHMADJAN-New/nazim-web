import { ClipboardList, CheckCircle2, Plus, MoreHorizontal, Pencil, StopCircle, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
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

import { useOrgHrAssignments, useOrgHrStaff, useCreateOrgHrAssignment, useUpdateOrgHrAssignment, useDeleteOrgHrAssignment } from '@/hooks/orgHr/useOrgHr';
import { useSchools } from '@/hooks/useSchools';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import type { School } from '@/types/domain/school';
import type { OrgHrAssignment } from '@/types/domain/orgHr';
import { formatDate } from '@/lib/utils';
import { orgHrAssignmentCreateSchema, orgHrAssignmentUpdateSchema, type OrgHrAssignmentCreateFormData, type OrgHrAssignmentUpdateFormData } from '@/lib/validations/orgHr';
import { CalendarFormField } from '@/components/ui/calendar-form-field';

const assignmentStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'active': return 'default';
    case 'ended': return 'secondary';
    case 'suspended': return 'destructive';
    default: return 'outline';
  }
};

function getStaffDisplayName(assignment: OrgHrAssignment): string {
  if (assignment.staffFirstName != null || assignment.staffFatherName != null) {
    return [assignment.staffFirstName, assignment.staffFatherName].filter(Boolean).join(' ') || assignment.staffId.slice(0, 8) + '…';
  }
  return assignment.staffId.slice(0, 8) + '…';
}

export default function OrganizationHrAssignmentsPage() {
  const { t, isRTL } = useLanguage();
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editAssignment, setEditAssignment] = useState<OrgHrAssignment | null>(null);
  const [endTarget, setEndTarget] = useState<OrgHrAssignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgHrAssignment | null>(null);

  const hasCreate = useHasPermission('hr_assignments.create');
  const hasUpdate = useHasPermission('hr_assignments.update');
  const hasDelete = useHasPermission('hr_assignments.delete');

  const { data: schools } = useSchools();
  const { data: staffList } = useOrgHrStaff({ perPage: 150 });
  const { data, isLoading } = useOrgHrAssignments({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    schoolId: schoolFilter !== 'all' ? schoolFilter : undefined,
  });

  const createMutation = useCreateOrgHrAssignment();
  const updateMutation = useUpdateOrgHrAssignment();
  const deleteMutation = useDeleteOrgHrAssignment();

  const assignments = useMemo(() => data?.data ?? [], [data]);
  const staff = useMemo(() => staffList?.data ?? [], [staffList]);

  const getSchoolDisplayName = (schoolId: string): string => {
    if (!schools?.length) return schoolId;
    const school = schools.find((s: School) => s.id === schoolId);
    return school?.schoolName ?? schoolId;
  };

  const createForm = useForm<OrgHrAssignmentCreateFormData>({
    resolver: zodResolver(orgHrAssignmentCreateSchema),
    defaultValues: {
      staff_id: '',
      school_id: '',
      role_title: '',
      allocation_percent: 100,
      is_primary: true,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      status: 'active',
      notes: null,
    },
  });

  const editForm = useForm<OrgHrAssignmentUpdateFormData>({
    resolver: zodResolver(orgHrAssignmentUpdateSchema),
    defaultValues: {
      role_title: '',
      allocation_percent: 100,
      is_primary: false,
      end_date: null,
      status: 'active',
      notes: null,
    },
  });

  const handleCreateOpen = () => {
    createForm.reset({
      staff_id: '',
      school_id: '',
      role_title: '',
      allocation_percent: 100,
      is_primary: true,
      start_date: new Date().toISOString().slice(0, 10),
      end_date: null,
      status: 'active',
      notes: null,
    });
    setCreateOpen(true);
  };

  const handleCreateSubmit = (values: OrgHrAssignmentCreateFormData) => {
    createMutation.mutate(
      {
        staff_id: values.staff_id,
        school_id: values.school_id,
        role_title: values.role_title || null,
        allocation_percent: values.allocation_percent,
        is_primary: values.is_primary,
        start_date: values.start_date,
        end_date: values.end_date || null,
        status: values.status || 'active',
        notes: values.notes || null,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
        },
      }
    );
  };

  const handleEditOpen = (assignment: OrgHrAssignment) => {
    setEditAssignment(assignment);
    const status = ['active', 'ended', 'suspended'].includes(assignment.status) ? assignment.status : 'active';
    editForm.reset({
      role_title: assignment.roleTitle ?? '',
      allocation_percent: assignment.allocationPercent,
      is_primary: assignment.isPrimary,
      end_date: assignment.endDate ?? null,
      status: status as 'active' | 'ended' | 'suspended',
      notes: assignment.notes ?? null,
    });
  };

  const handleEditSubmit = (values: OrgHrAssignmentUpdateFormData) => {
    if (!editAssignment) return;
    const status = values.status as 'active' | 'ended' | 'suspended' | undefined;
    updateMutation.mutate(
      {
        id: editAssignment.id,
        role_title: values.role_title ?? null,
        allocation_percent: values.allocation_percent,
        is_primary: values.is_primary,
        end_date: values.end_date ?? null,
        status,
        notes: values.notes ?? null,
      },
      {
        onSuccess: () => {
          setEditAssignment(null);
        },
      }
    );
  };

  const handleEndConfirm = () => {
    if (!endTarget) return;
    const today = new Date().toISOString().slice(0, 10);
    updateMutation.mutate(
      { id: endTarget.id, end_date: today, status: 'ended' },
      { onSuccess: () => setEndTarget(null) }
    );
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <PageHeader
        title={t('organizationHr.assignmentsTitle')}
        description={t('organizationHr.assignmentsPageDesc')}
        icon={<ClipboardList className="h-5 w-5" />}
        breadcrumbs={[
          { label: t('organizationHr.hubTitle'), href: '/org-admin/hr' },
          { label: t('organizationHr.assignments') },
        ]}
        rightSlot={
          hasCreate ? (
            <Button onClick={handleCreateOpen} size="sm" className="flex-shrink-0">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t('organizationHr.addAssignment')}</span>
            </Button>
          ) : undefined
        }
      />

      <FilterPanel title={t('organizationHr.filters')} defaultOpenDesktop defaultOpenMobile={false}>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('organizationHr.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('organizationHr.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('organizationHr.statusActive')}</SelectItem>
              <SelectItem value="ended">{t('organizationHr.statusEnded')}</SelectItem>
              <SelectItem value="suspended">{t('organizationHr.statusSuspended')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t('organizationHr.allSchools')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('organizationHr.allSchools')}</SelectItem>
              {(schools ?? []).map((s: School) => (
                <SelectItem key={s.id} value={s.id}>{s.schoolName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('organizationHr.staffMember')}</TableHead>
                    <TableHead>{t('organizationHr.school')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('organizationHr.roleTitle')}</TableHead>
                    <TableHead>{t('organizationHr.allocation')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('organizationHr.primary')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('organizationHr.startDate')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('organizationHr.endDate')}</TableHead>
                    <TableHead>{t('organizationHr.status')}</TableHead>
                    {(hasUpdate || hasDelete) && (
                      <TableHead className="w-[50px]" />
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                        {t('organizationHr.noAssignmentsFound')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{getStaffDisplayName(assignment)}</TableCell>
                        <TableCell>{getSchoolDisplayName(assignment.schoolId)}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{assignment.roleTitle || '—'}</TableCell>
                        <TableCell className="font-medium">{assignment.allocationPercent}%</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {assignment.isPrimary && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(assignment.startDate)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{assignment.endDate ? formatDate(assignment.endDate) : '—'}</TableCell>
                        <TableCell>
                          <Badge variant={assignmentStatusVariant(assignment.status)}>{assignment.status}</Badge>
                        </TableCell>
                        {(hasUpdate || hasDelete) && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t('common.actions')}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                                {hasUpdate && assignment.status === 'active' && (
                                  <DropdownMenuItem onClick={() => handleEditOpen(assignment)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {t('organizationHr.editAssignmentTitle')}
                                  </DropdownMenuItem>
                                )}
                                {hasUpdate && assignment.status === 'active' && (
                                  <DropdownMenuItem onClick={() => setEndTarget(assignment)}>
                                    <StopCircle className="h-4 w-4 mr-2" />
                                    End assignment
                                  </DropdownMenuItem>
                                )}
                                {hasDelete && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteTarget(assignment)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          {data && data.total > 0 && (
            <div className="border-t px-4 py-3 text-sm text-muted-foreground">
              {t('organizationHr.showingResults', { count: String(assignments.length), total: String(data.total) }) ||
                `Showing ${assignments.length} of ${data.total} assignments`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create assignment dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('organizationHr.createAssignmentTitle')}</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="staff_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('organizationHr.staffMember')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} required>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('organizationHr.staffMember')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {[s.firstName, s.fatherName].filter(Boolean).join(' ')} ({s.employeeId})
                          </SelectItem>
                        ))}
                        {staff.length === 0 && (
                          <SelectItem value="_none" disabled>No staff found</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="school_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('organizationHr.school')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} required>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('organizationHr.allSchools')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(schools ?? []).map((s: School) => (
                          <SelectItem key={s.id} value={s.id}>{s.schoolName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="role_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('organizationHr.roleTitle')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="e.g. Teacher" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="allocation_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('organizationHr.allocation')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={5}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="is_primary"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-2 space-y-0 pb-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">{t('organizationHr.primary')}</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <CalendarFormField
                control={createForm.control}
                name="start_date"
                label={t('organizationHr.startDate')}
                placeholder="Select start date"
                required
              />
              <CalendarFormField
                control={createForm.control}
                name="end_date"
                label={t('organizationHr.endDate')}
                placeholder="Optional"
              />
              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('organizationHr.notes')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="Optional notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit assignment dialog */}
      <Dialog open={!!editAssignment} onOpenChange={(open) => !open && setEditAssignment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('organizationHr.editAssignmentTitle')}</DialogTitle>
          </DialogHeader>
          {editAssignment && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="role_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('organizationHr.roleTitle')}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="allocation_percent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('organizationHr.allocation')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={5}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="is_primary"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">{t('organizationHr.primary')}</FormLabel>
                    </FormItem>
                  )}
                />
                <CalendarFormField
                  control={editForm.control}
                  name="end_date"
                  label={t('organizationHr.endDate')}
                  placeholder="Optional"
                />
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('organizationHr.status')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">{t('organizationHr.statusActive')}</SelectItem>
                          <SelectItem value="ended">{t('organizationHr.statusEnded')}</SelectItem>
                          <SelectItem value="suspended">{t('organizationHr.statusSuspended')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('organizationHr.notes')}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditAssignment(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? t('common.saving') : t('common.save')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* End assignment confirm */}
      <AlertDialog open={!!endTarget} onOpenChange={(open) => !open && setEndTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End assignment</AlertDialogTitle>
            <AlertDialogDescription>
              {t('organizationHr.confirmEndAssignment')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleEndConfirm} disabled={updateMutation.isPending}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete assignment confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove assignment</AlertDialogTitle>
            <AlertDialogDescription>
              {t('organizationHr.confirmDeleteAssignment')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
