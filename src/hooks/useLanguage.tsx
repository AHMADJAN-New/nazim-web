// Nazim School Management System - Language Hook
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, t, isRTL, getDirection, getFontClass } from '@/lib/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
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
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('nazim-language', lang);
  };

  // Translation function bound to current language
  const translate = (key: string, params?: Record<string, string | number>) => {
    return t(key, language, params);
  };

  // Update document attributes when language changes
  useEffect(() => {
    const direction = getDirection(language);
    const fontClass = getFontClass(language);
    
    // Set direction on html element
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    
    // Update body class for font
    document.body.className = document.body.className
      .replace(/font-(inter|arabic)/g, '')
      .trim();
    document.body.classList.add(fontClass);
    
    // Add RTL class to body if needed
    if (direction === 'rtl') {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: translate,
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