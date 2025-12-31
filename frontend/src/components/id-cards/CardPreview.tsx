import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RotateCcw, RotateCw, Download, Printer } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { showToast } from '@/lib/toast';
import type { Student } from '@/types/domain/student';

// QR Code generation - using external API
async function generateQRCode(data: string, size: number = 200): Promise<string> {
  try {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
    const response = await fetch(qrUrl);
    if (!response.ok) throw new Error('Failed to generate QR code');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[CardPreview] QR code generation failed:', error);
    }
    throw error;
  }
}

// Convert image URL to base64
async function convertImageToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[CardPreview] Image conversion failed:', error);
    }
    return null;
  }
}

interface IdCardLayoutConfig {
  enabledFields?: string[];
  studentNamePosition?: { x: number; y: number; width?: number; height?: number };
  fatherNamePosition?: { x: number; y: number; width?: number; height?: number };
  studentCodePosition?: { x: number; y: number; width?: number; height?: number };
  admissionNumberPosition?: { x: number; y: number; width?: number; height?: number };
  cardNumberPosition?: { x: number; y: number; width?: number; height?: number };
  classPosition?: { x: number; y: number; width?: number; height?: number };
  expiryDatePosition?: { x: number; y: number; width?: number; height?: number };
  schoolNamePosition?: { x: number; y: number; width?: number; height?: number };
  studentPhotoPosition?: { x: number; y: number; width?: number; height?: number };
  qrCodePosition?: { x: number; y: number; width?: number; height?: number };
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  rtl?: boolean;
  fieldFonts?: Record<string, { fontSize?: number; fontFamily?: string }>;
}

interface IdCardTemplate {
  id: string;
  name: string;
  layout_config_front: IdCardLayoutConfig | null;
  layout_config_back: IdCardLayoutConfig | null;
  background_image_path_front: string | null;
  background_image_path_back: string | null;
  card_size: string;
}

interface CardPreviewProps {
  student: Student | null;
  template: IdCardTemplate | null;
  side?: 'front' | 'back';
  printQuality?: boolean;
  onSideChange?: (side: 'front' | 'back') => void;
  showControls?: boolean;
  className?: string;
}

// CR80 dimensions: 85.6mm × 53.98mm
// At 300 DPI: 1011px × 637px
// At 96 DPI (screen): 323px × 204px
const CR80_WIDTH_PX = 323; // Screen preview
const CR80_HEIGHT_PX = 204; // Screen preview
const CR80_WIDTH_PX_PRINT = 1011; // Print quality (300 DPI)
const CR80_HEIGHT_PX_PRINT = 637; // Print quality (300 DPI)

