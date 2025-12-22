    import { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, BookOpen, Copy, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useLibraryBooks, useCreateLibraryBook, useUpdateLibraryBook, useDeleteLibraryBook, useCreateLibraryCopy, useLibraryLoans } from '@/hooks/useLibrary';
import { useLibraryCategories } from '@/hooks/useLibraryCategories';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useStaff } from '@/hooks/useStaff';
import { useProfile } from '@/hooks/useProfiles';
import { useFinanceAccounts } from '@/hooks/useFinance';
import { useCurrencies } from '@/hooks/useCurrencies';
import type { LibraryBook, LibraryLoan } from '@/types/domain/library';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/data-table/data-table';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { ColumnDef } from '@tanstack/react-table';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoadingSpinner } from '@/components/ui/loading';
import { toast } from 'sonner';

const bookSchema = z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title must be 255 characters or less'),
    author: z.string().max(255, 'Author must be 255 characters or less').optional().nullable(),
    isbn: z.string().max(100, 'ISBN must be 100 characters or less').optional().nullable(),
    book_number: z.string().min(1, 'Book number is required').max(100, 'Book number must be 100 characters or less'),
    category_id: z.string().uuid('Category is required'),
    volume: z.string().max(50, 'Volume must be 50 characters or less').optional().nullable(),
    description: z.string().optional().nullable(),
    price: z.number().min(0.01, 'Price is required and must be greater than 0'),
    default_loan_days: z.number().int().min(1, 'Loan days must be at least 1').default(30),
    initial_copies: z.number().int().min(0, 'Initial copies must be 0 or greater').default(1),
    currency_id: z.string().uuid('Currency is required'),
    finance_account_id: z.string().uuid('Finance account is required'),
});

type BookFormData = z.infer<typeof bookSchema>;

