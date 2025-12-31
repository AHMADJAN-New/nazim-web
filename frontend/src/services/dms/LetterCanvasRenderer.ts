import type { FieldPosition, LetterTemplate } from '@/types/dms';

const A4_PORTRAIT = { width: 794, height: 1123 };
const A4_LANDSCAPE = { width: 1123, height: 794 };
const MM_TO_PX = 96 / 25.4;

const DEFAULT_TEXT_COLOR = '#000000';
const DEFAULT_FONT_SIZE = 14;
const DEFAULT_FONT_FAMILY = 'Arial';
const GENERIC_FONT_FAMILIES = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'emoji',
  'math',
  'fangsong',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
]);

let canvasFontsLoaded = false;
let canvasFontsLoading: Promise<void> | null = null;

interface RenderOptions {
  variables?: Record<string, string>;
  bodyText?: string | null;
  letterheadImage?: string | null;
  letterheadPosition?: 'header' | 'background' | 'watermark';
  watermarkImage?: string | null;
  scale?: number;
  direction?: 'rtl' | 'ltr';
}

interface DataUrlOptions extends RenderOptions {
  mimeType?: 'image/jpeg' | 'image/png';
  quality?: number;
}

function getPageSize(pageLayout?: string) {
  if (pageLayout === 'A4_landscape') {
    return { ...A4_LANDSCAPE, orientation: 'landscape' as const };
  }
  return { ...A4_PORTRAIT, orientation: 'portrait' as const };
}

function normalizeFontFamily(fontFamily?: string | null): string {
  const trimmed = String(fontFamily || '').trim();
  if (!trimmed) return '';
  const unquoted = trimmed.replace(/^["']+|["']+$/g, '');
  if (!unquoted) return '';
  const lower = unquoted.toLowerCase();
  if (lower === 'bahijnassim' || lower === 'bahij nassim') return 'Bahij Nassim';
  if (lower === 'bahijtitr' || lower === 'bahij titr') return 'Bahij Titr';
  return unquoted;
}

function formatFontToken(token: string): string {
  const normalized = normalizeFontFamily(token);
  if (!normalized) return '';
  const lower = normalized.toLowerCase();
  if (GENERIC_FONT_FAMILIES.has(lower)) return lower;
  return /\s/.test(normalized) ? `"${normalized}"` : normalized;
}

function buildFontStack(...families: Array<string | null | undefined>): string {
  const seen = new Set<string>();
  const stack: string[] = [];

  families.forEach((family) => {
    if (!family) return;
    const normalized = normalizeFontFamily(family);
    if (!normalized) return;
    normalized.split(',').forEach((token) => {
      const cleaned = normalizeFontFamily(token);
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const formatted = formatFontToken(cleaned);
      if (formatted) {
        stack.push(formatted);
      }
    });
  });

  return stack.join(', ');
}

async function ensureCanvasFontsLoaded(): Promise<void> {
  if (canvasFontsLoaded) return;
  if (canvasFontsLoading) return canvasFontsLoading;

  canvasFontsLoading = (async () => {
    try {
      const [nassimRegular, nassimBold, titrBold] = await Promise.all([
        import('@/fonts/Bahij Nassim-Regular.woff?url'),
        import('@/fonts/Bahij Nassim-Bold.woff?url'),
        import('@/fonts/Bahij Titr-Bold.woff?url'),
      ]);

      const nassimRegularFace = new FontFace('Bahij Nassim', `url(${nassimRegular.default})`, {
        weight: '400',
        style: 'normal',
      });
      const nassimBoldFace = new FontFace('Bahij Nassim', `url(${nassimBold.default})`, {
        weight: '700',
        style: 'normal',
      });
      const titrBoldFace = new FontFace('Bahij Titr', `url(${titrBold.default})`, {
        weight: '700',
        style: 'normal',
      });

      await Promise.all([nassimRegularFace.load(), nassimBoldFace.load(), titrBoldFace.load()]);
      document.fonts.add(nassimRegularFace);
      document.fonts.add(nassimBoldFace);
      document.fonts.add(titrBoldFace);

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      canvasFontsLoaded = true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[LetterCanvasRenderer] Failed to load custom fonts, using fallbacks.', error);
      }
      canvasFontsLoaded = false;
    }
  })();

  return canvasFontsLoading;
}

function isLikelyHtml(text: string): boolean {
  return /<\s*\/?\s*[a-zA-Z][^>]*>/.test(text);
}

function replaceTemplateVariables(text: string, variables: Record<string, string> = {}): string {
  let output = text;
  Object.entries(variables).forEach(([key, value]) => {
    const safeValue = value ?? '';
    output = output
      .replaceAll(`{{${key}}}`, safeValue)
      .replaceAll(`{{ ${key} }}`, safeValue)
      .replaceAll(`{{ ${key}}}`, safeValue)
      .replaceAll(`{{${key} }}`, safeValue);
  });
  output = output.replace(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g, '');
  return output;
}

function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '\n- ')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\/\s*div\s*>/gi, '\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\/\s*(h[1-6]|tr|table|thead|tbody|tfoot|blockquote|section|article|header|footer|address|pre)\s*>/gi, '\n');
  const container = document.createElement('div');
  container.innerHTML = withBreaks;
  return (container.textContent || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitTextBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const raw = normalized.trim();
  if (!raw) return [];
  const blocks = raw.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return blocks.length > 0 ? blocks : [raw];
}

function splitRawBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const raw = normalized.trim();
  if (!raw) return [];
  return raw.split(/\n\s*\n/);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const trimmed = value.trim();
    let withoutUnit = trimmed;
    const lower = trimmed.toLowerCase();
    if (lower.endsWith('%')) {
      withoutUnit = trimmed.slice(0, -1).trim();
    } else if (lower.endsWith('px')) {
      withoutUnit = trimmed.slice(0, -2).trim();
    }
    const parsed = Number(withoutUnit);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolveDimension(value: number | undefined | null, total: number): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value) || total <= 0) return null;
  if (value < 0) return null;
  if (value <= 100) {
    return (value / 100) * total;
  }
  return value;
}

function normalizeFieldPosition(position: FieldPosition): FieldPosition | null {
  const x = toNumber(position.x);
  const y = toNumber(position.y);
  if (x === null || y === null) return null;

  const normalized: FieldPosition = { ...position, x, y };
  const fontSize = toNumber(position.fontSize);
  if (fontSize !== null) normalized.fontSize = fontSize;
  const width = toNumber(position.width);
  if (width !== null) normalized.width = width;
  const height = toNumber(position.height);
  if (height !== null) normalized.height = height;
  const maxWidth = toNumber(position.maxWidth);
  if (maxWidth !== null) normalized.maxWidth = maxWidth;

  return normalized;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (text.trim() === '') return [''];
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  const breakWord = (word: string): string[] => {
    const segments: string[] = [];
    let buffer = '';
    for (const char of word) {
      const test = buffer ? `${buffer}${char}` : char;
      if (ctx.measureText(test).width > maxWidth && buffer) {
        segments.push(buffer);
        buffer = char;
      } else {
        buffer = test;
      }
    }
    if (buffer) {
      segments.push(buffer);
    }
    return segments.length > 0 ? segments : [word];
  };

  words.forEach((word) => {
    if (!word) return;
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = '';
    }

    if (ctx.measureText(word).width <= maxWidth) {
      currentLine = word;
      return;
    }

    const segments = breakWord(word);
    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        currentLine = segment;
      } else {
        lines.push(segment);
      }
    });
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  if (url.startsWith('data:image/')) return url;

  const { apiClient } = await import('@/lib/api/client');

  const toDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  try {
    const parsed = new URL(url, window.location.origin);
    const apiIndex = parsed.pathname.indexOf('/api/');
    if (apiIndex >= 0) {
      const endpoint = parsed.pathname.slice(apiIndex + 4);
      const params: Record<string, string> = {};
      parsed.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      const { blob } = await apiClient.requestFile(endpoint, { method: 'GET', params });
      if (!blob.type.startsWith('image/')) {
        return null;
      }
      return await toDataUrl(blob);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[LetterCanvasRenderer] Failed to parse image URL, falling back to fetch.', error);
    }
  }

  const token = apiClient.getToken();
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'image/*',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!response.ok) {
    if (import.meta.env.DEV) {
      console.warn('[LetterCanvasRenderer] Failed to fetch image:', response.status, response.statusText);
    }
    return null;
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    return null;
  }

  return toDataUrl(blob);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const dataUrl = await fetchImageAsDataUrl(src);
  if (!dataUrl) {
    throw new Error('Unable to load image');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function drawWrappedTextBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  position: FieldPosition,
  pageWidth: number,
  pageHeight: number,
  defaultFontFamily: string,
  defaultFontSize: number,
  isRtl: boolean
) {
  const fontFamily = buildFontStack(position.fontFamily, defaultFontFamily) || defaultFontFamily || DEFAULT_FONT_FAMILY;
  const fontSize = position.fontSize ?? defaultFontSize;
  const color = position.color || DEFAULT_TEXT_COLOR;
  const textAlign = position.textAlign || (isRtl ? 'right' : 'left');
  const widthValue = position.width ?? 40;
  const maxWidthValue = position.maxWidth ?? 80;
  const heightValue = position.height ?? null;

  const resolvedWidth = resolveDimension(widthValue, pageWidth) ?? pageWidth * 0.4;
  const resolvedMaxWidth = resolveDimension(maxWidthValue, pageWidth) ?? pageWidth;
  const blockWidth = Math.min(resolvedWidth, resolvedMaxWidth);
  const blockHeight = heightValue === null ? null : resolveDimension(heightValue, pageHeight);
  const centerX = (position.x / 100) * pageWidth;
  const centerY = (position.y / 100) * pageHeight;

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = 'top';
  ctx.direction = isRtl ? 'rtl' : 'ltr';

  const lines = text.split('\n').flatMap((line) => wrapText(ctx, line, blockWidth));
  const lineHeight = fontSize * 1.4;
  const textHeight = lines.length * lineHeight;
  const topY = centerY - ((blockHeight ?? textHeight) / 2);

  let cursorY = topY;
  const maxY = blockHeight ? topY + blockHeight : null;
  const xAnchor =
    textAlign === 'center'
      ? centerX
      : textAlign === 'right'
        ? centerX + blockWidth / 2
        : centerX - blockWidth / 2;

  lines.forEach((line) => {
    if (maxY && cursorY + lineHeight > maxY) {
      return;
    }
    ctx.fillText(line, xAnchor, cursorY);
    cursorY += lineHeight;
  });

  ctx.restore();
}

