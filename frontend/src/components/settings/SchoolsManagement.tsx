import { useState } from 'react';
import { useSchools, useCreateSchool, useUpdateSchool, useDeleteSchool, type School } from '@/hooks/useSchools';
import { useHasPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Search, School as SchoolIcon, Shield, Eye } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';

const schoolSchema = z.object({
  school_name: z.string().min(1, 'School name is required').max(255, 'School name must be 255 characters or less'),
  school_name_arabic: z.string().max(255, 'Arabic name must be 255 characters or less').optional(),
  school_name_pashto: z.string().max(255, 'Pashto name must be 255 characters or less').optional(),
  school_address: z.string().optional(),
  school_phone: z.string().max(50, 'Phone must be 50 characters or less').optional(),
  school_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  school_website: z.string().max(200, 'Website must be 200 characters or less').optional(),
  organization_id: z.string().uuid().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  font_family: z.string().max(100, 'Font family must be 100 characters or less').optional(),
  calendar_preference: z.string().max(50, 'Calendar preference must be 50 characters or less').optional(),
  primary_logo_usage: z.string().max(50, 'Primary logo usage must be 50 characters or less').optional(),
  secondary_logo_usage: z.string().max(50, 'Secondary logo usage must be 50 characters or less').optional(),
  ministry_logo_usage: z.string().max(50, 'Ministry logo usage must be 50 characters or less').optional(),
  is_active: z.boolean().optional(),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

export function SchoolsManagement() {
  const { t } = useLanguage();
  const hasCreatePermission = useHasPermission('school_branding.create');
  const hasUpdatePermission = useHasPermission('school_branding.update');
  const hasDeletePermission = useHasPermission('school_branding.delete');
  const { data: schools, isLoading } = useSchools();
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();
  const deleteSchool = useDeleteSchool();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [primaryLogoFile, setPrimaryLogoFile] = useState<File | null>(null);
  const [secondaryLogoFile, setSecondaryLogoFile] = useState<File | null>(null);
  const [ministryLogoFile, setMinistryLogoFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      primary_color: '#0b0b56',
      secondary_color: '#0056b3',
      accent_color: '#ff6b35',
      font_family: 'Bahij Nassim',
      calendar_preference: 'gregorian',
      primary_logo_usage: 'header',
      secondary_logo_usage: 'footer',
      ministry_logo_usage: 'header',
      is_active: true,
    },
  });

  const filteredSchools = schools?.filter((school) => {
    const query = (searchQuery || '').toLowerCase();
    const matchesSearch =
      school.schoolName?.toLowerCase().includes(query) ||
      (school.schoolNameArabic && school.schoolNameArabic.toLowerCase().includes(query)) ||
      (school.schoolNamePashto && school.schoolNamePashto.toLowerCase().includes(query)) ||
      (school.schoolEmail && school.schoolEmail.toLowerCase().includes(query)) ||
      (school.schoolPhone && school.schoolPhone.toLowerCase().includes(query)) ||
      (school.schoolWebsite && school.schoolWebsite.toLowerCase().includes(query));


    // All users only see their organization's schools (backend filters by organization_id)
    return matchesSearch;
  }) || [];

  const handleOpenDialog = (schoolId?: string) => {
    if (schoolId) {
      const school = schools?.find((s) => s.id === schoolId);
      if (school) {
        reset({
          school_name: school.schoolName,
          school_name_arabic: school.schoolNameArabic || '',
          school_name_pashto: school.schoolNamePashto || '',
          school_address: school.schoolAddress || '',
          school_phone: school.schoolPhone || '',
          school_email: school.schoolEmail || '',
          school_website: school.schoolWebsite || '',
          organization_id: school.organizationId,
          primary_color: school.primaryColor,
          secondary_color: school.secondaryColor,
          accent_color: school.accentColor,
          font_family: school.fontFamily,
          calendar_preference: school.calendarPreference,
          primary_logo_usage: school.primaryLogoUsage,
          secondary_logo_usage: school.secondaryLogoUsage,
          ministry_logo_usage: school.ministryLogoUsage,
          is_active: school.isActive,
        });
        setSelectedSchool(schoolId);
      }
    } else {
      reset({
        school_name: '',
        school_name_arabic: '',
        school_name_pashto: '',
        school_address: '',
        school_phone: '',
        school_email: '',
        school_website: '',
        organization_id: undefined,
        primary_color: '#0b0b56',
        secondary_color: '#0056b3',
        accent_color: '#ff6b35',
        font_family: 'Bahij Nassim',
        calendar_preference: 'gregorian',
        primary_logo_usage: 'header',
        secondary_logo_usage: 'footer',
        ministry_logo_usage: 'header',
        is_active: true,
      });
      setSelectedSchool(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSchool(null);
    setPrimaryLogoFile(null);
    setSecondaryLogoFile(null);
    setMinistryLogoFile(null);
    reset();
  };

  const convertFileToBinary = async (file: File): Promise<{ binary: Uint8Array; mimeType: string; filename: string; size: number } | null> => {
    if (!file) return null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve({
          binary: uint8Array,
          mimeType: file.type,
          filename: file.name,
          size: file.size,
        });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const onSubmit = async (data: SchoolFormData) => {
    try {
      // Convert logo files to binary data
      const primaryLogoData = primaryLogoFile ? await convertFileToBinary(primaryLogoFile) : null;
      const secondaryLogoData = secondaryLogoFile ? await convertFileToBinary(secondaryLogoFile) : null;
      const ministryLogoData = ministryLogoFile ? await convertFileToBinary(ministryLogoFile) : null;

      // Convert form data (snake_case) to domain format (camelCase)
      const schoolData: Partial<School> = {
        schoolName: data.school_name,
        schoolNameArabic: data.school_name_arabic || null,
        schoolNamePashto: data.school_name_pashto || null,
        schoolAddress: data.school_address || null,
        schoolPhone: data.school_phone || null,
        schoolEmail: data.school_email || null,
        schoolWebsite: data.school_website || null,
        organizationId: data.organization_id || undefined,
        primaryColor: data.primary_color,
        secondaryColor: data.secondary_color,
        accentColor: data.accent_color,
        fontFamily: data.font_family,
        calendarPreference: data.calendar_preference,
        primaryLogoUsage: data.primary_logo_usage,
        secondaryLogoUsage: data.secondary_logo_usage,
        ministryLogoUsage: data.ministry_logo_usage,
        isActive: data.is_active ?? true,
        ...(primaryLogoData && {
          primaryLogoBinary: primaryLogoData.binary,
          primaryLogoMimeType: primaryLogoData.mimeType,
          primaryLogoFilename: primaryLogoData.filename,
          primaryLogoSize: primaryLogoData.size,
        }),
        ...(secondaryLogoData && {
          secondaryLogoBinary: secondaryLogoData.binary,
          secondaryLogoMimeType: secondaryLogoData.mimeType,
          secondaryLogoFilename: secondaryLogoData.filename,
          secondaryLogoSize: secondaryLogoData.size,
        }),
        ...(ministryLogoData && {
          ministryLogoBinary: ministryLogoData.binary,
          ministryLogoMimeType: ministryLogoData.mimeType,
          ministryLogoFilename: ministryLogoData.filename,
          ministryLogoSize: ministryLogoData.size,
        }),
      };

      if (selectedSchool) {
        updateSchool.mutate(
          {
            id: selectedSchool,
            ...schoolData,
          },
          {
            onSuccess: () => {
              handleCloseDialog();
            },
          }
        );
      } else {
        createSchool.mutate(schoolData, {
          onSuccess: () => {
            handleCloseDialog();
          },
        });
      }
    } catch (error) {
      console.error('Error processing logo files:', error);
    }
  };

  const handleDeleteClick = (schoolId: string) => {
    setSelectedSchool(schoolId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedSchool) {
      deleteSchool.mutate(selectedSchool, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedSchool(null);
        },
      });
    }
  };

  const selectedSchoolData = selectedSchool ? schools?.find(s => s.id === selectedSchool) : null;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SchoolIcon className="h-5 w-5" />
              {t('schools.title')}
            </CardTitle>
            <CardDescription>{t('schools.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text={t('schools.loadingSchools')} />
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
                <SchoolIcon className="h-5 w-5" />
                {t('schools.title')}
              </CardTitle>
              <CardDescription>{t('schools.subtitle')}</CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                {t('schools.addSchool')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('schools.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Schools Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('schools.schoolName')}</TableHead>
                  <TableHead>{t('schools.arabicName')}</TableHead>
                  <TableHead>{t('schools.pashtoName')}</TableHead>
                  <TableHead>{t('schools.email')}</TableHead>
                  <TableHead>{t('schools.phone')}</TableHead>
                  <TableHead>{t('schools.status')}</TableHead>
                  <TableHead className="text-right">{t('schools.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {searchQuery ? t('schools.noSchoolsFound') : t('schools.noSchoolsMessage')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSchools.map((school) => {
                    return (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium">{school.schoolName}</TableCell>
                        <TableCell>{school.schoolNameArabic || '-'}</TableCell>
                        <TableCell>{school.schoolNamePashto || '-'}</TableCell>
                        <TableCell>{school.schoolEmail || '-'}</TableCell>
                        <TableCell>{school.schoolPhone || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={school.isActive ? 'default' : 'secondary'}>
                            {school.isActive ? t('schools.active') : t('schools.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSchool(school.id);
                                setIsDetailsDialogOpen(true);
                              }}
                              title={t('schools.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasUpdatePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(school.id)}
                                title={t('schools.edit')}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {hasDeletePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(school.id)}
                                title={t('schools.delete')}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>
                {selectedSchool ? t('schools.editSchool') : t('schools.addNewSchool')}
              </DialogTitle>
              <DialogDescription>
                {selectedSchool
                  ? t('schools.updateSchoolInfo')
                  : t('schools.enterSchoolDetails')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="school_name">{t('schools.schoolNameRequired')}</Label>
                  <Input
                    id="school_name"
                    {...register('school_name')}
                    placeholder={t('schools.enterSchoolName')}
                  />
                  {errors.school_name && (
                    <p className="text-sm text-destructive">{errors.school_name.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="school_name_arabic">{t('schools.arabicName')}</Label>
                  <Input
                    id="school_name_arabic"
                    {...register('school_name_arabic')}
                    placeholder={t('schools.enterArabicName')}
                  />
                  {errors.school_name_arabic && (
                    <p className="text-sm text-destructive">{errors.school_name_arabic.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school_name_pashto">{t('schools.pashtoName')}</Label>
                  <Input
                    id="school_name_pashto"
                    {...register('school_name_pashto')}
                    placeholder={t('schools.enterPashtoName')}
                  />
                  {errors.school_name_pashto && (
                    <p className="text-sm text-destructive">{errors.school_name_pashto.message}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="school_address">{t('schools.address')}</Label>
                <Input
                  id="school_address"
                  {...register('school_address')}
                  placeholder={t('schools.enterSchoolAddress')}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="school_phone">{t('schools.phone')}</Label>
                  <Input
                    id="school_phone"
                    {...register('school_phone')}
                    placeholder={t('schools.enterPhone')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school_email">{t('schools.email')}</Label>
                  <Input
                    id="school_email"
                    type="email"
                    {...register('school_email')}
                    placeholder={t('schools.enterEmail')}
                  />
                  {errors.school_email && (
                    <p className="text-sm text-destructive">{errors.school_email.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school_website">{t('schools.website')}</Label>
                  <Input
                    id="school_website"
                    {...register('school_website')}
                    placeholder={t('schools.enterWebsite')}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="primary_color">{t('schools.primaryColor')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      {...register('primary_color')}
                      className="w-20 h-10"
                    />
                    <Input
                      {...register('primary_color')}
                      placeholder="#0b0b56"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="secondary_color">{t('schools.secondaryColor')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondary_color"
                      type="color"
                      {...register('secondary_color')}
                      className="w-20 h-10"
                    />
                    <Input
                      {...register('secondary_color')}
                      placeholder="#0056b3"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accent_color">{t('schools.accentColor')}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accent_color"
                      type="color"
                      {...register('accent_color')}
                      className="w-20 h-10"
                    />
                    <Input
                      {...register('accent_color')}
                      placeholder="#ff6b35"
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="font_family">{t('schools.fontFamily')}</Label>
                <Input
                  id="font_family"
                  {...register('font_family')}
                  placeholder="Bahij Nassim"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="calendar_preference">{t('schools.calendarPreference')}</Label>
                  <Controller
                    name="calendar_preference"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'gregorian'}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('schools.selectCalendar')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gregorian">{t('schools.gregorian')}</SelectItem>
                          <SelectItem value="hijri">{t('schools.hijri')}</SelectItem>
                          <SelectItem value="solar">{t('schools.solar')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="primary_logo">{t('schools.primaryLogo')}</Label>
                  <Input
                    id="primary_logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setPrimaryLogoFile(file || null);
                    }}
                  />
                  {primaryLogoFile && (
                    <p className="text-sm text-muted-foreground">{primaryLogoFile.name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="secondary_logo">{t('schools.secondaryLogo')}</Label>
                  <Input
                    id="secondary_logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setSecondaryLogoFile(file || null);
                    }}
                  />
                  {secondaryLogoFile && (
                    <p className="text-sm text-muted-foreground">{secondaryLogoFile.name}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ministry_logo">{t('schools.ministryLogo')}</Label>
                  <Input
                    id="ministry_logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setMinistryLogoFile(file || null);
                    }}
                  />
                  {ministryLogoFile && (
                    <p className="text-sm text-muted-foreground">{ministryLogoFile.name}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="primary_logo_usage">{t('schools.primaryLogoUsage')}</Label>
                  <Controller
                    name="primary_logo_usage"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'header'}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('schools.selectUsage')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">{t('schools.header')}</SelectItem>
                          <SelectItem value="footer">{t('schools.footer')}</SelectItem>
                          <SelectItem value="both">{t('schools.both')}</SelectItem>
                          <SelectItem value="none">{t('schools.none')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="secondary_logo_usage">{t('schools.secondaryLogoUsage')}</Label>
                  <Controller
                    name="secondary_logo_usage"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'footer'}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('schools.selectUsage')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">{t('schools.header')}</SelectItem>
                          <SelectItem value="footer">{t('schools.footer')}</SelectItem>
                          <SelectItem value="both">{t('schools.both')}</SelectItem>
                          <SelectItem value="none">{t('schools.none')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ministry_logo_usage">{t('schools.ministryLogoUsage')}</Label>
                  <Controller
                    name="ministry_logo_usage"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'header'}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('schools.selectUsage')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">{t('schools.header')}</SelectItem>
                          <SelectItem value="footer">{t('schools.footer')}</SelectItem>
                          <SelectItem value="both">{t('schools.both')}</SelectItem>
                          <SelectItem value="none">{t('schools.none')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <Label htmlFor="is_active">{t('schools.active')}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('schools.cancel')}
              </Button>
              <Button type="submit" disabled={createSchool.isPending || updateSchool.isPending}>
                {selectedSchool ? t('common.update') : t('common.create')} {t('schools.schoolName')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* School Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SchoolIcon className="h-5 w-5" />
              {t('schools.schoolDetails')}
            </DialogTitle>
            <DialogDescription>
              {t('schools.viewCompleteInfo').replace('{name}', selectedSchoolData?.schoolName || '')}
            </DialogDescription>
          </DialogHeader>
          {selectedSchoolData && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('schools.schoolName')}</Label>
                  <p className="font-medium">{selectedSchoolData.schoolName}</p>
                </div>
                {selectedSchoolData.schoolNameArabic && (
                  <div>
                    <Label className="text-muted-foreground">{t('schools.arabicName')}</Label>
                    <p>{selectedSchoolData.schoolNameArabic}</p>
                  </div>
                )}
                {selectedSchoolData.schoolNamePashto && (
                  <div>
                    <Label className="text-muted-foreground">{t('schools.pashtoName')}</Label>
                    <p>{selectedSchoolData.schoolNamePashto}</p>
                  </div>
                )}
                {selectedSchoolData.schoolAddress && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">{t('schools.address')}</Label>
                    <p>{selectedSchoolData.schoolAddress}</p>
                  </div>
                )}
                {selectedSchoolData.schoolPhone && (
                  <div>
                    <Label className="text-muted-foreground">{t('schools.phone')}</Label>
                    <p>{selectedSchoolData.schoolPhone}</p>
                  </div>
                )}
                {selectedSchoolData.schoolEmail && (
                  <div>
                    <Label className="text-muted-foreground">{t('schools.email')}</Label>
                    <p>{selectedSchoolData.schoolEmail}</p>
                  </div>
                )}
                {selectedSchoolData.schoolWebsite && (
                  <div>
                    <Label className="text-muted-foreground">{t('schools.website')}</Label>
                    <p>{selectedSchoolData.schoolWebsite}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">{t('schools.status')}</Label>
                  <Badge variant={selectedSchoolData.isActive ? 'default' : 'secondary'}>
                    {selectedSchoolData.isActive ? t('schools.active') : t('schools.inactive')}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('schools.primaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: selectedSchoolData.primaryColor }}
                    />
                    <code className="text-sm">{selectedSchoolData.primaryColor}</code>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('schools.secondaryColor')}</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: selectedSchoolData.secondaryColor }}
                    />
                    <code className="text-sm">{selectedSchoolData.secondaryColor}</code>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('schools.accentColor')}</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: selectedSchoolData.accentColor }}
                    />
                    <code className="text-sm">{selectedSchoolData.accentColor}</code>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('schools.fontFamily')}</Label>
                  <p>{selectedSchoolData.fontFamily}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('schools.reportFontSize')}</Label>
                  <p>{selectedSchoolData.reportFontSize}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              {t('schools.close')}
            </Button>
            <Button onClick={() => {
              setIsDetailsDialogOpen(false);
              handleOpenDialog(selectedSchool || undefined);
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('schools.editSchoolButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('schools.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('schools.deleteConfirmDescription').replace('{name}', selectedSchool && schools?.find((s) => s.id === selectedSchool) ? schools.find((s) => s.id === selectedSchool)?.schoolName || '' : '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('schools.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('schools.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

