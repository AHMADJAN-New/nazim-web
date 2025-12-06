import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, BookOpen, Copy, Filter, X } from 'lucide-react';
import { useLibraryBooks, useCreateLibraryBook, useUpdateLibraryBook, useDeleteLibraryBook, useCreateLibraryCopy } from '@/hooks/useLibrary';
import { useLibraryCategories } from '@/hooks/useLibraryCategories';
import type { LibraryBook } from '@/types/domain/library';
import { useHasPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/hooks/useLanguage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoadingSpinner } from '@/components/ui/loading';
import { toast } from 'sonner';

const bookSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
    author: z.string().max(255, 'Author must be 255 characters or less').optional().nullable(),
    isbn: z.string().max(100, 'ISBN must be 100 characters or less').optional().nullable(),
    category_id: z.string().uuid().optional().nullable(),
    volume: z.string().max(50, 'Volume must be 50 characters or less').optional().nullable(),
    description: z.string().optional().nullable(),
    deposit_amount: z.number().min(0, 'Deposit must be 0 or greater').default(0),
    default_loan_days: z.number().int().min(1, 'Loan days must be at least 1').default(30),
    initial_copies: z.number().int().min(0, 'Initial copies must be 0 or greater').default(1),
});

type BookFormData = z.infer<typeof bookSchema>;

