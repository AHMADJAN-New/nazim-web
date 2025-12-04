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
              Schools Management
            </CardTitle>
            <CardDescription>Manage schools and branding for organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text="Loading schools..." />
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
                Schools Management
              </CardTitle>
              <CardDescription>Manage schools and branding for organizations</CardDescription>
            </div>
            {hasCreatePermission && (
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add School
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
                placeholder="Search by school name, email..."
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
                  <TableHead>School Name</TableHead>
                  <TableHead>Arabic Name</TableHead>
                  <TableHead>Pashto Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSchools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {searchQuery ? 'No schools found matching your search' : 'No schools found. Add your first school.'}
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
                            {school.isActive ? 'Active' : 'Inactive'}
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
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasUpdatePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(school.id)}
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {hasDeletePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(school.id)}
                                title="Delete"
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
                {selectedSchool ? 'Edit School' : 'Add New School'}
              </DialogTitle>
              <DialogDescription>
                {selectedSchool
                  ? 'Update the school information below.'
                  : 'Enter the school details to add a new school.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="school_name">School Name *</Label>
                  <Input
                    id="school_name"
                    {...register('school_name')}
                    placeholder="Enter school name"
                  />
                  {errors.school_name && (
                    <p className="text-sm text-destructive">{errors.school_name.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="school_name_arabic">Arabic Name</Label>
                  <Input
                    id="school_name_arabic"
                    {...register('school_name_arabic')}
                    placeholder="الاسم العربي"
                  />
                  {errors.school_name_arabic && (
                    <p className="text-sm text-destructive">{errors.school_name_arabic.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school_name_pashto">Pashto Name</Label>
                  <Input
                    id="school_name_pashto"
                    {...register('school_name_pashto')}
                    placeholder="د پښتو نوم"
                  />
                  {errors.school_name_pashto && (
                    <p className="text-sm text-destructive">{errors.school_name_pashto.message}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="school_address">Address</Label>
                <Input
                  id="school_address"
                  {...register('school_address')}
                  placeholder="Enter school address"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="school_phone">Phone</Label>
                  <Input
                    id="school_phone"
                    {...register('school_phone')}
                    placeholder="+1234567890"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school_email">Email</Label>
                  <Input
                    id="school_email"
                    type="email"
                    {...register('school_email')}
                    placeholder="school@example.com"
                  />
                  {errors.school_email && (
                    <p className="text-sm text-destructive">{errors.school_email.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school_website">Website</Label>
                  <Input
                    id="school_website"
                    {...register('school_website')}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="primary_color">Primary Color</Label>
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
                  <Label htmlFor="secondary_color">Secondary Color</Label>
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
                  <Label htmlFor="accent_color">Accent Color</Label>
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
                <Label htmlFor="font_family">Font Family</Label>
                <Input
                  id="font_family"
                  {...register('font_family')}
                  placeholder="Bahij Nassim"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="calendar_preference">Calendar Preference</Label>
                  <Controller
                    name="calendar_preference"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'gregorian'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select calendar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gregorian">Gregorian</SelectItem>
                          <SelectItem value="hijri">Hijri</SelectItem>
                          <SelectItem value="solar">Solar</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="primary_logo">Primary Logo</Label>
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
                  <Label htmlFor="secondary_logo">Secondary Logo</Label>
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
                  <Label htmlFor="ministry_logo">Ministry Logo</Label>
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
                  <Label htmlFor="primary_logo_usage">Primary Logo Usage</Label>
                  <Controller
                    name="primary_logo_usage"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'header'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select usage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="footer">Footer</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="secondary_logo_usage">Secondary Logo Usage</Label>
                  <Controller
                    name="secondary_logo_usage"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'footer'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select usage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="footer">Footer</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ministry_logo_usage">Ministry Logo Usage</Label>
                  <Controller
                    name="ministry_logo_usage"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || 'header'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select usage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">Header</SelectItem>
                          <SelectItem value="footer">Footer</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                          <SelectItem value="none">None</SelectItem>
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
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSchool.isPending || updateSchool.isPending}>
                {selectedSchool ? 'Update' : 'Create'} School
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
              School Details
            </DialogTitle>
            <DialogDescription>
              View complete information about {selectedSchoolData?.schoolName}
            </DialogDescription>
          </DialogHeader>
          {selectedSchoolData && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">School Name</Label>
                  <p className="font-medium">{selectedSchoolData.schoolName}</p>
                </div>
                {selectedSchoolData.schoolNameArabic && (
                  <div>
                    <Label className="text-muted-foreground">Arabic Name</Label>
                    <p>{selectedSchoolData.schoolNameArabic}</p>
                  </div>
                )}
                {selectedSchoolData.schoolNamePashto && (
                  <div>
                    <Label className="text-muted-foreground">Pashto Name</Label>
                    <p>{selectedSchoolData.schoolNamePashto}</p>
                  </div>
                )}
                {selectedSchoolData.schoolAddress && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Address</Label>
                    <p>{selectedSchoolData.schoolAddress}</p>
                  </div>
                )}
                {selectedSchoolData.schoolPhone && (
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p>{selectedSchoolData.schoolPhone}</p>
                  </div>
                )}
                {selectedSchoolData.schoolEmail && (
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{selectedSchoolData.schoolEmail}</p>
                  </div>
                )}
                {selectedSchoolData.schoolWebsite && (
                  <div>
                    <Label className="text-muted-foreground">Website</Label>
                    <p>{selectedSchoolData.schoolWebsite}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge variant={selectedSchoolData.isActive ? 'default' : 'secondary'}>
                    {selectedSchoolData.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: selectedSchoolData.primaryColor }}
                    />
                    <code className="text-sm">{selectedSchoolData.primaryColor}</code>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: selectedSchoolData.secondaryColor }}
                    />
                    <code className="text-sm">{selectedSchoolData.secondaryColor}</code>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Accent Color</Label>
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
                  <Label className="text-muted-foreground">Font Family</Label>
                  <p>{selectedSchoolData.fontFamily}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Report Font Size</Label>
                  <p>{selectedSchoolData.reportFontSize}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsDetailsDialogOpen(false);
              handleOpenDialog(selectedSchool || undefined);
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit School
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will soft delete the school
              {selectedSchool &&
                schools?.find((s) => s.id === selectedSchool) &&
                ` "${schools.find((s) => s.id === selectedSchool)?.schoolName}"`}
              . The school will be hidden but can be restored if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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

