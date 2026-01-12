import {
  Clipboard,
  Calendar,
  GraduationCap,
  CreditCard,
  BookOpen,
  Heart,
  Activity,
  FileText,
  Clock,
  HelpCircle,
  CalendarDays,
  Users,
  DollarSign,
  Banknote,
  History,
  ShieldCheck,
  Settings,
  Award,
} from 'lucide-react';

export interface Feature {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
}

export interface Stat {
  value: string;
  label: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  nameEn: string;
  price: string;
  isPopular?: boolean;
}

export interface FeatureComparison {
  feature: string;
  starter: boolean | string;
  pro: boolean | string;
  complete: boolean | string;
  enterprise: boolean | string;
}

export interface Limit {
  limit: string;
  starter: string;
  pro: string;
  complete: string;
  enterprise: string;
}

export interface MaintenanceRow {
  service: string;
  offline: string;
  online: string;
}

export const heroBadges = [
  'مکمل محفوظ',
  'په دریو ژبو',
  'قوي امنیت',
  'د صلاحیتونو کنترول',
  'معیاري ډیزاین',
];

export const valueBadges = [
  'ستاسو وخت بچت کوي',
  'شفاف او کره راپورونه برابروي',
  'د مدرسې ټولې چارې په یوه ځای کې مدیریتوي',
];

export const stats: Stat[] = [
  {
    value: '۱۰۰+',
    label: 'فعالې برخې',
  },
  {
    value: 'چټکه حاضري',
    label: 'په یوه ثانیه کې ۳ نفر',
  },
  {
    value: 'کره',
    label: 'کره او دقیق راپورونه',
  },
  {
    value: 'د باور وړ',
    label: 'په مختلفو مدارسو کې استفاده شوی',
  },
];

