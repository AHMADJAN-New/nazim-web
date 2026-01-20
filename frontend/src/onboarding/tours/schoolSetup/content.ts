/**
 * School Setup Tour - Content (i18n-aware)
 *
 * IMPORTANT:
 * - This content is resolved dynamically using the currently selected language.
 * - Nazim Standards: Professional tone, native localization (Pashto/Dari), and user-centric descriptions.
 */

import { getCurrentLanguage } from '../../rtl';

type SupportedLanguage = 'en' | 'ps' | 'fa' | 'ar';

function getLang(): SupportedLanguage {
  const lang = getCurrentLanguage();
  return (['ps', 'fa', 'ar'] as const).includes(lang as any) 
    ? (lang as SupportedLanguage) 
    : 'en';
}

// English (Refined)
export const tourContentEn = {
  welcome: {
    title: 'School Setup Tour',
    icon: 'School',
    text: [
      "Welcome to the School Setup Tour! This guide will walk you through the essential steps to configure your school in Nazim.",
      'You will learn how to edit school details, create academic years, set up classes, and assign subjects.',
    ],
  },
  editSchoolDetails: {
    title: 'Edit School Details',
    icon: 'Building',
    text: [
      'Start by configuring your school information. Click the edit button to update:',
      '• School name (in multiple languages if needed)',
      '• School logo and branding',
      '• Address and contact information',
      '• Language and calendar preferences',
      'These settings will be used throughout the system for reports and communications.',
    ],
  },
  createAcademicYear: {
    title: 'Create Academic Year',
    icon: 'Calendar',
    text: [
      'Academic years define the time periods for your school operations.',
      'Click "Create Academic Year" to set up a new year with:',
      '• Start and end dates',
      '• Year name (e.g., "2024-2025")',
      '• Status (active, planning, completed)',
      'You can mark one year as current, which will be used as the default for new records.',
    ],
  },
  createClasses: {
    title: 'Create Classes',
    icon: 'Users',
    text: [
      'Classes are the building blocks of your academic structure.',
      'Click "Create Class" to add a new class with:',
      '• Class name and code',
      '• Grade level',
      '• Default capacity (number of students)',
      'Classes can be reused across multiple academic years.',
    ],
  },
  assignClassesToYear: {
    title: 'Assign Classes to Academic Year',
    icon: 'Link',
    text: [
      'After creating classes, you need to assign them to specific academic years.',
      'This creates class instances for that year where you can:',
      '• Add sections (e.g., "10A", "10B")',
      '• Assign rooms and teachers',
      '• Set capacity per section',
      'Each class can have multiple sections in the same academic year.',
    ],
  },
  createSubjects: {
    title: 'Create Subjects',
    icon: 'BookOpen',
    text: [
      'Subjects represent the courses taught at your school.',
      'Click "Create Subject" to add subjects with:',
      '• Subject name and code',
      '• Description (optional)',
      '• Active status',
      'Subjects are created once and can be assigned to multiple classes.',
    ],
  },
  assignSubjectsClassLevel: {
    title: 'Assign Subjects to Classes (Class-level)',
    icon: 'BookMarked',
    text: [
      'This step creates class-level subject templates.',
      'In the "Class Subjects" tab, assign subjects to classes:',
      '• Select a class',
      '• Choose subjects to offer for that class',
      '• This defines which subjects are available for the class',
      'This is Step 1 of the two-step subject assignment process.',
    ],
  },
  assignSubjectsAcademicYear: {
    title: 'Assign Subjects to Classes (Academic-year scoped)',
    icon: 'GraduationCap',
    text: [
      'This step creates actual subject enrollments for classes in a specific academic year.',
      'In the "Class Academic Year Subjects" tab:',
      '• Select an academic year and class instance',
      '• Assign subjects that will be taught in that year',
      '• Add details like room assignments and teachers',
      'This is Step 2 - the actual subject assignments for the academic year.',
    ],
  },
};

