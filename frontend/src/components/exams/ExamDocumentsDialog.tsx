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
  DialogDescription,
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
  useExamDocuments,
  useCreateExamDocument,
  useDeleteExamDocument,
  useDownloadExamDocument,
  ExamDocument,
} from '@/hooks/useExamDocuments';
import { useLanguage } from '@/hooks/useLanguage';
import { formatDate } from '@/lib/utils';

interface ExamDocumentsDialogProps {
  examId: string;
  examName: string;
  examClassId?: string;
  examStudentId?: string;
  isOpen: boolean;
  onClose: () => void;
}

// Document types will be translated in component using t() function
const DOCUMENT_TYPES = [
  { value: 'question_paper' },
  { value: 'answer_key' },
  { value: 'instruction' },
  { value: 'result' },
  { value: 'grade_sheet' },
  { value: 'other' },
];

export function ExamDocumentsDialog({
  examId,
  examName,
  examClassId,
  examStudentId,
  isOpen,
  onClose,
}: ExamDocumentsDialogProps) {
  const { t } = useLanguage();
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Upload form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [documentType, setDocumentType] = useState('question_paper');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: documents = [], isLoading } = useExamDocuments({
    examId,
    examClassId,
    examStudentId,
  });
  const createDocument = useCreateExamDocument();
  const deleteDocument = useDeleteExamDocument();
  const downloadDocument = useDownloadExamDocument();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDocumentType('question_paper');
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
      exam_id: examId,
      exam_class_id: examClassId || null,
      exam_student_id: examStudentId || null,
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
              {t('exams.documents.documents')} - {examName}
            </DialogTitle>
            <DialogDescription>
              {t('exams.documents.manageDocumentsDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {isUploadMode ? (
              /* Upload Form */
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium">{t('exams.documents.uploadNewDocument')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('exams.documents.titleLabel')}</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('exams.documents.titlePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('exams.documents.documentType')}</Label>
                    <Select value={documentType} onValueChange={setDocumentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {t(`exams.documents.${type.value}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('exams.documents.descriptionLabel')}</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('exams.documents.descriptionPlaceholder')}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t('exams.documents.fileLabel')}</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      {t('exams.documents.selected')} {selectedFile.name} ({formatFileSize(selectedFile.size)})
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
                    {t('exams.documents.cancel')}
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || !title || createDocument.isPending}
                  >
                    {createDocument.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('exams.documents.uploading')}
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('exams.documents.upload')}
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
                    {t('exams.documents.uploadDocument')}
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
                      <p>{t('exams.documents.noDocumentsYet')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('exams.documents.titleLabel').replace(' *', '')}</TableHead>
                          <TableHead>{t('exams.documents.type')}</TableHead>
                          <TableHead>{t('exams.documents.size')}</TableHead>
                          <TableHead>{t('exams.documents.uploaded')}</TableHead>
                          <TableHead className="text-right">{t('exams.documents.actions')}</TableHead>
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
                                {t(`exams.documents.${doc.document_type}`) || doc.document_type}
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
            <AlertDialogTitle>{t('exams.documents.deleteDocument')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exams.documents.deleteConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('exams.documents.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('exams.documents.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

