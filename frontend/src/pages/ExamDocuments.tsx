import { useState, useMemo } from 'react';
import { formatDate } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
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
import {
  useExamDocuments,
  useDeleteExamDocument,
  useDownloadExamDocument,
  ExamDocument,
} from '@/hooks/useExamDocuments';
import { useExams } from '@/hooks/useExams';
import { ExamDocumentsDialog } from '@/components/exams/ExamDocumentsDialog';
import {
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  Plus,
  Search,
  Filter,
  BookOpen,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const DOCUMENT_TYPES = [
  { value: 'question_paper', label: 'Question Paper' },
  { value: 'answer_key', label: 'Answer Key' },
  { value: 'instruction', label: 'Instruction' },
  { value: 'result', label: 'Result' },
  { value: 'grade_sheet', label: 'Grade Sheet' },
  { value: 'other', label: 'Other' },
];

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return <File className="h-4 w-4" />;
  if (mimeType.startsWith('image/')) return <FileImage className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function ExamDocuments() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filters
  const [examId, setExamId] = useState<string>(searchParams.get('exam_id') || 'all');
  const [documentType, setDocumentType] = useState<string>(searchParams.get('document_type') || 'all');
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExamSelectDialogOpen, setIsExamSelectDialogOpen] = useState(false);
  const [examSearch, setExamSearch] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedExamName, setSelectedExamName] = useState<string>('');
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Data fetching
  const { data: exams = [], isLoading: examsLoading } = useExams();
  const { data: documents = [], isLoading: documentsLoading } = useExamDocuments({
    examId: examId && examId !== 'all' ? examId : undefined,
    documentType: documentType && documentType !== 'all' ? documentType : undefined,
  });
  const deleteDocument = useDeleteExamDocument();
  const downloadDocument = useDownloadExamDocument();

  // Filter documents by search term
  const filteredDocuments = useMemo(() => {
    if (!search) return documents;
    const searchLower = search.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchLower) ||
        doc.description?.toLowerCase().includes(searchLower) ||
        doc.file_name.toLowerCase().includes(searchLower)
    );
  }, [documents, search]);

  // Get exam name
  const getExamName = (id: string) => {
    return exams.find((e) => e.id === id)?.name || 'Unknown Exam';
  };

  const handleOpenDialog = (examId: string, examName: string) => {
    setSelectedExamId(examId);
    setSelectedExamName(examName);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedExamId(null);
    setSelectedExamName('');
  };

  const handleUploadClick = () => {
    if (exams.length === 0) return;
    setExamSearch(''); // Reset search when opening dialog
    setIsExamSelectDialogOpen(true);
  };

  const handleExamSelect = (examId: string) => {
    const exam = exams.find((e) => e.id === examId);
    if (exam) {
      setSelectedExamId(examId);
      setSelectedExamName(exam.name);
      setExamSearch(''); // Reset search when selecting
      setIsExamSelectDialogOpen(false);
      setIsDialogOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;
    await deleteDocument.mutateAsync(documentToDelete);
    setIsDeleteDialogOpen(false);
    setDocumentToDelete(null);
  };

  const handleDownload = async (id: string) => {
    await downloadDocument.mutateAsync(id);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const isLoading = examsLoading || documentsLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exam Documents</h1>
          <p className="text-muted-foreground mt-1">
            Manage exam-related documents
          </p>
        </div>
        <Button
          onClick={handleUploadClick}
          disabled={exams.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Exam</Label>
              <Select
                value={examId}
                onValueChange={(value) => {
                  setExamId(value);
                  handleFilterChange('exam_id', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={documentType}
                onValueChange={(value) => {
                  setDocumentType(value);
                  handleFilterChange('document_type', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    handleFilterChange('search', e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-sm">Upload documents to get started</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.mime_type)}
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            {doc.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {doc.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {doc.file_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => handleOpenDialog(doc.exam_id, getExamName(doc.exam_id))}
                        >
                          {getExamName(doc.exam_id)}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label || doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>
                        {formatDate(doc.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(doc.id)}
                            disabled={downloadDocument.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDocumentToDelete(doc.id);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Selection Dialog */}
      <Dialog open={isExamSelectDialogOpen} onOpenChange={setIsExamSelectDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Exam</DialogTitle>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exams by name, academic year, or type..."
              value={examSearch}
              onChange={(e) => setExamSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Exam List - Grouped by Academic Year */}
          <div className="flex-1 overflow-y-auto space-y-4">
            {(() => {
              // Filter exams by search term
              const filteredExams = exams.filter((exam) => {
                if (!examSearch) return true;
                const searchLower = examSearch.toLowerCase();
                return (
                  exam.name.toLowerCase().includes(searchLower) ||
                  exam.academicYear?.name?.toLowerCase().includes(searchLower) ||
                  exam.examType?.name?.toLowerCase().includes(searchLower) ||
                  exam.description?.toLowerCase().includes(searchLower)
                );
              });

              // Group exams by academic year
              const groupedExams = filteredExams.reduce((acc, exam) => {
                const yearKey = exam.academicYear?.name || 'Other';
                if (!acc[yearKey]) {
                  acc[yearKey] = [];
                }
                acc[yearKey].push(exam);
                return acc;
              }, {} as Record<string, typeof exams>);

              // Sort academic years (most recent first)
              const sortedYears = Object.keys(groupedExams).sort((a, b) => {
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                return b.localeCompare(a);
              });

              if (filteredExams.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No exams found</p>
                    <p className="text-sm">Try adjusting your search</p>
                  </div>
                );
              }

              return sortedYears.map((yearKey) => (
                <div key={yearKey} className="space-y-2">
                  <div className="flex items-center gap-2 px-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {yearKey}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {groupedExams[yearKey].length} {groupedExams[yearKey].length === 1 ? 'exam' : 'exams'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {groupedExams[yearKey]
                      .sort((a, b) => {
                        // Sort by start date (most recent first), then by name
                        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
                        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
                        if (bDate !== aDate) return bDate - aDate;
                        return a.name.localeCompare(b.name);
                      })
                      .map((exam) => (
                        <button
                          key={exam.id}
                          onClick={() => handleExamSelect(exam.id)}
                          className="group relative flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left w-full"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <BookOpen className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-sm group-hover:text-foreground transition-colors">
                                {exam.name}
                              </h4>
                              <Badge
                                variant={
                                  exam.status === 'completed'
                                    ? 'default'
                                    : exam.status === 'in_progress'
                                    ? 'default'
                                    : exam.status === 'scheduled'
                                    ? 'secondary'
                                    : 'outline'
                                }
                                className="flex-shrink-0 text-xs capitalize"
                              >
                                {exam.status.replace(/_/g, ' ')}
                              </Badge>
                            </div>
                            {exam.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {exam.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              {exam.academicYear && (
                                <span className="flex items-center gap-1">
                                  <span>{exam.academicYear.name}</span>
                                </span>
                              )}
                              {exam.examType && (
                                <span className="flex items-center gap-1">
                                  <span>•</span>
                                  <span>{exam.examType.name}</span>
                                </span>
                              )}
                              {exam.startDate && (
                                <span className="flex items-center gap-1">
                                  <span>•</span>
                                  <span>{formatDate(exam.startDate)}</span>
                                  {exam.endDate && exam.endDate !== exam.startDate && (
                                    <span> - {formatDate(exam.endDate)}</span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Exam Documents Dialog */}
      {selectedExamId && (
        <ExamDocumentsDialog
          examId={selectedExamId}
          examName={selectedExamName}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ExamDocuments;

