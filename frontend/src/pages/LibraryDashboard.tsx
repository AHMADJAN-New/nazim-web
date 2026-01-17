/**
 * Library Dashboard - Modern Overview of library data
 */

import { format, isBefore } from 'date-fns';
import { 
    BookOpen, 
    BookCheck, 
    AlertTriangle, 
    Calendar, 
    TrendingUp, 
    Layers, 
    Tag, 
    DollarSign, 
    ChevronRight, 
    ArrowUpRight,
    BarChart3,
    History,
    Download,
    Eye,
    Package
} from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, ChartSkeleton } from '@/components/charts/LazyChart';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { StatsCard } from '@/components/dashboard/StatsCard';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { LoadingSpinner } from '@/components/ui/loading';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';
import { useLibraryBooks, useLibraryLoans, useDueSoonLoans } from '@/hooks/useLibrary';
import { useLibraryCategories } from '@/hooks/useLibraryCategories';


const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function LibraryDashboard() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    
    const { data: books, isLoading: booksLoading } = useLibraryBooks(false);
    const { data: categories } = useLibraryCategories();
    const { data: allLoans, isLoading: loansLoading } = useLibraryLoans(false);
    const { data: openLoans } = useLibraryLoans(true);
    const { data: dueSoon } = useDueSoonLoans(7);

    // Calculate dashboard statistics
    const dashboardStats = useMemo(() => {
        const totalBooks = Array.isArray(books) ? books.length : 0;
        const totalCopies = Array.isArray(books)
            ? books.reduce((sum, book) => sum + (book.total_copies ?? 0), 0)
            : 0;
        const availableCopies = Array.isArray(books)
            ? books.reduce((sum, book) => sum + (book.available_copies ?? 0), 0)
            : 0;
        const onLoan = totalCopies - availableCopies;
        const activeLoans = Array.isArray(openLoans) ? openLoans.length : 0;
        const overdueCount = Array.isArray(openLoans)
            ? openLoans.filter((loan) => {
                  if (!loan.due_date) return false;
                  return isBefore(new Date(loan.due_date), new Date());
              }).length
            : 0;
        const dueSoonCount = Array.isArray(dueSoon) ? dueSoon.length : 0;
        
        // Calculate total library value
        const parsePrice = (price: any): number => {
            if (price === null || price === undefined) return 0;
            if (typeof price === 'number') {
                return isNaN(price) ? 0 : Math.max(0, Math.min(price, 999999.99));
            }
            const priceStr = String(price);
            const decimalCount = (priceStr.match(/\./g) || []).length;
            if (decimalCount > 1) {
                const match = priceStr.match(/^(\d+\.\d{1,2})/);
                if (match) {
                    const parsed = parseFloat(match[1]);
                    return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, 999999.99));
                }
            }
            const parsed = parseFloat(priceStr);
            return isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, 999999.99));
        };

        const totalValue = Array.isArray(books)
            ? books.reduce((sum, book) => {
                  const price = parsePrice(book.price);
                  const copies = book.total_copies ?? 0;
                  return sum + (price * copies);
              }, 0)
            : 0;

        // Books by category
        const booksByCategory = Array.isArray(books) && Array.isArray(categories)
            ? categories.map((cat) => ({
                  id: cat.id,
                  name: cat.name,
                  count: books.filter((book) => book.category_id === cat.id).length,
                  value: books
                      .filter((book) => book.category_id === cat.id)
                      .reduce((sum, book) => {
                          const price = parsePrice(book.price);
                          const copies = book.total_copies ?? 0;
                          return sum + (price * copies);
                      }, 0),
              })).filter((item) => item.count > 0)
              .sort((a, b) => b.count - a.count)
            : [];

        // Books without category
        const booksWithoutCategory = Array.isArray(books)
            ? books.filter((book) => !book.category_id || book.category_id === null).length
            : 0;

        // Monthly loan trends (last 6 months)
        const monthlyLoans = (() => {
            if (!Array.isArray(allLoans)) return [];
            const months = [];
            const now = new Date();
            for (let i = 5; i >= 0; i--) {
                const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const monthName = format(date, 'MMM');
                const monthLoans = allLoans.filter((loan) => {
                    if (!loan.loan_date) return false;
                    const loanDate = new Date(loan.loan_date);
                    return loanDate.getMonth() === date.getMonth() && 
                           loanDate.getFullYear() === date.getFullYear();
                }).length;
                months.push({ month: monthName, loans: monthLoans });
            }
            return months;
        })();

        // Most borrowed books
        const mostBorrowedBooks = (() => {
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
                .slice(0, 5);
        })();

        return {
            totalBooks,
            totalCopies,
            availableCopies,
            onLoan,
            activeLoans,
            overdueCount,
            dueSoonCount,
            totalValue,
            booksByCategory,
            booksWithoutCategory,
            monthlyLoans,
            mostBorrowedBooks,
        };
    }, [books, openLoans, dueSoon, categories, allLoans]);

    if (booksLoading || loansLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner />
            </div>
        );
    }

    const availabilityPercentage = dashboardStats.totalCopies > 0 
        ? (dashboardStats.availableCopies / dashboardStats.totalCopies) * 100 
        : 0;

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
            <PageHeader
                title={t('library.dashboard') || 'Library Dashboard'}
                description={t('library.dashboardDescription') || 'Overview of your library\'s books, loans, and statistics'}
                icon={<BookOpen className="h-5 w-5" />}
                secondaryActions={[
                    {
                        label: t('dashboard.viewReports') || 'View Reports',
                        onClick: () => navigate('/library/reports'),
                        icon: <BarChart3 className="h-4 w-4" />,
                        variant: "outline",
                    },
                ]}
                rightSlot={
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label={t('events.download') || 'Download'}
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                }
            />

            {/* Main Stats Cards Row */}
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title={t('library.totalBooks') || 'Total Books'}
                    value={dashboardStats.totalBooks}
                    icon={BookOpen}
                    description={`${dashboardStats.totalCopies} ${t('library.totalCopiesLabel') || 'total copies'}`}
                    color="blue"
                    showButton={true}
                    buttonText={t('library.viewAllBooks') || 'View All Books'}
                    onClick={() => navigate('/library/books')}
                />
                <StatsCard
                    title={t('library.availableCopies') || 'Available Copies'}
                    value={dashboardStats.availableCopies}
                    icon={BookCheck}
                    description={`${dashboardStats.onLoan} ${t('library.onLoanLabel') || 'on loan'}`}
                    color="green"
                />
                <StatsCard
                    title={t('library.activeLoans') || 'Active Loans'}
                    value={dashboardStats.activeLoans}
                    icon={Layers}
                    description={dashboardStats.overdueCount > 0 
                        ? `${dashboardStats.overdueCount} ${t('library.overdue') || 'overdue'}`
                        : t('library.allCurrent') || 'All current'}
                    color="purple"
                    showButton={true}
                    buttonText={t('library.manageLoans') || 'Manage Loans'}
                    onClick={() => navigate('/library/distribution')}
                />
                <StatsCard
                    title={t('library.dueSoonCount') || 'Due Soon'}
                    value={dashboardStats.dueSoonCount}
                    icon={Calendar}
                    description={t('library.dueInNext7Days') || 'Due in next 7 days'}
                    color="amber"
                />
            </div>

            {/* Secondary Stats Row */}
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <StatsCard
                    title={t('library.totalValue') || 'Total Library Value'}
                    value={dashboardStats.totalValue.toLocaleString('en-US', { 
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    })}
                    icon={DollarSign}
                    description={t('library.totalValueDescription') || 'Based on book prices and copies'}
                    color="blue"
                />
                <StatsCard
                    title={t('library.overdue') || 'Overdue Books'}
                    value={dashboardStats.overdueCount}
                    icon={AlertTriangle}
                    description={dashboardStats.overdueCount > 0 
                        ? t('library.booksPastDue') || 'Books past due date'
                        : t('library.noOverdue') || 'No overdue books'}
                    color={dashboardStats.overdueCount > 0 ? "red" : "blue"}
                />
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            {t('library.categories') || 'Categories'}
                        </CardTitle>
                        <CardDescription>
                            {t('library.totalCategories') || 'Total categories'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {dashboardStats.booksByCategory.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {dashboardStats.booksWithoutCategory > 0 
                                ? `${dashboardStats.booksWithoutCategory} ${t('library.uncategorized') || 'uncategorized'}`
                                : t('library.allCategorized') || 'All books categorized'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts and Breakdown Row */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Books by Category */}
                {dashboardStats.booksByCategory.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">{t('library.booksByCategory') || 'Books by Category'}</CardTitle>
                                <CardDescription className="mt-1">
                                    {t('library.totalBooks') || 'Total'}: <span className="font-semibold text-foreground">{dashboardStats.totalBooks}</span>
                                </CardDescription>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => navigate('/library/categories')}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dashboardStats.booksByCategory.slice(0, 8)}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                            outerRadius={70}
                                            fill="#8884d8"
                                            dataKey="count"
                                        >
                                            {dashboardStats.booksByCategory.slice(0, 8).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2">
                                {dashboardStats.booksByCategory.slice(0, 5).map((item) => {
                                    const percentage = dashboardStats.totalBooks > 0 
                                        ? (item.count / dashboardStats.totalBooks) * 100 
                                        : 0;
                                    return (
                                        <div key={item.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="text-sm font-medium truncate">{item.name}</span>
                                            </div>
                                            <div className="text-right ml-4">
                                                <div className="text-sm font-semibold">{item.count}</div>
                                                <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {dashboardStats.booksByCategory.length > 5 && (
                                    <div className="text-xs text-muted-foreground text-center pt-2">
                                        +{dashboardStats.booksByCategory.length - 5} {t('library.moreCategories') || 'more categories'}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-3 pb-3">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                                onClick={() => navigate('/library/categories')}
                            >
                                <span className="text-left">{t('library.viewAllCategories') || 'View All Categories'}</span>
                                <ChevronRight className="h-4 w-4 ml-1.5 flex-shrink-0" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Monthly Loan Trends */}
                {dashboardStats.monthlyLoans.length > 0 && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">{t('library.monthlyLoanTrends') || 'Monthly Loan Trends'}</CardTitle>
                                <CardDescription>Last 6 months</CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate('/library/reports')}
                            >
                                {t('examReports.viewReport') || 'View Report'}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dashboardStats.monthlyLoans}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="loans" fill="#8884d8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Most Borrowed Books */}
            {dashboardStats.mostBorrowedBooks.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">{t('library.mostBorrowedBooks') || 'Most Borrowed Books'}</CardTitle>
                            <CardDescription>{t('library.top5Books') || 'Top 5 most borrowed books'}</CardDescription>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate('/library/reports')}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {dashboardStats.mostBorrowedBooks.map((item, index) => (
                                <div key={item.book.id || index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{item.book.title}</p>
                                            {item.book.author && (
                                                <p className="text-sm text-muted-foreground truncate">{item.book.author}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 ml-4">
                                        <div className="text-right">
                                            <div className="text-sm font-semibold">{item.count}</div>
                                            <div className="text-xs text-muted-foreground">{t('library.loans') || 'loans'}</div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigate(`/library/books`)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-3 pb-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full justify-start whitespace-normal sm:whitespace-nowrap"
                            onClick={() => navigate('/library/reports')}
                        >
                            <span className="text-left">{t('library.viewFullReport') || 'View Full Report'}</span>
                            <ChevronRight className="h-4 w-4 ml-1.5 flex-shrink-0" />
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}

