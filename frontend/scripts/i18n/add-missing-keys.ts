/**
 * Add Missing Translation Keys
 * 
 * Adds missing translation keys to translation files based on Excel data
 */

/// <reference types="node" />

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Import translation objects directly
import { en } from '../../src/lib/translations/en';
import { ps } from '../../src/lib/translations/ps';
import { fa } from '../../src/lib/translations/fa';
import { ar } from '../../src/lib/translations/ar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, '../..');

// Translation file paths
const EN_FILE = path.join(FRONTEND_DIR, 'src/lib/translations/en.ts');
const PS_FILE = path.join(FRONTEND_DIR, 'src/lib/translations/ps.ts');
const FA_FILE = path.join(FRONTEND_DIR, 'src/lib/translations/fa.ts');
const AR_FILE = path.join(FRONTEND_DIR, 'src/lib/translations/ar.ts');

type Language = 'en' | 'ps' | 'fa' | 'ar';

interface KeyData {
  key: string;
  namespace: string;
  missingIn: Language[];
  values: {
    en: string;
    ps: string;
    fa: string;
    ar: string;
  };
}

// Parse the data provided by the user
const missingKeysData: KeyData[] = [
  {
    key: 'attendance.open',
    namespace: 'attendance',
    missingIn: ['ar'],
    values: { en: 'Open', ps: 'خلاص', fa: 'باز', ar: 'Open' }
  },
  {
    key: 'attendance.present',
    namespace: 'attendance',
    missingIn: ['ar'],
    values: { en: 'Present', ps: 'حاضر', fa: 'حاضر', ar: 'Present' }
  },
  {
    key: 'attendance.students',
    namespace: 'attendance',
    missingIn: ['ar'],
    values: { en: 'students', ps: 'زده کوونکي', fa: 'شاگردان', ar: 'students' }
  },
  {
    key: 'attendance.today',
    namespace: 'attendance',
    missingIn: ['ar'],
    values: { en: 'today', ps: 'نن ورځ', fa: 'امروز', ar: 'today' }
  },
  {
    key: 'attendance.total',
    namespace: 'attendance',
    missingIn: ['ar'],
    values: { en: 'total', ps: 'ټول', fa: 'مجموع', ar: 'total' }
  },
  {
    key: 'common.open',
    namespace: 'common',
    missingIn: ['ps'],
    values: { en: 'Open', ps: 'Open', fa: 'باز کردن', ar: 'فتح' }
  },
  {
    key: 'events.all',
    namespace: 'events',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'All', ps: 'ټول', fa: 'همه', ar: 'الكل' }
  },
  {
    key: 'events.users.fillAllFields',
    namespace: 'events',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Please fill all required fields', ps: 'مهرباني وکړئ ټول اړین فیلډونه ډک کړئ', fa: 'لطفاً تمام فیلدهای الزامی را پر کنید', ar: 'يرجى ملء جميع الحقول المطلوبة' }
  },
  {
    key: 'events.users.userCreateFailed',
    namespace: 'events',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Failed to create user', ps: 'د کارونکي جوړول ناکام شول', fa: 'ایجاد کاربر ناموفق بود', ar: 'فشل إنشاء المستخدم' }
  },
  {
    key: 'events.users.userCreated',
    namespace: 'events',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'User created successfully', ps: 'کارونکی په بریالیتوب سره جوړ شو', fa: 'کاربر با موفقیت ایجاد شد', ar: 'تم إنشاء المستخدم بنجاح' }
  },
  {
    key: 'events.users.userDeleteFailed',
    namespace: 'events',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Failed to delete user', ps: 'د کارونکي حذف کول ناکام شول', fa: 'حذف کاربر ناموفق بود', ar: 'فشل حذف المستخدم' }
  },
  {
    key: 'events.users.userDeleted',
    namespace: 'events',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'User deleted successfully', ps: 'کارونکی په بریالیتوب سره حذف شو', fa: 'کاربر با موفقیت حذف شد', ar: 'تم حذف المستخدم بنجاح' }
  },
  {
    key: 'events.users.userUpdateFailed',
    namespace: 'events',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Failed to update user', ps: 'د کارونکي تازه کول ناکام شول', fa: 'به‌روزرسانی کاربر ناموفق بود', ar: 'فشل تحديث المستخدم' }
  },
  {
    key: 'events.users.userUpdated',
    namespace: 'events',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'User updated successfully', ps: 'کارونکی په بریالیتوب سره تازه شو', fa: 'کاربر با موفقیت به‌روزرسانی شد', ar: 'تم تحديث المستخدم بنجاح' }
  },
  {
    key: 'exams.notes',
    namespace: 'exams',
    missingIn: ['ps'],
    values: { en: 'Notes', ps: 'Notes', fa: 'یادداشت‌ها', ar: 'Exams' }
  },
  {
    key: 'exams.students',
    namespace: 'exams',
    missingIn: ['ar'],
    values: { en: 'Students', ps: 'زده کونکي', fa: 'شاگردان', ar: 'Students' }
  },
  {
    key: 'finance.fees.assignments',
    namespace: 'finance',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Assignments', ps: 'دنده‌ګانې', fa: 'تکالیف', ar: 'المهام' }
  },
  {
    key: 'finance.fees.dashboard',
    namespace: 'finance',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Dashboard', ps: 'ډشبورډ', fa: 'داشبورد', ar: 'لوحة التحكم' }
  },
  {
    key: 'finance.fees.exceptions',
    namespace: 'finance',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Exceptions', ps: 'استثناګانې', fa: 'استثناها', ar: 'الاستثناءات' }
  },
  {
    key: 'finance.fees.payments',
    namespace: 'finance',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Payments', ps: 'تادیه‌ګانې', fa: 'پرداخت‌ها', ar: 'المدفوعات' }
  },
  {
    key: 'finance.fees.reports',
    namespace: 'finance',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Reports', ps: 'راپورونه', fa: 'گزارش‌ها', ar: 'التقارير' }
  },
  {
    key: 'finance.fees.structures',
    namespace: 'finance',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Structures', ps: 'ساختمانونه', fa: 'ساختارها', ar: 'الهياكل' }
  },
  {
    key: 'footer.integrations',
    namespace: 'footer',
    missingIn: ['fa', 'ar'],
    values: { en: 'Integrations', ps: 'تړل شوي سیسټمونه (Integrations)', fa: 'ادغام‌ها', ar: 'التكامل' }
  },
  {
    key: 'hostel.reports',
    namespace: 'hostel',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Reports', ps: 'راپورونه', fa: 'گزارش‌ها', ar: 'التقارير' }
  },
  {
    key: 'idCards.assignedCards.description',
    namespace: 'idCards',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Description', ps: 'تفصیل', fa: 'توضیحات', ar: 'الوصف' }
  },
  {
    key: 'idCards.assignedCards.title',
    namespace: 'idCards',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Assigned Cards', ps: 'تخصیص شوي کارتونه', fa: 'کارت‌های اختصاص داده شده', ar: 'البطاقات المعينة' }
  },
  {
    key: 'idCards.assignment.assignTemplate',
    namespace: 'idCards',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Assign Template', ps: 'د قالب تخصیص', fa: 'اختصاص قالب', ar: 'تعيين القالب' }
  },
  {
    key: 'idCards.assignment.assignToStudents',
    namespace: 'idCards',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Assign to Students', ps: 'زده کوونکو ته تخصیص کړئ', fa: 'اختصاص به دانش‌آموزان', ar: 'تعيين للطلاب' }
  },
  {
    key: 'idCards.assignment.confirmAssign',
    namespace: 'idCards',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Confirm Assignment', ps: 'د تخصیص تصدیق', fa: 'تأیید اختصاص', ar: 'تأكيد التعيين' }
  },
  {
    key: 'idCards.assignment.description',
    namespace: 'idCards',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Description', ps: 'تفصیل', fa: 'توضیحات', ar: 'الوصف' }
  },
  {
    key: 'leave.approved',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Approved', ps: 'تصویب شوی', fa: 'تایید شده', ar: 'موافق عليه' }
  },
  {
    key: 'leave.class',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Class', ps: 'ټولګی', fa: 'کلاس', ar: 'الصف' }
  },
  {
    key: 'leave.code',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Code', ps: 'کوډ', fa: 'کد', ar: 'الكود' }
  },
  {
    key: 'leave.creating',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Creating...', ps: 'د جوړېدو په حال کې...', fa: 'در حال ایجاد...', ar: 'جاري الإنشاء...' }
  },
  {
    key: 'leave.dates',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Dates', ps: 'نېټې', fa: 'تاریخ‌ها', ar: 'التواريخ' }
  },
  {
    key: 'leave.export',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Export', ps: 'صادرول', fa: 'خروجی', ar: 'تصدير' }
  },
  {
    key: 'leave.filters',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Filters', ps: 'فلټرونه', fa: 'فیلترها', ar: 'المرشحات' }
  },
  {
    key: 'leave.from',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'From', ps: 'له', fa: 'از', ar: 'من' }
  },
  {
    key: 'leave.generating',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Generating...', ps: 'د جوړېدو په حال کې...', fa: 'در حال تولید...', ar: 'Generating...' }
  },
  {
    key: 'leave.history',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'History', ps: 'مخینه (تاریخچه)', fa: 'تاریخچه', ar: 'السجل' }
  },
  {
    key: 'leave.loading',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Loading', ps: 'ترلاسه کیږي...', fa: 'در حال بارگذاری...', ar: 'جاري التحميل' }
  },
  {
    key: 'leave.management',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Leave Management', ps: 'د رخصتۍ مدیریت', fa: 'مدیریت مرخصی', ar: 'إدارة الإجازات' }
  },
  {
    key: 'leave.next',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Next', ps: 'بل', fa: 'بعدی', ar: 'التالي' }
  },
  {
    key: 'leave.reports',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Reports', ps: 'راپورونه', fa: 'گزارش‌ها', ar: 'التقارير' }
  },
  {
    key: 'leave.selected',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Selected:', ps: 'ټاکل شوی:', fa: 'انتخاب شده:', ar: 'المحدد:' }
  },
  {
    key: 'leave.status',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Status', ps: 'حالت', fa: 'وضعیت', ar: 'الحالة' }
  },
  {
    key: 'leave.subtitle',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Create and manage student leave requests with QR code verification', ps: 'د QR کوډ تصدیق سره د رخصتۍ غوښتنې مدیریت کړئ', fa: 'ایجاد و مدیریت درخواست‌های مرخصی دانش‌آموزان با تأیید کد QR', ar: 'إنشاء وإدارة طلبات إجازة الطلاب مع رمز QR للتحقق' }
  },
  {
    key: 'leave.title',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Leave Management', ps: 'د رخصتۍ مدیریت', fa: 'مدیریت مرخصی', ar: 'إدارة الإجازات' }
  },
  {
    key: 'leave.to',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'To', ps: 'تر', fa: 'تا', ar: 'إلى' }
  },
  {
    key: 'leave.today',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Today', ps: 'نن', fa: 'امروز', ar: 'اليوم' }
  },
  {
    key: 'leave.unknown',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Unknown', ps: 'نامعلوم', fa: 'نامشخص', ar: 'غير معروف' }
  },
  {
    key: 'leave.year',
    namespace: 'leave',
    missingIn: ['fa'],
    values: { en: 'Year', ps: 'کال', fa: 'سال', ar: 'السنة' }
  },
  {
    key: 'reports.generating',
    namespace: 'reports',
    missingIn: ['ar'],
    values: { en: 'Generating report...', ps: 'راپور جوړیږي...', fa: 'در حال تولید...', ar: 'جاري إنشاء التقرير...' }
  },
  {
    key: 'type.descriptive',
    namespace: 'type',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Descriptive', ps: 'تشریحي', fa: 'توصیفی', ar: 'وصفي' }
  },
  {
    key: 'type.essay',
    namespace: 'type',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Essay', ps: 'مقالې', fa: 'مقاله', ar: 'مقال' }
  },
  {
    key: 'type.mcq',
    namespace: 'type',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'MCQ', ps: 'MCQ', fa: 'چند گزینه‌ای', ar: 'اختيار من متعدد' }
  },
  {
    key: 'type.short',
    namespace: 'type',
    missingIn: ['en', 'ps', 'fa', 'ar'],
    values: { en: 'Short Answer', ps: 'لنډ ځواب', fa: 'پاسخ کوتاه', ar: 'إجابة قصيرة' }
  },
  {
    key: 'watermarks.status',
    namespace: 'watermarks',
    missingIn: ['ar'],
    values: { en: 'Status', ps: 'حالت', fa: 'وضعیت', ar: 'الحالة' }
  },
  {
    key: 'watermarks.subtitle',
    namespace: 'watermarks',
    missingIn: ['ar'],
    values: { en: 'Manage watermarks for reports', ps: 'د راپورونو لپاره واټر مارکونه مدیریت کړئ', fa: 'مدیریت واترمارک‌ها برای گزارش‌ها', ar: 'إدارة العلامات المائية للتقارير' }
  },
  {
    key: 'watermarks.title',
    namespace: 'watermarks',
    missingIn: ['ar'],
    values: { en: 'Watermarks', ps: 'واټر مارکونه', fa: 'واترمارک‌ها', ar: 'العلامات المائية' }
  },
  {
    key: 'watermarks.type',
    namespace: 'watermarks',
    missingIn: ['ar'],
    values: { en: 'Type', ps: 'ډول', fa: 'نوع', ar: 'النوع' }
  },
];