function drawBodyText(
  ctx: CanvasRenderingContext2D,
  textBlocks: string[],
  pageWidth: number,
  pageHeight: number,
  fontFamily: string,
  fontSize: number,
  isRtl: boolean
) {
  const marginTop = 25 * MM_TO_PX;
  const marginSide = 20 * MM_TO_PX;
  const marginBottom = 20 * MM_TO_PX;
  const maxWidth = pageWidth - marginSide * 2;
  const lineHeight = fontSize * 1.8;
  const paragraphGap = 12;
  const resolvedFontFamily = buildFontStack(fontFamily) || fontFamily || DEFAULT_FONT_FAMILY;

  ctx.save();
  ctx.font = `${fontSize}px ${resolvedFontFamily}`;
  ctx.fillStyle = DEFAULT_TEXT_COLOR;
  ctx.textAlign = isRtl ? 'right' : 'left';
  ctx.textBaseline = 'top';
  ctx.direction = isRtl ? 'rtl' : 'ltr';

  let cursorY = marginTop;
  const xAnchor = isRtl ? pageWidth - marginSide : marginSide;
  const maxY = pageHeight - marginBottom;

  textBlocks.forEach((paragraph, index) => {
    const lines = paragraph.split('\n').flatMap((line) => wrapText(ctx, line, maxWidth));
    lines.forEach((line) => {
      if (cursorY + lineHeight > maxY) {
        return;
      }
      ctx.fillText(line, xAnchor, cursorY);
      cursorY += lineHeight;
    });
    if (index < textBlocks.length - 1) {
      cursorY += paragraphGap;
    }
  });

  ctx.restore();
}

