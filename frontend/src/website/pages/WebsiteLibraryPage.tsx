import { useState, useMemo, useRef } from 'react';
import { Plus, Pencil, Trash2, BookOpen, Search, Star, FileDown, Upload, FileText } from 'lucide-react';
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
import { MediaPicker } from '@/website/components/MediaPicker';
import { resolveMediaUrl } from '@/website/lib/mediaUrl';
import { useLanguage } from '@/hooks/useLanguage';
import {
    useWebsitePublicBooks,
    useCreateWebsitePublicBook,
    useUpdateWebsitePublicBook,
    useDeleteWebsitePublicBook,
    useUploadPublicBookFile,
    useUploadPublicBookCover,
    type WebsitePublicBook,
} from '@/website/hooks/useWebsiteContent';

const bookSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255),
    author: z.string().max(255).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
    description: z.string().optional().nullable(),
    cover_image_path: z.string().optional().nullable(),
    file_path: z.string().optional().nullable(),
    is_featured: z.boolean().default(false),
    sort_order: z.number().default(0),
    status: z.enum(['draft', 'published']),
});

type BookFormData = z.infer<typeof bookSchema>;

function fileNameFromPath(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http')) try { return new URL(path).pathname.split('/').pop() || path; } catch { return path; }
    return path.split('/').pop() || path;
}

