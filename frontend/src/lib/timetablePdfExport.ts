// Uses pdfmake; ensure vfs is initialized by importing our reporting pdfExport once
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize vfs (similar logic as reporting/pdfExport.ts)
try {
  if (pdfFonts && typeof pdfFonts === 'object') {
    (pdfMake as any).vfs = pdfFonts;
  } else if ((pdfMake as any).vfs) {
    // already initialized
  }
} catch (e) {
  console.warn('[timetablePdfExport] Could not initialize pdfmake vfs', e);
}

export interface PdfTable {
  title: string;
  headers: string[]; // header row
  rows: Array<Array<string | number>>;
}

export function exportTimetableToPdf(tables: PdfTable[], fileName = 'timetable.pdf') {
  if (!(pdfMake as any).vfs) {
    throw new Error('PDF fonts (vfs) not initialized. Please check pdfmake configuration.');
  }

  const content: any[] = [];
  tables.forEach((tbl, idx) => {
    if (tbl.title) {
      content.push({
        text: tbl.title,
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 8],
      });
    }
    const body = [tbl.headers, ...tbl.rows.map((r) => r.map((c) => String(c ?? '')))];
    content.push({
      table: {
        headerRows: 1,
        widths: Array(tbl.headers.length).fill('*'),
        body,
      },
      layout: 'lightHorizontalLines',
      fontSize: 9,
      margin: [0, 0, 0, 16],
    });
    if (idx < tables.length - 1) {
      content.push({ text: '', pageBreak: 'after' });
    }
  });

  const docDefinition: any = {
    pageSize: 'A3',
    pageOrientation: 'landscape',
    content,
    defaultStyle: {
      font: 'Roboto', // from vfs_fonts
    },
  };

  (pdfMake as any).createPdf(docDefinition).download(fileName);
}


