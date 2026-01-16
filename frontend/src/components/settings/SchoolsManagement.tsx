import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, School as SchoolIcon, Shield, Eye, Droplet } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';

import { WatermarkManagement } from './WatermarkManagement';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useSchools, useCreateSchool, useUpdateSchool, useDeleteSchool, type School } from '@/hooks/useSchools';
import { useHasFeature } from '@/hooks/useSubscription';
import { schoolsApi } from '@/lib/api/client';

const schoolSchema = z.object({
  school_name: z.string().min(1, 'School name is required').max(255, 'School name must be 255 characters or less'),
  school_name_arabic: z.string().max(255, 'Arabic name must be 255 characters or less').optional(),
  school_name_pashto: z.string().max(255, 'Pashto name must be 255 characters or less').optional(),
  school_address: z.string().optional(),
  school_phone: z.string().max(50, 'Phone must be 50 characters or less').optional(),
  school_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  school_website: z.string().max(200, 'Website must be 200 characters or less').optional(),
  organization_id: z.string().uuid().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional().or(z.literal('')),
  secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional().or(z.literal('')),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional().or(z.literal('')),
  font_family: z.string().max(100, 'Font family must be 100 characters or less').optional(),
  report_font_size: z.string().max(10, 'Font size must be 10 characters or less').optional(),
  calendar_preference: z.string().max(50, 'Calendar preference must be 50 characters or less').optional(),
  primary_logo_usage: z.string().max(50, 'Primary logo usage must be 50 characters or less').optional(),
  secondary_logo_usage: z.string().max(50, 'Secondary logo usage must be 50 characters or less').optional(),
  ministry_logo_usage: z.string().max(50, 'Ministry logo usage must be 50 characters or less').optional(),
  header_text: z.string().max(500, 'Header text must be 500 characters or less').optional(),
  show_primary_logo: z.boolean().optional(),
  show_secondary_logo: z.boolean().optional(),
  show_ministry_logo: z.boolean().optional(),
  primary_logo_position: z.enum(['left', 'right']).optional(),
  secondary_logo_position: z.enum(['left', 'right']).optional().nullable(),
  ministry_logo_position: z.enum(['left', 'right']).optional().nullable(),
  is_active: z.boolean().optional(),
}).refine((data) => {
  // Max 2 logos can be enabled
  const enabledCount = [data.show_primary_logo, data.show_secondary_logo, data.show_ministry_logo].filter(Boolean).length;
  return enabledCount <= 2;
}, {
  message: 'Maximum 2 logos can be enabled at a time',
  path: ['show_secondary_logo'], // Show error on secondary logo field
});

type SchoolFormData = z.infer<typeof schoolSchema>;