export default function LibraryBooks() {
    const { t } = useLanguage();
    const hasCreatePermission = useHasPermission('library_books.create');
    const hasUpdatePermission = useHasPermission('library_books.update');
    const hasDeletePermission = useHasPermission('library_books.delete');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const { data: books, isLoading } = useLibraryBooks();
    const { data: categories } = useLibraryCategories();
    const createBook = useCreateLibraryBook();
    const updateBook = useUpdateLibraryBook();
    const deleteBook = useDeleteLibraryBook();
    const createCopy = useCreateLibraryCopy();

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = useForm<BookFormData>({
        resolver: zodResolver(bookSchema),
        defaultValues: {
            deposit_amount: 0,
            default_loan_days: 30,
            initial_copies: 1,
        },
    });

    const filteredBooks = useMemo(() => {
        if (!Array.isArray(books)) return [];
        let filtered = books;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (book) =>
                    book.title?.toLowerCase().includes(query) ||
                    book.author?.toLowerCase().includes(query) ||
                    book.isbn?.toLowerCase().includes(query)
            );
        }

        // Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter((book) => book.category_id === categoryFilter);
        }

        return filtered;
    }, [books, searchQuery, categoryFilter]);

    const handleOpenDialog = (book?: LibraryBook) => {
        if (book) {
            reset({
                title: book.title,
                author: book.author || '',
                isbn: book.isbn || '',
                category_id: book.category_id || '',
                volume: book.volume || '',
                description: book.description || '',
                deposit_amount: book.deposit_amount || 0,
                default_loan_days: book.default_loan_days || 30,
                initial_copies: 0, // Don't pre-fill for edits
            });
            setSelectedBook(book);
        } else {
            reset({
                title: '',
                author: '',
                isbn: '',
                category_id: '',
                volume: '',
                description: '',
                deposit_amount: 0,
                default_loan_days: 30,
                initial_copies: 1,
            });
            setSelectedBook(null);
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setSelectedBook(null);
        reset({
            title: '',
            author: '',
            isbn: '',
            category_id: '',
            volume: '',
            description: '',
            deposit_amount: 0,
            default_loan_days: 30,
            initial_copies: 1,
        });
    };

    const onSubmit = (data: BookFormData) => {
        if (selectedBook) {
            const { initial_copies, ...updateData } = data;
            updateBook.mutate(
                {
                    id: selectedBook.id,
                    data: updateData,
                },
                {
                    onSuccess: () => {
                        handleCloseDialog();
                    },
                }
            );
        } else {
            createBook.mutate(data, {
                onSuccess: () => {
                    handleCloseDialog();
                },
            });
        }
    };

    const handleDelete = () => {
        if (selectedBook) {
            deleteBook.mutate(selectedBook.id, {
                onSuccess: () => {
                    setIsDeleteDialogOpen(false);
                    setSelectedBook(null);
                },
            });
        }
    };

    const handleOpenDeleteDialog = (book: LibraryBook) => {
        setSelectedBook(book);
        setIsDeleteDialogOpen(true);
    };

    const handleAddCopy = (bookId: string) => {
        createCopy.mutate({ book_id: bookId }, {
            onSuccess: () => {
                toast.success('Copy added successfully');
            },
        });
    };

    const hasActiveFilters = categoryFilter !== 'all' || searchQuery;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BookOpen className="h-8 w-8" />
                    <div>
                        <h1 className="text-2xl font-semibold">Library Books</h1>
                        <p className="text-sm text-muted-foreground">Manage your library book collection</p>
                    </div>
                </div>
                {hasCreatePermission && (
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Book
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Books</CardTitle>
                    <CardDescription>
                        {Array.isArray(books) ? books.length : 0} total books
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by title, author, or ISBN..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                                <CollapsibleTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Filter className="h-4 w-4 mr-2" />
                                        Filters
                                        {hasActiveFilters && (
                                            <Badge variant="secondary" className="ml-2">
                                                {[categoryFilter !== 'all' ? 1 : 0].filter(Boolean).length}
                                            </Badge>
                                        )}
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-2 pt-2">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="category-filter" className="w-20">Category</Label>
                                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                            <SelectTrigger id="category-filter" className="w-48">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Categories</SelectItem>
                                                {Array.isArray(categories) && categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {hasActiveFilters && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setCategoryFilter('all');
                                                    setSearchQuery('');
                                                }}
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Reset
                                            </Button>
                                        )}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Author</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Copies</TableHead>
                                        <TableHead>Deposit</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBooks.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                {searchQuery || categoryFilter !== 'all'
                                                    ? 'No books found matching your filters.'
                                                    : 'No books yet. Add your first book to get started.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredBooks.map((book) => {
                                            const category = Array.isArray(categories)
                                                ? categories.find((c) => c.id === book.category_id)
                                                : null;
                                            const categoryName = category?.name || book.categoryRelation?.name || book.category || null;
                                            return (
                                                <TableRow key={book.id}>
                                                    <TableCell className="font-medium">
                                                        <div>{book.title}</div>
                                                        {book.isbn && (
                                                            <div className="text-xs text-muted-foreground">
                                                                ISBN: {book.isbn}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{book.author || '—'}</TableCell>
                                                    <TableCell>
                                                        {categoryName ? (
                                                            <Badge variant="outline">{categoryName}</Badge>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline">
                                                                Available: {book.available_copies ?? 0}
                                                            </Badge>
                                                            <Badge variant="secondary">
                                                                Total: {book.total_copies ?? 0}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>${book.deposit_amount ?? 0}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleAddCopy(book.id)}
                                                                title="Add Copy"
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                            {hasUpdatePermission && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleOpenDialog(book)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {hasDeletePermission && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleOpenDeleteDialog(book)}
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
                    </div>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedBook ? 'Edit Book' : 'Add New Book'}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedBook
                                ? 'Update the book information below.'
                                : 'Add a new book to your library collection.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="title">
                                    Title <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    {...register('title')}
                                    placeholder="Enter book title"
                                />
                                {errors.title && (
                                    <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="author">Author</Label>
                                    <Input
                                        id="author"
                                        {...register('author')}
                                        placeholder="Author name"
                                    />
                                    {errors.author && (
                                        <p className="text-sm text-destructive mt-1">{errors.author.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="isbn">ISBN</Label>
                                    <Input
                                        id="isbn"
                                        {...register('isbn')}
                                        placeholder="ISBN number"
                                    />
                                    {errors.isbn && (
                                        <p className="text-sm text-destructive mt-1">{errors.isbn.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="category_id">Category</Label>
                                    <Controller
                                        control={control}
                                        name="category_id"
                                        render={({ field }) => (
                                            <Select 
                                                value={field.value || undefined} 
                                                onValueChange={(value) => field.onChange(value || null)}
                                            >
                                                <SelectTrigger id="category_id">
                                                    <SelectValue placeholder="Select category (optional)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.isArray(categories) && categories.map((cat) => (
                                                        <SelectItem key={cat.id} value={cat.id}>
                                                            {cat.name}
                                                        </SelectItem>
                                                    ))}
                                                    {(!Array.isArray(categories) || categories.length === 0) && (
                                                        <SelectItem value="no-categories" disabled>
                                                            No categories available
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="volume">Volume</Label>
                                    <Input
                                        id="volume"
                                        {...register('volume')}
                                        placeholder="Volume number"
                                    />
                                    {errors.volume && (
                                        <p className="text-sm text-destructive mt-1">{errors.volume.message}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    {...register('description')}
                                    placeholder="Book description"
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="deposit_amount">Deposit Amount</Label>
                                    <Input
                                        id="deposit_amount"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        {...register('deposit_amount', { valueAsNumber: true })}
                                    />
                                    {errors.deposit_amount && (
                                        <p className="text-sm text-destructive mt-1">{errors.deposit_amount.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="default_loan_days">Default Loan Days</Label>
                                    <Input
                                        id="default_loan_days"
                                        type="number"
                                        min={1}
                                        {...register('default_loan_days', { valueAsNumber: true })}
                                    />
                                    {errors.default_loan_days && (
                                        <p className="text-sm text-destructive mt-1">{errors.default_loan_days.message}</p>
                                    )}
                                </div>
                                {!selectedBook && (
                                    <div>
                                        <Label htmlFor="initial_copies">Initial Copies</Label>
                                        <Input
                                            id="initial_copies"
                                            type="number"
                                            min={0}
                                            {...register('initial_copies', { valueAsNumber: true })}
                                        />
                                        {errors.initial_copies && (
                                            <p className="text-sm text-destructive mt-1">{errors.initial_copies.message}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createBook.isPending || updateBook.isPending}
                            >
                                {selectedBook ? 'Update' : 'Create'}
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
                            This will delete the book "{selectedBook?.title}". All copies and loan records will be affected.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteBook.isPending}
                        >
                            {deleteBook.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

