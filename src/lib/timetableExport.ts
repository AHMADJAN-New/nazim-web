import { utils, writeFile } from 'xlsx';

export interface XlsxSheet {
	name: string;
	// First row is header; each inner array is a row
	rows: Array<Array<string | number>>;
}

export function exportTimetableToExcel(sheets: XlsxSheet[], fileName = 'timetable.xlsx') {
	try {
		const wb = utils.book_new();
		for (const sheet of sheets) {
			const ws = utils.aoa_to_sheet(sheet.rows);
			utils.book_append_sheet(wb, ws, sanitizeSheetName(sheet.name));
		}
		writeFile(wb, fileName);
	} catch (err) {
		console.error('Failed to export Excel:', err);
		throw err;
	}
}

function sanitizeSheetName(name: string): string {
	// Excel sheet name rules: no : \ / ? * [ ] and max length 31
	return name.replace(/[:\\/?*\[\]]/g, ' ').slice(0, 31) || 'Sheet';
}


