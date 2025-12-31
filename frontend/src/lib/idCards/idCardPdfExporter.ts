import type { Student } from '@/types/domain/student';
import type { IdCardTemplate } from '@/types/domain/idCardTemplate';
import { renderIdCardToDataUrl, CR80_WIDTH_PX_PRINT, CR80_HEIGHT_PX_PRINT } from './idCardCanvasRenderer';

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


// CR80 dimensions in mm for PDF
const CR80_WIDTH_MM = 85.6;
const CR80_HEIGHT_MM = 53.98;

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

  // Render card to image using screen dimensions to match preview exactly
  const cardImageDataUrl = await renderIdCardToDataUrl(
    template,
    student,
    side,
    {
      quality: 'screen', // Always use screen dimensions to match preview
      scale: 1,
      mimeType: 'image/jpeg',
      jpegQuality: 0.95,
      notes,
      expiryDate
    }
  );

  // Single card PDF - image only, no A4 page background (like short-term course certificates)
  const docDefinition = {
    pageSize: {
      width: CR80_WIDTH_MM * 2.83465, // Convert mm to points (1mm = 2.83465pt)
      height: CR80_HEIGHT_MM * 2.83465,
    },
    pageOrientation: 'portrait' as const,
    pageMargins: [0, 0, 0, 0],
    content: [
      {
        image: cardImageDataUrl,
        width: CR80_WIDTH_MM * 2.83465,
        height: CR80_HEIGHT_MM * 2.83465,
        absolutePosition: { x: 0, y: 0 },
      },
    ],
  };

  const defaultFilename = filename || `id-card-${student.admissionNumber || student.id}-${side}`;
  pdfMakeInstance.createPdf(docDefinition).download(`${defaultFilename}.pdf`);
}

/**
 * Export multiple ID cards to PDF (multiple cards per page)
 * @param cards - Array of { template, student, side } objects
 * @param cardsPerPage - Number of cards per page (default: 6 = 3x2 grid)
 * @param filename - Optional filename (without extension)
 * @returns Promise that resolves when PDF is downloaded
 */
export async function exportBulkIdCardsToPdf(
  cards: Array<{ template: IdCardTemplate; student: Student; side: 'front' | 'back'; notes?: string | null; expiryDate?: Date | string | null }>,
  cardsPerPage: number = 1, // Each card gets its own page
  filename?: string,
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
    throw new Error('pdfMake.createPdf is not available. Please check pdfmake-arabic import.');
  }

  if (cards.length === 0) {
    throw new Error('No cards to export');
  }

  // Calculate grid layout
  const cols = Math.ceil(Math.sqrt(cardsPerPage));
  const rows = Math.ceil(cardsPerPage / cols);
  const cardWidth = CR80_WIDTH_MM * 2.83465; // Convert mm to points
  const cardHeight = CR80_HEIGHT_MM * 2.83465;
  
  // Calculate spacing
  const pageWidth = 595; // A4 portrait width in points
  const pageHeight = 842; // A4 portrait height in points
  const totalCardsWidth = cols * cardWidth;
  const totalCardsHeight = rows * cardHeight;
  const horizontalSpacing = (pageWidth - totalCardsWidth) / (cols + 1);
  const verticalSpacing = (pageHeight - totalCardsHeight) / (rows + 1);

  const pages: any[] = [];

  // Process cards in batches
  for (let i = 0; i < cards.length; i += cardsPerPage) {
    const pageCards = cards.slice(i, i + cardsPerPage);
    const pageContent: any[] = [];

    // Create rows
    for (let row = 0; row < rows; row++) {
      const rowContent: any[] = [];
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;
        if (index < pageCards.length) {
          const { template, student, side, notes, expiryDate } = pageCards[index];
          
          // Render card to image using screen dimensions to match preview exactly
          const cardImageDataUrl = await renderIdCardToDataUrl(
            template,
            student,
            side,
            { 
              quality: 'screen', // Always use screen dimensions to match preview
              scale: 1,
              mimeType: 'image/jpeg', 
              jpegQuality: 0.95, 
              notes, 
              expiryDate 
            }
          );
          
          rowContent.push({
            image: cardImageDataUrl,
            width: cardWidth,
            height: cardHeight,
            margin: [horizontalSpacing / 2, verticalSpacing / 2, horizontalSpacing / 2, verticalSpacing / 2],
          });
        } else {
          // Empty cell
          rowContent.push({ text: '', width: cardWidth, margin: [horizontalSpacing / 2, verticalSpacing / 2] });
        }
      }
      pageContent.push({
        columns: rowContent,
        columnGap: 0,
      });
    }

    pages.push({
      content: pageContent,
      pageSize: 'A4',
      pageOrientation: 'portrait' as const,
      pageMargins: [0, 0, 0, 0],
    });
  }

  // Multiple cards PDF - each card gets its own page (no A4 grid layout)
  const content: any[] = [];

  for (let index = 0; index < cards.length; index++) {
    const { template, student, side, notes, expiryDate } = cards[index];

    // Render each card individually using screen dimensions to match preview exactly
    const cardImageDataUrl = await renderIdCardToDataUrl(
      template,
      student,
      side,
      {
        quality: 'screen', // Always use screen dimensions to match preview
        scale: 1,
        mimeType: 'image/jpeg',
        jpegQuality: 0.95,
        notes,
        expiryDate
      }
    );

    content.push({
      image: cardImageDataUrl,
      width: CR80_WIDTH_MM * 2.83465,
      height: CR80_HEIGHT_MM * 2.83465,
      absolutePosition: { x: 0, y: 0 },
    });

    // Add page break between cards (except for the last one)
    if (index < cards.length - 1) {
      content.push({ text: '', pageBreak: 'after' });
    }
  }

  const docDefinition = {
    content,
    pageSize: {
      width: CR80_WIDTH_MM * 2.83465,
      height: CR80_HEIGHT_MM * 2.83465,
    },
    pageOrientation: 'portrait' as const,
    pageMargins: [0, 0, 0, 0],
  };

  const defaultFilename = filename || `id-cards-${Date.now()}`;
  pdfMakeInstance.createPdf(docDefinition).download(`${defaultFilename}.pdf`);
}

