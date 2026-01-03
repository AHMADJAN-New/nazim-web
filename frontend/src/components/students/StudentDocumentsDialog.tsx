import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Upload, Trash2, Download, Eye, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'sonner';

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useStudentDocuments,
  useUploadStudentDocument,
  useDeleteStudentDocument,
  StudentDocument,
  Student,
} from '@/hooks/useStudents';
import { apiClient } from '@/lib/api/client';
import { formatDate, formatDateTime } from '@/lib/utils';
import { documentUploadSchema, type DocumentUploadFormData } from '@/lib/validations';



interface StudentDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function StudentDocumentsDialog({
  open,
  onOpenChange,
  student,
}: StudentDocumentsDialogProps) {
  const { t } = useLanguage();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerDocument, setViewerDocument] = useState<StudentDocument | null>(null);
  const [isLoadingViewer, setIsLoadingViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<StudentDocument | null>(null);

  const { data: documents, isLoading } = useStudentDocuments(student?.id);
  const uploadDocument = useUploadStudentDocument();
  const deleteDocument = useDeleteStudentDocument();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    watch,
  } = useForm<DocumentUploadFormData>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      documentType: '',
      description: '',
    },
  });

  const documentFile = watch('file');

  const handleUpload = async (data: DocumentUploadFormData) => {
    if (!student || !data.file) return;

    await uploadDocument.mutateAsync({
      studentId: student.id,
      organizationId: student.organization_id,
      schoolId: student.school_id,
      file: data.file,
      documentType: data.documentType,
      description: data.description || null,
    });

    setIsUploadDialogOpen(false);
    reset();
  };

  const handleDelete = async () => {
    if (!selectedDocument || !student) return;

    await deleteDocument.mutateAsync({
      documentId: selectedDocument.id,
      studentId: student.id,
    });

    setIsDeleteDialogOpen(false);
    setSelectedDocument(null);
  };

  const handleDownload = async (doc: StudentDocument) => {
    try {
      // Fetch the file with authentication headers using apiClient's token
      const token = apiClient.getToken();
      const response = await fetch(`/api/student-documents/${doc.id}/download`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': '*/*',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error(t('common.unauthorized') || 'Unauthorized. Please log in again.');
          return;
        }
        throw new Error(`Failed to download: ${response.statusText}`);
      }

      // Get the blob and create a download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error(t('students.downloadDocumentError') || 'Failed to download document');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (mimeType: string | null, fileName: string): boolean => {
    if (!mimeType && !fileName) return false;
    const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    
    if (mimeType && imageMimes.includes(mimeType.toLowerCase())) return true;
    if (fileName) {
      const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
      return imageExtensions.includes(ext);
    }
    return false;
  };

  const isPdfFile = (mimeType: string | null, fileName: string): boolean => {
    if (!mimeType && !fileName) return false;
    if (mimeType && mimeType.toLowerCase() === 'application/pdf') return true;
    if (fileName && fileName.toLowerCase().endsWith('.pdf')) return true;
    return false;
  };

  const handleView = async (doc: StudentDocument) => {
    setIsLoadingViewer(true);
    setViewerDocument(doc);
    
    try {
      // Fetch the file with authentication headers and create a blob URL for viewing
      const token = apiClient.getToken();
      const response = await fetch(`/api/student-documents/${doc.id}/download`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Accept': '*/*',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error(t('common.unauthorized') || 'Unauthorized. Please log in again.');
          setIsViewerOpen(false);
          return;
        }
        throw new Error(`Failed to load document: ${response.statusText}`);
      }

      // Create blob URL for viewing
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      setViewerUrl(blobUrl);
      setIsViewerOpen(true);
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error(t('students.viewDocumentError') || 'Failed to load document');
      setIsViewerOpen(false);
    } finally {
      setIsLoadingViewer(false);
    }
  };

  if (!student) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('students.studentDocuments') || 'Student Documents'}
            </DialogTitle>
            <DialogDescription>
              {t('students.documentsDescription') || 'Manage documents for'} {student.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('students.uploadDocument') || 'Upload Document'}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : documents && documents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('students.documentType') || 'Type'}</TableHead>
                    <TableHead>{t('students.fileName') || 'File Name'}</TableHead>
                    <TableHead>{t('students.fileSize') || 'Size'}</TableHead>
                    <TableHead>{t('students.uploadDate') || 'Upload Date'}</TableHead>
                    <TableHead className="text-right">{t('common.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const canView = isImageFile(doc.mime_type, doc.file_name) || isPdfFile(doc.mime_type, doc.file_name);
                    return (
                      <TableRow 
                        key={doc.id}
                        className={canView ? 'cursor-pointer hover:bg-muted/50' : ''}
                        onClick={canView ? () => handleView(doc) : undefined}
                      >
                        <TableCell>
                          <Badge variant="outline">{doc.document_type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={doc.file_name}>
                          {doc.file_name}
                        </TableCell>
                        <TableCell>{formatFileSize(doc.file_size)}</TableCell>
                        <TableCell>
                          {formatDate(doc.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            {canView && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleView(doc)}
                                title={t('common.view') || 'View'}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownload(doc)}
                              title={t('common.download') || 'Download'}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setIsDeleteDialogOpen(true);
                              }}
                              title={t('common.delete') || 'Delete'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('students.noDocuments') || 'No documents uploaded yet'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Document Dialog */}
      <Dialog 
        open={isUploadDialogOpen} 
        onOpenChange={(open) => {
          setIsUploadDialogOpen(open);
          if (!open) {
            reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Upload className="h-5 w-5 inline mr-2" />
              {t('students.uploadDocument') || 'Upload Document'}
            </DialogTitle>
            <DialogDescription>
              {t('students.uploadDocumentDescription') || 'Upload a document for this student'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleUpload)} className="space-y-4">
            <div>
              <Label htmlFor="file">{t('students.selectFile') || 'Select File'} *</Label>
              <Controller
                control={control}
                name="file"
                render={({ field: { onChange, value, ...field } }) => (
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                    {...field}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      onChange(file);
                    }}
                  />
                )}
              />
              {errors.file && (
                <p className="text-sm text-destructive mt-1">{errors.file.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="documentType">{t('students.documentType') || 'Document Type'} *</Label>
              <Input
                id="documentType"
                {...register('documentType')}
                placeholder={t('students.documentTypePlaceholder') || 'e.g., Birth Certificate, Tazkira'}
              />
              {errors.documentType && (
                <p className="text-sm text-destructive mt-1">{errors.documentType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="description">{t('students.description') || 'Description'}</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder={t('students.descriptionPlaceholder') || 'Optional description'}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setIsUploadDialogOpen(false)}
              >
                {t('common.cancel') || 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={uploadDocument.isPending}
              >
                {uploadDocument.isPending
                  ? t('common.uploading') || 'Uploading...'
                  : t('common.upload') || 'Upload'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('students.deleteDocument') || 'Delete Document'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('students.deleteDocumentConfirm') || 'Are you sure you want to delete this document? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete') || 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Viewer Dialog */}
      <Dialog open={isViewerOpen} onOpenChange={(open) => {
        setIsViewerOpen(open);
        // Clean up blob URL when closing viewer
        if (!open && viewerUrl && viewerUrl.startsWith('blob:')) {
          window.URL.revokeObjectURL(viewerUrl);
          setViewerUrl(null);
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw] p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {viewerDocument?.file_name || t('students.viewDocument') || 'View Document'}
                </DialogTitle>
                <DialogDescription>
                  {viewerDocument?.document_type 
                    ? `${t('students.documentType') || 'Document Type'}: ${viewerDocument.document_type}`
                    : t('students.viewDocumentDescription') || 'View document details and content'}
                </DialogDescription>
                {viewerDocument?.document_type && (
                  <div className="mt-1">
                    <Badge variant="outline">
                      {viewerDocument.document_type}
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsViewerOpen(false)}
                className="absolute right-4 top-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-auto max-h-[calc(95vh-120px)]">
            {isLoadingViewer ? (
              <div className="flex justify-center items-center min-h-[400px]">
                <LoadingSpinner />
              </div>
            ) : viewerUrl && viewerDocument ? (
              <>
                {isImageFile(viewerDocument.mime_type, viewerDocument.file_name) ? (
                  <div className="flex justify-center items-center bg-muted/30 rounded-lg p-4">
                    <img
                      src={viewerUrl}
                      alt={viewerDocument.file_name}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                      onError={() => {
                        toast.error(t('students.imageLoadError') || 'Failed to load image');
                        setIsViewerOpen(false);
                      }}
                    />
                  </div>
                ) : isPdfFile(viewerDocument.mime_type, viewerDocument.file_name) ? (
                  <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
                    <iframe
                      src={viewerUrl}
                      className="w-full h-full"
                      title={viewerDocument.file_name}
                      onError={() => {
                        toast.error(t('students.pdfLoadError') || 'Failed to load PDF');
                        setIsViewerOpen(false);
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('students.unsupportedFileType') || 'This file type cannot be previewed. Please download to view.'}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t('students.noDocumentToView') || 'No document to view'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default StudentDocumentsDialog;

