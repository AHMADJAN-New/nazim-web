import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  useCourseDocuments,
  useDeleteCourseDocument,
  useDownloadCourseDocument,
  CourseDocument,
} from '@/hooks/useCourseDocuments';
import { useShortTermCourses } from '@/hooks/useShortTermCourses';
import { CourseDocumentsDialog } from '@/components/short-term-courses/CourseDocumentsDialog';
import {
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  RefreshCw,
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
  { value: 'syllabus', label: 'Syllabus' },
  { value: 'material', label: 'Course Material' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'attendance', label: 'Attendance Record' },
  { value: 'grade', label: 'Grade Report' },
  { value: 'receipt', label: 'Receipt' },
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

export function CourseDocuments() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Filters
  const [courseId, setCourseId] = useState<string>(searchParams.get('course_id') || 'all');
  const [documentType, setDocumentType] = useState<string>(searchParams.get('document_type') || 'all');
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCourseSelectDialogOpen, setIsCourseSelectDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourseName, setSelectedCourseName] = useState<string>('');
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Data fetching
  const { data: courses = [], isLoading: coursesLoading } = useShortTermCourses();
  const { data: documents = [], isLoading: documentsLoading } = useCourseDocuments({
    courseId: courseId && courseId !== 'all' ? courseId : undefined,
    documentType: documentType && documentType !== 'all' ? documentType : undefined,
  });
  const deleteDocument = useDeleteCourseDocument();
  const downloadDocument = useDownloadCourseDocument();

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

  // Get course name
  const getCourseName = (id: string) => {
    return courses.find((c) => c.id === id)?.name || t('courses.unknownCourse');
  };

  const handleOpenDialog = (courseId: string, courseName: string) => {
    setSelectedCourseId(courseId);
    setSelectedCourseName(courseName);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedCourseId(null);
    setSelectedCourseName('');
  };

  const handleUploadClick = () => {
    if (courses.length === 0) return;
    // Always show course selection dialog so user can choose which course
    setIsCourseSelectDialogOpen(true);
  };

  const handleCourseSelect = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (course) {
      setSelectedCourseId(courseId);
      setSelectedCourseName(course.name);
      setIsCourseSelectDialogOpen(false);
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

  const isLoading = coursesLoading || documentsLoading;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('courses.courseDocuments')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('courses.manageDocuments')}
          </p>
        </div>
        <Button
          onClick={handleUploadClick}
          disabled={courses.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('courses.uploadDocument')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('common.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('courses.courseName')}</Label>
              <Select
                value={courseId}
                onValueChange={(value) => {
                  setCourseId(value);
                  handleFilterChange('course_id', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('courses.allCourses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('courses.allCourses')}</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('courses.documentType')}</Label>
              <Select
                value={documentType}
                onValueChange={(value) => {
                  setDocumentType(value);
                  handleFilterChange('document_type', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('courses.allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('courses.allTypes')}</SelectItem>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(`courses.documentTypes.${type.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('common.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('courses.searchDocuments')}
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
          <CardTitle>{t('courses.documents')} ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('courses.noDocuments')}</p>
              <p className="text-sm">{t('courses.uploadDocumentsToGetStarted')}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('courses.document')}</TableHead>
                    <TableHead>{t('courses.courseName')}</TableHead>
                    <TableHead>{t('courses.documentType')}</TableHead>
                    <TableHead>{t('courses.size')}</TableHead>
                    <TableHead>{t('courses.uploaded')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
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
                          onClick={() => handleOpenDialog(doc.course_id, getCourseName(doc.course_id))}
                        >
                          {getCourseName(doc.course_id)}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {t(`courses.documentTypes.${doc.document_type}`) || doc.document_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell>
                        {format(new Date(doc.created_at), 'MMM d, yyyy')}
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
                          {doc.document_type !== 'certificate' && (
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
                          )}
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

      {/* Course Selection Dialog */}
      <Dialog open={isCourseSelectDialogOpen} onOpenChange={setIsCourseSelectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('courses.selectCourse')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {courses.map((course) => (
              <Button
                key={course.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleCourseSelect(course.id)}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                {course.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Documents Dialog */}
      {selectedCourseId && (
        <CourseDocumentsDialog
          courseId={selectedCourseId}
          courseName={selectedCourseName}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('courses.deleteDocument')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('courses.deleteDocumentConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default CourseDocuments;

