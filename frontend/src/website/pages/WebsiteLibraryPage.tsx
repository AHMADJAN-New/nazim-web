import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, BookOpen, Search, Star, FileDown } from 'lucide-react';
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
    useWebsitePublicBooks,
    useCreateWebsitePublicBook,
    useUpdateWebsitePublicBook,
    useDeleteWebsitePublicBook,
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

export default function WebsiteLibraryPage() {
    const { data: books = [], isLoading } = useWebsitePublicBooks();
    const createBook = useCreateWebsitePublicBook();
    const updateBook = useUpdateWebsitePublicBook();
    const deleteBook = useDeleteWebsitePublicBook();

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
                title="Library & Books"
                description="Manage public books, PDFs, and downloadable resources"
                icon={<BookOpen className="h-5 w-5" />}
                primaryAction={{
                    label: 'New Book',
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
                            <Input
                                placeholder="Search books..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
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
                                <TableHead>Author</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Downloads</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBooks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                        No books found
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

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add Book</DialogTitle>
                        <DialogDescription>Add a new book or PDF to the public library</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input id="title" {...form.register('title')} placeholder="Book Title" />
                                {form.formState.errors.title && (
                                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="author">Author</Label>
                                <Input id="author" {...form.register('author')} placeholder="Author Name" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input id="category" {...form.register('category')} placeholder="e.g. Fiqh, Hadith" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={form.watch('status')}
                                    onValueChange={(value) => form.setValue('status', value as 'draft' | 'published')}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" {...form.register('description')} placeholder="Book description..." rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="file_path">File URL (PDF)</Label>
                            <Input id="file_path" {...form.register('file_path')} placeholder="https://..." />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_featured"
                                checked={form.watch('is_featured')}
                                onCheckedChange={(checked) => form.setValue('is_featured', checked)}
                            />
                            <Label htmlFor="is_featured">Featured on homepage</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={createBook.isPending}>Create</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editBook} onOpenChange={(open) => !open && setEditBook(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Book</DialogTitle>
                        <DialogDescription>Update book details</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">Title *</Label>
                                <Input id="edit-title" {...form.register('title')} />
                                {form.formState.errors.title && (
                                    <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-author">Author</Label>
                                <Input id="edit-author" {...form.register('author')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Category</Label>
                                <Input id="edit-category" {...form.register('category')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Status</Label>
                                <Select
                                    value={form.watch('status')}
                                    onValueChange={(value) => form.setValue('status', value as 'draft' | 'published')}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea id="edit-description" {...form.register('description')} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-file_path">File URL (PDF)</Label>
                            <Input id="edit-file_path" {...form.register('file_path')} />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-is_featured"
                                checked={form.watch('is_featured')}
                                onCheckedChange={(checked) => form.setValue('is_featured', checked)}
                            />
                            <Label htmlFor="edit-is_featured">Featured on homepage</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditBook(null)}>Cancel</Button>
                            <Button type="submit" disabled={updateBook.isPending}>Update</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Book</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this book? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={deleteBook.isPending}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
