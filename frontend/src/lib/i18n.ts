// Nazim School Management System - Internationalization
// Translation system supporting English, Pashto, Dari, and Arabic

export type Language = 'en' | 'ps' | 'fa' | 'ar';

// Re-export TranslationKeys type for convenience
export type { TranslationKeys } from './translations/types';

// Import translations from separate files
import { ar } from './translations/ar';
import { en } from './translations/en';
import { fa } from './translations/fa';
import { ps } from './translations/ps';

// Translation dictionary
export const translations = { en, ps, fa, ar };

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
  const safeLang = lang && translations[lang] ? lang : 'en';
  const keys = key.split('.');
  let value: unknown = translations[safeLang];

  // Try to get translation from requested language
  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }

  // If translation not found, try English fallback
  if (typeof value !== 'string' && safeLang !== 'en') {
    value = translations.en;
    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in (value as Record<string, unknown>)) {
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
