import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, ChevronDown, ChevronRight, Edit, Plus, Search, Shield, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useCurrentOrganization } from '@/hooks/useOrganizations';
import {
  getFeatureKeyForGrouping,
  type Permission,
  type Role,
  useAssignPermissionToRole,
  useCreateRole,
  useDeleteRole,
  useHasPermission,
  usePermissions,
  useRemovePermissionFromRole,
  useRolePermissions,
  useRoles,
  useUpdateRole,
} from '@/hooks/usePermissions';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { canRoleReceivePermission, filterPermissionsForRole, filterRolesForSchoolScopedAdmin } from '@/lib/access/schoolAdminRestrictions';
import { getPermissionsManagementCatalog } from '@/lib/permissionsManagementCatalog';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(255, 'Role name must be 255 characters or less'),
  description: z.string().max(1000, 'Description must be 1000 characters or less').optional().nullable(),
});

type RoleFormData = z.infer<typeof roleSchema>;
type PermissionFilter = 'all' | 'assigned' | 'missing';
type FeatureSection = { key: string; label: string; permissions: Permission[]; assigned: number };

/** English fallback if a feature key is missing from the locale catalog */
const FEATURE_LABELS: Record<string, string> = {
  students: 'Students',
  staff: 'Staff',
  classes: 'Classes',
  subjects: 'Subjects',
  exams: 'Exams',
  exams_full: 'Exams (full)',
  grades: 'Grades',
  attendance: 'Attendance',
  finance: 'Finance',
  fees: 'Fees',
  multi_currency: 'Multi-currency',
  dms: 'Document Management',
  events: 'Events',
  library: 'Library',
  hostel: 'Hostel',
  graduation: 'Graduation',
  id_cards: 'ID Cards',
  assets: 'Assets',
  org_hr_core: 'Organization HR',
  org_hr_payroll: 'Organization Payroll',
  org_hr_analytics: 'Organization HR Reports',
  org_finance: 'Organization Finance',
  leave_management: 'Leave Management',
  other: 'Other',
};

const FEATURE_ORDER = [
  'students', 'staff', 'classes', 'subjects', 'exams', 'exams_full', 'grades', 'attendance',
  'finance', 'fees', 'multi_currency', 'dms', 'events', 'library', 'hostel', 'graduation',
  'id_cards', 'assets', 'org_hr_core', 'org_hr_payroll', 'org_hr_analytics', 'org_finance',
  'leave_management', 'other',
] as const;

const humanize = (value: string) => value.split(/[._]/g).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');

