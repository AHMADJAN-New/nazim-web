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
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ExamDocumentsDialog } from '@/components/exams/ExamDocumentsDialog';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useExamDocuments,
  useDeleteExamDocument,
  useDownloadExamDocument,
  ExamDocument,
} from '@/hooks/useExamDocuments';
import { useExams } from '@/hooks/useExams';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';

// Document types will be translated in component using t() function
const DOCUMENT_TYPES = [
  { value: 'question_paper' },
  { value: 'answer_key' },
  { value: 'instruction' },
  { value: 'result' },
  { value: 'grade_sheet' },
  { value: 'other' },
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
    return exams.find((e) => e.id === id)?.name || t('exams.documents.unknownExam');
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
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 hidden md:inline-flex" />
            {t('exams.documents.title')}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 hidden md:block">
            {t('exams.documents.description')}
          </p>
        </div>
        <Button
          onClick={handleUploadClick}
          disabled={exams.length === 0}
          className="flex-shrink-0 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t('exams.documents.uploadDocument')}</span>
          <span className="sm:hidden">{t('exams.documents.upload')}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 hidden md:inline-flex" />
            {t('exams.documents.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('exams.documents.exam')}</Label>
              <Select
                value={examId}
                onValueChange={(value) => {
                  setExamId(value);
                  handleFilterChange('exam_id', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.documents.allExams')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('exams.documents.allExams')}</SelectItem>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('exams.documents.documentType')}</Label>
              <Select
                value={documentType}
                onValueChange={(value) => {
                  setDocumentType(value);
                  handleFilterChange('document_type', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('exams.documents.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('exams.documents.allTypes')}</SelectItem>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(`exams.documents.${type.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('exams.documents.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('exams.documents.searchPlaceholder')}
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
          <CardTitle>{t('exams.documents.documents')} ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('exams.documents.noDocumentsFound')}</p>
              <p className="text-sm">{t('exams.documents.uploadDocumentsToGetStarted')}</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('exams.documents.document')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('exams.documents.exam')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('exams.documents.type')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('exams.documents.size')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('exams.documents.uploaded')}</TableHead>
                      <TableHead className="text-right">{t('exams.documents.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.mime_type)}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{doc.title}</p>
                            {doc.description && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs hidden sm:block">
                                {doc.description}
                              </p>
                            )}
                            <div className="flex flex-col sm:hidden gap-1 mt-1">
                              <p className="text-xs text-muted-foreground truncate">
                                {doc.file_name}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {t(`exams.documents.${doc.document_type}`) || doc.document_type}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{formatDate(doc.created_at)}</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 hidden sm:block">
                              {doc.file_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => handleOpenDialog(doc.exam_id, getExamName(doc.exam_id))}
                        >
                          {getExamName(doc.exam_id)}
                        </Button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">
                          {t(`exams.documents.${doc.document_type}`) || doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {formatDate(doc.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(doc.id)}
                            disabled={downloadDocument.isPending}
                            className="flex-shrink-0"
                            aria-label="Download document"
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
                            className="flex-shrink-0"
                            aria-label="Delete document"
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Selection Dialog */}
      <Dialog open={isExamSelectDialogOpen} onOpenChange={setIsExamSelectDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('exams.documents.selectExam')}</DialogTitle>
          </DialogHeader>
          
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('exams.documents.searchExamsPlaceholder')}
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
                    <p className="text-lg font-medium">{t('exams.documents.noExamsFound')}</p>
                    <p className="text-sm">{t('exams.documents.tryAdjustingSearch')}</p>
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
                      {groupedExams[yearKey].length} {groupedExams[yearKey].length === 1 ? t('exams.examSelected') : t('exams.examsSelected')}
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
            <AlertDialogTitle>{t('exams.documents.deleteDocument')}</AlertDialogTitle>
            <AlertDialogDescription className="hidden md:block">
              {t('exams.documents.deleteConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">{t('exams.documents.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="w-full sm:w-auto">{t('exams.documents.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ExamDocuments;

