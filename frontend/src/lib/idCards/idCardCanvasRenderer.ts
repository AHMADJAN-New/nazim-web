import type { Student } from '@/types/domain/student';
import type { IdCardTemplate, IdCardLayoutConfig } from '@/types/domain/idCardTemplate';
import {
  DEFAULT_ID_CARD_PADDING_PX,
  DEFAULT_PRINT_HEIGHT_PX,
  DEFAULT_PRINT_WIDTH_PX,
  DEFAULT_SCREEN_HEIGHT_PX,
  DEFAULT_SCREEN_WIDTH_PX,
  createIdCardRenderMetrics,
  getDefaultPrintRenderSize,
  getDefaultScreenRenderSize,
  isIdCardRenderDebugEnabled,
} from './idCardRenderMetrics';

// CR80 dimensions: 85.6mm × 53.98mm
// At 300 DPI: 1011px × 637px
// Screen preview uses the layout editor's default preview height (400px)
export const CR80_WIDTH_PX = DEFAULT_SCREEN_WIDTH_PX;
export const CR80_HEIGHT_PX = DEFAULT_SCREEN_HEIGHT_PX;
export const CR80_WIDTH_PX_PRINT = DEFAULT_PRINT_WIDTH_PX;
export const CR80_HEIGHT_PX_PRINT = DEFAULT_PRINT_HEIGHT_PX;

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
      console.error('[idCardCanvasRenderer] QR code generation failed:', error);
    }
    throw error;
  }
}

