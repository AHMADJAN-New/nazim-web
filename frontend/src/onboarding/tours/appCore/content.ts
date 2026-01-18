/**
 * App Core Tour - Content (i18n-aware)
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
    title: 'Welcome to Nazim!',
    icon: 'School',
    text: [
      "We're excited to have you here! Let's take a quick tour to help you get familiar with the application.",
      'This tour will show you the main features, navigation, and common actions you will use every day.',
    ],
  },
  dashboard: {
    title: 'Your Dashboard',
    icon: 'Home',
    text: [
      'This is your central hub for school management.',
      'Here you see key metrics, recent activities, and shortcuts to important features immediately after logging in.',
    ],
  },
  dashboardTabs: {
    title: 'Dashboard Tabs',
    icon: 'Layout',
    text: [
      'The dashboard organizes information into tabs (Overview, Finance, Attendance, etc.).',
      'Click a tab to switch views without leaving the page.',
      'Each tab provides specific data and quick actions relevant to that area.',
    ],
  },
  tabsGeneral: {
    title: 'Understanding Tabs',
    icon: 'FileText',
    text: [
      'You will see tabs throughout the application (e.g., inside Student Profiles or Reports).',
      'They allow you to view different categories of information while staying on the same record.',
      'On mobile devices, tab labels might hide, but the icons will remain visible.',
    ],
  },
  sidebar: {
    title: 'Navigation Sidebar',
    icon: 'Menu',
    text: [
      'The sidebar is your main navigation map.',
      'It allows you to jump between Operations, Academics, Finance, and Settings.',
      'Click any item with an arrow to reveal more specific options.',
    ],
  },
  editIcon: {
    title: 'Edit (Pencil)',
    icon: 'Pencil',
    text: [
      'The `Pencil` icon is your tool for making changes.',
      'You will find it beside records in tables.',
      'Click it to update information immediately without losing your place.',
    ],
  },
  deleteIcon: {
    title: 'Delete (Trash)',
    icon: 'Trash2',
    text: [
      'The `Trash` icon allows you to remove records.',
      'It usually appears beside the edit icon.',
      'Use this to remove outdated entries. You will always be asked to confirm before deletion.',
    ],
  },
  viewIcon: {
    title: 'View (Eye)',
    icon: 'Eye',
    text: [
      'The `Eye` icon opens a read-only preview.',
      'Use this to check details without the risk of accidentally changing data.',
    ],
  },
  tabsActions: {
    title: 'Action Buttons',
    icon: 'MousePointerClick',
    text: [
      'Look for buttons like "Add", "Export", or "Filter" near the top of the page.',
      'These actions are context-aware, meaning they change based on which tab you are currently viewing.',
    ],
  },
  topBar: {
    title: 'Top Bar Navigation',
    icon: 'PanelTop',
    text: [
      'The top bar stays visible wherever you go.',
      'It houses the global search, notifications, and your user profile menu.',
    ],
  },
  search: {
    title: 'Global Search',
    icon: 'Search',
    text: [
      'Find anything instantly.',
      'Type to find students, staff, or classes. Use Ctrl+K (Cmd+K on Mac) to open the search command palette quickly.',
    ],
  },
  notifications: {
    title: 'Notifications',
    icon: 'Bell',
    text: [
      'Stay updated with system alerts.',
      'The bell icon shows important updates. A red badge indicates unread messages.',
    ],
  },
  sidebarStudents: {
    title: 'Student Management',
    icon: 'Users',
    text: [
      'The core of your school data.',
      'Register new students, manage admissions, track academic progress, and handle documents.',
      'Data is organized by class and academic year.',
    ],
  },
  sidebarStaff: {
    title: 'Staff Management',
    icon: 'UserCheck',
    text: [
      'Manage your workforce efficiently.',
      'Register staff, assign roles, manage teacher subjects, and track performance.',
    ],
  },
  sidebarAttendance: {
    title: 'Attendance',
    icon: 'Calendar',
    text: [
      'Track daily presence for students and staff.',
      'Mark attendance, view patterns, and generate monthly reports for parents or administration.',
    ],
  },
  sidebarExams: {
    title: 'Examinations',
    icon: 'BookOpen',
    text: [
      'Handle assessments and grading.',
      'Create exam schedules, enter marks, and generate report cards automatically.',
    ],
  },
  sidebarFinance: {
    title: 'Finance',
    icon: 'CreditCard',
    text: [
      'Manage school financials.',
      'Track fee collections, manage expenses, and view financial summaries and outstanding balances.',
    ],
  },
  sidebarAcademic: {
    title: 'Academic Setup',
    icon: 'GraduationCap',
    text: [
      'Configure the backbone of your curriculum.',
      'Set up academic years, define classes and subjects, and build timetables.',
    ],
  },
  sidebarSettings: {
    title: 'System Settings',
    icon: 'Settings',
    text: [
      'Control how Nazim works for you.',
      'Manage user permissions, school branding, and general system preferences.',
    ],
  },
  userMenu: {
    title: 'User Profile',
    icon: 'User',
    text: [
      'Manage your account.',
      'Click your avatar to view your profile, change language/theme settings, or log out.',
    ],
  },
  helpCenter: {
    title: 'Help & Support',
    icon: 'HelpCircle',
    text: [
      'Need assistance?',
      'Click the help icon to access guides and tutorials. Look for specific help buttons on complex pages for context-aware tips.',
    ],
  },
  complete: {
    title: "You're All Set!",
    icon: 'CheckCircle',
    text: [
      'Congratulations! You know the basics.',
      'You are ready to start managing your school with Nazim.',
      'You can revisit this tour anytime from the user menu.',
    ],
  },
};

// Pashto (Standardized)
export const tourContentPs: typeof tourContentEn = {
  welcome: {
    title: 'ناظم ته ښه راغلاست!',
    icon: 'School',
    text: [
      'خوښ یو چې تاسو له موږ سره یاست! راځئ یو لنډ سفر وکړو ترڅو له سیستم سره بلد شئ.',
      'دا سفر به تاسو ته د سیستم مهمې برخې او هغه تڼۍ وښيي چې هره ورځ ورسره سروکار لرئ.',
    ],
  },
  dashboard: {
    title: 'ستاسو ډشبورډ',
    icon: 'Home',
    text: [
      'دا د ښوونځي د مدیریت لپاره ستاسو مرکزي پاڼه ده.',
      'دلته مهم ارقام، وروستي فعالیتونه، او اړینو برخو ته چټک لاسرسی لیدلی شئ.',
    ],
  },
  dashboardTabs: {
    title: 'د ډشبورډ ټبونه',
    icon: 'Layout',
    text: [
      'ډشبورډ معلومات په ټبونو وېشي (لکه عمومي، مالي، حاضري).',
      'پر هر ټب کلیک وکړئ ترڅو د پاڼې د بدلولو پرته بېلابېل معلومات وګورئ.',
      'هر ټب د هغې برخې اړوند ځانګړي معلومات او کړنې ښيي.',
    ],
  },
  tabsGeneral: {
    title: 'د ټبونو پېژندنه',
    icon: 'FileText',
    text: [
      'تاسو به په ټول سیستم کې ټبونه وینئ (مثلاً د زده‌کوونکي په پروفایل کې).',
      'دا تاسو ته اجازه درکوي چې د یو ریکارډ اړوند بېلابېل معلومات په اسانۍ وګورئ.',
      'په موبایل کې ممکن د ټب نوم پټ شي، خو آیکن به تل ښکاري.',
    ],
  },
  sidebar: {
    title: 'د اړخ مینو (Sidebar)',
    icon: 'Menu',
    text: [
      'دا مینو ستاسو د تګ راتګ اصلي نقشه ده.',
      'له دې لارې عملیاتي، تدریسي، مالي او تنظیماتو برخو ته تګ کولی شئ.',
      'هغه مینو چې غشی لري، نور فرعي انتخابونه هم لري.',
    ],
  },
  editIcon: {
    title: 'سمون (پنسل)',
    icon: 'Pencil',
    text: [
      'د `پنسل` نښه د معلوماتو د بدلون لپاره ده.',
      'دا نښه د جدولونو په هر ریکارډ کې لیدل کیږي.',
      'پر دې کلیک سره سمدستي معلومات تازه کولی شئ پرته له دې چې پاڼه بدله شي.',
    ],
  },
  deleteIcon: {
    title: 'پاکول (Trash)',
    icon: 'Trash2',
    text: [
      'د `کثافات دانی` نښه د ریکارډونو د پاکولو لپاره ده.',
      'دا عموماً د سمون ترڅنګ وي.',
      'د زړو معلوماتو د لرې کولو لپاره یې وکاروئ. سیستم به تل لومړی ستاسو تایید وغواړي.',
    ],
  },
  viewIcon: {
    title: 'لیدل (سترګه)',
    icon: 'Eye',
    text: [
      'د `سترګې` نښه د معلوماتو د یوازې لیدلو (Read-only) لپاره ده.',
      'کله چې غواړئ معلومات وګورئ پرته له دې چې په غلطۍ سره یې بدل کړئ، دا تڼۍ وکاروئ.',
    ],
  },
  tabsActions: {
    title: 'د عمل تڼۍ',
    icon: 'MousePointerClick',
    text: [
      'د پاڼې په سر کې د "اضافه کول"، "ایکسپورټ" یا "فلټر" تڼۍ وکاروئ.',
      'دا تڼۍ هوښیارې دي او د هغه ټب سره سم بدلیږي چې تاسو یې ګورئ.',
    ],
  },
  topBar: {
    title: 'پورته مینو (Top Bar)',
    icon: 'PanelTop',
    text: [
      'دا برخه تل د سکرین په سر کې ښکاري.',
      'دلته عمومي لټون، خبرتیاوې او ستاسو شخصي پروفایل شتون لري.',
    ],
  },
  search: {
    title: 'عمومي لټون',
    icon: 'Search',
    text: [
      'هرڅه په یوه شیبه کې ومومئ.',
      'د زده‌کوونکو، کارکوونکو یا ټولګیو نوم ولیکئ. د چټک لاسرسي لپاره Ctrl+K وکاروئ.',
    ],
  },
  notifications: {
    title: 'خبرتیاوې',
    icon: 'Bell',
    text: [
      'له مهمو بدلونونو خبر اوسئ.',
      'د زنګ نښه مهم پیغامونه ښيي. سور رنګ د نویو او نه لوستل شویو پیغامونو نښه ده.',
    ],
  },
  sidebarStudents: {
    title: 'د زده‌کوونکو مدیریت',
    icon: 'Users',
    text: [
      'د ښوونځي د معلوماتو اصلي برخه.',
      'نوي زده‌کوونکي ثبت کړئ، داخلې تنظیم کړئ، او تعلیمي پرمختګ تعقیب کړئ.',
      'معلومات د ټولګي او تعلیمي کال له مخې منظم شوي دي.',
    ],
  },
  sidebarStaff: {
    title: 'د کارکوونکو مدیریت',
    icon: 'UserCheck',
    text: [
      'خپل پرسونل په اغېزمن ډول مدیریت کړئ.',
      'کارکوونکي ثبت کړئ، دندې ور وسپارئ او فعالیت یې وڅارئ.',
    ],
  },
  sidebarAttendance: {
    title: 'حاضري',
    icon: 'Calendar',
    text: [
      'د زده‌کوونکو او کارکوونکو ورځنۍ حاضري واخلئ.',
      'ورځنۍ حاضري وټاکئ او میاشتني راپورونه وګورئ.',
    ],
  },
  sidebarExams: {
    title: 'امتحانونه',
    icon: 'BookOpen',
    text: [
      'ارزونې او نمرې مدیریت کړئ.',
      'د امتحان مهالویش جوړ کړئ، نمرې داخل کړئ او په اتومات ډول د پایلو پاڼې (اطلاع نامې) جوړې کړئ.',
    ],
  },
  sidebarFinance: {
    title: 'مالي چارې',
    icon: 'CreditCard',
    text: [
      'د ښوونځي مالي حسابونه اداره کړئ.',
      'فیسونه راټول کړئ، لګښتونه ثبت کړئ او مالي راپورونه وګورئ.',
    ],
  },
  sidebarAcademic: {
    title: 'تعلیمي تنظیمات',
    icon: 'GraduationCap',
    text: [
      'د نصاب او درسونو بنسټ جوړ کړئ.',
      'تعلیمي کلونه، ټولګي او مضمونونه تعریف کړئ او مهالویش جوړ کړئ.',
    ],
  },
  sidebarSettings: {
    title: 'د سیستم تنظیمات',
    icon: 'Settings',
    text: [
      'ناظم ستاسو د اړتیا سره سم تنظیم کړئ.',
      'د کاروونکو صلاحیتونه او د ښوونځي عمومي معلومات دلته بدلولی شئ.',
    ],
  },
  userMenu: {
    title: 'د کاروونکي پروفایل',
    icon: 'User',
    text: [
      'خپل حساب مدیریت کړئ.',
      'پر خپل عکس کلیک وکړئ ترڅو پروفایل وګورئ، ژبه بدله کړئ یا له سیستمه ووځئ.',
    ],
  },
  helpCenter: {
    title: 'مرسته او ملاتړ',
    icon: 'HelpCircle',
    text: [
      'مرستې ته اړتیا لرئ؟',
      'د مرستې آیکن کلیک وکړئ. په پیچلو پاڼو کې د ځانګړو لارښوونو تڼۍ هم شته.',
    ],
  },
  complete: {
    title: 'تاسو چمتو یاست!',
    icon: 'CheckCircle',
    text: [
      'مبارک! تاسو لومړني شیان زده کړل.',
      'تاسو اوس کولی شئ په ناظم کې خپل کار پیل کړئ.',
      'دا لارښود هر وخت د کاروونکي مینو څخه بیا کتلی شئ.',
    ],
  },
};

// Farsi/Dari (Added for Nazim Standards)
export const tourContentFa: typeof tourContentEn = {
  welcome: {
    title: 'به ناظم خوش آمدید!',
    icon: 'School',
    text: [
      'خوشحالیم که شما اینجا هستید! بیایید یک گشت کوتاه بزنیم تا با سیستم آشنا شوید.',
      'این راهنما ویژگی‌های اصلی، منوها و کارهای روزمره را به شما نشان می‌دهد.',
    ],
  },
  dashboard: {
    title: 'داشبورد شما',
    icon: 'Home',
    text: [
      'اینجا مرکز مدیریت مکتب شماست.',
      'شما می‌توانید آمار کلیدی، فعالیت‌های اخیر و میانبرهای مهم را بلافاصله پس از ورود ببینید.',
    ],
  },
  dashboardTabs: {
    title: 'تب‌های داشبورد',
    icon: 'Layout',
    text: [
      'داشبورد اطلاعات را در تب‌ها (مانند عمومی، مالی، حاضری) دسته‌بندی می‌کند.',
      'روی هر تب کلیک کنید تا بدون ترک صفحه، اطلاعات مختلف را ببینید.',
      'هر تب داده‌ها و عملیات مربوط به همان بخش را نشان می‌دهد.',
    ],
  },
  tabsGeneral: {
    title: 'آشنایی با تب‌ها',
    icon: 'FileText',
    text: [
      'شما در سراسر برنامه تب‌ها را خواهید دید (مثلاً در پروفایل شاگردان).',
      'آن‌ها به شما اجازه می‌دهند دسته‌های مختلف اطلاعات را بدون جابجایی صفحه مشاهده کنید.',
      'در موبایل ممکن است نام تب پنهان شود، اما آیکون آن همیشه قابل مشاهده است.',
    ],
  },
  sidebar: {
    title: 'منوی کناری (Sidebar)',
    icon: 'Menu',
    text: [
      'این منو نقشه اصلی شما برای حرکت در سیستم است.',
      'از اینجا می‌توانید به بخش‌های عملیاتی، تدریسی، مالی و تنظیمات بروید.',
      'گزینه‌هایی که فلش دارند، شامل زیرمجموعه‌های بیشتری هستند.',
    ],
  },
  editIcon: {
    title: 'ویرایش (قلم)',
    icon: 'Pencil',
    text: [
      'آیکون `قلم` ابزار شما برای ایجاد تغییرات است.',
      'این آیکون را در کنار رکوردها در جداول خواهید دید.',
      'با کلیک روی آن می‌توانید اطلاعات را فوراً به‌روزرسانی کنید.',
    ],
  },
  deleteIcon: {
    title: 'حذف (سطل زباله)',
    icon: 'Trash2',
    text: [
      'آیکون `سطل زباله` برای حذف کردن رکوردها است.',
      'معمولاً در کنار آیکون ویرایش قرار دارد.',
      'برای حذف اطلاعات قدیمی از آن استفاده کنید. سیستم همیشه قبل از حذف از شما تایید می‌گیرد.',
    ],
  },
  viewIcon: {
    title: 'مشاهده (چشم)',
    icon: 'Eye',
    text: [
      'آیکون `چشم` حالت فقط خواندنی را باز می‌کند.',
      'برای بررسی جزئیات بدون خطر تغییر اشتباهی داده‌ها از این گزینه استفاده کنید.',
    ],
  },
  tabsActions: {
    title: 'دکمه‌های عملیاتی',
    icon: 'MousePointerClick',
    text: [
      'در بالای صفحه دکمه‌هایی مانند "افزودن"، "اکسپورت" یا "فیلتر" را ببینید.',
      'این دکمه‌ها هوشمند هستند و بر اساس تبی که در آن هستید تغییر می‌کنند.',
    ],
  },
  topBar: {
    title: 'نوار بالا (Top Bar)',
    icon: 'PanelTop',
    text: [
      'این نوار همیشه در بالای صفحه قابل مشاهده است.',
      'جستجوی عمومی، اعلانات و پروفایل کاربری شما در اینجا قرار دارد.',
    ],
  },
  search: {
    title: 'جستجوی عمومی',
    icon: 'Search',
    text: [
      'هر چیزی را فوراً پیدا کنید.',
      'نام شاگردان، کارمندان یا صنف‌ها را تایپ کنید. برای دسترسی سریع از کلیدهای Ctrl+K استفاده کنید.',
    ],
  },
  notifications: {
    title: 'اعلانات',
    icon: 'Bell',
    text: [
      'از تغییرات سیستم باخبر باشید.',
      'آیکون زنگ پیام‌های مهم را نشان می‌دهد. نشان قرمز به معنی پیام‌های خوانده نشده است.',
    ],
  },
  sidebarStudents: {
    title: 'مدیریت شاگردان',
    icon: 'Users',
    text: [
      'هسته اصلی اطلاعات مکتب شما.',
      'شاگردان جدید را ثبت کنید، امور پذیرش را انجام دهید و پیشرفت تحصیلی را پیگیری نمایید.',
      'اطلاعات بر اساس صنف و سال تحصیلی منظم شده‌اند.',
    ],
  },
  sidebarStaff: {
    title: 'مدیریت کارمندان',
    icon: 'UserCheck',
    text: [
      'پرسنل خود را به درستی مدیریت کنید.',
      'کارمندان را ثبت کنید، وظایف را تعیین نمایید و عملکرد آن‌ها را بررسی کنید.',
    ],
  },
  sidebarAttendance: {
    title: 'حاضری',
    icon: 'Calendar',
    text: [
      'حاضری روزانه شاگردان و کارمندان را ثبت کنید.',
      'حاضری بگیرید، الگوها را ببینید و گزارش‌های ماهانه تهیه کنید.',
    ],
  },
  sidebarExams: {
    title: 'امتحانات',
    icon: 'BookOpen',
    text: [
      'مدیریت ارزیابی‌ها و نمرات.',
      'تقسیم‌اوقات امتحان بسازید، نمرات را وارد کنید و اطلاع‌نامه‌ها را به صورت خودکار ایجاد کنید.',
    ],
  },
  sidebarFinance: {
    title: 'امور مالی',
    icon: 'CreditCard',
    text: [
      'مدیریت حساب‌های مالی مکتب.',
      'جمع‌آوری فیس‌ها، مدیریت مصارف و مشاهده گزارش‌های مالی و باقی‌داری‌ها.',
    ],
  },
  sidebarAcademic: {
    title: 'تنظیمات تدریسی',
    icon: 'GraduationCap',
    text: [
      'زیربنای نصاب درسی خود را بسازید.',
      'سال‌های تحصیلی، صنف‌ها و مضامین را تعریف کنید و تقسیم‌اوقات بسازید.',
    ],
  },
  sidebarSettings: {
    title: 'تنظیمات سیستم',
    icon: 'Settings',
    text: [
      'ناظم را مطابق نیاز خود تنظیم کنید.',
      'صلاحیت‌های کاربران، برندینگ مکتب و تنظیمات عمومی سیستم را مدیریت کنید.',
    ],
  },
  userMenu: {
    title: 'پروفایل کاربری',
    icon: 'User',
    text: [
      'مدیریت حساب کاربری شما.',
      'روی عکس خود کلیک کنید تا پروفایل را ببینید، زبان را تغییر دهید یا از سیستم خارج شوید.',
    ],
  },
  helpCenter: {
    title: 'کمک و پشتیبانی',
    icon: 'HelpCircle',
    text: [
      'به کمک نیاز دارید؟',
      'روی آیکون کمک کلیک کنید. در صفحات پیچیده دکمه‌های راهنمای مخصوص نیز وجود دارد.',
    ],
  },
  complete: {
    title: 'شما آماده‌اید!',
    icon: 'CheckCircle',
    text: [
      'تبریک! شما اصول اولیه را یاد گرفتید.',
      'اکنون آماده‌اید تا کار با ناظم را شروع کنید.',
      'هر زمان بخواهید می‌توانید این راهنما را از منوی کاربری دوباره باز کنید.',
    ],
  },
};

export type AppCoreStepId = keyof typeof tourContentEn;

/**
 * Get content for a step based on current language
 */
export function getStepContent(stepId: AppCoreStepId): { title: string; text: string[]; icon?: string } {
  const lang = getLang();
  
  let dict = tourContentEn;
  if (lang === 'ps') dict = tourContentPs;
  else if (lang === 'fa') dict = tourContentFa;
  
  const content = dict[stepId];
  return {
    title: content.title,
    text: Array.isArray(content.text) ? content.text : [content.text],
    icon: content.icon,
  };
}