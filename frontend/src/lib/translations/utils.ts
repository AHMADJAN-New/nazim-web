import type { TranslationKeys } from './types';
import { en } from './en';
import { ps } from './ps';
import { fa } from './fa';
import { ar } from './ar';

export type TranslationRow = {
  key: string;
  en: string;
  ps: string;
  fa: string;
  ar: string;
};

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return '';
    }
  }
  
  return typeof current === 'string' ? current : '';
}

/**
 * Flatten translation object to key-value pairs for Excel
 * Example: { common: { loading: 'Loading...' } } -> [{ key: 'common.loading', en: 'Loading...', ps: '...', fa: '...', ar: '...' }]
 */
export function flattenTranslations(): TranslationRow[] {
  const translations = { en, ps, fa, ar };
  const flattened: TranslationRow[] = [];

  function traverse(obj: Record<string, unknown>, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        flattened.push({
          key: fullKey,
          en: getNestedValue(translations.en as unknown as Record<string, unknown>, fullKey),
          ps: getNestedValue(translations.ps as unknown as Record<string, unknown>, fullKey),
          fa: getNestedValue(translations.fa as unknown as Record<string, unknown>, fullKey),
          ar: getNestedValue(translations.ar as unknown as Record<string, unknown>, fullKey),
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        traverse(value as Record<string, unknown>, fullKey);
      }
    }
  }

  traverse(en as unknown as Record<string, unknown>);
  return flattened.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Convert flattened translations back to nested objects
 */
export function nestTranslations(
  flattened: TranslationRow[]
): { en: TranslationKeys; ps: TranslationKeys; fa: TranslationKeys; ar: TranslationKeys } {
  const nested = {
    en: {} as Record<string, unknown>,
    ps: {} as Record<string, unknown>,
    fa: {} as Record<string, unknown>,
    ar: {} as Record<string, unknown>,
  };

  for (const row of flattened) {
    const keys = row.key.split('.');
    
    // Create nested structure for each language
    for (const lang of ['en', 'ps', 'fa', 'ar'] as const) {
      let current = nested[lang];

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key] as Record<string, unknown>;
      }

      const lastKey = keys[keys.length - 1];
      current[lastKey] = row[lang];
    }
  }

  return {
    en: nested.en as TranslationKeys,
    ps: nested.ps as TranslationKeys,
    fa: nested.fa as TranslationKeys,
    ar: nested.ar as TranslationKeys,
  };
}

/**
 * Get all keys from a translation object
 */
function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'string') {
      keys.push(fullKey);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    }
  }
  
  return keys;
}

/**
 * Sync missing translation keys across all languages
 * Adds missing keys with the first available translation as placeholder
 * Priority: English > Pashto > Farsi > Arabic
 */
export function syncMissingKeys(): TranslationRow[] {
  const translations = { en, ps, fa, ar };
  const languages: Array<'en' | 'ps' | 'fa' | 'ar'> = ['en', 'ps', 'fa', 'ar'];
  
  // Collect all keys from ALL languages (not just English)
  const allKeysSet = new Set<string>();
  for (const lang of languages) {
    const keys = getAllKeys(translations[lang] as unknown as Record<string, unknown>);
    keys.forEach(key => allKeysSet.add(key));
  }
  
  const allKeys = Array.from(allKeysSet);
  
  // Create a map of existing translations
  const existingMap = new Map<string, TranslationRow>();
  
  // First, collect all existing translations
  for (const key of allKeys) {
    const row: TranslationRow = {
      key,
      en: getNestedValue(translations.en as unknown as Record<string, unknown>, key),
      ps: getNestedValue(translations.ps as unknown as Record<string, unknown>, key),
      fa: getNestedValue(translations.fa as unknown as Record<string, unknown>, key),
      ar: getNestedValue(translations.ar as unknown as Record<string, unknown>, key),
    };
    existingMap.set(key, row);
  }
  
  // Fill missing translations with the first available translation as placeholder
  // Priority: English > Pashto > Farsi > Arabic
  for (const key of allKeys) {
    const row = existingMap.get(key)!;
    
    // Find the first available translation to use as placeholder
    let placeholder = '';
    for (const lang of languages) {
      const value = row[lang];
      if (value && value.trim()) {
        placeholder = value;
        break;
      }
    }
    
    // Fill missing translations with placeholder
    if (placeholder) {
      if (!row.en || !row.en.trim()) row.en = placeholder;
      if (!row.ps || !row.ps.trim()) row.ps = placeholder;
      if (!row.fa || !row.fa.trim()) row.fa = placeholder;
      if (!row.ar || !row.ar.trim()) row.ar = placeholder;
    }
  }
  
  return Array.from(existingMap.values()).sort((a, b) => a.key.localeCompare(b.key));
}