export async function renderLetterToCanvas(
  template: LetterTemplate,
  options: RenderOptions = {}
): Promise<HTMLCanvasElement> {
  const { variables, bodyText, letterheadImage, watermarkImage } = options;
  const scale = options.scale ?? 2;
  const { width, height } = getPageSize(template.page_layout);
  const isRtl = options.direction ? options.direction === 'rtl' : true;

  await ensureCanvasFontsLoaded();

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  if (letterheadImage) {
    try {
      const bg = await loadImage(letterheadImage);
      const isHeader =
        options.letterheadPosition === 'header' ||
        template.letterhead?.letterhead_type === 'header' ||
        template.letterhead?.position === 'header';
      if (isHeader) {
        const ratio = width / bg.width;
        const drawHeight = bg.height * ratio;
        ctx.drawImage(bg, 0, 0, width, drawHeight);
      } else {
        ctx.drawImage(bg, 0, 0, width, height);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[LetterCanvasRenderer] Failed to draw letterhead image', error);
      }
    }
  }

  if (watermarkImage) {
    try {
      const wm = await loadImage(watermarkImage);
      const targetWidth = width * 0.6;
      const ratio = targetWidth / wm.width;
      const drawWidth = targetWidth;
      const drawHeight = wm.height * ratio;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.drawImage(wm, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[LetterCanvasRenderer] Failed to draw watermark image', error);
      }
    }
  }

  const baseFontFamily = normalizeFontFamily(template.font_family) || DEFAULT_FONT_FAMILY;
  const defaultFontFamily = isRtl
    ? buildFontStack(
        baseFontFamily,
        'Bahij Nassim',
        'Noto Sans Arabic',
        'Arial Unicode MS',
        'Tahoma',
        'Arial',
        'sans-serif'
      )
    : buildFontStack(baseFontFamily, 'Arial', 'sans-serif');
  const baseFontSize = template.font_size || DEFAULT_FONT_SIZE;

  let rawText = bodyText ?? template.body_text ?? '';
  if (variables) {
    rawText = replaceTemplateVariables(rawText, variables);
  }
  const hasHtml = rawText && isLikelyHtml(rawText);

  const fieldPositions = Array.isArray(template.field_positions)
    ? template.field_positions.reduce<Record<string, FieldPosition>>((acc, position, index) => {
        const key = typeof (position as any)?.id === 'string' ? (position as any).id : `block-${index + 1}`;
        acc[key] = position as FieldPosition;
        return acc;
      }, {})
    : template.field_positions || {};
  const hasPositions = Object.keys(fieldPositions).length > 0;
  let blocks: string[] = [];

  if (hasPositions) {
    const rawBlocks = splitRawBlocks(rawText);
    blocks = rawBlocks.map((block) => {
      let normalized = block;
      if (hasHtml && isLikelyHtml(block)) {
        normalized = htmlToPlainText(block);
      }
      return normalized.trim().normalize('NFC');
    });
  } else {
    let processedText = rawText;
    if (hasHtml) {
      processedText = htmlToPlainText(processedText);
    }
    processedText = processedText.trim().normalize('NFC');
    blocks = splitTextBlocks(processedText);
  }

  if (hasPositions && blocks.length > 0) {
    blocks.forEach((blockText, index) => {
      if (!blockText) {
        return;
      }
      const blockId = `block-${index + 1}`;
      const rawPosition = fieldPositions[blockId];
      if (!rawPosition) {
        return;
      }
      const position = normalizeFieldPosition(rawPosition);
      if (!position) {
        return;
      }
      drawWrappedTextBlock(
        ctx,
        blockText,
        position,
        width,
        height,
        defaultFontFamily,
        baseFontSize,
        isRtl
      );
    });
  } else if (blocks.length > 0) {
    drawBodyText(ctx, blocks, width, height, defaultFontFamily, baseFontSize, isRtl);
  }

  return canvas;
}

export async function renderLetterToDataUrl(
  template: LetterTemplate,
  options: DataUrlOptions = {}
): Promise<string> {
  const canvas = await renderLetterToCanvas(template, options);
  const mimeType = options.mimeType ?? 'image/jpeg';
  const quality = options.quality ?? 0.95;
  if (mimeType === 'image/png') {
    return canvas.toDataURL('image/png');
  }
  return canvas.toDataURL('image/jpeg', quality);
}
