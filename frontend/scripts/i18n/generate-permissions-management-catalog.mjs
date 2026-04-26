/**
 * Generates permissionsManagementCatalog en.ts, ps.ts, fa.ts, ar.ts from _permissions-meta.json.
 * Run: node scripts/i18n/generate-permissions-management-catalog.mjs (from frontend/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const metaPath = path.join(__dirname, '_permissions-meta.json');
const outDir = path.join(__dirname, '../../src/lib/permissionsManagementCatalog');

function humanize(value) {
  return value
    .split(/[._]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** @type {Record<string, Record<string, { title: string; description: string }>>} */
const ROLES = {
  en: {
    admin: {
      title: 'Administrator',
      description: 'Administrator with full access to all school-scoped features.',
    },
    organization_admin: {
      title: 'Organization administrator',
      description: 'Organization administrator with full access to all features for the organization.',
    },
    staff: {
      title: 'Staff',
      description:
        'Staff member with limited access for operational tasks; finance and fees are read-only unless granted separately.',
    },
    teacher: {
      title: 'Teacher',
      description: 'Teacher with access to academic content and student information.',
    },
    exam_controller: {
      title: 'Exam controller',
      description: 'Exam controller with full exam management access (except deletion where restricted).',
    },
    accountant: {
      title: 'Accountant',
      description: 'Accountant with full finance, fees, and multi-currency access.',
    },
    hostel_manager: {
      title: 'Hostel manager',
      description: 'Hostel manager for room assignments and related reports.',
    },
    librarian: {
      title: 'Librarian',
      description: 'Librarian — lend and return books to students and staff; library and document management.',
    },
    website_admin: {
      title: 'Website administrator',
      description: 'Website administrator — full website content and settings.',
    },
    website_editor: {
      title: 'Website editor',
      description: 'Website editor — edit pages, posts, events, and menus.',
    },
    website_media: {
      title: 'Website media manager',
      description: 'Website media manager — manage the media library only.',
    },
    organization_hr_admin: {
      title: 'Organization HR admin',
      description: 'Organization HR administrator — full HR, payroll, and related org access.',
    },
    hr_officer: {
      title: 'HR officer',
      description: 'HR officer — staff and assignments management.',
    },
    payroll_officer: {
      title: 'Payroll officer',
      description: 'Payroll officer — payroll processing and related reports.',
    },
    principal: {
      title: 'Principal',
      description: 'School principal — read-only oversight of HR and school data.',
    },
  },
  ps: {
    admin: {
      title: 'Administrator',
      description: 'د ټولو ښوونیزو ځانګړتیاوو بشپړ لاسرسی لري (د ښوونځي کچې).',
    },
    organization_admin: {
      title: 'د سازمان Administrator',
      description: 'د سازمان لپاره د ټولو ځانګړتیاوو بشپړ Administrator.',
    },
    staff: {
      title: 'کارکوونکی',
      description:
        'د دفتري چارو محدود لاسرسی؛ مالي او فیس یوازې د لوستلو لپاره تر هغه چې جلا اجازه ورکړل شي.',
    },
    teacher: {
      title: 'ښوونکی',
      description: 'د تعلیمي منځپانګې او د زده‌کوونکو معلوماتو لاسرسی.',
    },
    exam_controller: {
      title: 'د ازموینې کنټرولر',
      description: 'د ازموینو بشپړ مدیریت (چیرې چې محدودیت شته).',
    },
    accountant: {
      title: 'محاسب',
      description: 'بشپړ مالي، فیس او څو اسعارو لاسرسی.',
    },
    hostel_manager: {
      title: 'د لیلې مدیر',
      description: 'د خونو ټاکلو او راپورونو مدیریت.',
    },
    librarian: {
      title: 'کتابتونچی',
      description: 'زده‌کوونکو او کارکوونکو ته کتاب ورکړه او بیرته اخیستل؛ کتابتون او اسناد.',
    },
    website_admin: {
      title: 'د ویب پاڼې Administrator',
      description: 'د عامه ویب پاڼې بشپړ منځپانګه او تنظیمات.',
    },
    website_editor: {
      title: 'د ویب پاڼې سمونګر',
      description: 'ماتاق ، پوسټونه، پیښې او مینو سمول.',
    },
    website_media: {
      title: 'د ویب رسنیو مدیر',
      description: 'یوازې د رسنیو کتابتون مدیریت.',
    },
    organization_hr_admin: {
      title: 'د سازمان د بشري سرچینو Administrator',
      description: 'بشپړ HR، معاش او اړونده سازماني لاسرسی.',
    },
    hr_officer: {
      title: 'د بشري سرچینو افسر',
      description: 'کارکوونکي او د دندو ټاکنې مدیریت.',
    },
    payroll_officer: {
      title: 'د معاش افسر',
      description: 'د معاش پروسې او راپورونه.',
    },
    principal: {
      title: 'مشر',
      description: 'د HR او ښوونیزو ډیټا لوستل یوازې.',
    },
  },
  fa: {
    admin: {
      title: 'مدیر مکتب',
      description: 'دسترسی کامل به همه ویژگی‌های محدود به مکتب.',
    },
    organization_admin: {
      title: 'مدیر سازمان',
      description: 'مدیر سازمان با دسترسی کامل به همه ویژگی‌های سازمان.',
    },
    staff: {
      title: 'کارمند',
      description:
        'دسترسی محدود برای امور اداری؛ مالی و فیس فقط خواندنی مگر اجازه جداگانه داده شود.',
    },
    teacher: {
      title: 'معلم',
      description: 'دسترسی به محتوای تعلیمی و اطلاعات شاگردان.',
    },
    exam_controller: {
      title: 'مسئول امتحانات',
      description: 'مدیریت کامل امتحانات (جز جایی که محدود است).',
    },
    accountant: {
      title: 'محاسب',
      description: 'دسترسی کامل به مالی، فیس و چند ارزی.',
    },
    hostel_manager: {
      title: 'مدیر لیلیه ',
      description: 'تعیین اتاق و گزارش‌های مرتبط.',
    },
    librarian: {
      title: 'کتابدار',
      description: 'اعطا و بازپس‌گیری کتاب به شاگردان و کارمندان؛ کتابخانه و اسناد.',
    },
    website_admin: {
      title: 'مدیر ویب‌سایت',
      description: 'مدیر ویب‌سایت — محتوا و تنظیمات کامل سایت عمومی.',
    },
    website_editor: {
      title: 'ویرایشگر ویب‌سایت',
      description: 'ویرایش صفحات، پست‌ها، رویدادها و منوها.',
    },
    website_media: {
      title: 'مدیر رسانه ویب',
      description: 'مدیریت کتابخانه رسانه‌ای فقط.',
    },
    organization_hr_admin: {
      title: 'مدیر منابع بشری سازمان',
      description: 'دسترسی کامل HR، معاش و امور مرتبط سازمان.',
    },
    hr_officer: {
      title: 'مسئول منابع بشری',
      description: 'مدیریت کارمندان و تخصیص‌ها.',
    },
    payroll_officer: {
      title: 'مسئول معاش',
      description: 'پردازش معاش و گزارش‌های مرتبط.',
    },
    principal: {
      title: 'مدیر مکتب (ناظر)',
      description: 'نظارت با دسترسی خواندنی به HR و داده‌های مکتب.',
    },
  },
  ar: {
    admin: {
      title: 'مسؤول النظام (المدرسة)',
      description: 'وصول كامل لجميع ميزات النطاق المدرسي.',
    },
    organization_admin: {
      title: 'مسؤول المؤسسة',
      description: 'مسؤول المؤسسة بصلاحيات كاملة لجميع الميزات.',
    },
    staff: {
      title: 'موظف',
      description: 'صلاحيات محددة للمهام التشغيلية؛ المالية والرسوم للقراءة فقط ما لم يُمنح غير ذلك.',
    },
    teacher: {
      title: 'معلم',
      description: 'صلاحية المحتوى الأكاديمي ومعلومات الطلاب.',
    },
    exam_controller: {
      title: 'مسؤول الامتحانات',
      description: 'إدارة كاملة للامتحانات (حيث لا يوجد تقييد).',
    },
    accountant: {
      title: 'محاسب',
      description: 'صلاحية كاملة للمالية والرسوم والعملات المتعددة.',
    },
    hostel_manager: {
      title: 'مسؤول السكن',
      description: 'تعيين الغرف والتقارير ذات الصلة.',
    },
    librarian: {
      title: 'أمين المكتبة',
      description: 'إعارة وإرجاع الكتب للطلاب والموظفين؛ المكتبة والوثائق.',
    },
    website_admin: {
      title: 'مسؤول الموقع',
      description: 'مسؤول الموقع — المحتوى والإعدادات بالكامل.',
    },
    website_editor: {
      title: 'محرر الموقع',
      description: 'تحرير الصفحات والمنشورات والفعاليات والقوائم.',
    },
    website_media: {
      title: 'مسؤول وسائط الموقع',
      description: 'إدارة مكتبة الوسائط فقط.',
    },
    organization_hr_admin: {
      title: 'مسؤول الموارد البشرية للمؤسسة',
      description: 'صلاحية كاملة للموارد البشرية والرواتب.',
    },
    hr_officer: {
      title: 'مسؤول موارد بشرية',
      description: 'إدارة الموظفين والتعيينات.',
    },
    payroll_officer: {
      title: 'مسؤول الرواتب',
      description: 'معالجة الرواتب والتقارير.',
    },
    principal: {
      title: 'مدير المدرسة',
      description: 'إشراف بصلاحية قراءة لبيانات الموارد البشرية والمدرسة.',
    },
  },
};

