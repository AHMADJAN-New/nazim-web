import * as XLSX from 'xlsx';
import { flattenTranslations, nestTranslations, type TranslationRow } from './utils';

/**
 * Export translations to Excel file
 */
export function exportTranslationsToExcel(): void {
  const flattened = flattenTranslations();
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create worksheet from array of objects
  const ws = XLSX.utils.json_to_sheet(flattened);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 40 }, // key column
    { wch: 50 }, // en column
    { wch: 50 }, // ps column
    { wch: 50 }, // fa column
    { wch: 50 }, // ar column
  ];
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Translations');
  
  // Generate filename with timestamp
  const filename = `translations_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  // Write file
  XLSX.writeFile(wb, filename);
}

/**
 * Import translations from Excel file
 */
export async function importTranslationsFromExcel(file: File): Promise<TranslationRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as TranslationRow[];
        
        // Validate required columns
        if (jsonData.length > 0) {
          const firstRow = jsonData[0];
          if (!firstRow.key || !('en' in firstRow) || !('ps' in firstRow) || !('fa' in firstRow) || !('ar' in firstRow)) {
            throw new Error('Invalid Excel format. Required columns: key, en, ps, fa, ar');
          }
        }
        
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export translations to CSV
 */
export function exportTranslationsToCSV(): void {
  const flattened = flattenTranslations();
  
  // Create CSV content
  const headers = ['key', 'en', 'ps', 'fa', 'ar'];
  const rows = flattened.map(row => [
    row.key,
    `"${String(row.en).replace(/"/g, '""')}"`,
    `"${String(row.ps).replace(/"/g, '""')}"`,
    `"${String(row.fa).replace(/"/g, '""')}"`,
    `"${String(row.ar).replace(/"/g, '""')}"`,
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `translations_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

