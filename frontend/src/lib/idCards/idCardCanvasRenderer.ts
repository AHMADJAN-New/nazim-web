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
import {
  formatIdCardFontFamilyForCanvas,
  formatIdCardFontFamilyToken,
  ID_CARD_RTL_FONT_FALLBACK_STACK,
  normalizeIdCardText,
  resolveIdCardDefaultFontFamily,
  resolveIdCardFieldValue,
  resolveIdCardLocale,
} from './idCardFieldUtils';
import { generateLocalQrCodeDataUrl } from './idCardQr';

import type { IdCardTemplate, IdCardLayoutConfig } from '@/types/domain/idCardTemplate';
import type { Student } from '@/types/domain/student';

const resolveScaledPaddingPx = (
  paddingPx: number,
  totalWidth: number,
  totalHeight: number,
  designWidth: number | undefined,
  designHeight: number | undefined
): number => {
  if (!designWidth || !designHeight || designWidth <= 0 || designHeight <= 0) {
    return paddingPx;
  }
  const scaleX = totalWidth / designWidth;
  const scaleY = totalHeight / designHeight;
  if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) {
    return paddingPx;
  }
  const scaleFactor = (scaleX + scaleY) / 2;
  return paddingPx * scaleFactor;
};

const DEFAULT_FIELD_LABELS: Record<string, string> = {
  studentNameLabel: 'نوم:',
  fatherNameLabel: 'د پلار نوم:',
  classLabel: 'درجه:',
  roomLabel: 'خونه:',
  admissionNumberLabel: 'داخله نمبر:',
  studentCodeLabel: 'ID:',
  cardNumberLabel: 'کارت نمبر:',
};

// CR80 dimensions: 85.6mm × 53.98mm
// At 300 DPI: 1011px × 637px
// Screen preview uses the layout editor's default preview height (400px)
export const CR80_WIDTH_PX = DEFAULT_SCREEN_WIDTH_PX;
export const CR80_HEIGHT_PX = DEFAULT_SCREEN_HEIGHT_PX;
export const CR80_WIDTH_PX_PRINT = DEFAULT_PRINT_WIDTH_PX;
export const CR80_HEIGHT_PX_PRINT = DEFAULT_PRINT_HEIGHT_PX;
const DEFAULT_STUDENT_PHOTO_WIDTH = 18;
const DEFAULT_STUDENT_PHOTO_HEIGHT = 28;
const DEFAULT_QR_CODE_SIZE = 10;
const authenticatedImageDataUrlCache = new Map<string, Promise<string | null>>();
const backgroundImageDataUrlCache = new Map<string, Promise<string | null>>();

async function generateQRCode(data: string, size: number = 200): Promise<string> {
  return generateLocalQrCodeDataUrl(data, size);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Convert image URL to base64 with authentication
async function convertImageToBase64(url: string, cacheKey: string = url): Promise<string | null> {
  const cached = authenticatedImageDataUrlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
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
      return blobToDataUrl(blob);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[idCardCanvasRenderer] Image conversion failed:', error);
      }
      return null;
    }
  })();

  authenticatedImageDataUrlCache.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    authenticatedImageDataUrlCache.delete(cacheKey);
    throw error;
  }
}

