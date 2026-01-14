/**
 * Hook to use index page translations
 * Loads and provides translations for the index/landing page
 */

import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import type { Language } from '@/lib/i18n';

// Lazy load translations
let translationsCache: Record<Language, any> | null = null;

async function loadIndexTranslation(lang: Language): Promise<any> {
  if (translationsCache?.[lang]) {
    return translationsCache[lang];
  }

  let translation: any;
  switch (lang) {
    case 'en':
      translation = (await import('./index.en')).indexTranslations;
      break;
    case 'fa':
      translation = (await import('./index.fa')).indexTranslations;
      break;
    case 'ps':
      translation = (await import('./index.ps')).indexTranslations;
      break;
    case 'ar':
      // Arabic not yet implemented, fallback to English
      translation = (await import('./index.en')).indexTranslations;
      break;
    default:
      translation = (await import('./index.en')).indexTranslations;
  }

  if (!translationsCache) {
    translationsCache = {} as Record<Language, any>;
  }
  translationsCache[lang] = translation;
  return translation;
}

// Pre-load English synchronously
import { indexTranslations as enTranslations } from './index.en';
if (!translationsCache) {
  translationsCache = {} as Record<Language, any>;
}
translationsCache.en = enTranslations;

export function useIndexTranslations() {
  const { language } = useLanguage();
  const [currentTranslations, setCurrentTranslations] = useState<any>(() => {
    // Initialize with cached translation or English fallback
    return translationsCache?.[language] || translationsCache?.en || {};
  });

  // Load translations when language changes
  useEffect(() => {
    // If translation is already cached, use it immediately
    if (translationsCache?.[language]) {
      setCurrentTranslations(translationsCache[language]);
      return;
    }

    // Otherwise, load it asynchronously
    loadIndexTranslation(language)
      .then((translation) => {
        setCurrentTranslations(translation);
      })
      .catch(() => {
        // Fallback to English on error
        setCurrentTranslations(translationsCache?.en || {});
      });
  }, [language]);

  // Helper function to get nested translation (returns string or array)
  const t = useMemo(() => {
    return (key: string): string | string[] => {
      const keys = key.split('.');
      let value: any = currentTranslations;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Fallback to English
          value = translationsCache?.en;
          for (const fallbackKey of keys) {
            if (value && typeof value === 'object' && fallbackKey in value) {
              value = value[fallbackKey];
            } else {
              return `[MISSING: ${key}]`;
            }
          }
          break;
        }
      }

      if (typeof value === 'string') {
        return value;
      }
      if (Array.isArray(value)) {
        return value;
      }
      return `[MISSING: ${key}]`;
    };
  }, [currentTranslations]);

  // Helper to get nested value (for arrays or objects)
  const get = useMemo(() => {
    return (key: string): any => {
      const keys = key.split('.');
      let value: any = currentTranslations;
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          // Fallback to English
          value = translationsCache?.en;
          for (const fallbackKey of keys) {
            if (value && typeof value === 'object' && fallbackKey in value) {
              value = value[fallbackKey];
            } else {
              return undefined;
            }
          }
          break;
        }
      }
      return value;
    };
  }, [currentTranslations]);

  return { t, translations: currentTranslations, get };
}