/**
 * Get nested value from object
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Set nested value in object
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: string): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}

/**
 * Write translation file back
 */
function writeTranslationFile(filePath: string, obj: Record<string, unknown>, lang: Language): void {
  // Use JSON.stringify with proper indentation
  // Prettier will fix the formatting when you run npm run format
  const jsonContent = JSON.stringify(obj, null, 2);
  
  const content = `import type { TranslationKeys } from './types';

export const ${lang}: TranslationKeys = ${jsonContent};
`;
  
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Main function
 */
function main() {
  console.log('🔧 Adding missing translation keys...\n');
  
  const files: Record<Language, string> = {
    en: EN_FILE,
    ps: PS_FILE,
    fa: FA_FILE,
    ar: AR_FILE,
  };
  
  // Use imported translation objects (they're already parsed)
  const translations: Record<Language, Record<string, unknown>> = {
    en: en as unknown as Record<string, unknown>,
    ps: ps as unknown as Record<string, unknown>,
    fa: fa as unknown as Record<string, unknown>,
    ar: ar as unknown as Record<string, unknown>,
  };
  
  let addedCount = 0;
  
  // Add missing keys
  for (const keyData of missingKeysData) {
    for (const lang of keyData.missingIn) {
      // Check if key already exists and has a non-empty value
      const existingValue = getNestedValue(translations[lang], keyData.key);
      if (existingValue !== undefined && typeof existingValue === 'string' && existingValue.trim() !== '') {
        console.log(`⏭️  Skipping ${keyData.key} in ${lang.toUpperCase()} (already exists with value)`);
        continue;
      }
      
      // Use the provided value for this language, or fallback to English
      let value = keyData.values[lang];
      if (!value || value.trim() === '') {
        value = keyData.values.en; // Fallback to English
      }
      
      if (value && value.trim() !== '') {
        setNestedValue(translations[lang], keyData.key, value);
        addedCount++;
        const usedFallback = !keyData.values[lang] || keyData.values[lang].trim() === '';
        console.log(`✅ Added ${keyData.key} to ${lang.toUpperCase()}${usedFallback ? ' (using EN as fallback)' : ''}`);
      } else {
        console.log(`⚠️  Skipping ${keyData.key} in ${lang.toUpperCase()} (no value available)`);
      }
    }
  }
  
  if (addedCount === 0) {
    console.log('\n⚠️  No keys were added. All keys may already exist.');
    return;
  }
  
  // Write files back
  console.log('\n💾 Writing translation files...');
  writeTranslationFile(files.en, translations.en, 'en');
  writeTranslationFile(files.ps, translations.ps, 'ps');
  writeTranslationFile(files.fa, translations.fa, 'fa');
  writeTranslationFile(files.ar, translations.ar, 'ar');
  
  console.log(`\n✅ Done! Added ${addedCount} missing translation keys.`);
  console.log('\n📝 Next steps:');
  console.log('1. Run: npm run format (to format the files)');
  console.log('2. Run: npm run i18n:keys:generate (to regenerate types.ts)');
  console.log('3. Test the application to ensure translations work correctly');
}

try {
  main();
} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
}

