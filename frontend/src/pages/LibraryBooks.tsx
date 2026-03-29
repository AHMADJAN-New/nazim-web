import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Search, BookOpen, Copy, X, Eye, MoreVertical } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';

import * as z from 'zod';
import { DataTable } from '@/components/data-table/data-table';
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
import { Button } from '@/components/ui/button';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useFinanceAccounts } from '@/hooks/useFinance';
import { useLibraryBooks, useCreateLibraryBook, useUpdateLibraryBook, useDeleteLibraryBook, useCreateLibraryCopy, useLibraryLoans } from '@/hooks/useLibrary';
import { useLibraryCategories } from '@/hooks/useLibraryCategories';
import { useStaff } from '@/hooks/useStaff';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useProfile } from '@/hooks/useProfiles';
import { getLibraryBookCategoryName } from '@/lib/libraryBookCategory';
import { parseApiDateInput, safeFormatDate } from '@/lib/dateUtils';
import { formatDate, cn, formatCurrency, getAccountCurrencyCode } from '@/lib/utils';
import type { LibraryBook, LibraryLoan } from '@/types/domain/library';
import { useHasPermission } from '@/hooks/usePermissions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { useDataTable } from '@/hooks/use-data-table';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { FilterPanel } from '@/components/layout/FilterPanel';
import type { TranslationKey } from '@/lib/translations/keys.generated';
import { showToast } from '@/lib/toast';

import { LoadingSpinner } from '@/components/ui/loading';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

function createBookSchema(t: TranslateFn) {
    return z.object({
        title: z
            .string()
            .transform((s) => s.trim())
            .pipe(
                z
                    .string()
                    .min(1, t('library.validation.titleRequired'))
                    .max(255, t('library.validation.titleMaxLength')),
            ),
        author: z.string().max(255, t('library.validation.authorMaxLength')).optional().nullable(),
        isbn: z.string().max(100, t('library.validation.isbnMaxLength')).optional().nullable(),
        book_number: z
            .string()
            .transform((s) => s.trim())
            .pipe(
                z
                    .string()
                    .min(1, t('library.validation.bookNumberRequired'))
                    .max(100, t('library.validation.bookNumberMaxLength')),
            ),
        category_id: z.string().uuid(t('library.validation.categoryRequired')),
        volume: z.string().max(50, t('library.validation.volumeMaxLength')).optional().nullable(),
        description: z.string().optional().nullable(),
        price: z.number().min(0.01, t('library.validation.priceMin')),
        default_loan_days: z.number().int().min(1, t('library.validation.loanDaysMin')).default(30),
        initial_copies: z.number().int().min(0, t('library.validation.initialCopiesMin')).default(1),
        currency_id: z.string().uuid(t('library.validation.currencyRequired')),
        finance_account_id: z.string().uuid(t('library.validation.financeAccountRequired')),
    });
}

type BookFormData = z.infer<ReturnType<typeof createBookSchema>>;

const EM_DASH = '\u2014';

