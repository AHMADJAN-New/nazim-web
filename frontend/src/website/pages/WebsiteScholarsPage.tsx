import { useState, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, Users, Search, Star, Mail, User, Upload } from 'lucide-react';
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
import { ScholarPhotoCell } from '@/website/components/ScholarPhotoCell';
import {
    useWebsiteScholars,
    useCreateWebsiteScholar,
    useUpdateWebsiteScholar,
    useDeleteWebsiteScholar,
    useUploadWebsiteScholarPhoto,
    type WebsiteScholar,
} from '@/website/hooks/useWebsiteContent';
import { useLanguage } from '@/hooks/useLanguage';

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
    const { t } = useLanguage();
    const { data: scholars = [], isLoading } = useWebsiteScholars();
    const createScholar = useCreateWebsiteScholar();
    const updateScholar = useUpdateWebsiteScholar();
    const deleteScholar = useDeleteWebsiteScholar();
    const uploadPhoto = useUploadWebsiteScholarPhoto();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editScholar, setEditScholar] = useState<WebsiteScholar | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null);
    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
    const editPhotoInputRef = useRef<HTMLInputElement>(null);

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
        const scholar = await createScholar.mutateAsync({ ...data, contact_email: data.contact_email || null });
        if (createPhotoFile && scholar?.id) {
            await uploadPhoto.mutateAsync({ id: scholar.id, file: createPhotoFile });
        }
        setIsCreateOpen(false);
        form.reset();
        setCreatePhotoFile(null);
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
        setEditPhotoFile(null);
        form.reset({
            name: scholar.name, title: scholar.title, bio: scholar.bio, photo_path: scholar.photo_path,
            contact_email: scholar.contact_email, is_featured: scholar.is_featured,
            sort_order: scholar.sort_order, status: scholar.status,
        });
    };

    const handleEditPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editScholar) return;
        const result = await uploadPhoto.mutateAsync({ id: editScholar.id, file });
        setEditScholar((prev) => prev && result?.photo_path ? { ...prev, photo_path: result.photo_path } : prev ?? null);
        e.target.value = '';
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('websiteAdmin.scholars.title')}
                description={t('websiteAdmin.scholars.description')}
                icon={<Users className="h-5 w-5" />}
                primaryAction={{
                    label: t('websiteAdmin.scholars.new'),
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
                            <Input placeholder={t('websiteAdmin.scholars.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
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
                                <TableHead className="w-14">{t('websiteAdmin.scholars.fields.photo') || 'Photo'}</TableHead>
                                <TableHead>{t('websiteAdmin.scholars.fields.name')}</TableHead>
                                <TableHead>{t('websiteAdmin.scholars.fields.title')}</TableHead>
                                <TableHead>{t('websiteAdmin.scholars.fields.email')}</TableHead>
                                <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredScholars.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t('websiteAdmin.scholars.noResults')}</TableCell>
                                </TableRow>
                            ) : (
                                filteredScholars.map((scholar) => (
                                    <TableRow key={scholar.id}>
                                        <TableCell>
                                            <ScholarPhotoCell
                                                scholarId={scholar.id}
                                                photoPath={scholar.photo_path}
                                                alt={scholar.name}
                                                size="sm"
                                                className="shrink-0"
                                            />
                                        </TableCell>
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
                        <DialogTitle>{t('websiteAdmin.scholars.createTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.scholars.createDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="space-y-2 flex-shrink-0">
                                <Label>{t('websiteAdmin.scholars.fields.photo') || 'Photo'}</Label>
                                <div className="w-24 h-24 rounded-lg border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden">
                                    {createPhotoFile ? (
                                        <img src={URL.createObjectURL(createPhotoFile)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="h-10 w-10 text-muted-foreground" />
                                    )}
                                </div>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="text-sm"
                                    onChange={(e) => setCreatePhotoFile(e.target.files?.[0] ?? null)}
                                />
                                <p className="text-xs text-muted-foreground">{t('websiteAdmin.scholars.photoAfterCreate') || 'Photo will be uploaded after scholar is created.'}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                                <div className="space-y-2">
                                    <Label>{t('websiteAdmin.scholars.fields.name')} *</Label>
                                    <Input {...form.register('name')} placeholder={t('websiteAdmin.scholars.placeholders.name')} />
                                    {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('websiteAdmin.scholars.fields.title')}</Label>
                                    <Input {...form.register('title')} placeholder={t('websiteAdmin.scholars.placeholders.title')} />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.scholars.fields.email')}</Label>
                                <Input {...form.register('contact_email')} placeholder={t('websiteAdmin.scholars.placeholders.email')} type="email" />
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
                            <Label>{t('websiteAdmin.scholars.fields.bio')}</Label>
                            <Textarea {...form.register('bio')} placeholder={t('websiteAdmin.scholars.placeholders.bio')} rows={4} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>{t('websiteAdmin.scholars.featured')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); setCreatePhotoFile(null); }}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={createScholar.isPending || uploadPhoto.isPending}>{t('common.create')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editScholar} onOpenChange={(o) => !o && setEditScholar(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('websiteAdmin.scholars.editTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.scholars.editDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="space-y-2 flex-shrink-0">
                                <Label>{t('websiteAdmin.scholars.fields.photo') || 'Photo'}</Label>
                                <div className="w-24 h-24 rounded-lg border-2 border-dashed bg-muted flex items-center justify-center overflow-hidden">
                                    {editScholar ? (
                                        <ScholarPhotoCell
                                            scholarId={editScholar.id}
                                            photoPath={editScholar.photo_path}
                                            alt={editScholar.name}
                                            size="lg"
                                            className="rounded-lg w-24 h-24"
                                        />
                                    ) : (
                                        <User className="h-10 w-10 text-muted-foreground" />
                                    )}
                                </div>
                                <input
                                    ref={editPhotoInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleEditPhotoChange}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => editPhotoInputRef.current?.click()} disabled={uploadPhoto.isPending}>
                                    <Upload className="h-4 w-4 mr-2" />
                                    {uploadPhoto.isPending ? (t('common.loading') || 'Uploading...') : (t('websiteAdmin.scholars.uploadPhoto') || 'Upload photo')}
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                                <div className="space-y-2">
                                    <Label>{t('websiteAdmin.scholars.fields.name')} *</Label>
                                    <Input {...form.register('name')} />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('websiteAdmin.scholars.fields.title')}</Label>
                                    <Input {...form.register('title')} />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.scholars.fields.email')}</Label>
                                <Input {...form.register('contact_email')} type="email" />
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
                            <Label>{t('websiteAdmin.scholars.fields.bio')}</Label>
                            <Textarea {...form.register('bio')} rows={4} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>{t('websiteAdmin.scholars.featured')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditScholar(null)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={updateScholar.isPending}>{t('common.update')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('websiteAdmin.scholars.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('websiteAdmin.scholars.deleteDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteScholar.isPending}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
