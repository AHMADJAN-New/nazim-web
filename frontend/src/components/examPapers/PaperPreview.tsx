import { useState, useEffect, useRef } from 'react';
import { examPaperTemplatesApi } from '@/lib/api/client';
import { useUpdatePrintStatus } from '@/hooks/useExamPapers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download, RefreshCw, X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

interface PaperPreviewProps {
  templateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaperPreview({ templateId, open, onOpenChange }: PaperPreviewProps) {
  const { t } = useLanguage();
  const [variant, setVariant] = useState(1);
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [copiesCount, setCopiesCount] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const updatePrintStatus = useUpdatePrintStatus();

  const loadPreview = async () => {
    if (!templateId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await examPaperTemplatesApi.preview(templateId, variant);
      setHtml((response as { html: string; variant: number }).html);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load preview';
      setError(errorMessage);
      showToast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && templateId) {
      loadPreview();
    }
  }, [open, templateId, variant]);

  const handlePrint = () => {
    if (!html || !templateId) return;

    // Set status to printing
    updatePrintStatus.mutate({
      templateId,
      printStatus: 'printing',
    });

    // Set up print event listeners
    const handleBeforePrint = () => {
      // Status already set to printing
    };

    const handleAfterPrint = () => {
      // Show dialog to confirm copies printed
      setIsPrintDialogOpen(true);
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    // Print from the iframe in the same tab
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    } else {
      // Fallback: create a temporary print window
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
    }

    // Fallback: if afterprint doesn't fire (some browsers), show dialog after a delay
    setTimeout(() => {
      if (!isPrintDialogOpen) {
        setIsPrintDialogOpen(true);
        window.removeEventListener('beforeprint', handleBeforePrint);
        window.removeEventListener('afterprint', handleAfterPrint);
      }
    }, 1000);
  };

  const handleConfirmPrint = () => {
    if (!templateId) return;

    updatePrintStatus.mutate({
      templateId,
      printStatus: 'printed',
      copiesPrinted: copiesCount,
      increment: true, // Increment copies instead of replacing
    }, {
      onSuccess: () => {
        setIsPrintDialogOpen(false);
        setCopiesCount(1);
      },
    });
  };

  const handleCancelPrint = () => {
    if (!templateId) return;

    // Set status back to not_printed if cancelled
    updatePrintStatus.mutate({
      templateId,
      printStatus: 'not_printed',
    });
    setIsPrintDialogOpen(false);
    setCopiesCount(1);
  };

  const handleDownloadHtml = () => {
    if (!html) return;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-paper-variant-${variant}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Paper Preview</DialogTitle>
          <DialogDescription>
            Preview exam paper (Variant {variant === 1 ? 'A' : variant === 2 ? 'B' : 'C'})
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Label>Variant:</Label>
              <Select value={variant.toString()} onValueChange={(value) => setVariant(parseInt(value))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Variant A</SelectItem>
                  <SelectItem value="2">Variant B</SelectItem>
                  <SelectItem value="3">Variant C</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={loadPreview}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadHtml}
                disabled={!html || isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Download HTML
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={!html || isLoading}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Preview */}
          <Card className="flex-1 min-h-0 flex flex-col">
            <CardContent className="flex-1 p-0 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full py-12">
                  <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading preview...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full py-12">
                  <div className="text-center">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadPreview}
                      className="mt-4"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : html ? (
                <iframe
                  ref={iframeRef}
                  srcDoc={html}
                  className="w-full h-full min-h-[600px] border-0"
                  title="Paper Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full py-12">
                  <p className="text-sm text-muted-foreground">No preview available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Print Confirmation Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('examPapers.printConfirmation') || 'Print Confirmation'}</DialogTitle>
            <DialogDescription>
              {t('examPapers.printConfirmationDescription') || 'How many copies were printed?'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>{t('examPapers.copiesPrinted') || 'Copies Printed'}</Label>
              <Input
                type="number"
                min="1"
                value={copiesCount}
                onChange={(e) => setCopiesCount(parseInt(e.target.value) || 1)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelPrint}>
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button onClick={handleConfirmPrint} disabled={updatePrintStatus.isPending}>
              {updatePrintStatus.isPending 
                ? (t('common.saving') || 'Saving...') 
                : (t('common.confirm') || 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