export const features: Feature[] = [
  {
    id: 'registration',
    title: 'ثبت نام او داخله',
    icon: Clipboard,
    items: [
      'عمومي ثبت نام، داخله او بشپړ راپورونه',
      'د ایکسل فایل له لارې ډله‌ییزه داخله',
      'د زده کونکي، سرپرست او خپلوانو اسناد',
    ],
  },
  {
    id: 'attendance',
    title: 'حاضري او اجازتنامې',
    icon: Calendar,
    items: [
      'ورځنۍ حاضري د کارت/شمېرې له لارې',
      'د لیلیې او امتحاناتو حاضري',
      'د حاضري او غیرحاضري تفصیلي راپورونه',
    ],
  },
  {
    id: 'curriculum',
    title: 'درسي مواد او راپورونه',
    icon: GraduationCap,
    items: [
      'استادانو ته د کتابونو وېش',
      'له ټکر پرته د تقسیم اوقات جوړول',
      'د زده کوونکو د ټولې تعلیمي سابقې راپورونه',
    ],
  },
  {
    id: 'exams',
    title: 'امتحانات او نتایج',
    icon: GraduationCap,
    items: [
      'د امتحاناتو تقسیم اوقات، او داخلې کارتونه',
      'د سوالیه پاڼو په محفوظه توګه جوړول',
      'سوالیه پاڼو او نتائجو ته محدود لاس رسی',
      'د رقم الجلوس او د امتحان د صحنې د نقشې جوړول په داسې توګه چې د نقل مخنیوی کوي',
      'د زده کونکو لپاره رقم السري ټاکل',
    ],
  },
  {
    id: 'documents',
    title: 'اسناد او کارتونه',
    icon: CreditCard,
    items: [
      'د زده کوونکو د کارتونو چاپول',
      'فارغ‌التحصیلۍ سند او کشف الدرجات چاپول',
      'د فاضلانو خارجو کسانو راپورونه',
    ],
  },
  {
    id: 'library',
    title: 'کتابتون/مکتب/پخلنځی',
    icon: BookOpen,
    items: [
      'د مدرسې مربوط د ټولو کتابونو ثبت او توزیع',
      'د توزیع شویو کتابونو راپورونه او مدیریت',
    ],
  },
  {
    id: 'finance',
    title: 'د مالي بخش مکمل مدیریت',
    icon: DollarSign,
    items: [
      'د فیسونو ټاکل، ټولونه او راپورونه',
      'بودیجه، مصارف، عواید، معاشونه او پورونه',
      'د انوایس او پراخ مالي راپورونه',
    ],
  },
  {
    id: 'donations',
    title: 'د مساعدت او چندې راپورونه',
    icon: Heart,
    items: [
      'د مساعدت او چندې د ورکړې ثبت او مدیریت',
      'د چندې ورکوونکو تفصیلي راپورونه',
      'د مساعدتونو د ویش او توزیع راپورونه',
    ],
  },
  {
    id: 'activity',
    title: 'د کاروونکو فعالیتونه او لاس رسی',
    icon: Activity,
    items: [
      'د هر کاروونکو ټول فعالیتونه کتل',
      'د سسیتم هرې برخې ته لاس رسی ورکول یا محدودل',
      'د کاروونکو د اجازو دقیق مدیریت',
    ],
  },
  {
    id: 'events',
    title: 'د لویو جلسو او غونډو د میلمنو د تنظیم او مدیریت سیستم',
    icon: CalendarDays,
    items: [
      'د لویو جلسو او غونډو د میلمنو د ثبت سیستم',
      'د میلمنو د چک-این او چک-آوټ سیستم',
      'د میلمنو د تفصیلي راپورونه',
      'د جلسو تنظیم او مدیریت',
    ],
  },
  {
    id: 'dms',
    title: 'د اسنادو مدیریت سیستم (DMS)',
    icon: FileText,
    items: [
      'د داخلي او خارجي اسنادو ثبت او مدیریت',
      'د مکتوبونو د جوړولو سیستم',
      'د اسنادو د ټیمپلیټونو مدیریت',
      'د اسنادو د ارشیف او لټون سیستم',
    ],
  },
  {
    id: 'courses',
    title: 'د لنډمهاله کورسونو سیستم',
    icon: Award,
    items: [
      'د لنډمهاله کورسونو ثبت او مدیریت',
      'د کورس زده کوونکو د داخلی سیستم',
      'د کورس حاضري او اسناد',
      'د کورس د سرتیفیکتونو چاپول',
      'د کورس د ټیمپلیټونو مدیریت',
    ],
  },
  {
    id: 'graduation',
    title: 'د فارغینو او سرتیفیکتونو سیستم',
    icon: Award,
    items: [
      'د فارغینو د بیچونو مدیریت',
      'د فارغینو د سرتیفیکتونو چاپول',
      'د سرتیفیکتونو د ټیمپلیټونو مدیریت',
      'د صادر شویو سرتیفیکتونو راپورونه',
      'د آنلاین سرتیفیکت د تصدیق سیستم',
    ],
  },
  {
    id: 'timetable',
    title: 'د تقسیم اوقات سیستم',
    icon: Clock,
    items: [
      'د خپلکار تقسیم اوقات جوړول',
      'د استادانو د شتون د وختونو مدیریت',
      'د ټکرونو د کشف او حل سیستم',
      'د وختونو د سلاټونو مدیریت',
    ],
  },
  {
    id: 'question-bank',
    title: 'د پوښتنو بانک او سوالیه پاڼو د جوړولو سیستم',
    icon: HelpCircle,
    items: [
      'د پوښتنو د بانک مدیریت',
      'د سوالیه پاڼو د خپلکار جوړول',
      'د سوالیه پاڼو د چاپ د تعقیب سیستم',
      'د سوالیه پاڼو د ټیمپلیټونو مدیریت',
    ],
  },
  {
    id: 'leave',
    title: 'د رخصتیو مدیریت',
    icon: CalendarDays,
    items: [
      'د کارمندانو د رخصتیو غوښتنې',
      'د رخصتیو د تصویب سیستم',
      'د رخصتیو د تفصیلي راپورونه',
    ],
  },
  {
    id: 'assignments',
    title: 'د استادانو د درسی موادو تخصیص',
    icon: Users,
    items: [
      'د استادانو ته د درسی موادو تخصیص',
      'د استادانو د درسی موادو راپورونه',
      'د تخصیص شویو درسی موادو مدیریت',
    ],
  },
  {
    id: 'id-cards',
    title: 'د کارتونو سیستم',
    icon: CreditCard,
    items: [
      'د کارتونو د ټیمپلیټونو مدیریت',
      'د زده کوونکو د کارتونو تخصیص',
      'د کارتونو د چاپ او صادرات',
      'د کارتونو د ډیزاینونو مدیریت',
    ],
  },
  {
    id: 'finance-details',
    title: 'د مالي سیستم تفصیلات',
    icon: DollarSign,
    items: [
      'د ګڼو اسعارو ملاتړ',
      'د د اسعارو د تبادلې د نرخونو مدیریت',
      'د مالي پروژو مدیریت',
      'د مالي حسابونو مدیریت',
      'د عوایدو او مصارفو د کټګوریو مدیریت',
    ],
  },
  {
    id: 'fee-details',
    title: 'د فیسونو مدیریت تفصیلات',
    icon: Banknote,
    items: [
      'د فیسونو د جوړښتونو مدیریت',
      'د فیسونو د تخصیص سیستم',
      'د فیسونو د تادیاتو مدیریت',
      'د فیسونو د استثنائاتو سیستم',
      'د زده کوونکو د فیسونو د بیان راپورونه',
    ],
  },
  {
    id: 'library-details',
    title: 'د کتابتون سیستم تفصیلات',
    icon: BookOpen,
    items: [
      'د کتابتون د ډشبورډ',
      'د کتابونو د کټګوریو مدیریت',
      'د کتابونو د توزیع او امانت سیستم',
      'د کتابتون د تفصیلي راپورونه',
    ],
  },
  {
    id: 'report-templates',
    title: 'د راپورونو ټیمپلیټونه',
    icon: FileText,
    items: [
      'د راپورونو د شخصي ټیمپلیټونو مدیریت',
      'د راپورونو د برانډینګ سیستم',
      'د راپورونو د ډیزاینونو مدیریت',
    ],
  },
  {
    id: 'student-history',
    title: 'د زده کوونکو تاریخچه',
    icon: History,
    items: [
      'د زده کوونکو د تعلیمي تاریخچې تعقیب',
      'د زده کوونکو د تاریخچې راپورونه',
      'د زده کوونکو د سابقې تفصیلي معلومات',
    ],
  },
  {
    id: 'certificate-verification',
    title: 'د سرتیفیکتونو د تصدیق سیستم',
    icon: ShieldCheck,
    items: [
      'د آنلاین سرتیفیکتونو د تصدیق سیستم',
      'د سرتیفیکتونو د اعتبار چک',
      'د سرتیفیکتونو د تفصیلي معلومات',
    ],
  },
  {
    id: 'exam-details',
    title: 'د امتحاناتو مدیریت تفصیلات',
    icon: Settings,
    items: [
      'د امتحاناتو د داخلی سیستم',
      'د زده کوونکو د داخلی سیستم',
      'د رقم الجلوس او رقم السري تخصیص',
      'د امتحان حاضري',
      'د امتحان اسناد',
      'د یوځای شویو نمراتو پاڼې',
      'د صنف د درسی موادو د نمراتو پاڼې',
      'د زده کوونکو د کارت راپورونه',
    ],
  },
  {
    id: 'misc',
    title: 'متفرق',
    icon: Settings,
    items: [
      'د مجالسو ثبت او راپورنو سیستم',
      'د مدرسې اړوند د مکتوبونو او اسنادو د ثبت سیستم',
      'د مدرسې د نظم ضبط اصول او ضوابطو سیستم',
      'د مطبخ د مصارفو سیستم',
      'او لسګونه نورې د کار وړ برخې',
    ],
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'اساسي',
    nameEn: 'Starter',
    price: '12,000 افغاني',
  },
  {
    id: 'pro',
    name: 'پرو',
    nameEn: 'Pro',
    price: '25,000 افغاني',
    isPopular: true,
  },
  {
    id: 'complete',
    name: 'مکمل',
    nameEn: 'Complete',
    price: '35,000 افغاني',
  },
  {
    id: 'enterprise',
    name: 'انټرپرایز',
    nameEn: 'Enterprise',
    price: 'اختصاصي',
  },
];

