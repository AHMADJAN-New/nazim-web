import React, { useState, useEffect } from 'react';
import { formatDate, formatDateTime } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, Award, Eye, Image as ImageIcon, Printer } from 'lucide-react';
import {
  useCertificateTemplates,
  useGenerateCertificate,
  useCertificateData,
  CertificateTemplate,
  type CertificateData,
} from '@/hooks/useCertificateTemplates';
import { certificateTemplatesApi } from '@/lib/api/client';
import { format } from 'date-fns';

// Import pdfmake for Arabic support - handle both default and named exports
import * as pdfMakeModule from 'pdfmake-arabic/build/pdfmake';
let pdfMake: any = (pdfMakeModule as any).default || pdfMakeModule;

// Helper to get the actual pdfMake instance
function getPdfMakeInstance() {
  // First try the imported pdfMake
  if (pdfMake && typeof pdfMake.createPdf === 'function') {
    return pdfMake;
  }
  // Try window.pdfMake (set during initialization)
  if (typeof window !== 'undefined' && (window as any).pdfMake && typeof (window as any).pdfMake.createPdf === 'function') {
    return (window as any).pdfMake;
  }
  // Try the module directly
  if (pdfMakeModule && typeof (pdfMakeModule as any).createPdf === 'function') {
    return pdfMakeModule;
  }
  if ((pdfMakeModule as any).default && typeof (pdfMakeModule as any).default.createPdf === 'function') {
    return (pdfMakeModule as any).default;
  }
  return null;
}

// Get the actual pdfMake instance
const actualPdfMake = getPdfMakeInstance();
if (actualPdfMake) {
  pdfMake = actualPdfMake;
}

// Make pdfMake available globally for vfs_fonts
if (typeof window !== 'undefined') {
  (window as any).pdfMake = pdfMake;
}

// Use regular pdfmake vfs_fonts instead of pdfmake-arabic's (which has issues)
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Set up fonts for Arabic/Pashto support
try {
  // Initialize VFS - check if it already exists first
  if (!(pdfMake as any).vfs) {
    try {
      (pdfMake as any).vfs = {};
    } catch (e) {
      // Object is not extensible, try to use existing vfs or skip
      if (import.meta.env.DEV) {
        console.warn('[CertificatePdfGenerator] Could not create vfs, object may not be extensible');
      }
    }
  }
  
  // Merge fonts into VFS if vfs exists
  if ((pdfMake as any).vfs) {
    try {
      if (pdfFonts && typeof pdfFonts === 'object') {
        Object.assign((pdfMake as any).vfs, pdfFonts);
      } else if (pdfFonts && (pdfFonts as any).vfs) {
        Object.assign((pdfMake as any).vfs, (pdfFonts as any).vfs);
      }
    } catch (e) {
      // VFS might be frozen, but that's okay if fonts are already there
      if (import.meta.env.DEV) {
        console.warn('[CertificatePdfGenerator] Could not merge fonts into vfs, may already be initialized');
      }
    }
  }

  // Register fonts properly - pdfmake-arabic includes Roboto by default
  if (!(pdfMake as any).fonts) {
    try {
      (pdfMake as any).fonts = {};
    } catch (e) {
      // Object is not extensible, try to use existing fonts or skip
      if (import.meta.env.DEV) {
        console.warn('[CertificatePdfGenerator] Could not create fonts object, may already exist');
      }
    }
  }

  // Check what fonts are available in VFS
  const vfs = (pdfMake as any).vfs || {};
  const vfsKeys = Object.keys(vfs);

  // Find Roboto font files in VFS
  const findRobotoFont = (variant: 'regular' | 'bold' | 'italic' | 'bolditalic'): string => {
    const patterns = {
      regular: ['roboto', 'regular'],
      bold: ['roboto', 'bold'],
      italic: ['roboto', 'italic'],
      bolditalic: ['roboto', 'bold', 'italic'],
    };
    
    const pattern = patterns[variant];
    const key = vfsKeys.find(k => {
      const lower = k.toLowerCase();
      return pattern.every(p => lower.includes(p));
    });
    
    if (key && vfs[key]) return key;
    
    // Fallback: try to find any Roboto font
    const anyRoboto = vfsKeys.find(k => k.toLowerCase().includes('roboto'));
    if (anyRoboto) return anyRoboto;
    
    // Last resort: use default names (pdfmake-arabic should have these)
    return variant === 'regular' ? 'Roboto-Regular.ttf' :
           variant === 'bold' ? 'Roboto-Medium.ttf' :
           variant === 'italic' ? 'Roboto-Italic.ttf' :
           'Roboto-MediumItalic.ttf';
  };

  const robotoRegular = findRobotoFont('regular');
  const robotoBold = findRobotoFont('bold');
  const robotoItalic = findRobotoFont('italic');
  const robotoBoldItalic = findRobotoFont('bolditalic');

  // Register Roboto fonts (default pdfmake fonts, available in pdfmake-arabic)
  if (!(pdfMake as any).fonts!['Roboto']) {
    (pdfMake as any).fonts!['Roboto'] = {
      normal: robotoRegular,
      bold: robotoBold,
      italics: robotoItalic,
      bolditalics: robotoBoldItalic,
    };
  }

  // Register Arial as an alias to Roboto (since Arial might be requested but not available)
  // Use the same font configuration as Roboto
  if (!(pdfMake as any).fonts!['Arial']) {
    const robotoFont = (pdfMake as any).fonts!['Roboto'];
    (pdfMake as any).fonts!['Arial'] = {
      normal: robotoFont.normal,
      bold: robotoFont.bold,
      italics: robotoFont.italics,
      bolditalics: robotoFont.bolditalics,
    };
  }
} catch (error) {
  console.error('[CertificatePdfGenerator] Failed to initialize pdfmake fonts:', error);
}

// Load custom fonts for Pashto/Arabic support
let fontsLoaded = false;
let fontsLoading: Promise<void> | null = null;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function loadCustomFonts() {
  if (fontsLoaded) return;
  if (fontsLoading) return fontsLoading;
  
  fontsLoading = (async () => {
    try {
      // Load TTF fonts from src/fonts/ttf/ (pdfmake requires TTF)
      // Use dynamic import to get the font URLs
      const regularTtfModule = await import('@/fonts/ttf/Bahij Nassim-Regular.ttf?url');
      const boldTtfModule = await import('@/fonts/ttf/Bahij Nassim-Bold.ttf?url');
      
      const regularTtfUrl = regularTtfModule.default;
      const boldTtfUrl = boldTtfModule.default;
      
      const [regularResponse, boldResponse] = await Promise.all([
        fetch(regularTtfUrl).catch(() => null),
        fetch(boldTtfUrl).catch(() => null),
      ]);
      
      // If TTF not found, fonts are not available
      if (!regularResponse || !regularResponse.ok || !boldResponse || !boldResponse.ok) {
        if (import.meta.env.DEV) {
          console.warn('[CertificatePdfGenerator] TTF font files not found. Pashto/Arabic text will use Roboto font.');
        }
        fontsLoaded = false;
        return;
      }
      
      const [regularBlob, boldBlob] = await Promise.all([
        regularResponse.blob(),
        boldResponse.blob(),
      ]);
      
      // Convert blob to base64 - pdfmake VFS needs raw base64 string (not data URL)
      // Use ArrayBuffer approach for better binary handling
      const regularArrayBuffer = await regularBlob.arrayBuffer();
      const boldArrayBuffer = await boldBlob.arrayBuffer();
      
      // Convert ArrayBuffer to base64 string
      const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
      };
      
      const regularBase64Data = arrayBufferToBase64(regularArrayBuffer);
      const boldBase64Data = arrayBufferToBase64(boldArrayBuffer);
      
      // Add fonts to VFS (Virtual File System) - required for pdfmake
      // Get the actual pdfMake instance (might be from window)
      const pdfMakeInstance = getPdfMakeInstance() || pdfMake;
      
      if (!pdfMakeInstance) {
        throw new Error('pdfMake instance not available');
      }
      
      // Try to add fonts to VFS
      try {
        if (!(pdfMakeInstance as any).vfs) {
          (pdfMakeInstance as any).vfs = {};
        }
        (pdfMakeInstance as any).vfs['BahijNassim-Regular.ttf'] = regularBase64Data;
        (pdfMakeInstance as any).vfs['BahijNassim-Bold.ttf'] = boldBase64Data;
      } catch (e) {
        // VFS might be frozen, skip custom fonts
        if (import.meta.env.DEV) {
          console.warn('[CertificatePdfGenerator] Could not add fonts to VFS, using Roboto only');
        }
        fontsLoaded = false;
        return;
      }
      
      // Register fonts with pdfmake (reference VFS paths)
      try {
        if (!(pdfMakeInstance as any).fonts) {
          (pdfMakeInstance as any).fonts = {};
        }
        (pdfMakeInstance as any).fonts['BahijNassim'] = {
          normal: 'BahijNassim-Regular.ttf',
          bold: 'BahijNassim-Bold.ttf',
        };
      } catch (e) {
        // Fonts might be frozen, skip custom fonts
        if (import.meta.env.DEV) {
          console.warn('[CertificatePdfGenerator] Could not register fonts, using Roboto only');
        }
        fontsLoaded = false;
        return;
      }
      
      fontsLoaded = true;
      if (import.meta.env.DEV) {
        console.log('[CertificatePdfGenerator] Custom fonts loaded successfully');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[CertificatePdfGenerator] Failed to load custom fonts:', error);
      }
      fontsLoaded = false;
    }
  })();
  
  return fontsLoading;
}