export function CardPreview({
  student,
  template,
  side = 'front',
  printQuality = false,
  onSideChange,
  showControls = true,
  className = '',
}: CardPreviewProps) {
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCardImage = async (
    student: Student,
    template: IdCardTemplate,
    side: 'front' | 'back',
    printQuality: boolean
  ): Promise<HTMLCanvasElement> => {
    const width = printQuality ? CR80_WIDTH_PX_PRINT : CR80_WIDTH_PX;
    const height = printQuality ? CR80_HEIGHT_PX_PRINT : CR80_HEIGHT_PX;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const layout = side === 'front' 
      ? template.layout_config_front 
      : template.layout_config_back;
    
    if (!layout) throw new Error(`No layout config for ${side} side`);

    const backgroundPath = side === 'front'
      ? template.background_image_path_front
      : template.background_image_path_back;

    // Draw background image if available
    if (backgroundPath) {
      try {
        const backgroundUrl = `/api/id-card-templates/${template.id}/background/${side}`;
        const backgroundBase64 = await convertImageToBase64(backgroundUrl);
        if (backgroundBase64) {
          const bgImg = new Image();
          await new Promise((resolve, reject) => {
            bgImg.onload = () => {
              ctx.drawImage(bgImg, 0, 0, width, height);
              resolve(null);
            };
            bgImg.onerror = reject;
            bgImg.src = backgroundBase64;
          });
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[CardPreview] Failed to load background image:', error);
        }
      }
    }

    const isRtl = layout.rtl !== false;
    const defaultFontFamily = isRtl
      ? '"Bahij Nassim", "Noto Sans Arabic", "Arial Unicode MS", "Tahoma", "Arial", sans-serif'
      : (layout.fontFamily || 'Arial');
    const textColor = layout.textColor || '#000000';
    const baseFontSize = layout.fontSize || 12;

    const getFieldFont = (fieldId: string, defaultMultiplier: number) => {
      const fieldFont = layout.fieldFonts?.[fieldId];
      const fieldFontSize = fieldFont?.fontSize !== undefined
        ? fieldFont.fontSize
        : baseFontSize * defaultMultiplier;
      const fieldFontFamily = fieldFont?.fontFamily || defaultFontFamily;
      return { fontSize: fieldFontSize, fontFamily: fieldFontFamily };
    };

    const getPixelPosition = (position?: { x: number; y: number; width?: number; height?: number }) => {
      if (!position) return null;
      const x = (position.x / 100) * width;
      const y = (position.y / 100) * height;
      const w = position.width ? (position.width / 100) * width : undefined;
      const h = position.height ? (position.height / 100) * height : undefined;
      return { x, y, width: w, height: h };
    };

    ctx.textBaseline = 'middle';
    ctx.direction = isRtl ? 'rtl' : 'ltr';

    // Draw enabled fields
    if (layout.enabledFields?.includes('studentName') && student.fullName) {
      const pos = getPixelPosition(layout.studentNamePosition);
      if (pos) {
        const fieldFont = getFieldFont('studentName', 1.2);
        ctx.fillStyle = textColor;
        ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(student.fullName, pos.x, pos.y);
      }
    }

    if (layout.enabledFields?.includes('fatherName') && student.fatherName) {
      const pos = getPixelPosition(layout.fatherNamePosition);
      if (pos) {
        const fieldFont = getFieldFont('fatherName', 1.0);
        ctx.fillStyle = textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(student.fatherName, pos.x, pos.y);
      }
    }

    if (layout.enabledFields?.includes('studentCode') && student.studentCode) {
      const pos = getPixelPosition(layout.studentCodePosition);
      if (pos) {
        const fieldFont = getFieldFont('studentCode', 0.9);
        ctx.fillStyle = textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText(`Code: ${student.studentCode}`, pos.x, pos.y);
      }
    }

    if (layout.enabledFields?.includes('admissionNumber') && student.admissionNumber) {
      const pos = getPixelPosition(layout.admissionNumberPosition);
      if (pos) {
        const fieldFont = getFieldFont('admissionNumber', 0.9);
        ctx.fillStyle = textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText(`Admission: ${student.admissionNumber}`, pos.x, pos.y);
      }
    }

    if (layout.enabledFields?.includes('class') && student.currentClass?.name) {
      const pos = getPixelPosition(layout.classPosition);
      if (pos) {
        const fieldFont = getFieldFont('class', 0.9);
        ctx.fillStyle = textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText(`Class: ${student.currentClass.name}`, pos.x, pos.y);
      }
    }

    if (layout.enabledFields?.includes('schoolName') && student.school?.schoolName) {
      const pos = getPixelPosition(layout.schoolNamePosition);
      if (pos) {
        const fieldFont = getFieldFont('schoolName', 0.8);
        ctx.fillStyle = textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(student.school.schoolName, pos.x, pos.y);
      }
    }

    // Student photo
    if (layout.enabledFields?.includes('studentPhoto') && student.picturePath) {
      const pos = getPixelPosition(layout.studentPhotoPosition);
      if (pos && pos.width && pos.height) {
        try {
          const photoUrl = `/api/students/${student.id}/picture`;
          const photoBase64 = await convertImageToBase64(photoUrl);
          if (photoBase64) {
            const photoImg = new Image();
            await new Promise((resolve, reject) => {
              photoImg.onload = () => {
                // Save context state and disable stroke to prevent dark border
                ctx.save();
                ctx.lineWidth = 0;
                ctx.strokeStyle = 'transparent';
                
                ctx.drawImage(photoImg, pos.x! - pos.width! / 2, pos.y! - pos.height! / 2, pos.width!, pos.height!);
                
                // Restore context state
                ctx.restore();
                resolve(null);
              };
              photoImg.onerror = reject;
              photoImg.src = photoBase64;
            });
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[CardPreview] Failed to load student photo:', error);
          }
        }
      }
    }

    // QR Code
    if (layout.enabledFields?.includes('qrCode') && student.studentCode) {
      const pos = getPixelPosition(layout.qrCodePosition);
      if (pos && pos.width && pos.height) {
        try {
          const qrSize = Math.min(pos.width, pos.height);
          const qrBase64 = await generateQRCode(student.studentCode, qrSize);
          if (qrBase64) {
            const qrImg = new Image();
            await new Promise((resolve, reject) => {
              qrImg.onload = () => {
                ctx.drawImage(qrImg, pos.x! - pos.width! / 2, pos.y! - pos.height! / 2, pos.width!, pos.height!);
                resolve(null);
              };
              qrImg.onerror = reject;
              qrImg.src = qrBase64;
            });
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[CardPreview] Failed to generate QR code:', error);
          }
        }
      }
    }

    return canvas;
  };

  useEffect(() => {
    if (!student || !template) {
      setPreviewImage(null);
      return;
    }

    const loadPreview = async () => {
      setIsGenerating(true);
      try {
        const canvas = await generateCardImage(student, template, side, printQuality);
        const dataUrl = canvas.toDataURL('image/png');
        setPreviewImage(dataUrl);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[CardPreview] Failed to generate preview:', error);
        }
        showToast.error(error instanceof Error ? error.message : t('idCards.previewFailed'));
      } finally {
        setIsGenerating(false);
      }
    };

    void loadPreview();
  }, [student, template, side, printQuality, t]);

  const handleDownload = async () => {
    if (!student || !template) return;

    try {
      setIsGenerating(true);
      const canvas = await generateCardImage(student, template, side, true);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `id-card-${student.admissionNumber || student.id}-${side}.png`;
      link.click();
      showToast.success(t('idCards.downloadSuccess'));
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : t('idCards.downloadFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!previewImage) return;
    const printWindow = window.open();
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${t('idCards.printPreview')}</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <img src="${previewImage}" alt="ID Card" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!student || !template) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {t('idCards.selectStudentAndTemplate')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        {showControls && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Select value={side} onValueChange={(value: 'front' | 'back') => onSideChange?.(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front">{t('idCards.front')}</SelectItem>
                  <SelectItem value="back">{t('idCards.back')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isGenerating}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('common.download')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                disabled={isGenerating || !previewImage}
              >
                <Printer className="h-4 w-4 mr-2" />
                {t('common.print')}
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 min-h-[250px]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : previewImage ? (
            <img
              src={previewImage}
              alt={`${student.fullName} - ${side} side`}
              className="max-w-full h-auto rounded shadow-md"
            />
          ) : (
            <div className="text-muted-foreground">{t('idCards.previewFailed')}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

