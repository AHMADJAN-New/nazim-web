import { useState, useEffect } from 'react';
import { useReportTemplates, useCreateReportTemplate, useUpdateReportTemplate, useDeleteReportTemplate, type ReportTemplate, type CreateReportTemplateData } from '@/hooks/useReportTemplates';
import { useSchools } from '@/hooks/useSchools';
import { useHasPermission } from '@/hooks/usePermissions';
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
import { Plus, Pencil, Trash2, Search, FileText } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';

const reportTemplateSchema = z.object({
    template_name: z.string().min(1, 'Template name is required').max(255, 'Template name must be 255 characters or less'),
    template_type: z.string().min(1, 'Template type is required'),
    school_id: z.string().uuid('School is required'),
    header_text: z.string().optional(),
    footer_text: z.string().optional(),
    header_html: z.string().optional(),
    footer_html: z.string().optional(),
    report_logo_selection: z.string().optional(),
    show_page_numbers: z.boolean().optional(),
    show_generation_date: z.boolean().optional(),
    table_alternating_colors: z.boolean().optional(),
    report_font_size: z.string().max(10, 'Font size must be 10 characters or less').optional(),
    is_default: z.boolean().optional(),
    is_active: z.boolean().optional(),
});

type ReportTemplateFormData = z.infer<typeof reportTemplateSchema>;

// Template types will be translated in the component
const TEMPLATE_TYPES = [
    { value: 'student_report', label: 'Student Report' },
    { value: 'attendance_report', label: 'Attendance Report' },
    { value: 'fee_report', label: 'Fee Report' },
    { value: 'exam_report', label: 'Exam Report' },
    { value: 'class_report', label: 'Class Report' },
    { value: 'general_report', label: 'General Report' },
];

export function ReportTemplatesManagement() {
    const { t } = useLanguage();
    const hasCreatePermission = useHasPermission('reports.create');
    const hasUpdatePermission = useHasPermission('reports.update');
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

    const {
        register,
        handleSubmit,
        control,
        reset,
        formState: { errors },
    } = useForm<ReportTemplateFormData>({
        resolver: zodResolver(reportTemplateSchema),
        defaultValues: {
            report_logo_selection: 'primary',
            show_page_numbers: true,
            show_generation_date: true,
            table_alternating_colors: true,
            report_font_size: '12px',
            is_default: false,
            is_active: true,
        },
    });

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
                    footer_text: template.footer_text || '',
                    header_html: template.header_html || '',
                    footer_html: template.footer_html || '',
                    report_logo_selection: template.report_logo_selection,
                    show_page_numbers: template.show_page_numbers,
                    show_generation_date: template.show_generation_date,
                    table_alternating_colors: template.table_alternating_colors,
                    report_font_size: template.report_font_size,
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
                footer_text: '',
                header_html: '',
                footer_html: '',
                report_logo_selection: 'primary',
                show_page_numbers: true,
                show_generation_date: true,
                table_alternating_colors: true,
                report_font_size: '12px',
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
        <div className="container mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                {t('reportTemplates.title')}
                            </CardTitle>
                            <CardDescription>{t('reportTemplates.subtitle')}</CardDescription>
                        </div>
                        {hasCreatePermission && (
                            <Button onClick={() => handleOpenDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                {t('reportTemplates.addTemplate')}
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* School Filter */}
                    <div className="mb-4">
                        <Label>{t('reportTemplates.filterBySchool')}</Label>
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
                    <div className="mb-4">
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

                    {/* Templates Table */}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('reportTemplates.templateName')}</TableHead>
                                    <TableHead>{t('reportTemplates.type')}</TableHead>
                                    <TableHead>{t('reportTemplates.school')}</TableHead>
                                    <TableHead>{t('reportTemplates.default')}</TableHead>
                                    <TableHead>{t('reportTemplates.status')}</TableHead>
                                    <TableHead className="text-right">{t('reportTemplates.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTemplates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            {searchQuery ? t('reportTemplates.noTemplatesFound') : t('reportTemplates.noTemplatesMessage')}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTemplates.map((template) => {
                                        const school = schools?.find(s => s.id === template.school_id);
                                        return (
                                            <TableRow key={template.id}>
                                                <TableCell className="font-medium">{template.template_name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {TEMPLATE_TYPES.find(tt => tt.value === template.template_type)?.label || template.template_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{school?.schoolName || t('reportTemplates.unknown')}</TableCell>
                                                <TableCell>
                                                    {template.is_default ? (
                                                        <Badge variant="default">{t('reportTemplates.default')}</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                                        {template.is_active ? t('reportTemplates.active') : t('reportTemplates.inactive')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
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
                            <div className="grid gap-2">
                                <Label htmlFor="header_text">{t('reportTemplates.headerText')}</Label>
                                <Textarea
                                    id="header_text"
                                    {...register('header_text')}
                                    placeholder={t('reportTemplates.enterHeaderText')}
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="header_html">{t('reportTemplates.headerHtml')}</Label>
                                <Textarea
                                    id="header_html"
                                    {...register('header_html')}
                                    placeholder={t('reportTemplates.enterHeaderHtml')}
                                    rows={5}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="footer_text">{t('reportTemplates.footerText')}</Label>
                                <Textarea
                                    id="footer_text"
                                    {...register('footer_text')}
                                    placeholder={t('reportTemplates.enterFooterText')}
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="footer_html">{t('reportTemplates.footerHtml')}</Label>
                                <Textarea
                                    id="footer_html"
                                    {...register('footer_html')}
                                    placeholder={t('reportTemplates.enterFooterHtml')}
                                    rows={5}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="report_logo_selection">{t('reportTemplates.reportLogoSelection')}</Label>
                                    <Controller
                                        name="report_logo_selection"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || 'primary'}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={t('reportTemplates.selectLogo')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="primary">{t('reportTemplates.primaryLogo')}</SelectItem>
                                                    <SelectItem value="secondary">{t('reportTemplates.secondaryLogo')}</SelectItem>
                                                    <SelectItem value="ministry">{t('reportTemplates.ministryLogo')}</SelectItem>
                                                    <SelectItem value="all">{t('reportTemplates.allLogos')}</SelectItem>
                                                    <SelectItem value="none">{t('reportTemplates.noLogo')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="report_font_size">{t('reportTemplates.reportFontSize')}</Label>
                                    <Input
                                        id="report_font_size"
                                        {...register('report_font_size')}
                                        placeholder="12px"
                                    />
                                </div>
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
        </div>
    );
}



