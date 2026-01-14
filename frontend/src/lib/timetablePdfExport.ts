// Lazy load pdfmake to reduce initial bundle size
import { getPdfMakeInstance } from '@/lib/pdfmake-loader';

export interface PdfTable {
  title: string;
  headers: string[]; // header row
  rows: Array<Array<string | number>>;
}

export async function exportTimetableToPdf(tables: PdfTable[], fileName = 'timetable.pdf') {
  // Lazy load pdfmake
  const pdfMake = await getPdfMakeInstance(false); // Use regular pdfmake, not Arabic version
  
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


