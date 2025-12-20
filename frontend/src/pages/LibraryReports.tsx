import { useMemo, useState, useEffect } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { BookOpen, BookCheck, AlertTriangle, Calendar, TrendingUp, Download, X, History, FileText, Tag, DollarSign, Layers, BarChart3 } from 'lucide-react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { useLibraryBooks, useLibraryLoans, useDueSoonLoans } from '@/hooks/useLibrary';
import { useLibraryCategories } from '@/hooks/useLibraryCategories';
import type { LibraryLoan, LibraryBook } from '@/types/domain/library';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function LibraryReports() {
    const { t } = useLanguage();
    const { data: books, isLoading: booksLoading } = useLibraryBooks();
    const { data: allLoans, isLoading: loansLoading } = useLibraryLoans(false);
    const { data: openLoans } = useLibraryLoans(true);
    const { data: dueSoon } = useDueSoonLoans(7);
    const { data: categories } = useLibraryCategories();

    const [dateFrom, setDateFrom] = useState(format(addDays(new Date(), -30), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
    
    // Pagination state for loan history
    const [loanHistoryPage, setLoanHistoryPage] = useState(1);
    const [loanHistoryPageSize, setLoanHistoryPageSize] = useState(25);
    
    // Pagination state for books report
    const [booksPage, setBooksPage] = useState(1);
    const [booksPageSize, setBooksPageSize] = useState(25);
    const [booksSearchQuery, setBooksSearchQuery] = useState('');
    const [booksCategoryFilter, setBooksCategoryFilter] = useState<string>('all');
    
    // Pagination state for overdue books
    const [overduePage, setOverduePage] = useState(1);
    const [overduePageSize, setOverduePageSize] = useState(25);
    
    // Pagination state for due soon
    const [dueSoonPage, setDueSoonPage] = useState(1);
    const [dueSoonPageSize, setDueSoonPageSize] = useState(25);
    
    // Pagination state for most borrowed
    const [mostBorrowedPage, setMostBorrowedPage] = useState(1);
    const [mostBorrowedPageSize, setMostBorrowedPageSize] = useState(25);

    const stats = useMemo(() => {
        const totalBooks = Array.isArray(books) ? books.length : 0;
        const totalCopies = Array.isArray(books)
            ? books.reduce((sum, book) => sum + (book.total_copies ?? 0), 0)
            : 0;
        const availableCopies = Array.isArray(books)
            ? books.reduce((sum, book) => sum + (book.available_copies ?? 0), 0)
            : 0;
        const activeLoans = Array.isArray(openLoans) ? openLoans.length : 0;
        const overdueCount = Array.isArray(openLoans)
            ? openLoans.filter((loan) => {
                  if (!loan.due_date) return false;
                  return isBefore(new Date(loan.due_date), new Date());
              }).length
            : 0;
        const dueSoonCount = Array.isArray(dueSoon) ? dueSoon.length : 0;

        return {
            totalBooks,
            totalCopies,
            availableCopies,
            activeLoans,
            overdueCount,
            dueSoonCount,
        };
    }, [books, openLoans, dueSoon]);

    const overdueLoans = useMemo(() => {
        if (!Array.isArray(openLoans)) return [];
        return openLoans.filter((loan) => {
            if (!loan.due_date) return false;
            return isBefore(new Date(loan.due_date), new Date());
        });
    }, [openLoans]);

    const filteredLoanHistory = useMemo(() => {
        if (!Array.isArray(allLoans)) return [];
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        return allLoans.filter((loan) => {
            const loanDate = loan.loan_date ? new Date(loan.loan_date) : null;
            if (!loanDate) return false;

            if (fromDate && isBefore(loanDate, fromDate)) return false;
            if (toDate && isAfter(loanDate, toDate)) return false;

            return true;
        });
    }, [allLoans, dateFrom, dateTo]);

    // Paginated loan history
    const paginatedLoanHistory = useMemo(() => {
        const start = (loanHistoryPage - 1) * loanHistoryPageSize;
        const end = start + loanHistoryPageSize;
        return filteredLoanHistory.slice(start, end);
    }, [filteredLoanHistory, loanHistoryPage, loanHistoryPageSize]);

    const loanHistoryTotalPages = Math.ceil(filteredLoanHistory.length / loanHistoryPageSize);

    // Reset pagination when date filters change
    useEffect(() => {
        setLoanHistoryPage(1);
    }, [dateFrom, dateTo]);

    // Filtered books for Books Report
    const filteredBooks = useMemo(() => {
        if (!Array.isArray(books)) return [];
        let filtered = books;

        // Search filter
        if (booksSearchQuery) {
            const query = booksSearchQuery.toLowerCase();
            filtered = filtered.filter(
                (book) =>
                    book.title?.toLowerCase().includes(query) ||
                    book.author?.toLowerCase().includes(query) ||
                    book.isbn?.toLowerCase().includes(query) ||
                    book.book_number?.toLowerCase().includes(query)
            );
        }

        // Category filter
        if (booksCategoryFilter !== 'all') {
            filtered = filtered.filter((book) => book.category_id === booksCategoryFilter);
        }

        return filtered;
    }, [books, booksSearchQuery, booksCategoryFilter]);

    // Paginated books
    const paginatedBooks = useMemo(() => {
        const start = (booksPage - 1) * booksPageSize;
        const end = start + booksPageSize;
        return filteredBooks.slice(start, end);
    }, [filteredBooks, booksPage, booksPageSize]);

    const booksTotalPages = Math.ceil(filteredBooks.length / booksPageSize);

    // Reset pagination when filters change
    useEffect(() => {
        setBooksPage(1);
    }, [booksSearchQuery, booksCategoryFilter]);

    // Books Report Statistics
    const booksReportStats = useMemo(() => {
        if (!Array.isArray(filteredBooks)) {
            return {
                totalCategories: 0,
                totalPrice: 0,
                averagePrice: 0,
                totalValue: 0,
                totalCopies: 0,
                booksWithNoCategory: 0,
            };
        }

        const uniqueCategories = new Set(
            filteredBooks
                .map((book) => book.category_id)
                .filter((id): id is string => id !== null && id !== undefined)
        );
        const totalCategories = uniqueCategories.size;

        // Helper function to parse price and extract first valid number
        const parsePrice = (price: any): number => {
            if (price === null || price === undefined) return 0;
            
            // If it's already a number, return it
            if (typeof price === 'number') {
                return isNaN(price) ? 0 : Math.max(0, Math.min(price, 999999.99));
            }
            
            // If it's a string, extract first valid price
            const priceStr = String(price);
            
            // Check if it contains multiple decimal points (concatenated prices)
            const decimalCount = (priceStr.match(/\./g) || []).length;
            
            if (decimalCount > 1) {
                // Extract first valid price (digits.digits)
                const match = priceStr.match(/^(\d+\.\d{1,2})/);
                if (match) {
                    const parsed = parseFloat(match[1]);
                    return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, 999999.99));
                }
            }
            
            // Try to parse as float
            const parsed = parseFloat(priceStr);
            return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, 999999.99));
        };

        const totalPrice = filteredBooks.reduce((sum, book) => {
            const price = parsePrice(book.price);
            return sum + price;
        }, 0);
        
        const averagePrice = filteredBooks.length > 0 ? totalPrice / filteredBooks.length : 0;
        
        // Helper function to get effective copies count
        // If copies is 0 or null, treat as 1 copy (default)
        // If book is inactive (deleted_at exists), treat as 0 copies
        const getEffectiveCopies = (book: typeof filteredBooks[0]): number => {
            // Check if book is inactive (soft deleted)
            if (book.deleted_at) {
                return 0;
            }
            
            // If copies is 0, null, or undefined, default to 1
            const copies = book.total_copies ?? 0;
            return copies > 0 ? copies : 1;
        };
        
        const totalValue = filteredBooks.reduce((sum, book) => {
            const price = parsePrice(book.price);
            const copies = getEffectiveCopies(book);
            return sum + (price * copies);
        }, 0);
        
        const totalCopies = filteredBooks.reduce((sum, book) => {
            return sum + getEffectiveCopies(book);
        }, 0);

        const booksWithNoCategory = filteredBooks.filter(
            (book) => !book.category_id || book.category_id === null
        ).length;

        return {
            totalCategories,
            totalPrice,
            averagePrice,
            totalValue,
            totalCopies,
            booksWithNoCategory,
        };
    }, [filteredBooks]);

    // Paginated overdue loans
    const paginatedOverdueLoans = useMemo(() => {
        const start = (overduePage - 1) * overduePageSize;
        const end = start + overduePageSize;
        return overdueLoans.slice(start, end);
    }, [overdueLoans, overduePage, overduePageSize]);
    const overdueTotalPages = Math.ceil(overdueLoans.length / overduePageSize);

    // Paginated due soon loans
    const paginatedDueSoon = useMemo(() => {
        if (!Array.isArray(dueSoon)) return [];
        const start = (dueSoonPage - 1) * dueSoonPageSize;
        const end = start + dueSoonPageSize;
        return dueSoon.slice(start, end);
    }, [dueSoon, dueSoonPage, dueSoonPageSize]);
    const dueSoonTotalPages = Math.ceil((Array.isArray(dueSoon) ? dueSoon.length : 0) / dueSoonPageSize);

    const mostBorrowedBooks = useMemo(() => {
        if (!Array.isArray(allLoans) || !Array.isArray(books)) return [];

        const bookLoanCounts: Record<string, { book: typeof books[0]; count: number }> = {};

        allLoans.forEach((loan) => {
            if (loan.book_id && loan.book) {
                if (!bookLoanCounts[loan.book_id]) {
                    bookLoanCounts[loan.book_id] = {
                        book: loan.book,
                        count: 0,
                    };
                }
                bookLoanCounts[loan.book_id].count++;
            }
        });

        return Object.values(bookLoanCounts)
            .sort((a, b) => b.count - a.count);
    }, [allLoans, books]);

    // Paginated most borrowed books
    const paginatedMostBorrowed = useMemo(() => {
        const start = (mostBorrowedPage - 1) * mostBorrowedPageSize;
        const end = start + mostBorrowedPageSize;
        return mostBorrowedBooks.slice(start, end);
    }, [mostBorrowedBooks, mostBorrowedPage, mostBorrowedPageSize]);
    const mostBorrowedTotalPages = Math.ceil(mostBorrowedBooks.length / mostBorrowedPageSize);

    const handleExportBooks = () => {
        if (!Array.isArray(filteredBooks) || filteredBooks.length === 0) {
            alert('No books to export');
            return;
        }

        const headers = ['Title', 'Author', 'ISBN', 'Book Number', 'Category', 'Price', 'Total Copies', 'Available Copies', 'Default Loan Days'];
        const rows = filteredBooks.map((book) => {
            const categoryName = Array.isArray(categories)
                ? categories.find((c) => c.id === book.category_id)?.name || book.category?.name || ''
                : book.category?.name || '';
            
            const priceValue = book.price ?? 0;
            const price = typeof priceValue === 'string' ? parseFloat(priceValue) : (typeof priceValue === 'number' ? priceValue : 0);
            const finalPrice = isNaN(price) ? 0 : price;
            return [
                book.title || '',
                book.author || '',
                book.isbn || '',
                book.book_number || '',
                categoryName,
                finalPrice.toFixed(2),
                (book.total_copies ?? 0).toString(),
                (book.available_copies ?? 0).toString(),
                (book.default_loan_days ?? 30).toString(),
            ];
        });

        const csvContent = [headers, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `library-books-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const hasActiveFilters = dateFrom || dateTo;

    if (booksLoading || loansLoading) {
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
                        <h1 className="text-2xl font-semibold">{t('library.libraryReports')}</h1>
                        <p className="text-sm text-muted-foreground">{t('library.analytics')}</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Books</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalBooks}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.totalCopies} total copies
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Available Copies</CardTitle>
                        <BookCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.availableCopies}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.totalCopies - stats.availableCopies} on loan
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                        <BookCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeLoans}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Currently loaned out
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{stats.overdueCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Books past due date
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.dueSoonCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Due in next 7 days
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Loan History</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{filteredLoanHistory.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            In selected date range
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for different report sections */}
            <Tabs defaultValue="books-report" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="books-report" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Books Report
                    </TabsTrigger>
                    <TabsTrigger value="overdue" className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Overdue Books
                        {stats.overdueCount > 0 && (
                            <Badge variant="destructive" className="ml-1">
                                {stats.overdueCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="due-soon" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Due Soon
                        {stats.dueSoonCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                                {stats.dueSoonCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="loan-history" className="flex items-center gap-2">
                        <History className="h-4 w-4" />
                        Loan History
                    </TabsTrigger>
                    <TabsTrigger value="most-borrowed" className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Most Borrowed
                    </TabsTrigger>
                </TabsList>

                {/* Overdue Books Tab */}
                <TabsContent value="overdue" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Overdue Books
                            </CardTitle>
                            <CardDescription>Books that are past their due date</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {overdueLoans.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No overdue books. Great job!
                                </p>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        {paginatedOverdueLoans.map((loan) => (
                                        <div
                                            key={loan.id}
                                            className="border rounded-lg p-4 space-y-2 bg-destructive/5 border-destructive/20"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold">{loan.book?.title}</div>
                                                <Badge variant="destructive">Overdue</Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Due: {loan.due_date ? formatDate(loan.due_date) : 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">
                                                    Copy {loan.copy?.copy_code || loan.copy?.id}
                                                </Badge>
                                                {loan.book?.author && (
                                                    <span className="text-xs text-muted-foreground">
                                                        by {loan.book.author}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        ))}
                                    </div>
                                    {overdueLoans.length > 0 && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <div className="text-sm text-muted-foreground">
                                                Showing {(overduePage - 1) * overduePageSize + 1} to {Math.min(overduePage * overduePageSize, overdueLoans.length)} of {overdueLoans.length} overdue books
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Select value={overduePageSize.toString()} onValueChange={(value) => { setOverduePageSize(Number(value)); setOverduePage(1); }}>
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="10">10 per page</SelectItem>
                                                        <SelectItem value="25">25 per page</SelectItem>
                                                        <SelectItem value="50">50 per page</SelectItem>
                                                        <SelectItem value="100">100 per page</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {overdueTotalPages > 1 && (
                                                    <Pagination>
                                                    <PaginationContent>
                                                        <PaginationItem>
                                                            <PaginationPrevious 
                                                                onClick={() => setOverduePage(Math.max(1, overduePage - 1))}
                                                                className={overduePage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                            />
                                                        </PaginationItem>
                                                        {Array.from({ length: Math.min(5, overdueTotalPages) }, (_, i) => {
                                                            let pageNum: number;
                                                            if (overdueTotalPages <= 5) {
                                                                pageNum = i + 1;
                                                            } else if (overduePage <= 3) {
                                                                pageNum = i + 1;
                                                            } else if (overduePage >= overdueTotalPages - 2) {
                                                                pageNum = overdueTotalPages - 4 + i;
                                                            } else {
                                                                pageNum = overduePage - 2 + i;
                                                            }
                                                            return (
                                                                <PaginationItem key={pageNum}>
                                                                    <PaginationLink
                                                                        onClick={() => setOverduePage(pageNum)}
                                                                        isActive={overduePage === pageNum}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        {pageNum}
                                                                    </PaginationLink>
                                                                </PaginationItem>
                                                            );
                                                        })}
                                                        <PaginationItem>
                                                            <PaginationNext 
                                                                onClick={() => setOverduePage(Math.min(overdueTotalPages, overduePage + 1))}
                                                                className={overduePage === overdueTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                            />
                                                        </PaginationItem>
                                                    </PaginationContent>
                                                </Pagination>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Due Soon Tab */}
                <TabsContent value="due-soon" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Due Soon</CardTitle>
                            <CardDescription>Books due for return in the next 7 days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {Array.isArray(dueSoon) && dueSoon.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No books due in the next week.
                                </p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {paginatedDueSoon.map((loan) => (
                                        <div
                                            key={loan.id}
                                            className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="font-semibold">{loan.book?.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Due: {loan.due_date ? formatDate(loan.due_date) : 'N/A'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">
                                                    Copy {loan.copy?.copy_code || loan.copy?.id}
                                                </Badge>
                                                {loan.book?.author && (
                                                    <span className="text-xs text-muted-foreground">
                                                        by {loan.book.author}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        ))}
                                    </div>
                                    {Array.isArray(dueSoon) && dueSoon.length > 0 && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <div className="text-sm text-muted-foreground">
                                                Showing {(dueSoonPage - 1) * dueSoonPageSize + 1} to {Math.min(dueSoonPage * dueSoonPageSize, dueSoon.length)} of {dueSoon.length} books due soon
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Select value={dueSoonPageSize.toString()} onValueChange={(value) => { setDueSoonPageSize(Number(value)); setDueSoonPage(1); }}>
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="10">10 per page</SelectItem>
                                                        <SelectItem value="25">25 per page</SelectItem>
                                                        <SelectItem value="50">50 per page</SelectItem>
                                                        <SelectItem value="100">100 per page</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {dueSoonTotalPages > 1 && (
                                                    <Pagination>
                                                    <PaginationContent>
                                                        <PaginationItem>
                                                            <PaginationPrevious 
                                                                onClick={() => setDueSoonPage(Math.max(1, dueSoonPage - 1))}
                                                                className={dueSoonPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                            />
                                                        </PaginationItem>
                                                        {Array.from({ length: Math.min(5, dueSoonTotalPages) }, (_, i) => {
                                                            let pageNum: number;
                                                            if (dueSoonTotalPages <= 5) {
                                                                pageNum = i + 1;
                                                            } else if (dueSoonPage <= 3) {
                                                                pageNum = i + 1;
                                                            } else if (dueSoonPage >= dueSoonTotalPages - 2) {
                                                                pageNum = dueSoonTotalPages - 4 + i;
                                                            } else {
                                                                pageNum = dueSoonPage - 2 + i;
                                                            }
                                                            return (
                                                                <PaginationItem key={pageNum}>
                                                                    <PaginationLink
                                                                        onClick={() => setDueSoonPage(pageNum)}
                                                                        isActive={dueSoonPage === pageNum}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        {pageNum}
                                                                    </PaginationLink>
                                                                </PaginationItem>
                                                            );
                                                        })}
                                                        <PaginationItem>
                                                            <PaginationNext 
                                                                onClick={() => setDueSoonPage(Math.min(dueSoonTotalPages, dueSoonPage + 1))}
                                                                className={dueSoonPage === dueSoonTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                            />
                                                        </PaginationItem>
                                                    </PaginationContent>
                                                </Pagination>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Loan History Tab */}
                <TabsContent value="loan-history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="space-y-4">
                                <div>
                                    <CardTitle>Loan History</CardTitle>
                                    <CardDescription>All loans within the selected date range</CardDescription>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="space-y-2">
                                        <Label htmlFor="date-from">From Date</Label>
                                        <CalendarDatePicker date={dateFrom ? new Date(dateFrom) : undefined} onDateChange={(date) => setDateFrom(date ? date.toISOString().split("T")[0] : "")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="date-to">To Date</Label>
                                        <CalendarDatePicker date={dateTo ? new Date(dateTo) : undefined} onDateChange={(date) => setDateTo(date ? date.toISOString().split("T")[0] : "")} />
                                    </div>
                                    {hasActiveFilters && (
                                        <div className="w-full md:w-auto">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setDateFrom(format(addDays(new Date(), -30), 'yyyy-MM-dd'));
                                                    setDateTo(format(new Date(), 'yyyy-MM-dd'));
                                                }}
                                                className="w-full md:w-auto"
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Reset
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredLoanHistory.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No loans found in the selected date range.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {paginatedLoanHistory.map((loan) => (
                                        <div
                                            key={loan.id}
                                            className="border rounded-lg p-3 space-y-1 hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="font-medium">{loan.book?.title}</div>
                                                <Badge variant={loan.returned_at ? 'secondary' : 'default'}>
                                                    {loan.returned_at ? 'Returned' : 'Active'}
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {loan.loan_date && formatDate(loan.loan_date)}
                                                {loan.due_date && ` → Due: ${formatDate(loan.due_date)}`}
                                                {loan.returned_at && ` (Returned: ${formatDate(loan.returned_at)})`}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredLoanHistory.length > 0 && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <div className="text-sm text-muted-foreground">
                                                Showing {(loanHistoryPage - 1) * loanHistoryPageSize + 1} to {Math.min(loanHistoryPage * loanHistoryPageSize, filteredLoanHistory.length)} of {filteredLoanHistory.length} loans
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Select value={loanHistoryPageSize.toString()} onValueChange={(value) => { setLoanHistoryPageSize(Number(value)); setLoanHistoryPage(1); }}>
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="10">10 per page</SelectItem>
                                                        <SelectItem value="25">25 per page</SelectItem>
                                                        <SelectItem value="50">50 per page</SelectItem>
                                                        <SelectItem value="100">100 per page</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {loanHistoryTotalPages > 1 && (
                                                    <Pagination>
                                                        <PaginationContent>
                                                            <PaginationItem>
                                                                <PaginationPrevious 
                                                                    onClick={() => setLoanHistoryPage(Math.max(1, loanHistoryPage - 1))}
                                                                    className={loanHistoryPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                                />
                                                            </PaginationItem>
                                                            {Array.from({ length: Math.min(5, loanHistoryTotalPages) }, (_, i) => {
                                                                let pageNum: number;
                                                                if (loanHistoryTotalPages <= 5) {
                                                                    pageNum = i + 1;
                                                                } else if (loanHistoryPage <= 3) {
                                                                    pageNum = i + 1;
                                                                } else if (loanHistoryPage >= loanHistoryTotalPages - 2) {
                                                                    pageNum = loanHistoryTotalPages - 4 + i;
                                                                } else {
                                                                    pageNum = loanHistoryPage - 2 + i;
                                                                }
                                                                return (
                                                                    <PaginationItem key={pageNum}>
                                                                        <PaginationLink
                                                                            onClick={() => setLoanHistoryPage(pageNum)}
                                                                            isActive={loanHistoryPage === pageNum}
                                                                            className="cursor-pointer"
                                                                        >
                                                                            {pageNum}
                                                                        </PaginationLink>
                                                                    </PaginationItem>
                                                                );
                                                            })}
                                                            <PaginationItem>
                                                                <PaginationNext 
                                                                    onClick={() => setLoanHistoryPage(Math.min(loanHistoryTotalPages, loanHistoryPage + 1))}
                                                                    className={loanHistoryPage === loanHistoryTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                                />
                                                            </PaginationItem>
                                                        </PaginationContent>
                                                    </Pagination>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Most Borrowed Books Tab */}
                <TabsContent value="most-borrowed" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Most Borrowed Books
                            </CardTitle>
                            <CardDescription>Most frequently borrowed books</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {mostBorrowedBooks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No loan history available yet.
                                </p>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        {paginatedMostBorrowed.map((item, index) => (
                                        <div
                                            key={item.book.id}
                                            className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                                                    {(mostBorrowedPage - 1) * mostBorrowedPageSize + index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{item.book.title}</div>
                                                    {item.book.author && (
                                                        <div className="text-xs text-muted-foreground">
                                                            by {item.book.author}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant="secondary">{item.count} loans</Badge>
                                        </div>
                                        ))}
                                    </div>
                                    {mostBorrowedBooks.length > 0 && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <div className="text-sm text-muted-foreground">
                                                Showing {(mostBorrowedPage - 1) * mostBorrowedPageSize + 1} to {Math.min(mostBorrowedPage * mostBorrowedPageSize, mostBorrowedBooks.length)} of {mostBorrowedBooks.length} books
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Select value={mostBorrowedPageSize.toString()} onValueChange={(value) => { setMostBorrowedPageSize(Number(value)); setMostBorrowedPage(1); }}>
                                                    <SelectTrigger className="w-[120px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="10">10 per page</SelectItem>
                                                        <SelectItem value="25">25 per page</SelectItem>
                                                        <SelectItem value="50">50 per page</SelectItem>
                                                        <SelectItem value="100">100 per page</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {mostBorrowedTotalPages > 1 && (
                                                    <Pagination>
                                                    <PaginationContent>
                                                        <PaginationItem>
                                                            <PaginationPrevious 
                                                                onClick={() => setMostBorrowedPage(Math.max(1, mostBorrowedPage - 1))}
                                                                className={mostBorrowedPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                            />
                                                        </PaginationItem>
                                                        {Array.from({ length: Math.min(5, mostBorrowedTotalPages) }, (_, i) => {
                                                            let pageNum: number;
                                                            if (mostBorrowedTotalPages <= 5) {
                                                                pageNum = i + 1;
                                                            } else if (mostBorrowedPage <= 3) {
                                                                pageNum = i + 1;
                                                            } else if (mostBorrowedPage >= mostBorrowedTotalPages - 2) {
                                                                pageNum = mostBorrowedTotalPages - 4 + i;
                                                            } else {
                                                                pageNum = mostBorrowedPage - 2 + i;
                                                            }
                                                            return (
                                                                <PaginationItem key={pageNum}>
                                                                    <PaginationLink
                                                                        onClick={() => setMostBorrowedPage(pageNum)}
                                                                        isActive={mostBorrowedPage === pageNum}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        {pageNum}
                                                                    </PaginationLink>
                                                                </PaginationItem>
                                                            );
                                                        })}
                                                        <PaginationItem>
                                                            <PaginationNext 
                                                                onClick={() => setMostBorrowedPage(Math.min(mostBorrowedTotalPages, mostBorrowedPage + 1))}
                                                                className={mostBorrowedPage === mostBorrowedTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                            />
                                                        </PaginationItem>
                                                    </PaginationContent>
                                                </Pagination>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Books Report Tab */}
                <TabsContent value="books-report" className="space-y-4">
                    {/* Books Report Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
                                <Tag className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{booksReportStats.totalCategories}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Unique categories
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Price</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {booksReportStats.formatDateTime(totalPrice)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Sum of all book prices
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {booksReportStats.formatDateTime(totalValue)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Price × Total Copies
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                                <Layers className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {booksReportStats.formatDateTime(averagePrice)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Per book
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Books Report
                                    </CardTitle>
                                    <CardDescription>Complete inventory of all library books</CardDescription>
                                </div>
                                <Button variant="outline" onClick={handleExportBooks} disabled={filteredBooks.length === 0}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Export CSV
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="relative flex-1 max-w-md">
                                        <Label htmlFor="books-search" className="mb-2 block">Search</Label>
                                        <Input
                                            id="books-search"
                                            placeholder="Search by title, author, ISBN, or book number..."
                                            value={booksSearchQuery}
                                            onChange={(e) => setBooksSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="books-category-filter">Category</Label>
                                        <Select value={booksCategoryFilter} onValueChange={setBooksCategoryFilter}>
                                            <SelectTrigger id="books-category-filter" className="w-48">
                                                <SelectValue placeholder="All Categories" />
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
                                    {(booksSearchQuery || booksCategoryFilter !== 'all') && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setBooksSearchQuery('');
                                                setBooksCategoryFilter('all');
                                            }}
                                        >
                                            <X className="h-4 w-4 mr-2" />
                                            Reset
                                        </Button>
                                    )}
                                </div>

                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Author</TableHead>
                                                <TableHead>ISBN</TableHead>
                                                <TableHead>Book #</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Price</TableHead>
                                                <TableHead>Total Copies</TableHead>
                                                <TableHead>Available</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredBooks.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                                        {booksSearchQuery || booksCategoryFilter !== 'all'
                                                            ? 'No books found matching your filters.'
                                                            : 'No books available.'}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                paginatedBooks.map((book) => {
                                                    const categoryName = Array.isArray(categories)
                                                        ? categories.find((c) => c.id === book.category_id)?.name
                                                        : book.category?.name || null;
                                                    return (
                                                        <TableRow key={book.id}>
                                                            <TableCell className="font-medium">{book.title}</TableCell>
                                                            <TableCell>{book.author || '—'}</TableCell>
                                                            <TableCell>{book.isbn || '—'}</TableCell>
                                                            <TableCell>{book.book_number || '—'}</TableCell>
                                                            <TableCell>
                                                                {categoryName ? (
                                                                    <Badge variant="outline">{categoryName}</Badge>
                                                                ) : (
                                                                    '—'
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {(() => {
                                                                    const price = book.price ?? 0;
                                                                    const numPrice = typeof price === 'string' ? parseFloat(price) : (typeof price === 'number' ? price : 0);
                                                                    return isNaN(numPrice) ? '0.00' : formatDateTime(numPrice);
                                                                })()}
                                                            </TableCell>
                                                            <TableCell>{book.total_copies ?? 0}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={book.available_copies && book.available_copies > 0 ? 'default' : 'secondary'}>
                                                                    {book.available_copies ?? 0}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {filteredBooks.length > 0 && (
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                        <div className="text-sm text-muted-foreground">
                                            Showing {(booksPage - 1) * booksPageSize + 1} to {Math.min(booksPage * booksPageSize, filteredBooks.length)} of {filteredBooks.length} books
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select value={booksPageSize.toString()} onValueChange={(value) => { setBooksPageSize(Number(value)); setBooksPage(1); }}>
                                                <SelectTrigger className="w-[120px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10">10 per page</SelectItem>
                                                    <SelectItem value="25">25 per page</SelectItem>
                                                    <SelectItem value="50">50 per page</SelectItem>
                                                    <SelectItem value="100">100 per page</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {booksTotalPages > 1 && (
                                                <Pagination>
                                                    <PaginationContent>
                                                        <PaginationItem>
                                                            <PaginationPrevious 
                                                                onClick={() => setBooksPage(Math.max(1, booksPage - 1))}
                                                                className={booksPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                            />
                                                        </PaginationItem>
                                                        {Array.from({ length: Math.min(5, booksTotalPages) }, (_, i) => {
                                                            let pageNum: number;
                                                            if (booksTotalPages <= 5) {
                                                                pageNum = i + 1;
                                                            } else if (booksPage <= 3) {
                                                                pageNum = i + 1;
                                                            } else if (booksPage >= booksTotalPages - 2) {
                                                                pageNum = booksTotalPages - 4 + i;
                                                            } else {
                                                                pageNum = booksPage - 2 + i;
                                                            }
                                                            return (
                                                                <PaginationItem key={pageNum}>
                                                                    <PaginationLink
                                                                        onClick={() => setBooksPage(pageNum)}
                                                                        isActive={booksPage === pageNum}
                                                                        className="cursor-pointer"
                                                                    >
                                                                        {pageNum}
                                                                    </PaginationLink>
                                                                </PaginationItem>
                                                            );
                                                        })}
                                                        <PaginationItem>
                                                            <PaginationNext 
                                                                onClick={() => setBooksPage(Math.min(booksTotalPages, booksPage + 1))}
                                                                className={booksPage === booksTotalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                                            />
                                                        </PaginationItem>
                                                    </PaginationContent>
                                                </Pagination>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

