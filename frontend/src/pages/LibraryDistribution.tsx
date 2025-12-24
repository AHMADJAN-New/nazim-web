import { useState, useMemo, useEffect } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import { Plus, Search, BookCheck, RefreshCw, Calendar, User, X, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { useLibraryLoans, useCreateLibraryLoan, useReturnLibraryLoan } from '@/hooks/useLibrary';
import { useLibraryBooks } from '@/hooks/useLibrary';
import { useLibraryCategories } from '@/hooks/useLibraryCategories';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useStaff } from '@/hooks/useStaff';
import { useProfile } from '@/hooks/useProfiles';
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
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { LoadingSpinner } from '@/components/ui/loading';
import { toast } from 'sonner';
import { CalendarFormField } from '@/components/ui/calendar-form-field';

const defaultLoanDate = format(new Date(), 'yyyy-MM-dd');

const loanSchema = z.object({
    book_id: z.string().uuid('Book is required'),
    borrower_type: z.enum(['student', 'staff']),
    student_id: z.string().optional().nullable(),
    staff_id: z.string().optional().nullable(),
    loan_date: z.string().min(1, 'Loan date is required'),
    due_date: z.string().optional().nullable(),
    deposit_amount: z.number().min(0).default(0),
}).refine(
    (data) => {
        if (data.borrower_type === 'student') {
            const studentId = data.student_id;
            return !!studentId && studentId !== '' && z.string().uuid().safeParse(studentId).success;
        } else {
            const staffId = data.staff_id;
            return !!staffId && staffId !== '' && z.string().uuid().safeParse(staffId).success;
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
    const [copiesToIssue, setCopiesToIssue] = useState<number>(1);

    const { data: profile } = useProfile();
    const { data: openLoans, isLoading: loansLoading } = useLibraryLoans(true);
    const { data: books } = useLibraryBooks();
    const { data: categories } = useLibraryCategories();
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
    const createLoan = useCreateLibraryLoan();
    const returnLoan = useReturnLibraryLoan();

    const formMethods = useForm<LoanFormData>({
        resolver: zodResolver(loanSchema),
        defaultValues: {
            borrower_type: 'student',
            loan_date: defaultLoanDate,
            deposit_amount: 0,
        },
    });

    const {
        register,
        handleSubmit,
        reset,
        control,
        watch,
        setValue,
        formState: { errors },
    } = formMethods;
    
    // Watch book_id to update deposit amount when book changes
    const watchedBookId = watch('book_id');

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
        if (!selectedBook) return [];
        
        if (!Array.isArray(selectedBook.copies)) {
            return [];
        }
        
        return selectedBook.copies.filter((copy) => {
            // Filter for available copies and ensure they have valid UUIDs
            const isAvailable = copy.status === 'available' || copy.status === 'Available';
            const hasValidId = copy.id && typeof copy.id === 'string' && copy.id.trim() !== '';
            
            // Validate UUID format
            if (hasValidId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                return isAvailable && uuidRegex.test(copy.id);
            }
            
            return false;
        });
    }, [selectedBook]);
    
    // Update deposit amount when book or copies change
    useEffect(() => {
        if (selectedBook && selectedBook.price !== undefined && selectedBook.price !== null) {
            const price = typeof selectedBook.price === 'string' 
                ? parseFloat(selectedBook.price) 
                : (typeof selectedBook.price === 'number' ? selectedBook.price : 0);
            const totalAmount = price * copiesToIssue;
            setValue('deposit_amount', isNaN(totalAmount) ? 0 : totalAmount);
        }
    }, [selectedBook, copiesToIssue, setValue]);

    const filteredLoans = useMemo(() => {
        if (!Array.isArray(openLoans)) return [];
        let filtered = openLoans;

        // Remove duplicates based on loan ID
        const seenIds = new Set<string>();
        filtered = filtered.filter((loan) => {
            if (!loan.id) return false; // Skip loans without IDs
            if (seenIds.has(loan.id)) return false; // Skip duplicates
            seenIds.add(loan.id);
            return true;
        });

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
            borrower_type: 'student',
            student_id: null,
            staff_id: null,
            loan_date: defaultLoanDate,
            due_date: null,
            deposit_amount: 0,
        });
        setCopiesToIssue(1);
        setIsLoanDialogOpen(true);
    };

    const handleCloseLoanDialog = () => {
        setIsLoanDialogOpen(false);
        reset({
            book_id: '',
            borrower_type: 'student',
            student_id: null,
            staff_id: null,
            loan_date: defaultLoanDate,
            due_date: null,
            deposit_amount: 0,
        });
        setCopiesToIssue(1);
    };

    const onSubmitLoan = async (data: LoanFormData) => {
        if (!selectedBook || availableCopies.length === 0) {
            toast.error('No available copies for this book');
            return;
        }
        
        if (copiesToIssue > availableCopies.length) {
            toast.error(`Only ${availableCopies.length} copies available. Cannot issue ${copiesToIssue} copies.`);
            return;
        }
        
        // Validate that all copies have valid UUIDs
        const copiesToLoan = availableCopies.slice(0, copiesToIssue);
        
        // Validate each copy has a valid UUID
        for (const copy of copiesToLoan) {
            if (!copy.id) {
                toast.error(`Copy ${copy.copy_code || 'unknown'} is missing an ID. Please refresh the page.`);
                if (import.meta.env.DEV) {
                    console.error('Copy without ID:', copy);
                }
                return;
            }
            
            // Validate UUID format (basic check)
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(copy.id)) {
                toast.error(`Copy ${copy.copy_code || copy.id} has an invalid ID format. Please refresh the page.`);
                if (import.meta.env.DEV) {
                    console.error('Copy with invalid UUID:', copy);
                }
                return;
            }
        }
        
        // Set borrower based on type, converting empty strings to null
        let studentId: string | null = null;
        let staffId: string | null = null;
        
        if (data.borrower_type === 'student') {
            studentId = data.student_id && data.student_id !== '' ? data.student_id : null;
        } else {
            staffId = data.staff_id && data.staff_id !== '' ? data.staff_id : null;
        }
        
        // Validate borrower is set
        if (!studentId && !staffId) {
            toast.error('Please select a borrower');
            return;
        }
        
        // Create loans for each copy sequentially to avoid race conditions
        try {
            const results = [];
            for (const copy of copiesToLoan) {
                if (!copy.id) {
                    toast.error(`Copy ${copy.copy_code || 'unknown'} has no ID`);
                    continue;
                }
                
                const loanPayload = {
                    book_id: data.book_id,
                    book_copy_id: copy.id,
                    student_id: studentId,
                    staff_id: staffId,
                    loan_date: data.loan_date,
                    due_date: data.due_date || null,
                    deposit_amount: data.deposit_amount || 0,
                };
                
                const result = await createLoan.mutateAsync(loanPayload);
                results.push(result);
            }
            
            if (results.length === copiesToIssue) {
                // Show custom success message for multiple copies
                if (copiesToIssue > 1) {
                    toast.success(`Successfully issued ${copiesToIssue} copies`);
                }
                handleCloseLoanDialog();
            } else {
                toast.warning(`Issued ${results.length} of ${copiesToIssue} copies. Some may have failed.`);
            }
        } catch (error: any) {
            // Error toast is already shown by the hook
            if (import.meta.env.DEV) {
                console.error('Failed to issue copies:', error);
            }
        }
    };

    const handleReturn = (loan: LibraryLoan) => {
        setSelectedLoan(loan);
        setIsReturnDialogOpen(true);
    };

    const handleConfirmReturn = () => {
        if (selectedLoan) {
            // Validate loan ID is a valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!selectedLoan.id || typeof selectedLoan.id !== 'string' || !uuidRegex.test(selectedLoan.id)) {
                toast.error('Invalid loan ID. Please refresh the page and try again.');
                if (import.meta.env.DEV) {
                    console.error('Invalid loan ID:', selectedLoan.id);
                }
                return;
            }
            
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
            // Reset copies counter to 1 when book changes, or 0 if no copies available
            const availableCount = Array.isArray(book.copies) 
                ? book.copies.filter((copy) => {
                    const isAvailable = copy.status === 'available' || copy.status === 'Available';
                    const hasValidId = copy.id && typeof copy.id === 'string' && copy.id.trim() !== '';
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    return isAvailable && hasValidId && uuidRegex.test(copy.id);
                }).length 
                : 0;
            setCopiesToIssue(availableCount > 0 ? 1 : 0);
        }
    };
    
    const handleCopiesChange = (delta: number) => {
        if (!selectedBook) return;
        const availableCount = availableCopies.length;
        // If no copies available, set to 0, otherwise ensure it's between 1 and availableCount
        if (availableCount === 0) {
            setCopiesToIssue(0);
        } else {
            const newCount = Math.max(1, Math.min(availableCount, copiesToIssue + delta));
            setCopiesToIssue(newCount);
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
                                        filteredLoans.map((loan, index) => {
                                            const borrower = loan.student_id
                                                ? (Array.isArray(students) ? students.find((s) => s.id === loan.student_id) : null)
                                                : (Array.isArray(staff) ? staff.find((s) => s.id === loan.staff_id) : null);
                                            const borrowerName = borrower
                                                ? (borrower.fullName || (borrower as any).name || 'Unknown')
                                                : 'Unknown';
                                            const isOverdue = loan.due_date && new Date(loan.due_date) < new Date();

                                            // Ensure unique key - use loan.id if valid UUID, otherwise use combination of fields with index
                                            let uniqueKey: string;
                                            if (loan.id && typeof loan.id === 'string' && loan.id.trim() !== '' && loan.id !== '0') {
                                                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                                if (uuidRegex.test(loan.id)) {
                                                    uniqueKey = loan.id;
                                                } else {
                                                    uniqueKey = `loan-${loan.book_id || 'unknown'}-${loan.book_copy_id || 'unknown'}-${loan.loan_date || 'unknown'}-${index}`;
                                                }
                                            } else {
                                                uniqueKey = `loan-${loan.book_id || 'unknown'}-${loan.book_copy_id || 'unknown'}-${loan.loan_date || 'unknown'}-${index}`;
                                            }

                                            return (
                                                <TableRow key={uniqueKey}>
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
                                                        {loan.loan_date ? formatDate(loan.loan_date) : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {loan.due_date ? (
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                                <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                                                    {formatDate(loan.due_date)}
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
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
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
                                    </div>
                                    {selectedBook && availableCopies.length > 0 && (
                                        <div className="flex items-center gap-2 border rounded-md px-3 py-2 min-w-[140px]">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleCopiesChange(-1)}
                                                disabled={copiesToIssue <= 1 || !selectedBookId || availableCopies.length === 0}
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="text-sm font-medium min-w-[2rem] text-center">
                                                {copiesToIssue}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleCopiesChange(1)}
                                                disabled={copiesToIssue >= availableCopies.length || !selectedBookId || availableCopies.length === 0}
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {selectedBook && (
                                    <div className="mt-2 text-sm text-muted-foreground">
                                        {availableCopies.length > 0 ? (
                                            <span>
                                                {availableCopies.length} available copy{availableCopies.length !== 1 ? 'ies' : ''} 
                                                {selectedBook.total_copies !== undefined && selectedBook.total_copies > 0 && (
                                                    <span> of {selectedBook.total_copies} total</span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-destructive">
                                                No available copies. Total copies: {selectedBook.total_copies ?? 0}
                                            </span>
                                        )}
                                    </div>
                                )}
                                {errors.book_id && (
                                    <p className="text-sm text-destructive mt-1">{errors.book_id.message}</p>
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
                                                    setValue('student_id', null);
                                                    setValue('staff_id', null);
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
                                                onValueChange={(value) => {
                                                    // Convert empty string to null
                                                    field.onChange(value === '' ? null : value);
                                                }}
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
                                    <CalendarFormField control={control} name="loan_date" label="Loan Date" />
                                    {errors.loan_date && (
                                        <p className="text-sm text-destructive mt-1">{errors.loan_date.message}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="due_date">Due Date</Label>
                                    <CalendarFormField control={control} name="due_date" label="Due Date" />
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