// Pashto translations
export const tourContentPs = {
  welcome: {
    title: 'د ښوونځي د ترتیب لارښود',
    icon: 'School',
    text: [
      'د ښوونځي د ترتیب لارښود ته ښه راغلاست! دا لارښود به تاسو ته د خپل ښوونځي د تنظیمولو لپاره اړینې پړاوونه وښيي.',
      'تاسو به زده کړئ چې څنګه د ښوونځي جزئیات سم کړئ، اکاډمیک کلونه رامینځته کړئ، ټولګي تنظیم کړئ، او موضوعات وټاکئ.',
    ],
  },
  editSchoolDetails: {
    title: 'د ښوونځي جزئیات سمول',
    icon: 'Building',
    text: [
      'د خپل ښوونځي معلومات تنظیم کولو سره پیل وکړئ. د سمولو لپاره د سمولو تڼۍ کلیک وکړئ:',
      '• د ښوونځي نوم (په ګڼو ژبو که اړین وي)',
      '• د ښوونځي لوګو او برانډ',
      '• پته او اړیکه معلومات',
      '• ژبې او کیلنډر غوره توبونه',
      'دا ترتیبات به د سیستم په اوږدو کې د راپورونو او اړیکو لپاره وکارول شي.',
    ],
  },
  createAcademicYear: {
    title: 'اکاډمیک کال رامینځته کول',
    icon: 'Calendar',
    text: [
      'اکاډمیک کلونه د خپل ښوونځي د عملیاتو لپاره د وخت دوره تعریف کوي.',
      'د نوی کال د تنظیمولو لپاره "اکاډمیک کال رامینځته کړئ" کلیک وکړئ:',
      '• د پیل او پای نیټې',
      '• د کال نوم (د بیلګې په توګه، "2024-2025")',
      '• حالت (فعال، پلان، بشپړ شوی)',
      'تاسو کولی شئ یو کال د اوسني په توګه وټاکئ، کوم چې به د نویو ریکارډونو لپاره د تلوالز په توګه وکارول شي.',
    ],
  },
  createClasses: {
    title: 'ټولګي رامینځته کول',
    icon: 'Users',
    text: [
      'ټولګي ستاسو د اکاډمیک جوړښت بنسټیزې ودانۍ دي.',
      'د نوی ټولګي د اضافه کولو لپاره "ټولګی رامینځته کړئ" کلیک وکړئ:',
      '• د ټولګي نوم او کوډ',
      '• د درجې کچه',
      '• د تلوالز ظرفیت (د زده کوونکو شمیر)',
      'ټولګي کولی شي په ګڼو اکاډمیک کلونو کې وکارول شي.',
    ],
  },
  assignClassesToYear: {
    title: 'ټولګي اکاډمیک کال ته وټاکل',
    icon: 'Link',
    text: [
      'د ټولګیو د رامینځته کولو وروسته، تاسو اړتیا لرئ چې دوی د ځانګړو اکاډمیک کلونو ته وټاکئ.',
      'دا د هغه کال لپاره د ټولګي مثالونه رامینځته کوي چیرته چې تاسو کولی شئ:',
      '• برخې اضافه کړئ (د بیلګې په توګه، "10A", "10B")',
      '• خونې او ښوونکي وټاکئ',
      '• د هرې برخې ظرفیت وټاکئ',
      'هر ټولګی کولی شي په ورته اکاډمیک کال کې ګڼې برخې ولري.',
    ],
  },
  createSubjects: {
    title: 'موضوعات رامینځته کول',
    icon: 'BookOpen',
    text: [
      'موضوعات د هغو کورسونو استازیتوب کوي چې ستاسو په ښوونځي کې تدریس کیږي.',
      'د موضوعاتو د اضافه کولو لپاره "موضوع رامینځته کړئ" کلیک وکړئ:',
      '• د موضوع نوم او کوډ',
      '• توضیحات (اختیاري)',
      '• فعال حالت',
      'موضوعات یوځل رامینځته کیږي او کولی شي ګڼو ټولګیو ته وټاکل شي.',
    ],
  },
  assignSubjectsClassLevel: {
    title: 'موضوعات ټولګیو ته وټاکل (د ټولګي کچه)',
    icon: 'BookMarked',
    text: [
      'دا پړاو د ټولګي کچې د موضوع قالبونه رامینځته کوي.',
      'په "د ټولګي موضوعات" ټیب کې، موضوعات ټولګیو ته وټاکئ:',
      '• یو ټولګی وټاکئ',
      '• د هغه ټولګي لپاره د وړاندې کیدو موضوعات وټاکئ',
      '• دا تعریف کوي چې کومې موضوعات د ټولګي لپاره شتون لري',
      'دا د دوه پړاوه د موضوع د وټاکلو پروسې لومړی پړاو دی.',
    ],
  },
  assignSubjectsAcademicYear: {
    title: 'موضوعات ټولګیو ته وټاکل (د اکاډمیک کال ساحه)',
    icon: 'GraduationCap',
    text: [
      'دا پړاو د ځانګړي اکاډمیک کال لپاره د ټولګیو لپاره د موضوع د نوم لیکنو واقعي رامینځته کوي.',
      'په "د ټولګي اکاډمیک کال موضوعات" ټیب کې:',
      '• یو اکاډمیک کال او د ټولګي مثال وټاکئ',
      '• هغه موضوعات وټاکئ چې به په هغه کال کې تدریس شي',
      '• جزئیات اضافه کړئ لکه د خونو وټاکل او ښوونکي',
      'دا دویم پړاو دی - د اکاډمیک کال لپاره د موضوع د وټاکلو واقعي.',
    ],
  },
};