/** @type {Record<string, Record<string, string>>} */
const FEATURE_SECTIONS = {
  en: {
    students: 'Students',
    staff: 'Staff',
    classes: 'Classes',
    subjects: 'Subjects',
    exams: 'Exams',
    exams_full: 'Exams (full)',
    grades: 'Grades',
    attendance: 'Attendance',
    finance: 'Finance',
    fees: 'Fees',
    multi_currency: 'Multi-currency',
    dms: 'Document management',
    events: 'Events',
    library: 'Library',
    hostel: 'Hostel',
    graduation: 'Graduation',
    id_cards: 'ID cards',
    assets: 'Assets',
    org_hr_core: 'Organization HR',
    org_hr_payroll: 'Organization payroll',
    org_hr_analytics: 'Organization HR reports',
    org_finance: 'Organization finance',
    leave_management: 'Leave management',
    other: 'Other',
  },
  ps: {
    students: 'زده‌کوونکي',
    staff: 'کارکوونکي',
    classes: 'ټولګي',
    subjects: 'مضامین',
    exams: 'ازموینې',
    exams_full: 'ازموینې (بشپړ)',
    grades: 'درجې',
    attendance: 'حاضري',
    finance: 'مالي',
    fees: 'فیس',
    multi_currency: 'څو اسعاره',
    dms: 'د اسنادو مدیریت',
    events: 'پیښې',
    library: 'کتابتون',
    hostel: 'لیله',
    graduation: 'فراغت',
    id_cards: 'پېژند پاڼې',
    assets: 'شتمنۍ',
    org_hr_core: 'د سازمان بشري سرچینې',
    org_hr_payroll: 'د سازمان معاش',
    org_hr_analytics: 'د بشري سرچینو راپورونه',
    org_finance: 'د سازمان مالي',
    leave_management: 'رخصتۍ',
    other: 'نور',
  },
  fa: {
    students: 'شاگردان',
    staff: 'کارمندان',
    classes: 'صنف‌ها',
    subjects: 'مضامین',
    exams: 'امتحانات',
    exams_full: 'امتحانات (کامل)',
    grades: 'درجات',
    attendance: 'حاضری',
    finance: 'مالی',
    fees: 'فیس',
    multi_currency: 'چند ارزی',
    dms: 'مدیریت اسناد',
    events: 'رویدادها',
    library: 'کتابخانه',
    hostel: 'لیلیه ',
    graduation: 'فراغت',
    id_cards: 'کارت‌های شناسایی',
    assets: 'دارایی‌ها',
    org_hr_core: 'منابع بشری سازمان',
    org_hr_payroll: 'معاش سازمان',
    org_hr_analytics: 'گزارش‌های منابع بشری',
    org_finance: 'مالی سازمان',
    leave_management: 'رخصتی',
    other: 'سایر',
  },
  ar: {
    students: 'الطلاب',
    staff: 'الموظفون',
    classes: 'الصفوف',
    subjects: 'المواد',
    exams: 'الامتحانات',
    exams_full: 'الامتحانات (كامل)',
    grades: 'الدرجات',
    attendance: 'الحضور',
    finance: 'المالية',
    fees: 'الرسوم',
    multi_currency: 'متعدد العملات',
    dms: 'إدارة المستندات',
    events: 'الفعاليات',
    library: 'المكتبة',
    hostel: 'السكن',
    graduation: 'التخرج',
    id_cards: 'بطاقات الهوية',
    assets: 'الأصول',
    org_hr_core: 'الموارد البشرية للمؤسسة',
    org_hr_payroll: 'رواتب المؤسسة',
    org_hr_analytics: 'تقارير الموارد البشرية',
    org_finance: 'مالية المؤسسة',
    leave_management: 'الإجازات',
    other: 'أخرى',
  },
};

