import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import {
  useStudentDocuments,
  useUploadStudentDocument,
  useDeleteStudentDocument,
  StudentDocument,
  Student,
} from '@/hooks/useStudents';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Upload, Trash2, Download, Eye, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { LoadingSpinner } from '@/components/ui/loading';
import { toast } from 'sonner';

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
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');

  const { data: documents, isLoading } = useStudentDocuments(student?.id);
  const uploadDocument = useUploadStudentDocument();
  const deleteDocument = useDeleteStudentDocument();

  const handleUpload = async () => {
    if (!documentFile || !documentType || !student) return;

    await uploadDocument.mutateAsync({
      studentId: student.id,
      organizationId: student.organization_id,
      schoolId: student.school_id,
      file: documentFile,
      documentType,
      description: documentDescription || null,
    });

    setIsUploadDialogOpen(false);
    setDocumentFile(null);
    setDocumentType('');
    setDocumentDescription('');
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
    const { data, error } = await supabase.storage
      .from('student-files')
      .createSignedUrl(doc.file_path, 60);

    if (error) {
      console.error('Failed to get download URL:', error);
      return;
    }

    window.open(data.signedUrl, '_blank');
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
      const { data, error } = await supabase.storage
        .from('student-files')
        .createSignedUrl(doc.file_path, 3600); // 1 hour expiry

      if (error) {
        console.error('Failed to get view URL:', error);
        toast.error(t('students.viewDocumentError') || 'Failed to load document');
        setIsLoadingViewer(false);
        return;
      }

      setViewerUrl(data.signedUrl);
      setIsViewerOpen(true);
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error(t('students.viewDocumentError') || 'Failed to load document');
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
                          {format(new Date(doc.created_at), 'yyyy-MM-dd')}
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
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
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
          <div className="space-y-4">
            <div>
              <Label htmlFor="document">{t('students.selectFile') || 'Select File'} *</Label>
              <Input
                id="document"
                type="file"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <Label htmlFor="documentType">{t('students.documentType') || 'Document Type'} *</Label>
              <Input
                id="documentType"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                placeholder={t('students.documentTypePlaceholder') || 'e.g., Birth Certificate, Tazkira'}
              />
            </div>
            <div>
              <Label htmlFor="documentDescription">{t('students.description') || 'Description'}</Label>
              <Textarea
                id="documentDescription"
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                placeholder={t('students.descriptionPlaceholder') || 'Optional description'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!documentFile || !documentType || uploadDocument.isPending}
            >
              {uploadDocument.isPending
                ? t('common.uploading') || 'Uploading...'
                : t('common.upload') || 'Upload'}
            </Button>
          </DialogFooter>
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
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw] p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {viewerDocument?.file_name || t('students.viewDocument') || 'View Document'}
                </DialogTitle>
                {viewerDocument?.document_type && (
                  <DialogDescription>
                    <Badge variant="outline" className="mt-1">
                      {viewerDocument.document_type}
                    </Badge>
                  </DialogDescription>
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

