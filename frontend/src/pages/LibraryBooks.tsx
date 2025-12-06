import { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, BookOpen, Copy, X } from 'lucide-react';
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
import { DataTable } from '@/components/data-table/data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef } from '@tanstack/react-table';
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
    book_number: z.string().max(100, 'Book number must be 100 characters or less').optional().nullable(),
    category_id: z.string().uuid().optional().nullable(),
    volume: z.string().max(50, 'Volume must be 50 characters or less').optional().nullable(),
    description: z.string().optional().nullable(),
    price: z.number().min(0, 'Price must be 0 or greater').default(0),
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

    const { 
        data: books, 
        isLoading, 
        pagination,
        page,
        pageSize,
        setPage,
        setPageSize,
    } = useLibraryBooks(true, searchQuery);
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
            price: 0,
            default_loan_days: 30,
            initial_copies: 1,
        },
    });

    // Filter books client-side (for category filter, search is handled server-side)
    const filteredBooks = useMemo(() => {
        if (!Array.isArray(books)) return [];
        
        // Category filter (client-side since backend doesn't support it yet)
        if (categoryFilter !== 'all') {
            return books.filter((book) => book.category_id === categoryFilter);
        }

        return books;
    }, [books, categoryFilter]);

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, categoryFilter, setPage]);

    const handleOpenDialog = (book?: LibraryBook) => {
        if (book) {
            reset({
                title: book.title,
                author: book.author || '',
                isbn: book.isbn || '',
                book_number: book.book_number || '',
                category_id: book.category_id || '',
                volume: book.volume || '',
                description: book.description || '',
                price: book.price || 0,
                default_loan_days: book.default_loan_days || 30,
                initial_copies: 0, // Don't pre-fill for edits
            });
            setSelectedBook(book);
        } else {
            reset({
                title: '',
                author: '',
                isbn: '',
                book_number: '',
                category_id: '',
                volume: '',
                description: '',
                price: 0,
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
            book_number: '',
            category_id: '',
            volume: '',
            description: '',
            price: 0,
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

    // Define columns for DataTable
    const columns: ColumnDef<LibraryBook>[] = useMemo(() => [
        {
            accessorKey: 'title',
            header: 'Title',
            cell: ({ row }) => {
                const book = row.original;
                return (
                    <div>
                        <div className="font-medium">{book.title}</div>
                        <div className="text-xs text-muted-foreground space-y-1">
                            {book.book_number && (
                                <div>Book #: {book.book_number}</div>
                            )}
                            {book.isbn && (
                                <div>ISBN: {book.isbn}</div>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'author',
            header: 'Author',
            cell: ({ row }) => row.original.author || '—',
        },
        {
            accessorKey: 'category',
            header: 'Category',
            cell: ({ row }) => {
                const book = row.original;
                const category = Array.isArray(categories)
                    ? categories.find((c) => c.id === book.category_id)
                    : null;
                const categoryName = category?.name || book.category?.name || book.category || null;
                return categoryName ? (
                    <Badge variant="outline">{categoryName}</Badge>
                ) : (
                    '—'
                );
            },
        },
        {
            accessorKey: 'copies',
            header: 'Copies',
            cell: ({ row }) => {
                const book = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">
                            Available: {book.available_copies ?? 0}
                        </Badge>
                        <Badge variant="secondary">
                            Total: {book.total_copies ?? 0}
                        </Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: 'price',
            header: 'Price',
            cell: ({ row }) => row.original.price ?? 0,
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const book = row.original;
                return (
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
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ], [categories, hasUpdatePermission, hasDeletePermission]);

    // Use DataTable hook for pagination integration
    const { table } = useDataTable({
        data: filteredBooks,
        columns,
        pageCount: pagination?.last_page,
        paginationMeta: pagination ?? null,
        initialState: {
            pagination: {
                pageIndex: page - 1,
                pageSize,
            },
        },
        onPaginationChange: (newPagination) => {
            setPage(newPagination.pageIndex + 1);
            setPageSize(newPagination.pageSize);
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
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
                        {pagination ? `${pagination.total} total books` : `${Array.isArray(books) ? books.length : 0} total books`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="relative flex-1 max-w-md w-full">
                                <Label htmlFor="search" className="mb-2 block">Search</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search"
                                        placeholder="Search by title, author, ISBN, or book number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 w-full">
                                <Label htmlFor="category-filter" className="mb-2 block">Category</Label>
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger id="category-filter" className="w-full">
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
                            </div>
                            {hasActiveFilters && (
                                <div className="w-full md:w-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setCategoryFilter('all');
                                            setSearchQuery('');
                                        }}
                                        className="w-full md:w-auto"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Reset
                                    </Button>
                                </div>
                            )}
                        </div>

                        <DataTable table={table} />

                        <DataTablePagination
                            table={table}
                            paginationMeta={pagination ?? null}
                            onPageChange={setPage}
                            onPageSizeChange={setPageSize}
                            showPageSizeSelector={true}
                            showTotalCount={true}
                        />
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
                            <div className="grid grid-cols-2 gap-4">
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
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                <div>
                                    <Label htmlFor="book_number">Book Number</Label>
                                    <Input
                                        id="book_number"
                                        {...register('book_number')}
                                        placeholder="Unique book number"
                                    />
                                    {errors.book_number && (
                                        <p className="text-sm text-destructive mt-1">{errors.book_number.message}</p>
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
                                                value={field.value || ''} 
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
                                    <Label htmlFor="price">Price</Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        {...register('price', { valueAsNumber: true })}
                                    />
                                    {errors.price && (
                                        <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
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