/** Resource segment → localized noun phrase (for building permission descriptions) */
const RESOURCE_PART = {
  en: null,
  ps: {
    academic_years: 'تعلیمي کلونه',
    activity_logs: 'د فعالیت یادښتونه',
    asset_categories: 'د شتمنۍ کټګورۍ',
    assets: 'شتمنۍ',
    attendance_sessions: 'د حاضرۍ ناستې',
    buildings: 'ودانۍ',
    certificate_templates: 'د سند قالبونه',
    certificates: 'سندونه',
    classes: 'ټولګي',
    course_attendance: 'د کورس حاضري',
    course_documents: 'د کورس اسناد',
    course_student_discipline_records: 'د کورس زده‌کوونکو انضباط',
    course_students: 'د کورس زده‌کوونکي',
    currencies: 'اسعار',
    archive: 'ارشیف',
    departments: 'برخې',
    files: 'فایلونه',
    incoming: 'راغلي لیکنې',
    letter_types: 'د لیک ډولونه',
    letterheads: 'لترهدونه',
    outgoing: 'وتونکي لیکنې',
    reports: 'راپورونه',
    settings: 'تنظیمات',
    templates: 'قالبونه',
    donors: 'بسپنه ورکوونکي',
    event_checkins: 'د پیښې ننوت',
    event_guests: 'مېلمان',
    event_types: 'د پیښې ډولونه',
    events: 'پیښې',
    exam_classes: 'د ازموینې ټولګي',
    exam_documents: 'د ازموینې اسناد',
    exam_results: 'د ازموینې پایلې',
    exam_students: 'د ازموینې زده‌کوونکي',
    exam_subjects: 'د ازموینې مضامین',
    exam_times: 'د ازموینې وختونه',
    exam_types: 'د ازموینې ډولونه',
    exams: 'ازموینې',
    papers: 'کاغذونه/تستونه',
    questions: 'پوښتنې',
    exchange_rates: 'د اسعارو نراتاق ',
    expense_categories: 'د لګښت کټګورۍ',
    expense_entries: 'د لګښت ثبتونه',
    fees: 'فیس',
    exceptions: 'استثناوې',
    payments: 'تادیات',
    finance_accounts: 'مالي حسابونه',
    finance_documents: 'مالي اسناد',
    finance_donors: 'مالي بسپنه ورکوونکي',
    finance_expense: 'لګښت',
    finance_income: 'عاید',
    finance_projects: 'مالي پروژې',
    finance_reports: 'مالي راپورونه',
    grades: 'درجې',
    graduation_batches: 'د فراغت ډلې',
    help_center: 'مرکز مرستې',
    hostel: 'لیله',
    hr_assignments: 'د بشري سرچینو ټاکنې',
    hr_payroll: 'معاش',
    hr_reports: 'د بشري سرچینو راپورونه',
    hr_staff: 'بشري سرچینې',
    id_cards: 'پېژند پاڼې',
    income_categories: 'د عاید کټګورۍ',
    income_entries: 'د عاید ثبتونه',
    issued_certificates: 'صادر شوي سندونه',
    leave_requests: 'د رخصتۍ غوښتنې',
    library_books: 'کتابتون کتابونه',
    library_categories: 'د کتابتون کټګورۍ',
    library_loans: 'د کتابونو قرضې',
    notifications: 'خبرتیاوې',
    org_finance: 'د سازمان مالي',
    organizations: 'سازمانونه',
    permissions: 'اجازې',
    phonebook: 'د تلیفون کتاب',
    profiles: 'پروفایلونه',
    report_templates: 'د راپور قالبونه',
    residency_types: 'د اوسیدو ډولونه',
    roles: 'رولونه',
    rooms: 'خونې',
    schedule_slots: 'د مهالویش ځایونه',
    school_branding: 'د ښوونځي برانډینګ',
    schools: 'ښوونځي',
    short_term_courses: 'لنډ مهاله کورسونه',
    staff: 'کارکوونکي',
    staff_documents: 'د کارکوونکو اسناد',
    staff_reports: 'د کارکوونکو راپورونه',
    staff_types: 'د کارکوونکو ډولونه',
    student_admissions: 'د زده‌کوونکو ثبت',
    student_discipline_records: 'د انضباط یادښتونه',
    student_documents: 'د زده‌کوونکو اسناد',
    student_educational_history: 'تعلیمي پېښې',
    student_reports: 'د زده‌کوونکو راپورونه',
    students: 'زده‌کوونکي',
    subjects: 'مضامین',
    subscription: 'اشتراک',
    teacher_subject_assignments: 'د ښوونکي مضمون ټاکنې',
    teacher_timetable_preferences: 'د مهالویش غوره توبونه',
    teachers: 'ښوونکي',
    timetables: 'مهالویشونه',
    users: 'کارونکي',
    website_domains: 'د ویب شپونې',
    website_events: 'د ویب پیښې',
    website_media: 'ویب رسنۍ',
    website_menus: 'ویب مینو',
    website_pages: 'ویب ماتاق ',
    website_posts: 'ویب پوسټونه',
    website_settings: 'د ویب تنظیمات',
    dms: 'DMS',
  },
  fa: {
    academic_years: 'سال‌های تعلیمی',
    activity_logs: 'یادداشت فعالیت',
    asset_categories: 'دسته‌بندی دارایی',
    assets: 'دارایی‌ها',
    attendance_sessions: 'جلسات حاضری',
    buildings: 'ساختمان‌ها',
    certificate_templates: 'قالب‌های گواهی',
    certificates: 'گواهی‌ها',
    classes: 'صنف‌ها',
    course_attendance: 'حاضری کورس',
    course_documents: 'اسناد کورس',
    course_student_discipline_records: 'انضباط شاگردان کورس',
    course_students: 'شاگردان کورس',
    currencies: 'ارزها',
    archive: 'بایگانی',
    departments: 'بخش‌ها',
    files: 'فایل‌ها',
    incoming: 'وارده',
    letter_types: 'انواع نامه',
    letterheads: 'سربرگ',
    outgoing: 'صادره',
    reports: 'گزارشات',
    settings: 'تنظیمات',
    templates: 'قالب‌ها',
    donors: 'اهدا کنندگان',
    event_checkins: 'ورود رویداد',
    event_guests: 'مهمانان رویداد',
    event_types: 'انواع رویداد',
    events: 'رویدادها',
    exam_classes: 'صنف‌های امتحان',
    exam_documents: 'اسناد امتحان',
    exam_results: 'نتایج امتحان',
    exam_students: 'شاگردان امتحان',
    exam_subjects: 'مضامین امتحان',
    exam_times: 'اوقات امتحان',
    exam_types: 'انواع امتحان',
    exams: 'امتحانات',
    papers: 'کاغذهای امتحان',
    questions: 'بانک سوال',
    exchange_rates: 'نرخ ارز',
    expense_categories: 'دسته مصارف',
    expense_entries: 'ثبت مصارف',
    fees: 'فیس',
    exceptions: 'استثناها',
    payments: 'پرداخت‌ها',
    finance_accounts: 'حساب‌های مالی',
    finance_documents: 'اسناد مالی',
    finance_donors: 'اهدا کنندگان مالی',
    finance_expense: 'مصارف',
    finance_income: 'عواید',
    finance_projects: 'پروژه‌های مالی',
    finance_reports: 'گزارشات مالی',
    grades: 'درجات',
    graduation_batches: 'دسته‌های فراغت',
    help_center: 'مرکز کمک',
    hostel: 'لیلیه ',
    hr_assignments: 'تخصیص‌های منابع بشری',
    hr_payroll: 'معاش',
    hr_reports: 'گزارش‌های منابع بشری',
    hr_staff: 'کارمندان (منابع بشری)',
    id_cards: 'کارت شناسایی',
    income_categories: 'دسته عواید',
    income_entries: 'ثبت عواید',
    issued_certificates: 'گواهی‌های صادر شده',
    leave_requests: 'درخواست رخصتی',
    library_books: 'کتاب‌های کتابخانه',
    library_categories: 'دسته‌های کتابخانه',
    library_loans: 'امانت کتاب',
    notifications: 'اعلان‌ها',
    org_finance: 'مالی سازمان',
    organizations: 'سازمان‌ها',
    permissions: 'اجازه‌ها',
    phonebook: 'دفتر تلفن',
    profiles: 'پروفایل‌ها',
    report_templates: 'قالب گزارش',
    residency_types: 'انواع اقامت',
    roles: 'نقش‌ها',
    rooms: 'اتاق‌ها',
    schedule_slots: 'زمان‌بندی',
    school_branding: 'برندینگ مکتب',
    schools: 'مکتب‌ها',
    short_term_courses: 'کورس‌های کوتاه‌مدت',
    staff: 'کارمندان',
    staff_documents: 'اسناد کارمندان',
    staff_reports: 'گزارش کارمندان',
    staff_types: 'انواع کارمند',
    student_admissions: 'پذیرش شاگردان',
    student_discipline_records: 'سوابق انضباطی',
    student_documents: 'اسناد شاگردان',
    student_educational_history: 'سابقه تحصیلی',
    student_reports: 'گزارش شاگردان',
    students: 'شاگردان',
    subjects: 'مضامین',
    subscription: 'اشتراک',
    teacher_subject_assignments: 'تخصیص معلم به مضمون',
    teacher_timetable_preferences: 'ترجیحات جدول معلم',
    teachers: 'معلمان',
    timetables: 'جداول زمانی',
    users: 'کاربران',
    website_domains: 'دامنه‌های وب',
    website_events: 'رویدادهای وب',
    website_media: 'رسانه وب',
    website_menus: 'منوهای وب',
    website_pages: 'صفحات وب',
    website_posts: 'پست‌های وب',
    website_settings: 'تنظیمات وب',
    dms: 'مدیریت اسناد',
  },
  ar: {
    academic_years: 'السنوات الدراسية',
    activity_logs: 'سجل النشاط',
    asset_categories: 'فئات الأصول',
    assets: 'الأصول',
    attendance_sessions: 'جلسات الحضور',
    buildings: 'المباني',
    certificate_templates: 'قوالب الشهادات',
    certificates: 'الشهادات',
    classes: 'الصفوف',
    course_attendance: 'حضور الدورة',
    course_documents: 'وثائق الدورة',
    course_student_discipline_records: 'سجلات الانضباط',
    course_students: 'طلاب الدورة',
    currencies: 'العملات',
    archive: 'الأرشيف',
    departments: 'الأقسام',
    files: 'الملفات',
    incoming: 'الوارد',
    letter_types: 'أنواع الخطابات',
    letterheads: 'ترويسة الخطاب',
    outgoing: 'الصادر',
    reports: 'التقارير',
    settings: 'الإعدادات',
    templates: 'القوالب',
    donors: 'المتبرعون',
    event_checkins: 'تسجيل الحضور للفعالية',
    event_guests: 'ضيوف الفعالية',
    event_types: 'أنواع الفعاليات',
    events: 'الفعاليات',
    exam_classes: 'صفوف الامتحان',
    exam_documents: 'وثائق الامتحان',
    exam_results: 'نتائج الامتحان',
    exam_students: 'طلاب الامتحان',
    exam_subjects: 'مواد الامتحان',
    exam_times: 'أوقات الامتحان',
    exam_types: 'أنواع الامتحان',
    exams: 'الامتحانات',
    papers: 'أوراق الامتحان',
    questions: 'بنك الأسئلة',
    exchange_rates: 'أسعار الصرف',
    expense_categories: 'فئات المصروفات',
    expense_entries: 'قيود المصروفات',
    fees: 'الرسوم',
    exceptions: 'الاستثناءات',
    payments: 'المدفوعات',
    finance_accounts: 'الحسابات المالية',
    finance_documents: 'الوثائق المالية',
    finance_donors: 'متبرعو المالية',
    finance_expense: 'المصروفات',
    finance_income: 'الإيرادات',
    finance_projects: 'المشاريع المالية',
    finance_reports: 'التقارير المالية',
    grades: 'الدرجات',
    graduation_batches: 'دفعات التخرج',
    help_center: 'مركز المساعدة',
    hostel: 'السكن',
    hr_assignments: 'تعيينات الموارد البشرية',
    hr_payroll: 'الرواتب',
    hr_reports: 'تقارير الموارد البشرية',
    hr_staff: 'الموظفون (الموارد البشرية)',
    id_cards: 'بطاقات الهوية',
    income_categories: 'فئات الإيرادات',
    income_entries: 'قيود الإيرادات',
    issued_certificates: 'الشهادات الصادرة',
    leave_requests: 'طلبات الإجازة',
    library_books: 'كتب المكتبة',
    library_categories: 'فئات المكتبة',
    library_loans: 'إعارة الكتب',
    notifications: 'الإشعارات',
    org_finance: 'مالية المؤسسة',
    organizations: 'المؤسسات',
    permissions: 'الصلاحيات',
    phonebook: 'دليل الهاتف',
    profiles: 'الملفات الشخصية',
    report_templates: 'قوالب التقارير',
    residency_types: 'أنواع الإقامة',
    roles: 'الأدوار',
    rooms: 'الغرف',
    schedule_slots: 'الفترات الزمنية',
    school_branding: 'هوية المدرسة',
    schools: 'المدارس',
    short_term_courses: 'دورات قصيرة',
    staff: 'الموظفون',
    staff_documents: 'وثائق الموظفين',
    staff_reports: 'تقارير الموظفين',
    staff_types: 'أنواع الموظفين',
    student_admissions: 'قبول الطلاب',
    student_discipline_records: 'سجلات الانضباط',
    student_documents: 'وثائق الطلاب',
    student_educational_history: 'السجل التعليمي',
    student_reports: 'تقارير الطلاب',
    students: 'الطلاب',
    subjects: 'المواد',
    subscription: 'الاشتراك',
    teacher_subject_assignments: 'تعيين المعلمين للمواد',
    teacher_timetable_preferences: 'تفضيلات الجدول',
    teachers: 'المعلمون',
    timetables: 'الجداول',
    users: 'المستخدمون',
    website_domains: 'نطاقات الموقع',
    website_events: 'فعاليات الموقع',
    website_media: 'وسائط الموقع',
    website_menus: 'قوائم الموقع',
    website_pages: 'صفحات الموقع',
    website_posts: 'منشورات الموقع',
    website_settings: 'إعدادات الموقع',
    dms: 'إدارة المستندات',
  },
};

