import { format } from 'date-fns';
import { Plus, BookOpen, ClipboardList, RefreshCw, Library as LibraryIcon, BookCheck, BarChart3 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useFinanceAccounts } from '@/hooks/useFinance';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useCreateLibraryBook,
  useCreateLibraryCopy,
  useCreateLibraryLoan,
  useDueSoonLoans,
  useLibraryBooks,
  useLibraryLoans,
  useReturnLibraryLoan,
} from '@/hooks/useLibrary';
import { useStudentAdmissions } from '@/hooks/useStudentAdmissions';
import { useStaff } from '@/hooks/useStaff';
import { useProfile } from '@/hooks/useProfiles';
import { formatDate, formatDateTime } from '@/lib/utils';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import type { LibraryBook } from '@/types/domain/library';

const defaultLoanDate = format(new Date(), 'yyyy-MM-dd');

const findAvailableCopy = (book: LibraryBook) => book.copies?.find((copy) => copy.status === 'available');

export default function Library() {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const { data: books = [], isLoading } = useLibraryBooks();
  const { data: openLoans = [] } = useLibraryLoans(true);
  const { data: dueSoon = [] } = useDueSoonLoans(7);
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
  const { data: staff = [] } = useStaff();
  const { data: financeAccounts } = useFinanceAccounts();
  const { data: currencies } = useCurrencies();

  const createBook = useCreateLibraryBook();
  const createCopy = useCreateLibraryCopy();
  const createLoan = useCreateLibraryLoan();
  const returnLoan = useReturnLibraryLoan();

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    volume: '',
    description: '',
    initial_copies: 1,
    default_loan_days: 30,
    deposit_amount: 0,
    currency_id: '',
    finance_account_id: '',
  });

  const [loanForm, setLoanForm] = useState({
    book_id: '',
    book_copy_id: '',
    borrower_type: 'student',
    student_id: '',
    staff_id: '',
    loan_date: defaultLoanDate,
    due_date: '',
    deposit_amount: 0,
  });

  const availableBooks = useMemo(
    () => (Array.isArray(books) ? books.filter((book: any) => (book.available_copies ?? 0) > 0) : []),
    [books]
  );

  const handleBookSubmit = (e: FormEvent) => {
    e.preventDefault();
    createBook.mutate(bookForm, {
      onSuccess: () => {
        setBookForm({
          title: '',
          author: '',
          isbn: '',
          category: '',
          volume: '',
          description: '',
          initial_copies: 1,
          default_loan_days: 30,
          deposit_amount: 0,
          currency_id: '',
          finance_account_id: '',
        });
      },
    });
  };

  const handleLoanSubmit = (e: FormEvent) => {
    e.preventDefault();
    createLoan.mutate(loanForm, {
      onSuccess: () => {
        setLoanForm({
          book_id: '',
          book_copy_id: '',
          borrower_type: 'student',
          student_id: '',
          staff_id: '',
          loan_date: defaultLoanDate,
          due_date: '',
          deposit_amount: 0,
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.library')}
        description={t('library.dashboardDescription')}
        icon={<BookOpen className="h-5 w-5" />}
      />

      <Tabs defaultValue="books" className="space-y-4">
        <TabsList>
          <TabsTrigger value="books" className="flex items-center gap-2">
            <LibraryIcon className="h-4 w-4" />
            {t('library.books')}
          </TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center gap-2">
            <BookCheck className="h-4 w-4" />
            {t('library.loans')}
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('library.overview')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('library.addBook')}</CardTitle>
                <CardDescription>{t('library.addNewBookInfo')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleBookSubmit}>
                  <div>
                    <Label htmlFor="title">{t('library.bookTitle')}</Label>
                    <Input
                      id="title"
                      value={bookForm.title}
                      required
                      onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{t('library.author')}</Label>
                      <Input value={bookForm.author} onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })} />
                    </div>
                    <div>
                      <Label>{t('library.isbn')}</Label>
                      <Input value={bookForm.isbn} onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{t('assets.category')}</Label>
                      <Input
                        value={bookForm.category}
                        onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>{t('library.volume')}</Label>
                      <Input value={bookForm.volume} onChange={(e) => setBookForm({ ...bookForm, volume: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>{t('library.initialCopies')}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={bookForm.initial_copies}
                        onChange={(e) => setBookForm({ ...bookForm, initial_copies: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>{t('library.defaultLoanDays')}</Label>
                      <Input
                        type="number"
                        min={1}
                        value={bookForm.default_loan_days}
                        onChange={(e) => setBookForm({ ...bookForm, default_loan_days: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>{t('library.depositAmount')}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={bookForm.deposit_amount}
                        onChange={(e) => setBookForm({ ...bookForm, deposit_amount: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>{t('finance.account') || 'Finance Account'}</Label>
                      <Select
                        value={bookForm.finance_account_id || ''}
                        onValueChange={(value) => {
                          setBookForm({ ...bookForm, finance_account_id: value || '' });
                          // Auto-select currency from account if account has currency
                          if (value && financeAccounts) {
                            const account = financeAccounts.find((acc) => acc.id === value);
                            if (account?.currencyId) {
                              setBookForm((prev) => ({ ...prev, currency_id: account.currencyId || '' }));
                            } else {
                              setBookForm((prev) => ({ ...prev, currency_id: '' }));
                            }
                          } else {
                            setBookForm((prev) => ({ ...prev, currency_id: '' }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('finance.selectAccount') || 'Select finance account (optional)'} />
                        </SelectTrigger>
                        <SelectContent>
                          {financeAccounts?.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} {account.code ? `(${account.code})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{t('finance.currency') || 'Currency'}</Label>
                      <Select
                        value={bookForm.currency_id || ''}
                        onValueChange={(value) => setBookForm({ ...bookForm, currency_id: value || '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('finance.selectCurrency') || 'Select currency (optional)'} />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies?.map((currency) => (
                            <SelectItem key={currency.id} value={currency.id}>
                              {currency.code} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={createBook.isPending}>
                    <Plus className="h-4 w-4 mr-2" /> {t('library.saveBook')}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('library.inventory')}</CardTitle>
                <Badge variant="secondary">{Array.isArray(books) ? books.length : 0} {t('library.books')}</Badge>
              </CardHeader>
              <CardContent className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('library.bookTitle')}</TableHead>
                      <TableHead>{t('assets.copies')}</TableHead>
                      <TableHead>{t('library.depositAmount')}</TableHead>
                      <TableHead>{t('library.addCopy')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={4}>{t('common.loading')}</TableCell>
                      </TableRow>
                    )}
                    {!isLoading && (!Array.isArray(books) || books.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4}>{t('library.noBooksMessage')}</TableCell>
                      </TableRow>
                    )}
                    {Array.isArray(books) && books.map((book: any) => (
                      <TableRow key={book.id}>
                        <TableCell>
                          <div className="font-semibold">{book.title}</div>
                          <div className="text-xs text-muted-foreground">{book.author}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{t('library.availableCopies')} {book.available_copies ?? 0}</Badge>{' '}
                          <Badge variant="secondary">{t('library.totalCopies')} {book.total_copies ?? 0}</Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const price = book.price ?? book.deposit_amount ?? 0;
                            const numPrice = typeof price === 'string' ? parseFloat(price) : (typeof price === 'number' ? price : 0);
                            return isNaN(numPrice) ? '0.00' : formatDateTime(numPrice);
                          })()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => createCopy.mutate({ book_id: book.id })}
                            disabled={createCopy.isPending}
                          >
                            <Plus className="h-4 w-4 mr-1" /> {t('library.copy')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('library.assignBook')}</CardTitle>
                  <CardDescription>{t('library.assignBookDescription')}</CardDescription>
                </div>
                <Badge>{availableBooks.length} available</Badge>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={handleLoanSubmit}>
                  <div>
                    <Label>Book</Label>
                    <select
                      className="w-full border rounded-md h-10 px-2"
                      value={loanForm.book_id}
                      onChange={(e) => {
                        const bookId = e.target.value;
                        const book = Array.isArray(books) ? books.find((b: any) => b.id === bookId) : null;
                        setLoanForm({
                          ...loanForm,
                          book_id: bookId,
                          book_copy_id: findAvailableCopy(book as any)?.id || '',
                        });
                      }}
                    >
                      <option value="">Select book</option>
                      {Array.isArray(availableBooks) && availableBooks.map((book: any) => (
                        <option key={book.id} value={book.id}>
                          {book.title} ({book.available_copies ?? 0} available)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Copy</Label>
                    <select
                      className="w-full border rounded-md h-10 px-2"
                      value={loanForm.book_copy_id}
                      onChange={(e) => setLoanForm({ ...loanForm, book_copy_id: e.target.value })}
                    >
                      <option value="">Select copy</option>
                      {(Array.isArray(books) ? books.find((b: any) => b.id === loanForm.book_id)?.copies || [] : [])
                        .filter((copy: any) => copy.status === 'available')
                        .map((copy: any) => (
                          <option key={copy.id} value={copy.id}>
                            {copy.copy_code || copy.id}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Borrower Type</Label>
                      <select
                        className="w-full border rounded-md h-10 px-2"
                        value={loanForm.borrower_type}
                        onChange={(e) => setLoanForm({ ...loanForm, borrower_type: e.target.value })}
                      >
                        <option value="student">Student</option>
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                    <div>
                      <Label>Borrower</Label>
                      <select
                        className="w-full border rounded-md h-10 px-2"
                        value={loanForm.borrower_type === 'student' ? loanForm.student_id : loanForm.staff_id}
                        onChange={(e) =>
                          setLoanForm(
                            loanForm.borrower_type === 'student'
                              ? { ...loanForm, student_id: e.target.value, staff_id: '' }
                              : { ...loanForm, staff_id: e.target.value, student_id: '' }
                          )
                        }
                      >
                        <option value="">Select borrower</option>
                        {loanForm.borrower_type === 'student'
                          ? (Array.isArray(students) ? students : []).map((student: any) => (
                            <option key={student.id} value={student.id}>
                              {student.fullName}
                            </option>
                          ))
                          : (Array.isArray(staff) ? staff : []).map((member: any) => (
                            <option key={member.id} value={member.id}>
                              {member.fullName || member.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Loan Date</Label>
                      <CalendarDatePicker date={loanForm.loan_date ? parseLocalDate(loanForm.loan_date) : undefined} onDateChange={(date) => setLoanForm((prev) => ({ ...prev, loan_date: date ? dateToLocalYYYYMMDD(date) : "" }))} />
                    </div>
                    <div>
                      <Label>Due Date</Label>
                      <CalendarDatePicker date={loanForm.due_date ? parseLocalDate(loanForm.due_date) : undefined} onDateChange={(date) => setLoanForm((prev) => ({ ...prev, due_date: date ? dateToLocalYYYYMMDD(date) : "" }))} />
                    </div>
                  </div>
                  <div>
                    <Label>Deposit Amount</Label>
                    <Input
                      type="number"
                      min={0}
                      value={loanForm.deposit_amount}
                      onChange={(e) => setLoanForm({ ...loanForm, deposit_amount: Number(e.target.value) })}
                    />
                  </div>
                  <Button type="submit" disabled={createLoan.isPending} className="w-full">
                    <ClipboardList className="h-4 w-4 mr-2" /> Assign Book
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('library.activeLoans')}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-1" /> {t('events.refresh')}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {(!Array.isArray(openLoans) || openLoans.length === 0) && <p className="text-sm text-muted-foreground">{t('library.noActiveLoans')}</p>}
                {Array.isArray(openLoans) && openLoans.map((loan: any) => (
                  <div key={loan.id} className="border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{loan.book?.title}</div>
                        <div className="text-xs text-muted-foreground">{t('library.dueDate')}: {loan.due_date || 'N/A'}</div>
                      </div>
                      <Badge variant="secondary">{t('library.copy')} {loan.copy?.copy_code || loan.copy?.id}</Badge>
                    </div>
                    <div className="text-xs mt-2">{t('library.depositAmount')}: {loan.deposit_amount}</div>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={() => returnLoan.mutate({ id: loan.id })}
                      variant="outline"
                    >
                      {t('library.returnLoan')}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('library.totalBooks')}</CardTitle>
                <CardDescription>{t('library.totalCopiesLabel2')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Array.isArray(books) ? books.length : 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('library.activeLoans')}</CardTitle>
                <CardDescription>{t('library.onLoanLabel')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Array.isArray(openLoans) ? openLoans.length : 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('library.dueSoonCount')}</CardTitle>
                <CardDescription>{t('library.dueInNext7Days')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Array.isArray(dueSoon) ? dueSoon.length : 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('library.dueSoonBooks')}</CardTitle>
              <CardDescription>{t('library.dueInNext7Days')}</CardDescription>
            </CardHeader>
            <CardContent>
              {!Array.isArray(dueSoon) || dueSoon.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{t('library.noBooksDueSoon')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dueSoon.map((loan: any) => (
                    <div key={loan.id} className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors">
                      <div className="font-semibold">{loan.book?.title}</div>
                      <div className="text-sm text-muted-foreground">{t('library.dueDate')}: {loan.due_date}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{t('library.copy')} {loan.copy?.copy_code || loan.copy?.id}</Badge>
                        {loan.book?.author && (
                          <span className="text-xs text-muted-foreground">{t('library.author')}: {loan.book.author}</span>
                        )}
                      </div>
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