export function SchoolsManagement() {
  const { t } = useLanguage();
  const hasCreatePermission = useHasPermission('school_branding.create');
  const hasUpdatePermission = useHasPermission('school_branding.update');
  const hasDeletePermission = useHasPermission('school_branding.delete');
  const hasMultiSchoolFeature = useHasFeature('multi_school');
  const { data: schools, isLoading } = useSchools();
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();
  const deleteSchool = useDeleteSchool();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedSchoolForWatermarks, setSelectedSchoolForWatermarks] = useState<string | null>(null);
  // Logo URLs for details dialog
  const [detailsPrimaryLogoUrl, setDetailsPrimaryLogoUrl] = useState<string | null>(null);
  const [detailsSecondaryLogoUrl, setDetailsSecondaryLogoUrl] = useState<string | null>(null);
  const [detailsMinistryLogoUrl, setDetailsMinistryLogoUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [primaryLogoFile, setPrimaryLogoFile] = useState<File | null>(null);
  const [secondaryLogoFile, setSecondaryLogoFile] = useState<File | null>(null);
  const [ministryLogoFile, setMinistryLogoFile] = useState<File | null>(null);
  // Store blob URLs for existing logos (fetched on-demand)
  const [existingPrimaryLogoUrl, setExistingPrimaryLogoUrl] = useState<string | null>(null);
  const [existingSecondaryLogoUrl, setExistingSecondaryLogoUrl] = useState<string | null>(null);
  const [existingMinistryLogoUrl, setExistingMinistryLogoUrl] = useState<string | null>(null);
  // Store metadata for existing logos
  const [existingPrimaryLogoMeta, setExistingPrimaryLogoMeta] = useState<{ mimeType: string; filename: string } | null>(null);
  const [existingSecondaryLogoMeta, setExistingSecondaryLogoMeta] = useState<{ mimeType: string; filename: string } | null>(null);
  const [existingMinistryLogoMeta, setExistingMinistryLogoMeta] = useState<{ mimeType: string; filename: string } | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
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
      header_text: '',
      show_primary_logo: true,
      show_secondary_logo: false,
      show_ministry_logo: false,
      primary_logo_position: 'left',
      secondary_logo_position: 'right',
      ministry_logo_position: 'right',
      is_active: true,
    },
  });

  // Fetch logos on-demand when a school is selected for editing
  useEffect(() => {
    if (!selectedSchool) {
      return;
    }

    const school = schools?.find((s) => s.id === selectedSchool);
    if (!school) {
      return;
    }

    // Fetch logos only if metadata indicates they exist
    const fetchLogos = async () => {
      try {
        // Primary logo
        if (school.primaryLogoMimeType) {
          const url = await schoolsApi.getLogo(selectedSchool, 'primary');
          if (url) {
            setExistingPrimaryLogoUrl(url);
          }
        }

        // Secondary logo
        if (school.secondaryLogoMimeType) {
          const url = await schoolsApi.getLogo(selectedSchool, 'secondary');
          if (url) {
            setExistingSecondaryLogoUrl(url);
          }
        }

        // Ministry logo
        if (school.ministryLogoMimeType) {
          const url = await schoolsApi.getLogo(selectedSchool, 'ministry');
          if (url) {
            setExistingMinistryLogoUrl(url);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[SchoolsManagement] Error fetching logos:', error);
        }
      }
    };

    fetchLogos();

    // Cleanup function to revoke blob URLs when component unmounts or school changes
    return () => {
      if (existingPrimaryLogoUrl) {
        URL.revokeObjectURL(existingPrimaryLogoUrl);
      }
      if (existingSecondaryLogoUrl) {
        URL.revokeObjectURL(existingSecondaryLogoUrl);
      }
      if (existingMinistryLogoUrl) {
        URL.revokeObjectURL(existingMinistryLogoUrl);
      }
    };
  }, [selectedSchool, schools]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (existingPrimaryLogoUrl) {
        URL.revokeObjectURL(existingPrimaryLogoUrl);
      }
      if (existingSecondaryLogoUrl) {
        URL.revokeObjectURL(existingSecondaryLogoUrl);
      }
      if (existingMinistryLogoUrl) {
        URL.revokeObjectURL(existingMinistryLogoUrl);
      }
      if (detailsPrimaryLogoUrl) {
        URL.revokeObjectURL(detailsPrimaryLogoUrl);
      }
      if (detailsSecondaryLogoUrl) {
        URL.revokeObjectURL(detailsSecondaryLogoUrl);
      }
      if (detailsMinistryLogoUrl) {
        URL.revokeObjectURL(detailsMinistryLogoUrl);
      }
    };
  }, []);

  // Fetch logos for details dialog when it opens
  useEffect(() => {
    if (!isDetailsDialogOpen || !selectedSchool) {
      // Clean up when dialog closes
      if (detailsPrimaryLogoUrl) {
        URL.revokeObjectURL(detailsPrimaryLogoUrl);
        setDetailsPrimaryLogoUrl(null);
      }
      if (detailsSecondaryLogoUrl) {
        URL.revokeObjectURL(detailsSecondaryLogoUrl);
        setDetailsSecondaryLogoUrl(null);
      }
      if (detailsMinistryLogoUrl) {
        URL.revokeObjectURL(detailsMinistryLogoUrl);
        setDetailsMinistryLogoUrl(null);
      }
      return;
    }

    const school = schools?.find((s) => s.id === selectedSchool);
    if (!school) {
      return;
    }

    // Fetch logos only if metadata indicates they exist
    const fetchLogos = async () => {
      try {
        // Primary logo
        if (school.primaryLogoMimeType) {
          const url = await schoolsApi.getLogo(selectedSchool, 'primary');
          if (url) {
            setDetailsPrimaryLogoUrl(url);
          }
        }

        // Secondary logo
        if (school.secondaryLogoMimeType) {
          const url = await schoolsApi.getLogo(selectedSchool, 'secondary');
          if (url) {
            setDetailsSecondaryLogoUrl(url);
          }
        }

        // Ministry logo
        if (school.ministryLogoMimeType) {
          const url = await schoolsApi.getLogo(selectedSchool, 'ministry');
          if (url) {
            setDetailsMinistryLogoUrl(url);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[SchoolsManagement] Error fetching logos for details:', error);
        }
      }
    };

    fetchLogos();
  }, [isDetailsDialogOpen, selectedSchool, schools]);

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
          primary_color: school.primaryColor || '#0b0b56',
          secondary_color: school.secondaryColor || '#0056b3',
          accent_color: school.accentColor || '#ff6b35',
          font_family: school.fontFamily,
          report_font_size: school.reportFontSize || '12px',
          calendar_preference: school.calendarPreference,
          primary_logo_usage: school.primaryLogoUsage,
          secondary_logo_usage: school.secondaryLogoUsage,
          ministry_logo_usage: school.ministryLogoUsage,
          header_text: school.headerText || '',
          show_primary_logo: school.showPrimaryLogo ?? true,
          show_secondary_logo: school.showSecondaryLogo ?? false,
          show_ministry_logo: school.showMinistryLogo ?? false,
          primary_logo_position: (school.primaryLogoPosition as 'left' | 'right') || 'left',
          secondary_logo_position: (school.secondaryLogoPosition as 'left' | 'right') || 'right',
          ministry_logo_position: (school.ministryLogoPosition as 'left' | 'right') || 'right',
          is_active: school.isActive,
        });
        setSelectedSchool(schoolId);
        
        // Store metadata for existing logos (binary data is no longer in response)
        setExistingPrimaryLogoMeta(school.primaryLogoMimeType ? {
          mimeType: school.primaryLogoMimeType,
          filename: school.primaryLogoFilename || 'primary_logo.png',
        } : null);
        setExistingSecondaryLogoMeta(school.secondaryLogoMimeType ? {
          mimeType: school.secondaryLogoMimeType,
          filename: school.secondaryLogoFilename || 'secondary_logo.png',
        } : null);
        setExistingMinistryLogoMeta(school.ministryLogoMimeType ? {
          mimeType: school.ministryLogoMimeType,
          filename: school.ministryLogoFilename || 'ministry_logo.png',
        } : null);
        
        // Clear existing blob URLs (will be fetched on-demand)
        if (existingPrimaryLogoUrl) {
          URL.revokeObjectURL(existingPrimaryLogoUrl);
          setExistingPrimaryLogoUrl(null);
        }
        if (existingSecondaryLogoUrl) {
          URL.revokeObjectURL(existingSecondaryLogoUrl);
          setExistingSecondaryLogoUrl(null);
        }
        if (existingMinistryLogoUrl) {
          URL.revokeObjectURL(existingMinistryLogoUrl);
          setExistingMinistryLogoUrl(null);
        }
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
        report_font_size: '12px',
        calendar_preference: 'gregorian',
        primary_logo_usage: 'header',
        secondary_logo_usage: 'footer',
        ministry_logo_usage: 'header',
        header_text: '',
        show_primary_logo: true,
        show_secondary_logo: false,
        show_ministry_logo: false,
        primary_logo_position: 'left',
        secondary_logo_position: 'right',
        ministry_logo_position: 'right',
        is_active: true,
      });
      setSelectedSchool(null);
      
      // Clear existing blob URLs
      if (existingPrimaryLogoUrl) {
        URL.revokeObjectURL(existingPrimaryLogoUrl);
        setExistingPrimaryLogoUrl(null);
      }
      if (existingSecondaryLogoUrl) {
        URL.revokeObjectURL(existingSecondaryLogoUrl);
        setExistingSecondaryLogoUrl(null);
      }
      if (existingMinistryLogoUrl) {
        URL.revokeObjectURL(existingMinistryLogoUrl);
        setExistingMinistryLogoUrl(null);
      }
      setExistingPrimaryLogoMeta(null);
      setExistingSecondaryLogoMeta(null);
      setExistingMinistryLogoMeta(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSchool(null);
    setPrimaryLogoFile(null);
    setSecondaryLogoFile(null);
    setMinistryLogoFile(null);
    
    // Clean up blob URLs
    if (existingPrimaryLogoUrl) {
      URL.revokeObjectURL(existingPrimaryLogoUrl);
      setExistingPrimaryLogoUrl(null);
    }
    if (existingSecondaryLogoUrl) {
      URL.revokeObjectURL(existingSecondaryLogoUrl);
      setExistingSecondaryLogoUrl(null);
    }
    if (existingMinistryLogoUrl) {
      URL.revokeObjectURL(existingMinistryLogoUrl);
      setExistingMinistryLogoUrl(null);
    }
    setExistingPrimaryLogoMeta(null);
    setExistingSecondaryLogoMeta(null);
    setExistingMinistryLogoMeta(null);
    reset();
  };

  const convertFileToBase64 = async (file: File): Promise<{ binary: string; mimeType: string; filename: string; size: number } | null> => {
    if (!file) return null;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          // Convert ArrayBuffer to base64 string for JSON transmission
          // Use chunked approach for large files to avoid stack overflow
          const uint8Array = new Uint8Array(arrayBuffer);
          let binaryString = '';
          const chunkSize = 8192; // Process in chunks
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.slice(i, i + chunkSize);
            binaryString += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binaryString);
          resolve({
            binary: base64,
            mimeType: file.type,
            filename: file.name,
            size: file.size,
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const onSubmit = async (data: SchoolFormData) => {
    try {
      // Convert logo files to base64 strings for JSON transmission
      // If no new file is uploaded, keep existing logo (don't send anything)
      const primaryLogoData = primaryLogoFile ? await convertFileToBase64(primaryLogoFile) : null;
      const secondaryLogoData = secondaryLogoFile ? await convertFileToBase64(secondaryLogoFile) : null;
      const ministryLogoData = ministryLogoFile ? await convertFileToBase64(ministryLogoFile) : null;

      // Convert form data (snake_case) to domain format (camelCase)
      // Always include all form values to ensure nothing is lost
      const schoolData: Partial<School> = {
        schoolName: data.school_name,
        schoolNameArabic: data.school_name_arabic || null,
        schoolNamePashto: data.school_name_pashto || null,
        schoolAddress: data.school_address || null,
        schoolPhone: data.school_phone || null,
        schoolEmail: data.school_email || null,
        schoolWebsite: data.school_website || null,
        organizationId: data.organization_id || undefined,
        primaryColor: (data.primary_color && data.primary_color.trim() !== '') ? data.primary_color : '#0b0b56',
        secondaryColor: (data.secondary_color && data.secondary_color.trim() !== '') ? data.secondary_color : '#0056b3',
        accentColor: (data.accent_color && data.accent_color.trim() !== '') ? data.accent_color : '#ff6b35',
        fontFamily: data.font_family || 'Bahij Nassim',
        reportFontSize: data.report_font_size || '12px',
        calendarPreference: data.calendar_preference || 'gregorian',
        primaryLogoUsage: data.primary_logo_usage || 'header',
        secondaryLogoUsage: data.secondary_logo_usage || 'none',
        ministryLogoUsage: data.ministry_logo_usage || 'header',
        headerText: data.header_text || null,
        showPrimaryLogo: data.show_primary_logo ?? true,
        showSecondaryLogo: data.show_secondary_logo ?? false,
        showMinistryLogo: data.show_ministry_logo ?? false,
        primaryLogoPosition: data.primary_logo_position || 'left',
        secondaryLogoPosition: data.secondary_logo_position || null,
        ministryLogoPosition: data.ministry_logo_position || null,
        isActive: data.is_active ?? true,
        // Only include logo data if a new file was uploaded
        // If no new file, don't send logo fields (backend will keep existing logos)
        ...(primaryLogoData ? {
          primaryLogoBinary: primaryLogoData.binary,
          primaryLogoMimeType: primaryLogoData.mimeType,
          primaryLogoFilename: primaryLogoData.filename,
          primaryLogoSize: primaryLogoData.size,
        } : {}),
        ...(secondaryLogoData ? {
          secondaryLogoBinary: secondaryLogoData.binary,
          secondaryLogoMimeType: secondaryLogoData.mimeType,
          secondaryLogoFilename: secondaryLogoData.filename,
          secondaryLogoSize: secondaryLogoData.size,
        } : {}),
        ...(ministryLogoData ? {
          ministryLogoBinary: ministryLogoData.binary,
          ministryLogoMimeType: ministryLogoData.mimeType,
          ministryLogoFilename: ministryLogoData.filename,
          ministryLogoSize: ministryLogoData.size,
        } : {}),
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
      <div className="container mx-auto p-4 md:p-6 max-w-7xl overflow-x-hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SchoolIcon className="h-5 w-5 hidden sm:inline-flex" />
              {t('schools.title')}
            </CardTitle>
            <CardDescription className="hidden md:block">{t('schools.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingSpinner size="lg" text={t('schools.loadingSchools')} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden" data-tour="schools-management-page">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SchoolIcon className="h-5 w-5 hidden sm:inline-flex" />
                {t('schools.title')}
              </CardTitle>
              <CardDescription className="hidden md:block">{t('schools.subtitle')}</CardDescription>
            </div>
            {hasCreatePermission && (
              <Button 
                onClick={() => handleOpenDialog()}
                disabled={!hasMultiSchoolFeature}
                title={!hasMultiSchoolFeature ? t('schools.multiSchoolFeatureRequired') || 'Multiple schools feature is required to create additional schools' : undefined}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{t('schools.addSchool')}</span>
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
                placeholder={t('assets.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Schools Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('schools.schoolName')}</TableHead>
                  <TableHead>{t('schools.arabicName')}</TableHead>
                  <TableHead>{t('schools.pashtoName')}</TableHead>
                  <TableHead>{t('events.email')}</TableHead>
                  <TableHead>{t('events.phone')}</TableHead>
                  <TableHead>{t('events.status')}</TableHead>
                  <TableHead className="text-right">{t('events.actions')}</TableHead>
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
                            {school.isActive ? t('events.active') : t('events.inactive')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSchool(school.id);
                                setIsDetailsDialogOpen(true);
                              }}
                              title={t('events.viewDetails')}
                              className="flex-shrink-0"
                              aria-label={t('events.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedSchoolForWatermarks(
                                  selectedSchoolForWatermarks === school.id ? null : school.id
                                );
                              }}
                              title={t('watermarks.manage') || 'Manage Watermarks'}
                              className={`flex-shrink-0 ${selectedSchoolForWatermarks === school.id ? 'bg-muted' : ''}`}
                              aria-label={t('watermarks.manage') || 'Manage Watermarks'}
                            >
                              <Droplet className="h-4 w-4" />
                            </Button>
                            {hasUpdatePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(school.id)}
                                title={t('events.edit')}
                                className="flex-shrink-0"
                                aria-label={t('schools.edit')}
                                data-tour="schools-edit-button"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {hasDeletePermission && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(school.id)}
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
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Watermark Management Section */}
      {selectedSchoolForWatermarks && (
        <WatermarkManagement
          brandingId={selectedSchoolForWatermarks}
          brandingName={schools?.find((s) => s.id === selectedSchoolForWatermarks)?.schoolName || 'School'}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-tour="schools-edit-dialog">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="school_address">{t('events.address')}</Label>
                <Input
                  id="school_address"
                  {...register('school_address')}
                  placeholder={t('schools.enterSchoolAddress')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="school_phone">{t('events.phone')}</Label>
                  <Input
                    id="school_phone"
                    {...register('school_phone')}
                    placeholder={t('schools.enterPhone')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="school_email">{t('events.email')}</Label>
                  <Input
                    id="school_email"
                    type="email"
                    {...register('school_email')}
                    placeholder={t('auth.enterEmail')}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="primary_color">{t('schools.primaryColor')}</Label>
                  <div className="flex gap-2">
                    <Controller
                      name="primary_color"
                      control={control}
                      render={({ field }) => (
                        <>
                          <Input
                            id="primary_color"
                            type="color"
                            value={field.value || '#0b0b56'}
                            onChange={(e) => field.onChange(e.target.value || '#0b0b56')}
                            className="w-20 h-10"
                          />
                          <Input
                            value={field.value || '#0b0b56'}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              field.onChange(value || '#0b0b56');
                            }}
                            placeholder="#0b0b56"
                          />
                        </>
                      )}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="secondary_color">{t('schools.secondaryColor')}</Label>
                  <div className="flex gap-2">
                    <Controller
                      name="secondary_color"
                      control={control}
                      render={({ field }) => (
                        <>
                          <Input
                            id="secondary_color"
                            type="color"
                            value={field.value || '#0056b3'}
                            onChange={(e) => field.onChange(e.target.value || '#0056b3')}
                            className="w-20 h-10"
                          />
                          <Input
                            value={field.value || '#0056b3'}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              field.onChange(value || '#0056b3');
                            }}
                            placeholder="#0056b3"
                          />
                        </>
                      )}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accent_color">{t('schools.accentColor')}</Label>
                  <div className="flex gap-2">
                    <Controller
                      name="accent_color"
                      control={control}
                      render={({ field }) => (
                        <>
                          <Input
                            id="accent_color"
                            type="color"
                            value={field.value || '#ff6b35'}
                            onChange={(e) => field.onChange(e.target.value || '#ff6b35')}
                            className="w-20 h-10"
                          />
                          <Input
                            value={field.value || '#ff6b35'}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              field.onChange(value || '#ff6b35');
                            }}
                            placeholder="#ff6b35"
                          />
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="font_family">{t('schools.fontFamily')}</Label>
                <Controller
                  name="font_family"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'Bahij Nassim'}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('schools.selectFont')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bahij Nassim">Bahij Nassim</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Tahoma">Tahoma</SelectItem>
                        <SelectItem value="DejaVu Sans">DejaVu Sans</SelectItem>
                        <SelectItem value="DejaVu Serif">DejaVu Serif</SelectItem>
                        <SelectItem value="DejaVu Sans Mono">DejaVu Sans Mono</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input
                  id="font_family_custom"
                  placeholder={t('schools.orEnterCustomFont')}
                  className="mt-2"
                  value={watch('font_family') || ''}
                  onChange={(e) => {
                    // Allow custom font entry - this will override the Select value
                    setValue('font_family', e.target.value);
                  }}
                />
                <p className="text-xs text-muted-foreground">{t('schools.fontFamilyHint')}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="report_font_size">{t('schools.reportFontSize')}</Label>
                <Controller
                  name="report_font_size"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || '12px'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10px">10px</SelectItem>
                        <SelectItem value="11px">11px</SelectItem>
                        <SelectItem value="12px">12px</SelectItem>
                        <SelectItem value="13px">13px</SelectItem>
                        <SelectItem value="14px">14px</SelectItem>
                        <SelectItem value="15px">15px</SelectItem>
                        <SelectItem value="16px">16px</SelectItem>
                        <SelectItem value="18px">18px</SelectItem>
                        <SelectItem value="20px">20px</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">{t('schools.reportFontSizeHint')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="primary_logo">{t('schools.primaryLogo')}</Label>
                  <Input
                    id="primary_logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      setPrimaryLogoFile(file || null);
                      // Clear existing logo preview when new file is selected
                      if (file) {
                        if (existingPrimaryLogoUrl) {
                          URL.revokeObjectURL(existingPrimaryLogoUrl);
                          setExistingPrimaryLogoUrl(null);
                        }
                      }
                    }}
                  />
                  {primaryLogoFile && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">{primaryLogoFile.name}</p>
                      <img
                        src={URL.createObjectURL(primaryLogoFile)}
                        alt="Primary Logo Preview"
                        className="w-20 h-20 object-contain border rounded"
                      />
                    </div>
                  )}
                  {!primaryLogoFile && existingPrimaryLogoUrl && existingPrimaryLogoMeta && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">{existingPrimaryLogoMeta.filename}</p>
                      <img
                        src={existingPrimaryLogoUrl}
                        alt="Primary Logo"
                        className="w-20 h-20 object-contain border rounded"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{t('schools.currentLogo')}</p>
                    </div>
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
                      if (file) {
                        if (existingSecondaryLogoUrl) {
                          URL.revokeObjectURL(existingSecondaryLogoUrl);
                          setExistingSecondaryLogoUrl(null);
                        }
                      }
                    }}
                  />
                  {secondaryLogoFile && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">{secondaryLogoFile.name}</p>
                      <img
                        src={URL.createObjectURL(secondaryLogoFile)}
                        alt="Secondary Logo Preview"
                        className="w-20 h-20 object-contain border rounded"
                      />
                    </div>
                  )}
                  {!secondaryLogoFile && existingSecondaryLogoUrl && existingSecondaryLogoMeta && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">{existingSecondaryLogoMeta.filename}</p>
                      <img
                        src={existingSecondaryLogoUrl}
                        alt="Secondary Logo"
                        className="w-20 h-20 object-contain border rounded"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{t('schools.currentLogo')}</p>
                    </div>
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
                      if (file) {
                        if (existingMinistryLogoUrl) {
                          URL.revokeObjectURL(existingMinistryLogoUrl);
                          setExistingMinistryLogoUrl(null);
                        }
                      }
                    }}
                  />
                  {ministryLogoFile && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">{ministryLogoFile.name}</p>
                      <img
                        src={URL.createObjectURL(ministryLogoFile)}
                        alt="Ministry Logo Preview"
                        className="w-20 h-20 object-contain border rounded"
                      />
                    </div>
                  )}
                  {!ministryLogoFile && existingMinistryLogoUrl && existingMinistryLogoMeta && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-2">{existingMinistryLogoMeta.filename}</p>
                      <img
                        src={existingMinistryLogoUrl}
                        alt="Ministry Logo"
                        className="w-20 h-20 object-contain border rounded"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{t('schools.currentLogo')}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Logo Selection and Positioning Section */}
              <div className="border-t pt-4 mt-4">
                <Label className="text-base font-semibold mb-4 block">{t('schools.reportLogoSettings')}</Label>
                <p className="text-sm text-muted-foreground mb-4">{t('schools.reportLogoSettingsDesc')}</p>
                
                {(() => {
                  const enabledCount = [
                    watch('show_primary_logo'),
                    watch('show_secondary_logo'),
                    watch('show_ministry_logo'),
                  ].filter(Boolean).length;
                  return enabledCount >= 2 ? (
                    <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                      {t('schools.maxLogosReached')}
                    </div>
                  ) : null;
                })()}
                
                <div className="grid gap-4">
                  {/* Primary Logo */}
                  <div className="grid gap-2 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Controller
                          name="show_primary_logo"
                          control={control}
                          render={({ field }) => {
                            const enabledCount = [
                              watch('show_primary_logo'),
                              watch('show_secondary_logo'),
                              watch('show_ministry_logo'),
                            ].filter(Boolean).length;
                            const isMaxReached = enabledCount >= 2 && !field.value;
                            return (
                              <Switch
                                checked={field.value ?? true}
                                onCheckedChange={field.onChange}
                                disabled={isMaxReached}
                              />
                            );
                          }}
                        />
                        <Label htmlFor="show_primary_logo" className="font-medium">{t('schools.primaryLogo')}</Label>
                      </div>
                      {watch('show_primary_logo') && (
                        <Controller
                          name="primary_logo_position"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || 'left'}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">{t('schools.left')}</SelectItem>
                                <SelectItem value="right">{t('schools.right')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Secondary Logo */}
                  <div className="grid gap-2 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Controller
                          name="show_secondary_logo"
                          control={control}
                          render={({ field }) => {
                            const enabledCount = [
                              watch('show_primary_logo'),
                              watch('show_secondary_logo'),
                              watch('show_ministry_logo'),
                            ].filter(Boolean).length;
                            const isMaxReached = enabledCount >= 2 && !field.value;
                            return (
                              <Switch
                                checked={field.value ?? false}
                                onCheckedChange={(checked) => {
                                  // If enabling secondary and primary+ministry are both enabled, disable ministry
                                  if (checked && watch('show_primary_logo') && watch('show_ministry_logo')) {
                                    setValue('show_ministry_logo', false);
                                  }
                                  field.onChange(checked);
                                }}
                                disabled={isMaxReached}
                              />
                            );
                          }}
                        />
                        <Label htmlFor="show_secondary_logo" className="font-medium">{t('schools.secondaryLogo')}</Label>
                      </div>
                      {watch('show_secondary_logo') && (
                        <Controller
                          name="secondary_logo_position"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || 'right'}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">{t('schools.left')}</SelectItem>
                                <SelectItem value="right">{t('schools.right')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* Ministry Logo */}
                  <div className="grid gap-2 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Controller
                          name="show_ministry_logo"
                          control={control}
                          render={({ field }) => {
                            const enabledCount = [
                              watch('show_primary_logo'),
                              watch('show_secondary_logo'),
                              watch('show_ministry_logo'),
                            ].filter(Boolean).length;
                            const isMaxReached = enabledCount >= 2 && !field.value;
                            return (
                              <Switch
                                checked={field.value ?? false}
                                onCheckedChange={(checked) => {
                                  // If enabling ministry and primary+secondary are both enabled, disable secondary
                                  if (checked && watch('show_primary_logo') && watch('show_secondary_logo')) {
                                    setValue('show_secondary_logo', false);
                                  }
                                  field.onChange(checked);
                                }}
                                disabled={isMaxReached}
                              />
                            );
                          }}
                        />
                        <Label htmlFor="show_ministry_logo" className="font-medium">{t('schools.ministryLogo')}</Label>
                      </div>
                      {watch('show_ministry_logo') && (
                        <Controller
                          name="ministry_logo_position"
                          control={control}
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || 'right'}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">{t('schools.left')}</SelectItem>
                                <SelectItem value="right">{t('schools.right')}</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                    </div>
                  </div>
                  
                  {errors.show_secondary_logo && (
                    <p className="text-sm text-destructive">{errors.show_secondary_logo.message}</p>
                  )}
                </div>
              </div>
              
              {/* Header Text */}
              <div className="grid gap-2">
                <Label htmlFor="header_text">{t('schools.headerText')}</Label>
                <Input
                  id="header_text"
                  {...register('header_text')}
                  placeholder={t('schools.enterHeaderText')}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">{t('schools.headerTextDesc')}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                          <SelectItem value="none">{t('events.none')}</SelectItem>
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
                          <SelectItem value="none">{t('events.none')}</SelectItem>
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
                          <SelectItem value="none">{t('events.none')}</SelectItem>
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
                <Label htmlFor="is_active">{t('events.active')}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                {t('events.cancel')}
              </Button>
              <Button type="submit" disabled={createSchool.isPending || updateSchool.isPending}>
                {selectedSchool ? t('events.update') : t('events.create')} {t('schools.schoolName')}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label className="text-muted-foreground">{t('events.address')}</Label>
                    <p>{selectedSchoolData.schoolAddress}</p>
                  </div>
                )}
                {selectedSchoolData.schoolPhone && (
                  <div>
                    <Label className="text-muted-foreground">{t('events.phone')}</Label>
                    <p>{selectedSchoolData.schoolPhone}</p>
                  </div>
                )}
                {selectedSchoolData.schoolEmail && (
                  <div>
                    <Label className="text-muted-foreground">{t('events.email')}</Label>
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
                  <Label className="text-muted-foreground">{t('events.status')}</Label>
                  <Badge variant={selectedSchoolData.isActive ? 'default' : 'secondary'}>
                    {selectedSchoolData.isActive ? t('events.active') : t('events.inactive')}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t('schools.fontFamily')}</Label>
                  <p>{selectedSchoolData.fontFamily}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t('schools.reportFontSize')}</Label>
                  <p>{selectedSchoolData.reportFontSize}</p>
                </div>
              </div>
              
              {/* Logo Display Section */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">{t('schools.logos')}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Primary Logo */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('schools.primaryLogo')}</Label>
                    {detailsPrimaryLogoUrl && selectedSchoolData.primaryLogoMimeType ? (
                      <div className="border rounded-lg p-2 bg-muted/50">
                        <img
                          src={detailsPrimaryLogoUrl}
                          alt={selectedSchoolData.primaryLogoFilename || 'Primary Logo'}
                          className="w-full h-auto max-h-32 object-contain"
                        />
                        {selectedSchoolData.primaryLogoFilename && (
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            {selectedSchoolData.primaryLogoFilename}
                          </p>
                        )}
                        {selectedSchoolData.primaryLogoSize && (
                          <p className="text-xs text-muted-foreground">
                            {(selectedSchoolData.primaryLogoSize / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{t('schools.noLogoUploaded')}</p>
                    )}
                    {selectedSchoolData.primaryLogoUsage && (
                      <p className="text-xs text-muted-foreground">
                        {t('schools.usage')}: {t(`schools.${selectedSchoolData.primaryLogoUsage}`)}
                      </p>
                    )}
                  </div>

                  {/* Secondary Logo */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('schools.secondaryLogo')}</Label>
                    {detailsSecondaryLogoUrl && selectedSchoolData.secondaryLogoMimeType ? (
                      <div className="border rounded-lg p-2 bg-muted/50">
                        <img
                          src={detailsSecondaryLogoUrl}
                          alt={selectedSchoolData.secondaryLogoFilename || 'Secondary Logo'}
                          className="w-full h-auto max-h-32 object-contain"
                        />
                        {selectedSchoolData.secondaryLogoFilename && (
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            {selectedSchoolData.secondaryLogoFilename}
                          </p>
                        )}
                        {selectedSchoolData.secondaryLogoSize && (
                          <p className="text-xs text-muted-foreground">
                            {(selectedSchoolData.secondaryLogoSize / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{t('schools.noLogoUploaded')}</p>
                    )}
                    {selectedSchoolData.secondaryLogoUsage && (
                      <p className="text-xs text-muted-foreground">
                        {t('schools.usage')}: {t(`schools.${selectedSchoolData.secondaryLogoUsage}`)}
                      </p>
                    )}
                  </div>

                  {/* Ministry Logo */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('schools.ministryLogo')}</Label>
                    {detailsMinistryLogoUrl && selectedSchoolData.ministryLogoMimeType ? (
                      <div className="border rounded-lg p-2 bg-muted/50">
                        <img
                          src={detailsMinistryLogoUrl}
                          alt={selectedSchoolData.ministryLogoFilename || 'Ministry Logo'}
                          className="w-full h-auto max-h-32 object-contain"
                        />
                        {selectedSchoolData.ministryLogoFilename && (
                          <p className="text-xs text-muted-foreground mt-2 truncate">
                            {selectedSchoolData.ministryLogoFilename}
                          </p>
                        )}
                        {selectedSchoolData.ministryLogoSize && (
                          <p className="text-xs text-muted-foreground">
                            {(selectedSchoolData.ministryLogoSize / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">{t('schools.noLogoUploaded')}</p>
                    )}
                    {selectedSchoolData.ministryLogoUsage && (
                      <p className="text-xs text-muted-foreground">
                        {t('schools.usage')}: {t(`schools.${selectedSchoolData.ministryLogoUsage}`)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              {t('events.close')}
            </Button>
            <Button onClick={() => {
              setIsDetailsDialogOpen(false);
              handleOpenDialog(selectedSchool || undefined);
            }}>
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{t('schools.editSchoolButton')}</span>
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

