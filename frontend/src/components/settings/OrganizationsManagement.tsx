import { useState } from 'react';
import { useOrganizations, useCreateOrganization, useUpdateOrganization, useDeleteOrganization, useOrganizationStatistics } from '@/hooks/useOrganizations';
import { useHasPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Trash2, Search, Building2, Eye, Users, Building, DoorOpen, Calendar, Settings as SettingsIcon, GraduationCap, BookOpen, UserCheck } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLanguage } from '@/hooks/useLanguage';

const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255, 'Organization name must be 255 characters or less'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export function OrganizationsManagement() {
  const { t } = useLanguage();
  const hasCreatePermission = useHasPermission('organizations.create');
  const hasUpdatePermission = useHasPermission('organizations.update');
  const hasDeletePermission = useHasPermission('organizations.delete');
  const { data: organizations, isLoading } = useOrganizations();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const deleteOrganization = useDeleteOrganization();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
  });

  const filteredOrganizations = organizations?.filter((org) => {
    const query = (searchQuery || '').toLowerCase();
    return (
      org.name?.toLowerCase().includes(query) ||
      org.slug?.toLowerCase().includes(query)
    );
  }) || [];

  const handleOpenDialog = (orgId?: string) => {
    if (orgId) {
      const org = organizations?.find((o) => o.id === orgId);
      if (org) {
        reset({ name: org.name, slug: org.slug });
        setSelectedOrganization(orgId);
      }
    } else {
      reset({ name: '', slug: '' });
      setSelectedOrganization(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedOrganization(null);
    reset();
  };

  const onSubmit = (data: OrganizationFormData) => {
    if (selectedOrganization) {
      updateOrganization.mutate(
        { id: selectedOrganization, ...data },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      if (data.name && data.slug) {
        createOrganization.mutate({
          name: data.name,
          slug: data.slug,
        }, {
          onSuccess: () => {
            handleCloseDialog();
          },
        });
      }
    }
  };

  const handleDeleteClick = (orgId: string) => {
    setSelectedOrganization(orgId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedOrganization) {
      deleteOrganization.mutate(selectedOrganization, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedOrganization(null);
        },
      });
    }
  };

  const selectedOrg = selectedOrganization ? organizations?.find(o => o.id === selectedOrganization) : null;
  const { data: orgStats } = useOrganizationStatistics(selectedOrganization || '');

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('organizations.title')}
            </CardTitle>
            <CardDescription>{t('organizations.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text={t('organizations.loadingOrganizations')} />
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
                <Building2 className="h-5 w-5" />
                {t('organizations.title')}
              </CardTitle>
              <CardDescription>{t('organizations.subtitle')}</CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t('organizations.addOrganization')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('organizations.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('organizations.name')}</TableHead>
                  <TableHead>{t('organizations.slug')}</TableHead>
                  <TableHead>{t('organizations.settings')}</TableHead>
                  <TableHead>{t('organizations.createdAt')}</TableHead>
                  <TableHead>{t('organizations.updatedAt')}</TableHead>
                  <TableHead className="text-right">{t('organizations.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {searchQuery ? t('organizations.noOrganizationsFound') : t('organizations.noOrganizationsMessage')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrganizations.map((org) => {
                    const hasSettings = org.settings && Object.keys(org.settings).length > 0;
                    return (
                      <TableRow key={org.id}>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell>
                          <code className="text-sm bg-muted px-2 py-1 rounded">{org.slug}</code>
                        </TableCell>
                        <TableCell>
                          {hasSettings ? (
                            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                              <SettingsIcon className="h-3 w-3" />
                              {Object.keys(org.settings).length} setting{Object.keys(org.settings).length !== 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No settings</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(org.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(org.updatedAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrganization(org.id);
                                setIsDetailsDialogOpen(true);
                              }}
                              title={t('organizations.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasUpdatePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(org.id)}
                                title={t('organizations.edit')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {hasDeletePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(org.id)}
                                title={t('organizations.delete')}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedOrganization ? t('organizations.editOrganization') : t('organizations.addNewOrganization')}
              </DialogTitle>
              <DialogDescription>
                {selectedOrganization
                  ? t('organizations.updateOrganizationInfo')
                  : t('organizations.enterOrganizationDetails')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('organizations.organizationName')}</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder={t('organizations.enterOrganizationName')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">{t('organizations.slug')}</Label>
                <Input
                  id="slug"
                  {...register('slug')}
                  placeholder={t('organizations.slugPlaceholder')}
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('organizations.slugHint')}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('organizations.cancel')}
              </Button>
              <Button type="submit" disabled={createOrganization.isPending || updateOrganization.isPending}>
                {selectedOrganization ? t('organizations.update') : t('organizations.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Organization Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('organizations.organizationDetails')}
            </DialogTitle>
            <DialogDescription>
              {t('organizations.viewCompleteInfo').replace('{name}', selectedOrg?.name || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedOrg && (
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('organizations.basicInformation')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('organizations.name')}</Label>
                    <p className="font-medium">{selectedOrg.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('organizations.slug')}</Label>
                    <p>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{selectedOrg.slug}</code>
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('organizations.id')}</Label>
                    <p className="text-sm font-mono text-muted-foreground break-all">{selectedOrg.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('organizations.createdAt')}</Label>
                    <p className="text-sm">{new Date(selectedOrg.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('organizations.updatedAt')}</Label>
                    <p className="text-sm">{new Date(selectedOrg.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {orgStats && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{t('organizations.statistics')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-2xl font-bold">{orgStats.userCount}</p>
                            <p className="text-sm text-muted-foreground">{t('organizations.users')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-2xl font-bold">{orgStats.schoolCount}</p>
                            <p className="text-sm text-muted-foreground">{t('organizations.schools')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-2xl font-bold">{orgStats.studentCount}</p>
                            <p className="text-sm text-muted-foreground">{t('organizations.students')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-2xl font-bold">{orgStats.classCount}</p>
                            <p className="text-sm text-muted-foreground">{t('organizations.classes')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-2xl font-bold">{orgStats.staffCount}</p>
                            <p className="text-sm text-muted-foreground">{t('organizations.staff')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-2xl font-bold">{orgStats.buildingCount}</p>
                            <p className="text-sm text-muted-foreground">{t('organizations.buildings')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DoorOpen className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-2xl font-bold">{orgStats.roomCount}</p>
                            <p className="text-sm text-muted-foreground">{t('organizations.rooms')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('organizations.settingsTitle')}</h3>
                {selectedOrg.settings && Object.keys(selectedOrg.settings).length > 0 ? (
                  <div className="rounded-md border p-4 bg-muted/50">
                    <pre className="text-sm overflow-x-auto">
                      {JSON.stringify(selectedOrg.settings, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('organizations.noSettingsConfigured')}</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              {t('organizations.close')}
            </Button>
            <Button onClick={() => {
              setIsDetailsDialogOpen(false);
              handleOpenDialog(selectedOrganization || undefined);
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('organizations.editOrganizationButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('organizations.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('organizations.deleteConfirmDescription').replace('{name}', selectedOrganization && organizations?.find((o) => o.id === selectedOrganization) ? organizations.find((o) => o.id === selectedOrganization)?.name || '' : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('organizations.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('organizations.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

