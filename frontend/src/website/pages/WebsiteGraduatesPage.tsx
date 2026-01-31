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
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagination } from '@/hooks/usePagination';
import { PAGE_SIZE_OPTIONS } from '@/types/pagination';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter,     AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StatusBadge } from '@/website/components/StatusBadge';
import {
    useWebsiteGraduates,
    useCreateWebsiteGraduate,
    useUpdateWebsiteGraduate,
    useDeleteWebsiteGraduate,
    type WebsiteGraduate,
} from '@/website/hooks/useWebsiteContent';
import { useLanguage } from '@/hooks/useLanguage';

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
    const { t, isRTL } = useLanguage();
    const { page, pageSize, setPage, setPageSize } = usePagination({ initialPageSize: 25 });
    const { data: graduatesData, isLoading } = useWebsiteGraduates(true);
    const graduates = graduatesData?.data || [];
    const pagination = graduatesData?.pagination;
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
                title={t('websiteAdmin.graduates.title')}
                description={t('websiteAdmin.graduates.description')}
                icon={<Award className="h-5 w-5" />}
                primaryAction={{
                    label: t('websiteAdmin.graduates.new'),
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
                            <Input
                                placeholder={t('websiteAdmin.graduates.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
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
                                <TableHead>{t('websiteAdmin.graduates.fields.name')}</TableHead>
                                <TableHead>{t('websiteAdmin.graduates.fields.program')}</TableHead>
                                <TableHead>{t('websiteAdmin.graduates.fields.year')}</TableHead>
                                <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGraduates.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                        {t('websiteAdmin.graduates.noResults')}
                                    </TableCell>
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

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
                    <div className="flex items-center gap-2">
                        <Label className="text-sm whitespace-nowrap">{t('pagination.rowsPerPage') || 'Rows per page:'}</Label>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => {
                                setPageSize(Number(value));
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <SelectItem key={size} value={size.toString()}>
                                        {size}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {pagination.total > 0 && (
                            <span className="text-sm text-muted-foreground">
                                {t('pagination.showing') || 'Showing'} {pagination.from ?? 0} {t('pagination.to') || 'to'} {pagination.to ?? 0} {t('pagination.of') || 'of'} {pagination.total} {t('pagination.entries') || 'entries'}
                            </span>
                        )}
                    </div>
                    <div className={isRTL ? 'dir-rtl' : 'dir-ltr'}>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationPrevious
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                                {(() => {
                                    const pages: (number | 'ellipsis')[] = [];
                                    const maxVisible = 7;
                                    const totalPages = pagination.last_page;

                                    if (totalPages <= maxVisible) {
                                        for (let i = 1; i <= totalPages; i++) {
                                            pages.push(i);
                                        }
                                    } else {
                                        pages.push(1);
                                        let start = Math.max(2, page - 1);
                                        let end = Math.min(totalPages - 1, page + 1);

                                        if (page <= 3) {
                                            start = 2;
                                            end = 4;
                                        }

                                        if (page >= totalPages - 2) {
                                            start = totalPages - 3;
                                            end = totalPages - 1;
                                        }

                                        if (start > 2) {
                                            pages.push('ellipsis');
                                        }

                                        for (let i = start; i <= end; i++) {
                                            pages.push(i);
                                        }

                                        if (end < totalPages - 1) {
                                            pages.push('ellipsis');
                                        }

                                        pages.push(totalPages);
                                    }

                                    return pages.map((p, idx) => {
                                        if (p === 'ellipsis') {
                                            return (
                                                <PaginationItem key={`ellipsis-${idx}`}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            );
                                        }
                                        return (
                                            <PaginationItem key={p}>
                                                <PaginationLink
                                                    isActive={page === p}
                                                    onClick={() => setPage(p)}
                                                    className="cursor-pointer"
                                                >
                                                    {p}
                                                </PaginationLink>
                                            </PaginationItem>
                                        );
                                    });
                                })()}
                                <PaginationItem>
                                    <PaginationNext
                                        onClick={() => setPage(Math.min(pagination.last_page, page + 1))}
                                        className={page >= pagination.last_page ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('websiteAdmin.graduates.createTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.graduates.createDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.graduates.fields.name')} *</Label>
                                <Input {...form.register('name')} placeholder={t('websiteAdmin.graduates.placeholders.name')} />
                                {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.graduates.fields.year')}</Label>
                                <Input {...form.register('graduation_year')} type="number" placeholder={t('websiteAdmin.graduates.placeholders.year')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.graduates.fields.program')}</Label>
                                <Input {...form.register('program')} placeholder={t('websiteAdmin.graduates.placeholders.program')} />
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
                            <Label>{t('websiteAdmin.graduates.fields.bio')}</Label>
                            <Textarea {...form.register('bio')} placeholder={t('websiteAdmin.graduates.placeholders.bio')} rows={3} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>{t('websiteAdmin.graduates.featured')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={createGraduate.isPending}>{t('common.create')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editGraduate} onOpenChange={(o) => !o && setEditGraduate(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('websiteAdmin.graduates.editTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.graduates.editDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.graduates.fields.name')} *</Label>
                                <Input {...form.register('name')} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.graduates.fields.year')}</Label>
                                <Input {...form.register('graduation_year')} type="number" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('websiteAdmin.graduates.fields.program')}</Label>
                                <Input {...form.register('program')} />
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
                            <Label>{t('websiteAdmin.graduates.fields.bio')}</Label>
                            <Textarea {...form.register('bio')} rows={3} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch checked={form.watch('is_featured')} onCheckedChange={(c) => form.setValue('is_featured', c)} />
                            <Label>{t('websiteAdmin.graduates.featured')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditGraduate(null)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={updateGraduate.isPending}>{t('common.update')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('websiteAdmin.graduates.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('websiteAdmin.graduates.deleteDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteGraduate.isPending}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
