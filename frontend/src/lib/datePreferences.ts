/**
 * Date Preference Types and Constants
 * Supports Gregorian, Hijri Shamsi (Solar), and Hijri Qamari (Lunar) calendars
 */

export type CalendarType = 'gregorian' | 'hijri_shamsi' | 'hijri_qamari';

export interface DatePreference {
  calendar: CalendarType;
  dateFormat: string;
  dateTimeFormat: string;
  shortDateFormat: string;
}

export const CALENDAR_TYPES = {
  GREGORIAN: 'gregorian' as const,
  HIJRI_SHAMSI: 'hijri_shamsi' as const,
  HIJRI_QAMARI: 'hijri_qamari' as const,
} as const;

// Month names for each calendar type
export const MONTH_NAMES = {
  gregorian: {
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    fa: ['ژانویه', 'فوریه', 'مارچ', 'اپریل', 'می', 'جون', 'جولای', 'اگست', 'سپتامبر', 'اکتوبر', 'نوامبر', 'دسامبر'],
    ps: ['جنوری', 'فبروری', 'مارچ', 'اپریل', 'می', 'جون', 'جولای', 'اګست', 'سپتمبر', 'اکتوبر', 'نومبر', 'دسمبر'],
    ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  },
  hijri_shamsi: {
    en: ['Hamal', 'Sawr', 'Jawza', 'Saratan', 'Asad', 'Sonbola', 'Mizan', 'Aqrab', 'Qaws', 'Jadi', 'Dalvæ', 'Hut'],
    fa: ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'],
    ps: ['حمل', 'ثور', 'جوزا', 'سرط', 'اسد', 'سنب', 'میز', 'عقر', 'قوس', 'جدی', 'دلو', 'حوت'],
    ar: ['حمل', 'ثور', 'جوزا', 'سرطان', 'أسد', 'سنبله', 'ميزان', 'عقرب', 'قوس', 'جدي', 'دلو', 'حوت'],
  },
  hijri_qamari: {
    en: ['Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani', 'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban', 'Ramadan', 'Shawwal', 'Dhul-Qadah', 'Dhul-Hijjah'],
    fa: ['محرم', 'صفر', 'ربیع الاول', 'ربیع الثانی', 'جمادی الاول', 'جمادی الثانی', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذی القعده', 'ذی الحجه'],
    ps: ['محرم', 'صفر', 'ربیع الاول', 'ربیع الثانی', 'جمادی الاول', 'جمادی الثانی', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذی القعده', 'ذی الحجه'],
    ar: ['محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'],
  },
};

// Short month names (3 letters)
export const SHORT_MONTH_NAMES = {
  gregorian: {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    fa: ['ژان', 'فور', 'مار', 'اپر', 'می', 'جون', 'جول', 'اگس', 'سپت', 'اکت', 'نوا', 'دسا'],
    ps: ['جنو', 'فبر', 'مار', 'اپر', 'می', 'جون', 'جول', 'اګس', 'سپت', 'اکت', 'نوم', 'دسم'],
    ar: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'],
  },
  hijri_shamsi: {
    en: ['Ham', 'Saw', 'Jaw', 'Sar', 'Asa', 'Son', 'Miz', 'Aqr', 'Qaw', 'Jad', 'Dal', 'Hut'],
    fa: ['حمل', 'ثور', 'جوزا', 'سرط', 'اسد', 'سنب', 'میز', 'عقر', 'قوس', 'جدی', 'دلو', 'حوت'],
    ps: ['حمل', 'ثور', 'جوزا', 'سرط', 'اسد', 'سنب', 'میز', 'عقر', 'قوس', 'جدی', 'دلو', 'حوت'],
    ar: ['حمل', 'ثور', 'جوز', 'سرط', 'أسد', 'سنب', 'ميز', 'عقر', 'قوس', 'جدي', 'دلو', 'حوت'],
  },
  hijri_qamari: {
    en: ['Muh', 'Saf', 'Rab1', 'Rab2', 'Jum1', 'Jum2', 'Raj', 'Sha', 'Ram', 'Shaw', 'DhuQ', 'DhuH'],
    fa: ['محر', 'صفر', 'رب۱', 'رب۲', 'جم۱', 'جم۲', 'رجب', 'شعب', 'رمض', 'شوا', 'ذیق', 'ذیح'],
    ps: ['محر', 'صفر', 'رب۱', 'رب۲', 'جم۱', 'جم۲', 'رجب', 'شعب', 'رمض', 'شوا', 'ذیق', 'ذیح'],
    ar: ['محر', 'صفر', 'رب١', 'رب٢', 'جم١', 'جم٢', 'رجب', 'شعب', 'رمض', 'شوا', 'ذوق', 'ذوح'],
  },
};

// Default date formats for each calendar type
export const DEFAULT_DATE_FORMATS: Record<CalendarType, DatePreference> = {
  gregorian: {
    calendar: 'gregorian',
    dateFormat: 'MMM d, yyyy',
    dateTimeFormat: 'MMM d, yyyy h:mm a',
    shortDateFormat: 'MMM dd',
  },
  hijri_shamsi: {
    calendar: 'hijri_shamsi',
    dateFormat: 'MMM d, yyyy',
    dateTimeFormat: 'MMM d, yyyy h:mm a',
    shortDateFormat: 'MMM dd',
  },
  hijri_qamari: {
    calendar: 'hijri_qamari',
    dateFormat: 'MMM d, yyyy',
    dateTimeFormat: 'MMM d, yyyy h:mm a',
    shortDateFormat: 'MMM dd',
  },
};

// LocalStorage key for date preference
export const DATE_PREFERENCE_KEY = 'nazim-date-preference';
