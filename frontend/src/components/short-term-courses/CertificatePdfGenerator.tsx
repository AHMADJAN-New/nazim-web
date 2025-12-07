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
import {
  useCertificateTemplates,
  useGenerateCertificate,
  useCertificateData,
  CertificateTemplate,
  type CertificateData,
} from '@/hooks/useCertificateTemplates';
import { certificateTemplatesApi } from '@/lib/api/client';
import { format } from 'date-fns';

// Import pdfmake for Arabic support
import pdfMake from 'pdfmake-arabic/build/pdfmake';
import * as pdfFonts from 'pdfmake-arabic/build/vfs_fonts';

// Set up fonts for Arabic/Pashto support
try {
  // Initialize VFS
  if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
  } else if (pdfFonts && (pdfFonts as any).vfs) {
    pdfMake.vfs = (pdfFonts as any).vfs;
  }

  // Register fonts properly - pdfmake-arabic includes Roboto by default
  if (!pdfMake.fonts) {
    pdfMake.fonts = {};
  }

  // Check what fonts are available in VFS
  const vfs = pdfMake.vfs || {};
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
  if (!pdfMake.fonts!['Roboto']) {
    pdfMake.fonts!['Roboto'] = {
      normal: robotoRegular,
      bold: robotoBold,
      italics: robotoItalic,
      bolditalics: robotoBoldItalic,
    };
  }

  // Register Arial as an alias to Roboto (since Arial might be requested but not available)
  // Use the same font configuration as Roboto
  if (!pdfMake.fonts!['Arial']) {
    const robotoFont = pdfMake.fonts!['Roboto'];
    pdfMake.fonts!['Arial'] = {
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
      if (!pdfMake.vfs) {
        pdfMake.vfs = {};
      }
      
      pdfMake.vfs['BahijNassim-Regular.ttf'] = regularBase64Data;
      pdfMake.vfs['BahijNassim-Bold.ttf'] = boldBase64Data;
      
      // Register fonts with pdfmake (reference VFS paths)
      if (!pdfMake.fonts) {
        pdfMake.fonts = {};
      }
      
      pdfMake.fonts['BahijNassim'] = {
        normal: 'BahijNassim-Regular.ttf',
        bold: 'BahijNassim-Bold.ttf',
      };
      
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
        console.log('[CertificatePdfGenerator] Fetching background image from endpoint:', endpoint);
      }

      // Use API client's requestFile method to include authentication
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
    } catch (error) {
      console.error('[CertificatePdfGenerator] Error converting image to base64:', error);
      return null;
    }
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

      // Try to load custom fonts for Pashto/Arabic support
      // Wait a bit for fonts to load, but don't block if they fail
      try {
        await Promise.race([
          loadCustomFonts(),
          new Promise(resolve => setTimeout(resolve, 3000)), // Max 3 second wait
        ]);
      } catch (error) {
        // Silently fail - we'll use Roboto as fallback
        if (import.meta.env.DEV) {
          console.warn('[CertificatePdfGenerator] Font loading timed out or failed, using Roboto');
        }
        fontsLoaded = false;
      }

      // Build PDF document definition with base64 image
      const docDefinition = await buildPdfDocument(updatedCertificateData || certificateData, selectedTemplate!, backgroundImageBase64);

      if (download) {
        // Download the PDF
        pdfMake.createPdf(docDefinition).download(
          `certificate-${(updatedCertificateData || certificateData).student.certificate_number || courseStudentId}.pdf`
        );
      } else {
        // Preview
        pdfMake.createPdf(docDefinition).getBlob((blob) => {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        }, (error: Error) => {
          console.error('[CertificatePdfGenerator] PDF generation error:', error);
          throw error;
        });
      }
    } catch (error) {
      console.error('[CertificatePdfGenerator] Failed to generate PDF:', error);
      
      // If it's a font error, try again with Roboto only (no custom fonts)
      if (error instanceof Error && (error.message.includes('font') || error.message.includes('Font'))) {
        console.warn('[CertificatePdfGenerator] Font error - retrying with Roboto only');
        
        try {
          // Ensure custom fonts are not used
          fontsLoaded = false;
          
          // Re-fetch data if we don't have it
          if (!updatedCertificateData) {
            updatedCertificateData = await certificateTemplatesApi.getCertificateData(courseStudentId) as CertificateData;
          }
          
          // Re-fetch background if we don't have it
          if (!backgroundImageBase64) {
            const backgroundUrl = updatedCertificateData?.background_url || certificateData.background_url;
            if (backgroundUrl) {
              backgroundImageBase64 = await convertImageToBase64(backgroundUrl);
            }
          }
          
          // Build PDF with Roboto only
          const docDefinition = await buildPdfDocument(updatedCertificateData || certificateData, selectedTemplate!, backgroundImageBase64);
          
          if (download) {
            pdfMake.createPdf(docDefinition).download(
              `certificate-${(updatedCertificateData || certificateData).student.certificate_number || courseStudentId}.pdf`
            );
          } else {
            pdfMake.createPdf(docDefinition).getBlob((blob) => {
              const url = URL.createObjectURL(blob);
              setPreviewUrl(url);
            });
          }
        } catch (retryError) {
          console.error('[CertificatePdfGenerator] Retry also failed:', retryError);
          throw retryError;
        }
      } else {
        throw error;
      }
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

      // Generate and download JPG image
      await generateJpgPreview(updatedCertificateData || certificateData, selectedTemplate!, backgroundImageBase64);
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
          ctx.fillStyle = '#4a5568';
          ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
          ctx.textAlign = isRtl ? 'right' : 'left';
          // Format: "Certificate No: CERT-2025-0001" with proper spacing
          const certText = `Certificate No: ${data.student.certificate_number || 'N/A'}`;
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
            ? format(new Date(data.student.certificate_issued_at), 'MMM d, yyyy') 
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
            const photoBase64 = await convertImageToBase64(`/api/students/${data.student.id}/picture`);
            if (photoBase64) {
              const photoImg = new Image();
              await new Promise((resolve, reject) => {
                photoImg.onload = () => {
                  const photoWidth = photoPos.width ? (photoPos.width / 100) * width : 100;
                  const photoHeight = photoPos.height ? (photoPos.height / 100) * height : 100;
                  const photoX = (photoPos.x / 100) * width;
                  const photoY = (photoPos.y / 100) * height;
                  
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
    let defaultFontFamily = 'Roboto';
    if (isRtl && fontsLoaded && pdfMake.fonts?.['BahijNassim']) {
      defaultFontFamily = 'BahijNassim'; // Will use bold variant when bold: true is set
    } else if (layout.fontFamily && (pdfMake.fonts?.[layout.fontFamily] || pdfMake.fonts?.['Arial'])) {
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
        if (pdfMake.fonts?.[requestedFont]) {
          fieldFontFamily = requestedFont;
        } else if (requestedFont === 'Bahij Nassim' && pdfMake.fonts?.['BahijNassim']) {
          fieldFontFamily = 'BahijNassim';
        } else if (pdfMake.fonts?.['Roboto']) {
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

    // Helper function to convert percentage position to PDF points
    // Positions are saved as percentages (0-100) of the full container
    // This matches the image generator exactly: (position.x / 100) * width
    // Note: pdfmake's absolutePosition with alignment: 'center' centers horizontally but positions Y from top
    // Canvas uses textBaseline: 'middle' which centers vertically, so we need to adjust Y for PDF
    const getPosition = (position?: { x: number; y: number }, defaultX?: number, defaultY?: number, fontSize?: number) => {
      if (position) {
        // Convert percentage (0-100) to points using full page dimensions
        // This matches the image generator: (position.x / 100) * width
        const x = (position.x / 100) * pageWidth;
        // For Y: pdfmake positions from top, but canvas uses middle baseline
        // Adjust Y to account for font size to center vertically (approximate line height is ~1.2 * fontSize)
        const lineHeight = fontSize ? fontSize * 1.2 : 0;
        const y = (position.y / 100) * pageHeight - (lineHeight / 2);
        return { x, y };
      }
      // Use default positions if not set
      if (defaultX !== undefined && defaultY !== undefined) {
        const lineHeight = fontSize ? fontSize * 1.2 : 0;
        return { x: defaultX, y: defaultY - (lineHeight / 2) };
      }
      return null;
    };

    // Header - use saved position or default center top (only if enabled)
    if (layout.enabledFields?.includes('header')) {
      const fieldFont = getFieldFont('header', 1.5);
      const headerPos = getPosition(layout.headerPosition, pageWidth / 2, 120, fieldFont.fontSize);
      if (headerPos) {
        const headerText = layout.headerText || 'Certificate of Completion';
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

    // Student name - use saved position or default center (only if enabled)
    if (layout.enabledFields?.includes('studentName')) {
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

    // Father name - use saved position or default below student name (only if enabled)
    if (layout.enabledFields?.includes('fatherName') && data.student.father_name) {
      const fieldFont = getFieldFont('fatherName', 1.0);
      const fatherNamePos = getPosition(layout.fatherNamePosition, pageWidth / 2, 360, fieldFont.fontSize);
      if (fatherNamePos) {
        // Just use the name without prefix
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

    // Grandfather name (only if enabled)
    if (layout.enabledFields?.includes('grandfatherName') && data.student.grandfather_name) {
      const fieldFont = getFieldFont('grandfatherName', 0.9);
      const grandfatherNamePos = getPosition(layout.grandfatherNamePosition, pageWidth / 2, 380, fieldFont.fontSize);
      if (grandfatherNamePos) {
        // Just use the name without prefix
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

    // Mother name (only if enabled)
    if (layout.enabledFields?.includes('motherName') && data.student.mother_name) {
      const fieldFont = getFieldFont('motherName', 0.9);
      const motherNamePos = getPosition(layout.motherNamePosition, pageWidth / 2, 400, fieldFont.fontSize);
      if (motherNamePos) {
        // Just use the name without prefix
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

    // Course name - use saved position or default center (only if enabled)
    if (layout.enabledFields?.includes('courseName')) {
      const fieldFont = getFieldFont('courseName', 1.0);
      const courseNamePos = getPosition(layout.courseNamePosition, pageWidth / 2, 480, fieldFont.fontSize);
      if (courseNamePos) {
        const actualCourseName = data.course?.name || courseName;
        const courseNameText = layout.courseNameText 
          ? `${layout.courseNameText} ${actualCourseName}`
          : actualCourseName;
        content.push({
          text: normalizeText(courseNameText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: layout.textColor || '#1a365d',
          absolutePosition: courseNamePos,
          alignment: 'center',
        });
      }
    }

    // Certificate number - use saved position or default bottom left (only if enabled)
    if (layout.enabledFields?.includes('certificateNumber')) {
      const fieldFont = getFieldFont('certificateNumber', 0.5);
      const certNumberPos = getPosition(layout.certificateNumberPosition, 100, pageHeight - 100, fieldFont.fontSize);
      if (certNumberPos) {
        // Format: "Certificate No: CERT-2025-0001" with proper spacing
        const certText = `Certificate No: ${data.student.certificate_number || 'N/A'}`;
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

    // Date - use saved position or default bottom right (only if enabled)
    if (layout.enabledFields?.includes('date')) {
      const fieldFont = getFieldFont('date', 0.5);
      const datePos = getPosition(layout.datePosition, pageWidth - 100, pageHeight - 100, fieldFont.fontSize);
      if (datePos) {
        // Format: Use custom dateText or default "Date:"
        const dateLabel = layout.dateText || 'Date:';
        const formattedDate = data.student.certificate_issued_at 
          ? format(new Date(data.student.certificate_issued_at), 'MMM d, yyyy') 
          : format(new Date(), 'MMM d, yyyy');
        const dateText = `${dateLabel} ${formattedDate}`;
        content.push({
          text: normalizeText(dateText),
          fontSize: fieldFont.fontSize,
          font: fieldFont.fontFamily,
          bold: true,
          color: '#4a5568',
          absolutePosition: datePos,
          alignment: isRtl ? 'left' : 'right',
        });
      }
    }

    // Province (only if enabled)
    if (layout.enabledFields?.includes('province') && data.student.curr_province) {
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

    // District (only if enabled)
    if (layout.enabledFields?.includes('district') && data.student.curr_district) {
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

    // Village (only if enabled)
    if (layout.enabledFields?.includes('village') && data.student.curr_village) {
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

    // Nationality (only if enabled)
    if (layout.enabledFields?.includes('nationality') && data.student.nationality) {
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

    // Guardian Name (only if enabled)
    if (layout.enabledFields?.includes('guardianName') && data.student.guardian_name) {
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

    // Student Photo (only if enabled and picture_path exists)
    if (layout.enabledFields?.includes('studentPhoto') && data.student.picture_path) {
      const photoPos = layout.studentPhotoPosition;
      if (photoPos) {
        try {
          // Convert photo to base64
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
          console.warn('[CertificatePdfGenerator] Failed to load student photo:', error);
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
                      {format(new Date(certificateData.student.certificate_issued_at), 'MMM d, yyyy')}
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