function dateLocaleFromLanguage(language: string): string {
    switch (language) {
        case 'ar':
            return 'ar';
        case 'fa':
            return 'fa-AF';
        case 'ps':
            return 'ps-AF';
        default:
            return 'en-US';
    }
}

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

    const bookSchema = useMemo(() => createBookSchema(t), [t]);
    const bookResolver = useMemo(() => zodResolver(bookSchema), [bookSchema]);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
        formState: { errors },
    } = useForm<BookFormData>({
        resolver: bookResolver,
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
            return books.filter((book) => String(book.category_id ?? '') === categoryFilter);
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
        // Convert empty strings to null for optional fields (title/book_number already trimmed by schema)
        const submitData = {
            ...data,
            currency_id: data.currency_id || null,
            finance_account_id: data.finance_account_id || null,
            author: data.author?.trim() ? data.author.trim() : null,
            isbn: data.isbn?.trim() ? data.isbn.trim() : null,
            book_number: data.book_number,
            category_id: data.category_id || null,
            volume: data.volume?.trim() ? data.volume.trim() : null,
            description: data.description?.trim() ? data.description.trim() : null,
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
                showToast.success('toast.library.copyAdded');
            },
        });
    };

    const hasActiveFilters = categoryFilter !== 'all' || searchQuery;

    // Define columns for DataTable
    const columns: ColumnDef<LibraryBook>[] = useMemo(() => [
        {
            accessorKey: 'title',
            header: t('library.bookTitle'),
            cell: ({ row }) => {
                const book = row.original;
                const desc = book.description?.trim();
                return (
                    <div className="space-y-1 min-w-0 max-w-[min(100%,22rem)]">
                        <p className="font-semibold text-sm leading-snug line-clamp-2">{book.title}</p>
                        {book.book_number && (
                            <Badge variant="muted" className="text-xs shrink-0 font-mono w-fit max-w-full">
                                {book.book_number}
                            </Badge>
                        )}
                        {desc ? (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">{desc}</p>
                        ) : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'author',
            header: t('library.author'),
            cell: ({ row }) => (
                <span className="text-sm leading-snug line-clamp-3 min-w-0 max-w-[14rem] block">
                    {row.original.author || EM_DASH}
                </span>
            ),
        },
        {
            accessorKey: 'category',
            header: t('assets.category'),
            cell: ({ row }) => {
                const categoryName = getLibraryBookCategoryName(row.original, categories);
                return categoryName ? (
                    <Badge variant="muted" className="shrink-0 text-xs max-w-[12rem] whitespace-normal h-auto py-1 text-left font-normal">
                        {categoryName}
                    </Badge>
                ) : (
                    <span className="text-sm text-muted-foreground">{EM_DASH}</span>
                );
            },
        },
        {
            accessorKey: 'copies',
            header: t('assets.copies'),
            cell: ({ row }) => {
                const book = row.original;
                const avail = book.available_copies ?? 0;
                const total = book.total_copies ?? 0;
                return (
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="success" className="shrink-0 text-xs tabular-nums">
                            {avail}
                        </Badge>
                        <span className="text-muted-foreground text-xs" aria-hidden>
                            /
                        </span>
                        <Badge variant="muted" className="shrink-0 text-xs tabular-nums">
                            {total}
                        </Badge>
                    </div>
                );
            },
        },
        {
            accessorKey: 'price',
            header: t('library.price'),
            cell: ({ row }) => {
                const book = row.original;
                const price = book.price ?? 0;
                const numPrice = typeof price === 'string' ? parseFloat(price) : typeof price === 'number' ? price : 0;
                const safe = Number.isFinite(numPrice) ? numPrice : 0;
                const currencyCode = getAccountCurrencyCode(
                    book.finance_account ?? null,
                    book.currency?.code ?? 'AFN',
                );
                return (
                    <span className="text-sm font-medium tabular-nums whitespace-nowrap">
                        {formatCurrency(safe, currencyCode)}
                    </span>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className={cn('text-right', isRTL && 'text-left')}>{t('events.actions')}</div>,
            cell: ({ row }) => {
                const book = row.original;
                return (
                    <div
                        className={cn('flex', isRTL ? 'justify-start' : 'justify-end')}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">{t('events.actions')}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setViewBook(book);
                                        setIsViewPanelOpen(true);
                                    }}
                                >
                                    <Eye className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                                    {t('events.viewDetails')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAddCopy(book.id)}>
                                    <Copy className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                                    {t('library.addCopy')}
                                </DropdownMenuItem>
                                {hasUpdatePermission && (
                                    <DropdownMenuItem onClick={() => handleOpenDialog(book)}>
                                        <Pencil className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                                        {t('events.edit')}
                                    </DropdownMenuItem>
                                )}
                                {hasDeletePermission && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={() => handleOpenDeleteDialog(book)}
                                            className="text-destructive focus:text-destructive"
                                        >
                                            <Trash2 className={cn('h-4 w-4', isRTL ? 'ml-2' : 'mr-2')} />
                                            {t('events.delete')}
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ], [
        categories,
        hasUpdatePermission,
        hasDeletePermission,
        t,
        isRTL,
        handleAddCopy,
        handleOpenDialog,
        handleOpenDeleteDialog,
    ]);

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
            <PageHeader
                title={t('library.books')}
                description={t('library.subtitle')}
                icon={<BookOpen className="h-5 w-5" />}
                primaryAction={
                    hasCreatePermission
                        ? {
                            label: t('library.addBook'),
                            onClick: () => handleOpenDialog(),
                            icon: <Plus className="h-4 w-4" />,
                        }
                        : undefined
                }
            />

            <Card>
                <CardHeader>
                    <CardTitle>{t('library.books')}</CardTitle>
                    <CardDescription>
                        {pagination ? `${pagination.total} ${t('library.booksLabel')}` : `${Array.isArray(books) ? books.length : 0} ${t('library.booksLabel')}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <FilterPanel title={t('library.filters')}>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="relative flex-1 max-w-md w-full">
                                    <Label htmlFor="search" className="mb-2 block">
                                        {t('common.search')}
                                    </Label>
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
                                    <Label htmlFor="category-filter" className="mb-2 block">
                                        {t('assets.category')}
                                    </Label>
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
                                            {t('library.reset')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </FilterPanel>

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
                                        {t('assets.category')} <span className="text-destructive">*</span>
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
                                                    <SelectValue placeholder={t('library.selectCategory')} />
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
                                    {errors.category_id && (
                                        <p className="text-sm text-destructive mt-1">{errors.category_id.message}</p>
                                    )}
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
                                <Label htmlFor="description">{t('events.description')}</Label>
                                <Textarea
                                    id="description"
                                    {...register('description')}
                                    placeholder={t('permissions.descriptionPlaceholder')}
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
                                        {t('finance.account')} <span className="text-destructive">*</span>
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
                                                    const syncOpts = {
                                                        shouldValidate: true,
                                                        shouldDirty: true,
                                                        shouldTouch: true,
                                                    } as const;
                                                    if (value && financeAccounts) {
                                                        const account = financeAccounts.find((acc) => acc.id === value);
                                                        if (account?.currencyId) {
                                                            setValue('currency_id', account.currencyId, syncOpts);
                                                        } else {
                                                            setValue('currency_id', null, syncOpts);
                                                        }
                                                    } else {
                                                        setValue('currency_id', null, syncOpts);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className={errors.finance_account_id ? 'border-destructive' : ''}>
                                                    <SelectValue placeholder={t('finance.selectAccount')} />
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
                                        {t('finance.currency')} <span className="text-destructive">*</span>
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
                                                    <SelectValue placeholder={t('finance.selectCurrency')} />
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
                                {t('events.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={createBook.isPending || updateBook.isPending}
                            >
                                {selectedBook ? t('events.update') : t('events.create')}
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
                        <AlertDialogCancel>{t('events.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deleteBook.isPending}
                        >
                            {deleteBook.isPending ? t('events.deleting') : t('events.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Book View Panel */}
            <Sheet open={isViewPanelOpen} onOpenChange={setIsViewPanelOpen}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                    {viewBook && (() => {
                        const categoryStr = getLibraryBookCategoryName(viewBook, categories) ?? '';
                        const sheetSubtitle = [
                            viewBook.author ? t('library.viewByAuthor', { author: viewBook.author }) : null,
                            categoryStr || null,
                        ]
                            .filter(Boolean)
                            .join(' • ');
                        const copyStatusLabel = (status: string | undefined) => {
                            if (!status) return t('library.copyStatusUnknown');
                            const s = status.toLowerCase();
                            if (s === 'available') return t('library.available');
                            return status;
                        };
                        return (
                        <>
                            <SheetHeader>
                                <SheetTitle>{viewBook.title}</SheetTitle>
                                {sheetSubtitle ? <SheetDescription>{sheetSubtitle}</SheetDescription> : null}
                            </SheetHeader>
                            
                            <Tabs defaultValue="info" className="mt-6">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="info">{t('library.bookInformation')}</TabsTrigger>
                                    <TabsTrigger value="history">{t('assets.history')}</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="info" className="space-y-4 mt-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>{t('library.details')}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.bookTitle')}</Label>
                                                    <p className="font-medium">{viewBook.title}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.author')}</Label>
                                                    <p className="font-medium">{viewBook.author || EM_DASH}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.isbn')}</Label>
                                                    <p className="font-medium">{viewBook.isbn || EM_DASH}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.bookNumber')}</Label>
                                                    <p className="font-medium">{viewBook.book_number || EM_DASH}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.category')}</Label>
                                                    <p className="font-medium">
                                                        {getLibraryBookCategoryName(viewBook, categories) ?? EM_DASH}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.volume')}</Label>
                                                    <p className="font-medium">{viewBook.volume || EM_DASH}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.price')}</Label>
                                                    <p className="font-medium">
                                                        {(() => {
                                                            const price = viewBook.price ?? 0;
                                                            const numPrice = typeof price === 'string' ? parseFloat(price) : (typeof price === 'number' ? price : 0);
                                                            return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
                                                        })()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.defaultLoanDays')}</Label>
                                                    <p className="font-medium">
                                                        {t('library.loanDaysUnit', { count: viewBook.default_loan_days ?? 30 })}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.totalCopies')}</Label>
                                                    <p className="font-medium">{viewBook.total_copies ?? 0}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground">{t('library.availableCopies')}</Label>
                                                    <p className="font-medium">{viewBook.available_copies ?? 0}</p>
                                                </div>
                                            </div>
                                            {viewBook.description && (
                                                <div className="mt-4">
                                                    <Label className="text-muted-foreground">{t('library.description')}</Label>
                                                    <p className="mt-1 text-sm">{viewBook.description}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    
                                    {Array.isArray(viewBook.copies) && viewBook.copies.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>
                                                    {t('library.copiesWithCount', { count: viewBook.copies.length })}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    {viewBook.copies.map((copy, index) => (
                                                        <div key={copy.id || `copy-${index}`} className="flex items-center justify-between p-2 border rounded-md">
                                                            <div>
                                                                <p className="font-medium">
                                                                    {t('library.copyNumberLabel', { n: index + 1 })}
                                                                </p>
                                                                {copy.copy_code && (
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {t('library.copyCodePrefix')} {copy.copy_code}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <Badge variant={copy.status === 'available' ? 'default' : 'secondary'}>
                                                                {copyStatusLabel(copy.status)}
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
                        );
                    })()}
                </SheetContent>
            </Sheet>
        </div>
    );
}

// Book History Panel Component
function BookHistoryPanel({ bookId, allLoans }: { bookId: string; allLoans?: LibraryLoan[] }) {
    const { t, language, isRTL } = useLanguage();
    const dateLocale = useMemo(() => dateLocaleFromLanguage(language), [language]);
    const formatLoanDate = useCallback(
        (v: unknown) => safeFormatDate(v, formatDate, EM_DASH, dateLocale),
        [dateLocale],
    );
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
                const dateA = parseApiDateInput(a.loan_date)?.getTime() ?? 0;
                const dateB = parseApiDateInput(b.loan_date)?.getTime() ?? 0;
                return dateB - dateA;
            });
    }, [allLoans, bookId]);

    if (bookLoans.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    {t('library.noLoanHistoryForBook')}
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('library.loanHistoryWithCount', { count: bookLoans.length })}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {bookLoans.map((loan, index) => {
                        const borrower = loan.student_id
                            ? (Array.isArray(students) ? students.find((s) => s.id === loan.student_id) : null)
                            : (Array.isArray(staff) ? staff.find((s) => s.id === loan.staff_id) : null);
                        const borrowerName = borrower
                            ? ('fullName' in borrower ? borrower.fullName : (borrower as { name?: string }).name || t('library.unknownBorrower'))
                            : t('library.unknownBorrower');
                        const isReturned =
                            loan.returned_at != null && String(loan.returned_at).trim() !== '';
                        const dueParsed = parseApiDateInput(loan.due_date);
                        const isOverdue = !isReturned && dueParsed !== null && dueParsed < new Date();
                        
                        return (
                            <div key={loan.id || `loan-${index}`} className="border rounded-lg p-4 space-y-3 bg-card/50">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={isReturned ? 'secondary' : isOverdue ? 'destructive' : 'default'}>
                                            {isReturned ? t('library.returned') : isOverdue ? t('library.overdue') : t('library.active')}
                                        </Badge>
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {loan.copy?.copy_code || loan.copy?.id || EM_DASH}
                                        </Badge>
                                    </div>
                                    <div className={cn('space-y-0.5 sm:text-end', isRTL && 'sm:text-start')}>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {t('library.loanDate')}
                                        </p>
                                        <p className="text-sm font-medium tabular-nums">{formatLoanDate(loan.loan_date)}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-1 border-t border-border/60">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {t('library.borrower')}
                                        </Label>
                                        <p className="font-medium leading-snug">{borrowerName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {loan.student_id ? t('library.borrowerTypeStudent') : t('library.borrowerTypeStaff')}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {t('library.dueDate')}
                                        </Label>
                                        <p className="font-medium tabular-nums">{formatLoanDate(loan.due_date)}</p>
                                    </div>
                                    {isReturned && (
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                {t('library.returnedDateLabel')}
                                            </Label>
                                            <p className="font-medium tabular-nums">{formatLoanDate(loan.returned_at)}</p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {t('library.depositAmount')}
                                        </Label>
                                        <p className="font-medium tabular-nums">{loan.deposit_amount ?? 0}</p>
                                    </div>
                                </div>
                                {loan.notes && (
                                    <div className="pt-2 border-t border-border/40">
                                        <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {t('events.notes')}
                                        </Label>
                                        <p className="text-sm mt-1 leading-relaxed">{loan.notes}</p>
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

