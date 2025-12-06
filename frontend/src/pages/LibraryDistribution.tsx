import { useState, useMemo } from 'react';
import { Plus, Search, BookCheck, RefreshCw, Calendar, User, X } from 'lucide-react';
import { format } from 'date-fns';
import { useLibraryLoans, useCreateLibraryLoan, useReturnLibraryLoan } from '@/hooks/useLibrary';
import { useLibraryBooks } from '@/hooks/useLibrary';
import { useLibraryCategories } from '@/hooks/useLibraryCategories';
import { useStudents } from '@/hooks/useStudents';
import { useStaff } from '@/hooks/useStaff';
import type { LibraryBook, LibraryLoan } from '@/types/domain/library';
import { useHasPermission } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { useLanguage } from '@/hooks/useLanguage';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoadingSpinner } from '@/components/ui/loading';
import { toast } from 'sonner';

const defaultLoanDate = format(new Date(), 'yyyy-MM-dd');

const loanSchema = z.object({
    book_id: z.string().uuid('Book is required'),
    book_copy_id: z.string().uuid('Copy is required'),
    borrower_type: z.enum(['student', 'staff']),
    student_id: z.string().uuid().optional().nullable(),
    staff_id: z.string().uuid().optional().nullable(),
    loan_date: z.string().min(1, 'Loan date is required'),
    due_date: z.string().optional().nullable(),
    deposit_amount: z.number().min(0).default(0),
}).refine(
    (data) => {
        if (data.borrower_type === 'student') {
            return !!data.student_id;
        } else {
            return !!data.staff_id;
        }
    },
    {
        message: 'Borrower is required',
        path: ['student_id'],
    }
);

type LoanFormData = z.infer<typeof loanSchema>;

const findAvailableCopy = (book: LibraryBook) => {
    return Array.isArray(book.copies) ? book.copies.find((copy) => copy.status === 'available') : null;
};

