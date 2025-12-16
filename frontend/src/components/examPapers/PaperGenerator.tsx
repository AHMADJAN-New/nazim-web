import { useState } from 'react';
import { examPaperTemplatesApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

interface PaperGeneratorProps {
  templateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaperGenerator({ templateId, open, onOpenChange }: PaperGeneratorProps) {
  const { t } = useLanguage();
  const [selectedVariants, setSelectedVariants] = useState<number[]>([1]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdfs, setGeneratedPdfs] = useState<Array<{ variant: number; path: string; url: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const handleVariantToggle = (variant: number) => {
    setSelectedVariants((prev) => {
      if (prev.includes(variant)) {
        return prev.filter((v) => v !== variant);
      }
      return [...prev, variant].sort();
    });
  };

  const handleGenerate = async () => {
    if (selectedVariants.length === 0) {
      showToast.error('Please select at least one variant');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPdfs([]);

    try {
      const response = await examPaperTemplatesApi.generate(templateId, {
        variants: selectedVariants,
        page_layout: 'A4_portrait',
      });

      if (import.meta.env.DEV) {
        console.log('[PaperGenerator] Generate response:', response);
      }

      const pdfs = (response as { pdfs?: Array<{ variant: number; path?: string; download_url?: string; url?: string; error?: string }> }).pdfs;
      
      if (!pdfs || !Array.isArray(pdfs)) {
        throw new Error('Invalid response format from server');
      }

      const successfulPdfs = pdfs.filter((pdf) => !pdf.error && pdf.path);
      const failedPdfs = pdfs.filter((pdf) => pdf.error);

      if (successfulPdfs.length > 0) {
        setGeneratedPdfs(successfulPdfs.map(pdf => ({
          variant: pdf.variant,
          path: pdf.path!,
          url: pdf.download_url || pdf.url || '',
        })));
        showToast.success(`Successfully generated ${successfulPdfs.length} PDF(s)`);
      } else {
        // All variants failed
        if (failedPdfs.length > 0) {
          const errorMessages = failedPdfs.map((pdf) => `Variant ${pdf.variant === 1 ? 'A' : pdf.variant === 2 ? 'B' : 'C'}: ${pdf.error}`).join(', ');
          setError(`All variants failed: ${errorMessages}`);
          showToast.error(`Failed to generate all ${failedPdfs.length} variant(s)`);
        } else {
          setError('No PDFs were generated. Please check server logs for details.');
          showToast.error('Failed to generate PDFs');
        }
      }

      if (failedPdfs.length > 0 && successfulPdfs.length > 0) {
        // Some succeeded, some failed
        const errorMessages = failedPdfs.map((pdf) => `Variant ${pdf.variant === 1 ? 'A' : pdf.variant === 2 ? 'B' : 'C'}: ${pdf.error}`).join(', ');
        setError(`Some variants failed: ${errorMessages}`);
        showToast.warning(`${failedPdfs.length} variant(s) failed to generate`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate PDFs';
      setError(errorMessage);
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[PaperGenerator] Generate error:', err);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string, variant: number) => {
    const variantLabel = variant === 1 ? 'A' : variant === 2 ? 'B' : 'C';
    
    try {
      // Use the API client to download the PDF
      const token = localStorage.getItem('api_token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      // Use the URL as-is if it's already a full URL, otherwise construct it
      let fullUrl = url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // If URL already starts with /api, use it as-is (relative to current origin)
        if (url.startsWith('/api/')) {
          fullUrl = url;
        } else {
          // Otherwise, prepend API URL
          const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api');
          fullUrl = `${apiUrl}${url.startsWith('/') ? '' : '/'}${url}`;
        }
      }
      
      if (import.meta.env.DEV) {
        console.log('[PaperGenerator] Downloading PDF from:', fullUrl);
      }
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to download PDF';
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If JSON parsing fails, fall through to text parsing
          }
        }
        
        if (errorMessage === 'Failed to download PDF') {
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch {
            // If text parsing also fails, use default message
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      
      // Verify it's actually a PDF
      if (blob.size === 0) {
        throw new Error('Received empty PDF file');
      }
      
      if (!blob.type.includes('pdf') && blob.size > 0) {
        // If content-type is not PDF, check if it's actually JSON error
        const text = await blob.text();
        try {
          const jsonError = JSON.parse(text);
          throw new Error(jsonError.error || jsonError.message || 'Invalid PDF file received');
        } catch {
          throw new Error('Invalid PDF file received');
        }
      }
      
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `exam-paper-variant-${variantLabel}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      showToast.success(`PDF variant ${variantLabel} downloaded successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to download PDF';
      showToast.error(errorMessage);
      if (import.meta.env.DEV) {
        console.error('[PaperGenerator] Download error:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate PDF</DialogTitle>
          <DialogDescription>
            Generate PDF files for selected variants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Variant Selection */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Variants</Label>
                <div className="space-y-2">
                  {[1, 2, 3].map((variant) => (
                    <div key={variant} className="flex items-center space-x-2">
                      <Checkbox
                        id={`variant-${variant}`}
                        checked={selectedVariants.includes(variant)}
                        onCheckedChange={() => handleVariantToggle(variant)}
                      />
                      <Label
                        htmlFor={`variant-${variant}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Variant {variant === 1 ? 'A' : variant === 2 ? 'B' : 'C'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Generated PDFs */}
          {generatedPdfs.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Generated PDFs</Label>
                  <div className="space-y-2">
                    {generatedPdfs.map((pdf) => (
                      <div
                        key={pdf.variant}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileDown className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Variant {pdf.variant === 1 ? 'A' : pdf.variant === 2 ? 'B' : 'C'}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(pdf.url, pdf.variant)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || selectedVariants.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate PDFs'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

