import { loadXlsx } from '@/lib/xlsx-loader';

export interface XlsxSheet {
	name: string;
	// First row is header; each inner array is a row
	rows: Array<Array<string | number>>;
}

export async function exportTimetableToExcel(sheets: XlsxSheet[], fileName = 'timetable.xlsx') {
	try {
		// Lazy load xlsx library
		const XLSX = await loadXlsx();
		
		const wb = XLSX.utils.book_new();
		for (const sheet of sheets) {
			const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
			XLSX.utils.book_append_sheet(wb, ws, sanitizeSheetName(sheet.name));
		}
		XLSX.writeFile(wb, fileName);
	} catch (err) {
		console.error('Failed to export Excel:', err);
		throw err;
	}
}

function sanitizeSheetName(name: string): string {
	// Excel sheet name rules: no : \ / ? * [ ] and max length 31
	return name.replace(/[:\\/?*\[\]]/g, ' ').slice(0, 31) || 'Sheet';
}


