import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Search, FileText, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { useHasPermission } from '@/hooks/usePermissions';
import { useReportTemplates, useCreateReportTemplate, useUpdateReportTemplate, useDeleteReportTemplate, type ReportTemplate, type CreateReportTemplateData } from '@/hooks/useReportTemplates';
import { useSchools } from '@/hooks/useSchools';
import { useWatermarks } from '@/hooks/useWatermarks';

const reportTemplateSchema = z.object({
    template_name: z.string().min(1, 'Template name is required').max(255, 'Template name must be 255 characters or less'),
    template_type: z.string().min(1, 'Template type is required'),
    school_id: z.string().uuid('School is required'),
    header_text: z.string().optional(),
    header_text_position: z.enum(['above_school_name', 'below_school_name']).optional(),
    footer_text: z.string().optional(),
    footer_text_position: z.string().optional(),
    header_html: z.string().optional(),
    footer_html: z.string().optional(),
    report_logo_selection: z.string().optional(),
    show_primary_logo: z.boolean().optional(),
    show_secondary_logo: z.boolean().optional(),
    show_ministry_logo: z.boolean().optional(),
    primary_logo_position: z.enum(['left', 'right']).optional().nullable(),
    secondary_logo_position: z.enum(['left', 'right']).optional().nullable(),
    ministry_logo_position: z.enum(['left', 'right']).optional().nullable(),
    show_page_numbers: z.boolean().optional(),
    show_generation_date: z.boolean().optional(),
    table_alternating_colors: z.boolean().optional(),
    report_font_size: z.string().max(10, 'Font size must be 10 characters or less').optional(),
    watermark_id: z.string().uuid().optional().nullable(),
    is_default: z.boolean().optional(),
    is_active: z.boolean().optional(),
}).refine((data) => {
    // Max 2 logos can be enabled
    const enabledCount = [data.show_primary_logo, data.show_secondary_logo, data.show_ministry_logo].filter(Boolean).length;
    return enabledCount <= 2;
}, {
    message: 'Maximum 2 logos can be enabled at a time',
    path: ['show_secondary_logo'], // Show error on secondary logo field
});

type ReportTemplateFormData = z.infer<typeof reportTemplateSchema>;

// Template types will be translated in the component
const TEMPLATE_TYPES = [
    { value: 'student_report', label: 'Student Report' },
    { value: 'attendance_report', label: 'Attendance Report' },
    { value: 'fee_report', label: 'Fee Report' },
    { value: 'exam_report', label: 'Exam Report' },
    { value: 'class_report', label: 'Class Report' },
    { value: 'buildings', label: 'Buildings Report' },
    { value: 'general_report', label: 'General Report' },
];

