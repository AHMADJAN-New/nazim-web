import React, { useState, useEffect } from 'react';
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
import { Loader2, Download, Award, Eye, Image as ImageIcon } from 'lucide-react';
import { useCertificateTemplatesV2 } from '@/hooks/useGraduation';
import { certificateTemplatesV2Api, issuedCertificatesApi, apiClient } from '@/lib/api/client';
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

// Load custom fonts for Pashto/Arabic support
let fontsLoaded = false;
let fontsLoading: Promise<void> | null = null;

async function loadCustomFonts() {
  if (fontsLoaded) return;
  if (fontsLoading) return fontsLoading;
  
  fontsLoading = (async () => {
    try {
      const regularTtfModule = await import('@/fonts/ttf/Bahij Nassim-Regular.ttf?url');
      const boldTtfModule = await import('@/fonts/ttf/Bahij Nassim-Bold.ttf?url');
      
      const regularTtfUrl = regularTtfModule.default;
      const boldTtfUrl = boldTtfModule.default;
      
      const [regularResponse, boldResponse] = await Promise.all([
        fetch(regularTtfUrl).catch(() => null),
        fetch(boldTtfUrl).catch(() => null),
      ]);
      
      if (!regularResponse || !regularResponse.ok || !boldResponse || !boldResponse.ok) {
        if (import.meta.env.DEV) {
          console.warn('[GraduationCertificatePdfGenerator] TTF font files not found. Pashto/Arabic text will use Roboto font.');
        }
        fontsLoaded = false;
        return;
      }
      
      const [regularBlob, boldBlob] = await Promise.all([
        regularResponse.blob(),
        boldResponse.blob(),
      ]);
      
      const regularArrayBuffer = await regularBlob.arrayBuffer();
      const boldArrayBuffer = await boldBlob.arrayBuffer();
      
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
          console.warn('[GraduationCertificatePdfGenerator] Could not add fonts to VFS, using Roboto only');
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
          console.warn('[GraduationCertificatePdfGenerator] Could not register fonts, using Roboto only');
        }
        fontsLoaded = false;
        return;
      }
      
      fontsLoaded = true;
      if (import.meta.env.DEV) {
        console.log('[GraduationCertificatePdfGenerator] Custom fonts loaded successfully');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[GraduationCertificatePdfGenerator] Failed to load custom fonts:', error);
      }
      fontsLoaded = false;
    }
  })();
  
  return fontsLoading;
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

  // Load certificate data when dialog opens
  useEffect(() => {
    if (isOpen && certificateId) {
      setIsLoadingData(true);
      // Pass school_id as query parameter (backend will auto-select from certificate if not provided)
      issuedCertificatesApi.getCertificateData(certificateId, schoolId || undefined)
        .then((data) => {
          setCertificateData(data as GraduationCertificateData);
        })
        .catch((error) => {
          console.error('[GraduationCertificatePdfGenerator] Failed to load certificate data:', error);
          // If error is about school selection, it will be handled by the backend
        })
        .finally(() => {
          setIsLoadingData(false);
        });
    }
  }, [isOpen, certificateId, schoolId]);

  // Auto-select template based on school_id when dialog opens or templates/schoolId changes
  useEffect(() => {
    if (isOpen && templates.length > 0 && schoolId) {
      // Find template assigned to this school
      const schoolTemplate = templates.find((t) => t.school_id === schoolId);
      if (schoolTemplate && schoolTemplate.id !== selectedTemplateId) {
        setSelectedTemplateId(schoolTemplate.id);
      } else if (!schoolTemplate && selectedTemplateId === '') {
        // If no school-specific template, try to use first active template
        const activeTemplate = templates.find((t) => t.is_active);
        if (activeTemplate) {
          setSelectedTemplateId(activeTemplate.id);
        }
      }
    } else if (isOpen && templates.length > 0 && !schoolId && selectedTemplateId === '') {
      // If no schoolId provided, use first active template
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
      
      if (import.meta.env.DEV) {
        console.log('[GraduationCertificatePdfGenerator] Fetching background image from endpoint:', endpoint);
      }

      // Use apiClient.requestFile directly since certificateTemplatesV2Api doesn't have getBackgroundImage
      const { blob } = await apiClient.requestFile(endpoint, { method: 'GET' });

      if (!blob.type.startsWith('image/')) {
        console.warn('[GraduationCertificatePdfGenerator] Invalid image type:', blob.type);
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
    } catch (error) {
      console.error('[GraduationCertificatePdfGenerator] Error converting image to base64:', error);
      return null;
    }
  };

  const handleGeneratePdf = async (download: boolean = true) => {
    if (!selectedTemplateId || !certificateData) return;

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
        if (backgroundImageBase64) {
          if (import.meta.env.DEV) {
            console.log('[GraduationCertificatePdfGenerator] Background image loaded successfully');
          }
        } else {
          console.warn('[GraduationCertificatePdfGenerator] Failed to load background image');
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('[GraduationCertificatePdfGenerator] No background URL available');
        }
      }

      // Try to load custom fonts for Pashto/Arabic support
      try {
        await Promise.race([
          loadCustomFonts(),
          new Promise(resolve => setTimeout(resolve, 3000)), // Max 3 second wait
        ]);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[GraduationCertificatePdfGenerator] Font loading timed out or failed, using Roboto');
        }
        fontsLoaded = false;
      }

      // Build PDF document definition with base64 image
      const docDefinition = await buildPdfDocument(certificateData, selectedTemplate!, backgroundImageBase64);

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
        pdfMakeInstance.createPdf(docDefinition).getBlob((blob) => {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }, (error: Error) => {
          console.error('[GraduationCertificatePdfGenerator] PDF generation error:', error);
          throw error;
        });
      }
    } catch (error) {
      console.error('[GraduationCertificatePdfGenerator] Failed to generate PDF:', error);
      
      // If it's a font error, try again with Roboto only
      if (error instanceof Error && (error.message.includes('font') || error.message.includes('Font'))) {
        console.warn('[GraduationCertificatePdfGenerator] Font error - retrying with Roboto only');
        
        try {
          fontsLoaded = false;
          
          if (!backgroundImageBase64) {
            const backgroundUrl = certificateData.background_url;
            if (backgroundUrl) {
              backgroundImageBase64 = await convertImageToBase64(backgroundUrl);
            }
          }
          
          const docDefinition = await buildPdfDocument(certificateData, selectedTemplate!, backgroundImageBase64);
          
          // Get the actual pdfMake instance
          const pdfMakeInstance = getPdfMakeInstance() || pdfMake;
          if (!pdfMakeInstance || typeof pdfMakeInstance.createPdf !== 'function') {
            throw new Error('pdfMake.createPdf is not available in retry.');
          }
          
          if (download) {
            pdfMakeInstance.createPdf(docDefinition).download(
              `certificate-${certificateData.certificate.certificate_no || certificateId}.pdf`
            );
          } else {
            pdfMakeInstance.createPdf(docDefinition).getBlob((blob) => {
              const url = URL.createObjectURL(blob);
              setPreviewUrl(url);
            }, (error: Error) => {
              console.error('[GraduationCertificatePdfGenerator] PDF generation error:', error);
              throw error;
            });
          }
        } catch (retryError) {
          console.error('[GraduationCertificatePdfGenerator] Retry also failed:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const buildPdfDocument = async (
    data: GraduationCertificateData,
    template: GraduationCertificateTemplate,
    backgroundImageBase64: string | null = null
  ) => {
    if (!data) return { content: [] };

    const layout = template.layout_config || {};
    const isRtl = layout.rtl !== false; // Default to RTL for Pashto/Arabic
    
    const normalizeText = (text: string): string => {
      if (!text) return '';
      return String(text).trim().normalize('NFC');
    };

    // Get the actual pdfMake instance for font checks
    const pdfMakeInstance = getPdfMakeInstance() || pdfMake;
    
    let defaultFontFamily = 'Roboto';
    if (isRtl && fontsLoaded && (pdfMakeInstance as any).fonts?.['BahijNassim']) {
      defaultFontFamily = 'BahijNassim';
    } else if (layout.fontFamily && ((pdfMakeInstance as any).fonts?.[layout.fontFamily] || (pdfMakeInstance as any).fonts?.['Arial'])) {
      defaultFontFamily = layout.fontFamily;
    }
    
    const baseFontSize = layout.fontSize || 24;
    
    const getFieldFont = (fieldId: string, defaultMultiplier: number) => {
      const fieldFont = layout.fieldFonts?.[fieldId];
      const fieldFontSize = fieldFont?.fontSize !== undefined 
        ? fieldFont.fontSize 
        : baseFontSize * defaultMultiplier;
      
      let fieldFontFamily = defaultFontFamily;
      if (fieldFont?.fontFamily) {
        const requestedFont = fieldFont.fontFamily;
        if ((pdfMakeInstance as any).fonts?.[requestedFont]) {
          fieldFontFamily = requestedFont;
        } else if (requestedFont === 'Bahij Nassim' && (pdfMakeInstance as any).fonts?.['BahijNassim']) {
          fieldFontFamily = 'BahijNassim';
        } else if ((pdfMakeInstance as any).fonts?.['Roboto']) {
          fieldFontFamily = 'Roboto';
        }
      }
      
      return { fontSize: fieldFontSize, fontFamily: fieldFontFamily };
    };

    const content: any[] = [];

    const pageWidth = 842;
    const pageHeight = 595;

    // Add background image
    if (backgroundImageBase64) {
      content.push({
        image: backgroundImageBase64,
        width: pageWidth,
        height: pageHeight,
        absolutePosition: { x: 0, y: 0 },
        zIndex: 0,
      });
    }

    const getPosition = (position?: { x: number; y: number }, defaultX?: number, defaultY?: number, fontSize?: number) => {
      if (position) {
        const x = (position.x / 100) * pageWidth;
        const lineHeight = fontSize ? fontSize * 1.2 : 0;
        const y = (position.y / 100) * pageHeight - (lineHeight / 2);
        return { x, y };
      }
      if (defaultX !== undefined && defaultY !== undefined) {
        const lineHeight = fontSize ? fontSize * 1.2 : 0;
        return { x: defaultX, y: defaultY - (lineHeight / 2) };
      }
      return null;
    };

    // Header
    if (layout.enabledFields?.includes('header')) {
      const fieldFont = getFieldFont('header', 1.5);
      const headerPos = getPosition(layout.headerPosition, pageWidth / 2, 120, fieldFont.fontSize);
      if (headerPos) {
        const headerText = layout.headerText || 'Graduation Certificate';
        content.push({
          text: normalizeText(headerText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#1a365d',
          absolutePosition: headerPos,
          alignment: 'center',
        });
      }
    }

    // Student name
    if (layout.enabledFields?.includes('studentName') && data.student) {
      const fieldFont = getFieldFont('studentName', 1.17);
      const studentNamePos = getPosition(layout.studentNamePosition, pageWidth / 2, 300, fieldFont.fontSize);
      if (studentNamePos) {
        content.push({
          text: normalizeText(data.student.full_name),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#2d3748',
          absolutePosition: studentNamePos,
          alignment: 'center',
        });
      }
    }

    // Father name
    if (layout.enabledFields?.includes('fatherName') && data.student?.father_name) {
      const fieldFont = getFieldFont('fatherName', 1.0);
      const fatherNamePos = getPosition(layout.fatherNamePosition, pageWidth / 2, 360, fieldFont.fontSize);
      if (fatherNamePos) {
        content.push({
          text: normalizeText(data.student.father_name),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: fatherNamePos,
          alignment: 'center',
        });
      }
    }

    // Grandfather name
    if (layout.enabledFields?.includes('grandfatherName') && data.student?.grandfather_name) {
      const fieldFont = getFieldFont('grandfatherName', 0.9);
      const grandfatherNamePos = getPosition(layout.grandfatherNamePosition, pageWidth / 2, 380, fieldFont.fontSize);
      if (grandfatherNamePos) {
        content.push({
          text: normalizeText(data.student.grandfather_name),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: grandfatherNamePos,
          alignment: 'center',
        });
      }
    }

    // Mother name
    if (layout.enabledFields?.includes('motherName') && data.student?.mother_name) {
      const fieldFont = getFieldFont('motherName', 0.9);
      const motherNamePos = getPosition(layout.motherNamePosition, pageWidth / 2, 400, fieldFont.fontSize);
      if (motherNamePos) {
        content.push({
          text: normalizeText(data.student.mother_name),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: motherNamePos,
          alignment: 'center',
        });
      }
    }

    // Class name
    if (layout.enabledFields?.includes('className') && data.class) {
      const fieldFont = getFieldFont('className', 1.0);
      const classNamePos = getPosition(layout.classNamePosition, pageWidth / 2, 480, fieldFont.fontSize);
      if (classNamePos) {
        const classNameText = layout.classNameText 
          ? `${layout.classNameText} ${data.class.name}`
          : data.class.name;
        content.push({
          text: normalizeText(classNameText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#1a365d',
          absolutePosition: classNamePos,
          alignment: 'center',
        });
      }
    }

    // School name
    if (layout.enabledFields?.includes('schoolName') && data.school) {
      const fieldFont = getFieldFont('schoolName', 0.83);
      const schoolNamePos = getPosition(layout.schoolNamePosition, pageWidth / 2, 500, fieldFont.fontSize);
      if (schoolNamePos) {
        content.push({
          text: normalizeText(data.school.school_name),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#1a365d',
          absolutePosition: schoolNamePos,
          alignment: 'center',
        });
      }
    }

    // Academic year
    if (layout.enabledFields?.includes('academicYear') && data.academicYear) {
      const fieldFont = getFieldFont('academicYear', 0.75);
      const academicYearPos = getPosition(layout.academicYearPosition, pageWidth / 2, 520, fieldFont.fontSize);
      if (academicYearPos) {
        content.push({
          text: normalizeText(data.academicYear.name),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#1a365d',
          absolutePosition: academicYearPos,
          alignment: 'center',
        });
      }
    }

    // Graduation date
    if (layout.enabledFields?.includes('graduationDate') && data.batch?.graduation_date) {
      const fieldFont = getFieldFont('graduationDate', 0.58);
      const graduationDatePos = getPosition(layout.graduationDatePosition, pageWidth / 2, 540, fieldFont.fontSize);
      if (graduationDatePos) {
        const dateLabel = layout.graduationDateText || 'Date:';
        const formattedDate = format(new Date(data.batch.graduation_date), 'MMM d, yyyy');
        const dateText = `${dateLabel} ${formattedDate}`;
        content.push({
          text: normalizeText(dateText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: graduationDatePos,
          alignment: isRtl ? 'left' : 'right',
        });
      }
    }

    // Certificate number
    if (layout.enabledFields?.includes('certificateNumber')) {
      const fieldFont = getFieldFont('certificateNumber', 0.5);
      const certNumberPos = getPosition(layout.certificateNumberPosition, 100, pageHeight - 100, fieldFont.fontSize);
      if (certNumberPos) {
        const certText = `Certificate No: ${data.certificate.certificate_no || 'N/A'}`;
        content.push({
          text: normalizeText(certText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: certNumberPos,
          alignment: isRtl ? 'right' : 'left',
        });
      }
    }

    // Position
    if (layout.enabledFields?.includes('position') && data.position) {
      const fieldFont = getFieldFont('position', 0.58);
      const positionPos = getPosition(layout.positionPosition, pageWidth - 100, pageHeight - 120, fieldFont.fontSize);
      if (positionPos) {
        content.push({
          text: normalizeText(`Position: ${data.position}`),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: positionPos,
          alignment: isRtl ? 'left' : 'right',
        });
      }
    }

    // Province
    if (layout.enabledFields?.includes('province') && data.student?.curr_province) {
      const fieldFont = getFieldFont('province', 0.8);
      const provincePos = getPosition(layout.provincePosition, pageWidth / 2, 520, fieldFont.fontSize);
      if (provincePos) {
        content.push({
          text: normalizeText(`Province: ${data.student.curr_province}`),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: provincePos,
          alignment: 'center',
        });
      }
    }

    // District
    if (layout.enabledFields?.includes('district') && data.student?.curr_district) {
      const fieldFont = getFieldFont('district', 0.8);
      const districtPos = getPosition(layout.districtPosition, pageWidth / 2, 540, fieldFont.fontSize);
      if (districtPos) {
        content.push({
          text: normalizeText(`District: ${data.student.curr_district}`),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: districtPos,
          alignment: 'center',
        });
      }
    }

    // Village
    if (layout.enabledFields?.includes('village') && data.student?.curr_village) {
      const fieldFont = getFieldFont('village', 0.8);
      const villagePos = getPosition(layout.villagePosition, pageWidth / 2, 560, fieldFont.fontSize);
      if (villagePos) {
        content.push({
          text: normalizeText(`Village: ${data.student.curr_village}`),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: villagePos,
          alignment: 'center',
        });
      }
    }

    // Nationality
    if (layout.enabledFields?.includes('nationality') && data.student?.nationality) {
      const fieldFont = getFieldFont('nationality', 0.8);
      const nationalityPos = getPosition(layout.nationalityPosition, pageWidth / 2, 580, fieldFont.fontSize);
      if (nationalityPos) {
        content.push({
          text: normalizeText(`Nationality: ${data.student.nationality}`),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: nationalityPos,
          alignment: 'center',
        });
      }
    }

    // Guardian Name
    if (layout.enabledFields?.includes('guardianName') && data.student?.guardian_name) {
      const fieldFont = getFieldFont('guardianName', 0.8);
      const guardianNamePos = getPosition(layout.guardianNamePosition, pageWidth / 2, 600, fieldFont.fontSize);
      if (guardianNamePos) {
        content.push({
          text: normalizeText(`Guardian: ${data.student.guardian_name}`),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: guardianNamePos,
          alignment: 'center',
        });
      }
    }

    // Student Photo
    if (layout.enabledFields?.includes('studentPhoto') && data.student?.picture_path) {
      const photoPos = layout.studentPhotoPosition;
      if (photoPos) {
        try {
          const photoBase64 = await convertImageToBase64(`/api/students/${data.student.id}/picture`);
          if (photoBase64) {
            const photoWidth = photoPos.width ? (photoPos.width / 100) * pageWidth : 100;
            const photoHeight = photoPos.height ? (photoPos.height / 100) * pageHeight : 100;
            const photoX = (photoPos.x / 100) * pageWidth;
            const photoY = (photoPos.y / 100) * pageHeight;
            
            content.push({
              image: photoBase64,
              width: photoWidth,
              height: photoHeight,
              absolutePosition: { x: photoX, y: photoY },
            });
          }
        } catch (error) {
          console.warn('[GraduationCertificatePdfGenerator] Failed to load student photo:', error);
        }
      }
    }

    // QR Code
    if (layout.enabledFields?.includes('qrCode') && data.qr_code) {
      const qrPos = layout.qrCodePosition;
      if (qrPos) {
        try {
          const qrWidth = qrPos.width ? (qrPos.width / 100) * pageWidth : 120;
          const qrHeight = qrPos.height ? (qrPos.height / 100) * pageHeight : 120;
          const qrX = (qrPos.x / 100) * pageWidth;
          const qrY = (qrPos.y / 100) * pageHeight;
          
          content.push({
            image: data.qr_code,
            width: qrWidth,
            height: qrHeight,
            absolutePosition: { x: qrX, y: qrY },
          });
        } catch (error) {
          console.warn('[GraduationCertificatePdfGenerator] Failed to load QR code:', error);
        }
      }
    }

    // Signature lines
    content.push({
      columns: [
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
            { text: 'Director Signature', style: 'signatureLabel', margin: [0, 5, 0, 0] },
          ],
          width: 'auto',
        },
        { text: '', width: '*' },
        {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
            { text: 'Official Seal', style: 'signatureLabel', margin: [0, 5, 0, 0] },
          ],
          width: 'auto',
        },
      ],
      margin: [50, 60, 50, 0],
    });

    return {
      pageSize: 'A4',
      pageOrientation: 'landscape' as const,
      pageMargins: [0, 0, 0, 0],
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
        font: defaultFontFamily,
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
                        {format(new Date(certificateData.certificate.issued_at), 'MMM d, yyyy')}
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

        <DialogFooter className="gap-2">
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

