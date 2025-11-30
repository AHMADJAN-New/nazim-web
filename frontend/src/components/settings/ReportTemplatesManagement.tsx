import { useState, useEffect } from 'react';
import { useReportTemplates, useCreateReportTemplate, useUpdateReportTemplate, useDeleteReportTemplate, type ReportTemplate, type CreateReportTemplateData } from '@/hooks/useReportTemplates';
import { useSchools } from '@/hooks/useSchools';
import { useIsSuperAdmin } from '@/hooks/useProfiles';
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

const TEMPLATE_TYPES = [
    { value: 'student_report', label: 'Student Report' },
    { value: 'attendance_report', label: 'Attendance Report' },
    { value: 'fee_report', label: 'Fee Report' },
    { value: 'exam_report', label: 'Exam Report' },
    { value: 'class_report', label: 'Class Report' },
    { value: 'general_report', label: 'General Report' },
];

export function ReportTemplatesManagement() {
    const isSuperAdmin = useIsSuperAdmin();
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

    const filteredTemplates = templates?.filter((template) =>
        template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.template_type.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

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
                        <LoadingSpinner size="lg" text="Loading report templates..." />
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
                                Report Templates Management
                            </CardTitle>
                            <CardDescription>Manage report template headers and footers</CardDescription>
                        </div>
                        {hasCreatePermission && (
                            <Button onClick={() => handleOpenDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Template
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {/* School Filter */}
                    <div className="mb-4">
                        <Label>Filter by School</Label>
                        <Select value={selectedSchoolId || ''} onValueChange={setSelectedSchoolId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select school" />
                            </SelectTrigger>
                            <SelectContent>
                                {schools?.map((school) => (
                                    <SelectItem key={school.id} value={school.id}>
                                        {school.school_name}
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
                                placeholder="Search templates..."
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
                                    <TableHead>Template Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>School</TableHead>
                                    <TableHead>Default</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTemplates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                                            {searchQuery ? 'No templates found matching your search' : 'No templates found. Add your first template.'}
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
                                                        {TEMPLATE_TYPES.find(t => t.value === template.template_type)?.label || template.template_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{school?.school_name || 'Unknown'}</TableCell>
                                                <TableCell>
                                                    {template.is_default ? (
                                                        <Badge variant="default">Default</Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                                        {template.is_active ? 'Active' : 'Inactive'}
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
                                {selectedTemplate ? 'Edit Report Template' : 'Add New Report Template'}
                            </DialogTitle>
                            <DialogDescription>
                                {selectedTemplate
                                    ? 'Update the report template configuration below.'
                                    : 'Configure the header and footer for your report template.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="template_name">Template Name *</Label>
                                    <Input
                                        id="template_name"
                                        {...register('template_name')}
                                        placeholder="Enter template name"
                                    />
                                    {errors.template_name && (
                                        <p className="text-sm text-destructive">{errors.template_name.message}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="template_type">Template Type *</Label>
                                    <Controller
                                        name="template_type"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select template type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {TEMPLATE_TYPES.map((type) => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
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
                                <Label htmlFor="school_id">School *</Label>
                                <Controller
                                    name="school_id"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value || ''}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select school" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {schools?.map((school) => (
                                                    <SelectItem key={school.id} value={school.id}>
                                                        {school.school_name}
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
                                <Label htmlFor="header_text">Header Text</Label>
                                <Textarea
                                    id="header_text"
                                    {...register('header_text')}
                                    placeholder="Enter header text (plain text)"
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="header_html">Header HTML</Label>
                                <Textarea
                                    id="header_html"
                                    {...register('header_html')}
                                    placeholder="Enter header HTML (rich content)"
                                    rows={5}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="footer_text">Footer Text</Label>
                                <Textarea
                                    id="footer_text"
                                    {...register('footer_text')}
                                    placeholder="Enter footer text (plain text)"
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="footer_html">Footer HTML</Label>
                                <Textarea
                                    id="footer_html"
                                    {...register('footer_html')}
                                    placeholder="Enter footer HTML (rich content)"
                                    rows={5}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="report_logo_selection">Report Logo Selection</Label>
                                    <Controller
                                        name="report_logo_selection"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || 'primary'}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select logo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="primary">Primary Logo</SelectItem>
                                                    <SelectItem value="secondary">Secondary Logo</SelectItem>
                                                    <SelectItem value="ministry">Ministry Logo</SelectItem>
                                                    <SelectItem value="all">All Logos</SelectItem>
                                                    <SelectItem value="none">No Logo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="report_font_size">Report Font Size</Label>
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
                                    <Label htmlFor="show_page_numbers">Show Page Numbers</Label>
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
                                    <Label htmlFor="show_generation_date">Show Generation Date</Label>
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
                                    <Label htmlFor="table_alternating_colors">Table Alternating Colors</Label>
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
                                    <Label htmlFor="is_default">Set as Default Template</Label>
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
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createTemplate.isPending || updateTemplate.isPending}>
                                {selectedTemplate ? 'Update' : 'Create'} Template
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will soft delete the report template
                            {selectedTemplate &&
                                templates?.find((t) => t.id === selectedTemplate) &&
                                ` "${templates.find((t) => t.id === selectedTemplate)?.template_name}"`}
                            . The template will be hidden but can be restored if needed.
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