// Farsi translations
export const tourContentFa = {
  welcome: {
    title: 'تور راه‌اندازی مدرسه',
    icon: 'School',
    text: [
      'به تور راه‌اندازی مدرسه خوش آمدید! این راهنما مراحل ضروری برای پیکربندی مدرسه شما در نظیم را به شما نشان می‌دهد.',
      'شما یاد خواهید گرفت که چگونه جزئیات مدرسه را ویرایش کنید، سال‌های تحصیلی ایجاد کنید، کلاس‌ها را تنظیم کنید و موضوعات را اختصاص دهید.',
    ],
  },
  editSchoolDetails: {
    title: 'ویرایش جزئیات مدرسه',
    icon: 'Building',
    text: [
      'با پیکربندی اطلاعات مدرسه خود شروع کنید. برای به‌روزرسانی روی دکمه ویرایش کلیک کنید:',
      '• نام مدرسه (به چندین زبان در صورت نیاز)',
      '• لوگو و برندینگ مدرسه',
      '• آدرس و اطلاعات تماس',
      '• تنظیمات زبان و تقویم',
      'این تنظیمات در سراسر سیستم برای گزارش‌ها و ارتباطات استفاده می‌شود.',
    ],
  },
  createAcademicYear: {
    title: 'ایجاد سال تحصیلی',
    icon: 'Calendar',
    text: [
      'سال‌های تحصیلی دوره‌های زمانی برای عملیات مدرسه شما را تعریف می‌کنند.',
      'برای راه‌اندازی سال جدید با کلیک روی "ایجاد سال تحصیلی":',
      '• تاریخ شروع و پایان',
      '• نام سال (مثلاً "2024-2025")',
      '• وضعیت (فعال، برنامه‌ریزی، تکمیل شده)',
      'می‌توانید یک سال را به عنوان جاری علامت بزنید که به‌عنوان پیش‌فرض برای رکوردهای جدید استفاده می‌شود.',
    ],
  },
  createClasses: {
    title: 'ایجاد کلاس‌ها',
    icon: 'Users',
    text: [
      'کلاس‌ها بلوک‌های سازنده ساختار تحصیلی شما هستند.',
      'برای افزودن کلاس جدید با کلیک روی "ایجاد کلاس":',
      '• نام و کد کلاس',
      '• سطح پایه',
      '• ظرفیت پیش‌فرض (تعداد دانش‌آموزان)',
      'کلاس‌ها می‌توانند در چندین سال تحصیلی استفاده شوند.',
    ],
  },
  assignClassesToYear: {
    title: 'اختصاص کلاس‌ها به سال تحصیلی',
    icon: 'Link',
    text: [
      'پس از ایجاد کلاس‌ها، باید آن‌ها را به سال‌های تحصیلی خاص اختصاص دهید.',
      'این نمونه‌های کلاس را برای آن سال ایجاد می‌کند که در آن می‌توانید:',
      '• بخش‌ها را اضافه کنید (مثلاً "10A", "10B")',
      '• اتاق‌ها و معلمان را اختصاص دهید',
      '• ظرفیت هر بخش را تنظیم کنید',
      'هر کلاس می‌تواند چندین بخش در همان سال تحصیلی داشته باشد.',
    ],
  },
  createSubjects: {
    title: 'ایجاد موضوعات',
    icon: 'BookOpen',
    text: [
      'موضوعات نمایانگر دروس تدریس شده در مدرسه شما هستند.',
      'برای افزودن موضوعات با کلیک روی "ایجاد موضوع":',
      '• نام و کد موضوع',
      '• توضیحات (اختیاری)',
      '• وضعیت فعال',
      'موضوعات یک بار ایجاد می‌شوند و می‌توانند به چندین کلاس اختصاص داده شوند.',
    ],
  },
  assignSubjectsClassLevel: {
    title: 'اختصاص موضوعات به کلاس‌ها (سطح کلاس)',
    icon: 'BookMarked',
    text: [
      'این مرحله الگوهای موضوع سطح کلاس را ایجاد می‌کند.',
      'در تب "موضوعات کلاس"، موضوعات را به کلاس‌ها اختصاص دهید:',
      '• یک کلاس را انتخاب کنید',
      '• موضوعاتی را که برای آن کلاس ارائه می‌شود انتخاب کنید',
      '• این تعریف می‌کند که کدام موضوعات برای کلاس در دسترس هستند',
      'این مرحله 1 از فرآیند دو مرحله‌ای اختصاص موضوع است.',
    ],
  },
  assignSubjectsAcademicYear: {
    title: 'اختصاص موضوعات به کلاس‌ها (محدوده سال تحصیلی)',
    icon: 'GraduationCap',
    text: [
      'این مرحله ثبت‌نام‌های واقعی موضوع را برای کلاس‌ها در یک سال تحصیلی خاص ایجاد می‌کند.',
      'در تب "موضوعات سال تحصیلی کلاس":',
      '• یک سال تحصیلی و نمونه کلاس را انتخاب کنید',
      '• موضوعاتی را که در آن سال تدریس می‌شوند اختصاص دهید',
      '• جزئیات مانند اختصاص اتاق و معلمان را اضافه کنید',
      'این مرحله 2 است - اختصاصات واقعی موضوع برای سال تحصیلی.',
    ],
  },
};

