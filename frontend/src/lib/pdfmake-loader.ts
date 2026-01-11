/**
 * Lazy loader for pdfmake libraries
 * This allows pdfmake to be loaded on-demand, reducing initial bundle size
 */

let pdfMakeCache: any = null;
let pdfMakeArabicCache: any = null;
let pdfFontsCache: any = null;
let isLoading = false;
let isLoadingArabic = false;
let loadPromise: Promise<void> | null = null;
let loadArabicPromise: Promise<void> | null = null;

/**
 * Lazy load pdfmake (regular version)
 */
export async function loadPdfMake(): Promise<any> {
  if (pdfMakeCache) {
    return pdfMakeCache;
  }

  if (isLoading && loadPromise) {
    await loadPromise;
    return pdfMakeCache;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      const pdfMakeModule = await import('pdfmake/build/pdfmake');
      pdfMakeCache = (pdfMakeModule as any).default || pdfMakeModule;
      
      // Initialize fonts
      await loadPdfFonts();
      
      if (pdfMakeCache && pdfFontsCache) {
        pdfMakeCache.vfs = pdfFontsCache;
      }
    } catch (error) {
      console.error('[pdfmake-loader] Failed to load pdfmake:', error);
      throw error;
    } finally {
      isLoading = false;
    }
  })();

  await loadPromise;
  return pdfMakeCache;
}

/**
 * Lazy load pdfmake-arabic
 */
export async function loadPdfMakeArabic(): Promise<any> {
  if (pdfMakeArabicCache) {
    return pdfMakeArabicCache;
  }

  if (isLoadingArabic && loadArabicPromise) {
    await loadArabicPromise;
    return pdfMakeArabicCache;
  }

  isLoadingArabic = true;
  loadArabicPromise = (async () => {
    try {
      const pdfMakeModule = await import('pdfmake-arabic/build/pdfmake');
      pdfMakeArabicCache = (pdfMakeModule as any).default || pdfMakeModule;
      
      // Initialize fonts
      await loadPdfFonts();
      
      if (pdfMakeArabicCache && pdfFontsCache) {
        pdfMakeArabicCache.vfs = pdfFontsCache;
      }
    } catch (error) {
      console.error('[pdfmake-loader] Failed to load pdfmake-arabic:', error);
      throw error;
    } finally {
      isLoadingArabic = false;
    }
  })();

  await loadArabicPromise;
  return pdfMakeArabicCache;
}

/**
 * Lazy load pdfmake fonts
 */
export async function loadPdfFonts(): Promise<any> {
  if (pdfFontsCache) {
    return pdfFontsCache;
  }

  try {
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
    pdfFontsCache = pdfFontsModule;
    return pdfFontsCache;
  } catch (error) {
    console.error('[pdfmake-loader] Failed to load pdfmake fonts:', error);
    throw error;
  }
}

/**
 * Get pdfmake instance (loads if not already loaded)
 * Prefers Arabic version if available
 */
export async function getPdfMakeInstance(useArabic: boolean = true): Promise<any> {
  if (useArabic) {
    // Try Arabic cache first
    if (pdfMakeArabicCache && typeof pdfMakeArabicCache.createPdf === 'function') {
      return pdfMakeArabicCache;
    }
    
    // Try window.pdfMake (set during initialization)
    if (typeof window !== 'undefined' && (window as any).pdfMake && typeof (window as any).pdfMake.createPdf === 'function') {
      pdfMakeArabicCache = (window as any).pdfMake;
      return pdfMakeArabicCache;
    }
    
    // Load Arabic version dynamically
    return await loadPdfMakeArabic();
  } else {
    // Try regular cache first
    if (pdfMakeCache && typeof pdfMakeCache.createPdf === 'function') {
      return pdfMakeCache;
    }

    // Try window.pdfMake (set during initialization)
    if (typeof window !== 'undefined' && (window as any).pdfMake && typeof (window as any).pdfMake.createPdf === 'function') {
      pdfMakeCache = (window as any).pdfMake;
      return pdfMakeCache;
    }

    // Load dynamically
    return await loadPdfMake();
  }
}

/**
 * Preload pdfmake (useful for prefetching)
 */
export function preloadPdfMake(): void {
  if (!pdfMakeCache && !isLoading) {
    loadPdfMake().catch((error) => {
      console.warn('[pdfmake-loader] Preload failed:', error);
    });
  }
}

