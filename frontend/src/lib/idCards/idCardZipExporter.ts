import JSZip from 'jszip';

import { renderIdCardToCanvas } from './idCardCanvasRenderer';
import { DEFAULT_ID_CARD_PADDING_PX, getDefaultPrintRenderSize, getDefaultScreenRenderSize } from './idCardRenderMetrics';

import type { IdCardTemplate } from '@/types/domain/idCardTemplate';
import type { Student } from '@/types/domain/student';

/**
 * Convert data URL to Blob (for ZIP export)
 * @param dataUrl - Data URL string (e.g., "data:image/png;base64,...")
 * @returns Promise that resolves with a Blob
 */
function dataURLtoBlob(dataUrl: string): Blob {
  // Extract base64 data and MIME type from data URL
  const arr = dataUrl.split(',');
  if (arr.length !== 2) {
    throw new Error('Invalid data URL format');
  }
  
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mimeType });
}

/**
 * Export multiple ID cards to ZIP file
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

  const zip = new JSZip();
  const renderQuality = quality === 'high' ? 'print' : 'screen';
  const screenRenderSize = getDefaultScreenRenderSize();
  const printRenderSize = getDefaultPrintRenderSize();
  const renderSize = renderQuality === 'print' ? printRenderSize : screenRenderSize;

  // Generate PNG images for each card
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
      
      // Convert data URL to blob (without using fetch to avoid CSP issues)
      const blob = dataURLtoBlob(pngData);
      
      // Generate filename - sanitize for filesystem compatibility
      // Remove special characters, handle RTL text, and ensure ASCII-safe filename
      const sanitizeFilename = (text: string | null | undefined): string => {
        if (!text) return 'student';
        // Remove RTL marks and normalize
        return text
          .normalize('NFD')
          .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
          .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
          .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars with underscore
          .replace(/_+/g, '_') // Replace multiple underscores with single
          .replace(/^_|_$/g, '') // Remove leading/trailing underscores
          .substring(0, 50) || 'student'; // Limit length
      };
      
      const studentName = sanitizeFilename(student.fullName);
      const admissionNumber = sanitizeFilename(student.admissionNumber || student.id);
      const cardFilename = `${studentName}_${admissionNumber}_${side}.png`;
      
      // Add to ZIP
      zip.file(cardFilename, blob);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`[idCardZipExporter] Failed to generate card for ${student.fullName} (${side}):`, error);
      }
      // Continue with other cards even if one fails
    }
  }

  // Generate ZIP file
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  
  // Trigger download
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