// Arabic translations
export const tourContentAr = {
  welcome: {
    title: 'جولة إعداد المدرسة',
    icon: 'School',
    text: [
      'مرحباً بك في جولة إعداد المدرسة! سيرشدك هذا الدليل خلال الخطوات الأساسية لتكوين مدرستك في نظيم.',
      'ستتعلم كيفية تعديل تفاصيل المدرسة، وإنشاء السنوات الأكاديمية، وإعداد الفصول، وتعيين المواد.',
    ],
  },
  editSchoolDetails: {
    title: 'تعديل تفاصيل المدرسة',
    icon: 'Building',
    text: [
      'ابدأ بتكوين معلومات مدرستك. انقر فوق زر التعديل للتحديث:',
      '• اسم المدرسة (بعدة لغات إذا لزم الأمر)',
      '• شعار المدرسة والعلامة التجارية',
      '• العنوان ومعلومات الاتصال',
      '• تفضيلات اللغة والتقويم',
      'سيتم استخدام هذه الإعدادات في جميع أنحاء النظام للتقارير والاتصالات.',
    ],
  },
  createAcademicYear: {
    title: 'إنشاء سنة أكاديمية',
    icon: 'Calendar',
    text: [
      'السنوات الأكاديمية تحدد الفترات الزمنية لعمليات مدرستك.',
      'انقر فوق "إنشاء سنة أكاديمية" لإعداد سنة جديدة مع:',
      '• تواريخ البدء والانتهاء',
      '• اسم السنة (مثل "2024-2025")',
      '• الحالة (نشط، تخطيط، مكتمل)',
      'يمكنك تحديد سنة واحدة كحالية، والتي سيتم استخدامها كافتراضي للسجلات الجديدة.',
    ],
  },
  createClasses: {
    title: 'إنشاء الفصول',
    icon: 'Users',
    text: [
      'الفصول هي اللبنات الأساسية لهيكلك الأكاديمي.',
      'انقر فوق "إنشاء فصل" لإضافة فصل جديد مع:',
      '• اسم الفصل والرمز',
      '• مستوى الصف',
      '• السعة الافتراضية (عدد الطلاب)',
      'يمكن إعادة استخدام الفصول عبر عدة سنوات أكاديمية.',
    ],
  },
  assignClassesToYear: {
    title: 'تعيين الفصول للسنة الأكاديمية',
    icon: 'Link',
    text: [
      'بعد إنشاء الفصول، تحتاج إلى تعيينها لسنوات أكاديمية محددة.',
      'هذا ينشئ حالات الفصل لتلك السنة حيث يمكنك:',
      '• إضافة أقسام (مثل "10A", "10B")',
      '• تعيين الغرف والمعلمين',
      '• تعيين السعة لكل قسم',
      'يمكن أن يكون لكل فصل أقسام متعددة في نفس السنة الأكاديمية.',
    ],
  },
  createSubjects: {
    title: 'إنشاء المواد',
    icon: 'BookOpen',
    text: [
      'المواد تمثل الدورات التي يتم تدريسها في مدرستك.',
      'انقر فوق "إنشاء مادة" لإضافة مواد مع:',
      '• اسم المادة والرمز',
      '• الوصف (اختياري)',
      '• الحالة النشطة',
      'يتم إنشاء المواد مرة واحدة ويمكن تعيينها لعدة فصول.',
    ],
  },
  assignSubjectsClassLevel: {
    title: 'تعيين المواد للفصول (مستوى الفصل)',
    icon: 'BookMarked',
    text: [
      'هذه الخطوة تنشئ قوالب المواد على مستوى الفصل.',
      'في علامة تبويب "مواد الفصل"، قم بتعيين المواد للفصول:',
      '• اختر فصلاً',
      '• اختر المواد المقدمة لذلك الفصل',
      '• هذا يحدد المواد المتاحة للفصل',
      'هذه هي الخطوة 1 من عملية تعيين المواد المكونة من خطوتين.',
    ],
  },
  assignSubjectsAcademicYear: {
    title: 'تعيين المواد للفصول (نطاق السنة الأكاديمية)',
    icon: 'GraduationCap',
    text: [
      'هذه الخطوة تنشئ تسجيلات المواد الفعلية للفصول في سنة أكاديمية محددة.',
      'في علامة تبويب "مواد سنة الفصل الأكاديمية":',
      '• اختر سنة أكاديمية وحالة فصل',
      '• قم بتعيين المواد التي سيتم تدريسها في تلك السنة',
      '• أضف تفاصيل مثل تعيينات الغرف والمعلمين',
      'هذه هي الخطوة 2 - تعيينات المواد الفعلية للسنة الأكاديمية.',
    ],
  },
};

/**
 * Get step content based on current language
 */
export function getStepContent(stepId: string): { title: string; text: string | string[]; icon: string } {
  const lang = getLang();
  
  let content: typeof tourContentEn;
  
  switch (lang) {
    case 'ps':
      content = tourContentPs;
      break;
    case 'fa':
      content = tourContentFa;
      break;
    case 'ar':
      content = tourContentAr;
      break;
    default:
      content = tourContentEn;
  }
  
  const stepContent = (content as any)[stepId];
  
  if (!stepContent) {
    // Fallback to English
    return (tourContentEn as any)[stepId] || { title: 'Step', text: 'Content not available', icon: 'HelpCircle' };
  }
  
  return stepContent;
}


