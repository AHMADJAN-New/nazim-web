// Nazim School Management System - Internationalization
// Translation system supporting English, Pashto, Dari, and Arabic

export type Language = 'en' | 'ps' | 'fa' | 'ar';

// Lazy load translations to reduce initial bundle size (3.3 MB total)
// Only load the active language + English (fallback)
let translationsCache: Record<Language, any> | null = null;
let loadedLanguages: Set<Language> = new Set();
let loadingPromises: Map<Language, Promise<any>> = new Map();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLanguageCacheReady(lang: Language): boolean {
  if (lang === 'en') return true;
  const cached = translationsCache?.[lang];
  return isRecord(cached);
}

function lookupKey(translations: unknown, key: string): unknown {
  const segments = key.split('.');
  let value: unknown = translations;

  for (let i = 0; i < segments.length; i++) {
    if (!isRecord(value)) return undefined;

    // Try the longest remaining path first (supports keys that intentionally include dots)
    const remainingPath = segments.slice(i).join('.');
    if (Object.prototype.hasOwnProperty.call(value, remainingPath)) {
      return (value as Record<string, unknown>)[remainingPath];
    }

    const segment = segments[i];
    if (Object.prototype.hasOwnProperty.call(value, segment)) {
      value = (value as Record<string, unknown>)[segment];
      continue;
    }

    return undefined;
  }

  return value;
}

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
    try {
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

      // Defensive: don't mark a language as "loaded" unless we actually got an object.
      // If the import path or export name is wrong, translation would be undefined and we'd
      // end up treating English fallback as "missing in ps/fa/ar" (false positives).
      if (!isRecord(translation)) {
        throw new Error(`[i18n] Failed to load translations for "${lang}" (invalid module export)`);
      }

      if (!translationsCache) {
        translationsCache = {} as Record<Language, any>;
      }
      translationsCache[lang] = translation;
      loadedLanguages.add(lang);
      return translation;
    } finally {
      loadingPromises.delete(lang);
    }
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
  if (isLanguageCacheReady(lang) && translationsCache?.[lang]) {
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
  
  const langReady = isLanguageCacheReady(safeLang);

  // If language isn't loaded yet, trigger async load but DO NOT claim "English fallback"
  // (otherwise we'd get false-positive warnings for keys that DO exist in ps/fa/ar).
  if (!langReady && safeLang !== 'en') {
    loadTranslation(safeLang).catch(() => {
      // Silently fail - English fallback will be used
    });
  }

  const langObj = langReady ? getTranslationsSync(safeLang) : getTranslationsSync('en');
  const enObj = getTranslationsSync('en');

  const langValue = lookupKey(langObj, key);
  const enValue = lookupKey(enObj, key);

  const isLangString = typeof langValue === 'string';
  const isEnString = typeof enValue === 'string';

  const looksLikeHardcoded = !key.includes('.') && !isLangString;

  // If language is ready and key missing there but exists in EN -> [EN] indicator
  const usingEnglishFallback = safeLang !== 'en' && langReady && !isLangString && isEnString;

  let finalValue: string | undefined;
  if (isLangString) {
    finalValue = langValue;
  } else if (usingEnglishFallback) {
    finalValue = enValue as string;
  } else if (isEnString) {
    // Language isn't ready yet (or it's en) — return EN without the [EN] marker to avoid noise.
    finalValue = enValue as string;
  }

  if (typeof finalValue !== 'string') {
    if (looksLikeHardcoded) {
      // This looks like a hardcoded string (not a translation key)
      if (!warnedMissingKeys.has(key)) {
        warnedMissingKeys.add(key);
        console.warn(`[i18n] Hardcoded string detected (not a translation key): "${key}". Use a translation key like "common.save" instead.`);
      }
      // Return with [HARDCODED] prefix
      return `[HARDCODED] ${key}`;
    }
    
    if (isStrictMissingKeyMode()) {
      if (!warnedMissingKeys.has(key)) {
        warnedMissingKeys.add(key);
        console.warn(`[i18n] Missing translation key: ${key} (missing in both ${safeLang} and English)`);
      }
      // Return with [MISSING:] prefix
      return `[MISSING: ${key}]`;
    }

    // Production / non-strict fallback: humanize last segment (e.g., "nav.dashboard" -> "Dashboard")
    return humanizeKeyLastSegment(key);
  }

  // Replace parameters
  let rendered = finalValue;
  if (params) {
    rendered = rendered.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }

  // If using English fallback, add [EN] prefix (plain string, no styling)
  if (usingEnglishFallback) {
    if (!warnedMissingKeys.has(key)) {
      warnedMissingKeys.add(key);
      console.warn(`[i18n] Missing translation key in ${safeLang}: ${key} (using English fallback)`);
    }
    return `[EN] ${rendered}`;
  }

  return rendered;
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