// Convert image URL to base64 with authentication
async function convertImageToBase64(url: string): Promise<string | null> {
  try {
    // Import API client to get authentication token
    const { apiClient } = await import('@/lib/api/client');
    const token = apiClient.getToken();
    
    // Use relative URL (Vite proxy handles it in dev)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      // 404 is expected if image doesn't exist - don't treat as error
      if (response.status === 404) {
        return null;
      }
      if (import.meta.env.DEV) {
        console.warn(`[idCardCanvasRenderer] Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      return null;
    }
    
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[idCardCanvasRenderer] Image conversion failed:', error);
    }
    return null;
  }
}

// Font loading state
let canvasFontsLoaded = false;
let canvasFontsLoading: Promise<void> | null = null;

/**
 * Ensure canvas fonts are loaded before rendering
 * This is critical for proper font rendering in exported ID cards
 */
async function ensureCanvasFontsLoaded(): Promise<void> {
  if (canvasFontsLoaded) return;
  if (canvasFontsLoading) return canvasFontsLoading;

  canvasFontsLoading = (async () => {
    try {
      // Load both Regular + Bold WOFFs for proper weight matching in Canvas
      // NOTE: Canvas uses CSS font matching; if we only load one weight, it may fallback
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
        console.log('[idCardCanvasRenderer] Canvas fonts loaded: Bahij Nassim (400/700)');
      }
    } catch (e) {
      // Not fatal: browser will fall back to installed fonts
      canvasFontsLoaded = false;
      if (import.meta.env.DEV) {
        console.warn('[idCardCanvasRenderer] Failed to load canvas fonts, using fallbacks');
      }
    }
  })();

  return canvasFontsLoading;
}

interface RenderOptions {
  quality?: 'screen' | 'print';
  scale?: number;
  renderWidthPx?: number;
  renderHeightPx?: number;
  paddingPx?: number;
  designWidthPx?: number;
  designHeightPx?: number;
  debug?: boolean;
}

/**
 * Render ID card to Canvas
 * @param template - ID card template
 * @param student - Student data
 * @param side - 'front' or 'back'
 * @param options - Rendering options
 * @returns HTMLCanvasElement
 */
export async function renderIdCardToCanvas(
  template: IdCardTemplate,
  student: Student,
  side: 'front' | 'back',
  options: RenderOptions & { notes?: string | null; expiryDate?: Date | string | null } = {}
): Promise<HTMLCanvasElement> {
  // CRITICAL: Ensure fonts are loaded before rendering
  // This ensures fonts are applied correctly in exported ID cards
  await ensureCanvasFontsLoaded();

  const {
    quality = 'screen',
    scale = 1,
    renderWidthPx,
    renderHeightPx,
    paddingPx = DEFAULT_ID_CARD_PADDING_PX,
    designWidthPx,
    designHeightPx,
    debug,
    notes,
    expiryDate,
  } = options;

  const screenSize = getDefaultScreenRenderSize();
  const printSize = getDefaultPrintRenderSize();
  const width = renderWidthPx ?? (quality === 'print' ? printSize.width : screenSize.width);
  const height = renderHeightPx ?? (quality === 'print' ? printSize.height : screenSize.height);
  const resolvedDesignWidth = designWidthPx ?? (quality === 'print' ? screenSize.width : width);
  const resolvedDesignHeight = designHeightPx ?? (quality === 'print' ? screenSize.height : height);
  const metrics = createIdCardRenderMetrics({
    totalWidth: width,
    totalHeight: height,
    paddingPx,
    designWidthPx: resolvedDesignWidth,
    designHeightPx: resolvedDesignHeight,
  });
  const debugEnabled = debug ?? isIdCardRenderDebugEnabled();

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Scale context if needed
  if (scale !== 1) {
    ctx.scale(scale, scale);
  }

  // Fill white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const layout = side === 'front' 
    ? template.layoutConfigFront 
    : template.layoutConfigBack;
  
  if (!layout) {
    if (import.meta.env.DEV) {
      console.warn(`[idCardCanvasRenderer] No layout config for ${side} side`);
    }
    return canvas; // Return white canvas if no layout
  }

  const backgroundPath = side === 'front'
    ? template.backgroundImagePathFront
    : template.backgroundImagePathBack;

    // Draw background image if available
    if (backgroundPath) {
      try {
        // Use API client for authenticated request
        const { idCardTemplatesApi } = await import('@/lib/api/client');
        const { blob } = await idCardTemplatesApi.getBackgroundImage(template.id, side);
        
        // Convert blob to data URL
        const backgroundBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
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
          console.warn('[idCardCanvasRenderer] Failed to load background image:', error);
        }
      }
    }

  if (debugEnabled) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)';
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    ctx.strokeStyle = 'rgba(37, 99, 235, 0.7)';
    ctx.setLineDash([4, 3]);
    if (metrics.contentWidth > 0 && metrics.contentHeight > 0) {
      ctx.strokeRect(
        metrics.paddingPx + 0.5,
        metrics.paddingPx + 0.5,
        Math.max(0, metrics.contentWidth - 1),
        Math.max(0, metrics.contentHeight - 1)
      );
    }
    ctx.restore();
  }

  const isRtl = layout.rtl !== false;
  const defaultFontFamily = isRtl
    ? '"Bahij Nassim", "Noto Sans Arabic", "Arial Unicode MS", "Tahoma", "Arial", sans-serif'
    : (layout.fontFamily || 'Arial');
  const textColor = layout.textColor || '#000000';
  const baseFontSize = layout.fontSize || 12;
  
  const fontScaleFactor = metrics.fontScale;

  const getFieldFont = (fieldId: string, defaultMultiplier: number) => {
    const fieldFont = layout.fieldFonts?.[fieldId];
    // Use custom font size if set, otherwise use base font size directly
    // Scale fonts relative to the design preview size for consistent screen/print rendering
    const fieldFontSize = (fieldFont?.fontSize !== undefined
      ? fieldFont.fontSize
      : baseFontSize) * fontScaleFactor;
    const fieldFontFamily = fieldFont?.fontFamily || defaultFontFamily;
    const fieldTextColor = fieldFont?.textColor || textColor;
    return { fontSize: fieldFontSize, fontFamily: fieldFontFamily, textColor: fieldTextColor };
  };

  const getPixelPosition = (position?: { x: number; y: number; width?: number; height?: number }) => {
    if (!position) return null;
    const x = metrics.pctToX(position.x);
    const y = metrics.pctToY(position.y);
    const w = position.width ? metrics.pctToWidth(position.width) : undefined;
    const h = position.height ? metrics.pctToHeight(position.height) : undefined;
    return { x, y, width: w, height: h };
  };

  ctx.textBaseline = 'middle';
  ctx.direction = isRtl ? 'rtl' : 'ltr';

  // Debug: Log enabled fields and student data
  if (import.meta.env.DEV) {
    console.log('[idCardCanvasRenderer] Enabled fields:', layout.enabledFields);
    console.log('[idCardCanvasRenderer] Student data:', {
      fullName: student.fullName,
      fatherName: student.fatherName,
      admissionNumber: student.admissionNumber,
      studentCode: student.studentCode,
      currentClass: student.currentClass?.name,
      school: student.school?.schoolName,
    });
  }

  // Draw enabled fields - render all enabled fields even if data is missing
  if (layout.enabledFields?.includes('studentName')) {
    const pos = getPixelPosition(layout.studentNamePosition);
    if (pos) {
      // Use template-defined value if available, otherwise use student data
      const studentNameValue = layout.fieldValues?.studentName || student.fullName;
      if (studentNameValue) {
        const fieldFont = getFieldFont('studentName', 1.2);
        ctx.fillStyle = fieldFont.textColor;
        ctx.font = `bold ${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(studentNameValue, pos.x, pos.y);
        if (import.meta.env.DEV) {
          console.log('[idCardCanvasRenderer] Rendered studentName at:', pos);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[idCardCanvasRenderer] studentName enabled but no position found');
    }
  }

  if (layout.enabledFields?.includes('fatherName')) {
    const pos = getPixelPosition(layout.fatherNamePosition);
    if (pos) {
      // Use template-defined value if available, otherwise use student data
      const fatherNameValue = layout.fieldValues?.fatherName || student.fatherName;
      if (fatherNameValue) {
        const fieldFont = getFieldFont('fatherName', 1.0);
        ctx.fillStyle = fieldFont.textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(fatherNameValue, pos.x, pos.y);
        if (import.meta.env.DEV) {
          console.log('[idCardCanvasRenderer] Rendered fatherName at:', pos);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[idCardCanvasRenderer] fatherName enabled but no position found');
    }
  }

  if (layout.enabledFields?.includes('studentCode')) {
    const pos = getPixelPosition(layout.studentCodePosition);
    if (pos) {
      // Use template-defined value if available, otherwise use student data
      const studentCodeValue = layout.fieldValues?.studentCode || student.studentCode;
      if (studentCodeValue) {
        const fieldFont = getFieldFont('studentCode', 0.9);
        ctx.fillStyle = fieldFont.textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(studentCodeValue, pos.x, pos.y);
        if (import.meta.env.DEV) {
          console.log('[idCardCanvasRenderer] Rendered studentCode at:', pos);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[idCardCanvasRenderer] studentCode enabled but no position found');
    }
  }

  if (layout.enabledFields?.includes('admissionNumber')) {
    const pos = getPixelPosition(layout.admissionNumberPosition);
    if (pos) {
      // Use template-defined value if available, otherwise use student data
      const admissionNumberValue = layout.fieldValues?.admissionNumber || student.admissionNumber;
      if (admissionNumberValue) {
        const fieldFont = getFieldFont('admissionNumber', 0.9);
        ctx.fillStyle = fieldFont.textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(admissionNumberValue, pos.x, pos.y);
        if (import.meta.env.DEV) {
          console.log('[idCardCanvasRenderer] Rendered admissionNumber at:', pos);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[idCardCanvasRenderer] admissionNumber enabled but no position found');
    }
  }

  if (layout.enabledFields?.includes('class')) {
    const pos = getPixelPosition(layout.classPosition);
    if (pos) {
      // Use template-defined value if available, otherwise use student data
      const classValue = layout.fieldValues?.class || student.currentClass?.name;
      if (classValue) {
        const fieldFont = getFieldFont('class', 0.9);
        ctx.fillStyle = fieldFont.textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(classValue, pos.x, pos.y);
        if (import.meta.env.DEV) {
          console.log('[idCardCanvasRenderer] Rendered class at:', pos);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[idCardCanvasRenderer] class enabled but no position found');
    }
  }

  if (layout.enabledFields?.includes('schoolName')) {
    const pos = getPixelPosition(layout.schoolNamePosition);
    if (pos) {
      // Use template-defined value if available, otherwise use student's school name
      const schoolNameValue = layout.fieldValues?.schoolName || student.school?.schoolName;
      if (schoolNameValue) {
        const fieldFont = getFieldFont('schoolName', 0.8);
        ctx.fillStyle = fieldFont.textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(schoolNameValue, pos.x, pos.y);
        if (import.meta.env.DEV) {
          console.log('[idCardCanvasRenderer] Rendered schoolName at:', pos);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[idCardCanvasRenderer] schoolName enabled but no position found');
    }
  }

  // Card Number
  if (layout.enabledFields?.includes('cardNumber')) {
    const pos = getPixelPosition(layout.cardNumberPosition);
    if (pos) {
      // Use template-defined value if available, otherwise use student data
      const cardNumberValue = layout.fieldValues?.cardNumber || student.cardNumber || (student as any).cardNumber;
      if (cardNumberValue) {
        const fieldFont = getFieldFont('cardNumber', 0.9);
        ctx.fillStyle = fieldFont.textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(cardNumberValue, pos.x, pos.y);
        if (import.meta.env.DEV) {
          console.log('[idCardCanvasRenderer] Rendered cardNumber at:', pos);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[idCardCanvasRenderer] cardNumber enabled but no position found');
    }
  }

  // Expiry Date
  if (layout.enabledFields?.includes('expiryDate')) {
    const pos = getPixelPosition(layout.expiryDatePosition);
    if (pos) {
      // Use template-defined value if available, otherwise use passed expiryDate
      const expiryDateValue = layout.fieldValues?.expiryDate;
      let formattedDate = '';
      
      if (expiryDateValue) {
        // Template-defined date (stored as string in YYYY-MM-DD format)
        try {
          const date = new Date(expiryDateValue);
          if (!isNaN(date.getTime())) {
            formattedDate = date.toLocaleDateString();
          } else {
            // If not a valid date, use as-is (might be custom text)
            formattedDate = expiryDateValue;
          }
        } catch {
          formattedDate = expiryDateValue;
        }
      } else if (expiryDate) {
        // Use passed expiryDate parameter
        if (expiryDate instanceof Date) {
          formattedDate = expiryDate.toLocaleDateString();
        } else if (typeof expiryDate === 'string') {
          formattedDate = new Date(expiryDate).toLocaleDateString();
        }
      }
      
      if (formattedDate) {
        const fieldFont = getFieldFont('expiryDate', 0.9);
        ctx.fillStyle = fieldFont.textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(formattedDate, pos.x, pos.y);
        if (import.meta.env.DEV) {
          console.log('[idCardCanvasRenderer] Rendered expiryDate at:', pos);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[idCardCanvasRenderer] expiryDate enabled but no position found');
    }
  }

  // Notes
  if (layout.enabledFields?.includes('notes')) {
    const pos = getPixelPosition(layout.notesPosition);
    if (pos) {
      // Use template-defined value if available, otherwise use passed notes
      const notesValue = layout.fieldValues?.notes || notes;
      if (notesValue) {
        const fieldFont = getFieldFont('notes', 0.8);
        ctx.fillStyle = fieldFont.textColor;
        ctx.font = `${fieldFont.fontSize}px ${fieldFont.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.fillText(notesValue, pos.x, pos.y);
        if (import.meta.env.DEV) {
          console.log('[idCardCanvasRenderer] Rendered notes at:', pos);
        }
      }
    } else if (import.meta.env.DEV) {
      console.warn('[idCardCanvasRenderer] notes enabled but no position found');
    }
  }

  // Student photo
  if (layout.enabledFields?.includes('studentPhoto')) {
    const pos = getPixelPosition(layout.studentPhotoPosition);
    if (pos && pos.width && pos.height) {
      try {
        // Use authenticated API request for student picture
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
              
              // Center-based positioning
              const drawX = pos.x! - pos.width! / 2;
              const drawY = pos.y! - pos.height! / 2;
              ctx.drawImage(photoImg, drawX, drawY, pos.width!, pos.height!);
              
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
          console.warn('[idCardCanvasRenderer] Failed to load student photo:', error);
        }
      }
    }
  }

  // QR Code
  if (layout.enabledFields?.includes('qrCode')) {
    const pos = getPixelPosition(layout.qrCodePosition);
    if (pos && pos.width && pos.height) {
      try {
        // Use smaller dimension for square QR code
        const qrSize = Math.min(pos.width, pos.height);
        
        // Get QR code value source from layout config (default to student_code)
        const valueSource = layout.qrCodeValueSource || 'student_code';
        
        // Get QR code value based on selected source
        let qrValue: string | null | undefined = null;
        switch (valueSource) {
          case 'student_id':
            qrValue = student.id;
            break;
          case 'student_code':
            qrValue = student.studentCode;
            break;
          case 'admission_number':
            qrValue = student.admissionNumber;
            break;
          case 'card_number':
            qrValue = (student as any).cardNumber;
            break;
          case 'roll_number':
            qrValue = (student as any).rollNumber;
            break;
          default:
            qrValue = student.studentCode || student.admissionNumber || student.id;
        }
        
        // Fallback to default if selected field is null/undefined
        if (!qrValue) {
          qrValue = student.studentCode || student.admissionNumber || student.id;
        }
        
        if (qrValue) {
          const qrBase64 = await generateQRCode(qrValue, Math.round(qrSize));
          if (qrBase64) {
            const qrImg = new Image();
            await new Promise((resolve, reject) => {
              qrImg.onload = () => {
                // Center-based positioning, square size
                const drawX = pos.x! - qrSize / 2;
                const drawY = pos.y! - qrSize / 2;
                ctx.drawImage(qrImg, drawX, drawY, qrSize, qrSize);
                resolve(null);
              };
              qrImg.onerror = reject;
              qrImg.src = qrBase64;
            });
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[idCardCanvasRenderer] Failed to generate QR code:', error);
        }
      }
    }
  }

  if (debugEnabled) {
    ctx.save();
    ctx.fillStyle = 'rgba(37, 99, 235, 0.9)';
    const drawAnchor = (position?: { x: number; y: number } | null) => {
      if (!position) return;
      ctx.beginPath();
      ctx.arc(position.x, position.y, 3, 0, Math.PI * 2);
      ctx.fill();
    };
    const drawFieldAnchor = (fieldId: string, position?: { x: number; y: number; width?: number; height?: number }) => {
      if (!layout.enabledFields?.includes(fieldId)) return;
      drawAnchor(getPixelPosition(position));
    };

    drawFieldAnchor('studentName', layout.studentNamePosition);
    drawFieldAnchor('fatherName', layout.fatherNamePosition);
    drawFieldAnchor('studentCode', layout.studentCodePosition);
    drawFieldAnchor('admissionNumber', layout.admissionNumberPosition);
    drawFieldAnchor('class', layout.classPosition);
    drawFieldAnchor('schoolName', layout.schoolNamePosition);
    drawFieldAnchor('cardNumber', layout.cardNumberPosition);
    drawFieldAnchor('expiryDate', layout.expiryDatePosition);
    drawFieldAnchor('notes', layout.notesPosition);
    drawFieldAnchor('studentPhoto', layout.studentPhotoPosition);
    drawFieldAnchor('qrCode', layout.qrCodePosition);
    ctx.restore();
  }

  return canvas;
}

/**
 * Render ID card to data URL
 * @param template - ID card template
 * @param student - Student data
 * @param side - 'front' or 'back'
 * @param options - Rendering options
 * @returns Data URL string
 */
export async function renderIdCardToDataUrl(
  template: IdCardTemplate,
  student: Student,
  side: 'front' | 'back',
  options: RenderOptions & { mimeType?: 'image/png' | 'image/jpeg'; jpegQuality?: number; notes?: string | null; expiryDate?: Date | string | null } = {}
): Promise<string> {
  const { mimeType = 'image/png', jpegQuality = 0.95, ...renderOptions } = options;
  const canvas = await renderIdCardToCanvas(template, student, side, renderOptions);
  
  if (mimeType === 'image/jpeg') {
    return canvas.toDataURL('image/jpeg', jpegQuality);
  }
  return canvas.toDataURL('image/png');
}
