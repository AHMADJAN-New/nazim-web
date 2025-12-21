import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Eye } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePreviewIdCard, useExportIndividualIdCard, useStudentIdCard } from '@/hooks/useStudentIdCards';
import { useIdCardTemplate } from '@/hooks/useIdCardTemplates';
import { showToast } from '@/lib/toast';
import type { StudentIdCard } from '@/types/domain/studentIdCard';
import type { IdCardTemplate } from '@/types/domain/idCardTemplate';

interface StudentIdCardPreviewProps {
  card: StudentIdCard | null;
  template?: IdCardTemplate | null;
  side?: 'front' | 'back';
  showControls?: boolean;
  className?: string;
}

/**
 * StudentIdCardPreview component - Displays ID card preview using backend-rendered images
 * Shows the actual rendered card image from the backend API
 */
export function StudentIdCardPreview({
  card,
  template: providedTemplate,
  side: initialSide = 'front',
  showControls = true,
  className = '',
}: StudentIdCardPreviewProps) {
  const { t } = useLanguage();
  const [side, setSide] = useState<'front' | 'back'>(initialSide);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Fetch full card data if only ID is provided
  const cardId = card?.id;
  const { data: fullCard, isLoading: cardLoading } = useStudentIdCard(cardId || null);
  const actualCard = fullCard || card;
  
  // Fetch template if not provided
  const templateId = providedTemplate?.id || actualCard?.idCardTemplateId;
  const { data: fetchedTemplate, isLoading: templateLoading } = useIdCardTemplate(templateId || null);
  const actualTemplate = providedTemplate || fetchedTemplate;
  
  const previewCard = usePreviewIdCard();
  const exportCard = useExportIndividualIdCard();

  // Load preview image when card or side changes (auto-load on mount)
  useEffect(() => {
    if (!actualCard?.id || cardLoading) {
      setPreviewImageUrl(null);
      return;
    }

    // Always try to load backend preview (it handles missing layout config)
    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const previewBlob = await previewCard.mutateAsync({
          id: actualCard.id,
          side,
        });
        // The preview API returns a Blob
        if (previewBlob instanceof Blob) {
          // Revoke previous URL if exists
          if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewImageUrl);
          }
          const url = URL.createObjectURL(previewBlob);
          setPreviewImageUrl(url);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[StudentIdCardPreview] Error loading preview:', error);
        }
        // Don't show error toast on auto-load, only on manual preview
        // User can click Preview button to retry
        setPreviewImageUrl(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
    
    // Cleanup: revoke object URL when component unmounts
    return () => {
      if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualCard?.id, side, cardLoading]);

  // Check if we have the necessary data
  const hasStudentData = actualCard && actualCard.student;

  // Use the fetched template if available
  const templateForPreview = actualTemplate || (actualCard?.template ? {
    id: actualCard.template.id,
    name: actualCard.template.name,
    description: actualCard.template.description || null,
    layout_config_front: actualTemplate?.layoutConfigFront || null,
    layout_config_back: actualTemplate?.layoutConfigBack || null,
    background_image_path_front: actualTemplate?.backgroundImagePathFront || null,
    background_image_path_back: actualTemplate?.backgroundImagePathBack || null,
    card_size: actualTemplate?.cardSize || 'CR80',
    isActive: actualCard.template.isActive ?? true,
  } : null);

  const handleDownload = async () => {
    if (!actualCard?.id) return;

    try {
      const blob = await exportCard.mutateAsync({
        id: actualCard.id,
        format: 'png',
      });
      
      // Create download link
      const url = blob instanceof Blob ? URL.createObjectURL(blob) : blob;
      const link = document.createElement('a');
      link.href = url;
      link.download = `id-card-${actualCard.student?.admissionNumber || actualCard.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (blob instanceof Blob) {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const handlePreview = async () => {
    if (!actualCard?.id) return;
    
    setIsLoadingPreview(true);
    try {
      // Revoke previous URL if exists
      if (previewImageUrl && previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
      
      const previewBlob = await previewCard.mutateAsync({
        id: actualCard.id,
        side,
      });
      
      if (previewBlob instanceof Blob) {
        const url = URL.createObjectURL(previewBlob);
        setPreviewImageUrl(url);
      }
    } catch (error) {
      showToast.error(t('toast.idCardPreviewFailed') || 'Failed to load preview');
      setPreviewImageUrl(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  if (cardLoading || templateLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!actualCard || !hasStudentData) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground py-8">
            {t('idCards.selectStudentAndTemplate') || 'Please select a student and template to preview'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6 space-y-4">
        {showControls && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <Button
                variant={side === 'front' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSide('front')}
                disabled={isLoadingPreview}
              >
                {t('idCards.front') || 'Front'}
              </Button>
              {templateForPreview && (
                <Button
                  variant={side === 'back' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSide('back')}
                  disabled={isLoadingPreview}
                >
                  {t('idCards.back') || 'Back'}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={isLoadingPreview || previewCard.isPending}
              >
                {isLoadingPreview || previewCard.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-2" />
                )}
                {t('common.preview') || 'Preview'}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={exportCard.isPending || !actualCard.id}
              >
                {exportCard.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {t('common.download') || 'Download'}
              </Button>
            </div>
          </div>
        )}

        {/* Show preview image if available, otherwise show fallback */}
        {previewImageUrl ? (
          <div className="border rounded-lg overflow-hidden bg-white flex items-center justify-center p-4">
            <img
              src={previewImageUrl}
              alt={`ID Card ${side} side`}
              className="w-full h-auto max-w-md shadow-sm"
              style={{ maxHeight: '600px', objectFit: 'contain' }}
            />
          </div>
        ) : isLoadingPreview ? (
          <div className="flex items-center justify-center py-12 border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              {t('common.loading') || 'Loading preview...'}
            </span>
          </div>
        ) : (
          <div className="border rounded-lg bg-muted/50 p-8 text-center">
            <p className="text-muted-foreground mb-2">
              {t('idCards.noPreviewAvailable') || 'Preview not available'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t('idCards.clickPreviewToGenerate') || 'Click Preview button to generate card image'}
            </p>
            {!templateForPreview && (
              <p className="text-xs text-muted-foreground">
                {t('idCards.templateNotLoaded') || 'Template not loaded'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