export default function LibraryBooks() {
    const { t, isRTL } = useLanguage();
    const hasCreatePermission = useHasPermission('library_books.create');
    const hasUpdatePermission = useHasPermission('library_books.update');
    const hasDeletePermission = useHasPermission('library_books.delete');

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isViewPanelOpen, setIsViewPanelOpen] = useState(false);
    const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
    const [viewBook, setViewBook] = useState<LibraryBook | null>(null);
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
    const { data: allLoans } = useLibraryLoans(false); // Get all loans for history
    const typedAllLoans = (allLoans as LibraryLoan[]) || [];
    const createBook = useCreateLibraryBook();
    const updateBook = useUpdateLibraryBook();
    const deleteBook = useDeleteLibraryBook();
    const createCopy = useCreateLibraryCopy();

    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
        formState: { errors },
    } = useForm<BookFormData>({
        resolver: zodResolver(bookSchema),
        defaultValues: {
            price: 0,
            default_loan_days: 30,
            initial_copies: 1,
            currency_id: null,
            finance_account_id: null,
        },
    });

    const { data: financeAccounts } = useFinanceAccounts();
    const { data: currencies } = useCurrencies();

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
                author: book.author || null,
                isbn: book.isbn || null,
                book_number: book.book_number || null,
                category_id: book.category_id || null,
                volume: book.volume || null,
                description: book.description || null,
                price: book.price || 0,
                default_loan_days: book.default_loan_days || 30,
                initial_copies: 0, // Don't pre-fill for edits
                currency_id: book.currency_id || null,
                finance_account_id: book.finance_account_id || null,
            });
            setSelectedBook(book);
        } else {
            reset({
                title: '',
                author: null,
                isbn: null,
                book_number: null,
                category_id: null,
                volume: null,
                description: null,
                price: 0,
                default_loan_days: 30,
                initial_copies: 1,
                currency_id: null,
                finance_account_id: null,
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
            author: null,
            isbn: null,
            book_number: null,
            category_id: null,
            volume: null,
            description: null,
            price: 0,
            default_loan_days: 30,
            initial_copies: 1,
            currency_id: null,
            finance_account_id: null,
        });
    };

    const onSubmit = (data: BookFormData) => {
        // Convert empty strings to null for optional fields
        const submitData = {
            ...data,
            currency_id: data.currency_id || null,
            finance_account_id: data.finance_account_id || null,
            author: data.author || null,
            isbn: data.isbn || null,
            book_number: data.book_number || null,
            category_id: data.category_id || null,
            volume: data.volume || null,
            description: data.description || null,
        };

        if (selectedBook) {
            const { initial_copies, ...updateData } = submitData;
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
            createBook.mutate(submitData, {
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
            header: t('library.author'),
            cell: ({ row }) => row.original.author || '—',
        },
        {
            accessorKey: 'category',
            header: t('library.category'),
            cell: ({ row }) => {
                const book = row.original;
                const category = Array.isArray(categories)
                    ? categories.find((c) => c.id === book.category_id)
                    : null;
                let categoryName: string | null = null;
                if (category?.name) {
                    categoryName = category.name;
                } else if (typeof book.category === 'string') {
                    categoryName = book.category;
                } else if (book.category && typeof book.category === 'object' && 'name' in book.category) {
                    categoryName = (book.category as { name: string }).name;
                }
                return categoryName ? (
                    <Badge variant="outline">{categoryName}</Badge>
                ) : (
                    '—'
                );
            },
        },
        {
            accessorKey: 'copies',
            header: t('library.copies'),
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
            header: t('library.price'),
            cell: ({ row }) => {
                const price = row.original.price ?? 0;
                const numPrice = typeof price === 'string' ? parseFloat(price) : (typeof price === 'number' ? price : 0);
                return isNaN(numPrice) ? '0.00' : numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            },
        },
        {
            id: 'actions',
            header: () => <div className={cn("text-right", isRTL && "text-left")}>{t('common.actions')}</div>,
            cell: ({ row }) => {
                const book = row.original;
                return (
                    <div className={cn("flex gap-2", isRTL ? "justify-start" : "justify-end")}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewBook(book);
                                setIsViewPanelOpen(true);
                            }}
                            title={t('library.viewDetails')}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAddCopy(book.id);
                            }}
                            title={t('library.addCopy')}
                        >
                            <Copy className="h-4 w-4" />
                        </Button>
                        {hasUpdatePermission && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDialog(book);
                                }}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                        {hasDeletePermission && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDeleteDialog(book);
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ], [categories, hasUpdatePermission, hasDeletePermission, t, isRTL]);

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
                        <h1 className="text-2xl font-semibold">{t('library.books')}</h1>
                        <p className="text-sm text-muted-foreground">{t('library.subtitle')}</p>
                    </div>
                </div>
                {hasCreatePermission && (
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('library.addBook')}
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('library.books')}</CardTitle>
                    <CardDescription>
                        {pagination ? `${pagination.total} ${t('library.booksLabel')}` : `${Array.isArray(books) ? books.length : 0} ${t('library.booksLabel')}`}
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
                                        placeholder={t('library.searchBookPlaceholder')}
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
                                        <SelectItem value="all">{t('library.allCategories')}</SelectItem>
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

                        <DataTable 
                            table={table} 
                            onRowClick={(book) => {
                                setViewBook(book);
                                setIsViewPanelOpen(true);
                            }}
                        />

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
                            {selectedBook ? t('library.editBookTitle') : t('library.addNewBookTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedBook
                                ? t('library.updateBookInfo')
                                : t('library.addNewBookInfo')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="title">
                                        {t('library.bookTitle')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="title"
                                        {...register('title')}
                                        placeholder={t('library.enterBookTitle')}
                                    />
                                    {errors.title && (
                                        <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="author">{t('library.author')}</Label>
                                    <Input
                                        id="author"
                                        {...register('author')}
                                        placeholder={t('library.authorPlaceholder')}
                                    />
                                    {errors.author && (
                                        <p className="text-sm text-destructive mt-1">{errors.author.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="isbn">{t('library.isbn')}</Label>
                                    <Input
                                        id="isbn"
                                        {...register('isbn')}
                                        placeholder={t('library.isbnPlaceholder')}
                                    />
                                    {errors.isbn && (
                                        <p className="text-sm text-destructive mt-1">{errors.isbn.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="book_number">
                                        {t('library.bookNumber')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="book_number"
                                        {...register('book_number')}
                                        placeholder={t('library.bookNumberPlaceholder')}
                                        className={errors.book_number ? 'border-destructive' : ''}
                                    />
                                    {errors.book_number && (
                                        <p className="text-sm text-destructive mt-1">{errors.book_number.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="category_id">
                                        {t('library.category')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Controller
                                        control={control}
                                        name="category_id"
                                        render={({ field }) => (
                                            <Select 
                                                value={field.value || ''} 
                                                onValueChange={(value) => field.onChange(value || null)}
                                            >
                                                <SelectTrigger id="category_id" className={errors.category_id ? 'border-destructive' : ''}>
                                                    <SelectValue placeholder={t('library.selectCategory') || 'Select category'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.isArray(categories) && categories.map((cat) => (
                                                        <SelectItem key={cat.id} value={cat.id}>
                                                            {cat.name}
                                                        </SelectItem>
                                                    ))}
                                                    {(!Array.isArray(categories) || categories.length === 0) && (
                                                        <SelectItem value="no-categories" disabled>
                                                            {t('library.noCategoriesAvailable')}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="volume">{t('library.volume')}</Label>
                                    <Input
                                        id="volume"
                                        {...register('volume')}
                                        placeholder={t('library.volumePlaceholder')}
                                    />
                                    {errors.volume && (
                                        <p className="text-sm text-destructive mt-1">{errors.volume.message}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">{t('library.description')}</Label>
                                <Textarea
                                    id="description"
                                    {...register('description')}
                                    placeholder={t('library.descriptionPlaceholder')}
                                    rows={3}
                                />
                                {errors.description && (
                                    <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="price">
                                        {t('library.price')} <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="price"
                                        type="number"
                                        min={0.01}
                                        step="0.01"
                                        {...register('price', { valueAsNumber: true })}
                                        className={errors.price ? 'border-destructive' : ''}
                                    />
                                    {errors.price && (
                                        <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="default_loan_days">{t('library.defaultLoanDays')}</Label>
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
                                        <Label htmlFor="initial_copies">{t('library.initialCopies')}</Label>
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="finance_account_id">
                                        {t('finance.accounts.account') || 'Finance Account'} <span className="text-destructive">*</span>
                                    </Label>
                                    <Controller
                                        control={control}
                                        name="finance_account_id"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value ?? ''}
                                                onValueChange={(value) => {
                                                    const newValue = value || null;
                                                    field.onChange(newValue);
                                                    // Auto-select currency from account if account has currency
                                                    if (value && financeAccounts) {
                                                        const account = financeAccounts.find((acc) => acc.id === value);
                                                        if (account?.currencyId) {
                                                            setValue('currency_id', account.currencyId);
                                                        } else {
                                                            setValue('currency_id', null);
                                                        }
                                                    } else {
                                                        // Clear currency if account is cleared
                                                        setValue('currency_id', null);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className={errors.finance_account_id ? 'border-destructive' : ''}>
                                                    <SelectValue placeholder={t('finance.selectAccount') || 'Select finance account'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {financeAccounts?.map((account) => (
                                                        <SelectItem key={account.id} value={account.id}>
                                                            {account.name} {account.code ? `(${account.code})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.finance_account_id && (
                                        <p className="text-sm text-destructive mt-1">{errors.finance_account_id.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="currency_id">
                                        {t('finance.currency') || 'Currency'} <span className="text-destructive">*</span>
                                    </Label>
                                    <Controller
                                        control={control}
                                        name="currency_id"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value ?? ''}
                                                onValueChange={(value) => field.onChange(value || null)}
                                            >
                                                <SelectTrigger className={errors.currency_id ? 'border-destructive' : ''}>
                                                    <SelectValue placeholder={t('finance.selectCurrency') || 'Select currency'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {currencies?.map((currency) => (
                                                        <SelectItem key={currency.id} value={currency.id}>
                                                            {currency.code} - {currency.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                    {errors.currency_id && (
                                        <p className="text-sm text-destructive mt-1">{errors.currency_id.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={createBook.isPending || updateBook.isPending}
                            >
                                {selectedBook ? t('library.update') : t('library.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('library.areYouSure')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('library.deleteBookConfirm').replace('{title}', selectedBook?.title || '')}
                            {' '}
                            {t('library.cannotUndo')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteBook.isPending}
                        >
                            {deleteBook.isPending ? t('library.deleting') : t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Book View Panel */}
            <Sheet open={isViewPanelOpen} onOpenChange={setIsViewPanelOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    {viewBook && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{viewBook.title}</SheetTitle>
                                <SheetDescription>
                                    {viewBook.author && `By ${viewBook.author}`}
                                    {viewBook.category && ` • ${viewBook.category}`}
                                </SheetDescription>
                            </SheetHeader>
                            
                            <Tabs defaultValue="info" className="mt-6">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="info">{t('library.bookInformation')}</TabsTrigger>
                                    <TabsTrigger value="history">{t('library.history')}</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="info" className="space-y-4 mt-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-muted-foreground">Title</Label>
                                                    <p className="font-medium">{viewBook.title}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">Author</Label>
                                                    <p className="font-medium">{viewBook.author || '—'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">ISBN</Label>
                                                    <p className="font-medium">{viewBook.isbn || '—'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">Book Number</Label>
                                                    <p className="font-medium">{viewBook.book_number || '—'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">Category</Label>
                                                    <p className="font-medium">
                                                        {Array.isArray(categories) && viewBook.category_id
                                                            ? categories.find(c => c.id === viewBook.category_id)?.name || viewBook.category || '—'
                                                            : viewBook.category || '—'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">Volume</Label>
                                                    <p className="font-medium">{viewBook.volume || '—'}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">Price</Label>
                                                    <p className="font-medium">
                                                        {(() => {
                                                            const price = viewBook.price ?? 0;
                                                            const numPrice = typeof price === 'string' ? parseFloat(price) : (typeof price === 'number' ? price : 0);
                                                            return isNaN(numPrice) ? '0.00' : numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                        })()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">Default Loan Days</Label>
                                                    <p className="font-medium">{viewBook.default_loan_days || 30} days</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">Total Copies</Label>
                                                    <p className="font-medium">{viewBook.total_copies ?? 0}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">Available Copies</Label>
                                                    <p className="font-medium">{viewBook.available_copies ?? 0}</p>
                                                </div>
                                            </div>
                                            {viewBook.description && (
                                                <div className="mt-4">
                                                    <Label className="text-muted-foreground">Description</Label>
                                                    <p className="mt-1 text-sm">{viewBook.description}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    
                                    {Array.isArray(viewBook.copies) && viewBook.copies.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Copies ({viewBook.copies.length})</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    {viewBook.copies.map((copy, index) => (
                                                        <div key={copy.id || `copy-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                                                            <div>
                                                                <p className="font-medium">Copy {index + 1}</p>
                                                                {copy.copy_code && (
                                                                    <p className="text-sm text-muted-foreground">Code: {copy.copy_code}</p>
                                                                )}
                                                            </div>
                                                            <Badge variant={copy.status === 'available' ? 'default' : 'secondary'}>
                                                                {copy.status || 'unknown'}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>
                                
                                <TabsContent value="history" className="space-y-4 mt-4">
                                    <BookHistoryPanel bookId={viewBook.id} allLoans={typedAllLoans} />
                                </TabsContent>
                            </Tabs>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}

// Book History Panel Component
function BookHistoryPanel({ bookId, allLoans }: { bookId: string; allLoans?: LibraryLoan[] }) {
    const { data: profile } = useProfile();
    // For historical loans, we use active admissions to get current student data
    // Note: Historical loans may reference inactive students, but we'll show active students for lookup
    const { data: studentAdmissions } = useStudentAdmissions(profile?.organization_id, false, {
        enrollment_status: 'active',
    });
    // Extract students from admissions
    const students = useMemo(() => {
        if (!studentAdmissions || !Array.isArray(studentAdmissions)) return [];
        return studentAdmissions
            .map(admission => admission.student)
            .filter((student): student is NonNullable<typeof student> => student !== null && student !== undefined);
    }, [studentAdmissions]);
    const { data: staff } = useStaff();
    
    const bookLoans = useMemo(() => {
        if (!Array.isArray(allLoans)) return [];
        return allLoans
            .filter(loan => loan.book_id === bookId)
            .sort((a, b) => {
                const dateA = a.loan_date ? new Date(a.loan_date).getTime() : 0;
                const dateB = b.loan_date ? new Date(b.loan_date).getTime() : 0;
                return dateB - dateA; // Most recent first
            });
    }, [allLoans, bookId]);
    
    if (bookLoans.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    No loan history found for this book.
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Loan History ({bookLoans.length})</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {bookLoans.map((loan, index) => {
                        const borrower = loan.student_id
                            ? (Array.isArray(students) ? students.find((s) => s.id === loan.student_id) : null)
                            : (Array.isArray(staff) ? staff.find((s) => s.id === loan.staff_id) : null);
                        const borrowerName = borrower
                            ? ('fullName' in borrower ? borrower.fullName : (borrower as any).name || 'Unknown')
                            : 'Unknown';
                        const isReturned = !!loan.returned_at;
                        const isOverdue = !isReturned && loan.due_date && new Date(loan.due_date) < new Date();
                        
                        return (
                            <div key={loan.id || `loan-${index}`} className="border rounded-lg p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={isReturned ? 'secondary' : isOverdue ? 'destructive' : 'default'}>
                                            {isReturned ? 'Returned' : isOverdue ? 'Overdue' : 'Active'}
                                        </Badge>
                                        <Badge variant="outline">
                                            {loan.copy?.copy_code || loan.copy?.id || 'N/A'}
                                        </Badge>
                                    </div>
                                    <span className="text-sm text-muted-foreground">
                                        {loan.loan_date ? format(new Date(loan.loan_date), 'MMM dd, yyyy') : 'N/A'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <Label className="text-muted-foreground">Borrower</Label>
                                        <p className="font-medium">{borrowerName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {loan.student_id ? 'Student' : 'Staff'}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Due Date</Label>
                                        <p className="font-medium">
                                            {loan.due_date ? format(new Date(loan.due_date), 'MMM dd, yyyy') : 'N/A'}
                                        </p>
                                    </div>
                                    {isReturned && (
                                        <div>
                                            <Label className="text-muted-foreground">Returned Date</Label>
                                            <p className="font-medium">
                                                {loan.returned_at ? format(new Date(loan.returned_at), 'MMM dd, yyyy') : 'N/A'}
                                            </p>
                                        </div>
                                    )}
                                    <div>
                                        <Label className="text-muted-foreground">Deposit Amount</Label>
                                        <p className="font-medium">{loan.deposit_amount ?? 0}</p>
                                    </div>
                                </div>
                                {loan.notes && (
                                    <div className="mt-2">
                                        <Label className="text-muted-foreground text-xs">Notes</Label>
                                        <p className="text-sm">{loan.notes}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