export const featureComparisons: FeatureComparison[] = [
  {
    feature: 'د زده کوونکو د ثبت نام سیستم',
    starter: true,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د کارمندانو د تنظیم سیستم',
    starter: true,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د حاضري سيستم',
    starter: true,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د رخصتي او اجازت نامی سیستم',
    starter: true,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د رخصتیو مدیریت',
    starter: true,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د تقسیم اوقات سیستم',
    starter: true,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د زده کوونکو تاریخچه',
    starter: true,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د امتحاناتو سیستم (ساده/بشپړ)',
    starter: 'ساده',
    pro: 'بشپړ',
    complete: 'بشپړ',
    enterprise: 'بشپړ',
  },
  {
    feature: 'د درسي موادو د تنظیم سیستم',
    starter: false,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د استادانو د درسي موادو تخصیص',
    starter: false,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د پوښتنو بانک او سوالیه پاڼو د جوړولو سیستم',
    starter: false,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د امتحاناتو مدیریت تفصیلات',
    starter: false,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د کتابتون سیستم',
    starter: false,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د لنډمهاله کورسونو سیستم',
    starter: false,
    pro: true,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د مدرسې د اجناسو د ثبت او توزیع سیستم',
    starter: false,
    pro: false,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د مالي څانګې مکمل سیستم',
    starter: false,
    pro: false,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د اسنادو مدیریت سیستم (DMS)',
    starter: false,
    pro: false,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د مجالسو او اسنادو د تعقیب سیستم',
    starter: false,
    pro: false,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د لویو جلسو او غونډو د میلمنو د تنظیم او مدیریت سیستم',
    starter: false,
    pro: false,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د فارغینو او سرتیفیکتونو سیستم',
    starter: false,
    pro: false,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د سرتیفیکتونو د تصدیق سیستم',
    starter: false,
    pro: false,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د کارتونو سیستم',
    starter: false,
    pro: false,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د راپورونو ټیمپلیټونه',
    starter: false,
    pro: false,
    complete: true,
    enterprise: true,
  },
  {
    feature: 'د ګڼو څانګو ملاتړ',
    starter: false,
    pro: false,
    complete: false,
    enterprise: true,
  },
  {
    feature: 'د ګڼو اسعارو ملاتړ',
    starter: false,
    pro: false,
    complete: false,
    enterprise: true,
  },
  {
    feature: 'پرمختللي راپورونه',
    starter: false,
    pro: false,
    complete: false,
    enterprise: true,
  },
  {
    feature: 'اختصاصي حدونه، ادغامونه او SLA ملاتړ',
    starter: false,
    pro: false,
    complete: false,
    enterprise: true,
  },
];

