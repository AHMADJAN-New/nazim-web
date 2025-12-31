import React, { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
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
import { useCertificateTemplatesV2 } from '@/hooks/useGraduation';
import { issuedCertificatesApi, apiClient } from '@/lib/api/client';

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
        console.warn('[GraduationCertificatePdfGenerator] Could not create vfs, object may not be extensible');
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
        console.warn('[GraduationCertificatePdfGenerator] Could not merge fonts into vfs, may already be initialized');
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
        console.warn('[GraduationCertificatePdfGenerator] Could not create fonts object, may already exist');
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
  console.error('[GraduationCertificatePdfGenerator] Failed to initialize pdfmake fonts:', error);
}

interface GraduationCertificateTemplate {
  id: string;
  name: string;
  title: string;
  description: string | null;
  layout_config: any;
  background_image_path: string | null;
  school_id: string | null;
  is_active: boolean;
}

interface GraduationCertificateData {
  certificate: {
    id: string;
    certificate_no: string;
    issued_at: string;
    verification_hash: string;
    qr_payload: string | null;
  };
  student: {
    id: string;
    full_name: string;
    father_name: string | null;
    grandfather_name: string | null;
    mother_name: string | null;
    guardian_name: string | null;
    curr_province: string | null;
    curr_district: string | null;
    curr_village: string | null;
    nationality: string | null;
    picture_path: string | null;
  } | null;
  batch: {
    id: string;
    graduation_date: string | null;
  } | null;
  class: {
    id: string;
    name: string;
  } | null;
  academicYear: {
    id: string;
    name: string;
  } | null;
  school: {
    id: string;
    school_name: string;
  } | null;
  position: string | null;
  background_url: string | null;
  qr_code: string | null;
  verification_url: string;
  template: {
    id: string;
    layout_config: any;
  } | null;
}

