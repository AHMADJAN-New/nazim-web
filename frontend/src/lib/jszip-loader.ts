// Lazy load jszip library to reduce initial bundle size
// This creates a separate chunk that only loads when ZIP export is needed

let jszipModule: typeof import('jszip') | null = null;

/**
 * Lazy load jszip library
 * @returns Promise that resolves with jszip default export
 */
export async function loadJszip(): Promise<typeof import('jszip')['default']> {
  if (!jszipModule) {
    jszipModule = await import('jszip');
  }
  return jszipModule.default;
}

