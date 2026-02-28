import * as pdfMakeModule from 'pdfmake-arabic/build/pdfmake';

import { renderIdCardToDataUrl } from './idCardCanvasRenderer';
import { DEFAULT_ID_CARD_PADDING_PX, getDefaultPrintRenderSize, getDefaultScreenRenderSize } from './idCardRenderMetrics';

import type { IdCardTemplate } from '@/types/domain/idCardTemplate';
import type { Student } from '@/types/domain/student';

// Import pdfmake for Arabic support - handle both default and named exports
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
  if ((pdfMakeModule as any).default && typeof ((pdfMakeModule as any).default as any).createPdf === 'function') {
    return (pdfMakeModule as any).default;
  }
  return null;
}

// Get the actual pdfMake instance at module load
const actualPdfMake = getPdfMakeInstance();
if (actualPdfMake) {
  pdfMake = actualPdfMake;
} else {
  // If we couldn't get it, try to use the module directly
  // Sometimes the module structure is different
  if (pdfMakeModule && typeof (pdfMakeModule as any).createPdf === 'function') {
    pdfMake = pdfMakeModule;
  } else if ((pdfMakeModule as any).default && typeof ((pdfMakeModule as any).default as any).createPdf === 'function') {
    pdfMake = (pdfMakeModule as any).default;
  }
}

// Make pdfMake available globally for vfs_fonts
if (typeof window !== 'undefined') {
  (window as any).pdfMake = pdfMake;
  
  // Also try to set it from the module if window doesn't have it
  if (!(window as any).pdfMake || typeof (window as any).pdfMake.createPdf !== 'function') {
    if (pdfMakeModule && typeof (pdfMakeModule as any).createPdf === 'function') {
      (window as any).pdfMake = pdfMakeModule;
    } else if ((pdfMakeModule as any).default && typeof ((pdfMakeModule as any).default as any).createPdf === 'function') {
      (window as any).pdfMake = (pdfMakeModule as any).default;
    }
  }
}