export function PermissionsManagement() {
  const { t, language } = useLanguage();
  const catalog = useMemo(() => getPermissionsManagementCatalog(language), [language]);
  const { data: profile } = useProfile();
  const { data: currentOrg } = useCurrentOrganization();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: permissions = [], isLoading: permissionsLoading } = usePermissions();
  const hasRead = useHasPermission('permissions.read');
  const canUpdatePermissions = useHasPermission('permissions.update');
  const canCreateRoles = useHasPermission('roles.create');
  const canUpdateRoles = useHasPermission('roles.update');
  const canDeleteRoles = useHasPermission('roles.delete');
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const assignPermission = useAssignPermissionToRole();
  const removePermission = useRemovePermissionFromRole();

  const [roleSearch, setRoleSearch] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [permissionFilter, setPermissionFilter] = useState<PermissionFilter>('all');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([FEATURE_ORDER[0] ?? 'other']));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dialogRole, setDialogRole] = useState<Role | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '' },
  });

  const visibleRoles = useMemo(() => filterRolesForSchoolScopedAdmin(roles, profile), [roles, profile]);
  const filteredRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    const sorted = [...visibleRoles].sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((role) => {
      const title = (catalog.roles[role.name]?.title ?? humanize(role.name)).toLowerCase();
      const descFromCatalog = catalog.roles[role.name]?.description ?? '';
      const desc = (descFromCatalog || role.description || '').toLowerCase();
      return (
        role.name.toLowerCase().includes(query)
        || title.includes(query)
        || desc.includes(query)
      );
    });
  }, [catalog, roleSearch, visibleRoles]);

  useEffect(() => {
    if (!filteredRoles.length) return setSelectedRoleId(null);
    if (!selectedRoleId || !filteredRoles.some((role) => role.id === selectedRoleId)) setSelectedRoleId(filteredRoles[0]?.id ?? null);
  }, [filteredRoles, selectedRoleId]);

  const selectedRole = useMemo(() => filteredRoles.find((role) => role.id === selectedRoleId) ?? null, [filteredRoles, selectedRoleId]);
  const { data: rolePermissionsData, isLoading: rolePermissionsLoading } = useRolePermissions(selectedRole?.name ?? '');
  const assignedNames = useMemo(() => new Set(rolePermissionsData?.permissions ?? []), [rolePermissionsData]);
  const rolePermissions = useMemo(() => filterPermissionsForRole(permissions, selectedRole?.name), [permissions, selectedRole?.name]);
  const hiddenForRole = permissions.length - rolePermissions.length;

  const visiblePermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    return rolePermissions.filter((permission) => {
      const assigned = assignedNames.has(permission.name);
      if (permissionFilter === 'assigned' && !assigned) return false;
      if (permissionFilter === 'missing' && assigned) return false;
      if (!query) return true;
      const cat = catalog.permissions[permission.name];
      const actionLabel = cat?.actionLabel ?? humanize(permission.action);
      const desc = cat?.description ?? permission.description ?? `${humanize(permission.action)} ${humanize(permission.resource)}`;
      return (
        permission.name.toLowerCase().includes(query)
        || permission.resource.toLowerCase().includes(query)
        || permission.action.toLowerCase().includes(query)
        || (permission.description?.toLowerCase().includes(query) ?? false)
        || actionLabel.toLowerCase().includes(query)
        || desc.toLowerCase().includes(query)
      );
    });
  }, [assignedNames, catalog, permissionFilter, permissionSearch, rolePermissions]);

  const sections = useMemo<FeatureSection[]>(() => {
    const grouped = new Map<string, Permission[]>();
    visiblePermissions.forEach((permission) => {
      const key = getFeatureKeyForGrouping(permission.name);
      grouped.set(key, [...(grouped.get(key) ?? []), permission]);
    });
    const order = new Map(FEATURE_ORDER.map((key, index) => [key, index]));
    return Array.from(grouped.entries()).map(([key, items]) => ({
      key,
      label: catalog.featureSections[key] ?? FEATURE_LABELS[key] ?? humanize(key),
      permissions: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      assigned: items.filter((permission) => assignedNames.has(permission.name)).length,
    })).sort((a, b) => (order.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.key) ?? Number.MAX_SAFE_INTEGER) || a.label.localeCompare(b.label));
  }, [assignedNames, catalog, visiblePermissions]);

  const assignedCount = useMemo(() => rolePermissions.filter((permission) => assignedNames.has(permission.name)).length, [assignedNames, rolePermissions]);

  const toggleSection = (key: string) => setExpanded((current) => {
    const next = new Set(current);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const togglePermission = async (permission: Permission) => {
    if (!selectedRole) return;
    try {
      if (assignedNames.has(permission.name)) {
        await removePermission.mutateAsync({ role: selectedRole.name, permissionId: permission.id, silent: true });
      } else {
        await assignPermission.mutateAsync({ role: selectedRole.name, permissionId: permission.id, silent: true });
      }
    } catch (error: any) {
      showToast.error(error.message || t('permissions.failedToUpdate'));
    }
  };

  const bulkUpdate = async (items: Permission[], shouldAssign: boolean) => {
    if (!selectedRole) return;
    const pending = items.filter((permission) => shouldAssign ? !assignedNames.has(permission.name) : assignedNames.has(permission.name));
    if (!pending.length) {
      showToast.info(shouldAssign ? 'permissions.bulkAlreadyAllAssigned' : 'permissions.bulkNoneInSection');
      return;
    }
    const results = await Promise.allSettled(pending.map((permission) => shouldAssign
      ? assignPermission.mutateAsync({ role: selectedRole.name, permissionId: permission.id, silent: true })
      : removePermission.mutateAsync({ role: selectedRole.name, permissionId: permission.id, silent: true })));
    const ok = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - ok;
    const roleTitle = catalog.roles[selectedRole.name]?.title ?? humanize(selectedRole.name);
    if (ok) {
      showToast.success(
        shouldAssign ? 'permissions.bulkAssignSuccess' : 'permissions.bulkRemoveSuccess',
        { count: ok, roleName: roleTitle },
      );
    }
    if (failed) {
      showToast.error(
        shouldAssign ? 'permissions.bulkAssignFailed' : 'permissions.bulkRemoveFailed',
        { count: failed },
      );
    }
  };

  const handleCreateRole = async (data: RoleFormData) => {
    try {
      await createRole.mutateAsync({ name: data.name, description: data.description || null, guard_name: 'web' });
      setShowCreateDialog(false);
      reset();
    } catch {
      // Mutation handles toast state.
    }
  };

  const handleUpdateRole = async (data: RoleFormData) => {
    if (!dialogRole) return;
    try {
      await updateRole.mutateAsync({ id: dialogRole.id, name: data.name, description: data.description || null });
      setShowEditDialog(false);
      setDialogRole(null);
      reset();
    } catch {
      // Mutation handles toast state.
    }
  };

  const handleDeleteRole = async () => {
    if (!dialogRole) return;
    try {
      await deleteRole.mutateAsync(dialogRole.id);
      setShowDeleteDialog(false);
      setDialogRole(null);
    } catch {
      // Mutation handles toast state.
    }
  };

  if (!hasRead) {
    return <div className="container mx-auto max-w-7xl overflow-x-hidden p-4 md:p-6"><Card><CardContent className="p-6"><div className="text-center text-destructive"><Shield className="mx-auto mb-4 h-12 w-12" /><h3 className="mb-2 text-lg font-semibold">{t('permissions.accessDenied')}</h3><p>{t('permissions.noPermissionMessage')}</p></div></CardContent></Card></div>;
  }

  if (permissionsLoading || rolesLoading) {
    return <div className="container mx-auto max-w-7xl overflow-x-hidden p-4 md:p-6"><Card><CardContent className="p-6"><div className="text-center"><LoadingSpinner size="lg" text={t('permissions.loadingPermissions')} /></div></CardContent></Card></div>;
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
      {currentOrg && <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"><CardContent className="p-4"><div className="flex items-start gap-2"><Building2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-blue-900 dark:text-blue-100">{t('permissions.managingPermissionsFor', { name: currentOrg.name })}</p><p className="mt-1 text-xs text-blue-700 dark:text-blue-300">{t('permissions.viewGlobalAndManage')}</p></div></div></CardContent></Card>}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div><CardTitle className="flex items-center gap-2"><Shield className="hidden h-5 w-5 sm:inline-flex" />{t('permissions.title')}</CardTitle><CardDescription className="mt-1">{t('permissions.subtitle', { orgName: currentOrg?.name || '—' })}</CardDescription></div>
            {canCreateRoles && <Button onClick={() => setShowCreateDialog(true)} className="w-full lg:w-auto"><Plus className="h-4 w-4" /><span className="ml-2">{t('roles.createRole') || 'Add Role'}</span></Button>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 xl:grid-cols-[280px,minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t('permissions.searchRolesPlaceholder')} value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} className="pl-10" /></div>
              <div className="rounded-2xl border bg-muted/20">
                <div className="flex items-center justify-between px-4 py-3"><p className="text-sm font-medium">{t('permissions.rolesColumnTitle')}</p><Badge variant="secondary">{filteredRoles.length}</Badge></div>
                <Separator />
                <ScrollArea className="h-[520px]">
                  <div className="space-y-2 p-3">
                    {!filteredRoles.length ? <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{roleSearch ? t('roles.noRolesFound') : t('roles.noRolesMessage')}</div> : filteredRoles.map((role) => {
                      const roleTitle = catalog.roles[role.name]?.title ?? humanize(role.name);
                      const roleDesc = catalog.roles[role.name]?.description ?? role.description;
                      return (
                        <button key={role.id} type="button" onClick={() => setSelectedRoleId(role.id)} className={cn('w-full rounded-xl border px-4 py-3 text-left transition-colors', role.id === selectedRole?.id ? 'border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40' : 'border-border bg-background hover:bg-muted/60')}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{roleTitle}</p>
                              {roleDesc ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{roleDesc}</p> : null}
                            </div>
                            {role.id === selectedRole?.id && <Badge className="shrink-0">{t('permissions.activeBadge')}</Badge>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <div className="space-y-4">
              {!selectedRole ? <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed"><div className="max-w-sm text-center text-muted-foreground"><Shield className="mx-auto mb-3 h-10 w-10" /><p className="font-medium">{t('permissions.selectRoleTitle')}</p><p className="mt-1 text-sm">{t('permissions.selectRoleHint')}</p></div></div> : (
                <>
                  <div className="rounded-2xl border bg-background p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="text-2xl font-semibold">{catalog.roles[selectedRole.name]?.title ?? humanize(selectedRole.name)}</h3><Badge variant="secondary">{t('permissions.assignedCountBadge', { assigned: assignedCount, total: rolePermissions.length })}</Badge>{selectedRole.name === 'admin' && <Badge variant="outline">{t('permissions.schoolScopedRoleBadge')}</Badge>}</div>
                        {(catalog.roles[selectedRole.name]?.description || selectedRole.description) ? <p className="text-sm text-muted-foreground">{catalog.roles[selectedRole.name]?.description ?? selectedRole.description}</p> : null}
                        {selectedRole.name === 'admin' && hiddenForRole > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">{t('permissions.schoolScopedAdminHint')}</div>}
                      </div>
                      <div className="flex flex-wrap gap-2">{canUpdateRoles && <Button variant="outline" onClick={() => { setDialogRole(selectedRole); reset({ name: selectedRole.name, description: selectedRole.description || '' }); setShowEditDialog(true); }}><Edit className="h-4 w-4" /><span className="ml-2">{t('events.edit')}</span></Button>}{canDeleteRoles && <Button variant="destructive" onClick={() => { setDialogRole(selectedRole); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4" /><span className="ml-2">{t('events.delete')}</span></Button>}</div>
                    </div>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),220px]">
                    <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t('permissions.searchPermissionsPlaceholder')} value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} className="pl-10" /></div>
                    <Select value={permissionFilter} onValueChange={(value) => setPermissionFilter(value as PermissionFilter)}><SelectTrigger><SelectValue placeholder={t('permissions.filterPermissionsPlaceholder')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('permissions.filterAll')}</SelectItem><SelectItem value="assigned">{t('permissions.filterAssignedOnly')}</SelectItem><SelectItem value="missing">{t('permissions.filterMissing')}</SelectItem></SelectContent></Select>
                  </div>
                  <div className="rounded-2xl border bg-background">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4"><div><p className="text-sm font-medium">{t('permissions.workspaceTitle')}</p><p className="text-xs text-muted-foreground">{t('permissions.workspaceSubtitle')}</p></div><div className="flex flex-wrap gap-2"><Badge variant="secondary">{t('permissions.sectionsBadge', { count: sections.length })}</Badge><Badge variant="outline">{t('permissions.visibleBadge', { count: visiblePermissions.length })}</Badge></div></div>
                    <Separator />
                    {rolePermissionsLoading ? <div className="p-6"><LoadingSpinner size="sm" text={t('permissions.loadingRolePermissions')} /></div> : <ScrollArea className="h-[620px]"><div className="space-y-3 p-4">{!sections.length ? <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t('permissions.noPermissionsMatchFilter')}</div> : sections.map((section) => <Collapsible key={section.key} open={expanded.has(section.key)} onOpenChange={() => toggleSection(section.key)} className="rounded-2xl border bg-muted/20"><div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between"><CollapsibleTrigger asChild><button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left">{expanded.has(section.key) ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}<span className="truncate font-medium">{section.label}</span><Badge variant="secondary">{section.permissions.length}</Badge><Badge variant="outline">{t('permissions.sectionAssignedBadge', { count: section.assigned })}</Badge></button></CollapsibleTrigger>{canUpdatePermissions && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => bulkUpdate(section.permissions, true)} disabled={!section.permissions.some((permission) => !assignedNames.has(permission.name))}>{t('permissions.assignAllVisible')}</Button><Button size="sm" variant="outline" onClick={() => bulkUpdate(section.permissions, false)} disabled={!section.permissions.some((permission) => assignedNames.has(permission.name))}>{t('permissions.clearAssigned')}</Button></div>}</div><CollapsibleContent><Separator /><div className="grid gap-3 p-4 xl:grid-cols-2">{section.permissions.map((permission) => {
                      const catPerm = catalog.permissions[permission.name];
                      const actionLabel = catPerm?.actionLabel ?? humanize(permission.action);
                      const permDesc = catPerm?.description ?? permission.description ?? `${humanize(permission.action)} ${humanize(permission.resource)}`;
                      return (
                        <div key={permission.id} className="flex items-start gap-3 rounded-xl border bg-background px-4 py-3">
                          <Checkbox checked={assignedNames.has(permission.name)} disabled={!canUpdatePermissions || !canRoleReceivePermission(selectedRole.name, permission.name)} onCheckedChange={() => togglePermission(permission)} className="mt-1" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Label className="font-medium">{actionLabel}</Label>
                              {assignedNames.has(permission.name) && <Badge className="text-xs">{t('permissions.assignedBadge')}</Badge>}
                              <Badge variant="outline" className="font-mono text-[10px]">{permission.name}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{permDesc}</p>
                          </div>
                        </div>
                      );
                    })}</div></CollapsibleContent></Collapsible>)}</div></ScrollArea>}
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('roles.createRoleDialog') || 'Create Role'}</DialogTitle>
            <DialogDescription>{t('roles.createNewRole') || 'Create a new role for your organization'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateRole)} className="space-y-4">
            <div>
              <Label htmlFor="create-role-name">{t('roles.roleNameRequired') || 'Role Name'} *</Label>
              <Input id="create-role-name" {...register('name')} placeholder={t('roles.roleNamePlaceholder') || 'e.g., Manager, Editor'} />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="create-role-description">{t('events.description') || 'Description'}</Label>
              <Input id="create-role-description" {...register('description')} placeholder={t('permissions.descriptionPlaceholder') || 'Optional description'} />
              {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreateDialog(false); reset(); }}>{t('events.cancel') || 'Cancel'}</Button>
              <Button type="submit" disabled={createRole.isPending}>{createRole.isPending ? (t('events.saving') || 'Saving...') : (t('events.create') || 'Create')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('roles.editRole') || 'Edit Role'}</DialogTitle>
            <DialogDescription>{t('roles.updateRoleInfo') || 'Update role information'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleUpdateRole)} className="space-y-4">
            <div>
              <Label htmlFor="edit-role-name">{t('roles.roleNameRequired') || 'Role Name'} *</Label>
              <Input id="edit-role-name" {...register('name')} disabled />
              <p className="mt-1 text-sm text-muted-foreground">{t('roles.roleNameCannotChange') || 'Role name cannot be changed'}</p>
            </div>
            <div>
              <Label htmlFor="edit-role-description">{t('events.description') || 'Description'}</Label>
              <Input id="edit-role-description" {...register('description')} placeholder={t('permissions.descriptionPlaceholder') || 'Optional description'} />
              {errors.description && <p className="mt-1 text-sm text-destructive">{errors.description.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowEditDialog(false); setDialogRole(null); reset(); }}>{t('events.cancel') || 'Cancel'}</Button>
              <Button type="submit" disabled={updateRole.isPending}>{updateRole.isPending ? (t('events.saving') || 'Saving...') : (t('events.update') || 'Update')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('roles.deleteRole') || 'Delete Role'}</AlertDialogTitle>
            <AlertDialogDescription>{t('assets.deleteConfirm')?.replace('{name}', dialogRole?.name || '') || `Are you sure you want to delete "${dialogRole?.name}"? This action cannot be undone.`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteDialog(false); setDialogRole(null); }}>{t('events.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteRole.isPending}>{deleteRole.isPending ? (t('events.deleting') || 'Deleting...') : (t('events.delete') || 'Delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
