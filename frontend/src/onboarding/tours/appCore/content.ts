/**
 * App Core Tour - Content (i18n-aware)
 *
 * IMPORTANT:
 * - This content is resolved dynamically using the currently selected language
 *   (`localStorage.nazim-language`).
 * - This allows the tour to immediately match the user-selected language without requiring
 *   a page reload.
 */

import { getCurrentLanguage } from '../../rtl';

type SupportedLanguage = 'en' | 'ps' | 'fa' | 'ar';

function getLang(): SupportedLanguage {
  const lang = getCurrentLanguage();
  return lang === 'ps' || lang === 'fa' || lang === 'ar' ? lang : 'en';
}

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
      'This is your Dashboard - your central hub for school management.',
      'Here you can see key metrics, recent activities, and quick access to important features.',
    ],
  },
  dashboardTabs: {
    title: 'Dashboard Tabs',
    icon: 'FileText',
    text: [
      'The dashboard uses tabs to organize different sections of information.',
      'Click on any tab to switch between Overview, Finance, Assets, Library, Attendance, Leave Requests, and Documents.',
      'Each tab shows relevant data and quick actions for that area. Tabs help you navigate without leaving the dashboard.',
      'Tabs are used throughout the application to organize related content. You\'ll find tabs in many pages: student profiles, staff records, reports, and more.',
      'Click any tab to switch views. The active tab is highlighted. On mobile, tab labels may be hidden - icons are always visible.',
      'Action buttons near the tabs (Add, Export, Filter, etc.) let you perform tasks immediately. Together the tabs and actions keep you moving through the workflow without extra navigation.',
    ],
  },
  tabsGeneral: {
    title: 'Understanding Tabs',
    icon: 'FileText',
    text: [
      'Tabs are used throughout the application to organize related content.',
      'You\'ll find tabs in many pages: student profiles, staff records, reports, and more.',
      'Click any tab to switch views. The active tab is highlighted. On mobile, tab labels may be hidden - icons are always visible.',
      'Tabs help you access different sections of information without navigating away from the current page.',
    ],
  },
  sidebar: {
    title: 'Navigation Sidebar',
    icon: 'Home',
    text: [
      'The sidebar is your main navigation hub, organized into logical sections.',
      'Operations: Manage students, staff, and attendance. Academic: Handle classes, subjects, and exams. Finance: Track fees and payments. Administration: Configure settings and permissions.',
      'Click any menu item to explore. Items with arrows have sub-menus that expand when clicked.',
    ],
  },
  editIcon: {
    title: 'Edit Icon (Pencil)',
    icon: 'Pencil',
    text: [
      'The edit action always uses the `Pencil` icon from our lucide set.',
      'You will find it beside each record in tables and lists.',
      'Click it to open the inline form where you can update fields right away.',
      'Keeping edits next to the data prevents losing context.',
    ],
  },
  deleteIcon: {
    title: 'Delete Icon (Trash)',
    icon: 'Trash2',
    text: [
      'Our delete icon is the `Trash2` icon from lucide.',
      'It appears beside the edit icon in the same action area.',
      'Use it to remove outdated entries, and confirm when prompted before the deletion goes through.',
    ],
  },
  viewIcon: {
    title: 'View Icon (Eye)',
    icon: 'Eye',
    text: [
      'The `Eye` icon lets you open a read-only view of a record.',
      'Use its button when you want to preview data before editing or deleting.',
      'It is handy for quick lookups without navigating away from the list.',
    ],
  },
  tabsActions: {
    title: 'Tabs & Action Buttons',
    icon: 'FileText',
    text: [
      'Many pages show tabs or pills at the top of the content area (for example, Overview, Records, and Reports).',
      'Switch between these tabs to change the focus of the page without leaving the module.',
      'Action buttons near the tabs (Add, Export, Filter, etc.) let you perform tasks immediately.',
      'Together the tabs and actions keep you moving through the workflow without extra navigation.',
    ],
  },
  topBar: {
    title: 'Top Bar Navigation',
    icon: 'Search',
    text: [
      'The top bar provides quick access to essential tools and information.',
      'Use the search bar to quickly find students, staff, or any content. Press Ctrl+K (or Cmd+K on Mac) for the command palette.',
      'The notification bell shows important updates, and the user menu lets you access your profile and settings.',
    ],
  },
  search: {
    title: 'Global Search',
    icon: 'Search',
    text: [
      'Search across the entire application instantly.',
      'Type to find students, staff, classes, or any content. Use Ctrl+K (Cmd+K on Mac) for advanced search with filters.',
    ],
  },
  notifications: {
    title: 'Notifications',
    icon: 'Bell',
    text: [
      'Stay updated with important notifications.',
      'Click the bell icon to see all your notifications. The badge shows unread count.',
    ],
  },
  sidebarStudents: {
    title: 'Student Management',
    icon: 'Users',
    text: [
      'Manage all your student information in one place.',
      'Register new students, view detailed profiles, manage admissions, track academic progress, and handle student documents.',
      'All student data is organized by class and academic year for easy access.',
    ],
  },
  sidebarStaff: {
    title: 'Staff Management',
    icon: 'UserCheck',
    text: [
      'Manage your staff members and teachers efficiently.',
      'Register new staff, assign roles and permissions, manage teacher assignments to classes and subjects, and track staff performance.',
    ],
  },
  sidebarAttendance: {
    title: 'Attendance Tracking',
    icon: 'Calendar',
    text: [
      'Track attendance for both students and staff.',
      'Mark daily attendance, view attendance reports, monitor patterns, and generate attendance summaries for parents and administration.',
    ],
  },
  sidebarExams: {
    title: 'Examinations',
    icon: 'BookOpen',
    text: [
      'Manage all examination and assessment activities.',
      'Create exam schedules, enter grades, generate report cards, and track student performance across all subjects.',
    ],
  },
  sidebarFinance: {
    title: 'Finance Management',
    icon: 'CreditCard',
    text: [
      'Handle all financial operations for your school.',
      'Manage fee collection, track payments, generate invoices and receipts, view financial reports, and monitor outstanding balances.',
    ],
  },
  sidebarAcademic: {
    title: 'Academic Settings',
    icon: 'GraduationCap',
    text: [
      'Configure your academic structure and curriculum.',
      'Set up academic years, create and manage classes, define subjects, build timetables, and organize your academic calendar.',
    ],
  },
  sidebarSettings: {
    title: 'Settings',
    icon: 'Settings',
    text: [
      'Configure your organization and system settings.',
      'Manage users and permissions, customize school branding, configure system preferences, and access administrative tools.',
    ],
  },
  userMenu: {
    title: 'User Menu',
    icon: 'User',
    text: [
      'Access your profile and account settings.',
      'Click your avatar or name to open the user menu. From here you can view your profile, change settings, switch schools (if applicable), adjust language and theme preferences, or log out.',
    ],
  },
  helpCenter: {
    title: 'Help & Support',
    icon: 'HelpCircle',
    text: [
      'Get help whenever you need it.',
      'Click the help icon to access the Help Center with detailed guides, tutorials, and contextual tips. You can also find help buttons throughout the application for specific features.',
    ],
  },
  complete: {
    title: "You're All Set!",
    icon: 'School',
    text: [
      'Congratulations! You now know the basics of navigating Nazim.',
      'You\'ve learned about the sidebar, dashboard tabs, common icons (edit, delete, view), and how to access help.',
      'Feel free to explore the app and take this tour again anytime from your profile menu or the help center.',
      'Welcome to Nazim!',
    ],
  },
};

