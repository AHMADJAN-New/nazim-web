import * as pdfMakeModule from 'pdfmake-arabic/build/pdfmake';

import { renderLetterToDataUrl } from './LetterCanvasRenderer';

import type { LetterTemplate } from '@/types/dms';

let pdfMake: any = (pdfMakeModule as any).default || pdfMakeModule;

import * as pdfFonts from 'pdfmake/build/vfs_fonts';

function getPdfMakeInstance() {
  if (pdfMake && typeof pdfMake.createPdf === 'function') return pdfMake;
  if (typeof window !== 'undefined' && (window as any).pdfMake && typeof (window as any).pdfMake.createPdf === 'function') {
    return (window as any).pdfMake;
  }
  if (pdfMakeModule && typeof (pdfMakeModule as any).createPdf === 'function') return pdfMakeModule;
  if ((pdfMakeModule as any).default && typeof (pdfMakeModule as any).default.createPdf === 'function') {
    return (pdfMakeModule as any).default;
  }
  return null;
}

const actualPdfMake = getPdfMakeInstance();
if (actualPdfMake) {
  pdfMake = actualPdfMake;
}

if (typeof window !== 'undefined') {
  (window as any).pdfMake = pdfMake;
}

try {
  if (!(pdfMake as any).vfs) {
    try {
      (pdfMake as any).vfs = {};
    } catch {
      // Ignore if object is not extensible
    }
  }
  if ((pdfMake as any).vfs) {
    if ((pdfFonts as any).vfs) {
      Object.assign((pdfMake as any).vfs, (pdfFonts as any).vfs);
    } else if (pdfFonts && typeof pdfFonts === 'object') {
      Object.assign((pdfMake as any).vfs, pdfFonts);
    }
  }
} catch (error) {
  if (import.meta.env.DEV) {
    console.warn('[LetterPdfGenerator] Failed to initialize pdfmake vfs fonts:', error);
  }
}

interface PdfOptions {
  variables?: Record<string, string>;
  bodyText?: string | null;
  letterheadImage?: string | null;
  letterheadPosition?: 'header' | 'background' | 'watermark';
  watermarkImage?: string | null;
  imageDataUrl?: string | null;
  direction?: 'rtl' | 'ltr';
}

function getPagePoints(pageLayout?: string) {
  const isLandscape = pageLayout === 'A4_landscape';
  return {
    pageSize: 'A4' as const,
    pageOrientation: isLandscape ? ('landscape' as const) : ('portrait' as const),
    width: isLandscape ? 842 : 595,
    height: isLandscape ? 595 : 842,
  };
}

export async function generateLetterPdf(
  template: LetterTemplate,
  options: PdfOptions = {}
): Promise<Blob> {
  const pdfMakeInstance = getPdfMakeInstance() || pdfMake;
  if (!pdfMakeInstance || typeof pdfMakeInstance.createPdf !== 'function') {
    throw new Error('pdfMake.createPdf is not available. Please check pdfmake-arabic import.');
  }

      const imageDataUrl = options.imageDataUrl
    ? options.imageDataUrl
    : await renderLetterToDataUrl(template, {
        variables: options.variables,
        bodyText: options.bodyText,
        letterheadImage: options.letterheadImage,
        letterheadPosition: options.letterheadPosition,
        watermarkImage: options.watermarkImage,
        direction: options.direction,
        scale: 2,
        mimeType: 'image/jpeg',
        quality: 0.95,
      });

  const page = getPagePoints(template.page_layout);
  const docDefinition = {
    pageSize: page.pageSize,
    pageOrientation: page.pageOrientation,
    pageMargins: [0, 0, 0, 0],
    content: [
      {
        image: imageDataUrl,
        width: page.width,
        height: page.height,
        absolutePosition: { x: 0, y: 0 },
      },
    ],
  };

  return new Promise((resolve, reject) => {
    pdfMakeInstance.createPdf(docDefinition).getBlob((blob: Blob) => resolve(blob), (error: Error) => reject(error));
  });
}