async function getBackgroundImageDataUrl(
  templateId: string,
  side: 'front' | 'back',
  backgroundPath: string
): Promise<string | null> {
  const cacheKey = `${templateId}:${side}:${backgroundPath}`;
  const cached = backgroundImageDataUrlCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    try {
      const { idCardTemplatesApi } = await import('@/lib/api/client');
      const { blob } = await idCardTemplatesApi.getBackgroundImage(templateId, side);
      return blobToDataUrl(blob);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[idCardCanvasRenderer] Failed to load background image:', error);
      }
      return null;
    }
  })();

  backgroundImageDataUrlCache.set(cacheKey, promise);

  try {
    return await promise;
  } catch (error) {
    backgroundImageDataUrlCache.delete(cacheKey);
    throw error;
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
      // Same files as index.css @font-face and frontend/public/fonts (Vite serves /fonts/*)
      const regularWoffUrl = '/fonts/Bahij%20Nassim-Regular.woff';
      const boldWoffUrl = '/fonts/Bahij%20Nassim-Bold.woff';
      const titrBoldWoffUrl = '/fonts/Bahij%20Titr-Bold.woff';

      const regularFace = new FontFace('Bahij Nassim', `url(${regularWoffUrl})`, {
        weight: '400',
        style: 'normal',
      });
      const boldFace = new FontFace('Bahij Nassim', `url(${boldWoffUrl})`, {
        weight: '700',
        style: 'normal',
      });
      const titrBoldFace = new FontFace('Bahij Titr', `url(${titrBoldWoffUrl})`, {
        weight: '700',
        style: 'normal',
      });

      // Load + register
      await Promise.all([regularFace.load(), boldFace.load(), titrBoldFace.load()]);
      document.fonts.add(regularFace);
      document.fonts.add(boldFace);
      document.fonts.add(titrBoldFace);

      // Ensure font set is ready before drawing
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      canvasFontsLoaded = true;
      if (import.meta.env.DEV) {
        console.log('[idCardCanvasRenderer] Canvas fonts loaded: Bahij Nassim (400/700), Bahij Titr (700)');
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
  notes?: string | null;
  createdDate?: Date | string | null;
  expiryDate?: Date | string | null;
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
  options: RenderOptions = {}
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
    createdDate,
    expiryDate,
  } = options;

  const screenSize = getDefaultScreenRenderSize();
  const printSize = getDefaultPrintRenderSize();
  const width = renderWidthPx ?? (quality === 'print' ? printSize.width : screenSize.width);
  const height = renderHeightPx ?? (quality === 'print' ? printSize.height : screenSize.height);
  const resolvedDesignWidth = designWidthPx ?? (quality === 'print' ? screenSize.width : width);
  const resolvedDesignHeight = designHeightPx ?? (quality === 'print' ? screenSize.height : height);
  const scaledPaddingPx = resolveScaledPaddingPx(
    paddingPx,
    width,
    height,
    resolvedDesignWidth,
    resolvedDesignHeight
  );

  const metrics = createIdCardRenderMetrics({
    totalWidth: width,
    totalHeight: height,
    paddingPx: scaledPaddingPx,
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
        const backgroundBase64 = await getBackgroundImageDataUrl(template.id, side, backgroundPath);
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
  const locale = resolveIdCardLocale();
  const defaultFontFamily = resolveIdCardDefaultFontFamily(isRtl, layout.fontFamily);
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
    let fieldFontFamily = defaultFontFamily;
    if (fieldFont?.fontFamily) {
      const tok = formatIdCardFontFamilyToken(fieldFont.fontFamily);
      fieldFontFamily = isRtl ? `${tok}, ${ID_CARD_RTL_FONT_FALLBACK_STACK}` : tok;
    }
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

  // Default positions when layout has enabled field but no position saved (e.g. from layout editor)
  // RTL default: labels on the RIGHT (high x), values on the LEFT (low x). Positions are anchor points (label=right edge, value=left edge).
  const DEFAULT_FIELD_POSITIONS: Record<string, { x: number; y: number; width?: number; height?: number }> = {
    studentNameLabelPosition: { x: 72, y: 40 },
    studentNamePosition: { x: 28, y: 40 },
    fatherNameLabelPosition: { x: 72, y: 50 },
    fatherNamePosition: { x: 28, y: 50 },
    studentCodeLabelPosition: { x: 72, y: 60 },
    studentCodePosition: { x: 28, y: 60 },
    admissionNumberLabelPosition: { x: 72, y: 70 },
    admissionNumberPosition: { x: 28, y: 70 },
    classLabelPosition: { x: 72, y: 80 },
    classPosition: { x: 28, y: 80 },
    roomLabelPosition: { x: 72, y: 88 },
    roomPosition: { x: 28, y: 88 },
    schoolNamePosition: { x: 50, y: 30 },
    cardNumberLabelPosition: { x: 72, y: 80 },
    cardNumberPosition: { x: 28, y: 80 },
    createdDatePosition: { x: 50, y: 52 },
    expiryDatePosition: { x: 50, y: 60 },
    notesPosition: { x: 50, y: 90 },
    studentPhotoPosition: { x: 20, y: 50, width: DEFAULT_STUDENT_PHOTO_WIDTH, height: DEFAULT_STUDENT_PHOTO_HEIGHT },
    qrCodePosition: { x: 80, y: 50, width: DEFAULT_QR_CODE_SIZE, height: DEFAULT_QR_CODE_SIZE },
  };
  const getPositionOrDefault = (
    fieldKey: keyof typeof DEFAULT_FIELD_POSITIONS,
    layoutPos?: { x: number; y: number; width?: number; height?: number } | null
  ) => {
    if (layoutPos && typeof layoutPos.x === 'number' && typeof layoutPos.y === 'number') {
      return layoutPos;
    }
    return DEFAULT_FIELD_POSITIONS[fieldKey];
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

  const renderLabelField = (
    fieldId: keyof typeof DEFAULT_FIELD_LABELS,
    positionKey: keyof typeof DEFAULT_FIELD_POSITIONS
  ) => {
    if (!layout.enabledFields?.includes(fieldId)) {
      return;
    }

    const pos = getPixelPosition(getPositionOrDefault(positionKey, layout[positionKey as keyof IdCardLayoutConfig] as any));
    if (!pos) {
      if (import.meta.env.DEV) {
        console.warn(`[idCardCanvasRenderer] ${fieldId} enabled but no position found`);
      }
      return;
    }

    const labelText = resolveIdCardFieldValue(
      fieldId,
      layout,
      {
        student,
        notes,
        createdDate,
        expiryDate,
        locale,
      }
    );
    if (!labelText) {
      return;
    }
    const normalizedLabelText = normalizeIdCardText(labelText);
    if (!normalizedLabelText) {
      return;
    }
    const labelWithColon = normalizedLabelText.endsWith(':') ? normalizedLabelText : `${normalizedLabelText}:`;

    const fieldFont = getFieldFont(fieldId, 0.9);
    ctx.fillStyle = fieldFont.textColor;
    ctx.font = `${fieldFont.fontSize}px ${formatIdCardFontFamilyForCanvas(fieldFont.fontFamily)}`;
    // Use per-field textAlign override, otherwise default to 'right' for labels
    ctx.textAlign = (layout.fieldFonts?.[fieldId]?.textAlign as CanvasTextAlign | undefined) ?? 'right';
    ctx.fillText(labelWithColon, pos.x, pos.y);
  };

  renderLabelField('studentNameLabel', 'studentNameLabelPosition');
  renderLabelField('fatherNameLabel', 'fatherNameLabelPosition');
  renderLabelField('studentCodeLabel', 'studentCodeLabelPosition');
  renderLabelField('admissionNumberLabel', 'admissionNumberLabelPosition');
  renderLabelField('classLabel', 'classLabelPosition');
  renderLabelField('roomLabel', 'roomLabelPosition');
  renderLabelField('cardNumberLabel', 'cardNumberLabelPosition');

  const renderValueField = (
    fieldId: string,
    positionKey: keyof typeof DEFAULT_FIELD_POSITIONS,
    defaultMultiplier: number,
    alignment: CanvasTextAlign,
    fontWeight: 'normal' | 'bold' = 'normal'
  ) => {
    if (!layout.enabledFields?.includes(fieldId)) {
      return;
    }

    const pos = getPixelPosition(getPositionOrDefault(positionKey, layout[positionKey as keyof IdCardLayoutConfig] as any));
    if (!pos) {
      if (import.meta.env.DEV) {
        console.warn(`[idCardCanvasRenderer] ${fieldId} enabled but no position found`);
      }
      return;
    }

    const resolvedValue = resolveIdCardFieldValue(
      fieldId,
      layout,
      {
        student,
        notes,
        createdDate,
        expiryDate,
        locale,
      }
    );
    const normalizedValue = normalizeIdCardText(resolvedValue);
    if (!normalizedValue) {
      return;
    }

    const fieldFont = getFieldFont(fieldId, defaultMultiplier);
    ctx.fillStyle = fieldFont.textColor;
    ctx.font = `${fontWeight === 'bold' ? 'bold ' : ''}${fieldFont.fontSize}px ${formatIdCardFontFamilyForCanvas(fieldFont.fontFamily)}`;
    // Use per-field textAlign override if set, otherwise fall back to the default alignment for this field
    ctx.textAlign = (layout.fieldFonts?.[fieldId]?.textAlign as CanvasTextAlign | undefined) ?? alignment;
    ctx.fillText(normalizedValue, pos.x, pos.y);

    if (import.meta.env.DEV) {
      console.log(`[idCardCanvasRenderer] Rendered ${fieldId} at:`, pos);
    }
  };

  renderValueField('studentName', 'studentNamePosition', 1.2, 'left', 'bold');
  renderValueField('fatherName', 'fatherNamePosition', 1.0, 'left');
  renderValueField('studentCode', 'studentCodePosition', 0.9, 'left');
  renderValueField('admissionNumber', 'admissionNumberPosition', 0.9, 'left');
  renderValueField('class', 'classPosition', 0.9, 'left');
  renderValueField('room', 'roomPosition', 0.9, 'left');
  renderValueField('schoolName', 'schoolNamePosition', 0.8, 'center');
  renderValueField('cardNumber', 'cardNumberPosition', 0.9, 'left');
  renderValueField('createdDate', 'createdDatePosition', 0.9, 'center');
  renderValueField('expiryDate', 'expiryDatePosition', 0.9, 'center');
  renderValueField('notes', 'notesPosition', 0.8, 'center');

  const traceRoundedRect = (x: number, y: number, rectWidth: number, rectHeight: number, radius: number) => {
    const safeRadius = Math.max(0, Math.min(radius, rectWidth / 2, rectHeight / 2));
    ctx.beginPath();
    ctx.moveTo(x + safeRadius, y);
    ctx.lineTo(x + rectWidth - safeRadius, y);
    ctx.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + safeRadius);
    ctx.lineTo(x + rectWidth, y + rectHeight - safeRadius);
    ctx.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - safeRadius, y + rectHeight);
    ctx.lineTo(x + safeRadius, y + rectHeight);
    ctx.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - safeRadius);
    ctx.lineTo(x, y + safeRadius);
    ctx.quadraticCurveTo(x, y, x + safeRadius, y);
    ctx.closePath();
  };

  // Student photo (skip HTTP request when API gave no path — backend returns 404 for missing photos)
  if (layout.enabledFields?.includes('studentPhoto')) {
    const pos = getPixelPosition(getPositionOrDefault('studentPhotoPosition', layout.studentPhotoPosition));
    const picturePathForFetch = student.picturePath?.trim() || student.profilePhoto?.trim();
    if (pos && pos.width && pos.height && picturePathForFetch) {
      try {
        // Use authenticated API request for student picture
        const photoUrl = `/api/students/${student.id}/picture`;
        const photoBase64 = await convertImageToBase64(
          photoUrl,
          `${photoUrl}:${picturePathForFetch}`
        );
        if (photoBase64) {
          const photoImg = new Image();
          await new Promise((resolve, reject) => {
            photoImg.onload = () => {
              // Save context state and disable stroke to prevent dark border
              ctx.save();
              ctx.lineWidth = 0;
              ctx.strokeStyle = 'transparent';

              const boxW = pos.width!;
              const boxH = pos.height!;
              const boxX = pos.x! - boxW / 2;
              const boxY = pos.y! - boxH / 2;
              const frameRadius = Math.max(4, Math.min(boxW, boxH) * 0.08);
              const framePadding = Math.max(2, Math.min(boxW, boxH) * 0.045);
              const innerX = boxX + framePadding;
              const innerY = boxY + framePadding;
              const innerW = Math.max(1, boxW - framePadding * 2);
              const innerH = Math.max(1, boxH - framePadding * 2);

              ctx.shadowColor = 'rgba(15, 23, 42, 0.14)';
              ctx.shadowBlur = Math.max(3, framePadding * 1.5);
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = Math.max(1, framePadding * 0.6);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
              traceRoundedRect(boxX, boxY, boxW, boxH, frameRadius);
              ctx.fill();
              ctx.shadowColor = 'transparent';

              ctx.lineWidth = Math.max(1, Math.min(boxW, boxH) * 0.02);
              ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
              traceRoundedRect(boxX, boxY, boxW, boxH, frameRadius);
              ctx.stroke();

              traceRoundedRect(innerX, innerY, innerW, innerH, Math.max(2, frameRadius - framePadding));
              ctx.clip();

              const imgW = photoImg.naturalWidth || photoImg.width;
              const imgH = photoImg.naturalHeight || photoImg.height;
              if (imgW > 0 && imgH > 0) {
                const scale = Math.max(innerW / imgW, innerH / imgH);
                const drawW = imgW * scale;
                const drawH = imgH * scale;
                const drawX = pos.x! - drawW / 2;
                const drawY = pos.y! - drawH / 2;
                ctx.drawImage(photoImg, 0, 0, imgW, imgH, drawX, drawY, drawW, drawH);
              } else {
                ctx.drawImage(photoImg, innerX, innerY, innerW, innerH);
              }

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
    const pos = getPixelPosition(getPositionOrDefault('qrCodePosition', layout.qrCodePosition));
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
    const drawFieldAnchor = (
      fieldId: string,
      fieldKey: keyof typeof DEFAULT_FIELD_POSITIONS,
      position?: { x: number; y: number; width?: number; height?: number } | null
    ) => {
      if (!layout.enabledFields?.includes(fieldId)) return;
      const pos = getPositionOrDefault(fieldKey, position);
      drawAnchor(getPixelPosition(pos));
    };

    drawFieldAnchor('studentNameLabel', 'studentNameLabelPosition', layout.studentNameLabelPosition as any);
    drawFieldAnchor('studentName', 'studentNamePosition', layout.studentNamePosition);
    drawFieldAnchor('fatherNameLabel', 'fatherNameLabelPosition', layout.fatherNameLabelPosition as any);
    drawFieldAnchor('fatherName', 'fatherNamePosition', layout.fatherNamePosition);
    drawFieldAnchor('studentCodeLabel', 'studentCodeLabelPosition', layout.studentCodeLabelPosition as any);
    drawFieldAnchor('studentCode', 'studentCodePosition', layout.studentCodePosition);
    drawFieldAnchor('admissionNumberLabel', 'admissionNumberLabelPosition', layout.admissionNumberLabelPosition as any);
    drawFieldAnchor('admissionNumber', 'admissionNumberPosition', layout.admissionNumberPosition);
    drawFieldAnchor('classLabel', 'classLabelPosition', layout.classLabelPosition as any);
    drawFieldAnchor('class', 'classPosition', layout.classPosition);
    drawFieldAnchor('roomLabel', 'roomLabelPosition', (layout as any).roomLabelPosition);
    drawFieldAnchor('room', 'roomPosition', (layout as any).roomPosition);
    drawFieldAnchor('schoolName', 'schoolNamePosition', layout.schoolNamePosition);
    drawFieldAnchor('cardNumberLabel', 'cardNumberLabelPosition', layout.cardNumberLabelPosition as any);
    drawFieldAnchor('cardNumber', 'cardNumberPosition', layout.cardNumberPosition);
    drawFieldAnchor('createdDate', 'createdDatePosition', (layout as any).createdDatePosition);
    drawFieldAnchor('expiryDate', 'expiryDatePosition', layout.expiryDatePosition);
    drawFieldAnchor('notes', 'notesPosition', layout.notesPosition);
    drawFieldAnchor('studentPhoto', 'studentPhotoPosition', layout.studentPhotoPosition);
    drawFieldAnchor('qrCode', 'qrCodePosition', layout.qrCodePosition);
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
  options: RenderOptions & { mimeType?: 'image/png' | 'image/jpeg'; jpegQuality?: number } = {}
): Promise<string> {
  const { mimeType = 'image/png', jpegQuality = 0.95, ...renderOptions } = options;
  const canvas = await renderIdCardToCanvas(template, student, side, renderOptions);
  
  if (mimeType === 'image/jpeg') {
    return canvas.toDataURL('image/jpeg', jpegQuality);
  }
  return canvas.toDataURL('image/png');
}