export function ReportTemplatesManagement() {
    const { t } = useLanguage();
    // Allow users with reports.read to create templates (they can see the page)
    const hasReportsPermission = useHasPermission('reports.read');
    const hasCreatePermission = useHasPermission('reports.create') || hasReportsPermission;
    const hasUpdatePermission = useHasPermission('reports.update') || hasReportsPermission;
    const hasDeletePermission = useHasPermission('reports.delete');
    const { data: schools } = useSchools();
    const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>();
    const { data: templates, isLoading } = useReportTemplates(selectedSchoolId);
    const createTemplate = useCreateReportTemplate();
    const updateTemplate = useUpdateReportTemplate();
    const deleteTemplate = useDeleteReportTemplate();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
    const [previewSchoolId, setPreviewSchoolId] = useState<string | undefined>(undefined);

    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ReportTemplateFormData>({
        resolver: zodResolver(reportTemplateSchema),
        defaultValues: {
            report_logo_selection: 'none',
            show_primary_logo: true,
            show_secondary_logo: false,
            show_ministry_logo: false,
            primary_logo_position: 'left',
            secondary_logo_position: 'right',
            ministry_logo_position: 'right',
            show_page_numbers: true,
            show_generation_date: true,
            table_alternating_colors: true,
            report_font_size: '12px',
            is_default: false,
            is_active: true,
        },
    });

    // Load watermarks for the selected school (branding_id = school_id)
    // Must be after useForm hook so watch is available
    const selectedSchoolIdForWatermarks = watch('school_id') || selectedSchoolId;
    const { data: watermarks } = useWatermarks(selectedSchoolIdForWatermarks);

    // Set default school when schools load
    useEffect(() => {
        if (schools && schools.length > 0 && !selectedSchoolId) {
            setSelectedSchoolId(schools[0].id);
        }
    }, [schools, selectedSchoolId]);

    const filteredTemplates = templates?.filter((template) => {
        const query = (searchQuery || '').toLowerCase();
        return (
            template.template_name?.toLowerCase().includes(query) ||
            template.template_type?.toLowerCase().includes(query)
        );
    }) || [];

    const handleOpenDialog = (templateId?: string) => {
        if (templateId) {
            const template = templates?.find((t) => t.id === templateId);
            if (template) {
                reset({
                    template_name: template.template_name,
                    template_type: template.template_type,
                    school_id: template.school_id,
                    header_text: template.header_text || '',
                    header_text_position: (template.header_text_position as 'above_school_name' | 'below_school_name') || 'below_school_name',
                    footer_text: template.footer_text || '',
                    footer_text_position: template.footer_text_position || 'footer',
                    header_html: template.header_html || '',
                    footer_html: template.footer_html || '',
                    report_logo_selection: template.report_logo_selection || 'none',
                    show_primary_logo: template.show_primary_logo ?? true,
                    show_secondary_logo: template.show_secondary_logo ?? false,
                    show_ministry_logo: template.show_ministry_logo ?? false,
                    primary_logo_position: (template.primary_logo_position as 'left' | 'right') || 'left',
                    secondary_logo_position: (template.secondary_logo_position as 'left' | 'right') || 'right',
                    ministry_logo_position: (template.ministry_logo_position as 'left' | 'right') || 'right',
                    show_page_numbers: template.show_page_numbers,
                    show_generation_date: template.show_generation_date,
                    table_alternating_colors: template.table_alternating_colors,
                    report_font_size: template.report_font_size,
                    watermark_id: template.watermark_id === '00000000-0000-0000-0000-000000000000' ? '00000000-0000-0000-0000-000000000000' : (template.watermark_id || null),
                    is_default: template.is_default,
                    is_active: template.is_active,
                });
                setSelectedTemplate(templateId);
            }
        } else {
            reset({
                template_name: '',
                template_type: '',
                school_id: selectedSchoolId || '',
                header_text: '',
                header_text_position: 'below_school_name',
                footer_text: '',
                footer_text_position: 'footer',
                header_html: '',
                footer_html: '',
                report_logo_selection: 'none',
                show_primary_logo: true,
                show_secondary_logo: false,
                show_ministry_logo: false,
                primary_logo_position: 'left',
                secondary_logo_position: 'right',
                ministry_logo_position: 'right',
                show_page_numbers: true,
                show_generation_date: true,
                table_alternating_colors: true,
                report_font_size: '12px',
                watermark_id: null,
                is_default: false,
                is_active: true,
            });
            setSelectedTemplate(null);
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedTemplate(null);
        reset();
    };

    const onSubmit = (data: ReportTemplateFormData) => {
        if (selectedTemplate) {
            updateTemplate.mutate(
                {
                    id: selectedTemplate,
                    ...data,
                },
                {
                    onSuccess: () => {
                        handleCloseDialog();
                    },
                }
            );
        } else {
            createTemplate.mutate(data as CreateReportTemplateData, {
                onSuccess: () => {
                    handleCloseDialog();
                },
            });
        }
    };

    const handleDeleteClick = (templateId: string) => {
        setSelectedTemplate(templateId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (selectedTemplate) {
            deleteTemplate.mutate(selectedTemplate, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false);
                    setSelectedTemplate(null);
                },
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <Card>
                    <CardContent className="p-6">
                        <LoadingSpinner size="lg" text={t('reportTemplates.loadingReportTemplates')} />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                                {t('reportTemplates.title')}
                            </CardTitle>
                            <CardDescription className="mt-1">{t('reportTemplates.subtitle')}</CardDescription>
                        </div>
                        {hasCreatePermission && (
                            <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto">
                                <Plus className="h-4 w-4 mr-2" />
                                {t('reportTemplates.addTemplate')}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {/* School Filter */}
                        <div>
                            <Label className="mb-2 block">{t('reportTemplates.filterBySchool')}</Label>
                            <Select value={selectedSchoolId || ''} onValueChange={setSelectedSchoolId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('reportTemplates.selectSchool')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {schools?.map((school) => (
                                        <SelectItem key={school.id} value={school.id}>
                                            {school.schoolName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search */}
                        <div>
                            <Label className="mb-2 block">{t('common.search')}</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('reportTemplates.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Templates Table */}
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[200px]">{t('reportTemplates.templateName')}</TableHead>
                                    <TableHead className="min-w-[120px]">{t('reportTemplates.type')}</TableHead>
                                    <TableHead className="min-w-[150px] hidden sm:table-cell">{t('reportTemplates.school')}</TableHead>
                                    <TableHead className="min-w-[100px]">{t('reportTemplates.default')}</TableHead>
                                    <TableHead className="min-w-[100px]">{t('reportTemplates.status')}</TableHead>
                                    <TableHead className="text-right min-w-[120px]">{t('reportTemplates.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTemplates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText className="h-12 w-12 text-muted-foreground/50" />
                                                <p className="text-sm font-medium">
                                                    {searchQuery ? t('reportTemplates.noTemplatesFound') : t('reportTemplates.noTemplatesMessage')}
                                                </p>
                                                {!searchQuery && hasCreatePermission && (
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog()} className="mt-2">
                                                        <Plus className="h-4 w-4 mr-2" />
                                                        {t('reportTemplates.addTemplate')}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTemplates.map((template) => {
                                        const school = schools?.find(s => s.id === template.school_id);
                                        return (
                                            <TableRow key={template.id} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">{template.template_name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {TEMPLATE_TYPES.find(tt => tt.value === template.template_type)?.label || template.template_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">{school?.schoolName || t('reportTemplates.unknown')}</TableCell>
                                                <TableCell>
                                                    {template.is_default ? (
                                                        <Badge variant="default" className="text-xs">{t('reportTemplates.default')}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={template.is_active ? 'default' : 'secondary'} className="text-xs">
                                                        {template.is_active ? t('reportTemplates.active') : t('reportTemplates.inactive')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setPreviewTemplateId(template.id);
                                                                setPreviewSchoolId(template.school_id);
                                                            }}
                                                            title={t('reportTemplates.previewTemplate') || 'Preview Template'}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {hasUpdatePermission && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleOpenDialog(template.id)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {hasDeletePermission && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteClick(template.id)}
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
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <DialogHeader>
                            <DialogTitle>
                                {selectedTemplate ? t('reportTemplates.editReportTemplate') : t('reportTemplates.addNewReportTemplate')}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedTemplate
                                    ? t('reportTemplates.updateTemplateConfig')
                                    : t('reportTemplates.configureHeaderFooter')}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="template_name">{t('reportTemplates.templateNameRequired')}</Label>
                                    <Input
                                        id="template_name"
                                        {...register('template_name')}
                                        placeholder={t('reportTemplates.enterTemplateName')}
                                    />
                                    {errors.template_name && (
                                        <p className="text-sm text-destructive">{errors.template_name.message}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="template_type">{t('reportTemplates.templateTypeRequired')}</Label>
                                    <Controller
                                        name="template_type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('reportTemplates.selectTemplateType')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TEMPLATE_TYPES.map((type) => {
                                                        const translationKey = `reportTemplates.${type.value}` as keyof typeof t;
                                                        return (
                                                            <SelectItem key={type.value} value={type.value}>
                                                                {(t as any)(translationKey) || type.label}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.template_type && (
                                        <p className="text-sm text-destructive">{errors.template_type.message}</p>
                                    )}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="school_id">{t('reportTemplates.schoolRequired')}</Label>
                                <Controller
                                    name="school_id"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('reportTemplates.selectSchool')} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {schools?.map((school) => (
                                                    <SelectItem key={school.id} value={school.id}>
                                                        {school.schoolName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.school_id && (
                                    <p className="text-sm text-destructive">{errors.school_id.message}</p>
                                )}
                            </div>
                            {/* Header Text Section */}
                            <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
                                <div className="grid gap-2">
                                    <Label htmlFor="header_text" className="text-base font-semibold">
                                        {t('reportTemplates.headerText')}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('reportTemplates.headerTextDescription') || 'Add a short note or message to display in the header area of your reports.'}
                                    </p>
                                    <Textarea
                                        id="header_text"
                                        {...register('header_text')}
                                        placeholder={t('reportTemplates.enterHeaderText') || 'e.g., "Academic Year 2024-2025" or "Confidential Report"'}
                                        rows={3}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="header_text_position">{t('reportTemplates.headerTextPosition') || 'Header Text Position'}</Label>
                                    <Controller
                                        name="header_text_position"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || 'below_school_name'}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('reportTemplates.selectHeaderPosition') || 'Select position'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="above_school_name">
                                                        {t('reportTemplates.aboveSchoolName') || 'Above School Name'}
                                                    </SelectItem>
                                                    <SelectItem value="below_school_name">
                                                        {t('reportTemplates.belowSchoolName') || 'Below School Name'}
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>

                            {/* Footer Text Section */}
                            <div className="grid gap-4 p-4 border rounded-lg bg-muted/30">
                                <div className="grid gap-2">
                                    <Label htmlFor="footer_text" className="text-base font-semibold">
                                        {t('reportTemplates.footerText')}
                                    </Label>
                                    <p className="text-sm text-muted-foreground">
                                        {t('reportTemplates.footerTextDescription') || 'Add a short note or message to display in the footer area of your reports.'}
                                    </p>
                                    <Textarea
                                        id="footer_text"
                                        {...register('footer_text')}
                                        placeholder={t('reportTemplates.enterFooterText') || 'e.g., "This report is confidential" or "Generated by Nazim School Management System"'}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Advanced Options (HTML) - Collapsible */}
                            <div className="border rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                                >
                                    <div>
                                        <Label className="text-base font-semibold cursor-pointer">
                                            {t('reportTemplates.advancedOptions') || 'Advanced Options (HTML)'}
                                        </Label>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {t('reportTemplates.advancedOptionsDescription') || 'For advanced users: Custom HTML for header and footer (optional)'}
                                        </p>
                                    </div>
                                    {showAdvancedOptions ? (
                                        <ChevronUp className="h-5 w-5" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5" />
                                    )}
                                </button>
                                {showAdvancedOptions && (
                                    <div className="p-4 space-y-4 border-t">
                                        <div className="grid gap-2">
                                            <Label htmlFor="header_html">{t('reportTemplates.headerHtml')}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t('reportTemplates.headerHtmlDescription') || 'Custom HTML for header (overrides header text if provided)'}
                                            </p>
                                            <Textarea
                                                id="header_html"
                                                {...register('header_html')}
                                                placeholder={t('reportTemplates.enterHeaderHtml') || '<div>Custom HTML here</div>'}
                                                rows={5}
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="footer_html">{t('reportTemplates.footerHtml')}</Label>
                                            <p className="text-xs text-muted-foreground">
                                                {t('reportTemplates.footerHtmlDescription') || 'Custom HTML for footer (overrides footer text if provided)'}
                                            </p>
                                            <Textarea
                                                id="footer_html"
                                                {...register('footer_html')}
                                                placeholder={t('reportTemplates.enterFooterHtml') || '<div>Custom HTML here</div>'}
                                                rows={5}
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Logo Selection Section - Same as SchoolsManagement */}
                            <div className="border-t pt-4 mt-4">
                                <Label className="text-base font-semibold mb-4 block">{t('reportTemplates.reportLogoSettings') || t('schools.reportLogoSettings')}</Label>
                                <p className="text-sm text-muted-foreground mb-4">{t('reportTemplates.reportLogoSettingsDesc') || t('schools.reportLogoSettingsDesc')}</p>
                                
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
                                                <Label htmlFor="show_primary_logo" className="font-medium">{t('reportTemplates.primaryLogo') || t('schools.primaryLogo')}</Label>
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
                                                <Label htmlFor="show_secondary_logo" className="font-medium">{t('reportTemplates.secondaryLogo') || t('schools.secondaryLogo')}</Label>
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
                                                <Label htmlFor="show_ministry_logo" className="font-medium">{t('reportTemplates.ministryLogo') || t('schools.ministryLogo')}</Label>
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
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="report_font_size">{t('reportTemplates.reportFontSize')}</Label>
                                    <Input
                                        id="report_font_size"
                                        {...register('report_font_size')}
                                        placeholder="12px"
                                    />
                                </div>
                            </div>

                            {/* Watermark Selection */}
                            <div className="grid gap-2">
                                <Label htmlFor="watermark_id">{t('watermarks.title') || 'Watermark'} ({t('common.optional') || 'Optional'})</Label>
                                <p className="text-sm text-muted-foreground">
                                    {t('reportTemplates.watermarkDescription') || 'Select a watermark to display on this report template. If not selected, the default watermark from branding will be used.'}
                                </p>
                                <Controller
                                    name="watermark_id"
                                    control={control}
                                    render={({ field }) => (
                                        <Select 
                                            onValueChange={(value) => {
                                                // Handle special values: 'none' = null (use default), 'no-watermark' = sentinel UUID (no watermark)
                                                if (value === 'none') {
                                                    field.onChange(null);
                                                } else if (value === 'no-watermark') {
                                                    // Use sentinel UUID '00000000-0000-0000-0000-000000000000' to indicate "no watermark"
                                                    field.onChange('00000000-0000-0000-0000-000000000000');
                                                } else {
                                                    field.onChange(value);
                                                }
                                            }} 
                                            value={
                                                field.value === '00000000-0000-0000-0000-000000000000' ? 'no-watermark' : 
                                                field.value || 'none'
                                            }
                                            disabled={!selectedSchoolIdForWatermarks}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t('reportTemplates.selectWatermark') || 'Select watermark (optional)'} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    {t('reportTemplates.useDefaultWatermark') || 'Use Default Watermark (from Branding)'}
                                                </SelectItem>
                                                <SelectItem value="no-watermark">
                                                    {t('reportTemplates.noWatermark') || 'No Watermark'}
                                                </SelectItem>
                                                {watermarks?.filter(w => w.isActive).map((watermark) => (
                                                    <SelectItem key={watermark.id} value={watermark.id}>
                                                        {watermark.type === 'image' 
                                                            ? `${t('watermarks.image') || 'Image'} - ${watermark.position || 'center'}`
                                                            : `${t('watermarks.text') || 'Text'}: ${watermark.text || 'N/A'}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.watermark_id && (
                                    <p className="text-sm text-destructive">{errors.watermark_id.message}</p>
                                )}
                                {!selectedSchoolIdForWatermarks && (
                                    <p className="text-sm text-muted-foreground">
                                        {t('reportTemplates.selectSchoolFirst') || 'Please select a school first to see available watermarks'}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                    <Controller
                                        name="show_page_numbers"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Label htmlFor="show_page_numbers">{t('reportTemplates.showPageNumbers')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Controller
                                        name="show_generation_date"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Label htmlFor="show_generation_date">{t('reportTemplates.showGenerationDate')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Controller
                                        name="table_alternating_colors"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Label htmlFor="table_alternating_colors">{t('reportTemplates.tableAlternatingColors')}</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Controller
                                        name="is_default"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                    <Label htmlFor="is_default">{t('reportTemplates.setAsDefaultTemplate')}</Label>
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
                                    <Label htmlFor="is_active">{t('reportTemplates.active')}</Label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                {t('reportTemplates.cancel')}
                            </Button>
                            <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                                {selectedTemplate ? t('reportTemplates.update') : t('reportTemplates.create')} {t('reportTemplates.templateName')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('reportTemplates.deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('reportTemplates.deleteConfirmDescription').replace('{name}', selectedTemplate && templates?.find((tmpl) => tmpl.id === selectedTemplate) ? templates.find((tmpl) => tmpl.id === selectedTemplate)?.template_name || '' : '')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('reportTemplates.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t('reportTemplates.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Preview Dialog */}
            <Dialog open={!!previewTemplateId} onOpenChange={(open) => !open && setPreviewTemplateId(null)}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{t('reportTemplates.previewTemplate') || 'Preview Template'}</DialogTitle>
                        <DialogDescription>
                            {t('reportTemplates.previewDescription') || 'Preview how this template will look in reports'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-hidden">
                        {previewTemplateId && previewSchoolId && (() => {
                            // School ID is the branding_id (school_branding table)
                            const brandingId = previewSchoolId;
                            const apiBaseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');
                            // Remove /api suffix if present (preview endpoint is at /api/reports/preview/template)
                            const baseUrl = apiBaseUrl.endsWith('/api') ? apiBaseUrl : `${apiBaseUrl}/api`;
                            const previewUrl = `${baseUrl}/reports/preview/template?template_name=table_a4_portrait&branding_id=${brandingId}&report_template_id=${previewTemplateId}&school_id=${previewSchoolId}`;
                            
                            return (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full min-h-[600px] border rounded-lg"
                                    title="Template Preview"
                                />
                            );
                        })()}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPreviewTemplateId(null)}>
                            {t('reportTemplates.close') || 'Close'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}