interface CertificatePdfGeneratorProps {
  courseStudentId: string;
  studentName: string;
  courseName: string;
  courseId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CertificatePdfGenerator({
  courseStudentId,
  studentName,
  courseName,
  courseId,
  isOpen,
  onClose,
}: CertificatePdfGeneratorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: templates = [] } = useCertificateTemplates(true); // Only active templates
  const { data: certificateData, isLoading: dataLoading } = useCertificateData(courseStudentId);
  const generateCertificate = useGenerateCertificate();

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Cache canvas font loading so we don't re-load per render
  let canvasFontsLoaded = false;
  let canvasFontsLoading: Promise<void> | null = null;

  const normalizeCanvasFontFamily = (fontFamily: string): string => {
    const trimmed = String(fontFamily || '').trim();
    if (!trimmed) return trimmed;
    // Map template values to actual canvas font-face family names
    if (trimmed === 'BahijNassim' || trimmed === 'Bahij Nassim') return 'Bahij Nassim';
    return trimmed;
  };

  const ensureCanvasFontsLoaded = async (): Promise<void> => {
    if (canvasFontsLoaded) return;
    if (canvasFontsLoading) return canvasFontsLoading;

    canvasFontsLoading = (async () => {
      try {
        // Load both Regular + Bold WOFFs for proper weight matching in Canvas.
        // NOTE: Canvas uses CSS font matching; if we only load one weight, it may fallback.
        const [regularWoffModule, boldWoffModule] = await Promise.all([
          import('@/fonts/Bahij Nassim-Regular.woff?url'),
          import('@/fonts/Bahij Nassim-Bold.woff?url'),
        ]);

        const regularWoffUrl = regularWoffModule.default;
        const boldWoffUrl = boldWoffModule.default;

        const regularFace = new FontFace('Bahij Nassim', `url(${regularWoffUrl})`, {
          weight: '400',
          style: 'normal',
        });
        const boldFace = new FontFace('Bahij Nassim', `url(${boldWoffUrl})`, {
          weight: '700',
          style: 'normal',
        });

        // Load + register
        await Promise.all([regularFace.load(), boldFace.load()]);
        document.fonts.add(regularFace);
        document.fonts.add(boldFace);

        // Ensure font set is ready before drawing
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        canvasFontsLoaded = true;
        if (import.meta.env.DEV) {
          console.log('[CertificatePdfGenerator] Canvas fonts loaded: Bahij Nassim (400/700)');
        }
      } catch (e) {
        // Not fatal: browser will fall back to installed fonts
        canvasFontsLoaded = false;
        if (import.meta.env.DEV) {
          console.warn('[CertificatePdfGenerator] Failed to load canvas fonts, using fallbacks');
        }
      }
    })();

    return canvasFontsLoading;
  };

