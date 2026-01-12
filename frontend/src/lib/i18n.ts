// Nazim School Management System - Internationalization
// Translation system supporting English, Pashto, Dari, and Arabic

export type Language = 'en' | 'ps' | 'fa' | 'ar';

// Re-export TranslationKeys type for convenience
export type { TranslationKeys } from './translations/types';

// Lazy load translations to reduce initial bundle size (3.3 MB total)
// Only load the active language + English (fallback)
let translationsCache: Record<Language, any> | null = null;
let loadedLanguages: Set<Language> = new Set();
let loadingPromises: Map<Language, Promise<any>> = new Map();

// Load translation file dynamically
export async function loadTranslation(lang: Language): Promise<any> {
  if (loadedLanguages.has(lang) && translationsCache?.[lang]) {
    return translationsCache[lang];
  }

  // If already loading, return the existing promise
  if (loadingPromises.has(lang)) {
    return loadingPromises.get(lang)!;
  }

  const loadPromise = (async () => {
    let translation: any;
    switch (lang) {
      case 'en':
        translation = (await import('./translations/en')).en;
        break;
      case 'ps':
        translation = (await import('./translations/ps')).ps;
        break;
      case 'fa':
        translation = (await import('./translations/fa')).fa;
        break;
      case 'ar':
        translation = (await import('./translations/ar')).ar;
        break;
      default:
        translation = (await import('./translations/en')).en;
    }

    if (!translationsCache) {
      translationsCache = {} as Record<Language, any>;
    }
    translationsCache[lang] = translation;
    loadedLanguages.add(lang);
    loadingPromises.delete(lang);
    return translation;
  })();

  loadingPromises.set(lang, loadPromise);
  return loadPromise;
}

// Initialize with English (always needed as fallback) - load synchronously
// Import English immediately since it's always needed as fallback
import { en } from './translations/en';

let translations: Record<Language, any> = {
  en: en, // English loaded immediately
  ps: null,
  fa: null,
  ar: null,
};

// Initialize cache with English
if (!translationsCache) {
  translationsCache = {} as Record<Language, any>;
}
translationsCache.en = en;
loadedLanguages.add('en');

// Synchronous access (may return English if language not loaded yet)
function getTranslationsSync(lang: Language): Record<string, any> {
  if (translationsCache?.[lang]) {
    return translationsCache[lang];
  }
  // Return English as fallback if language not loaded
  return translationsCache?.en || {};
}

// RTL languages
export const RTL_LANGUAGES: Language[] = ['ar', 'ps', 'fa'];

/**
 * STRICT missing-key mode (DEV/TEST only)
 *
 * - Enabled when:
 *   - `VITE_I18N_STRICT=true`, OR
 *   - Vite `DEV` / `MODE === 'test'`
 * - Behavior when a key is missing in both the current language AND English:
 *   - Strict mode: return `[MISSING: some.key]` and warn once per key (deduped)
 *   - Production: preserve existing behavior (humanize last segment)
 */
const warnedMissingKeys = new Set<string>();

function isStrictMissingKeyMode(): boolean {
  try {
    const strictFlag = import.meta.env?.VITE_I18N_STRICT;
    if (strictFlag === 'true') return true;

    // Default strictness in non-production environments.
    if (import.meta.env?.DEV) return true;
    if (import.meta.env?.MODE === 'test') return true;
  } catch {
    // ignore
  }
  return false;
}

function humanizeKeyLastSegment(key: string): string {
  const keys = key.split('.');
  const lastKey = keys[keys.length - 1] || key;
  return lastKey.charAt(0).toUpperCase() + lastKey.slice(1).replace(/([A-Z])/g, ' $1').trim();
}

// Get translation function
export function t(key: string, lang: Language = 'en', params?: Record<string, string | number>): string {
  // Always default to English if language is not available
  const safeLang = lang && ['en', 'ps', 'fa', 'ar'].includes(lang) ? lang : 'en';
  const keys = key.split('.');
  
  // Get translations (may trigger lazy load)
  const langTranslations = getTranslationsSync(safeLang);
  let value: unknown = langTranslations;
  
  // If language not loaded yet, trigger async load (but continue with English)
  if (!loadedLanguages.has(safeLang) && safeLang !== 'en') {
    loadTranslation(safeLang).catch(() => {
      // Silently fail - will use English fallback
    });
  }

  // Try to get translation from requested language
  for (let i = 0; i < keys.length; i++) {
    if (typeof value !== 'object' || value === null) {
      value = undefined;
      break;
    }

    // 1. Try the longest possible remaining path as a quoted key first
    // This handles "nav" -> "finance.fees.dashboard" if that key exists in nav
    const remainingPath = keys.slice(i).join('.');
    if (remainingPath in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[remainingPath];
      // Found the exact translation or the remaining path as a key, break and return
      i = keys.length; // End loop
      break;
    }

    // 2. Otherwise, take the next segment and descend
    const k = keys[i];
    if (k in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  // If translation not found, try English fallback
  if (typeof value !== 'string' && safeLang !== 'en') {
    const enTranslations = getTranslationsSync('en');
    value = enTranslations;
    for (let i = 0; i < keys.length; i++) {
      if (typeof value !== 'object' || value === null) {
        value = undefined;
        break;
      }

      const remainingPath = keys.slice(i).join('.');
      if (remainingPath in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[remainingPath];
        i = keys.length;
        break;
      }

      const k = keys[i];
      if (k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }
  }

  // If still not found, return a readable version of the key
  if (typeof value !== 'string') {
    if (isStrictMissingKeyMode()) {
      if (!warnedMissingKeys.has(key)) {
        warnedMissingKeys.add(key);
         
        console.warn(`[i18n] Missing translation key: ${key}`);
      }
      return `[MISSING: ${key}]`;
    }

    // Production / non-strict fallback: humanize last segment (e.g., "nav.dashboard" -> "Dashboard")
    return humanizeKeyLastSegment(key);
  }

  // Replace parameters
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }

  return value;
}

// Check if language is RTL
export function isRTL(lang: Language): boolean {
  return RTL_LANGUAGES.includes(lang);
}

// Get text direction
export function getDirection(lang: Language): 'ltr' | 'rtl' {
  return isRTL(lang) ? 'rtl' : 'ltr';
}

// Get appropriate font class
export function getFontClass(lang: Language): string {
  switch (lang) {
    case 'ar':
    case 'ps':
    case 'fa':
      return 'font-arabic';
    default:
      return 'font-inter';
  }
}
