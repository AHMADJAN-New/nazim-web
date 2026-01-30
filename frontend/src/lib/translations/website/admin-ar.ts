/**
 * Website admin area translations (Arabic).
 * Used for: Website Manager page, editor UI, sidebar labels in the main app.
 */

import type { WebsiteAdminTranslations } from './types';

export const websiteAdminAr: WebsiteAdminTranslations = {
  websiteManager: {
    title: 'إدارة موقع المدرسة',
    subtitle: 'إدارة المحتوى والهوية والروابط الخاصة بالموقع لكل مدرسة',
    planCompleteEnterprise: 'كامل/مؤسسي',
    openPublicSite: 'فتح الموقع العام',
    settings: 'الإعدادات',
    pages: 'الصفحات',
    posts: 'الإعلانات',
    events: 'الفعاليات',
    media: 'الوسائط',
    domains: 'النطاقات',
    brandingSettings: 'الهوية واللغة',
    schoolSlug: 'اسم المدرسة في الرابط',
    defaultLanguage: 'اللغة الافتراضية',
    enabledLanguages: 'اللغات المفعلة (مفصولة بفاصلة)',
    primaryColor: 'اللون الأساسي',
    secondaryColor: 'اللون الثانوي',
    accentColor: 'لون التمييز',
    fontFamily: 'خط الكتابة',
    saveSettings: 'حفظ الإعدادات',
    noPages: 'لا توجد صفحات بعد. أنشئ أول صفحة من البناء.',
    noPosts: 'لا توجد إعلانات بعد. انشر أول إعلان.',
    noEvents: 'لا توجد فعاليات قادمة. أضف فعاليات للتقويم.',
    noMedia: 'لا توجد وسائط مرفوعة بعد.',
    noDomains: 'لا توجد نطاقات مرتبطة بعد.',
    public: 'عام',
    private: 'خاص'
  },
  website: {
    editor: {
      placeholder: 'ابدأ الكتابة...',
      loading: 'جاري تحميل المحرر...',
      toolbar: {
        bold: 'عريض',
        italic: 'مائل',
        heading1: 'عنوان 1',
        heading2: 'عنوان 2',
        heading3: 'عنوان 3',
        bulletList: 'قائمة نقطية',
        orderedList: 'قائمة مرقمة',
        blockquote: 'اقتباس',
        link: 'رابط',
        image: 'صورة',
        undo: 'تراجع',
        redo: 'إعادة'
      },
      link: {
        title: 'إدراج رابط',
        description: 'أدخل عنوان URL للرابط',
        url: 'URL',
        insert: 'إدراج'
      },
      image: {
        title: 'إدراج صورة',
        description: 'أدخل عنوان URL للصورة أو ارفع ملف',
        url: 'عنوان URL للصورة',
        or: 'أو',
        insert: 'إدراج',
        upload: 'رفع صورة'
      }
    }
  },
  navWebsite: {
    websiteManager: 'إدارة موقع المدرسة',
    'websiteManager.settings': 'الإعدادات',
    'websiteManager.openPublicSite': 'فتح الموقع العام'
  }
};