export default function LibraryDistribution() {
    const { t } = useLanguage();
    const hasCreatePermission = useHasPermission('library_loans.create');
    const hasUpdatePermission = useHasPermission('library_loans.update');

    const [isLoanDialogOpen, setIsLoanDialogOpen] = useState(false);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<LibraryLoan | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [borrowerFilter, setBorrowerFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('');

    const { data: openLoans, isLoading: loansLoading } = useLibraryLoans(true);
    const { data: books } = useLibraryBooks();
    const { data: categories } = useLibraryCategories();
    const { data: students } = useStudents();
    const { data: staff } = useStaff();
    const createLoan = useCreateLibraryLoan();
    const returnLoan = useReturnLibraryLoan();

    const {
        register,
        handleSubmit,
        reset,
        control,
        watch,
        setValue,
        formState: { errors },
    } = useForm<LoanFormData>({
        resolver: zodResolver(loanSchema),
        defaultValues: {
            borrower_type: 'student',
            loan_date: defaultLoanDate,
            deposit_amount: 0,
        },
    });

    const borrowerType = watch('borrower_type');
    const selectedBookId = watch('book_id');

    const availableBooks = useMemo(() => {
        if (!Array.isArray(books)) return [];
        let filtered = books.filter((book) => (book.available_copies ?? 0) > 0);
        
        // Filter by category if selected
        if (categoryFilter) {
            filtered = filtered.filter((book) => book.category_id === categoryFilter);
        }
        
        return filtered;
    }, [books, categoryFilter]);

    const bookOptions = useMemo(() => {
        if (!Array.isArray(availableBooks) || availableBooks.length === 0) {
            return [];
        }
        return availableBooks.map((book) => {
            const categoryName = Array.isArray(categories) 
                ? categories.find(c => c.id === book.category_id)?.name 
                : book.category?.name || '';
            return {
                value: book.id,
                label: `${book.title}${book.author ? ` by ${book.author}` : ''}${categoryName ? ` [${categoryName}]` : ''} (${book.available_copies ?? 0} available)`,
            };
        });
    }, [availableBooks, categories]);

    const studentOptions = useMemo(() => {
        if (!Array.isArray(students)) return [];
        return students.map((student) => ({
            value: student.id,
            label: student.fullName,
        }));
    }, [students]);

    const staffOptions = useMemo(() => {
        if (!Array.isArray(staff)) return [];
        return staff.map((member) => ({
            value: member.id,
            label: member.fullName || (member as any).name || 'Unknown',
        }));
    }, [staff]);

    const selectedBook = useMemo(() => {
        if (!selectedBookId || !Array.isArray(books)) return null;
        return books.find((b) => b.id === selectedBookId) || null;
    }, [selectedBookId, books]);

    const availableCopies = useMemo(() => {
        if (!selectedBook || !Array.isArray(selectedBook.copies)) return [];
        return selectedBook.copies.filter((copy) => copy.status === 'available');
    }, [selectedBook]);

    const filteredLoans = useMemo(() => {
        if (!Array.isArray(openLoans)) return [];
        let filtered = openLoans;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (loan) =>
                    loan.book?.title?.toLowerCase().includes(query) ||
                    loan.copy?.copy_code?.toLowerCase().includes(query)
            );
        }

        // Borrower filter
        if (borrowerFilter !== 'all') {
            filtered = filtered.filter((loan) => {
                if (borrowerFilter === 'student') return !!loan.student_id;
                if (borrowerFilter === 'staff') return !!loan.staff_id;
                return true;
            });
        }

        return filtered;
    }, [openLoans, searchQuery, borrowerFilter]);

    const handleOpenLoanDialog = () => {
        reset({
            book_id: '',
            book_copy_id: '',
            borrower_type: 'student',
            student_id: '',
            staff_id: '',
            loan_date: defaultLoanDate,
            due_date: '',
            deposit_amount: 0,
        });
        setIsLoanDialogOpen(true);
    };

    const handleCloseLoanDialog = () => {
        setIsLoanDialogOpen(false);
        reset({
            book_id: '',
            book_copy_id: '',
            borrower_type: 'student',
            student_id: '',
            staff_id: '',
            loan_date: defaultLoanDate,
            due_date: '',
            deposit_amount: 0,
        });
    };

    const onSubmitLoan = (data: LoanFormData) => {
        createLoan.mutate(data, {
            onSuccess: () => {
                handleCloseLoanDialog();
            },
        });
    };

    const handleReturn = (loan: LibraryLoan) => {
        setSelectedLoan(loan);
        setIsReturnDialogOpen(true);
    };

    const handleConfirmReturn = () => {
        if (selectedLoan) {
            returnLoan.mutate({ id: selectedLoan.id }, {
                onSuccess: () => {
                    setIsReturnDialogOpen(false);
                    setSelectedLoan(null);
                },
            });
        }
    };

    const handleBookChange = (bookId: string) => {
        setValue('book_id', bookId);
        const book = Array.isArray(books) ? books.find((b) => b.id === bookId) : null;
        if (book) {
            const availableCopy = findAvailableCopy(book);
            if (availableCopy) {
                setValue('book_copy_id', availableCopy.id);
            } else {
                setValue('book_copy_id', '');
            }
            // Set deposit amount from book price
            if (book.price) {
                setValue('deposit_amount', book.price);
            }
        }
    };

    const hasActiveFilters = borrowerFilter !== 'all' || searchQuery || categoryFilter;
    
    const categoryOptions = useMemo(() => {
        if (!Array.isArray(categories)) return [];
        return [
            { value: '', label: 'All Categories' },
            ...categories.map((cat) => ({
                value: cat.id,
                label: cat.name,
            })),
        ];
    }, [categories]);

    if (loansLoading) {
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
                    <BookCheck className="h-8 w-8" />
                    <div>
                        <h1 className="text-2xl font-semibold">Library Distribution</h1>
                        <p className="text-sm text-muted-foreground">Manage book loans and returns</p>
                    </div>
                </div>
                {hasCreatePermission && (
                    <Button onClick={handleOpenLoanDialog}>
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Book
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Loans</CardTitle>
                    <CardDescription>
                        {Array.isArray(openLoans) ? openLoans.length : 0} active loans
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
                                        placeholder="Search by book title or copy code..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 w-full">
                                <div className="space-y-2">
                                    <Label htmlFor="category-filter">Category</Label>
                                    <Combobox
                                        options={categoryOptions}
                                        value={categoryFilter}
                                        onValueChange={setCategoryFilter}
                                        placeholder="All Categories"
                                        searchPlaceholder="Search categories..."
                                        emptyText="No categories found."
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="borrower-filter">Borrower</Label>
                                    <Select value={borrowerFilter} onValueChange={setBorrowerFilter}>
                                        <SelectTrigger id="borrower-filter" className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Borrowers</SelectItem>
                                            <SelectItem value="student">Students Only</SelectItem>
                                            <SelectItem value="staff">Staff Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            {hasActiveFilters && (
                                <div className="w-full md:w-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setBorrowerFilter('all');
                                            setCategoryFilter('');
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

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Book</TableHead>
                                        <TableHead>Copy</TableHead>
                                        <TableHead>Borrower</TableHead>
                                        <TableHead>Loan Date</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Deposit</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLoans.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                {searchQuery || borrowerFilter !== 'all'
                                                    ? 'No loans found matching your filters.'
                                                    : 'No active loans.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredLoans.map((loan) => {
                                            const borrower = loan.student_id
                                                ? (Array.isArray(students) ? students.find((s) => s.id === loan.student_id) : null)
                                                : (Array.isArray(staff) ? staff.find((s) => s.id === loan.staff_id) : null);
                                            const borrowerName = borrower
                                                ? (borrower.fullName || (borrower as any).name || 'Unknown')
                                                : 'Unknown';
                                            const isOverdue = loan.due_date && new Date(loan.due_date) < new Date();

                                            return (
                                                <TableRow key={loan.id}>
                                                    <TableCell className="font-medium">
                                                        {loan.book?.title || 'Unknown Book'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {loan.copy?.copy_code || loan.copy?.id || 'N/A'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-muted-foreground" />
                                                            <span>{borrowerName}</span>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {loan.student_id ? 'Student' : 'Staff'}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {loan.loan_date ? format(new Date(loan.loan_date), 'MMM dd, yyyy') : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {loan.due_date ? (
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                                <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                                                    {format(new Date(loan.due_date), 'MMM dd, yyyy')}
                                                                </span>
                                                                {isOverdue && (
                                                                    <Badge variant="destructive" className="text-xs">
                                                                        Overdue
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            'N/A'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{loan.deposit_amount ?? 0}</TableCell>
                                                    <TableCell className="text-right">
                                                        {hasUpdatePermission && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleReturn(loan)}
                                                            >
                                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                                Return
                                                            </Button>
                                                        )}
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

            {/* Assign Book Dialog */}
            <Dialog open={isLoanDialogOpen} onOpenChange={setIsLoanDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Assign Book</DialogTitle>
                        <DialogDescription>
                            Loan a book to a student or staff member
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmitLoan)}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="book_id">
                                    Book <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="book_id"
                                    render={({ field }) => (
                                        <Combobox
                                            options={bookOptions}
                                            value={field.value || ''}
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                handleBookChange(value);
                                            }}
                                            placeholder="Search and select a book..."
                                            searchPlaceholder="Search by title or author..."
                                            emptyText="No books available."
                                            className="w-full"
                                        />
                                    )}
                                />
                                {errors.book_id && (
                                    <p className="text-sm text-destructive mt-1">{errors.book_id.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="book_copy_id">
                                    Copy <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="book_copy_id"
                                    render={({ field }) => (
                                        <Select
                                            value={field.value || ''}
                                            onValueChange={field.onChange}
                                            disabled={!selectedBookId || availableCopies.length === 0}
                                        >
                                            <SelectTrigger id="book_copy_id">
                                                <SelectValue placeholder="Select a copy" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableCopies.map((copy) => (
                                                    <SelectItem key={copy.id} value={copy.id}>
                                                        {copy.copy_code || copy.id}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.book_copy_id && (
                                    <p className="text-sm text-destructive mt-1">{errors.book_copy_id.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="borrower_type">Borrower Type</Label>
                                    <Controller
                                        control={control}
                                        name="borrower_type"
                                        render={({ field }) => (
                                            <Select
                                                value={field.value}
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    setValue('student_id', '');
                                                    setValue('staff_id', '');
                                                }}
                                            >
                                                <SelectTrigger id="borrower_type">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="student">Student</SelectItem>
                                                    <SelectItem value="staff">Staff</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="borrower">
                                        Borrower <span className="text-destructive">*</span>
                                    </Label>
                                    <Controller
                                        control={control}
                                        name={borrowerType === 'student' ? 'student_id' : 'staff_id'}
                                        render={({ field }) => (
                                            <Combobox
                                                options={borrowerType === 'student' ? studentOptions : staffOptions}
                                                value={field.value || ''}
                                                onValueChange={field.onChange}
                                                placeholder={`Select ${borrowerType === 'student' ? 'student' : 'staff'}...`}
                                                searchPlaceholder={`Search ${borrowerType === 'student' ? 'students' : 'staff'}...`}
                                                emptyText={`No ${borrowerType === 'student' ? 'students' : 'staff'} available.`}
                                                className="w-full"
                                            />
                                        )}
                                    />
                                    {errors.student_id && (
                                        <p className="text-sm text-destructive mt-1">{errors.student_id.message}</p>
                                    )}
                                    {errors.staff_id && (
                                        <p className="text-sm text-destructive mt-1">{errors.staff_id.message}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="loan_date">
                                        Loan Date <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="loan_date"
                                        type="date"
                                        {...register('loan_date')}
                                    />
                                    {errors.loan_date && (
                                        <p className="text-sm text-destructive mt-1">{errors.loan_date.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="due_date">Due Date</Label>
                                    <Input
                                        id="due_date"
                                        type="date"
                                        {...register('due_date')}
                                    />
                                    {errors.due_date && (
                                        <p className="text-sm text-destructive mt-1">{errors.due_date.message}</p>
                                    )}
                                </div>
                            </div>

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
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseLoanDialog}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createLoan.isPending}>
                                Assign Book
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Return Confirmation Dialog */}
            <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Return Book</DialogTitle>
                        <DialogDescription>
                            Confirm return of "{selectedLoan?.book?.title}"?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleConfirmReturn} disabled={returnLoan.isPending}>
                            {returnLoan.isPending ? 'Returning...' : 'Confirm Return'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