/** Full action string → short verb/phrase for permission row title */
const ACTION_LABEL = {
  en: (action) => humanize(action),
  ps: {
    read: 'لوستل',
    create: 'جوړول',
    update: 'سمول',
    delete: 'ړنګول',
    assign: 'ټاکل',
    copy: 'کاپي',
    import: 'واردول',
    export: 'صادرول',
    report: 'راپور',
    manage: 'مدیریت',
    approve: 'تصویب',
    run: 'پلي کول',
    search: 'لټون',
    download: 'ډاونلوډ',
    issue: 'صادرول',
    print: 'چاپ',
    revoke: 'لغوه',
    close: 'تړل',
    activate: 'فعالول',
    deactivate: 'غیرفعالول',
    checkin: 'ننوت',
    enroll_from_main: 'اصلي څخه نوم لیکنه',
    copy_to_main: 'اصلي ته کاپي',
    enroll_students: 'زده‌کوونکي نوم لیکنه',
    enter_marks: 'نمرې ثبت',
    manage_attendance: 'حاضري مدیریت',
    manage_timetable: 'مهالویش',
    manage_preferences: 'غوره توبونه',
    generate_pdf: 'PDF جوړول',
    generate_students: 'زده‌کوونکي تولید',
    reset_password: 'پټنوم بیا تنظیم',
    access_all: 'ټولو ته لاسرسی',
    read_staff: 'د کارکوونکو لوستل',
    'roll_numbers.read': 'د رول نمبر لوستل',
    'roll_numbers.assign': 'د رول نمبر ټاکل',
    'secret_numbers.read': 'د پټ نمبر لوستل',
    'secret_numbers.assign': 'د پټ نمبر ټاکل',
    'numbers.print': 'شمېرې چاپ',
    'fees.payments.create': 'فیس تادیه',
    'fees.exceptions.create': 'فیس استثنا',
    'fees.exceptions.approve': 'فیس استثنا تصویب',
  },
  fa: {
    read: 'خواندن',
    create: 'ایجاد',
    update: 'ویرایش',
    delete: 'حذف',
    assign: 'تخصیص',
    copy: 'رونوشت',
    import: 'ورود',
    export: 'صدور',
    report: 'گزارش',
    manage: 'مدیریت',
    approve: 'تأیید',
    run: 'اجرای',
    search: 'جستجو',
    download: 'بارگیری',
    issue: 'صدور',
    print: 'چاپ',
    revoke: 'لغو',
    close: 'بستن',
    activate: 'فعال‌سازی',
    deactivate: 'غیرفعال',
    checkin: 'ورود',
    enroll_from_main: 'ثبت‌نام از اصلی',
    copy_to_main: 'رونوشت به اصلی',
    enroll_students: 'ثبت‌نام شاگردان',
    enter_marks: 'ثبت نمرات',
    manage_attendance: 'مدیریت حاضری',
    manage_timetable: 'جدول امتحان',
    manage_preferences: 'تنظیم ترجیحات',
    generate_pdf: 'ایجاد PDF',
    generate_students: 'تولید فهرست شاگردان',
    reset_password: 'بازنشانی رمز',
    access_all: 'دسترسی به همه مکتب‌ها',
    read_staff: 'خواندن مطالب کارکنان',
    'roll_numbers.read': 'مشاهده شماره رول',
    'roll_numbers.assign': 'تخصیص شماره رول',
    'secret_numbers.read': 'مشاهده شماره محرمانه',
    'secret_numbers.assign': 'تخصیص شماره محرمانه',
    'numbers.print': 'چاپ برچسب‌ها',
    'fees.payments.create': 'ثبت پرداخت فیس',
    'fees.exceptions.create': 'ایجاد استثنای فیس',
    'fees.exceptions.approve': 'تأیید استثنای فیس',
  },
  ar: {
    read: 'قراءة',
    create: 'إنشاء',
    update: 'تحديث',
    delete: 'حذف',
    assign: 'تعيين',
    copy: 'نسخ',
    import: 'استيراد',
    export: 'تصدير',
    report: 'تقرير',
    manage: 'إدارة',
    approve: 'اعتماد',
    run: 'تشغيل',
    search: 'بحث',
    download: 'تنزيل',
    issue: 'إصدار',
    print: 'طباعة',
    revoke: 'إلغاء',
    close: 'إغلاق',
    activate: 'تفعيل',
    deactivate: 'تعطيل',
    checkin: 'تسجيل دخول',
    enroll_from_main: 'تسجيل من الرئيسي',
    copy_to_main: 'نسخ إلى الرئيسي',
    enroll_students: 'تسجيل الطلاب',
    enter_marks: 'إدخال الدرجات',
    manage_attendance: 'إدارة الحضور',
    manage_timetable: 'جدول الامتحان',
    manage_preferences: 'تفضيلات الإشعارات',
    generate_pdf: 'إنشاء PDF',
    generate_students: 'توليد قائمة الطلاب',
    reset_password: 'إعادة تعيين كلمة المرور',
    access_all: 'الوصول لجميع المدارس',
    read_staff: 'قراءة محتوى الموظفين',
    'roll_numbers.read': 'عرض أرقام اللوح',
    'roll_numbers.assign': 'تعيين أرقام اللوح',
    'secret_numbers.read': 'عرض الأرقام السرية',
    'secret_numbers.assign': 'تعيين الأرقام السرية',
    'numbers.print': 'طباعة الملصقات',
    'fees.payments.create': 'تسجيل دفع الرسوم',
    'fees.exceptions.create': 'إنشاء استثناء رسوم',
    'fees.exceptions.approve': 'اعتماد استثناء رسوم',
  },
};

