import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Building2, Eye, Users, Building, DoorOpen, Calendar, Settings as SettingsIcon, GraduationCap, BookOpen, UserCheck, Mail, Phone, Globe, MapPin, FileText, User, CheckCircle, Package } from 'lucide-react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOrganizations, useCreateOrganization, useUpdateOrganization, useDeleteOrganization } from '@/hooks/useOrganizations';
import { formatDate, formatDateTime } from '@/lib/utils';
import { organizationsApi } from '@/lib/api/client';
import { useAdminOrganizations } from '@/hooks/useSubscriptionAdmin';
import { organizationSchema, type OrganizationFormData } from '@/lib/validations/organization';
import { 
  usePlatformOrganizations, 
  usePlatformCreateOrganization, 
  usePlatformUpdateOrganization, 
  usePlatformDeleteOrganization 
} from '@/platform/hooks/usePlatformAdminComplete';
import { useHasPermission } from '@/hooks/usePermissions';
import { usePlatformAdminPermissions } from '@/platform/hooks/usePlatformAdminPermissions';


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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { CalendarFormField } from '@/components/ui/calendar-form-field';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';

export function OrganizationsManagement() {
  const { t } = useLanguage();
  const location = useLocation();
  const isPlatformAdminRoute = location.pathname.startsWith('/platform');
  
  // CRITICAL: Always call hooks unconditionally (Rules of Hooks)
  // For platform admin routes, use platform admin permissions hook
  // For regular routes, use regular permissions hook
  const { data: platformPermissions } = usePlatformAdminPermissions();
  const hasCreatePermission = useHasPermission('organizations.create');
  const hasUpdatePermission = useHasPermission('organizations.update');
  const hasDeletePermission = useHasPermission('organizations.delete');
  const hasSubscriptionAdminPermissionRegular = useHasPermission('subscription.admin');
  
  // Check if user has subscription.admin permission
  // Platform admins use platformPermissions, regular users use hasSubscriptionAdminPermissionRegular
  const hasSubscriptionAdminPermission = isPlatformAdminRoute
    ? (platformPermissions?.includes('subscription.admin') ?? false)
    : (hasSubscriptionAdminPermissionRegular ?? false);
  
  // Platform admins can manage organizations (they have subscription.admin permission)
  // Regular users need organization-specific permissions
  const canCreateOrganization = isPlatformAdminRoute 
    ? hasSubscriptionAdminPermission 
    : hasCreatePermission;
  const canUpdateOrganization = isPlatformAdminRoute
    ? hasSubscriptionAdminPermission
    : hasUpdatePermission;
  const canDeleteOrganization = isPlatformAdminRoute
    ? hasSubscriptionAdminPermission
    : hasDeletePermission;
  
  // Use platform admin hook if accessed from platform admin routes, otherwise use regular hooks
  // CRITICAL: Disable useOrganizations on platform admin routes to avoid 403 errors
  // Platform admins don't have organization_id, so useOrganizations will fail
  const { data: platformOrganizations, isLoading: isPlatformLoading } = usePlatformOrganizations();
  const { data: adminOrganizations, isLoading: isAdminLoading } = useAdminOrganizations();
  
  // Disable useOrganizations on platform admin routes (prevents 403 for platform admins)
  const { data: regularOrganizations, isLoading: isRegularLoading } = useOrganizations({
    enabled: !isPlatformAdminRoute, // Only enable if NOT on platform admin route
  });
  
  // Select the appropriate data source
  let organizations;
  let isLoading;
  if (isPlatformAdminRoute) {
    organizations = platformOrganizations;
    isLoading = isPlatformLoading;
  } else if (hasSubscriptionAdminPermission) {
    organizations = adminOrganizations;
    isLoading = isAdminLoading;
  } else {
    organizations = regularOrganizations;
    isLoading = isRegularLoading;
  }
  
  // Use platform admin hooks if on platform admin route, otherwise use regular hooks
  const platformCreateOrganization = usePlatformCreateOrganization();
  const platformUpdateOrganization = usePlatformUpdateOrganization();
  const platformDeleteOrganization = usePlatformDeleteOrganization();
  const regularCreateOrganization = useCreateOrganization();
  const regularUpdateOrganization = useUpdateOrganization();
  const regularDeleteOrganization = useDeleteOrganization();
  
  // Select the appropriate mutation hooks
  const createOrganization = isPlatformAdminRoute ? platformCreateOrganization : regularCreateOrganization;
  const updateOrganization = isPlatformAdminRoute ? platformUpdateOrganization : regularUpdateOrganization;
  const deleteOrganization = isPlatformAdminRoute ? platformDeleteOrganization : regularDeleteOrganization;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      isActive: true,
    },
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
        reset({
          name: org.name || '',
          slug: org.slug || '',
          email: org.email || '',
          phone: org.phone || '',
          website: org.website || '',
          streetAddress: org.streetAddress || '',
          city: org.city || '',
          stateProvince: org.stateProvince || '',
          country: org.country || '',
          postalCode: org.postalCode || '',
          registrationNumber: org.registrationNumber || '',
          taxId: org.taxId || '',
          licenseNumber: org.licenseNumber || '',
          type: org.type || '',
          description: org.description || '',
          establishedDate: org.establishedDate ? org.establishedDate.toISOString().slice(0, 10) : '',
          isActive: org.isActive ?? true,
          contactPersonName: org.contactPersonName || '',
          contactPersonEmail: org.contactPersonEmail || '',
          contactPersonPhone: org.contactPersonPhone || '',
          contactPersonPosition: org.contactPersonPosition || '',
          logoUrl: org.logoUrl || '',
        });
        setSelectedOrganization(orgId);
      }
    } else {
      reset({
        name: '',
        slug: '',
        email: '',
        phone: '',
        website: '',
        streetAddress: '',
        city: '',
        stateProvince: '',
        country: '',
        postalCode: '',
        registrationNumber: '',
        taxId: '',
        licenseNumber: '',
        type: '',
        description: '',
        establishedDate: '',
        isActive: true,
        contactPersonName: '',
        contactPersonEmail: '',
        contactPersonPhone: '',
        contactPersonPosition: '',
        logoUrl: '',
      });
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
    // Transform establishedDate from Date to string if needed
    const transformedData = {
      ...data,
      establishedDate: data.establishedDate instanceof Date
        ? data.establishedDate.toISOString().slice(0, 10)
        : data.establishedDate || null,
      // Auto-add https:// to website if missing
      website: data.website && data.website !== ''
        ? (data.website.startsWith('http://') || data.website.startsWith('https://'))
          ? data.website
          : `https://${data.website}`
        : null,
    };

    if (selectedOrganization) {
      updateOrganization.mutate(
        { id: selectedOrganization, ...transformedData },
        {
          onSuccess: () => {
            handleCloseDialog();
          },
        }
      );
    } else {
      if (data.name && data.slug) {
        // For platform admins, include admin fields
        const createData = isPlatformAdminRoute ? {
          ...transformedData,
          admin_email: data.admin_email || '',
          admin_password: data.admin_password || '',
          admin_full_name: data.admin_full_name || '',
        } : transformedData;
        
        createOrganization.mutate(createData as any, {
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
  // CRITICAL: Disable useOrganizationStatistics on platform admin routes to avoid 403 errors
  // Platform admins don't have organization_id, so this hook will fail
  // Only fetch stats if NOT on platform admin route and organization is selected
  const shouldFetchStats = !isPlatformAdminRoute && !!selectedOrganization;
  const { data: orgStats } = useQuery({
    queryKey: ['organization-statistics', selectedOrganization],
    queryFn: async () => {
      if (!selectedOrganization) {
        return {
          userCount: 0,
          schoolCount: 0,
          studentCount: 0,
          classCount: 0,
          staffCount: 0,
          buildingCount: 0,
          roomCount: 0,
        };
      }
      const stats = await organizationsApi.statistics(selectedOrganization);
      return stats as {
        userCount: number;
        schoolCount: number;
        studentCount: number;
        classCount: number;
        staffCount: number;
        buildingCount: number;
        roomCount: number;
      };
    },
    enabled: shouldFetchStats,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t('events.title')}
            </CardTitle>
            <CardDescription>{t('hostel.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text={t('organizations.loadingOrganizations')} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Building2 className="h-5 w-5 hidden sm:inline-flex" />
                {t('events.title')}
              </CardTitle>
              <CardDescription className="hidden md:block text-sm mt-1">{t('hostel.subtitle')}</CardDescription>
            </div>
            {canCreateOrganization && (
              <Button onClick={() => handleOpenDialog()} size="sm" className="flex-shrink-0" aria-label={t('organizations.addOrganization')}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{t('organizations.addOrganization')}</span>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col sm:flex-row items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <Input
              placeholder={t('assets.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-10"
            />
          </div>

          {filteredOrganizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? t('auth.noOrganizationsFound') : t('organizations.noOrganizationsMessage')}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">{t('events.name')}</TableHead>
                      <TableHead className="hidden md:table-cell whitespace-nowrap">{t('organizations.slug')}</TableHead>
                      <TableHead className="hidden lg:table-cell whitespace-nowrap">{t('organizations.settings')}</TableHead>
                      <TableHead className="hidden md:table-cell whitespace-nowrap">{t('events.createdAt')}</TableHead>
                      <TableHead className="hidden lg:table-cell whitespace-nowrap">{t('events.updatedAt')}</TableHead>
                      <TableHead className="text-right whitespace-nowrap">{t('events.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganizations.map((org) => {
                      const hasSettings = org.settings && Object.keys(org.settings).length > 0;
                      return (
                        <TableRow key={org.id}>
                          <TableCell className="font-medium">
                            <div>
                              {org.name}
                              <div className="md:hidden mt-1">
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{org.slug}</code>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <code className="text-sm bg-muted px-2 py-1 rounded">{org.slug}</code>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {hasSettings ? (
                              <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                                <SettingsIcon className="h-3 w-3" />
                                {Object.keys(org.settings).length} setting{Object.keys(org.settings).length !== 1 ? 's' : ''}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">No settings</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDate(org.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {formatDate(org.updatedAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5 sm:gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedOrganization(org.id);
                                  setIsDetailsDialogOpen(true);
                                }}
                                title={t('events.viewDetails')}
                                className="flex-shrink-0"
                                aria-label={t('events.viewDetails')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {isPlatformAdminRoute && hasSubscriptionAdminPermission && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  title="View Subscription & Features"
                                  className="flex-shrink-0"
                                  aria-label="View Subscription & Features"
                                >
                                  <Link to={`/platform/organizations/${org.id}/subscription`}>
                                    <Package className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                              {canUpdateOrganization && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDialog(org.id)}
                                  title={t('events.edit')}
                                  className="flex-shrink-0"
                                  aria-label={t('events.edit')}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              {canDeleteOrganization && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteClick(org.id)}
                                  title={t('events.delete')}
                                  className="flex-shrink-0"
                                  aria-label={t('events.delete')}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
            <Tabs defaultValue="basic" className="w-full mt-4">
              <TabsList className={`grid w-full ${isPlatformAdminRoute && !selectedOrganization ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-5'}`}>
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <span className="hidden sm:inline">Basic</span>
                  <span className="sm:hidden">Basic</span>
                </TabsTrigger>
                <TabsTrigger value="contact" className="flex items-center gap-2">
                  <span className="hidden sm:inline">Contact</span>
                  <span className="sm:hidden">Contact</span>
                </TabsTrigger>
                <TabsTrigger value="address" className="flex items-center gap-2">
                  <span className="hidden sm:inline">Address</span>
                  <span className="sm:hidden">Address</span>
                </TabsTrigger>
                <TabsTrigger value="legal" className="flex items-center gap-2">
                  <span className="hidden sm:inline">Legal</span>
                  <span className="sm:hidden">Legal</span>
                </TabsTrigger>
                <TabsTrigger value="additional" className="flex items-center gap-2">
                  <span className="hidden sm:inline">Additional</span>
                  <span className="sm:hidden">More</span>
                </TabsTrigger>
                {isPlatformAdminRoute && !selectedOrganization && (
                  <TabsTrigger value="admin" className="flex items-center gap-2">
                    <span className="hidden sm:inline">Admin User</span>
                    <span className="sm:hidden">Admin</span>
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Organization Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Enter organization name"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      {...register('slug')}
                      placeholder="organization-slug"
                    />
                    {errors.slug && (
                      <p className="text-sm text-destructive">{errors.slug.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Lowercase letters, numbers, and hyphens only
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Organization Type</Label>
                    <Controller
                      control={control}
                      name="type"
                      render={({ field }) => (
                        <Select value={field.value || ''} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select organization type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="school">School</SelectItem>
                            <SelectItem value="university">University</SelectItem>
                            <SelectItem value="institute">Institute</SelectItem>
                            <SelectItem value="academy">Academy</SelectItem>
                            <SelectItem value="college">College</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.type && (
                      <p className="text-sm text-destructive">{errors.type.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      placeholder="Enter organization description"
                      rows={4}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive">{errors.description.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="establishedDate">Established Date</Label>
                    <CalendarFormField
                      control={control}
                      name="establishedDate"
                      placeholder="Select established date"
                    />
                    {errors.establishedDate && (
                      <p className="text-sm text-destructive">{errors.establishedDate.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Controller
                      control={control}
                      name="isActive"
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="isActive">Active Organization</Label>
                  </div>
                </div>
              </TabsContent>

              {/* Contact Information Tab */}
              <TabsContent value="contact" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="organization@example.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      {...register('phone')}
                      placeholder="+1234567890"
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      {...register('website')}
                      placeholder="https://www.example.com"
                    />
                    {errors.website && (
                      <p className="text-sm text-destructive">{errors.website.message}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Address Information Tab */}
              <TabsContent value="address" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="streetAddress">Street Address</Label>
                    <Input
                      id="streetAddress"
                      {...register('streetAddress')}
                      placeholder="123 Main Street"
                    />
                    {errors.streetAddress && (
                      <p className="text-sm text-destructive">{errors.streetAddress.message}</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        {...register('city')}
                        placeholder="City"
                      />
                      {errors.city && (
                        <p className="text-sm text-destructive">{errors.city.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="stateProvince">State/Province</Label>
                      <Input
                        id="stateProvince"
                        {...register('stateProvince')}
                        placeholder="State/Province"
                      />
                      {errors.stateProvince && (
                        <p className="text-sm text-destructive">{errors.stateProvince.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        {...register('country')}
                        placeholder="Country"
                      />
                      {errors.country && (
                        <p className="text-sm text-destructive">{errors.country.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        {...register('postalCode')}
                        placeholder="12345"
                      />
                      {errors.postalCode && (
                        <p className="text-sm text-destructive">{errors.postalCode.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Legal & Registration Tab */}
              <TabsContent value="legal" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="registrationNumber">Registration Number</Label>
                    <Input
                      id="registrationNumber"
                      {...register('registrationNumber')}
                      placeholder="Registration number"
                    />
                    {errors.registrationNumber && (
                      <p className="text-sm text-destructive">{errors.registrationNumber.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="taxId">Tax ID</Label>
                    <Input
                      id="taxId"
                      {...register('taxId')}
                      placeholder="Tax identification number"
                    />
                    {errors.taxId && (
                      <p className="text-sm text-destructive">{errors.taxId.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      {...register('licenseNumber')}
                      placeholder="License number"
                    />
                    {errors.licenseNumber && (
                      <p className="text-sm text-destructive">{errors.licenseNumber.message}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Additional Information Tab */}
              <TabsContent value="additional" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-4">Contact Person</h4>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="contactPersonName">Contact Person Name</Label>
                        <Input
                          id="contactPersonName"
                          {...register('contactPersonName')}
                          placeholder="Full name"
                        />
                        {errors.contactPersonName && (
                          <p className="text-sm text-destructive">{errors.contactPersonName.message}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="contactPersonEmail">Contact Person Email</Label>
                          <Input
                            id="contactPersonEmail"
                            type="email"
                            {...register('contactPersonEmail')}
                            placeholder="contact@example.com"
                          />
                          {errors.contactPersonEmail && (
                            <p className="text-sm text-destructive">{errors.contactPersonEmail.message}</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="contactPersonPhone">Contact Person Phone</Label>
                          <Input
                            id="contactPersonPhone"
                            {...register('contactPersonPhone')}
                            placeholder="+1234567890"
                          />
                          {errors.contactPersonPhone && (
                            <p className="text-sm text-destructive">{errors.contactPersonPhone.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contactPersonPosition">Contact Person Position</Label>
                        <Input
                          id="contactPersonPosition"
                          {...register('contactPersonPosition')}
                          placeholder="e.g., Principal, Director"
                        />
                        {errors.contactPersonPosition && (
                          <p className="text-sm text-destructive">{errors.contactPersonPosition.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-4">Media</h4>
                    <div className="grid gap-2">
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <Input
                        id="logoUrl"
                        type="url"
                        {...register('logoUrl')}
                        placeholder="https://example.com/logo.png"
                      />
                      {errors.logoUrl && (
                        <p className="text-sm text-destructive">{errors.logoUrl.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Admin User Tab - Only for platform admins creating new organizations */}
              {isPlatformAdminRoute && !selectedOrganization && (
                <TabsContent value="admin" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-4">Organization Admin User</h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create an admin user account for this organization. This user will have full access to manage the organization.
                      </p>
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="admin_full_name">Admin Full Name *</Label>
                          <Input
                            id="admin_full_name"
                            {...register('admin_full_name')}
                            placeholder="Full name"
                            required
                          />
                          {errors.admin_full_name && (
                            <p className="text-sm text-destructive">{errors.admin_full_name.message}</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="admin_email">Admin Email *</Label>
                          <Input
                            id="admin_email"
                            type="email"
                            {...register('admin_email')}
                            placeholder="admin@example.com"
                            required
                          />
                          {errors.admin_email && (
                            <p className="text-sm text-destructive">{errors.admin_email.message}</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="admin_password">Admin Password *</Label>
                          <Input
                            id="admin_password"
                            type="password"
                            {...register('admin_password')}
                            placeholder="Minimum 8 characters"
                            required
                          />
                          {errors.admin_password && (
                            <p className="text-sm text-destructive">{errors.admin_password.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('events.cancel')}
              </Button>
              <Button type="submit" disabled={createOrganization.isPending || updateOrganization.isPending}>
                {selectedOrganization ? t('events.update') : t('events.create')}
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
                <h3 className="font-semibold text-lg">{t('events.basicInformation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('events.name')}</Label>
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
                    <Label className="text-muted-foreground">{t('events.createdAt')}</Label>
                    <p className="text-sm">{formatDateTime(selectedOrg.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('events.updatedAt')}</Label>
                    <p className="text-sm">{formatDateTime(selectedOrg.updatedAt)}</p>
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
                            <p className="text-sm text-muted-foreground">{t('table.students')}</p>
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
                            <p className="text-sm text-muted-foreground">{t('nav.classes')}</p>
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
                            <p className="text-sm text-muted-foreground">{t('settings.staff')}</p>
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
                            <p className="text-sm text-muted-foreground">{t('dashboard.buildings')}</p>
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
                            <p className="text-sm text-muted-foreground">{t('hostel.rooms')}</p>
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
              {t('events.close')}
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
            <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('events.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

