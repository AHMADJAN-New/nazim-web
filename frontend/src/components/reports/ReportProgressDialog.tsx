// src/components/reports/ReportProgressDialog.tsx
// Dialog component for showing report generation progress

import { CheckCircle2, XCircle, Loader2, Download, FolderOpen, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/useLanguage';
import type { ReportStatus } from '@/lib/reporting/serverReportTypes';

interface ReportProgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: ReportStatus | null;
  progress: number;
  fileName?: string | null;
  error?: string | null;
  onDownload?: () => void;
  onClose?: () => void;
}

export function ReportProgressDialog({
  open,
  onOpenChange,
  status,
  progress,
  fileName,
  error,
  onDownload,
  onClose,
}: ReportProgressDialogProps) {
  const { t } = useLanguage();

  const isProcessing = status === 'pending' || status === 'processing';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  const handleClose = () => {
    onOpenChange(false);
    onClose?.();
  };

  const getStatusIcon = () => {
    if (isProcessing) {
      return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
    }
    if (isCompleted) {
      return <CheckCircle2 className="h-12 w-12 text-green-500" />;
    }
    if (isFailed) {
      return <XCircle className="h-12 w-12 text-destructive" />;
    }
    return null;
  };

  const getStatusTitle = () => {
    if (isProcessing) {
      return t('reports.generating') || 'راپور جوړیږي...';
    }
    if (isCompleted) {
      return t('reports.generated') || 'راپور بریالی شو';
    }
    if (isFailed) {
      return t('reports.failed') || 'راپور ناکام شو';
    }
    return '';
  };

  const getStatusDescription = () => {
    if (isProcessing) {
      return t('reports.pleaseWait') || 'مهرباني وکړئ انتظار وکړئ...';
    }
    if (isCompleted && fileName) {
      return fileName;
    }
    if (isFailed && error) {
      return error;
    }
    return '';
  };

  const statusDescription = getStatusDescription() || t('reports.generatingReport') || 'Report generation in progress';

  // Ensure description always has content to satisfy accessibility requirements
  const descriptionId = 'report-progress-description';
  const descriptionText = statusDescription || ' '; // Use space if empty to ensure element exists

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={descriptionId}>
        <DialogHeader>
          <DialogTitle className="text-center">
            {t('reports.reportGeneration') || 'د راپور جوړول'}
          </DialogTitle>
          <DialogDescription id={descriptionId}>
            {descriptionText}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Status Icon */}
          {getStatusIcon()}

          {/* Status Text */}
          <div className="text-center">
            <h3 className="text-lg font-semibold">{getStatusTitle()}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {getStatusDescription()}
            </p>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                {progress}%
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          {isCompleted && (
            <>
              <Button
                onClick={onDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t('common.download') || 'ډاونلوډ'}
              </Button>
            </>
          )}

          {(isCompleted || isFailed) && (
            <Button
              variant="outline"
              onClick={handleClose}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              {t('common.close') || 'بند کول'}
            </Button>
          )}

          {isProcessing && (
            <Button
              variant="outline"
              onClick={handleClose}
              disabled
              className="gap-2"
            >
              {t('common.cancel') || 'لغوه'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Simpler hook-based approach for using the dialog
export function useReportProgressDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [status, setStatus] = React.useState<ReportStatus | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

  const open = React.useCallback(() => {
    setIsOpen(true);
    setStatus('pending');
    setProgress(0);
    setFileName(null);
    setError(null);
    setDownloadUrl(null);
  }, []);

  const close = React.useCallback(() => {
    setIsOpen(false);
    setStatus(null);
    setProgress(0);
    setFileName(null);
    setError(null);
    setDownloadUrl(null);
  }, []);

  const updateProgress = React.useCallback((newProgress: number) => {
    setStatus('processing');
    setProgress(newProgress);
  }, []);

  const complete = React.useCallback((url: string, name: string) => {
    setStatus('completed');
    setProgress(100);
    setDownloadUrl(url);
    setFileName(name);
  }, []);

  const fail = React.useCallback((errorMessage: string) => {
    setStatus('failed');
    setError(errorMessage);
  }, []);

  const handleDownload = React.useCallback(() => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'report';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [downloadUrl, fileName]);

  const dialogProps = {
    open: isOpen,
    onOpenChange: setIsOpen,
    status,
    progress,
    fileName,
    error,
    onDownload: handleDownload,
    onClose: close,
  };

  return {
    isOpen,
    open,
    close,
    updateProgress,
    complete,
    fail,
    dialogProps,
    Dialog: ReportProgressDialog,
  };
}
