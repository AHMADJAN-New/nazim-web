// Nazim School Management System - Language Hook
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { Language, t, isRTL, getDirection, getFontClass, loadTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/translations/keys.generated';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  /**
   * Type-safe translation function (accepts only known keys from EN).
   * Generated union: `frontend/src/lib/translations/keys.generated.ts`
   */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  /**
   * Escape hatch for dynamic/legacy keys that are not yet in EN.
   * Prefer adding the missing keys to EN and regenerating keys.
   */
  tUnsafe: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  direction: 'ltr' | 'rtl';
  fontClass: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get from localStorage or default to English
    const saved = localStorage.getItem('nazim-language');
    const lang = (saved as Language) || 'en';
    // Validate language - only allow supported languages
    return ['en', 'ps', 'fa', 'ar'].includes(lang) ? lang : 'en';
  });

  const setLanguage = (lang: Language) => {
    // Only set if it's a valid language
    if (['en', 'ps', 'fa', 'ar'].includes(lang)) {
      // Save to localStorage first (cache the selection)
      localStorage.setItem('nazim-language', lang);
      
      // Pre-load the new language translation before refresh
      loadTranslation(lang)
        .then(() => {
          // After translation is loaded, refresh the page to apply changes
          // This ensures all components re-render with the new language
          window.location.reload();
        })
        .catch(() => {
          // Even if translation load fails, refresh to apply language change
          // English fallback will be used
          window.location.reload();
        });
    }
  };

  // Load the initial language translation on mount (if not English)
  // English is already loaded synchronously in i18n.ts
  useEffect(() => {
    if (language !== 'en') {
      // Delay loading by 100ms to prioritize initial render
      const timer = setTimeout(() => {
        loadTranslation(language).catch(() => {
          // Silently fail - English is already loaded as fallback
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []); // Only on mount

  // Translation function bound to current language
  const translate = (key: TranslationKey, params?: Record<string, string | number>) => {
    return t(key, language, params);
  };

  const translateUnsafe = (key: string, params?: Record<string, string | number>) => {
    return t(key, language, params);
  };

  // Update document attributes when language changes
  useEffect(() => {
    const direction = getDirection(language);
    const fontClass = getFontClass(language);
    
    // Set direction on html element - this affects the entire page
    document.documentElement.setAttribute('dir', direction);
    document.documentElement.setAttribute('lang', language);
    
    // Update body class for font
    document.body.className = document.body.className
      .replace(/font-(inter|arabic)/g, '')
      .trim();
    document.body.classList.add(fontClass);
    
    // Add RTL class to body for additional styling if needed
    if (direction === 'rtl') {
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.remove('rtl');
      document.body.classList.add('ltr');
    }
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translate,
    tUnsafe: translateUnsafe,
    isRTL: isRTL(language),
    direction: getDirection(language),
    fontClass: getFontClass(language),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}