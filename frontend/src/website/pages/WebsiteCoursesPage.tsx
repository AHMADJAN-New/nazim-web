import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, GraduationCap, Search, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
    const { data: courses = [], isLoading } = useWebsiteCourses();
    const createCourse = useCreateWebsiteCourse();
    const updateCourse = useUpdateWebsiteCourse();
    const deleteCourse = useDeleteWebsiteCourse();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editCourse, setEditCourse] = useState<WebsiteCourse | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

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
    };

    const handleUpdate = async (data: CourseFormData) => {
        if (!editCourse) return;
        await updateCourse.mutateAsync({ id: editCourse.id, ...data });
        setEditCourse(null);
        form.reset();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteCourse.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (course: WebsiteCourse) => {
        setEditCourse(course);
        form.reset({
            title: course.title, category: course.category, description: course.description,
            duration: course.duration, level: course.level, instructor_name: course.instructor_name,
            cover_image_path: course.cover_image_path, enrollment_cta: course.enrollment_cta,
            is_featured: course.is_featured, sort_order: course.sort_order, status: course.status,
        });
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title="Courses & Programs"
                description="Manage public course catalog"
                icon={<GraduationCap className="h-5 w-5" />}
                primaryAction={{
                    label: 'New Course',
                    onClick: () => { form.reset(); setIsCreateOpen(true); },
                    icon: <Plus className="h-4 w-4" />,
                }}
            />

            <FilterPanel title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Search</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search courses..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
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
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Instructor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCourses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No courses found</TableCell>
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
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Course</DialogTitle>
                        <DialogDescription>Add a new course to the public catalog</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Title *</Label>
                                <Input {...form.register('title')} placeholder="Course Title" />
                                {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Input {...form.register('category')} placeholder="e.g. Islamic Studies" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Duration</Label>
                                <Input {...form.register('duration')} placeholder="e.g. 6 months" />
                            </div>
                            <div className="space-y-2">
                                <Label>Level</Label>
                                <Select value={form.watch('level') || ''} onValueChange={(v) => form.setValue('level', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as 'draft' | 'published')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Instructor Name</Label>
                            <Input {...form.register('instructor_name')} placeholder="Instructor Name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea {...form.register('description')} placeholder="Course description..." rows={3} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>Featured on homepage</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createCourse.isPending}>Create</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editCourse} onOpenChange={(o) => !o && setEditCourse(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Course</DialogTitle>
                        <DialogDescription>Update course details</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Title *</Label>
                                <Input {...form.register('title')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Input {...form.register('category')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Duration</Label>
                                <Input {...form.register('duration')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Level</Label>
                                <Select value={form.watch('level') || ''} onValueChange={(v) => form.setValue('level', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v as 'draft' | 'published')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Instructor Name</Label>
                            <Input {...form.register('instructor_name')} />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea {...form.register('description')} rows={3} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>Featured on homepage</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditCourse(null)}>Cancel</Button>
                            <Button type="submit" disabled={updateCourse.isPending}>Update</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Course</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete this course?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteCourse.isPending}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
