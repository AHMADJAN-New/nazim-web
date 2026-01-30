import { useState, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, GraduationCap, Search, Star, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/website/components/StatusBadge';
import { useWebsiteImageUpload } from '@/website/hooks/useWebsiteImageUpload';
import { useLanguage } from '@/hooks/useLanguage';
import {
    useWebsiteCourses,
    useCreateWebsiteCourse,
    useUpdateWebsiteCourse,
    useDeleteWebsiteCourse,
    type WebsiteCourse,
} from '@/website/hooks/useWebsiteContent';

const courseSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200),
    category: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    duration: z.string().max(50).optional().nullable(),
    level: z.string().max(50).optional().nullable(),
    instructor_name: z.string().max(200).optional().nullable(),
    cover_image_path: z.string().optional().nullable(),
    enrollment_cta: z.string().max(255).optional().nullable(),
    is_featured: z.boolean().default(false),
    sort_order: z.number().default(0),
    status: z.enum(['draft', 'published']),
});

type CourseFormData = z.infer<typeof courseSchema>;

export default function WebsiteCoursesPage() {
    const { t } = useLanguage();
    const { data: courses = [], isLoading } = useWebsiteCourses();
    const createCourse = useCreateWebsiteCourse();
    const updateCourse = useUpdateWebsiteCourse();
    const deleteCourse = useDeleteWebsiteCourse();
    const uploadImage = useWebsiteImageUpload();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editCourse, setEditCourse] = useState<WebsiteCourse | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<CourseFormData>({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            title: '', category: null, description: null, duration: null,
            level: null, instructor_name: null, cover_image_path: null,
            enrollment_cta: null, is_featured: false, sort_order: 0, status: 'draft',
        },
    });

    const filteredCourses = useMemo(() => {
        return courses.filter((course) => {
            const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [courses, searchQuery, statusFilter]);

    const handleCreate = async (data: CourseFormData) => {
        await createCourse.mutateAsync(data);
        setIsCreateOpen(false);
        form.reset();
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleUpdate = async (data: CourseFormData) => {
        if (!editCourse) return;
        await updateCourse.mutateAsync({ id: editCourse.id, ...data });
        setEditCourse(null);
        form.reset();
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteCourse.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (course: WebsiteCourse) => {
        setEditCourse(course);
        // Use cover_image_url if available (from admin API), otherwise use path directly
        // The backend now returns cover_image_url in the admin API
        setImagePreview(course.cover_image_url || course.cover_image_path || null);
        form.reset({
            title: course.title, category: course.category, description: course.description,
            duration: course.duration, level: course.level, instructor_name: course.instructor_name,
            cover_image_path: course.cover_image_path, enrollment_cta: course.enrollment_cta,
            is_featured: course.is_featured, sort_order: course.sort_order, status: course.status,
        });
    };

    const handleImageUpload = async (file: File) => {
        setIsUploadingImage(true);
        try {
            const result = await uploadImage.mutateAsync(file);
            form.setValue('cover_image_path', result.path);
            setImagePreview(result.url);
        } catch (error) {
            // Error is handled by the hook
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleImageRemove = () => {
        form.setValue('cover_image_path', null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('websiteAdmin.courses.title')}
                description={t('websiteAdmin.courses.description')}
                icon={<GraduationCap className="h-5 w-5" />}
                primaryAction={{
                    label: t('websiteAdmin.courses.new'),
                    onClick: () => { form.reset(); setIsCreateOpen(true); },
                    icon: <Plus className="h-4 w-4" />,
                }}
            />

            <FilterPanel title={t('websiteAdmin.common.filters')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t('websiteAdmin.common.search')}</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder={t('websiteAdmin.courses.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{t('websiteAdmin.common.status')}</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('websiteAdmin.common.all')}</SelectItem>
                                <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                                <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </FilterPanel>

            <div className="rounded-md border">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('websiteAdmin.common.title')}</TableHead>
                                <TableHead>{t('websiteAdmin.common.category')}</TableHead>
                                <TableHead>{t('websiteAdmin.courses.fields.level')}</TableHead>
                                <TableHead>{t('websiteAdmin.courses.fields.instructor')}</TableHead>
                                <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCourses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('websiteAdmin.courses.noResults')}</TableCell>
                                </TableRow>
                            ) : (
                                filteredCourses.map((course) => (
                                    <TableRow key={course.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {course.is_featured && <Star className="h-4 w-4 text-yellow-500" />}
                                                {course.title}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{course.category || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{course.level || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{course.instructor_name || '-'}</TableCell>
                                        <TableCell><StatusBadge status={course.status} /></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(course)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteId(course.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
                setIsCreateOpen(open);
                if (!open) {
                    form.reset();
                    setImagePreview(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('websiteAdmin.courses.createTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.courses.createDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.courses.fields.title')} *</Label>
                                <Input {...form.register('title')} placeholder={t('websiteAdmin.courses.placeholders.title')} />
                                {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.common.category')}</Label>
                                <Input {...form.register('category')} placeholder={t('websiteAdmin.courses.placeholders.category')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.courses.fields.duration')}</Label>
                                <Input {...form.register('duration')} placeholder={t('websiteAdmin.courses.placeholders.duration')} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.courses.fields.level')}</Label>
                                <Select value={form.watch('level') || ''} onValueChange={(v) => form.setValue('level', v)}>
                                    <SelectTrigger><SelectValue placeholder={t('websiteAdmin.courses.placeholders.level')} /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">{t('websiteAdmin.courses.levels.beginner')}</SelectItem>
                                        <SelectItem value="intermediate">{t('websiteAdmin.courses.levels.intermediate')}</SelectItem>
                                        <SelectItem value="advanced">{t('websiteAdmin.courses.levels.advanced')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.common.status')}</Label>
                                <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as 'draft' | 'published')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                                        <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.courses.fields.instructor')}</Label>
                            <Input {...form.register('instructor_name')} placeholder={t('websiteAdmin.courses.placeholders.instructor')} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.common.description')}</Label>
                            <Textarea {...form.register('description')} placeholder={t('websiteAdmin.courses.placeholders.description')} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.courses.fields.coverImage')}</Label>
                            <div className="space-y-2">
                                {imagePreview ? (
                                    <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                                        <img src={imagePreview} alt={t('websiteAdmin.courses.coverPreviewAlt')} className="w-full h-full object-cover" />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2"
                                            onClick={handleImageRemove}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                        <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground mb-2">{t('websiteAdmin.courses.noImage')}</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingImage}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            {isUploadingImage ? t('websiteAdmin.common.uploading') : t('websiteAdmin.courses.uploadImage')}
                                        </Button>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.courses.fields.enrollmentLink')}</Label>
                            <Input
                                {...form.register('enrollment_cta')}
                                placeholder={t('websiteAdmin.courses.placeholders.enrollmentLink')}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('websiteAdmin.courses.enrollmentHelp')}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>{t('websiteAdmin.courses.featured')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={createCourse.isPending}>{t('common.create')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editCourse} onOpenChange={(o) => !o && setEditCourse(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('websiteAdmin.courses.editTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.courses.editDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.courses.fields.title')} *</Label>
                                <Input {...form.register('title')} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.common.category')}</Label>
                                <Input {...form.register('category')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.courses.fields.duration')}</Label>
                                <Input {...form.register('duration')} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.courses.fields.level')}</Label>
                                <Select value={form.watch('level') || ''} onValueChange={(v) => form.setValue('level', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">{t('websiteAdmin.courses.levels.beginner')}</SelectItem>
                                        <SelectItem value="intermediate">{t('websiteAdmin.courses.levels.intermediate')}</SelectItem>
                                        <SelectItem value="advanced">{t('websiteAdmin.courses.levels.advanced')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.common.status')}</Label>
                                <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as 'draft' | 'published')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                                        <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.courses.fields.instructor')}</Label>
                            <Input {...form.register('instructor_name')} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.common.description')}</Label>
                            <Textarea {...form.register('description')} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.courses.fields.coverImage')}</Label>
                            <div className="space-y-2">
                                {imagePreview ? (
                                    <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                                        <img src={imagePreview} alt={t('websiteAdmin.courses.coverPreviewAlt')} className="w-full h-full object-cover" />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2"
                                            onClick={handleImageRemove}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                        <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-muted-foreground mb-2">{t('websiteAdmin.courses.noImage')}</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploadingImage}
                                        >
                                            <Upload className="h-4 w-4 mr-2" />
                                            {isUploadingImage ? t('websiteAdmin.common.uploading') : t('websiteAdmin.courses.uploadImage')}
                                        </Button>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.courses.fields.enrollmentLink')}</Label>
                            <Input
                                {...form.register('enrollment_cta')}
                                placeholder={t('websiteAdmin.courses.placeholders.enrollmentLink')}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('websiteAdmin.courses.enrollmentHelp')}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>{t('websiteAdmin.courses.featured')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditCourse(null)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={updateCourse.isPending}>{t('common.update')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('websiteAdmin.courses.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('websiteAdmin.courses.deleteDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteCourse.isPending}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
