/**
 * Translation Validation Utilities
 * 
 * Validates translation files against keys.generated.ts (single source of truth)
 * Detects missing keys, unused keys, and provides sync functionality
 */

import { TRANSLATION_KEYS } from './keys.generated';
import { en } from './en';
import { ps } from './ps';
import { fa } from './fa';
import { ar } from './ar';
import type { TranslationRow } from './utils';

type Language = 'en' | 'ps' | 'fa' | 'ar';

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
 * Get all keys from a translation object (flattened)
 */
function getAllKeysFromObject(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const keys = new Set<string>();
  
  function walk(value: unknown, currentPrefix: string) {
    if (typeof value === 'string') {
      if (currentPrefix) {
        keys.add(currentPrefix);
      }
      return;
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const [key, val] of Object.entries(value)) {
        const fullKey = currentPrefix ? `${currentPrefix}.${key}` : key;
        walk(val, fullKey);
      }
    }
  }
  
  walk(obj, prefix);
  return keys;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Keys in keys.generated.ts but missing in translation files */
  missingInFiles: {
    en: string[];
    ps: string[];
    fa: string[];
    ar: string[];
  };
  /** Keys in translation files but not in keys.generated.ts (orphaned keys) */
  orphanedKeys: string[];
  /** All keys from keys.generated.ts */
  totalExpectedKeys: number;
  /** Keys actually present in translation files */
  keysInFiles: {
    en: number;
    ps: number;
    fa: number;
    ar: number;
  };
}

/**
 * Validate translation files against keys.generated.ts
 */
export function validateTranslations(): ValidationResult {
  const expectedKeys = new Set(TRANSLATION_KEYS);
  const translations = {
    en: en as unknown as Record<string, unknown>,
    ps: ps as unknown as Record<string, unknown>,
    fa: fa as unknown as Record<string, unknown>,
    ar: ar as unknown as Record<string, unknown>,
  };
  
  // Get all keys from each translation file
  const keysInEn = getAllKeysFromObject(translations.en);
  const keysInPs = getAllKeysFromObject(translations.ps);
  const keysInFa = getAllKeysFromObject(translations.fa);
  const keysInAr = getAllKeysFromObject(translations.ar);
  
  // Find missing keys (in keys.generated.ts but not in translation files)
  const missingInEn = Array.from(expectedKeys).filter(key => !keysInEn.has(key));
  const missingInPs = Array.from(expectedKeys).filter(key => !keysInPs.has(key));
  const missingInFa = Array.from(expectedKeys).filter(key => !keysInFa.has(key));
  const missingInAr = Array.from(expectedKeys).filter(key => !keysInAr.has(key));
  
  // Find orphaned keys (in translation files but not in keys.generated.ts)
  const allFileKeys = new Set<string>();
  keysInEn.forEach(k => allFileKeys.add(k));
  keysInPs.forEach(k => allFileKeys.add(k));
  keysInFa.forEach(k => allFileKeys.add(k));
  keysInAr.forEach(k => allFileKeys.add(k));
  
  const orphanedKeys = Array.from(allFileKeys).filter(key => !expectedKeys.has(key));
  
  return {
    missingInFiles: {
      en: missingInEn.sort(),
      ps: missingInPs.sort(),
      fa: missingInFa.sort(),
      ar: missingInAr.sort(),
    },
    orphanedKeys: orphanedKeys.sort(),
    totalExpectedKeys: expectedKeys.size,
    keysInFiles: {
      en: keysInEn.size,
      ps: keysInPs.size,
      fa: keysInFa.size,
      ar: keysInAr.size,
    },
  };
}

/**
 * Get all translation rows validated against keys.generated.ts
 * This ensures all keys from keys.generated.ts are present
 */
export function getValidatedTranslations(): TranslationRow[] {
  const expectedKeys = new Set(TRANSLATION_KEYS);
  const translations = {
    en: en as unknown as Record<string, unknown>,
    ps: ps as unknown as Record<string, unknown>,
    fa: fa as unknown as Record<string, unknown>,
    ar: ar as unknown as Record<string, unknown>,
  };
  
  const rows: TranslationRow[] = [];
  
  // Create rows for all expected keys
  for (const key of Array.from(expectedKeys).sort()) {
    const row: TranslationRow = {
      key,
      en: getNestedValue(translations.en, key),
      ps: getNestedValue(translations.ps, key),
      fa: getNestedValue(translations.fa, key),
      ar: getNestedValue(translations.ar, key),
    };
    
    rows.push(row);
  }
  
  return rows;
}

/**
 * Sync missing keys: add keys from keys.generated.ts that are missing in translation files
 * Returns TranslationRow[] with all keys from keys.generated.ts, using EN as fallback for missing translations
 */
export function syncWithGeneratedKeys(): TranslationRow[] {
  const expectedKeys = new Set(TRANSLATION_KEYS);
  const translations = {
    en: en as unknown as Record<string, unknown>,
    ps: ps as unknown as Record<string, unknown>,
    fa: fa as unknown as Record<string, unknown>,
    ar: ar as unknown as Record<string, unknown>,
  };
  
  const rows: TranslationRow[] = [];
  const languages: Language[] = ['en', 'ps', 'fa', 'ar'];
  
  // Create rows for all expected keys
  for (const key of Array.from(expectedKeys).sort()) {
    const row: TranslationRow = {
      key,
      en: getNestedValue(translations.en, key),
      ps: getNestedValue(translations.ps, key),
      fa: getNestedValue(translations.fa, key),
      ar: getNestedValue(translations.ar, key),
    };
    
    // Fill missing translations with EN as fallback
    if (!row.en || !row.en.trim()) {
      // If EN is also missing, use key name as placeholder
      row.en = `[MISSING: ${key}]`;
    }
    
    for (const lang of languages) {
      if (!row[lang] || !row[lang].trim()) {
        // Use EN as fallback, or placeholder if EN is also missing
        row[lang] = row.en || `[MISSING: ${key}]`;
      }
    }
    
    rows.push(row);
  }
  
  return rows;
}


