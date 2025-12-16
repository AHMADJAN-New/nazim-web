import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examPaperTemplatesApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Download, RefreshCw, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';

export default function PaperPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [variant, setVariant] = useState(1);
  const [html, setHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await examPaperTemplatesApi.preview(id, variant);
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
    if (id) {
      loadPreview();
    }
  }, [id, variant]);

  const handlePrint = () => {
    if (!html) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadHtml = () => {
    if (!html) return;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-paper-variant-${variant === 1 ? 'A' : variant === 2 ? 'B' : 'C'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!id) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Template ID is required</p>
            <Button onClick={() => navigate('/exams/paper-templates')} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/exams/paper-templates')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Paper Preview</h1>
            <p className="text-sm text-muted-foreground">
              Preview exam paper (Variant {variant === 1 ? 'A' : variant === 2 ? 'B' : 'C'})
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="flex-1">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-[600px]">
              <div className="text-center">
                <p className="text-sm text-destructive mb-4">{error}</p>
                <Button variant="outline" onClick={loadPreview}>
                  Retry
                </Button>
              </div>
            </div>
          ) : html ? (
            <iframe
              srcDoc={html}
              className="w-full h-[800px] border-0"
              title="Paper Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-[600px]">
              <p className="text-sm text-muted-foreground">No preview available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