interface GraduationCertificatePdfGeneratorProps {
  certificateId: string;
  schoolId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function GraduationCertificatePdfGenerator({
  certificateId,
  schoolId,
  isOpen,
  onClose,
}: GraduationCertificatePdfGeneratorProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [certificateData, setCertificateData] = useState<GraduationCertificateData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const { data: templates = [] } = useCertificateTemplatesV2({ type: 'graduation', school_id: schoolId });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) as GraduationCertificateTemplate | undefined;

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
          console.log('[GraduationCertificatePdfGenerator] Canvas fonts loaded: Bahij Nassim (400/700)');
        }
      } catch (e) {
        // Not fatal: browser will fall back to installed fonts
        canvasFontsLoaded = false;
        if (import.meta.env.DEV) {
          console.warn('[GraduationCertificatePdfGenerator] Failed to load canvas fonts, using fallbacks');
        }
      }
    })();

    return canvasFontsLoading;
  };

  /**
   * Render certificate to a high-res canvas and return a dataURL.
   *
   * IMPORTANT:
   * - Layout designer & preview are Canvas-based (browser text shaping + RTL).
   * - pdfmake text positioning/RTL shaping can differ and cause drift.
   * - For "exactly like preview" PDFs, we embed the rendered canvas image into the PDF.
   */
  const renderCertificateToDataUrl = async (
    data: GraduationCertificateData,
    template: GraduationCertificateTemplate,
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
      const rawFontSize = fieldFont?.fontSize !== undefined
          ? fieldFont.fontSize
          : baseFontSize * defaultMultiplier;

      // Apply legacy preview scaling so exports match the editor display
      const fieldFontSize = rawFontSize * fontScale;

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
        const headerText = layout.headerText || 'Graduation Certificate';
        drawText(headerText, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Student name
    if (layout.enabledFields?.includes('studentName') && data.student) {
      const pos = getPixelPosition(layout.studentNamePosition, baseWidth / 2, 300);
      if (pos) {
        const fieldFont = getFieldFont('studentName', 1.17);
        drawText(data.student.full_name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Father name
    if (layout.enabledFields?.includes('fatherName') && data.student?.father_name) {
      const pos = getPixelPosition(layout.fatherNamePosition, baseWidth / 2, 360);
      if (pos) {
        const fieldFont = getFieldFont('fatherName', 1.0);
        drawText(data.student.father_name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Grandfather name
    if (layout.enabledFields?.includes('grandfatherName') && data.student?.grandfather_name) {
      const pos = getPixelPosition(layout.grandfatherNamePosition, baseWidth / 2, 380);
      if (pos) {
        const fieldFont = getFieldFont('grandfatherName', 0.9);
        drawText(data.student.grandfather_name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Mother name
    if (layout.enabledFields?.includes('motherName') && data.student?.mother_name) {
      const pos = getPixelPosition(layout.motherNamePosition, baseWidth / 2, 400);
      if (pos) {
        const fieldFont = getFieldFont('motherName', 0.9);
        drawText(data.student.mother_name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Class name
    if (layout.enabledFields?.includes('className') && data.class) {
      const pos = getPixelPosition(layout.classNamePosition, baseWidth / 2, 480);
      if (pos) {
        const fieldFont = getFieldFont('className', 1.0);
        const classNameText = layout.classNameText
          ? `${layout.classNameText} ${data.class.name}`
          : data.class.name;
        drawText(classNameText, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // School name
    if (layout.enabledFields?.includes('schoolName') && data.school) {
      const pos = getPixelPosition(layout.schoolNamePosition, baseWidth / 2, 500);
      if (pos) {
        const fieldFont = getFieldFont('schoolName', 0.83);
        drawText(data.school.school_name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Academic year
    if (layout.enabledFields?.includes('academicYear') && data.academicYear) {
      const pos = getPixelPosition(layout.academicYearPosition, baseWidth / 2, 520);
      if (pos) {
        const fieldFont = getFieldFont('academicYear', 0.75);
        drawText(data.academicYear.name, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Graduation date
    if (layout.enabledFields?.includes('graduationDate') && data.batch?.graduation_date) {
      const pos = getPixelPosition(layout.graduationDatePosition, baseWidth - 100, baseHeight - 100);
      if (pos) {
        const fieldFont = getFieldFont('graduationDate', 0.5);
        const dateLabel = layout.graduationDateText || 'Date:';
        const formattedDate = formatDate(data.batch.graduation_date);
        const dateText = `${dateLabel} ${formattedDate}`;
        drawText(dateText, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
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
          ? `${certPrefix} ${data.certificate.certificate_no || 'N/A'}`
          : data.certificate.certificate_no || 'N/A';
        drawText(certText, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, isRtl ? 'right' : 'left');
      }
    }

    // Position
    if (layout.enabledFields?.includes('position') && data.position) {
      const pos = getPixelPosition(layout.positionPosition, baseWidth - 100, baseHeight - 120);
      if (pos) {
        const fieldFont = getFieldFont('position', 0.58);
        drawText(`Position: ${data.position}`, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, isRtl ? 'left' : 'right');
      }
    }

    // Province
    if (layout.enabledFields?.includes('province') && data.student?.curr_province) {
      const pos = getPixelPosition(layout.provincePosition, baseWidth / 2, 520);
      if (pos) {
        const fieldFont = getFieldFont('province', 0.5);
        drawText(`Province: ${data.student.curr_province}`, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // District
    if (layout.enabledFields?.includes('district') && data.student?.curr_district) {
      const pos = getPixelPosition(layout.districtPosition, baseWidth / 2, 540);
      if (pos) {
        const fieldFont = getFieldFont('district', 0.5);
        drawText(`District: ${data.student.curr_district}`, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Village
    if (layout.enabledFields?.includes('village') && data.student?.curr_village) {
      const pos = getPixelPosition(layout.villagePosition, baseWidth / 2, 560);
      if (pos) {
        const fieldFont = getFieldFont('village', 0.5);
        drawText(`Village: ${data.student.curr_village}`, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Nationality
    if (layout.enabledFields?.includes('nationality') && data.student?.nationality) {
      const pos = getPixelPosition(layout.nationalityPosition, baseWidth / 2, 580);
      if (pos) {
        const fieldFont = getFieldFont('nationality', 0.5);
        drawText(`Nationality: ${data.student.nationality}`, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Guardian Name
    if (layout.enabledFields?.includes('guardianName') && data.student?.guardian_name) {
      const pos = getPixelPosition(layout.guardianNamePosition, baseWidth / 2, 600);
      if (pos) {
        const fieldFont = getFieldFont('guardianName', 0.58);
        drawText(`Guardian: ${data.student.guardian_name}`, pos.x, pos.y, fieldFont.fontSize * scale, fieldFont.fontFamily, 'center');
      }
    }

    // Student Photo
    if (layout.enabledFields?.includes('studentPhoto') && data.student?.id) {
      const photoPos = layout.studentPhotoPosition;
      const pos = getPixelPosition(photoPos, 150, baseHeight / 2);
      if (pos) {
        try {
          const photoBase64 = await convertImageToBase64(`/api/students/${data.student.id}/picture`);
          if (photoBase64) {
            const photoImg = new Image();
            await new Promise((resolve, reject) => {
              photoImg.onload = () => resolve(null);
              photoImg.onerror = reject;
              photoImg.src = photoBase64;
            });

            // Use saved width/height from config, or default 6% width x 10% height (passport size)
            const photoWidthPercent = photoPos?.width ?? 6;
            const photoHeightPercent = photoPos?.height ?? 10;
            const photoWidth = (photoWidthPercent / 100) * baseWidth;
            const photoHeight = (photoHeightPercent / 100) * baseHeight;

            // Positions in the layout designer are CENTER-based, so draw image centered.
            const drawX = pos.x - photoWidth / 2;
            const drawY = pos.y - photoHeight / 2;
            ctx.drawImage(photoImg, drawX, drawY, photoWidth, photoHeight);
          }
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn('[GraduationCertificatePdfGenerator] Failed to render student photo:', e);
          }
        }
      }
    }

    // QR Code
    if (layout.enabledFields?.includes('qrCode')) {
      const qrPos = layout.qrCodePosition;
      const pos = getPixelPosition(qrPos, baseWidth - 150, baseHeight / 2);
      if (pos) {
        // Use default 12% x 12% if width/height not specified
        // QR codes should always be square - use the smaller dimension to prevent stretching
        const qrWidth = qrPos?.width ? (qrPos.width / 100) * baseWidth : (12 / 100) * baseWidth;
        const qrHeight = qrPos?.height ? (qrPos.height / 100) * baseHeight : (12 / 100) * baseHeight;
        const qrSizePx = Math.round(Math.min(qrWidth, qrHeight));

        // Determine QR code value based on config
        const source = layout.qrCodeValueSource || 'verification_url';
        const qrValue =
          source === 'student_id'
            ? data.student?.id || ''
            : source === 'certificate_number'
              ? data.certificate.certificate_no
              : data.verification_url;

        try {
          const qrDataUrl = await generateQrCodeDataUrl(qrValue, qrSizePx);
          const qrImg = new Image();
          await new Promise((resolve, reject) => {
            qrImg.onload = () => resolve(null);
            qrImg.onerror = reject;
            qrImg.src = qrDataUrl;
          });

          // Center-based draw - Use square size for QR code to prevent stretching
          const drawX = pos.x - qrSizePx / 2;
          const drawY = pos.y - qrSizePx / 2;
          ctx.drawImage(qrImg, drawX, drawY, qrSizePx, qrSizePx);
        } catch (e) {
          if (import.meta.env.DEV) {
            console.warn('[GraduationCertificatePdfGenerator] Failed to render QR code:', e);
          }
        }
      }
    }

    if (mimeType === 'image/png') {
      return canvas.toDataURL('image/png');
    }
    return canvas.toDataURL('image/jpeg', quality);
  };

  // Load certificate data when dialog opens
  useEffect(() => {
    if (isOpen && certificateId) {
      setIsLoadingData(true);
      issuedCertificatesApi.getCertificateData(certificateId, schoolId || undefined)
        .then((data) => {
          setCertificateData(data as GraduationCertificateData);
        })
        .catch((error) => {
          console.error('[GraduationCertificatePdfGenerator] Failed to load certificate data:', error);
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    }
  }, [isOpen, certificateId, schoolId]);

  // Auto-select template based on school_id when dialog opens or templates/schoolId changes
  useEffect(() => {
    if (isOpen && templates.length > 0 && schoolId) {
      const schoolTemplate = templates.find((t) => t.school_id === schoolId);
      if (schoolTemplate && schoolTemplate.id !== selectedTemplateId) {
        setSelectedTemplateId(schoolTemplate.id);
      } else if (!schoolTemplate && selectedTemplateId === '') {
        const activeTemplate = templates.find((t) => t.is_active);
        if (activeTemplate) {
          setSelectedTemplateId(activeTemplate.id);
        }
      }
    } else if (isOpen && templates.length > 0 && !schoolId && selectedTemplateId === '') {
      const activeTemplate = templates.find((t) => t.is_active);
      if (activeTemplate) {
        setSelectedTemplateId(activeTemplate.id);
      }
    }
  }, [isOpen, templates, schoolId, selectedTemplateId]);

  // Helper function to convert image URL to base64 data URL
  const convertImageToBase64 = async (url: string | null): Promise<string | null> => {
    if (!url) return null;

    if (url.startsWith('data:image/')) {
      return url;
    }

    try {
      let endpoint = url;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        endpoint = urlObj.pathname;
      }

      if (endpoint.startsWith('/api')) {
        endpoint = endpoint.replace('/api', '');
      }

      // For student pictures, fetch directly with authentication
      if (endpoint.includes('/students/') && endpoint.includes('/picture')) {
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
          return null;
        }

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
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
        const { blob } = await apiClient.requestFile(endpoint, { method: 'GET' });

        if (!blob.type.startsWith('image/')) {
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
      console.error('[GraduationCertificatePdfGenerator] Error converting image to base64:', error);
      return null;
    }
  };

  // Helper to convert data URL to Blob (for downloading images)
  const dataURLtoBlob = async (dataUrl: string): Promise<Blob> => {
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
    if (!selectedTemplateId || !certificateData || !selectedTemplate) return;

    setIsGenerating(true);

    let backgroundImageBase64: string | null = null;

    try {
      // Convert background image URL to base64 if available
      const backgroundUrl = certificateData.background_url;

      if (backgroundUrl) {
        if (import.meta.env.DEV) {
          console.log('[GraduationCertificatePdfGenerator] Loading background image from:', backgroundUrl);
        }
        backgroundImageBase64 = await convertImageToBase64(backgroundUrl);
      }

      // Build a PDF from the same Canvas render used for image preview.
      // This makes PDF match layout preview EXACTLY and fixes RTL ordering/shaping issues.
      const certificateImageDataUrl = await renderCertificateToDataUrl(
        certificateData,
        selectedTemplate,
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
          `certificate-${certificateData.certificate.certificate_no || certificateId}.pdf`
        );
      } else {
        // Preview
        pdfMakeInstance.createPdf(docDefinition).getBlob((blob: Blob) => {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }, (error: Error) => {
          console.error('[GraduationCertificatePdfGenerator] PDF generation error:', error);
          throw error;
        });
      }
    } catch (error) {
      console.error('[GraduationCertificatePdfGenerator] Failed to generate PDF:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!selectedTemplateId || !certificateData || !selectedTemplate) return;

    setIsGenerating(true);
    try {
      // Convert background image URL to base64 if available
      let backgroundImageBase64: string | null = null;
      const backgroundUrl = certificateData.background_url;

      if (backgroundUrl) {
        backgroundImageBase64 = await convertImageToBase64(backgroundUrl);
      }

      // Generate and download image using the SAME renderer as PDF (ensures perfect match)
      const dataUrl = await renderCertificateToDataUrl(
        certificateData,
        selectedTemplate,
        backgroundImageBase64,
        { scale: 1, mimeType: 'image/jpeg', quality: 0.95 }
      );

      // Convert data URI directly to blob (can't fetch data URIs due to CSP)
      const blob = await dataURLtoBlob(dataUrl);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${certificateData.certificate.certificate_no || certificateId}.jpg`;
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

  const handlePrint = async () => {
    if (!selectedTemplateId || !certificateData || !selectedTemplate) return;

    setIsGenerating(true);
    try {
      // Convert background image URL to base64 if available
      let backgroundImageBase64: string | null = null;
      const backgroundUrl = certificateData.background_url;

      if (backgroundUrl) {
        backgroundImageBase64 = await convertImageToBase64(backgroundUrl);
      }

      // Generate image for printing
      const dataUrl = await renderCertificateToDataUrl(
        certificateData,
        selectedTemplate,
        backgroundImageBase64,
        { scale: 2, mimeType: 'image/jpeg', quality: 0.95 }
      );

      // Open print dialog with the image
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Print Certificate</title>
            <style>
              @page { size: A4 landscape; margin: 0; }
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Certificate" onload="window.print(); window.close();" />
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error('Failed to print certificate:', error);
    } finally {
      setIsGenerating(false);
    }
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
            Generate Graduation Certificate
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          {certificateData && (
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Student</Label>
                    <p className="font-medium">{certificateData.student?.full_name || 'N/A'}</p>
                  </div>
                  {certificateData.class && (
                    <div>
                      <Label className="text-muted-foreground">Class</Label>
                      <p className="font-medium">{certificateData.class.name}</p>
                    </div>
                  )}
                  {certificateData.certificate.certificate_no && (
                    <div>
                      <Label className="text-muted-foreground">Certificate Number</Label>
                      <p className="font-medium">{certificateData.certificate.certificate_no}</p>
                    </div>
                  )}
                  {certificateData.certificate.issued_at && (
                    <div>
                      <Label className="text-muted-foreground">Issued At</Label>
                      <p className="font-medium">
                        {formatDate(certificateData.certificate.issued_at)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
                      {template.name || template.title}
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
                    <h4 className="font-medium">{selectedTemplate.name || selectedTemplate.title}</h4>
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

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleGeneratePdf(false)}
            disabled={!selectedTemplateId || isGenerating || isLoadingData}
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
            onClick={handleDownloadImage}
            disabled={!selectedTemplateId || isGenerating || isLoadingData}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4 mr-2" />
            )}
            Image
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={!selectedTemplateId || isGenerating || isLoadingData}
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
            disabled={!selectedTemplateId || isGenerating || isLoadingData}
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
