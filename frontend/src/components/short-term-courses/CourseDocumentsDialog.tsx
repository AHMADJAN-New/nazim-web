import {
  Upload,
  Download,
  Trash2,
  FileText,
  FileImage,
  File,
  Loader2,
} from 'lucide-react';
import React, { useState, useRef } from 'react';

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useCourseDocuments,
  useCreateCourseDocument,
  useDeleteCourseDocument,
  useDownloadCourseDocument,
  CourseDocument,
} from '@/hooks/useCourseDocuments';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate, formatDateTime } from '@/lib/utils';
interface CourseDocumentsDialogProps {
  courseId: string;
  courseName: string;
  courseStudentId?: string;
  courseStudentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

// Document types will be defined inside component to use translations

export function CourseDocumentsDialog({
  courseId,
  courseName,
  courseStudentId,
  courseStudentName,
  isOpen,
  onClose,
}: CourseDocumentsDialogProps) {
  const { t } = useLanguage();
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('material');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document types with translations
  const DOCUMENT_TYPES = [
    { value: 'syllabus', label: t('shortTermCourses.documentTypes.syllabus') },
    { value: 'material', label: t('shortTermCourses.documentTypes.material') },
    { value: 'assignment', label: t('shortTermCourses.documentTypes.assignment') },
    { value: 'certificate', label: t('shortTermCourses.documentTypes.certificate') },
    { value: 'attendance', label: t('shortTermCourses.documentTypes.attendance') },
    { value: 'grade', label: t('shortTermCourses.documentTypes.grade') },
    { value: 'other', label: t('shortTermCourses.documentTypes.other') },
  ];

  const { data: documents = [], isLoading } = useCourseDocuments({
    courseId,
    courseStudentId,
  });
  const createDocument = useCreateCourseDocument();
  const deleteDocument = useDeleteCourseDocument();
  const downloadDocument = useDownloadCourseDocument();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDocumentType('material');
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.split('.')[0]);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) return;

    await createDocument.mutateAsync({
      course_id: courseId,
      course_student_id: courseStudentId || null,
      document_type: documentType,
      title,
      description: description || null,
      file: selectedFile,
    });

    resetForm();
    setIsUploadMode(false);
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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {t('shortTermCourses.courseDocuments')} - {courseName}
              {courseStudentName && ` (${courseStudentName})`}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {isUploadMode ? (
              /* Upload Form */
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium">{t('shortTermCourses.uploadDocument')}</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('shortTermCourses.documentTitle')} *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('shortTermCourses.documentTitle')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('shortTermCourses.documentType')}</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('shortTermCourses.documentDescription')}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('common.optional')}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('common.upload')} *</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      {t('common.selected')} {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setIsUploadMode(false);
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || !title || createDocument.isPending}
                  >
                    {createDocument.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('common.uploading')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('common.upload')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Documents List */
              <>
                <div className="flex justify-end mb-4">
                  <Button onClick={() => setIsUploadMode(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('shortTermCourses.uploadDocument')}
                  </Button>
                </div>

                <div className="flex-1 overflow-auto border rounded-lg">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2" />
                      <p>{t('shortTermCourses.noDocuments')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('shortTermCourses.documentTitle')}</TableHead>
                          <TableHead>{t('shortTermCourses.documentType')}</TableHead>
                          <TableHead>{t('shortTermCourses.size')}</TableHead>
                          <TableHead>{t('shortTermCourses.uploaded')}</TableHead>
                          <TableHead className="text-right">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getFileIcon(doc.mime_type)}
                                <div>
                                  <p className="font-medium">{doc.title}</p>
                                  {doc.description && (
                                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                                      {doc.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type}
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
                                {/* Hide delete button for certificate documents */}
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
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shortTermCourses.deleteDocument')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('shortTermCourses.deleteDocumentConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
