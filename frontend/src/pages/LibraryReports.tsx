import { useMemo, useState } from 'react';
import { BookOpen, BookCheck, AlertTriangle, Calendar, TrendingUp, Download, Filter, X, History } from 'lucide-react';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import { useLibraryBooks, useLibraryLoans, useDueSoonLoans } from '@/hooks/useLibrary';
import type { LibraryLoan } from '@/types/domain/library';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading';
import { useLanguage } from '@/hooks/useLanguage';

export default function LibraryReports() {
    const { t } = useLanguage();
    const { data: books, isLoading: booksLoading } = useLibraryBooks();
    const { data: allLoans, isLoading: loansLoading } = useLibraryLoans(false);
    const { data: openLoans } = useLibraryLoans(true);
    const { data: dueSoon } = useDueSoonLoans(7);

    const [dateFrom, setDateFrom] = useState(format(addDays(new Date(), -30), 'yyyy-MM-dd'));
    const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [filtersOpen, setFiltersOpen] = useState(false);

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
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [allLoans, books]);

    const handleExport = () => {
        // TODO: Implement export functionality
        alert('Export functionality will be implemented');
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
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BookOpen className="h-8 w-8" />
                    <div>
                        <h1 className="text-2xl font-semibold">Library Reports</h1>
                        <p className="text-sm text-muted-foreground">Analytics and insights for your library</p>
                    </div>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                </Button>
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
            <Tabs defaultValue="overdue" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
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
                                <div className="space-y-2">
                                    {overdueLoans.map((loan) => (
                                        <div
                                            key={loan.id}
                                            className="border rounded-lg p-4 space-y-2 bg-destructive/5 border-destructive/20"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold">{loan.book?.title}</div>
                                                <Badge variant="destructive">Overdue</Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Due: {loan.due_date ? format(new Date(loan.due_date), 'MMM dd, yyyy') : 'N/A'}
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
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Array.isArray(dueSoon) && dueSoon.map((loan) => (
                                        <div
                                            key={loan.id}
                                            className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="font-semibold">{loan.book?.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                                Due: {loan.due_date ? format(new Date(loan.due_date), 'MMM dd, yyyy') : 'N/A'}
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
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Loan History Tab */}
                <TabsContent value="loan-history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Loan History</CardTitle>
                                    <CardDescription>All loans within the selected date range</CardDescription>
                                </div>
                                <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                                    <CollapsibleTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <Filter className="h-4 w-4 mr-2" />
                                            Filters
                                            {hasActiveFilters && (
                                                <Badge variant="secondary" className="ml-2">1</Badge>
                                            )}
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-2 pt-2">
                                        <div className="flex items-center gap-2">
                                            <div>
                                                <Label htmlFor="date-from" className="text-xs">From</Label>
                                                <Input
                                                    id="date-from"
                                                    type="date"
                                                    value={dateFrom}
                                                    onChange={(e) => setDateFrom(e.target.value)}
                                                    className="w-40"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="date-to" className="text-xs">To</Label>
                                                <Input
                                                    id="date-to"
                                                    type="date"
                                                    value={dateTo}
                                                    onChange={(e) => setDateTo(e.target.value)}
                                                    className="w-40"
                                                />
                                            </div>
                                            {hasActiveFilters && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setDateFrom(format(addDays(new Date(), -30), 'yyyy-MM-dd'));
                                                        setDateTo(format(new Date(), 'yyyy-MM-dd'));
                                                    }}
                                                    className="mt-6"
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Reset
                                                </Button>
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredLoanHistory.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No loans found in the selected date range.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {filteredLoanHistory.slice(0, 50).map((loan) => (
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
                                                {loan.loan_date && format(new Date(loan.loan_date), 'MMM dd, yyyy')}
                                                {loan.due_date && ` → Due: ${format(new Date(loan.due_date), 'MMM dd, yyyy')}`}
                                                {loan.returned_at && ` (Returned: ${format(new Date(loan.returned_at), 'MMM dd, yyyy')})`}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredLoanHistory.length > 50 && (
                                        <p className="text-xs text-muted-foreground text-center pt-2">
                                            Showing first 50 of {filteredLoanHistory.length} loans
                                        </p>
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
                            <CardDescription>Top 10 most frequently borrowed books</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {mostBorrowedBooks.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No loan history available yet.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {mostBorrowedBooks.map((item, index) => (
                                        <div
                                            key={item.book.id}
                                            className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                                                    {index + 1}
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
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

