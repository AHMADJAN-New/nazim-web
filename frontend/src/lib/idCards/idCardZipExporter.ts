import { zipSync } from 'fflate';

import { renderIdCardToCanvas } from './idCardCanvasRenderer';
import { DEFAULT_ID_CARD_PADDING_PX, getDefaultPrintRenderSize, getDefaultScreenRenderSize } from './idCardRenderMetrics';

import type { IdCardTemplate } from '@/types/domain/idCardTemplate';
import type { Student } from '@/types/domain/student';

/**
 * Convert data URL to Uint8Array (for fflate ZIP export)
 */
function dataURLtoUint8Array(dataUrl: string): Uint8Array {
  const arr = dataUrl.split(',');
  if (arr.length !== 2) {
    throw new Error('Invalid data URL format');
  }
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8[i] = bstr.charCodeAt(i);
  }
  return u8;
}

/**
 * Sanitize filename for filesystem compatibility (ASCII-safe, no special chars)
 */
function sanitizeFilename(text: string | null | undefined): string {
  if (!text) return 'student';
  return text
    .normalize('NFD')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 50) || 'student';
}

/**
 * Export multiple ID cards to ZIP file using fflate (ESM-native, works in dev and production).
 * @param cards - Array of { template, student, side } objects
 * @param filename - Optional filename (without extension)
 * @param quality - Export quality ('standard' for screen, 'high' for print)
 * @returns Promise that resolves with the ZIP blob
 */
export async function exportIdCardsToZip(
  cards: Array<{ template: IdCardTemplate; student: Student; side: 'front' | 'back'; notes?: string | null; expiryDate?: Date | string | null }>,
  filename?: string,
  quality: 'standard' | 'high' = 'high'
): Promise<Blob> {
  if (cards.length === 0) {
    throw new Error('No cards to export');
  }

  const renderQuality = quality === 'high' ? 'print' : 'screen';
  const screenRenderSize = getDefaultScreenRenderSize();
  const printRenderSize = getDefaultPrintRenderSize();
  const renderSize = renderQuality === 'print' ? printRenderSize : screenRenderSize;

  const files: Record<string, Uint8Array> = {};

  for (const { template, student, side, notes, expiryDate } of cards) {
    try {
      const canvas = await renderIdCardToCanvas(template, student, side, {
        quality: renderQuality,
        renderWidthPx: renderSize.width,
        renderHeightPx: renderSize.height,
        paddingPx: DEFAULT_ID_CARD_PADDING_PX,
        notes: notes || null,
        expiryDate: expiryDate || null,
      });
      const pngData = canvas.toDataURL('image/png');
      const studentName = sanitizeFilename(student.fullName);
      const admissionNumber = sanitizeFilename(student.admissionNumber || student.id);
      const cardFilename = `${studentName}_${admissionNumber}_${side}.png`;
      files[cardFilename] = dataURLtoUint8Array(pngData);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`[idCardZipExporter] Failed to generate card for ${student.fullName} (${side}):`, error);
      }
    }
  }

  const zipBytes = zipSync(files, { level: 6 });
  const zipBlob = new Blob([zipBytes], { type: 'application/zip' });

  const defaultFilename = filename || `id-cards-${Date.now()}`;
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${defaultFilename}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return zipBlob;
}
