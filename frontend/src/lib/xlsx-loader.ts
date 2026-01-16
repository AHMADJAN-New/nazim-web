// Lazy load xlsx library to reduce initial bundle size
// This creates a separate chunk that only loads when Excel export is needed

let xlsxModule: typeof import('xlsx') | null = null;

/**
 * Lazy load xlsx library
 * @returns Promise that resolves with xlsx module
 */
export async function loadXlsx(): Promise<typeof import('xlsx')> {
  if (!xlsxModule) {
    xlsxModule = await import('xlsx');
  }
  return xlsxModule;
}

/**
 * Get xlsx utilities (lazy loaded)
 */
export async function getXlsxUtils() {
  const xlsx = await loadXlsx();
  return xlsx.utils;
}

/**
 * Get xlsx writeFile function (lazy loaded)
 */
export async function getXlsxWriteFile() {
  const xlsx = await loadXlsx();
  return xlsx.writeFile;
}

