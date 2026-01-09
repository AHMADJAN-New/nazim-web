import { Loader2, Download, Image as ImageIcon, FileDown, CreditCard } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIdCardTemplates } from '@/hooks/useIdCardTemplates';
import { useLanguage } from '@/hooks/useLanguage';
import { useStudents } from '@/hooks/useStudents';
import { showToast } from '@/lib/toast';
import type { Student } from '@/types/domain/student';

// QR Code generation - using external API (matches certificate system pattern)
async function generateQrCodeDataUrl(value: string, sizePx: number): Promise<string> {
  const safeValue = String(value ?? '').trim();
  if (!safeValue) {
    throw new Error('QR value is empty');
  }
  const size = Math.max(64, Math.min(600, Math.round(sizePx)));
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(safeValue)}`;
  const response = await fetch(qrUrl);
  if (!response.ok) {
    throw new Error('Failed to generate QR code');
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Legacy function name for backward compatibility
async function generateQRCode(data: string, size: number = 200): Promise<string> {
  return generateQrCodeDataUrl(data, size);
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
      console.error('[IdCardGenerator] Image conversion failed:', error);
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
  description: string | null;
  layout_config_front: IdCardLayoutConfig | null;
  layout_config_back: IdCardLayoutConfig | null;
  background_image_path_front: string | null;
  background_image_path_back: string | null;
  card_size: string;
  is_default: boolean;
  is_active: boolean;
}

interface IdCardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  templates?: IdCardTemplate[];
  organizationId?: string;
}

// CR80 dimensions: 85.6mm × 53.98mm
// At 300 DPI: 1011px × 637px
// At 96 DPI (screen): 323px × 204px
const CR80_WIDTH_MM = 85.6;
const CR80_HEIGHT_MM = 53.98;
const CR80_WIDTH_PX = 323; // Screen preview
const CR80_HEIGHT_PX = 204; // Screen preview
const CR80_WIDTH_PX_PRINT = 1011; // Print quality (300 DPI)
const CR80_HEIGHT_PX_PRINT = 637; // Print quality (300 DPI)

export function IdCardGenerator({
  isOpen,
  onClose,
  templates = [],
  organizationId,
}: IdCardGeneratorProps) {
  const { t } = useLanguage();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);

  const { data: students = [] } = useStudents(organizationId);
  
  // Fetch templates with auto-refresh when dialog opens
  const { data: fetchedTemplates = [], refetch: refetchTemplates } = useIdCardTemplates(true);
  
  // Use fetched templates if available, otherwise use props
  const availableTemplates = fetchedTemplates.length > 0 ? fetchedTemplates : templates;

  const selectedTemplate = availableTemplates.find((t) => t.id === selectedTemplateId);

  // Refetch templates when dialog opens
  useEffect(() => {
    if (isOpen) {
      void refetchTemplates();
    }
  }, [isOpen, refetchTemplates]);

  // Auto-select default template
  useEffect(() => {
    if (isOpen && availableTemplates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = availableTemplates.find((t) => t.is_default && t.is_active);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      } else {
        const activeTemplate = availableTemplates.find((t) => t.is_active);
        if (activeTemplate) {
          setSelectedTemplateId(activeTemplate.id);
        }
      }
    }
  }, [isOpen, availableTemplates, selectedTemplateId]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplateId('');
      setSelectedStudents([]);
      setPreviewStudentId(null);
      setPreviewSide('front');
    }
  }, [isOpen]);

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.id));
    }
  };

  // Generate ID card image (front or back)
  const generateIdCardImage = async (
    student: Student,
    side: 'front' | 'back',
    printQuality: boolean = false
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

    if (!selectedTemplate) throw new Error('No template selected');

    const layout = side === 'front' 
      ? selectedTemplate.layout_config_front 
      : selectedTemplate.layout_config_back;
    
    if (!layout) throw new Error(`No layout config for ${side} side`);

    const backgroundPath = side === 'front'
      ? selectedTemplate.background_image_path_front
      : selectedTemplate.background_image_path_back;

    // Draw background image if available
    if (backgroundPath) {
      try {
        // Assuming API endpoint for background images
        const backgroundUrl = `/api/id-card-templates/${selectedTemplate.id}/background/${side}`;
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
          console.warn('[IdCardGenerator] Failed to load background image:', error);
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

    // Student photo (try to load even if picture_path is not set - API handles fallback)
    if (layout.enabledFields?.includes('studentPhoto')) {
      const photoPos = layout.studentPhotoPosition;
      const pos = getPixelPosition(photoPos);
      if (pos) {
        try {
          const photoUrl = `/api/students/${student.id}/picture`;
          const photoBase64 = await convertImageToBase64(photoUrl);
          if (photoBase64) {
            const photoImg = new Image();
            await new Promise((resolve, reject) => {
              photoImg.onload = () => {
                // Use saved width/height from config, or default 8% width x 12% height (ID card appropriate sizes)
                const photoWidthPercent = photoPos?.width ?? 8;
                const photoHeightPercent = photoPos?.height ?? 12;
                const photoWidth = (photoWidthPercent / 100) * width;
                const photoHeight = (photoHeightPercent / 100) * height;

                // Save context state and disable stroke to prevent dark border
                ctx.save();
                ctx.lineWidth = 0;
                ctx.strokeStyle = 'transparent';
                
                // Positions in the layout designer are CENTER-based, so draw image centered.
                const drawX = pos.x - photoWidth / 2;
                const drawY = pos.y - photoHeight / 2;
                ctx.drawImage(photoImg, drawX, drawY, photoWidth, photoHeight);
                
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
            console.warn('[IdCardGenerator] Failed to load student photo:', error);
          }
        }
      }
    }

    // QR Code (use studentCode, admissionNumber, or id as fallback)
    if (layout.enabledFields?.includes('qrCode')) {
      const qrPos = layout.qrCodePosition;
      const pos = getPixelPosition(qrPos);
      if (pos) {
        try {
          // Use default 10% x 10% if width/height not specified
          // QR codes should always be square - use the smaller dimension to prevent stretching
          const qrWidthPercent = qrPos?.width ?? 10;
          const qrHeightPercent = qrPos?.height ?? 10;
          const qrWidth = (qrWidthPercent / 100) * width;
          const qrHeight = (qrHeightPercent / 100) * height;
          const qrSizePx = Math.round(Math.min(qrWidth, qrHeight)); // Use smaller dimension for square

          // Use studentCode, admissionNumber, or id as QR value
          const qrValue = student.studentCode || student.admissionNumber || student.id;
          if (qrValue) {
            const qrBase64 = await generateQrCodeDataUrl(qrValue, qrSizePx);
            if (qrBase64) {
              const qrImg = new Image();
              await new Promise((resolve, reject) => {
                qrImg.onload = () => {
                  // Center-based draw
                  // Use square size for QR code to prevent stretching
                  const drawX = pos.x - qrSizePx / 2;
                  const drawY = pos.y - qrSizePx / 2;
                  ctx.drawImage(qrImg, drawX, drawY, qrSizePx, qrSizePx);
                  resolve(null);
                };
                qrImg.onerror = reject;
                qrImg.src = qrBase64;
              });
            }
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[IdCardGenerator] Failed to generate QR code:', error);
          }
        }
      }
    }

    return canvas;
  };

  // Generate JPG preview (screen dimensions, not print quality)
  const generateJpgPreview = async (
    student: Student,
    side: 'front' | 'back'
  ): Promise<string> => {
    // Use screen dimensions (CR80_WIDTH_PX, CR80_HEIGHT_PX) instead of print dimensions
    const canvas = await generateIdCardImage(student, side, false);
    // Export as JPG with quality 0.95
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  // Generate preview
  const handlePreview = async (studentId: string, side: 'front' | 'back') => {
    const student = students.find((s) => s.id === studentId);
    if (!student || !selectedTemplate) return;

    try {
      setIsGenerating(true);
      const canvas = await generateIdCardImage(student, side, false);
      const dataUrl = canvas.toDataURL('image/png');
      // Open in new window for preview
      const previewWindow = window.open();
      if (previewWindow) {
        previewWindow.document.write(`<img src="${dataUrl}" style="max-width: 100%; height: auto;" />`);
      }
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : t('idCards.previewFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Export as images
  const handleExportImages = async () => {
    if (selectedStudents.length === 0 || !selectedTemplate) {
      showToast.error(t('idCards.selectStudents'));
      return;
    }

    setIsGenerating(true);
    try {
      const selectedStudentsData = students.filter((s) => selectedStudents.includes(s.id));

      for (const student of selectedStudentsData) {
        // Generate front side
        const frontCanvas = await generateIdCardImage(student, 'front', true);
        const frontDataUrl = frontCanvas.toDataURL('image/png');
        const frontLink = document.createElement('a');
        frontLink.href = frontDataUrl;
        frontLink.download = `id-card-${student.admissionNumber || student.id}-front.png`;
        frontLink.click();

        // Generate back side if layout exists
        if (selectedTemplate.layout_config_back) {
          const backCanvas = await generateIdCardImage(student, 'back', true);
          const backDataUrl = backCanvas.toDataURL('image/png');
          const backLink = document.createElement('a');
          backLink.href = backDataUrl;
          backLink.download = `id-card-${student.admissionNumber || student.id}-back.png`;
          backLink.click();
        }

        // Small delay to prevent browser blocking multiple downloads
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      showToast.success(t('idCards.exportSuccess', { count: selectedStudentsData.length }));
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : t('idCards.exportFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Export as PDF (multiple cards per page)
  const handleExportPdf = async () => {
    if (selectedStudents.length === 0 || !selectedTemplate) {
      showToast.error(t('idCards.selectStudents'));
      return;
    }

    setIsGenerating(true);
    try {
      // Dynamic import of pdfmake
      const pdfMake = (await import('pdfmake-arabic/build/pdfmake')).default;
      const pdfFonts = await import('pdfmake-arabic/build/vfs_fonts');
      
      if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
        pdfMake.vfs = pdfFonts.pdfMake.vfs;
      }

      const selectedStudentsData = students.filter((s) => selectedStudents.includes(s.id));
      const cardsPerPage = 6; // 3 columns × 2 rows
      const pages: any[] = [];

      for (let i = 0; i < selectedStudentsData.length; i += cardsPerPage) {
        const pageStudents = selectedStudentsData.slice(i, i + cardsPerPage);
        const pageContent: any[] = [];

        // Create rows
        for (let row = 0; row < 2; row++) {
          const rowContent: any[] = [];
          for (let col = 0; col < 3; col++) {
            const index = row * 3 + col;
            if (index < pageStudents.length) {
              const student = pageStudents[index];
              const frontCanvas = await generateIdCardImage(student, 'front', true);
              const frontDataUrl = frontCanvas.toDataURL('image/png');
              
              rowContent.push({
                image: frontDataUrl,
                width: CR80_WIDTH_MM,
                height: CR80_HEIGHT_MM,
                margin: [5, 5, 5, 5],
              });
            } else {
              rowContent.push({ text: '', width: CR80_WIDTH_MM });
            }
          }
          pageContent.push({
            columns: rowContent,
            columnGap: 5,
          });
        }

        pages.push({
          content: pageContent,
          pageSize: 'A4',
          pageOrientation: 'landscape',
          pageMargins: [10, 10, 10, 10],
        });
      }

      const docDefinition = {
        content: pages.flatMap((p) => p.content),
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [10, 10, 10, 10],
      };

      pdfMake.createPdf(docDefinition).download(`id-cards-${Date.now()}.pdf`);
      showToast.success(t('idCards.exportSuccess', { count: selectedStudentsData.length }));
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : t('idCards.exportFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const previewStudent = previewStudentId ? students.find((s) => s.id === previewStudentId) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('idCards.generateIdCards')}
          </DialogTitle>
          <DialogDescription>
            {t('idCards.generateIdCardsDescription') || 'Select students and generate ID cards based on the selected template.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Selection */}
          <div className="space-y-2">
            <Label>{t('studentReportCard.selectTemplate')}</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder={t('idCards.selectTemplatePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates
                  .filter((t) => t.is_active)
                  .map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.is_default && (
                        <Badge variant="secondary" className="ml-2">
                          {t('events.default')}
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student Selection */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{t('idCards.selectStudents')}</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedStudents.length === students.length
                      ? t('events.deselectAll')
                      : t('events.selectAll')}
                  </Button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {students.map((student) => (
                    <div key={student.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`student-${student.id}`}
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={() => handleStudentToggle(student.id)}
                      />
                      <Label
                        htmlFor={`student-${student.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {student.fullName} ({student.admissionNumber || student.id})
                      </Label>
                    </div>
                  ))}
                </div>
                {selectedStudents.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t('idCards.selectedCount', { count: selectedStudents.length })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview Section */}
          {selectedTemplate && previewStudent && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Label className="text-base font-semibold">{t('events.preview')}</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={previewSide === 'front' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewSide('front')}
                    >
                      {t('idCards.frontSide')}
                    </Button>
                    {selectedTemplate.layout_config_back && (
                      <Button
                        variant={previewSide === 'back' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPreviewSide('back')}
                      >
                        {t('idCards.backSide')}
                      </Button>
                    )}
                  </div>
                  <div className="border rounded-lg p-4 bg-gray-50 flex justify-center">
                    <div
                      className="border-2 border-dashed border-gray-300 bg-white"
                      style={{
                        width: `${CR80_WIDTH_PX}px`,
                        height: `${CR80_HEIGHT_PX}px`,
                        position: 'relative',
                      }}
                    >
                      <div className="text-xs text-center text-muted-foreground p-2">
                        {t('idCards.previewPlaceholder')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={previewStudentId || ''}
                      onValueChange={setPreviewStudentId}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t('idCards.selectStudentForPreview')} />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => previewStudentId && handlePreview(previewStudentId, previewSide)}
                      disabled={!previewStudentId || isGenerating}
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      {t('events.preview')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            {t('events.cancel')}
          </Button>
          <Button
            onClick={handleExportImages}
            disabled={selectedStudents.length === 0 || !selectedTemplate || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4 mr-2" />
            )}
            {t('idCards.exportAsImages')}
          </Button>
          <Button
            onClick={handleExportPdf}
            disabled={selectedStudents.length === 0 || !selectedTemplate || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            {t('idCards.exportAsPdf')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