// Pashto translations (fallback to English if not present)
export const tourContentPs: typeof tourContentEn = {
  welcome: {
    title: 'ناظم ته ښه راغلاست!',
    icon: 'School',
    text: [
      'موږ خوشحاله یو چې تاسو زموږ سره یاست! راځئ یو لنډ سفر وکړو ترڅو له سیستم سره بلد شئ.',
      'په دې سفر کې به د اپلیکیشن مهمې ځانګړتیاوې، منو (Sidebar) او عام کارونه در وښایو چې هره ورځ یې کاروئ.',
    ],
  },
  dashboard: {
    title: 'ستاسو ډشبورډ',
    icon: 'Home',
    text: [
      'دا ستاسو ډشبورډ دی — د ښوونځي د مدیریت مرکزي ځای.',
      'دلته مهم شمېرې، وروستي فعالیتونه، او مهمو برخو ته چټک لاسرسی لیدلی شئ.',
    ],
  },
  dashboardTabs: {
    title: 'د ډشبورډ ټبونه',
    icon: 'FileText',
    text: [
      'ډشبورډ د ټبونو له لارې بېلابېلې برخې منظموي.',
      'پر هر ټب کلیک وکړئ ترڅو د عمومي معلوماتو، مالیې، شتمنیو، کتابتون، حاضري، رخصتیو غوښتنو او اسنادو ترمنځ بدلون وکړئ.',
      'هر ټب د خپلې برخې اړوند معلومات او چټک کارونه ښيي. ټبونه مرسته کوي چې له ډشبورډه ونه وځئ.',
      'ټبونه په ټول اپلیکیشن کې کارول کېږي: د زده‌کوونکي پروفایلونه، د کارکوونکو ثبتونه، راپورونه او نور.',
      'پر هر ټب کلیک سره لید بدلېږي. فعال ټب روښانه ښکاري. په موبایل کې ممکن د ټب نومونه پټ وي — خو آیکنونه تل ښکاري.',
      'د ټبونو ترڅنګ د عمل تڼۍ (Add، Export، Filter او نور) تاسو ته سمدستي کار کول اسانه کوي او اضافي تګ راتګ کموي.',
    ],
  },
  tabsGeneral: {
    title: 'د ټبونو پوهه',
    icon: 'FileText',
    text: [
      'ټبونه په اپلیکیشن کې د اړوندو معلوماتو د منظمولو لپاره کارول کېږي.',
      'په ډېرو پاڼو کې به ټبونه ووینئ: د زده‌کوونکو پروفایلونه، د کارکوونکو ریکارډونه، راپورونه او نور.',
      'پر ټب کلیک سره لید بدلېږي. فعال ټب روښانه وي. په موبایل کې ممکن نوم پټ وي — آیکنونه تل ښکاري.',
      'ټبونه مرسته کوي چې د یوې پاڼې دننه بېلابېلې برخې ووینئ، پرته له دې چې له پاڼې ووځئ.',
    ],
  },
  sidebar: {
    title: 'د منو (Sidebar) ناوبرۍ',
    icon: 'Home',
    text: [
      'Sidebar ستاسو د ناوبرۍ اصلي مرکز دی او په منظم ډول په برخو وېشل شوی دی.',
      'Operations: زده‌کوونکي، کارکوونکي او حاضري مدیریت کړئ. Academic: ټولګي، مضمونونه او امتحانونه تنظیم کړئ. Finance: فیسونه او تادیات تعقیب کړئ. Administration: تنظیمات او اجازې تنظیم کړئ.',
      'پر هر مینو کلیک وکړئ. هغه توکي چې غشی لري فرعي مینو لري او د کلیک په کولو سره پراخېږي.',
    ],
  },
  editIcon: {
    title: 'د سمون آیکن (پنسل)',
    icon: 'Pencil',
    text: [
      'د سمون لپاره تل د `Pencil` آیکن کارېږي.',
      'دا آیکن به د جدولونو او لېستونو په هر ریکارډ کې د عمل برخه کې ووینئ.',
      'پر دې کلیک سره د هماغه ځای فورم پرانیستل کېږي او تاسو سمدستي بدلون کولی شئ.',
      'دا کار ستاسو تمرکز له معلوماتو سره نږدې ساتي.',
    ],
  },
  deleteIcon: {
    title: 'د ړنګولو آیکن (Trash)',
    icon: 'Trash2',
    text: [
      'د ړنګولو لپاره د `Trash2` آیکن کارېږي.',
      'دا عموماً د سمون آیکن ترڅنګ ښودل کېږي.',
      'د زړو یا ناسم معلوماتو د لرې کولو لپاره یې وکاروئ، او د تایید پیغام په وخت کې احتیاط وکړئ.',
    ],
  },
  viewIcon: {
    title: 'د کتلو آیکن (Eye)',
    icon: 'Eye',
    text: [
      'د `Eye` آیکن د ریکارډ د یوازې-لوستلو (Read-only) کتنې لپاره دی.',
      'کله چې غواړئ له سمون یا ړنګولو مخکې معلومات وګورئ، دا تڼۍ وکاروئ.',
      'دا د چټکو کتنو لپاره ګټور دی پرته له دې چې له لېسته ووځئ.',
    ],
  },
  tabsActions: {
    title: 'ټبونه او د عمل تڼۍ',
    icon: 'FileText',
    text: [
      'ډېری پاڼې د محتوا په سر کې ټبونه/پیلونه ښيي (لکه Overview، Records، Reports).',
      'د ټبونو ترمنځ بدلون وکړئ ترڅو د پاڼې تمرکز بدل کړئ پرته له دې چې له مودول څخه ووځئ.',
      'د ټبونو ترڅنګ د عمل تڼۍ (Add، Export، Filter او نور) تاسو ته ژر کار کول اسانه کوي.',
      'ټبونه او عمل تڼۍ یو ځای ستاسو کاري بهیر چټکوي او اضافي ناوبرۍ کموي.',
    ],
  },
  topBar: {
    title: 'پورته بار (Top Bar)',
    icon: 'Search',
    text: [
      'پورته بار تاسو ته مهمو وسایلو ته چټک لاسرسی درکوي.',
      'د لټون له لارې زده‌کوونکي، کارکوونکي او نور معلومات ژر پیدا کړئ. د Command Palette لپاره Ctrl+K (په Mac کې Cmd+K) وکاروئ.',
      'د خبرتیاوو زنګ مهم تازه معلومات ښيي، او د کاروونکي مینو څخه پروفایل او تنظیماتو ته لاسرسی لرئ.',
    ],
  },
  search: {
    title: 'عمومي لټون',
    icon: 'Search',
    text: [
      'په ټول اپلیکیشن کې ژر لټون وکړئ.',
      'زده‌کوونکي، کارکوونکي، ټولګي او نور معلومات ومومئ. د پرمختللي لټون لپاره Ctrl+K (په Mac کې Cmd+K) وکاروئ.',
    ],
  },
  notifications: {
    title: 'خبرتیاوې',
    icon: 'Bell',
    text: [
      'له مهمو خبرتیاوو سره خبر اوسئ.',
      'د زنګ آیکن کلیک کړئ ترڅو ټولې خبرتیاوې وګورئ. نښه (badge) د نه-لوستل شوو شمېر ښيي.',
    ],
  },
  sidebarStudents: {
    title: 'د زده‌کوونکو مدیریت',
    icon: 'Users',
    text: [
      'د زده‌کوونکو ټول معلومات په یو ځای کې اداره کړئ.',
      'نوي زده‌کوونکي ثبت کړئ، تفصیلي پروفایلونه وګورئ، داخلې تنظیم کړئ، تعلیمي پرمختګ تعقیب کړئ، او اسناد مدیریت کړئ.',
      'د زده‌کوونکو معلومات د ټولګي او تعلیمي کال له مخې منظم دي.',
    ],
  },
  sidebarStaff: {
    title: 'د کارکوونکو مدیریت',
    icon: 'UserCheck',
    text: [
      'کارکوونکي او ښوونکي په اغېزمن ډول مدیریت کړئ.',
      'نوي کارکوونکي ثبت کړئ، رولونه او اجازې ورکړئ، ښوونکي ټولګیو/مضمونونو ته وټاکئ، او د کارکوونکو فعالیت تعقیب کړئ.',
    ],
  },
  sidebarAttendance: {
    title: 'د حاضري ثبت',
    icon: 'Calendar',
    text: [
      'د زده‌کوونکو او کارکوونکو حاضري تعقیب کړئ.',
      'ورځنۍ حاضري وټاکئ، راپورونه وګورئ، الګوګانې (patterns) وڅارئ، او د ادارې/اولیاوو لپاره لنډیزونه جوړ کړئ.',
    ],
  },
  sidebarExams: {
    title: 'امتحانونه',
    icon: 'BookOpen',
    text: [
      'د امتحان او ارزونې ټول کارونه مدیریت کړئ.',
      'د امتحان مهالویش جوړ کړئ، نمرې داخل کړئ، کارډونه/راپورونه جوړ کړئ، او د ټولو مضمونونو له مخې د زده‌کوونکو فعالیت تعقیب کړئ.',
    ],
  },
  sidebarFinance: {
    title: 'د مالیې مدیریت',
    icon: 'CreditCard',
    text: [
      'د ښوونځي ټول مالي کارونه اداره کړئ.',
      'د فیس راټولول، تادیات، رسید/انوايس، مالي راپورونه، او پاتې بیلانسونه تعقیب کړئ.',
    ],
  },
  sidebarAcademic: {
    title: 'تعلیمي تنظیمات',
    icon: 'GraduationCap',
    text: [
      'تعلیمي جوړښت او نصاب تنظیم کړئ.',
      'تعلیمي کلونه جوړ کړئ، ټولګي تنظیم کړئ، مضمونونه تعریف کړئ، مهالویش جوړ کړئ، او تعلیمي کلیز منظم کړئ.',
    ],
  },
  sidebarSettings: {
    title: 'تنظیمات',
    icon: 'Settings',
    text: [
      'د ادارې او سیستم تنظیمات سمبال کړئ.',
      'کاروونکي او اجازې مدیریت کړئ، د ښوونځي برانډنګ تنظیم کړئ، د سیستم غوره‌توبونه بدل کړئ، او اداري وسایلو ته لاسرسی ولرئ.',
    ],
  },
  userMenu: {
    title: 'د کاروونکي مینو',
    icon: 'User',
    text: [
      'پروفایل او حساب تنظیماتو ته لاسرسی.',
      'پر اواتار/نوم کلیک وکړئ ترڅو مینو پرانیستل شي. له دې ځایه پروفایل وګورئ، تنظیمات بدل کړئ، ښوونځی بدل کړئ (که وي)، ژبه/تم بدل کړئ، یا ووځئ.',
    ],
  },
  helpCenter: {
    title: 'مرسته او ملاتړ',
    icon: 'HelpCircle',
    text: [
      'هر وخت مرسته ترلاسه کړئ.',
      'د مرستې آیکن کلیک کړئ ترڅو د مرستې مرکز پرانیستل شي: لارښودونه، درسونه او اړوندې مشورې. په نورو برخو کې هم د ځانګړو فیچرونو لپاره د مرستې تڼۍ شته.',
    ],
  },
  complete: {
    title: 'تاسو چمتو یاست!',
    icon: 'School',
    text: [
      'مبارک! اوس تاسو د ناظم د ناوبرۍ بنسټیز اصول زده کړل.',
      'تاسو د منو، ډشبورډ ټبونه، عام آیکنونه (سمون، ړنګول، کتنه) او د مرستې لاسرسی وپېژاند.',
      'هر وخت کولی شئ له کاروونکي مینو یا د مرستې مرکز څخه دا سفر بیا پیل کړئ.',
      'ناظم ته ښه راغلاست!',
    ],
  },
};

export type AppCoreStepId = keyof typeof tourContentEn;

/**
 * Get content for a step
 */
export function getStepContent(stepId: AppCoreStepId): { title: string; text: string[]; icon?: string } {
  const lang = getLang();
  const dict = lang === 'ps' ? tourContentPs : tourContentEn;
  const content = dict[stepId];
  return {
    title: content.title,
    text: Array.isArray(content.text) ? content.text : [content.text],
    icon: content.icon,
  };
}
