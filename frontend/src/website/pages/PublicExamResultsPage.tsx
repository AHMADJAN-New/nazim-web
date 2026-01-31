import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { publicWebsiteApi } from '@/lib/api/client';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Printer, AlertCircle, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PublicPageHeader } from '@/website/components/PublicPageHeader';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

export default function PublicExamResultsPage() {
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const { data: options, isLoading: isLoadingOptions } = useQuery({
        queryKey: ['public-exam-options'],
        queryFn: async () => {
            const response = await publicWebsiteApi.getPublicExamOptions();
            return (response as any).data || response;
        }
    });

    const searchMutation = useMutation({
        mutationFn: async (data: { exam_id: string; search_term: string, page: number }) => {
            const response = await publicWebsiteApi.searchPublicExamResults(data);
            return (response as any).data || {};
        },
        onSuccess: (data) => {
            // Check structure: data.data contains the array, data contains pagination
            setSearchResults(data.data || []);
            setTotalPages(data.last_page || 1);
            setHasSearched(true);
        },
        onError: () => {
            setHasSearched(true);
            setSearchResults([]);
            setTotalPages(1);
        }
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedExam || !searchTerm) return;
        setPage(1); // Reset page on new search
        searchMutation.mutate({ exam_id: selectedExam, search_term: searchTerm, page: 1 });
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        searchMutation.mutate({ exam_id: selectedExam, search_term: searchTerm, page: newPage });
    };

    const handlePrint = () => {
        window.print();
    };

    // Filter exams based on selected year
    const availableExams = options?.exams?.filter((e: any) => e.academic_year_id === selectedYear) || [];

    return (
        <div className="flex-1 bg-slate-50 min-h-screen pb-20 print:bg-white print:pb-0 overflow-x-hidden">
            {/* Header - Hidden in Print */}
            <div className="print:hidden">
                <PublicPageHeader
                    title="Check Exam Results"
                    description="Enter your details to view your examination results."
                />
            </div>

            <section className="container mx-auto px-4 -mt-8 relative z-20 print:mt-0 print:px-0">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Search Card - Hidden in Print */}
                    <Card className="shadow-lg border-0 print:hidden">
                        <CardHeader className="bg-white border-b px-8 py-6 rounded-t-xl">
                            <CardTitle className="flex items-center gap-2">
                                <Search className="h-5 w-5 text-emerald-600" />
                                Search Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8">
                            {isLoadingOptions ? (
                                <div className="flex justify-center p-4">
                                    <LoadingSpinner />
                                </div>
                            ) : (
                                <form onSubmit={handleSearch} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="academic_year">Academic Year</Label>
                                            <Select value={selectedYear} onValueChange={(val) => { setSelectedYear(val); setSelectedExam(''); }}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Year" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {options?.academic_years?.map((year: any) => (
                                                        <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="exam">Examination</Label>
                                            <Select value={selectedExam} onValueChange={setSelectedExam} disabled={!selectedYear}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Exam" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableExams.map((exam: any) => (
                                                        <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="search">Student ID or Name</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="search"
                                                placeholder="Enter Name, Student ID, or Admission No"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                            />
                                            <Button
                                                type="submit"
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
                                                disabled={searchMutation.isPending || !selectedExam || !searchTerm}
                                            >
                                                {searchMutation.isPending ? <LoadingSpinner size="sm" /> : 'Search'}
                                            </Button>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            Enter at least 3 characters. You can search by Name, Student Code, or Admission Number.
                                        </p>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    {/* Results Display */}
                    {hasSearched && (
                        <div className="space-y-6">
                            {searchResults.length > 0 ? (
                                <>
                                    {searchResults.map((result: any, index: number) => (
                                        <Card key={index} className="print:shadow-none print:border-none print:break-before-page">
                                            <CardHeader className="bg-slate-50 border-b flex flex-row items-start justify-between print:bg-white print:border-b-2 print:border-black">
                                                <div className="flex gap-4">
                                                    <div className="h-16 w-16 bg-white rounded-full border flex items-center justify-center overflow-hidden shrink-0 print:border-black">
                                                        {result.student.photo_path ? (
                                                            <img src={result.student.photo_path} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <User className="h-8 w-8 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-xl mb-1">{result.student.name}</CardTitle>
                                                        <CardDescription className="flex flex-col gap-1 text-slate-600 print:text-black">
                                                            <span>F/Name: {result.student.father_name}</span>
                                                            <span className="flex gap-4">
                                                                <span>ID: {result.student.student_code}</span>
                                                                {/* Only show exam name in print as header is hidden */}
                                                                <span className="hidden print:inline font-bold">
                                                                    {availableExams.find((e: any) => e.id === selectedExam)?.name}
                                                                </span>
                                                            </span>
                                                        </CardDescription>
                                                    </div>
                                                </div>
                                                <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
                                                    <Printer className="h-4 w-4 mr-2" />
                                                    Print
                                                </Button>
                                            </CardHeader>

                                            <CardContent className="p-0">
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-slate-50/50 print:bg-transparent">
                                                            <TableHead className="w-[50%]">Subject</TableHead>
                                                            <TableHead className="text-right">Max Marks</TableHead>
                                                            <TableHead className="text-right">Obtained</TableHead>
                                                            <TableHead className="text-center">Results</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {result.results.map((subject: any) => (
                                                            <TableRow key={subject.id}>
                                                                <TableCell className="font-medium">{subject.subject_name}</TableCell>
                                                                <TableCell className="text-right">{parseFloat(subject.max_marks)}</TableCell>
                                                                <TableCell className="text-right font-bold">
                                                                    {subject.is_absent ? 'Absent' : parseFloat(subject.marks_obtained)}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    {subject.is_absent ? (
                                                                        <Badge variant="outline" className="text-red-500 border-red-200">Absent</Badge>
                                                                    ) : (
                                                                        <span className={subject.marks_obtained >= subject.pass_marks ? 'text-emerald-600' : 'text-red-600'}>
                                                                            {subject.marks_obtained >= subject.pass_marks ? 'Pass' : 'Fail'}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                        {/* Total Row */}
                                                        <TableRow className="bg-slate-50 font-bold border-t-2 border-slate-200 print:bg-transparent print:border-black">
                                                            <TableCell>Total</TableCell>
                                                            <TableCell className="text-right">{parseFloat(result.summary.total_max)}</TableCell>
                                                            <TableCell className="text-right">{parseFloat(result.summary.total_obtained)}</TableCell>
                                                            <TableCell className="text-center">
                                                                <Badge className={result.summary.result_status === 'PASS' ? 'bg-emerald-600' : 'bg-red-600'}>
                                                                    {result.summary.result_status} ({result.summary.percentage}%)
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                    </Table>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="mt-12 flex justify-center dir-ltr print:hidden">
                                            <Pagination>
                                                <PaginationContent>
                                                    <PaginationItem>
                                                        <PaginationPrevious
                                                            onClick={() => handlePageChange(Math.max(1, page - 1))}
                                                            className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                        />
                                                    </PaginationItem>
                                                    <PaginationItem>
                                                        <PaginationLink isActive>{page}</PaginationLink>
                                                    </PaginationItem>
                                                    <PaginationItem>
                                                        <PaginationNext
                                                            onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                                                            className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                                        />
                                                    </PaginationItem>
                                                </PaginationContent>
                                            </Pagination>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-dashed">
                                    <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-slate-900">No results found</h3>
                                    <p className="text-slate-500">
                                        We couldn't find any results matching your search criteria for this exam.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
