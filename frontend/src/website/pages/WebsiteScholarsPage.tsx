import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, Search, Star, Mail } from 'lucide-react';
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
    useWebsiteScholars,
    useCreateWebsiteScholar,
    useUpdateWebsiteScholar,
    useDeleteWebsiteScholar,
    type WebsiteScholar,
} from '@/website/hooks/useWebsiteContent';

const scholarSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    title: z.string().max(100).optional().nullable(),
    bio: z.string().optional().nullable(),
    photo_path: z.string().optional().nullable(),
    contact_email: z.string().email().optional().nullable().or(z.literal('')),
    is_featured: z.boolean().default(false),
    sort_order: z.number().default(0),
    status: z.enum(['draft', 'published']),
});

type ScholarFormData = z.infer<typeof scholarSchema>;

export default function WebsiteScholarsPage() {
    const { data: scholars = [], isLoading } = useWebsiteScholars();
    const createScholar = useCreateWebsiteScholar();
    const updateScholar = useUpdateWebsiteScholar();
    const deleteScholar = useDeleteWebsiteScholar();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editScholar, setEditScholar] = useState<WebsiteScholar | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const form = useForm<ScholarFormData>({
        resolver: zodResolver(scholarSchema),
        defaultValues: {
            name: '', title: null, bio: null, photo_path: null,
            contact_email: null, is_featured: false, sort_order: 0, status: 'draft',
        },
    });

    const filteredScholars = useMemo(() => {
        return scholars.filter((scholar) => {
            const matchesSearch = scholar.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || scholar.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [scholars, searchQuery, statusFilter]);

    const handleCreate = async (data: ScholarFormData) => {
        await createScholar.mutateAsync({ ...data, contact_email: data.contact_email || null });
        setIsCreateOpen(false);
        form.reset();
    };

    const handleUpdate = async (data: ScholarFormData) => {
        if (!editScholar) return;
        await updateScholar.mutateAsync({ id: editScholar.id, ...data, contact_email: data.contact_email || null });
        setEditScholar(null);
        form.reset();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteScholar.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (scholar: WebsiteScholar) => {
        setEditScholar(scholar);
        form.reset({
            name: scholar.name, title: scholar.title, bio: scholar.bio, photo_path: scholar.photo_path,
            contact_email: scholar.contact_email, is_featured: scholar.is_featured,
            sort_order: scholar.sort_order, status: scholar.status,
        });
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title="Scholars & Staff"
                description="Manage public scholar and staff profiles"
                icon={<Users className="h-5 w-5" />}
                primaryAction={{
                    label: 'New Scholar',
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
                            <Input placeholder="Search scholars..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
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
                                <TableHead>Title</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredScholars.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No scholars found</TableCell>
                                </TableRow>
                            ) : (
                                filteredScholars.map((scholar) => (
                                    <TableRow key={scholar.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {scholar.is_featured && <Star className="h-4 w-4 text-yellow-500" />}
                                                {scholar.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{scholar.title || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {scholar.contact_email ? (
                                                <div className="flex items-center gap-1"><Mail className="h-4 w-4" />{scholar.contact_email}</div>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell><StatusBadge status={scholar.status} /></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(scholar)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteId(scholar.id)}><Trash2 className="h-4 w-4" /></Button>
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
                        <DialogTitle>Add Scholar</DialogTitle>
                        <DialogDescription>Add a new scholar or staff member profile</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input {...form.register('name')} placeholder="Full Name" />
                                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Title / Position</Label>
                                <Input {...form.register('title')} placeholder="e.g. Head Teacher" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input {...form.register('contact_email')} placeholder="email@example.com" type="email" />
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
                            <Textarea {...form.register('bio')} placeholder="Brief biography..." rows={4} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>Featured on homepage</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createScholar.isPending}>Create</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editScholar} onOpenChange={(o) => !o && setEditScholar(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Scholar</DialogTitle>
                        <DialogDescription>Update scholar profile</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name *</Label>
                                <Input {...form.register('name')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Title / Position</Label>
                                <Input {...form.register('title')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input {...form.register('contact_email')} type="email" />
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
                            <Textarea {...form.register('bio')} rows={4} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>Featured on homepage</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditScholar(null)}>Cancel</Button>
                            <Button type="submit" disabled={updateScholar.isPending}>Update</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Scholar</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete this scholar profile?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteScholar.isPending}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
