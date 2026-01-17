// Centralized Toast Utility with RTL Support
// This utility provides translated toast notifications that respect language direction

import { toast, ExternalToast } from 'sonner';

import { t, isRTL, Language, loadTranslation } from './i18n';

// Storage key for language (same as useLanguage hook)
const LANGUAGE_STORAGE_KEY = 'nazim-language';

/**
 * Get current language from localStorage
 */
export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const lang = (saved as Language) || 'en';
  // Validate language - only allow supported languages
  return ['en', 'ps', 'fa', 'ar'].includes(lang) ? lang : 'en';
}

/**
 * Get toast position based on current language direction
 * RTL languages: bottom-left
 * LTR languages: bottom-right
 */
export function getToastPosition(): 'bottom-left' | 'bottom-right' {
  const lang = getLanguage();
  return isRTL(lang) ? 'bottom-left' : 'bottom-right';
}

/**
 * Translate a message using translation key or return the message as-is if not a key
 */
function translateMessage(
  messageOrKey: string,
  params?: Record<string, string | number>
): string {
  const lang = getLanguage();
  
  // If it looks like a translation key (contains dots), try to translate
  if (messageOrKey.includes('.')) {
    // Ensure language is loaded (trigger async load if needed)
    // The t() function will handle this, but we trigger it explicitly to ensure it's in progress
    if (lang !== 'en') {
      loadTranslation(lang).catch(() => {
        // Silently fail - English fallback will be used
      });
    }
    
    // Use t() function which handles all translation logic including fallbacks
    // It will return the translated text, or English with [EN] prefix if missing
    const translated = t(messageOrKey, lang, params);
    
    // If t() returns a [MISSING:] or [HARDCODED:] prefix, it means the key doesn't exist
    if (translated.startsWith('[MISSING:') || translated.startsWith('[HARDCODED:')) {
      // Return the original key as fallback
      return messageOrKey;
    }
    
    // Strip [EN] prefix if present (it indicates English fallback, but we still want to show the message)
    // The [EN] prefix is useful for debugging but not for user-facing toasts
    if (translated.startsWith('[EN] ')) {
      return translated.substring(5); // Remove "[EN] " prefix
    }
    
    // Return the translated text
    return translated;
  }
  
  // Not a translation key, return as-is
  return messageOrKey;
}

/**
 * Show a success toast with translation support
 * @param messageOrKey - Translation key (e.g., 'academic.academicYears.academicYearCreated') or plain message
 * @param params - Optional parameters for translation interpolation
 * @param options - Optional sonner toast options
 */
function success(
  messageOrKey: string,
  params?: Record<string, string | number>,
  options?: ExternalToast
): string | number {
  const message = translateMessage(messageOrKey, params);
  return toast.success(message, {
    position: getToastPosition(),
    ...options,
  });
}

/**
 * Show an error toast with translation support
 * @param messageOrKey - Translation key or plain message
 * @param params - Optional parameters for translation interpolation
 * @param options - Optional sonner toast options
 */
function error(
  messageOrKey: string,
  params?: Record<string, string | number>,
  options?: ExternalToast
): string | number {
  const message = translateMessage(messageOrKey, params);
  return toast.error(message, {
    position: getToastPosition(),
    ...options,
  });
}

/**
 * Show an info toast with translation support
 * @param messageOrKey - Translation key or plain message
 * @param params - Optional parameters for translation interpolation
 * @param options - Optional sonner toast options
 */
function info(
  messageOrKey: string,
  params?: Record<string, string | number>,
  options?: ExternalToast
): string | number {
  const message = translateMessage(messageOrKey, params);
  return toast.info(message, {
    position: getToastPosition(),
    ...options,
  });
}

/**
 * Show a warning toast with translation support
 * @param messageOrKey - Translation key or plain message
 * @param params - Optional parameters for translation interpolation
 * @param options - Optional sonner toast options
 */
function warning(
  messageOrKey: string,
  params?: Record<string, string | number>,
  options?: ExternalToast
): string | number {
  const message = translateMessage(messageOrKey, params);
  return toast.warning(message, {
    position: getToastPosition(),
    ...options,
  });
}

/**
 * Show a loading toast with translation support
 * @param messageOrKey - Translation key or plain message
 * @param params - Optional parameters for translation interpolation
 * @param options - Optional sonner toast options
 */
function loading(
  messageOrKey: string,
  params?: Record<string, string | number>,
  options?: ExternalToast
): string | number {
  const message = translateMessage(messageOrKey, params);
  return toast.loading(message, {
    position: getToastPosition(),
    ...options,
  });
}

/**
 * Dismiss a toast by ID or all toasts
 */
function dismiss(toastId?: string | number): void {
  toast.dismiss(toastId);
}

/**
 * Centralized toast utility with RTL support and translations
 * 
 * Usage:
 * ```typescript
 * import { showToast } from '@/lib/toast';
 * 
 * // Using translation key
 * showToast.success('academic.academicYears.academicYearCreated');
 * 
 * // With parameters
 * showToast.success('academic.classes.classCreated', { name: 'Class A' });
 * 
 * // Plain message (not recommended, use translation keys)
* showToast.error('errorBoundary.somethingWentWrong');
 * ```
 */
export const showToast = {
  success,
  error,
  info,
  warning,
  loading,
  dismiss,
};

// Also export individual functions for flexibility
export { success, error, info, warning, loading, dismiss };