function translateResourcePhrase(lang, resource) {
  if (lang === 'en') return humanize(resource.replace(/\./g, '_')).replace(/_/g, ' ');
  const parts = resource.split('.');
  const map = RESOURCE_PART[lang];
  const out = parts.map((p) => map[p] ?? humanize(p)).join(' — ');
  return out;
}

function actionLabelForFixed(lang, action, permissionName) {
  if (lang === 'en') return humanize(action);
  const table = ACTION_LABEL[lang];
  if (table[action]) return table[action];
  // match compound keys in table
  for (const k of Object.keys(table)) {
    if (k.includes('.') && permissionName.endsWith(k.replace(/^.*\./, ''))) {
      /* continue */
    }
  }
  if (table[action]) return table[action];
  // fees.payments + create => permission student_admissions style: name fees.payments.create, action create
  if (permissionName === 'fees.payments.create' && table['fees.payments.create']) return table['fees.payments.create'];
  if (permissionName === 'fees.exceptions.create' && table['fees.exceptions.create']) return table['fees.exceptions.create'];
  if (permissionName === 'fees.exceptions.approve' && table['fees.exceptions.approve']) return table['fees.exceptions.approve'];
  if (permissionName.startsWith('exams.') && action.includes('.')) {
    if (table[action]) return table[action];
  }
  const examNested = ['view_reports', 'view_grade_cards', 'view_consolidated_reports', 'view_class_reports', 'view_student_reports', 'view_attendance_reports', 'manage_timetable', 'manage_attendance', 'enroll_students', 'enter_marks', 'numbers.print'];
  if (examNested.includes(action) && lang === 'ps') {
    const psEx = {
      view_reports: 'راپورونه',
      view_grade_cards: 'درجې کارتونه',
      view_consolidated_reports: 'ګډ راپورونه',
      view_class_reports: 'د ټولګي راپورونه',
      view_student_reports: 'د زده‌کوونکي راپورونه',
      view_attendance_reports: 'د حاضرۍ راپورونه',
      manage_timetable: 'مهالویش',
      manage_attendance: 'حاضري',
      enroll_students: 'نوم لیکنه',
      enter_marks: 'نمرې',
      'numbers.print': 'چاپ',
    };
    return psEx[action] ?? humanize(action);
  }
  if (examNested.includes(action) && lang === 'fa') {
    const faEx = {
      view_reports: 'مشاهده گزارش‌ها',
      view_grade_cards: 'کارت نمرات',
      view_consolidated_reports: 'گزارش‌های تجمیعی',
      view_class_reports: 'گزارش صنف',
      view_student_reports: 'گزارش شاگرد',
      view_attendance_reports: 'گزارش حاضری',
      manage_timetable: 'جدول زمانی',
      manage_attendance: 'حاضری',
      enroll_students: 'ثبت‌نام شاگردان',
      enter_marks: 'ثبت نمرات',
      'numbers.print': 'چاپ',
    };
    return faEx[action] ?? humanize(action);
  }
  if (examNested.includes(action) && lang === 'ar') {
    const arEx = {
      view_reports: 'عرض التقارير',
      view_grade_cards: 'بطاقات الدرجات',
      view_consolidated_reports: 'تقارير مجمعة',
      view_class_reports: 'تقرير الصف',
      view_student_reports: 'تقرير الطالب',
      view_attendance_reports: 'تقرير الحضور',
      manage_timetable: 'الجدول الزمني',
      manage_attendance: 'الحضور',
      enroll_students: 'تسجيل الطلاب',
      enter_marks: 'إدخال الدرجات',
      'numbers.print': 'طباعة',
    };
    return arEx[action] ?? humanize(action);
  }
  return humanize(action);
}