export default function WebsiteLibraryPage() {
    const { t, isRTL } = useLanguage();
    const { page, pageSize, setPage, setPageSize } = usePagination({ initialPageSize: 25 });
    const { data: booksData, isLoading } = useWebsitePublicBooks(true);
    const books = booksData?.data || [];
    const pagination = booksData?.pagination;
    const createBook = useCreateWebsitePublicBook();
    const updateBook = useUpdateWebsitePublicBook();
    const deleteBook = useDeleteWebsitePublicBook();
    const coverUpload = useUploadPublicBookCover();
    const fileUpload = useUploadPublicBookFile();
    const coverInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editBook, setEditBook] = useState<WebsitePublicBook | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const form = useForm<BookFormData>({
        resolver: zodResolver(bookSchema),
        defaultValues: {
            title: '',
            author: null,
            category: null,
            description: null,
            cover_image_path: null,
            file_path: null,
            is_featured: false,
            sort_order: 0,
            status: 'draft',
        },
    });

    const filteredBooks = useMemo(() => {
        return books.filter((book) => {
            const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (book.author?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
            const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [books, searchQuery, statusFilter]);

    const handleCreate = async (data: BookFormData) => {
        await createBook.mutateAsync(data);
        setIsCreateOpen(false);
        form.reset();
    };

    const handleUpdate = async (data: BookFormData) => {
        if (!editBook) return;
        await updateBook.mutateAsync({ id: editBook.id, ...data });
        setEditBook(null);
        form.reset();
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await deleteBook.mutateAsync(deleteId);
        setDeleteId(null);
    };

    const openEditDialog = (book: WebsitePublicBook) => {
        setEditBook(book);
        form.reset({
            title: book.title,
            author: book.author,
            category: book.category,
            description: book.description,
            cover_image_path: book.cover_image_path,
            file_path: book.file_path,
            is_featured: book.is_featured,
            sort_order: book.sort_order,
            status: book.status,
        });
    };

    const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const result = await coverUpload.mutateAsync(file);
            form.setValue('cover_image_path', result.path, { shouldValidate: true });
        } catch {
            // toast from hook
        }
        e.target.value = '';
    };

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const result = await fileUpload.mutateAsync(file);
            form.setValue('file_path', result.path, { shouldValidate: true });
        } catch {
            // toast from hook
        }
        e.target.value = '';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('websiteAdmin.library.title')}
                description={t('websiteAdmin.library.description')}
                icon={<BookOpen className="h-5 w-5" />}
                primaryAction={{
                    label: t('websiteAdmin.library.new'),
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
                                placeholder={t('websiteAdmin.library.searchPlaceholder')}
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
                                <TableHead>{t('websiteAdmin.common.title')}</TableHead>
                                <TableHead>{t('websiteAdmin.library.fields.author')}</TableHead>
                                <TableHead>{t('websiteAdmin.common.category')}</TableHead>
                                <TableHead>{t('websiteAdmin.common.status')}</TableHead>
                                <TableHead>{t('websiteAdmin.library.fields.downloads')}</TableHead>
                                <TableHead className="text-right">{t('websiteAdmin.common.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBooks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        {t('websiteAdmin.library.noResults')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBooks.map((book) => (
                                    <TableRow key={book.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {book.is_featured && <Star className="h-4 w-4 text-yellow-500" />}
                                                {book.title}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{book.author || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground">{book.category || '-'}</TableCell>
                                        <TableCell><StatusBadge status={book.status} /></TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <FileDown className="h-4 w-4" />
                                                {book.download_count}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(book)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteId(book.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                        <DialogTitle>{t('websiteAdmin.library.createTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.library.createDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">{t('websiteAdmin.library.fields.title')} *</Label>
                                <Input id="title" {...form.register('title')} placeholder={t('websiteAdmin.library.placeholders.title')} />
                                {form.formState.errors.title && (
                                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="author">{t('websiteAdmin.library.fields.author')}</Label>
                                <Input id="author" {...form.register('author')} placeholder={t('websiteAdmin.library.placeholders.author')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">{t('websiteAdmin.common.category')}</Label>
                                <Input id="category" {...form.register('category')} placeholder={t('websiteAdmin.library.placeholders.category')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">{t('websiteAdmin.common.status')}</Label>
                                <Select
                                    value={form.watch('status')}
                                    onValueChange={(value) => form.setValue('status', value as 'draft' | 'published')}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                                        <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('websiteAdmin.common.description')}</Label>
                            <Textarea id="description" {...form.register('description')} placeholder={t('websiteAdmin.library.placeholders.description')} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.library.fields.coverImage')}</Label>
                            {form.watch('cover_image_path') && (
                                <div className="relative w-24 h-24 rounded-md border overflow-hidden bg-muted shrink-0">
                                    <img
                                        src={resolveMediaUrl(form.watch('cover_image_path'))}
                                        alt={t('websiteAdmin.library.coverPreviewAlt')}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleCoverUpload}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={coverUpload.isPending}
                                    onClick={() => coverInputRef.current?.click()}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {coverUpload.isPending ? t('websiteAdmin.common.uploading') : t('websiteAdmin.library.uploadCover')}
                                </Button>
                                <MediaPicker
                                    type="image"
                                    value={form.watch('cover_image_path')}
                                    onChange={(path) => form.setValue('cover_image_path', path ?? null, { shouldValidate: true })}
                                    buttonOnly
                                    triggerLabel={t('websiteAdmin.media.selectFromLibrary')}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.library.fields.file')}</Label>
                            {form.watch('file_path') && (
                                <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/50">
                                    <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                                    <span className="text-sm truncate">{fileNameFromPath(form.watch('file_path'))}</span>
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    ref={pdfInputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={handlePdfUpload}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={fileUpload.isPending}
                                    onClick={() => pdfInputRef.current?.click()}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {fileUpload.isPending ? t('websiteAdmin.common.uploading') : t('websiteAdmin.library.uploadFile')}
                                </Button>
                                <MediaPicker
                                    type="document"
                                    value={form.watch('file_path')}
                                    onChange={(path) => form.setValue('file_path', path ?? null, { shouldValidate: true })}
                                    buttonOnly
                                    triggerLabel={t('websiteAdmin.media.selectFromLibrary')}
                                />
                            </div>
                            <Input
                                {...form.register('file_path')}
                                placeholder={t('websiteAdmin.library.placeholders.fileUrl')}
                                className="mt-2"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_featured"
                                checked={form.watch('is_featured')}
                                onCheckedChange={(checked) => form.setValue('is_featured', checked)}
                            />
                            <Label htmlFor="is_featured">{t('websiteAdmin.library.featured')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={createBook.isPending}>{t('common.create')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editBook} onOpenChange={(open) => !open && setEditBook(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('websiteAdmin.library.editTitle')}</DialogTitle>
                        <DialogDescription>{t('websiteAdmin.library.editDescription')}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">{t('websiteAdmin.library.fields.title')} *</Label>
                                <Input id="edit-title" {...form.register('title')} />
                                {form.formState.errors.title && (
                                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-author">{t('websiteAdmin.library.fields.author')}</Label>
                                <Input id="edit-author" {...form.register('author')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">{t('websiteAdmin.common.category')}</Label>
                                <Input id="edit-category" {...form.register('category')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">{t('websiteAdmin.common.status')}</Label>
                                <Select
                                    value={form.watch('status')}
                                    onValueChange={(value) => form.setValue('status', value as 'draft' | 'published')}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">{t('websiteAdmin.statuses.draft')}</SelectItem>
                                        <SelectItem value="published">{t('websiteAdmin.statuses.published')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">{t('websiteAdmin.common.description')}</Label>
                            <Textarea id="edit-description" {...form.register('description')} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.library.fields.coverImage')}</Label>
                            {form.watch('cover_image_path') && (
                                <div className="relative w-24 h-24 rounded-md border overflow-hidden bg-muted shrink-0">
                                    <img
                                        src={resolveMediaUrl(form.watch('cover_image_path'))}
                                        alt={t('websiteAdmin.library.coverPreviewAlt')}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    ref={coverInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleCoverUpload}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={coverUpload.isPending}
                                    onClick={() => coverInputRef.current?.click()}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {coverUpload.isPending ? t('websiteAdmin.common.uploading') : t('websiteAdmin.library.uploadCover')}
                                </Button>
                                <MediaPicker
                                    type="image"
                                    value={form.watch('cover_image_path')}
                                    onChange={(path) => form.setValue('cover_image_path', path ?? null, { shouldValidate: true })}
                                    buttonOnly
                                    triggerLabel={t('websiteAdmin.media.selectFromLibrary')}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('websiteAdmin.library.fields.file')}</Label>
                            {form.watch('file_path') && (
                                <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-muted/50">
                                    <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                                    <span className="text-sm truncate">{fileNameFromPath(form.watch('file_path'))}</span>
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    ref={pdfInputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={handlePdfUpload}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={fileUpload.isPending}
                                    onClick={() => pdfInputRef.current?.click()}
                                >
                                    <Upload className="h-4 w-4 mr-2" />
                                    {fileUpload.isPending ? t('websiteAdmin.common.uploading') : t('websiteAdmin.library.uploadFile')}
                                </Button>
                                <MediaPicker
                                    type="document"
                                    value={form.watch('file_path')}
                                    onChange={(path) => form.setValue('file_path', path ?? null, { shouldValidate: true })}
                                    buttonOnly
                                    triggerLabel={t('websiteAdmin.media.selectFromLibrary')}
                                />
                            </div>
                            <Input
                                id="edit-file_path"
                                {...form.register('file_path')}
                                placeholder={t('websiteAdmin.library.placeholders.fileUrl')}
                                className="mt-2"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-is_featured"
                                checked={form.watch('is_featured')}
                                onCheckedChange={(checked) => form.setValue('is_featured', checked)}
                            />
                            <Label htmlFor="edit-is_featured">{t('websiteAdmin.library.featured')}</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditBook(null)}>{t('common.cancel')}</Button>
                            <Button type="submit" disabled={updateBook.isPending}>{t('common.update')}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('websiteAdmin.library.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('websiteAdmin.library.deleteDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteBook.isPending}>{t('common.delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}