// Import fonts
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize pdfMake fonts
try {
  if (pdfFonts && typeof pdfFonts === 'object') {
    // Check if vfs already exists or if we can add it
    if (!(pdfMake as any).vfs) {
      try {
        // Try to create vfs property
        Object.defineProperty(pdfMake, 'vfs', {
          value: {},
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } catch (e) {
        // If object is not extensible, try to use existing vfs or skip
        if ((pdfMake as any).vfs) {
          // vfs already exists, merge fonts into it
          Object.assign((pdfMake as any).vfs, pdfFonts);
        } else {
          // Can't add vfs, but pdfmake-arabic should have it initialized
          if (import.meta.env.DEV) {
            console.warn('[idCardPdfExporter] Could not create vfs, object may not be extensible. Using existing vfs if available.');
          }
        }
      }
    }
    
    // Merge fonts into VFS if vfs exists
    if ((pdfMake as any).vfs) {
      try {
        if (pdfFonts && typeof pdfFonts === 'object' && !(pdfFonts as any).vfs) {
          // pdfFonts is the VFS object directly
          Object.assign((pdfMake as any).vfs, pdfFonts);
        } else if ((pdfFonts as any).vfs) {
          // pdfFonts has a vfs property
          Object.assign((pdfMake as any).vfs, (pdfFonts as any).vfs);
        }
      } catch (e) {
        // VFS might be frozen, but that's okay if fonts are already there
        if (import.meta.env.DEV) {
          console.warn('[idCardPdfExporter] Could not merge fonts into vfs, may already be initialized.');
        }
      }
    }
  }
} catch (error) {
  if (import.meta.env.DEV) {
    console.warn('[idCardPdfExporter] Failed to initialize pdfMake fonts:', error);
  }
}


// CR80 dimensions in mm for PDF (1mm = 2.83465pt)
const CR80_WIDTH_MM = 85.6;
const CR80_HEIGHT_MM = 53.98;
const MM_TO_PT = 2.83465;
const CARD_WIDTH_PT = CR80_WIDTH_MM * MM_TO_PT;
const CARD_HEIGHT_PT = CR80_HEIGHT_MM * MM_TO_PT;

// A4 portrait in points
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;

/** Grid layout for cards per page: [cols, rows], or null for single card-sized page */
function getGridLayout(cardsPerPage: number): { cols: number; rows: number } | null {
  if (cardsPerPage <= 1) return null;
  if (cardsPerPage <= 4) return { cols: 2, rows: 2 };
  if (cardsPerPage <= 8) return { cols: 2, rows: 4 };
  return { cols: 2, rows: 4 }; // cap at 8
}

/**
 * Export single ID card to PDF
 * @param template - ID card template
 * @param student - Student data
 * @param side - 'front' or 'back'
 * @param filename - Optional filename (without extension)
 * @returns Promise that resolves when PDF is downloaded
 */
export async function exportIdCardToPdf(
  template: IdCardTemplate,
  student: Student,
  side: 'front' | 'back',
  filename?: string,
  notes?: string | null,
  expiryDate?: Date | string | null,
  quality: 'standard' | 'high' = 'high'
): Promise<void> {
  // Get the actual pdfMake instance with fallback - try all possible sources
  let pdfMakeInstance = getPdfMakeInstance();
  
  // If getPdfMakeInstance returned null, try pdfMake directly
  if (!pdfMakeInstance) {
    pdfMakeInstance = pdfMake;
  }
  
  // If still null, try accessing the module directly
  if (!pdfMakeInstance || typeof pdfMakeInstance.createPdf !== 'function') {
    if (pdfMakeModule && typeof (pdfMakeModule as any).createPdf === 'function') {
      pdfMakeInstance = pdfMakeModule;
    } else if ((pdfMakeModule as any).default && typeof ((pdfMakeModule as any).default as any).createPdf === 'function') {
      pdfMakeInstance = (pdfMakeModule as any).default;
    }
  }
  
  // Final check
  if (!pdfMakeInstance || typeof pdfMakeInstance.createPdf !== 'function') {
    // Debug logging
    if (import.meta.env.DEV) {
      console.error('[idCardPdfExporter] pdfMake check failed:', {
        pdfMakeInstance: !!pdfMakeInstance,
        pdfMakeType: typeof pdfMake,
        pdfMakeHasCreatePdf: typeof (pdfMake as any)?.createPdf,
        windowPdfMake: typeof window !== 'undefined' ? typeof (window as any).pdfMake : 'N/A',
        moduleKeys: pdfMakeModule ? Object.keys(pdfMakeModule) : [],
        moduleDefault: !!(pdfMakeModule as any).default,
        moduleHasCreatePdf: pdfMakeModule ? typeof (pdfMakeModule as any).createPdf : 'N/A',
      });
    }
    throw new Error('pdfMake.createPdf is not available. Please check pdfmake-arabic import.');
  }

  const renderQuality = quality === 'high' ? 'print' : 'screen';
  const screenRenderSize = getDefaultScreenRenderSize();
  const printRenderSize = getDefaultPrintRenderSize();
  const renderSize = renderQuality === 'print' ? printRenderSize : screenRenderSize;

  // Render card to image using shared render metrics
  const cardImageDataUrl = await renderIdCardToDataUrl(
    template,
    student,
    side,
    {
      quality: renderQuality,
      renderWidthPx: renderSize.width,
      renderHeightPx: renderSize.height,
      paddingPx: DEFAULT_ID_CARD_PADDING_PX,
      scale: 1,
      mimeType: 'image/jpeg',
      jpegQuality: 0.95,
      notes,
      expiryDate
    }
  );

  // Single card PDF - image only, no A4 page background (for card printers)
  const docDefinition = {
    pageSize: {
      width: CARD_WIDTH_PT,
      height: CARD_HEIGHT_PT,
    },
    pageMargins: [0, 0, 0, 0],
    content: [
      {
        image: cardImageDataUrl,
        width: CARD_WIDTH_PT,
        height: CARD_HEIGHT_PT,
        absolutePosition: { x: 0, y: 0 },
      },
    ],
  };

  const defaultFilename = filename || `id-card-${student.admissionNumber || student.id}-${side}`;
  pdfMakeInstance.createPdf(docDefinition).download(`${defaultFilename}.pdf`);
}

/**
 * Export multiple ID cards to PDF (multiple cards per page or single card per page for card printers)
 * @param cards - Array of { template, student, side } objects
 * @param cardsPerPage - 1 = one card per card-sized page (card printer), 4 = 2x2 on A4, 8 = 2x4 on A4
 * @param filename - Optional filename (without extension)
 * @returns Promise that resolves when PDF is downloaded
 */
export async function exportBulkIdCardsToPdf(
  cards: Array<{ template: IdCardTemplate; student: Student; side: 'front' | 'back'; notes?: string | null; expiryDate?: Date | string | null }>,
  cardsPerPage: number = 8,
  filename?: string,
  quality: 'standard' | 'high' = 'high'
): Promise<void> {
  // Get the actual pdfMake instance with fallback - try all possible sources
  let pdfMakeInstance = getPdfMakeInstance();

  if (!pdfMakeInstance) pdfMakeInstance = pdfMake;
  if (!pdfMakeInstance || typeof pdfMakeInstance.createPdf !== 'function') {
    if (pdfMakeModule && typeof (pdfMakeModule as any).createPdf === 'function') {
      pdfMakeInstance = pdfMakeModule;
    } else if ((pdfMakeModule as any).default && typeof ((pdfMakeModule as any).default as any).createPdf === 'function') {
      pdfMakeInstance = (pdfMakeModule as any).default;
    }
  }
  if (!pdfMakeInstance || typeof pdfMakeInstance.createPdf !== 'function') {
    throw new Error('pdfMake.createPdf is not available. Please check pdfmake-arabic import.');
  }

  if (cards.length === 0) {
    throw new Error('No cards to export');
  }

  const renderQuality = quality === 'high' ? 'print' : 'screen';
  const screenRenderSize = getDefaultScreenRenderSize();
  const printRenderSize = getDefaultPrintRenderSize();
  const renderSize = renderQuality === 'print' ? printRenderSize : screenRenderSize;

  const grid = getGridLayout(cardsPerPage);
  const perPage = grid ? Math.min(cardsPerPage, grid.cols * grid.rows) : 1;

  if (!grid) {
    // cardsPerPage === 1: one card per card-sized page (for card printers)
    const content: any[] = [];
    for (let index = 0; index < cards.length; index++) {
      const { template, student, side, notes, expiryDate } = cards[index];
      const cardImageDataUrl = await renderIdCardToDataUrl(template, student, side, {
        quality: renderQuality,
        renderWidthPx: renderSize.width,
        renderHeightPx: renderSize.height,
        paddingPx: DEFAULT_ID_CARD_PADDING_PX,
        scale: 1,
        mimeType: 'image/jpeg',
        jpegQuality: 0.95,
        notes,
        expiryDate,
      });
      content.push({
        image: cardImageDataUrl,
        width: CARD_WIDTH_PT,
        height: CARD_HEIGHT_PT,
        absolutePosition: { x: 0, y: 0 },
      });
      if (index < cards.length - 1) {
        content.push({ text: '', pageBreak: 'after' });
      }
    }
    const docDefinition = {
      content,
      pageSize: { width: CARD_WIDTH_PT, height: CARD_HEIGHT_PT },
      pageMargins: [0, 0, 0, 0],
    };
    const defaultFilename = filename || `id-cards-${Date.now()}`;
    pdfMakeInstance.createPdf(docDefinition).download(`${defaultFilename}.pdf`);
    return;
  }

  // A4 grid: place cards with absolutePosition (2x2 or 2x4)
  const cols = grid.cols;
  const rows = grid.rows;
  const topMarginPt = 15 * MM_TO_PT; // 15mm top margin like user's template
  const hGapPt = (A4_WIDTH_PT - cols * CARD_WIDTH_PT) / (cols + 1);
  const vGapPt = (A4_HEIGHT_PT - topMarginPt - rows * CARD_HEIGHT_PT) / (rows + 1);

  const allPages: any[] = [];

  for (let pageStart = 0; pageStart < cards.length; pageStart += perPage) {
    const pageCards = cards.slice(pageStart, pageStart + perPage);
    const pageContent: any[] = [];

    for (let i = 0; i < pageCards.length; i++) {
      const { template, student, side, notes, expiryDate } = pageCards[i];
      const cardImageDataUrl = await renderIdCardToDataUrl(template, student, side, {
        quality: renderQuality,
        renderWidthPx: renderSize.width,
        renderHeightPx: renderSize.height,
        paddingPx: DEFAULT_ID_CARD_PADDING_PX,
        scale: 1,
        mimeType: 'image/jpeg',
        jpegQuality: 0.95,
        notes,
        expiryDate,
      });
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = hGapPt + col * (CARD_WIDTH_PT + hGapPt);
      const y = topMarginPt + row * (CARD_HEIGHT_PT + vGapPt);
      pageContent.push({
        image: cardImageDataUrl,
        width: CARD_WIDTH_PT,
        height: CARD_HEIGHT_PT,
        absolutePosition: { x, y },
      });
    }

    allPages.push({
      content: pageContent,
      pageSize: 'A4',
      pageOrientation: 'portrait' as const,
      pageMargins: [0, 0, 0, 0],
    });
  }

  const docDefinition = {
    content: allPages.flatMap((page, idx) =>
      idx === 0 ? page.content : [{ text: '', pageBreak: 'after' as const }, ...page.content]
    ),
    pageSize: 'A4',
    pageOrientation: 'portrait' as const,
    pageMargins: [0, 0, 0, 0],
  };

  const defaultFilename = filename || `id-cards-${Date.now()}`;
  pdfMakeInstance.createPdf(docDefinition).download(`${defaultFilename}.pdf`);
}