function buildPermissionEntry(lang, row) {
  const { name, resource, action, dbDescription } = row;
  if (lang === 'en') {
    return {
      actionLabel: humanize(action),
      description: dbDescription,
    };
  }
  const act = actionLabelForFixed(lang, action, name);
  const res = translateResourcePhrase(lang, resource);
  return {
    actionLabel: act,
    description: `${act} — ${res}`,
  };
}

function serializeCatalog(lang) {
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  /** @type {Record<string, { actionLabel: string; description: string }>} */
  const permissions = {};
  for (const row of meta) {
    permissions[row.name] = buildPermissionEntry(lang, row);
  }
  return {
    roles: ROLES[lang],
    featureSections: FEATURE_SECTIONS[lang],
    permissions,
  };
}

function emitTs(lang, suffix) {
  const data = serializeCatalog(lang);
  const body = JSON.stringify(data, null, 2);
  return `/* eslint-disable max-len */
/**
 * Auto-generated by scripts/i18n/generate-permissions-management-catalog.mjs
 * Source: scripts/i18n/_permissions-meta.json (from PermissionSeeder.php via dump-permissions-meta.php)
 * Regenerate: npm run i18n:permissions-meta && npm run i18n:permissions-catalog
 * Do not edit by hand — regenerate after backend permission changes.
 */
import type { PermissionsManagementCatalog } from './types';

export const permissionsManagementCatalog${suffix}: PermissionsManagementCatalog = ${body};
`;
}

for (const [lang, suffix] of [
  ['en', 'En'],
  ['ps', 'Ps'],
  ['fa', 'Fa'],
  ['ar', 'Ar'],
]) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${lang}.ts`), emitTs(lang, suffix), 'utf8');
}

console.log('Wrote en.ts, ps.ts, fa.ts, ar.ts to', outDir);
