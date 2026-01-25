import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Award, Search, Star } from 'lucide-react';
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
    useWebsiteGraduates,
    useCreateWebsiteGraduate,
    useUpdateWebsiteGraduate,
    useDeleteWebsiteGraduate,
    type WebsiteGraduate,
} from '@/website/hooks/useWebsiteContent';

const graduateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    graduation_year: z.coerce.number().min(1900).max(2100).optional().nullable(),
    program: z.string().max(200).optional().nullable(),
    bio: z.string().optional().nullable(),
    photo_path: z.string().optional().nullable(),
    is_featured: z.boolean().default(false),
    sort_order: z.number().default(0),
    status: z.enum(['draft', 'published']),
});

type GraduateFormData = z.infer<typeof graduateSchema>;

export default function WebsiteGraduatesPage() {
    const { data: graduates = [], isLoading } = useWebsiteGraduates();
    const createGraduate = useCreateWebsiteGraduate();
    const updateGraduate = useUpdateWebsiteGraduate();
    const deleteGraduate = useDeleteWebsiteGraduate();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editGraduate, setEditGraduate] = useState<WebsiteGraduate | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const form = useForm<GraduateFormData>({
        resolver: zodResolver(graduateSchema),
        defaultValues: {
            name: '', graduation_year: null, program: null, bio: null,
            photo_path: null, is_featured: false, sort_order: 0, status: 'draft',
        },
    });

    const filteredGraduates = useMemo(() => {
        return graduates.filter((g) => {
            const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [graduates, searchQuery, statusFilter]);

    const handleCreate = async (data: GraduateFormData) => {
        await createGraduate.mutateAsync(data);
        setIsCreateOpen(false);
        form.reset();
    };

    const handleUpdate = async (data: GraduateFormData) => {
        if (!editGraduate) return;
        await updateGraduate.mutateAsync({ id: editGraduate.id, ...data });
        setEditGraduate(null);
        form.reset();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteGraduate.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (graduate: WebsiteGraduate) => {
        setEditGraduate(graduate);
        form.reset({
            name: graduate.name, graduation_year: graduate.graduation_year, program: graduate.program,
            bio: graduate.bio, photo_path: graduate.photo_path, is_featured: graduate.is_featured,
            sort_order: graduate.sort_order, status: graduate.status,
        });
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title="Graduates & Alumni"
                description="Showcase graduation cohorts and alumni"
                icon={<Award className="h-5 w-5" />}
                primaryAction={{
                    label: 'New Graduate',
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
                            <Input placeholder="Search graduates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
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
                                <TableHead>Name</TableHead>
                                <TableHead>Program</TableHead>
                                <TableHead>Year</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGraduates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No graduates found</TableCell>
                                </TableRow>
                            ) : (
                                filteredGraduates.map((graduate) => (
                                    <TableRow key={graduate.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {graduate.is_featured && <Star className="h-4 w-4 text-yellow-500" />}
                                                {graduate.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{graduate.program || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{graduate.graduation_year || '-'}</TableCell>
                                        <TableCell><StatusBadge status={graduate.status} /></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(graduate)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteId(graduate.id)}><Trash2 className="h-4 w-4" /></Button>
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
                        <DialogTitle>Add Graduate</DialogTitle>
                        <DialogDescription>Add a new graduate to the alumni showcase</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input {...form.register('name')} placeholder="Full Name" />
                                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Graduation Year</Label>
                                <Input {...form.register('graduation_year')} type="number" placeholder="2024" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Program / Degree</Label>
                                <Input {...form.register('program')} placeholder="e.g. Islamic Studies" />
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
                            <Label>Biography</Label>
                            <Textarea {...form.register('bio')} placeholder="Brief biography..." rows={3} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>Featured on homepage</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createGraduate.isPending}>Create</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editGraduate} onOpenChange={(o) => !o && setEditGraduate(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Graduate</DialogTitle>
                        <DialogDescription>Update graduate details</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input {...form.register('name')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Graduation Year</Label>
                                <Input {...form.register('graduation_year')} type="number" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Program / Degree</Label>
                                <Input {...form.register('program')} />
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
                            <Label>Biography</Label>
                            <Textarea {...form.register('bio')} rows={3} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>Featured on homepage</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditGraduate(null)}>Cancel</Button>
                            <Button type="submit" disabled={updateGraduate.isPending}>Update</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Graduate</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete this graduate?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteGraduate.isPending}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
