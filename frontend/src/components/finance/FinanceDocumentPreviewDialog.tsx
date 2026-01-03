import { Download, X, FileText, FileImage, File } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LoadingSpinner } from '@/components/ui/loading';
import { Separator } from '@/components/ui/separator';
import type { FinanceDocument } from '@/hooks/useFinanceDocuments';
import { useDownloadFinanceDocument } from '@/hooks/useFinanceDocuments';
import { useLanguage } from '@/hooks/useLanguage';
import { apiClient } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { formatDate } from '@/lib/utils';

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface FinanceDocumentPreviewDialogProps {
  document: FinanceDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getDocumentTypeLabel: (type: string) => string;
  getDocumentTypeBadgeColor: (type: string) => string;
  formatAmount: (amount: string | null) => string;
}

const isImageFile = (mimeType: string | null, fileName: string): boolean => {
  if (!mimeType && !fileName) return false;
  const imageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  
  if (mimeType && imageMimeTypes.includes(mimeType.toLowerCase())) return true;
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

export function FinanceDocumentPreviewDialog({
  document,
  open,
  onOpenChange,
  getDocumentTypeLabel,
  getDocumentTypeBadgeColor,
  formatAmount,
}: FinanceDocumentPreviewDialogProps) {
  const { t } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const downloadDocument = useDownloadFinanceDocument();

  useEffect(() => {
    if (open && document) {
      setIsLoadingPreview(true);
      
      // Fetch the file with authentication headers and create a blob URL for viewing
      const loadPreview = async () => {
        try {
          const token = apiClient.getToken();
          const response = await fetch(`/api/finance-documents/${document.id}/download`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Accept': '*/*',
            },
            credentials: 'include',
          });

          if (!response.ok) {
            if (response.status === 401) {
              showToast.error(t('common.unauthorized') || 'Unauthorized. Please log in again.');
              onOpenChange(false);
              return;
            }
            throw new Error(`Failed to load document: ${response.statusText}`);
          }

          // Create blob URL for viewing
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          setPreviewUrl(blobUrl);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error viewing document:', error);
          }
          showToast.error(t('finance.previewLoadError') || 'Failed to load document preview');
        } finally {
          setIsLoadingPreview(false);
        }
      };

      void loadPreview();
    } else {
      // Clean up blob URL when dialog closes
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }

    return () => {
      // Cleanup on unmount
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [open, document, onOpenChange, t]);

  const handleDownload = async () => {
    if (document) {
      await downloadDocument.mutateAsync(document.id);
    }
  };

  if (!document) return null;

  const canPreview = isImageFile(document.mime_type, document.file_name) || 
                     isPdfFile(document.mime_type, document.file_name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold truncate">
                {document.title}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {t('finance.documentDetails') || 'Document Details'}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloadDocument.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('common.download')}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Details Panel */}
          <div className="w-80 border-r overflow-y-auto p-6 space-y-4 bg-muted/30">
            <div className="space-y-4">
              {/* Document Type */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('finance.documentType')}
                </label>
                <div className="mt-1">
                  <Badge className={getDocumentTypeBadgeColor(document.document_type)}>
                    {getDocumentTypeLabel(document.document_type)}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('finance.documentTitle')}
                </label>
                <p className="mt-1 text-sm font-medium">{document.title}</p>
              </div>

              {/* Description */}
              {document.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('finance.documentDescription')}
                  </label>
                  <p className="mt-1 text-sm">{document.description}</p>
                </div>
              )}

              <Separator />

              {/* Reference Number */}
              {document.reference_number && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('finance.referenceNumber')}
                  </label>
                  <p className="mt-1 text-sm font-mono">{document.reference_number}</p>
                </div>
              )}

              {/* Amount */}
              {document.amount && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('finance.amount')}
                  </label>
                  <p className="mt-1 text-sm font-semibold">{formatAmount(document.amount)}</p>
                </div>
              )}

              {/* Document Date */}
              {document.document_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('finance.documentDate')}
                  </label>
                  <p className="mt-1 text-sm">{formatDate(new Date(document.document_date))}</p>
                </div>
              )}

              <Separator />

              {/* File Information */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('finance.fileName')}
                </label>
                <p className="mt-1 text-sm break-words">{document.file_name}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('finance.fileSize')}
                </label>
                <p className="mt-1 text-sm">
                  {formatFileSize(document.file_size)}
                </p>
              </div>

              {document.mime_type && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('common.type')}
                  </label>
                  <p className="mt-1 text-sm">{document.mime_type}</p>
                </div>
              )}

              <Separator />

              {/* Uploaded At */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t('finance.uploadedAt')}
                </label>
                <p className="mt-1 text-sm">{formatDate(new Date(document.created_at))}</p>
              </div>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 overflow-hidden flex flex-col bg-background">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            ) : previewUrl && canPreview ? (
              <>
                {isImageFile(document.mime_type, document.file_name) ? (
                  <div className="flex-1 overflow-auto p-6 bg-muted/30">
                    <div className="flex justify-center items-center min-h-full">
                      <img
                        src={previewUrl}
                        alt={document.file_name}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                        onError={() => {
                          if (import.meta.env.DEV) {
                            console.error('Failed to load image preview');
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : isPdfFile(document.mime_type, document.file_name) ? (
                  <div className="flex-1 overflow-hidden p-6 bg-muted/30">
                    <div className="w-full h-full border rounded-lg overflow-hidden bg-white shadow-lg">
                      <iframe
                        src={previewUrl}
                        className="w-full h-full border-0"
                        title={document.file_name}
                        onError={() => {
                          if (import.meta.env.DEV) {
                            console.error('Failed to load PDF preview');
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                  {canPreview ? (
                    <>
                      <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t('finance.previewNotAvailable') || 'Preview not available'}
                      </p>
                    </>
                  ) : (
                    <>
                      <File className="h-16 w-16 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t('finance.previewNotSupported') || 'Preview is not supported for this file type. Please download to view.'}
                      </p>
                      <Button variant="outline" onClick={handleDownload}>
                        <Download className="h-4 w-4 mr-2" />
                        {t('common.download')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