export const limits: Limit[] = [
  {
    limit: 'د زده کوونکو حد',
    starter: 'تر 250',
    pro: 'تر 600',
    complete: 'تر 1200',
    enterprise: 'Custom',
  },
  {
    limit: 'د کاروونکو (Users) حد',
    starter: 'تر 10',
    pro: 'تر 30',
    complete: 'تر 50',
    enterprise: 'Custom',
  },
  {
    limit: 'د څانګو / شعبو حد',
    starter: '1',
    pro: '1',
    complete: '1',
    enterprise: 'Custom',
  },
  {
    limit: 'د راپورونو صادرات (PDF/Excel)',
    starter: 'معیاري',
    pro: 'پرمختللی',
    complete: 'پرمختللی + ټیمپلیټونه',
    enterprise: 'Custom',
  },
  {
    limit: 'Backup/Restore',
    starter: 'دستی',
    pro: 'دستی',
    complete: 'اتومات',
    enterprise: 'SLA-based',
  },
  {
    limit: 'د صلاحیتونو کچه (Permissions)',
    starter: 'تفصیلي',
    pro: 'تفصیلي',
    complete: 'تفصیلي',
    enterprise: 'Custom',
  },
];

export const maintenanceRows: MaintenanceRow[] = [
  {
    service: 'کلنی د ساتنې فیس',
    offline: 'اختیاري (پیشنهادي)',
    online: 'لازمي',
  },
  {
    service: 'تازه کول (Updates)',
    offline: 'د ساتنې په فیس کې شامل',
    online: 'شامل',
  },
  {
    service: 'تخنیکي ملاتړ (Support)',
    offline: '✓ (د ساتنې په فیس کې)',
    online: '✓',
  },
  {
    service: 'Backup/Monitoring',
    offline: 'د مشتری په سیستم',
    online: 'اتومات + نظارت',
  },
  {
    service: 'Hosting/Server',
    offline: 'نه لري',
    online: 'شامل/جلا (د پکېج مطابق)',
  },
];

export const maintenanceFees = [
  'اساسي ساتنه: 3,000 افغانی / کال',
  'معیاري ساتنه: 6,000 افغانی / کال',
  'مکمل ساتنه: 10,000 افغانی / کال',
  'آنلاین: کلنی ساتنه + Hosting د پکېج مطابق',
];

export interface ContactInfo {
  type: 'whatsapp' | 'website' | 'twitter';
  label: string;
  value: string;
  url: string;
}

export const contactInfo: ContactInfo[] = [
  {
    type: 'whatsapp',
    label: 'واټساپ',
    value: '0787779988',
    url: 'https://wa.link/0ly8rl',
  },
  {
    type: 'website',
    label: 'ویب پاڼه',
    value: 'nazimapp.com',
    url: 'https://nazimapp.com',
  },
  {
    type: 'twitter',
    label: 'X (Twitter)',
    value: '@Nazimapp',
    url: 'https://x.com/Nazimapp',
  },
];