  /**
   * Render certificate to a high-res canvas and return a dataURL.
   *
   * IMPORTANT:
   * - Layout designer & JPG preview are Canvas-based (browser text shaping + RTL).
   * - pdfmake text positioning/RTL shaping can differ and cause drift.
   * - For "exactly like preview" PDFs, we embed the rendered canvas image into the PDF.
   */
  const renderCertificateToDataUrl = async (
    data: typeof certificateData,
    template: CertificateTemplate,
    backgroundImageBase64: string | null,
    options?: { scale?: number; mimeType?: 'image/jpeg' | 'image/png'; quality?: number }
  ): Promise<string> => {
    const scale = options?.scale ?? 2; // 2x for better PDF clarity
    const mimeType = options?.mimeType ?? 'image/jpeg';
    const quality = options?.quality ?? 0.95;

    if (!data) {
      throw new Error('Certificate data is missing');
    }

    // Ensure our custom fonts are loaded before we render (important for RTL)
    await ensureCanvasFontsLoaded();

    // Base A4 landscape dimensions in pixels (at 96 DPI)
    const baseWidth = 1123; // 297mm at 96 DPI
    const baseHeight = 794; // 210mm at 96 DPI

    const previewMaxWidth = 800;
    let fontScale = 1;

    // Create high-res canvas (scale for quality)
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(baseWidth * scale);
    canvas.height = Math.round(baseHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Scale the context for high-resolution rendering
    // This scales coordinates - font sizes will be handled separately to match editor
    ctx.scale(scale, scale);

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    // Draw background image (cover full canvas)
    if (backgroundImageBase64) {
      const bgImg = new Image();
      await new Promise((resolve, reject) => {
        bgImg.onload = () => {
          if (bgImg.width > 0) {
            fontScale = bgImg.width > previewMaxWidth ? previewMaxWidth / bgImg.width : 1;
          }
          ctx.drawImage(bgImg, 0, 0, baseWidth, baseHeight);
          resolve(null);
        };
        bgImg.onerror = reject;
        bgImg.src = backgroundImageBase64;
      });
    }

    // Get layout config
    const layout = template.layout_config || {};
    const isRtl = layout.rtl !== false; // Default RTL

    // Default font family for canvas
    const requestedGlobalFont = layout.fontFamily ? normalizeCanvasFontFamily(layout.fontFamily) : '';
    const defaultFontFamily = isRtl
      ? `"${normalizeCanvasFontFamily('Bahij Nassim')}", "Noto Sans Arabic", "Arial Unicode MS", "Tahoma", "Arial", sans-serif`
      : (requestedGlobalFont || 'Arial');

    const textColor = layout.textColor || '#1a365d';
    const baseFontSize = layout.fontSize || 24;

    const getFieldFont = (fieldId: string, defaultMultiplier: number) => {
      const fieldFont = layout.fieldFonts?.[fieldId];
      // Get font size from config - use exactly as stored (standard way)
      // The config stores the actual pixel size the user wants
      // We'll use this size directly in drawText helper (no division by scale)
      const rawFontSize = fieldFont?.fontSize !== undefined 
          ? fieldFont.fontSize 
          : baseFontSize * defaultMultiplier;
      
      // Apply legacy preview scaling so exports match the editor display
      const fieldFontSize = rawFontSize * fontScale;
      
      if (import.meta.env.DEV && (fieldId === 'header' || fieldId === 'studentName')) {
        console.log(`[CertificatePdfGenerator] Font size for ${fieldId}:`, {
          configFontSize: rawFontSize,
          scale,
          note: 'Using font size directly from config (standard way)',
        });
      }
      
      const rawFamily = fieldFont?.fontFamily ? normalizeCanvasFontFamily(fieldFont.fontFamily) : '';
      const fieldFontFamily = rawFamily || defaultFontFamily;
      return { fontSize: fieldFontSize, fontFamily: fieldFontFamily };
    };

    const prepareCanvasText = (text: string): string => {
      if (!text) return '';
      return String(text).trim().normalize('NFC');
    };

    const getPixelPosition = (
      position?: { x: number; y: number },
      defaultX?: number,
      defaultY?: number
    ) => {
      const x = position ? (position.x / 100) * baseWidth : defaultX;
      const y = position ? (position.y / 100) * baseHeight : defaultY;
      if (x === undefined || y === undefined) return null;
      return { x, y };
    };

    // Helper function to draw text with exact font size (not affected by context scaling)
    const drawText = (
      text: string,
      x: number,
      y: number,
      fontSize: number,
      fontFamily: string,
      align: CanvasTextAlign = 'center'
    ) => {
      ctx.save();
      // Reset transform to identity (no scaling) for font rendering
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // Scale coordinates manually for high-res rendering
      const scaledX = x * scale;
      const scaledY = y * scale;
      // Set font size directly (use exact size from config, no division needed)
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.direction = isRtl ? 'rtl' : 'ltr';
      ctx.fillText(prepareCanvasText(text), scaledX, scaledY);
      ctx.restore();
    };

    // Match designer (center)
    ctx.textBaseline = 'middle';
    ctx.direction = isRtl ? 'rtl' : 'ltr';

    // Header
    if (layout.enabledFields?.includes('header')) {
      const pos = getPixelPosition(layout.headerPosition, baseWidth / 2, 100);
      if (pos) {
        const fieldFont = getFieldFont('header', 1.5);
        const headerText = layout.headerText || 'Certificate of Completion';
        // Use raw font size directly (no division by scale since we're not using context scaling for fonts)
        drawText(headerText, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Student name
    if (layout.enabledFields?.includes('studentName')) {
      const pos = getPixelPosition(layout.studentNamePosition, baseWidth / 2, 300);
      if (pos) {
        const fieldFont = getFieldFont('studentName', 1.17);
        drawText(data.student.full_name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Father name
    if (layout.enabledFields?.includes('fatherName') && data.student.father_name) {
      const pos = getPixelPosition(layout.fatherNamePosition, baseWidth / 2, 360);
      if (pos) {
        const fieldFont = getFieldFont('fatherName', 1.0);
        drawText(data.student.father_name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Grandfather name
    if (layout.enabledFields?.includes('grandfatherName') && data.student.grandfather_name) {
      const pos = getPixelPosition(layout.grandfatherNamePosition, baseWidth / 2, 380);
      if (pos) {
        const fieldFont = getFieldFont('grandfatherName', 0.9);
        drawText(data.student.grandfather_name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Mother name
    if (layout.enabledFields?.includes('motherName') && data.student.mother_name) {
      const pos = getPixelPosition(layout.motherNamePosition, baseWidth / 2, 400);
      if (pos) {
        const fieldFont = getFieldFont('motherName', 0.9);
        drawText(data.student.mother_name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Course name
    if (layout.enabledFields?.includes('courseName')) {
      const pos = getPixelPosition(layout.courseNamePosition, baseWidth / 2, 480);
      if (pos) {
        const fieldFont = getFieldFont('courseName', 1.0);
        const actualCourseName = data.course?.name || courseName;
        const courseNameText = layout.courseNameText
          ? `${layout.courseNameText} ${actualCourseName}`
          : actualCourseName;
        drawText(courseNameText, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Certificate number
    if (layout.enabledFields?.includes('certificateNumber')) {
      const pos = getPixelPosition(layout.certificateNumberPosition, 100, baseHeight - 100);
      if (pos) {
        const fieldFont = getFieldFont('certificateNumber', 0.5);
        const certPrefix =
          layout.certificateNumberPrefix !== undefined ? layout.certificateNumberPrefix : 'Certificate No:';
        const certText = certPrefix
          ? `${certPrefix} ${data.student.certificate_number || 'N/A'}`
          : data.student.certificate_number || 'N/A';
        drawText(certText, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, isRtl ? 'right' : 'left');
      }
    }

    // Date
    if (layout.enabledFields?.includes('date')) {
      const pos = getPixelPosition(layout.datePosition, baseWidth - 100, baseHeight - 100);
      if (pos) {
        const fieldFont = getFieldFont('date', 0.5);
        const dateLabel = layout.dateText || 'Date:';
        const formattedDate = data.student.certificate_issued_at
          ? formatDate(data.student.certificate_issued_at)
          : format(new Date(), 'MMM d, yyyy');
        const dateText = `${dateLabel} ${formattedDate}`;
        drawText(dateText, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Student Photo (only if enabled and picture_path exists)
    const isStudentPhotoEnabled = layout.enabledFields?.includes('studentPhoto');
    const hasPicturePath = data.student.picture_path && data.student.picture_path.trim() !== '';
    
    if (import.meta.env.DEV) {
      console.log('[CertificatePdfGenerator] Student photo check:', {
        isStudentPhotoEnabled,
        hasPicturePath,
        picturePath: data.student.picture_path,
        studentId: data.student.id,
        enabledFields: layout.enabledFields,
      });
    }
    
    if (isStudentPhotoEnabled && hasPicturePath) {
      const photoPos = layout.studentPhotoPosition;
      const pos = getPixelPosition(photoPos, 150, baseHeight / 2);
      if (pos) {
        try {
          // Use course student picture endpoint instead of regular student endpoint
          if (import.meta.env.DEV) {
            console.log('[CertificatePdfGenerator] Fetching student photo from:', `/api/course-students/${data.student.id}/picture`);
          }
          const photoBase64 = await convertImageToBase64(`/api/course-students/${data.student.id}/picture`);
          if (photoBase64) {
            const photoImg = new Image();
            await new Promise((resolve, reject) => {
              photoImg.onload = () => {
                if (import.meta.env.DEV) {
                  console.log('[CertificatePdfGenerator] Student photo loaded successfully');
                }
                resolve(null);
              };
              photoImg.onerror = (error) => {
                if (import.meta.env.DEV) {
                  console.error('[CertificatePdfGenerator] Student photo image load error:', error);
                }
                reject(error);
              };
              photoImg.src = photoBase64;
            });

            const photoWidth = photoPos?.width ? (photoPos.width / 100) * baseWidth : 120;
            const photoHeight = photoPos?.height ? (photoPos.height / 100) * baseHeight : 120;

            // Positions in the layout designer are CENTER-based, so draw image centered.
            const drawX = pos.x - photoWidth / 2;
            const drawY = pos.y - photoHeight / 2;
            ctx.drawImage(photoImg, drawX, drawY, photoWidth, photoHeight);
            
            if (import.meta.env.DEV) {
              console.log('[CertificatePdfGenerator] Student photo drawn at:', { drawX, drawY, photoWidth, photoHeight });
            }
          } else {
            if (import.meta.env.DEV) {
              console.warn('[CertificatePdfGenerator] Student photo base64 conversion returned null');
            }
          }
        } catch (e) {
          if (import.meta.env.DEV) {
            console.error('[CertificatePdfGenerator] Failed to render student photo:', e);
          }
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('[CertificatePdfGenerator] Student photo position not calculated (pos is null)');
        }
      }
    } else {
      if (import.meta.env.DEV) {
        console.log('[CertificatePdfGenerator] Student photo not rendered:', {
          reason: !isStudentPhotoEnabled ? 'field not enabled' : 'no picture_path',
        });
      }
    }

    // QR Code (only if enabled)
    if (layout.enabledFields?.includes('qrCode')) {
      const qrPos = layout.qrCodePosition;
      const pos = getPixelPosition(qrPos, baseWidth - 150, baseHeight / 2);
      if (pos) {
        const qrWidth = qrPos?.width ? (qrPos.width / 100) * baseWidth : 140;
        const qrHeight = qrPos?.height ? (qrPos.height / 100) * baseHeight : qrWidth;
        const qrSizePx = Math.round(Math.max(qrWidth, qrHeight));

        const source = layout.qrCodeValueSource || 'certificate_number';
        const qrValue =
          source === 'admission_no'
            ? (data.student.admission_no || '')
            : source === 'student_id'
              ? data.student.id
              : source === 'course_student_id'
                ? courseStudentId
                : (data.student.certificate_number || '');

        try {
          const qrDataUrl = await generateQrCodeDataUrl(qrValue, qrSizePx);
          const qrImg = new Image();
          await new Promise((resolve, reject) => {
            qrImg.onload = () => resolve(null);
            qrImg.onerror = reject;
            qrImg.src = qrDataUrl;
          });

          // Center-based draw
          const drawX = pos.x - qrWidth / 2;
          const drawY = pos.y - qrHeight / 2;
          ctx.drawImage(qrImg, drawX, drawY, qrWidth, qrHeight);
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn('[CertificatePdfGenerator] Failed to render QR code:', e);
          }
        }
      }
    }

    // Director Signature
    if (layout.enabledFields?.includes('directorSignature')) {
      const pos = getPixelPosition(layout.directorSignaturePosition, 150, baseHeight - 80);
      if (pos) {
        const fieldFont = getFieldFont('directorSignature', 0.4);
        const signatureText =
          layout.directorSignatureText !== undefined ? layout.directorSignatureText : 'Director Signature';
        const lineY = pos.y - (signatureText && signatureText.trim() !== '' ? 8 : 0);
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pos.x - 75, lineY);
        ctx.lineTo(pos.x + 75, lineY);
        ctx.stroke();
        if (signatureText && signatureText.trim() !== '') {
          ctx.fillStyle = textColor;
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(prepareCanvasText(signatureText), pos.x, pos.y + 8);
        }
        ctx.textBaseline = 'middle';
      }
    }

    // Official Seal
    if (layout.enabledFields?.includes('officialSeal')) {
      const pos = getPixelPosition(layout.officialSealPosition, baseWidth - 150, baseHeight - 80);
      if (pos) {
        const fieldFont = getFieldFont('officialSeal', 0.4);
        const sealText = layout.officialSealText !== undefined ? layout.officialSealText : 'Official Seal';
        const lineY = pos.y - (sealText && sealText.trim() !== '' ? 8 : 0);
        ctx.strokeStyle = textColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pos.x - 75, lineY);
        ctx.lineTo(pos.x + 75, lineY);
        ctx.stroke();
        if (sealText && sealText.trim() !== '') {
          ctx.fillStyle = textColor;
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(prepareCanvasText(sealText), pos.x, pos.y + 8);
        }
        ctx.textBaseline = 'middle';
      }
    }

    if (mimeType === 'image/png') {
      return canvas.toDataURL('image/png');
    }
    return canvas.toDataURL('image/jpeg', quality);
  };

  // Auto-select template based on course_id when dialog opens or templates/courseId changes
  useEffect(() => {
    if (isOpen && templates.length > 0 && courseId) {
      // Find template assigned to this course
      const courseTemplate = templates.find((t) => t.course_id === courseId);
      if (courseTemplate && courseTemplate.id !== selectedTemplateId) {
        setSelectedTemplateId(courseTemplate.id);
      } else if (!courseTemplate && selectedTemplateId === '') {
        // If no course-specific template, try to use default template
        const defaultTemplate = templates.find((t) => t.is_default);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
        }
      }
    } else if (isOpen && templates.length > 0 && !courseId && selectedTemplateId === '') {
      // If no courseId provided, use default template
      const defaultTemplate = templates.find((t) => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
      }
    }
  }, [isOpen, templates, courseId, selectedTemplateId]);

  // Helper function to convert image URL to base64 data URL
  // Uses API client to include authentication headers
  const convertImageToBase64 = async (url: string | null): Promise<string | null> => {
    if (!url) return null;

    // If already a data URL, return as is
    if (url.startsWith('data:image/')) {
      return url;
    }

    try {
      // Extract endpoint from full URL (e.g., /api/certificate-templates/{id}/background)
      // Remove /api prefix and use the path
      let endpoint = url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        endpoint = urlObj.pathname; // Get pathname (e.g., /api/certificate-templates/{id}/background)
      }
      
      // Remove /api prefix if present (API client adds it)
      if (endpoint.startsWith('/api')) {
        endpoint = endpoint.replace('/api', '');
      }
      
      if (import.meta.env.DEV) {
        console.log('[CertificatePdfGenerator] Fetching image from endpoint:', endpoint);
      }

      // Check if this is a course student picture endpoint
      if (endpoint.includes('/course-students/') && endpoint.includes('/picture')) {
        // For course student pictures, fetch directly with authentication
        const { apiClient } = await import('@/lib/api/client');
        const token = apiClient.getToken();
        const fullUrl = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        const response = await fetch(`/api${fullUrl}`, {
          method: 'GET',
          headers: {
            'Accept': 'image/*',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        });
        
        if (!response.ok) {
          if (import.meta.env.DEV) {
            console.warn('[CertificatePdfGenerator] Failed to fetch course student picture:', response.status);
          }
          return null;
        }
        
        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          console.warn('[CertificatePdfGenerator] Invalid image type:', blob.type);
          return null;
        }
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (result && result.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/)) {
              resolve(result);
            } else {
              reject(new Error('Invalid image data URL'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(blob);
        });
      } else {
        // For background images, use API client's requestFile method
        const { blob } = await certificateTemplatesApi.getBackgroundImage(endpoint);

        if (!blob.type.startsWith('image/')) {
          console.warn('[CertificatePdfGenerator] Invalid image type:', blob.type);
          return null;
        }

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            if (result && result.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/)) {
              resolve(result);
            } else {
              reject(new Error('Invalid image data URL'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.error('[CertificatePdfGenerator] Error converting image to base64:', error);
      return null;
    }
  };

  // Helper to convert data URL to Blob (for downloading images)
  const dataURLtoBlob = async (dataUrl: string): Promise<Blob> => {
    // Extract base64 data and MIME type from data URL
    const arr = dataUrl.split(',');
    if (arr.length !== 2) {
      throw new Error('Invalid data URL format');
    }
    
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mimeType });
  };

  // QR Code generation (data URL). Uses an external QR service for simplicity.
  // NOTE: If you want this fully offline, we can switch to a local QR encoder later.
  const generateQrCodeDataUrl = async (value: string, sizePx: number): Promise<string> => {
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
  };

  const handleGeneratePdf = async (download: boolean = true) => {
    if (!selectedTemplateId || !certificateData) return;

    setIsGenerating(true);
    
    // Declare variables outside try block so they're accessible in catch
    let updatedCertificateData: typeof certificateData | null = null;
    let backgroundImageBase64: string | null = null;
    
    try {
      // First, generate the certificate on the backend (this assigns certificate number)
      await generateCertificate.mutateAsync({
        courseStudentId,
        templateId: selectedTemplateId,
      });

      // Refresh certificate data to get updated background_url after certificate generation
      // The generateCertificate mutation should have updated the data, but let's ensure we have the latest
      updatedCertificateData = await certificateTemplatesApi.getCertificateData(courseStudentId) as CertificateData;
      
      // Convert background image URL to base64 if available
      const backgroundUrl = updatedCertificateData.background_url || certificateData.background_url;
      
      if (backgroundUrl) {
        if (import.meta.env.DEV) {
          console.log('[CertificatePdfGenerator] Loading background image from:', backgroundUrl);
        }
        backgroundImageBase64 = await convertImageToBase64(backgroundUrl);
        if (backgroundImageBase64) {
          if (import.meta.env.DEV) {
            console.log('[CertificatePdfGenerator] Background image loaded successfully');
          }
        } else {
          console.warn('[CertificatePdfGenerator] Failed to load background image');
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('[CertificatePdfGenerator] No background URL available');
        }
      }

      // Build a PDF from the same Canvas render used for JPG preview.
      // This makes PDF match layout preview EXACTLY and fixes RTL ordering/shaping issues.
      const certificateImageDataUrl = await renderCertificateToDataUrl(
        updatedCertificateData || certificateData,
        selectedTemplate!,
        backgroundImageBase64,
        { scale: 2, mimeType: 'image/jpeg', quality: 0.95 }
      );

      const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape' as const,
        pageMargins: [0, 0, 0, 0],
        content: [
          {
            image: certificateImageDataUrl,
            width: 842, // A4 landscape width in points (approx)
            height: 595, // A4 landscape height in points (approx)
            absolutePosition: { x: 0, y: 0 },
          },
        ],
      };

      // Get the actual pdfMake instance
      const pdfMakeInstance = getPdfMakeInstance() || pdfMake;
      if (!pdfMakeInstance || typeof pdfMakeInstance.createPdf !== 'function') {
        throw new Error('pdfMake.createPdf is not available. Please check pdfmake-arabic import.');
      }

      if (download) {
        // Download the PDF
        pdfMakeInstance.createPdf(docDefinition).download(
          `certificate-${(updatedCertificateData || certificateData).student.certificate_number || courseStudentId}.pdf`
        );
      } else {
        // Preview
        pdfMakeInstance.createPdf(docDefinition).getBlob((blob) => {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }, (error: Error) => {
          console.error('[CertificatePdfGenerator] PDF generation error:', error);
          throw error;
        });
      }
    } catch (error) {
      console.error('[CertificatePdfGenerator] Failed to generate PDF:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!selectedTemplateId || !certificateData) return;

    setIsGenerating(true);
    try {
      // First, generate the certificate on the backend (this assigns certificate number)
      await generateCertificate.mutateAsync({
        courseStudentId,
        templateId: selectedTemplateId,
      });

      // Refresh certificate data to get updated background_url after certificate generation
      const updatedCertificateData = await certificateTemplatesApi.getCertificateData(courseStudentId) as CertificateData;
      
      // Convert background image URL to base64 if available
      let backgroundImageBase64: string | null = null;
      const backgroundUrl = updatedCertificateData?.background_url || certificateData?.background_url;
      
      if (backgroundUrl) {
        backgroundImageBase64 = await convertImageToBase64(backgroundUrl);
      }

      // Generate and download image using the SAME renderer as PDF (ensures perfect match)
      const dataUrl = await renderCertificateToDataUrl(
        updatedCertificateData || certificateData,
        selectedTemplate!,
        backgroundImageBase64,
        { scale: 1, mimeType: 'image/jpeg', quality: 0.95 }
      );

      // Convert data URI directly to blob (can't fetch data URIs due to CSP)
      const blob = await dataURLtoBlob(dataUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${(updatedCertificateData || certificateData).student.certificate_number || courseStudentId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate JPG preview image for debugging
  const generateJpgPreview = async (data: typeof certificateData, template: CertificateTemplate, backgroundImageBase64: string | null = null) => {
    if (!data) return;

    try {
      // Wait for fonts to load (especially Noto Sans Arabic for RTL)
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // A4 landscape dimensions in pixels (at 96 DPI)
      const width = 1123; // 297mm at 96 DPI
      const height = 794;  // 210mm at 96 DPI

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[CertificatePdfGenerator] Failed to get canvas context');
        return;
      }

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw background image if available
      if (backgroundImageBase64) {
        const bgImg = new Image();
        await new Promise((resolve, reject) => {
          bgImg.onload = () => {
            // Draw background image to cover full canvas
            ctx.drawImage(bgImg, 0, 0, width, height);
            resolve(null);
          };
          bgImg.onerror = reject;
          bgImg.src = backgroundImageBase64;
        });
      }

      // Get layout config from template
      const layout = template.layout_config || {};
      const isRtl = layout.rtl !== false; // Default to RTL for Pashto/Arabic
      
      // Default font family
      const defaultFontFamily = isRtl 
        ? '"Bahij Nassim", "Noto Sans Arabic", "Arial Unicode MS", "Tahoma", "Arial", sans-serif'
        : (layout.fontFamily || 'Arial');
      const textColor = layout.textColor || '#1a365d';
      const baseFontSize = layout.fontSize || 24;
      
      // Helper function to get field-specific font settings
      const getFieldFont = (fieldId: string, defaultMultiplier: number) => {
        const fieldFont = layout.fieldFonts?.[fieldId];
        const fieldFontSize = fieldFont?.fontSize !== undefined 
          ? fieldFont.fontSize 
          : baseFontSize * defaultMultiplier;
        const fieldFontFamily = fieldFont?.fontFamily || defaultFontFamily;
        return { fontSize: fieldFontSize, fontFamily: fieldFontFamily };
      };
      
      // Load Bahij Nassim Bold font for canvas using dynamic import
      try {
        const boldWoffModule = await import('@/fonts/Bahij Nassim-Bold.woff?url');
        const boldWoffUrl = boldWoffModule.default;
        const fontFace = new FontFace('Bahij Nassim', `url(${boldWoffUrl})`);
        await fontFace.load();
        document.fonts.add(fontFace);
        if (import.meta.env.DEV) {
          console.log('[CertificatePdfGenerator] Bahij Nassim Bold loaded for canvas');
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[CertificatePdfGenerator] Failed to load Bahij Nassim for canvas, using fallback');
        }
      }
      
      // Helper to prepare text for canvas (don't reverse - canvas handles RTL differently)
      const prepareCanvasText = (text: string): string => {
        if (!text) return '';
        // Normalize Unicode but don't reverse word order for canvas
        return String(text).trim().normalize('NFC');
      };

      // Helper function to convert percentage position to pixel coordinates
      const getPixelPosition = (position?: { x: number; y: number }, defaultX?: number, defaultY?: number) => {
        if (position) {
          // Convert percentage (0-100) to pixels
          const x = (position.x / 100) * width;
          const y = (position.y / 100) * height;
          return { x, y };
        }
        // Use default positions if not set
        if (defaultX !== undefined && defaultY !== undefined) {
          return { x: defaultX, y: defaultY };
        }
        return null;
      };

      // Set default text style
      // Use 'middle' baseline to match editor positioning (editor uses transform: translate(-50%, -50%) which centers elements)
      ctx.textBaseline = 'middle';
      ctx.direction = isRtl ? 'rtl' : 'ltr'; // Set text direction for canvas

      // Header - use saved position or default center top (only if enabled)
      if (layout.enabledFields?.includes('header')) {
        const headerPos = getPixelPosition(layout.headerPosition, width / 2, 100);
        if (headerPos) {
          const fieldFont = getFieldFont('header', 1.5);
          ctx.fillStyle = textColor;
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          const headerText = layout.headerText || 'Certificate of Completion';
          ctx.fillText(prepareCanvasText(headerText), headerPos.x, headerPos.y);
        }
      }

      // Student name - use saved position or default center (only if enabled)
      if (layout.enabledFields?.includes('studentName')) {
        const studentNamePos = getPixelPosition(layout.studentNamePosition, width / 2, 300);
        if (studentNamePos) {
          const fieldFont = getFieldFont('studentName', 1.17);
          ctx.fillStyle = textColor;
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.fillText(prepareCanvasText(data.student.full_name), studentNamePos.x, studentNamePos.y);
        }
      }

      // Father name - use saved position or default below student name (only if enabled)
      if (layout.enabledFields?.includes('fatherName') && data.student.father_name) {
        const fatherNamePos = getPixelPosition(layout.fatherNamePosition, width / 2, 360);
        if (fatherNamePos) {
          const fieldFont = getFieldFont('fatherName', 1.0);
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          // Just use the name without prefix
          ctx.fillText(prepareCanvasText(data.student.father_name), fatherNamePos.x, fatherNamePos.y);
        }
      }

      // Grandfather name (only if enabled)
      if (layout.enabledFields?.includes('grandfatherName') && data.student.grandfather_name) {
        const grandfatherNamePos = getPixelPosition(layout.grandfatherNamePosition, width / 2, 380);
        if (grandfatherNamePos) {
          const fieldFont = getFieldFont('grandfatherName', 0.9);
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          // Just use the name without prefix
          ctx.fillText(prepareCanvasText(data.student.grandfather_name), grandfatherNamePos.x, grandfatherNamePos.y);
        }
      }

      // Mother name (only if enabled)
      if (layout.enabledFields?.includes('motherName') && data.student.mother_name) {
        const motherNamePos = getPixelPosition(layout.motherNamePosition, width / 2, 400);
        if (motherNamePos) {
          const fieldFont = getFieldFont('motherName', 0.9);
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          // Just use the name without prefix
          ctx.fillText(prepareCanvasText(data.student.mother_name), motherNamePos.x, motherNamePos.y);
        }
      }

      // Course name - use saved position or default center (only if enabled)
      if (layout.enabledFields?.includes('courseName')) {
        const courseNamePos = getPixelPosition(layout.courseNamePosition, width / 2, 480);
        if (courseNamePos) {
          const fieldFont = getFieldFont('courseName', 1.0);
          ctx.fillStyle = textColor;
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          const actualCourseName = data.course?.name || courseName;
          const courseNameText = layout.courseNameText 
            ? `${layout.courseNameText} ${actualCourseName}`
            : actualCourseName;
          ctx.fillText(prepareCanvasText(courseNameText), courseNamePos.x, courseNamePos.y);
        }
      }

      // Certificate number - use saved position or default bottom left (only if enabled)
      if (layout.enabledFields?.includes('certificateNumber')) {
        const certNumberPos = getPixelPosition(layout.certificateNumberPosition, 100, height - 100);
        if (certNumberPos) {
          const fieldFont = getFieldFont('certificateNumber', 0.5);
          ctx.fillStyle = textColor;
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = isRtl ? 'right' : 'left';
          // Use custom prefix or default
          const certPrefix = layout.certificateNumberPrefix !== undefined 
            ? layout.certificateNumberPrefix 
            : 'Certificate No:';
          const certText = certPrefix 
            ? `${certPrefix} ${data.student.certificate_number || 'N/A'}`
            : (data.student.certificate_number || 'N/A');
          ctx.fillText(prepareCanvasText(certText), certNumberPos.x, certNumberPos.y);
        }
      }

      // Date - use saved position or default bottom right (only if enabled)
      if (layout.enabledFields?.includes('date')) {
        const datePos = getPixelPosition(layout.datePosition, width - 100, height - 100);
        if (datePos) {
          const fieldFont = getFieldFont('date', 0.5);
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = isRtl ? 'left' : 'right';
          // Format: Use custom dateText or default "Date:"
          const dateLabel = layout.dateText || 'Date:';
          const formattedDate = data.student.certificate_issued_at 
            ? formatDate(data.student.certificate_issued_at) 
            : format(new Date(), 'MMM d, yyyy');
          const dateText = `${dateLabel} ${formattedDate}`;
          ctx.fillText(prepareCanvasText(dateText), datePos.x, datePos.y);
        }
      }

      // Province (only if enabled)
      if (layout.enabledFields?.includes('province') && data.student.curr_province) {
        const provincePos = getPixelPosition(layout.provincePosition, width / 2, 520);
        if (provincePos) {
          const fieldFont = getFieldFont('province', 0.8);
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.fillText(prepareCanvasText(`Province: ${data.student.curr_province}`), provincePos.x, provincePos.y);
        }
      }

      // District (only if enabled)
      if (layout.enabledFields?.includes('district') && data.student.curr_district) {
        const districtPos = getPixelPosition(layout.districtPosition, width / 2, 540);
        if (districtPos) {
          const fieldFont = getFieldFont('district', 0.8);
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.fillText(prepareCanvasText(`District: ${data.student.curr_district}`), districtPos.x, districtPos.y);
        }
      }

      // Village (only if enabled)
      if (layout.enabledFields?.includes('village') && data.student.curr_village) {
        const villagePos = getPixelPosition(layout.villagePosition, width / 2, 560);
        if (villagePos) {
          const fieldFont = getFieldFont('village', 0.8);
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.fillText(prepareCanvasText(`Village: ${data.student.curr_village}`), villagePos.x, villagePos.y);
        }
      }

      // Nationality (only if enabled)
      if (layout.enabledFields?.includes('nationality') && data.student.nationality) {
        const nationalityPos = getPixelPosition(layout.nationalityPosition, width / 2, 580);
        if (nationalityPos) {
          const fieldFont = getFieldFont('nationality', 0.8);
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.fillText(prepareCanvasText(`Nationality: ${data.student.nationality}`), nationalityPos.x, nationalityPos.y);
        }
      }

      // Guardian Name (only if enabled)
      if (layout.enabledFields?.includes('guardianName') && data.student.guardian_name) {
        const guardianNamePos = getPixelPosition(layout.guardianNamePosition, width / 2, 600);
        if (guardianNamePos) {
          const fieldFont = getFieldFont('guardianName', 0.8);
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.fillText(prepareCanvasText(`Guardian: ${data.student.guardian_name}`), guardianNamePos.x, guardianNamePos.y);
        }
      }

      // Student Photo (only if enabled and picture_path exists)
      if (layout.enabledFields?.includes('studentPhoto') && data.student.picture_path) {
        const photoPos = layout.studentPhotoPosition;
        if (photoPos) {
          try {
          // Convert photo to base64
          const photoBase64 = await convertImageToBase64(`/api/course-students/${data.student.id}/picture`);
          if (photoBase64) {
            const photoImg = new Image();
            await new Promise((resolve, reject) => {
              photoImg.onload = () => {
                const photoWidth = photoPos.width ? (photoPos.width / 100) * width : 100;
                const photoHeight = photoPos.height ? (photoPos.height / 100) * height : 100;
                const photoX = (photoPos.x / 100) * width - photoWidth / 2;
                const photoY = (photoPos.y / 100) * height - photoHeight / 2;
                
                ctx.drawImage(photoImg, photoX, photoY, photoWidth, photoHeight);
                resolve(null);
              };
                photoImg.onerror = reject;
                photoImg.src = photoBase64;
              });
            }
          } catch (error) {
            if (import.meta.env.DEV) {
              console.warn('[CertificatePdfGenerator] Failed to load student photo:', error);
            }
          }
        }
      }

      // Director Signature (only if enabled)
      if (layout.enabledFields?.includes('directorSignature')) {
        const signaturePos = getPixelPosition(layout.directorSignaturePosition, 150, height - 80);
        if (signaturePos) {
          const fieldFont = getFieldFont('directorSignature', 0.4);
          const signatureText = layout.directorSignatureText !== undefined 
            ? layout.directorSignatureText 
            : 'Director Signature';
          
          // Draw signature line (150px wide)
          ctx.strokeStyle = textColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(signaturePos.x - 75, signaturePos.y - 10);
          ctx.lineTo(signaturePos.x + 75, signaturePos.y - 10);
          ctx.stroke();
          
          // Draw text if provided
          if (signatureText && signatureText.trim() !== '') {
            ctx.fillStyle = '#4a5568';
            ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(prepareCanvasText(signatureText), signaturePos.x, signaturePos.y);
          }
        }
      }

      // Official Seal (only if enabled)
      if (layout.enabledFields?.includes('officialSeal')) {
        const sealPos = getPixelPosition(layout.officialSealPosition, width - 150, height - 80);
        if (sealPos) {
          const fieldFont = getFieldFont('officialSeal', 0.4);
          const sealText = layout.officialSealText !== undefined 
            ? layout.officialSealText 
            : 'Official Seal';
          
          // Draw seal line (150px wide)
          ctx.strokeStyle = textColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sealPos.x - 75, sealPos.y - 10);
          ctx.lineTo(sealPos.x + 75, sealPos.y - 10);
          ctx.stroke();
          
          // Draw text if provided
          if (sealText && sealText.trim() !== '') {
            ctx.fillStyle = '#4a5568';
            ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(prepareCanvasText(sealText), sealPos.x, sealPos.y);
          }
        }
      }

      // Director Signature (only if enabled)
      if (layout.enabledFields?.includes('directorSignature')) {
        const signaturePos = getPixelPosition(layout.directorSignaturePosition, 150, height - 80);
        if (signaturePos) {
          const fieldFont = getFieldFont('directorSignature', 0.4);
          const signatureText = layout.directorSignatureText !== undefined 
            ? layout.directorSignatureText 
            : 'Director Signature';
          
          // Position is center of signature block (line + text)
          // Line should be above center, text below center
          const lineY = signaturePos.y - (signatureText && signatureText.trim() !== '' ? 8 : 0);
          
          // Draw signature line (150px wide, centered at position)
          ctx.strokeStyle = textColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(signaturePos.x - 75, lineY);
          ctx.lineTo(signaturePos.x + 75, lineY);
          ctx.stroke();
          
          // Draw text if provided (position below line, centered)
          if (signatureText && signatureText.trim() !== '') {
            ctx.fillStyle = '#4a5568';
            ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(prepareCanvasText(signatureText), signaturePos.x, signaturePos.y + 8);
          }
        }
      }

      // Official Seal (only if enabled)
      if (layout.enabledFields?.includes('officialSeal')) {
        const sealPos = getPixelPosition(layout.officialSealPosition, width - 150, height - 80);
        if (sealPos) {
          const fieldFont = getFieldFont('officialSeal', 0.4);
          const sealText = layout.officialSealText !== undefined 
            ? layout.officialSealText 
            : 'Official Seal';
          
          // Position is center of seal block (line + text)
          // Line should be above center, text below center
          const lineY = sealPos.y - (sealText && sealText.trim() !== '' ? 8 : 0);
          
          // Draw seal line (150px wide, centered at position)
          ctx.strokeStyle = textColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sealPos.x - 75, lineY);
          ctx.lineTo(sealPos.x + 75, lineY);
          ctx.stroke();
          
          // Draw text if provided (position below line, centered)
          if (sealText && sealText.trim() !== '') {
            ctx.fillStyle = '#4a5568';
            ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(prepareCanvasText(sealText), sealPos.x, sealPos.y + 8);
          }
        }
      }

      // Convert canvas to JPG and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `certificate-${data.student.certificate_number || courseStudentId}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          if (import.meta.env.DEV) {
            console.log('[CertificatePdfGenerator] JPG preview generated and downloaded');
          }
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('[CertificatePdfGenerator] Failed to generate JPG preview:', error);
    }
  };

  const buildPdfDocument = async (data: typeof certificateData, template: CertificateTemplate, backgroundImageBase64: string | null = null) => {
    if (!data) return { content: [] };

    const layout = template.layout_config || {};
    const isRtl = layout.rtl !== false; // Default to RTL for Pashto/Arabic
    
    // Helper to normalize text for proper Unicode rendering (especially for RTL)
    // For PDF, we don't reverse word order - pdfmake-arabic handles RTL automatically
    const normalizeText = (text: string): string => {
      if (!text) return '';

      // Normalize to NFC form for proper Unicode handling
      let normalized = String(text).trim().normalize('NFC');

      // pdfmake-arabic handles RTL direction automatically, so we don't need to reverse word order
      // Just normalize the Unicode and let pdfmake handle the rendering
      return normalized;
    };

    // Default font family
    // Use pdfMake directly for font checks (it's already initialized at module level)
    let defaultFontFamily = 'Roboto';
    if (isRtl && fontsLoaded && (pdfMake as any).fonts?.['BahijNassim']) {
      defaultFontFamily = 'BahijNassim'; // Will use bold variant when bold: true is set
    } else if (layout.fontFamily && ((pdfMake as any).fonts?.[layout.fontFamily] || (pdfMake as any).fonts?.['Arial'])) {
      defaultFontFamily = layout.fontFamily;
    }
    
    const baseFontSize = layout.fontSize || 24;
    
    // Helper function to get field-specific font settings
    const getFieldFont = (fieldId: string, defaultMultiplier: number) => {
      const fieldFont = layout.fieldFonts?.[fieldId];
      const fieldFontSize = fieldFont?.fontSize !== undefined 
        ? fieldFont.fontSize 
        : baseFontSize * defaultMultiplier;
      
      // For PDF, map font family names to pdfmake font names
      let fieldFontFamily = defaultFontFamily;
      if (fieldFont?.fontFamily) {
        const requestedFont = fieldFont.fontFamily;
        // Check if the font is available in pdfmake
        if ((pdfMake as any).fonts?.[requestedFont]) {
          fieldFontFamily = requestedFont;
        } else if (requestedFont === 'Bahij Nassim' && (pdfMake as any).fonts?.['BahijNassim']) {
          fieldFontFamily = 'BahijNassim';
        } else if ((pdfMake as any).fonts?.['Roboto']) {
          fieldFontFamily = 'Roboto'; // Fallback to Roboto
        }
      }
      
      return { fontSize: fieldFontSize, fontFamily: fieldFontFamily };
    };

    // Certificate content
    const content: any[] = [];

    // A4 landscape dimensions: 842pt x 595pt (297mm x 210mm)
    // IMPORTANT: Use full page dimensions (no margins) to match editor and image generator
    // The editor saves positions as percentages (0-100) of the full container
    const pageWidth = 842;
    const pageHeight = 595;

    // Add background image as the first element (behind all content)
    if (backgroundImageBase64) {
      content.push({
        image: backgroundImageBase64,
        width: pageWidth,
        height: pageHeight,
        absolutePosition: { x: 0, y: 0 },
        zIndex: 0,
      });
    }

    // Helper function to estimate text width in points
    // This is approximate: average character width is ~0.5-0.6 of fontSize for Latin, ~0.8 for Arabic
    const estimateTextWidth = (text: string, fontSize: number): number => {
      if (!text) return 0;
      // Check if text contains Arabic/RTL characters
      const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
      // Arabic characters are typically wider
      const avgCharWidth = hasArabic ? fontSize * 0.7 : fontSize * 0.55;
      return text.length * avgCharWidth;
    };

    // Helper function to convert percentage position to PDF points
    // Positions are saved as percentages (0-100) of the full container
    // 
    // KEY DIFFERENCE between Layout Editor/Canvas and pdfmake:
    // - Layout Editor uses CSS transform: translate(-50%, -50%) to CENTER element at position
    // - Canvas uses textAlign: 'center' to CENTER text at position
    // - pdfmake's absolutePosition positions the LEFT EDGE of text at position
    // 
    // So we need to adjust X by half the text width to center the text at the target position
    const getPosition = (
      position: { x: number; y: number } | undefined, 
      defaultX: number | undefined, 
      defaultY: number | undefined, 
      fontSize: number,
      text?: string,
      isCentered: boolean = true
    ) => {
      let x: number;
      let y: number;
      
      if (position) {
        // Convert percentage (0-100) to points using full page dimensions
        x = (position.x / 100) * pageWidth;
        y = (position.y / 100) * pageHeight;
      } else if (defaultX !== undefined && defaultY !== undefined) {
        x = defaultX;
        y = defaultY;
      } else {
        return null;
      }
      
      // Adjust Y for vertical centering (same as before)
      // PDF positions from top, Canvas uses textBaseline: 'middle'
      const lineHeight = fontSize * 1.2;
      y = y - (lineHeight / 2);
      
      // Adjust X for horizontal centering
      // pdfmake positions LEFT edge, but we want CENTER at this position
      if (isCentered && text) {
        const textWidth = estimateTextWidth(text, fontSize);
        x = x - (textWidth / 2);
        // Ensure x doesn't go negative
        if (x < 0) x = 0;
      }
      
      return { x, y };
    };

    // Header - use saved position or default center top (only if enabled)
    if (layout.enabledFields?.includes('header')) {
      const fieldFont = getFieldFont('header', 1.5);
      const headerText = layout.headerText || 'Certificate of Completion';
      const headerPos = getPosition(layout.headerPosition, pageWidth / 2, 120, fieldFont.fontSize, headerText, true);
      if (headerPos) {
        content.push({
          text: normalizeText(headerText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#1a365d',
          absolutePosition: headerPos,
        });
      }
    }

    // Student name - use saved position or default center (only if enabled)
    if (layout.enabledFields?.includes('studentName')) {
      const fieldFont = getFieldFont('studentName', 1.17);
      const studentNameText = data.student.full_name;
      const studentNamePos = getPosition(layout.studentNamePosition, pageWidth / 2, 300, fieldFont.fontSize, studentNameText, true);
      if (studentNamePos) {
        content.push({
          text: normalizeText(studentNameText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#2d3748',
          absolutePosition: studentNamePos,
        });
      }
    }

    // Father name - use saved position or default below student name (only if enabled)
    if (layout.enabledFields?.includes('fatherName') && data.student.father_name) {
      const fieldFont = getFieldFont('fatherName', 1.0);
      const fatherNameText = data.student.father_name;
      const fatherNamePos = getPosition(layout.fatherNamePosition, pageWidth / 2, 360, fieldFont.fontSize, fatherNameText, true);
      if (fatherNamePos) {
        content.push({
          text: normalizeText(fatherNameText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: fatherNamePos,
        });
      }
    }

    // Grandfather name (only if enabled)
    if (layout.enabledFields?.includes('grandfatherName') && data.student.grandfather_name) {
      const fieldFont = getFieldFont('grandfatherName', 0.9);
      const grandfatherNameText = data.student.grandfather_name;
      const grandfatherNamePos = getPosition(layout.grandfatherNamePosition, pageWidth / 2, 380, fieldFont.fontSize, grandfatherNameText, true);
      if (grandfatherNamePos) {
        content.push({
          text: normalizeText(grandfatherNameText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: grandfatherNamePos,
        });
      }
    }

    // Mother name (only if enabled)
    if (layout.enabledFields?.includes('motherName') && data.student.mother_name) {
      const fieldFont = getFieldFont('motherName', 0.9);
      const motherNameText = data.student.mother_name;
      const motherNamePos = getPosition(layout.motherNamePosition, pageWidth / 2, 400, fieldFont.fontSize, motherNameText, true);
      if (motherNamePos) {
        content.push({
          text: normalizeText(motherNameText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: motherNamePos,
        });
      }
    }

    // Course name - use saved position or default center (only if enabled)
    if (layout.enabledFields?.includes('courseName')) {
      const fieldFont = getFieldFont('courseName', 1.0);
      const actualCourseName = data.course?.name || courseName;
      const courseNameText = layout.courseNameText 
        ? `${layout.courseNameText} ${actualCourseName}`
        : actualCourseName;
      const courseNamePos = getPosition(layout.courseNamePosition, pageWidth / 2, 480, fieldFont.fontSize, courseNameText, true);
      if (courseNamePos) {
        content.push({
          text: normalizeText(courseNameText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#1a365d',
          absolutePosition: courseNamePos,
        });
      }
    }

    // Certificate number - use saved position or default bottom left (only if enabled)
    if (layout.enabledFields?.includes('certificateNumber')) {
      const fieldFont = getFieldFont('certificateNumber', 0.5);
      // Use custom prefix or default
      const certPrefix = layout.certificateNumberPrefix !== undefined 
        ? layout.certificateNumberPrefix 
        : 'Certificate No:';
      const certText = certPrefix 
        ? `${certPrefix} ${data.student.certificate_number || 'N/A'}`
        : (data.student.certificate_number || 'N/A');
      // Certificate number is NOT centered, position from left edge
      const certNumberPos = getPosition(layout.certificateNumberPosition, 100, pageHeight - 100, fieldFont.fontSize, certText, true);
      if (certNumberPos) {
        content.push({
          text: normalizeText(certText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: certNumberPos,
        });
      }
    }

    // Date - use saved position or default bottom right (only if enabled)
    if (layout.enabledFields?.includes('date')) {
      const fieldFont = getFieldFont('date', 0.5);
      // Format: Use custom dateText or default "Date:"
      const dateLabel = layout.dateText || 'Date:';
      const formattedDate = data.student.certificate_issued_at 
        ? formatDate(data.student.certificate_issued_at) 
        : format(new Date(), 'MMM d, yyyy');
      const dateText = `${dateLabel} ${formattedDate}`;
      // Date is centered at its position
      const datePos = getPosition(layout.datePosition, pageWidth - 100, pageHeight - 100, fieldFont.fontSize, dateText, true);
      if (datePos) {
        content.push({
          text: normalizeText(dateText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: datePos,
        });
      }
    }

    // Province (only if enabled)
    if (layout.enabledFields?.includes('province') && data.student.curr_province) {
      const fieldFont = getFieldFont('province', 0.8);
      const provinceText = `Province: ${data.student.curr_province}`;
      const provincePos = getPosition(layout.provincePosition, pageWidth / 2, 520, fieldFont.fontSize, provinceText, true);
      if (provincePos) {
        content.push({
          text: normalizeText(provinceText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: provincePos,
        });
      }
    }

    // District (only if enabled)
    if (layout.enabledFields?.includes('district') && data.student.curr_district) {
      const fieldFont = getFieldFont('district', 0.8);
      const districtText = `District: ${data.student.curr_district}`;
      const districtPos = getPosition(layout.districtPosition, pageWidth / 2, 540, fieldFont.fontSize, districtText, true);
      if (districtPos) {
        content.push({
          text: normalizeText(districtText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: districtPos,
        });
      }
    }

    // Village (only if enabled)
    if (layout.enabledFields?.includes('village') && data.student.curr_village) {
      const fieldFont = getFieldFont('village', 0.8);
      const villageText = `Village: ${data.student.curr_village}`;
      const villagePos = getPosition(layout.villagePosition, pageWidth / 2, 560, fieldFont.fontSize, villageText, true);
      if (villagePos) {
        content.push({
          text: normalizeText(villageText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: villagePos,
        });
      }
    }

    // Nationality (only if enabled)
    if (layout.enabledFields?.includes('nationality') && data.student.nationality) {
      const fieldFont = getFieldFont('nationality', 0.8);
      const nationalityText = `Nationality: ${data.student.nationality}`;
      const nationalityPos = getPosition(layout.nationalityPosition, pageWidth / 2, 580, fieldFont.fontSize, nationalityText, true);
      if (nationalityPos) {
        content.push({
          text: normalizeText(nationalityText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: nationalityPos,
        });
      }
    }

    // Guardian Name (only if enabled)
    if (layout.enabledFields?.includes('guardianName') && data.student.guardian_name) {
      const fieldFont = getFieldFont('guardianName', 0.8);
      const guardianNameText = `Guardian: ${data.student.guardian_name}`;
      const guardianNamePos = getPosition(layout.guardianNamePosition, pageWidth / 2, 600, fieldFont.fontSize, guardianNameText, true);
      if (guardianNamePos) {
        content.push({
          text: normalizeText(guardianNameText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#4a5568',
          absolutePosition: guardianNamePos,
        });
      }
    }

    // Student Photo (only if enabled and picture_path exists)
    if (layout.enabledFields?.includes('studentPhoto') && data.student.picture_path) {
      const photoPos = layout.studentPhotoPosition;
      if (photoPos) {
        try {
          // Convert photo to base64
          const photoBase64 = await convertImageToBase64(`/api/course-students/${data.student.id}/picture`);
          if (photoBase64) {
            const photoWidth = photoPos.width ? (photoPos.width / 100) * pageWidth : 100;
            const photoHeight = photoPos.height ? (photoPos.height / 100) * pageHeight : 100;
            const photoX = (photoPos.x / 100) * pageWidth - photoWidth / 2;
            const photoY = (photoPos.y / 100) * pageHeight - photoHeight / 2;
            
            content.push({
              image: photoBase64,
              width: photoWidth,
              height: photoHeight,
              absolutePosition: { x: photoX, y: photoY },
            });
          }
        } catch (error) {
          console.warn('[CertificatePdfGenerator] Failed to load student photo:', error);
        }
      }
    }

    // Director Signature (only if enabled)
    if (layout.enabledFields?.includes('directorSignature')) {
      const fieldFont = getFieldFont('directorSignature', 0.4);
      const signatureText = layout.directorSignatureText !== undefined 
        ? layout.directorSignatureText 
        : 'Director Signature'; // Default text, empty string hides text
      
      // For signature block, we handle centering manually (150px wide block centered at position)
      // Use isCentered=false since we'll adjust X ourselves to center the 150px block
      const basePos = getPosition(layout.directorSignaturePosition, 150, pageHeight - 80, fieldFont.fontSize, undefined, false);
      if (basePos) {
        // Calculate block height (line + text if present)
        const textHeight = (signatureText && signatureText.trim() !== '') ? fieldFont.fontSize * 1.2 : 0;
        const blockHeight = 2 + textHeight; // 2pt for line, plus text height
        const signatureY = basePos.y - (blockHeight / 2); // Center the block at position
        
        const signatureElements: any[] = [
          { 
            canvas: [{ 
              type: 'line', 
              x1: 0, 
              y1: 0, 
              x2: 150, 
              y2: 0, 
              lineWidth: 1.5,
              lineColor: layout.textColor || '#000000',
            }] 
          },
        ];
        
        // Only add text if not empty
        if (signatureText && signatureText.trim() !== '') {
          signatureElements.push({
            text: normalizeText(signatureText), 
            fontSize: fieldFont.fontSize,
            font: fieldFont.fontFamily,
            color: layout.textColor || '#4a5568',
            margin: [0, 6, 0, 0],
            alignment: 'center',
          });
        }
        
        content.push({
          stack: signatureElements,
          absolutePosition: { x: basePos.x - 75, y: signatureY }, // Center horizontally, adjust Y for block
          width: 150,
        });
      }
    }

    // Official Seal (only if enabled)
    if (layout.enabledFields?.includes('officialSeal')) {
      const fieldFont = getFieldFont('officialSeal', 0.4);
      const sealText = layout.officialSealText !== undefined 
        ? layout.officialSealText 
        : 'Official Seal'; // Default text, empty string hides text
      
      // For seal block, we handle centering manually (150px wide block centered at position)
      // Use isCentered=false since we'll adjust X ourselves to center the 150px block
      const basePos = getPosition(layout.officialSealPosition, pageWidth - 150, pageHeight - 80, fieldFont.fontSize, undefined, false);
      if (basePos) {
        // Calculate block height (line + text if present)
        const textHeight = (sealText && sealText.trim() !== '') ? fieldFont.fontSize * 1.2 : 0;
        const blockHeight = 2 + textHeight; // 2pt for line, plus text height
        const sealY = basePos.y - (blockHeight / 2); // Center the block at position
        
        const sealElements: any[] = [
          { 
            canvas: [{ 
              type: 'line', 
              x1: 0, 
              y1: 0, 
              x2: 150, 
              y2: 0, 
              lineWidth: 1.5,
              lineColor: layout.textColor || '#000000',
            }] 
          },
        ];
        
        // Only add text if not empty
        if (sealText && sealText.trim() !== '') {
          sealElements.push({
            text: normalizeText(sealText), 
            fontSize: fieldFont.fontSize,
            font: fieldFont.fontFamily,
            color: layout.textColor || '#4a5568',
            margin: [0, 6, 0, 0],
            alignment: 'center',
          });
        }
        
        content.push({
          stack: sealElements,
          absolutePosition: { x: basePos.x - 75, y: sealY }, // Center horizontally, adjust Y for block
          width: 150,
        });
      }
    }

    return {
      pageSize: 'A4',
      pageOrientation: 'landscape' as const,
      pageMargins: [0, 0, 0, 0], // No margins - positions are relative to full page to match editor and image generator
      // pdfmake-arabic handles RTL automatically when direction is set
      ...(isRtl && { direction: 'rtl' }),
      content,
      styles: {
        header: {
          fontSize: 36,
          bold: true,
          color: layout.textColor || '#1a365d',
        },
        subtext: {
          fontSize: 16,
          color: '#4a5568',
        },
        studentName: {
          fontSize: 28,
          bold: true,
          color: layout.textColor || '#2d3748',
        },
        courseName: {
          fontSize: 24,
          bold: true,
          color: layout.textColor || '#1a365d',
        },
        details: {
          fontSize: 14,
          color: '#718096',
        },
        footer: {
          fontSize: 12,
          color: '#4a5568',
        },
        signatureLabel: {
          fontSize: 10,
          color: '#718096',
          alignment: 'center',
        },
      },
      defaultStyle: {
        font: defaultFontFamily, // Use font from layout config if registered, otherwise Roboto
      },
    };
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setSelectedTemplateId('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Generate Certificate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Student</Label>
                  <p className="font-medium">{studentName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Course</Label>
                  <p className="font-medium">{courseName}</p>
                </div>
                {certificateData?.student.certificate_number && (
                  <div>
                    <Label className="text-muted-foreground">Certificate Number</Label>
                    <p className="font-medium">{certificateData.student.certificate_number}</p>
                  </div>
                )}
                {certificateData?.student.certificate_issued_at && (
                  <div>
                    <Label className="text-muted-foreground">Issued At</Label>
                    <p className="font-medium">
                      {formatDate(certificateData.student.certificate_issued_at)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Select Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a certificate template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {templates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No active templates found. Please create a template first.
              </p>
            )}
          </div>

          {/* Template Preview */}
          {selectedTemplate && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{selectedTemplate.name}</h4>
                    {selectedTemplate.description && (
                      <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
                    )}
                  </div>
                  {selectedTemplate.background_image_path && (
                    <Badge variant="outline">
                      Has Background Image
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* PDF Preview */}
          {previewUrl && (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-96"
                title="Certificate Preview"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGeneratePdf(false)}
            disabled={!selectedTemplateId || isGenerating || dataLoading}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownloadImage()}
            disabled={!selectedTemplateId || isGenerating || dataLoading}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4 mr-2" />
            )}
            Download Image
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              if (!selectedTemplateId || !certificateData) return;
              setIsGenerating(true);
              try {
                // Generate certificate first if needed
                await generateCertificate.mutateAsync({
                  courseStudentId,
                  templateId: selectedTemplateId,
                });

                // Get updated certificate data
                const updatedData = await certificateTemplatesApi.getCertificateData(courseStudentId) as CertificateData;
                const backgroundUrl = updatedData?.background_url || certificateData.background_url;
                let backgroundImageBase64: string | null = null;
                if (backgroundUrl) {
                  backgroundImageBase64 = await convertImageToBase64(backgroundUrl);
                }

                const certificateImageDataUrl = await renderCertificateToDataUrl(
                  updatedData || certificateData,
                  selectedTemplate!,
                  backgroundImageBase64,
                  { scale: 2, mimeType: 'image/jpeg', quality: 0.95 }
                );

                const docDefinition = {
                  pageSize: 'A4',
                  pageOrientation: 'landscape' as const,
                  pageMargins: [0, 0, 0, 0],
                  content: [
                    {
                      image: certificateImageDataUrl,
                      width: 842,
                      height: 595,
                      absolutePosition: { x: 0, y: 0 },
                    },
                  ],
                };
                
                // Get the actual pdfMake instance
                const pdfMakeInstance = getPdfMakeInstance() || pdfMake;
                if (!pdfMakeInstance || typeof pdfMakeInstance.createPdf !== 'function') {
                  throw new Error('pdfMake.createPdf is not available for printing.');
                }
                
                pdfMakeInstance.createPdf(docDefinition).getBlob((blob) => {
                  // Open PDF in new window and print
                  const url = URL.createObjectURL(blob);
                  const printWindow = window.open(url, '_blank');
                  if (printWindow) {
                    printWindow.onload = () => {
                      setTimeout(() => {
                        printWindow.print();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      }, 500);
                    };
                  }
                  setIsGenerating(false);
                }, (error) => {
                  console.error('[CertificatePdfGenerator] Print failed:', error);
                  setIsGenerating(false);
                });
              } catch (error) {
                console.error('[CertificatePdfGenerator] Print failed:', error);
                setIsGenerating(false);
              }
            }}
            disabled={!selectedTemplateId || isGenerating || dataLoading}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Print
          </Button>
          <Button
            onClick={() => handleGeneratePdf(true)}
            disabled={!selectedTemplateId || isGenerating || dataLoading}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
