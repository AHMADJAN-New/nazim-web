// Nazim School Management System - Internationalization
// Translation system supporting English, Pashto, Dari, and Arabic

export type Language = 'en' | 'ps' | 'fa' | 'ar';

export interface TranslationKeys {
  // Common
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    filter: string;
    export: string;
    import: string;
    print: string;
    close: string;
    confirm: string;
    yes: string;
    no: string;
    back: string;
    next: string;
    previous: string;
    submit: string;
    reset: string;
  };
  
  // Navigation
  nav: {
    dashboard: string;
    students: string;
    admissions: string;
    attendance: string;
    classes: string;
    exams: string;
    finance: string;
    staff: string;
    hostel: string;
    library: string;
    assets: string;
    communication: string;
    reports: string;
    settings: string;
    // Navigation children
    allStudents: string;
    bulkImport: string;
    idCards: string;
    classesSections: string;
    subjects: string;
    timetable: string;
    studentTimetable: string;
    hifzProgress: string;
    examSetup: string;
    studentEnrollment: string;
    rollNumberAssignment: string;
    enrolledStudentsReports: string;
    paperGenerator: string;
    resultsEntry: string;
    omrScanning: string;
    reportCards: string;
    feeManagement: string;
    payments: string;
    donations: string;
    roomManagement: string;
    hostelAttendance: string;
    studentAssignment: string;
    announcements: string;
    messaging: string;
    events: string;
  };
  
  // Dashboard
  dashboard: {
    title: string;
    totalStudents: string;
    totalStaff: string;
    activeClasses: string;
    pendingFees: string;
    todayAttendance: string;
    upcomingExams: string;
    recentActivity: string;
    quickActions: string;
    addStudent: string;
    markAttendance: string;
    viewReports: string;
    manageClasses: string;
  };
  
  // Students
  students: {
    title: string;
    management: string;
    addStudent: string;
    studentProfile: string;
    personalInfo: string;
    guardianInfo: string;
    academicInfo: string;
    health: string;
    documents: string;
    name: string;
    fatherName: string;
    cnic: string;
    phone: string;
    email: string;
    address: string;
    admissionDate: string;
    class: string;
    section: string;
    rollNumber: string;
    status: string;
    active: string;
    inactive: string;
    graduated: string;
    transferred: string;
    suspended: string;
    searchPlaceholder: string;
    allClasses: string;
    allSections: string;
    allStatus: string;
    totalStudents: string;
    enrolledStudents: string;
    studentsList: string;
    results: string;
    student: string;
    admissionNo: string;
    rollNo: string;
    classSection: string;
    contact: string;
    hostel: string;
    actions: string;
    admitted: string;
    noClass: string;
    notAvailable: string;
    viewDetails: string;
    editStudent: string;
    deleteStudent: string;
    deleteConfirm: string;
    noStudentsFound: string;
    noStudentsMessage: string;
  };
  
  // Forms and validation
  forms: {
    required: string;
    invalidEmail: string;
    invalidPhone: string;
    invalidCnic: string;
    passwordMismatch: string;
    minLength: string;
    maxLength: string;
  };
}

// English translations
const en: TranslationKeys = {
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    close: 'Close',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    submit: 'Submit',
    reset: 'Reset',
  },
  nav: {
    dashboard: 'Dashboard',
    students: 'Students',
    admissions: 'Admissions',
    attendance: 'Attendance',
    classes: 'Classes',
    exams: 'Exams',
    finance: 'Finance',
    staff: 'Staff',
    hostel: 'Hostel',
    library: 'Library',
    assets: 'Assets',
    communication: 'Communication',
    reports: 'Reports',
    settings: 'Settings',
    // Navigation children
    allStudents: 'All Students',
    bulkImport: 'Bulk Import',
    idCards: 'ID Cards',
    classesSections: 'Classes & Sections',
    subjects: 'Subjects',
    timetable: 'Timetable',
    studentTimetable: 'Student Timetable',
    hifzProgress: 'Hifz Progress',
    examSetup: 'Exam Setup',
    studentEnrollment: 'Student Enrollment',
    rollNumberAssignment: 'Roll Number Assignment',
    enrolledStudentsReports: 'Enrolled Students Reports',
    paperGenerator: 'Paper Generator',
    resultsEntry: 'Results Entry',
    omrScanning: 'OMR Scanning',
    reportCards: 'Report Cards',
    feeManagement: 'Fee Management',
    payments: 'Payments',
    donations: 'Donations',
    roomManagement: 'Room Management',
    hostelAttendance: 'Hostel Attendance',
    studentAssignment: 'Student Assignment',
    announcements: 'Announcements',
    messaging: 'Messaging',
    events: 'Events',
  },
  dashboard: {
    title: 'Dashboard',
    totalStudents: 'Total Students',
    totalStaff: 'Total Staff',
    activeClasses: 'Active Classes',
    pendingFees: 'Pending Fees',
    todayAttendance: "Today's Attendance",
    upcomingExams: 'Upcoming Exams',
    recentActivity: 'Recent Activity',
    quickActions: 'Quick Actions',
    addStudent: 'Add Student',
    markAttendance: 'Mark Attendance',
    viewReports: 'View Reports',
    manageClasses: 'Manage Classes',
  },
  students: {
    title: 'Students',
    management: 'Students Management',
    addStudent: 'Add Student',
    studentProfile: 'Student Profile',
    personalInfo: 'Personal Information',
    guardianInfo: 'Guardian Information',
    academicInfo: 'Academic Information',
    health: 'Health Information',
    documents: 'Documents',
    name: 'Name',
    fatherName: "Father's Name",
    cnic: 'CNIC',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    admissionDate: 'Admission Date',
    class: 'Class',
    section: 'Section',
    rollNumber: 'Roll Number',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    graduated: 'Graduated',
    transferred: 'Transferred',
    suspended: 'Suspended',
    searchPlaceholder: 'Search students...',
    allClasses: 'All Classes',
    allSections: 'All Sections',
    allStatus: 'All Status',
    totalStudents: 'Total Students',
    enrolledStudents: 'Enrolled Students',
    studentsList: 'Students List',
    results: 'results',
    student: 'Student',
    admissionNo: 'Admission No.',
    rollNo: 'Roll No.',
    classSection: 'Class/Section',
    contact: 'Contact',
    hostel: 'Hostel',
    actions: 'Actions',
    admitted: 'Admitted',
    noClass: 'No Class',
    notAvailable: 'N/A',
    viewDetails: 'View Details',
    editStudent: 'Edit Student',
    deleteStudent: 'Delete',
    deleteConfirm: 'Are you sure you want to delete this student?',
    noStudentsFound: 'No students found',
    noStudentsMessage: 'Try adjusting your search criteria or add a new student.',
  },
  forms: {
    required: 'This field is required',
    invalidEmail: 'Please enter a valid email address',
    invalidPhone: 'Please enter a valid phone number',
    invalidCnic: 'Please enter a valid CNIC',
    passwordMismatch: 'Passwords do not match',
    minLength: 'Minimum length is {min} characters',
    maxLength: 'Maximum length is {max} characters',
  },
};

// Pashto translations
const ps: TranslationKeys = {
  common: {
    loading: 'بارول کیږي...',
    save: 'ساتل',
    cancel: 'منسوخ',
    delete: 'پاک کول',
    edit: 'تغیر',
    add: 'اضافه کول',
    search: 'لټون',
    filter: 'فلټر',
    export: 'صادرول',
    import: 'وارد کول',
    print: 'چاپ',
    close: 'بندول',
    confirm: 'تایید',
    yes: 'هو',
    no: 'نه',
    back: 'بیرته',
    next: 'بل',
    previous: 'مخکني',
    submit: 'وسپارل',
    reset: 'بیا ټاکل',
  },
  nav: {
    dashboard: 'کنټرول پینل',
    students: 'زده کوونکي',
    admissions: 'داخلې',
    attendance: 'حاضري',
    classes: 'ټولګۍ',
    exams: 'ازموینې',
    finance: 'مالي چارې',
    staff: 'کارکوونکي',
    hostel: 'خوابګاه',
    library: 'کتابتون',
    assets: 'املاکو',
    communication: 'اړیکې',
    reports: 'راپورونه',
    settings: 'ترتیبات',
    // Navigation children
    allStudents: 'ټول زده کوونکي',
    bulkImport: 'د لوی واردات',
    idCards: 'د پېژند کارتونه',
    classesSections: 'ټولګۍ او برخې',
    subjects: 'مضامین',
    timetable: 'د وخت جدول',
    studentTimetable: 'د زده کوونکي وخت جدول',
    hifzProgress: 'د حفظ پرمختګ',
    examSetup: 'د امتحان تنظیمات',
    studentEnrollment: 'د زده کوونکي نوم لیکنه',
    rollNumberAssignment: 'د رول شمیرو تخصیص',
    enrolledStudentsReports: 'د نوم لیکل شویو زده کوونکو راپورونه',
    paperGenerator: 'د کاغذ تولیدونکی',
    resultsEntry: 'د پایلو داخلول',
    omrScanning: 'OMR سکین',
    reportCards: 'د راپور کارتونه',
    feeManagement: 'د فیس مدیریت',
    payments: 'تادیات',
    donations: 'خیرات',
    roomManagement: 'د خونه مدیریت',
    hostelAttendance: 'د خوابګاه حاضري',
    studentAssignment: 'د زده کوونکي دنده',
    announcements: 'اعلانات',
    messaging: 'پیغامونه',
    events: 'پیښې',
  },
  dashboard: {
    title: 'کنټرول پینل',
    totalStudents: 'ټول زده کوونکي',
    totalStaff: 'ټول کارکوونکي',
    activeClasses: 'فعال ټولګۍ',
    pendingFees: 'پاتې فیسونه',
    todayAttendance: 'د نن حاضري',
    upcomingExams: 'راتلونکې ازموینې',
    recentActivity: 'وروستي فعالیت',
    quickActions: 'چټک کړنې',
    addStudent: 'زده کوونکی اضافه کړئ',
    markAttendance: 'حاضري نښه کړئ',
    viewReports: 'راپورونه وګورئ',
    manageClasses: 'ټولګۍ اداره کړئ',
  },
  students: {
    title: 'زده کوونکي',
    management: 'د زده کوونکو مدیریت',
    addStudent: 'زده کوونکی اضافه کول',
    studentProfile: 'د زده کوونکي پروفایل',
    personalInfo: 'شخصي معلومات',
    guardianInfo: 'د والدین معلومات',
    academicInfo: 'علمي معلومات',
    health: 'روغتیا معلومات',
    documents: 'اسناد',
    name: 'نوم',
    fatherName: 'د پلار نوم',
    cnic: 'شناختي کارت',
    phone: 'ټیلیفون',
    email: 'بریښنا لیک',
    address: 'پته',
    admissionDate: 'د داخلې نیټه',
    class: 'ټولګی',
    section: 'برخه',
    rollNumber: 'د رول شمیره',
    status: 'حالت',
    active: 'فعال',
    inactive: 'غیر فعال',
    graduated: 'فارغ',
    transferred: 'لېږدول شوی',
    suspended: 'تعلیق شوی',
    searchPlaceholder: 'زده کوونکي لټون...',
    allClasses: 'ټول ټولګۍ',
    allSections: 'ټول برخې',
    allStatus: 'ټول حالتونه',
    totalStudents: 'ټول زده کوونکي',
    enrolledStudents: 'داخل شوي زده کوونکي',
    studentsList: 'د زده کوونکو لیست',
    results: 'پایلې',
    student: 'زده کوونکی',
    admissionNo: 'د داخلې شمیره',
    rollNo: 'د رول شمیره',
    classSection: 'ټولګی/برخه',
    contact: 'اړیکه',
    hostel: 'خوابګاه',
    actions: 'کړنې',
    admitted: 'داخل شوی',
    noClass: 'ټولګی نشته',
    notAvailable: 'نشته',
    viewDetails: 'تفصیلات وګورئ',
    editStudent: 'زده کوونکی تغیر کړئ',
    deleteStudent: 'پاک کول',
    deleteConfirm: 'ایا تاسو ډاډه یاست چې تاسو غواړئ دا زده کوونکی پاک کړئ؟',
    noStudentsFound: 'زده کوونکي ونه موندل شول',
    noStudentsMessage: 'خپل لټون معیارونه تنظیم کړئ یا نوی زده کوونکی اضافه کړئ.',
  },
  forms: {
    required: 'دا برخه اړینه دی',
    invalidEmail: 'د بریښنا لیک سمه پته واردل',
    invalidPhone: 'د ټیلیفون سم شمیره واردل',
    invalidCnic: 'د شناختي کارت سمه شمیره واردل',
    passwordMismatch: 'پټې پاڼې سره سمون نه لري',
    minLength: 'لږترلږه اوږدوالی {min} حروف دی',
    maxLength: 'ډیرترډیره اوږدوالی {max} حروف دی',
  },
};

// Dari (Farsi) translations
const fa: TranslationKeys = {
  common: {
    loading: 'در حال بارگذاری...',
    save: 'ذخیره',
    cancel: 'لغو',
    delete: 'حذف',
    edit: 'ویرایش',
    add: 'افزودن',
    search: 'جستجو',
    filter: 'فیلتر',
    export: 'صدور',
    import: 'وارد کردن',
    print: 'چاپ',
    close: 'بستن',
    confirm: 'تایید',
    yes: 'بله',
    no: 'خیر',
    back: 'بازگشت',
    next: 'بعدی',
    previous: 'قبلی',
    submit: 'ارسال',
    reset: 'بازنشانی',
  },
  nav: {
    dashboard: 'داشبورد',
    students: 'دانش‌آموزان',
    admissions: 'پذیرش',
    attendance: 'حاضری',
    classes: 'کلاس‌ها',
    exams: 'امتحانات',
    finance: 'مالی',
    staff: 'کارکنان',
    hostel: 'خوابگاه',
    library: 'کتابخانه',
    assets: 'دارایی‌ها',
    communication: 'ارتباطات',
    reports: 'گزارش‌ها',
    settings: 'تنظیمات',
    // Navigation children
    allStudents: 'همه دانش‌آموزان',
    bulkImport: 'واردات انبوه',
    idCards: 'کارت‌های شناسایی',
    classesSections: 'کلاس‌ها و بخش‌ها',
    subjects: 'موضوعات',
    timetable: 'برنامه زمانی',
    studentTimetable: 'برنامه زمانی دانش‌آموز',
    hifzProgress: 'پیشرفت حفظ',
    examSetup: 'تنظیمات امتحان',
    studentEnrollment: 'ثبت‌نام دانش‌آموز',
    rollNumberAssignment: 'تخصیص شماره رول',
    enrolledStudentsReports: 'گزارش‌های دانش‌آموزان ثبت‌نام شده',
    paperGenerator: 'تولیدکننده کاغذ',
    resultsEntry: 'ورود نتایج',
    omrScanning: 'اسکن OMR',
    reportCards: 'کارت‌های گزارش',
    feeManagement: 'مدیریت هزینه',
    payments: 'پرداخت‌ها',
    donations: 'کمک‌های مالی',
    roomManagement: 'مدیریت اتاق',
    hostelAttendance: 'حضور خوابگاه',
    studentAssignment: 'تکلیف دانش‌آموز',
    announcements: 'اعلانات',
    messaging: 'پیام‌رسانی',
    events: 'رویدادها',
  },
  dashboard: {
    title: 'داشبورد',
    totalStudents: 'تعداد کل دانش‌آموزان',
    totalStaff: 'تعداد کل کارکنان',
    activeClasses: 'کلاس‌های فعال',
    pendingFees: 'هزینه‌های معوق',
    todayAttendance: 'حضور امروز',
    upcomingExams: 'امتحانات پیش رو',
    recentActivity: 'فعالیت‌های اخیر',
    quickActions: 'اقدامات سریع',
    addStudent: 'اضافه کردن دانش‌آموز',
    markAttendance: 'ثبت حضور',
    viewReports: 'مشاهده گزارش‌ها',
    manageClasses: 'مدیریت کلاس‌ها',
  },
  students: {
    title: 'دانش‌آموزان',
    management: 'مدیریت دانش‌آموزان',
    addStudent: 'اضافه کردن دانش‌آموز',
    studentProfile: 'پروفایل دانش‌آموز',
    personalInfo: 'اطلاعات شخصی',
    guardianInfo: 'اطلاعات سرپرست',
    academicInfo: 'اطلاعات تحصیلی',
    health: 'اطلاعات سلامت',
    documents: 'اسناد',
    name: 'نام',
    fatherName: 'نام پدر',
    cnic: 'شناسه',
    phone: 'تلفن',
    email: 'ایمیل',
    address: 'آدرس',
    admissionDate: 'تاریخ پذیرش',
    class: 'کلاس',
    section: 'بخش',
    rollNumber: 'شماره ثبت',
    status: 'وضعیت',
    active: 'فعال',
    inactive: 'غیرفعال',
    graduated: 'فارغ‌التحصیل',
    transferred: 'منتقل شده',
    suspended: 'تعلیق شده',
    searchPlaceholder: 'جستجوی دانش‌آموزان...',
    allClasses: 'همه کلاس‌ها',
    allSections: 'همه بخش‌ها',
    allStatus: 'همه وضعیت‌ها',
    totalStudents: 'تعداد کل دانش‌آموزان',
    enrolledStudents: 'دانش‌آموزان ثبت‌نام شده',
    studentsList: 'فهرست دانش‌آموزان',
    results: 'نتیجه',
    student: 'دانش‌آموز',
    admissionNo: 'شماره پذیرش',
    rollNo: 'شماره ثبت',
    classSection: 'کلاس/بخش',
    contact: 'تماس',
    hostel: 'خوابگاه',
    actions: 'اقدامات',
    admitted: 'پذیرش شده',
    noClass: 'بدون کلاس',
    notAvailable: 'موجود نیست',
    viewDetails: 'مشاهده جزئیات',
    editStudent: 'ویرایش دانش‌آموز',
    deleteStudent: 'حذف',
    deleteConfirm: 'آیا مطمئن هستید که می‌خواهید این دانش‌آموز را حذف کنید؟',
    noStudentsFound: 'دانش‌آموزی یافت نشد',
    noStudentsMessage: 'معیارهای جستجوی خود را تنظیم کنید یا دانش‌آموز جدیدی اضافه کنید.',
  },
  forms: {
    required: 'پر کردن این فیلد الزامی است',
    invalidEmail: 'لطفا ایمیل معتبر وارد کنید',
    invalidPhone: 'لطفا شماره تلفن معتبر وارد کنید',
    invalidCnic: 'لطفا شناسه معتبر وارد کنید',
    passwordMismatch: 'رمزها مطابقت ندارند',
    minLength: 'حداقل طول {min} کاراکتر است',
    maxLength: 'حداکثر طول {max} کاراکتر است',
  },
};

// Arabic translations  
const ar: TranslationKeys = {
  common: {
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    search: 'بحث',
    filter: 'تصفية',
    export: 'تصدير',
    import: 'استيراد',
    print: 'طباعة',
    close: 'إغلاق',
    confirm: 'تأكيد',
    yes: 'نعم',
    no: 'لا',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    submit: 'إرسال',
    reset: 'إعادة تعيين',
  },
  nav: {
    dashboard: 'لوحة التحكم',
    students: 'الطلاب',
    admissions: 'القبول',
    attendance: 'الحضور',
    classes: 'الفصول',
    exams: 'الامتحانات',
    finance: 'المالية',
    staff: 'الموظفون',
    hostel: 'السكن الداخلي',
    library: 'المكتبة',
    assets: 'الأصول',
    communication: 'التواصل',
    reports: 'التقارير',
    settings: 'الإعدادات',
    // Navigation children
    allStudents: 'جميع الطلاب',
    bulkImport: 'الاستيراد الجماعي',
    idCards: 'بطاقات الهوية',
    classesSections: 'الفصول والشعب',
    subjects: 'المواد',
    timetable: 'الجدول الزمني',
    studentTimetable: 'الجدول الزمني للطالب',
    hifzProgress: 'تقدم الحفظ',
    examSetup: 'إعداد الامتحان',
    studentEnrollment: 'تسجيل الطالب',
    rollNumberAssignment: 'تعيين رقم القيد',
    enrolledStudentsReports: 'تقارير الطلاب المسجلين',
    paperGenerator: 'مولد الأوراق',
    resultsEntry: 'إدخال النتائج',
    omrScanning: 'مسح OMR',
    reportCards: 'بطاقات التقرير',
    feeManagement: 'إدارة الرسوم',
    payments: 'المدفوعات',
    donations: 'التبرعات',
    roomManagement: 'إدارة الغرف',
    hostelAttendance: 'حضور السكن الداخلي',
    studentAssignment: 'مهمة الطالب',
    announcements: 'الإعلانات',
    messaging: 'الرسائل',
    events: 'الأحداث',
  },
  dashboard: {
    title: 'لوحة التحكم',
    totalStudents: 'إجمالي الطلاب',
    totalStaff: 'إجمالي الموظفين',
    activeClasses: 'الفصول النشطة',
    pendingFees: 'الرسوم المعلقة',
    todayAttendance: 'حضور اليوم',
    upcomingExams: 'الامتحانات القادمة',
    recentActivity: 'النشاط الأخير',
    quickActions: 'إجراءات سريعة',
    addStudent: 'إضافة طالب',
    markAttendance: 'تسجيل الحضور',
    viewReports: 'عرض التقارير',
    manageClasses: 'إدارة الفصول',
  },
  students: {
    title: 'الطلاب',
    management: 'إدارة الطلاب',
    addStudent: 'إضافة طالب',
    studentProfile: 'ملف الطالب',
    personalInfo: 'المعلومات الشخصية',
    guardianInfo: 'معلومات ولي الأمر',
    academicInfo: 'المعلومات الأكاديمية',
    health: 'المعلومات الصحية',
    documents: 'الوثائق',
    name: 'الاسم',
    fatherName: 'اسم الوالد',
    cnic: 'رقم الهوية',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    admissionDate: 'تاريخ القبول',
    class: 'الفصل',
    section: 'الشعبة',
    rollNumber: 'رقم القيد',
    status: 'الحالة',
    active: 'نشط',
    inactive: 'غير نشط',
    graduated: 'متخرج',
    transferred: 'منقول',
    suspended: 'معلق',
    searchPlaceholder: 'البحث عن الطلاب...',
    allClasses: 'جميع الفصول',
    allSections: 'جميع الشعب',
    allStatus: 'جميع الحالات',
    totalStudents: 'إجمالي الطلاب',
    enrolledStudents: 'الطلاب المسجلين',
    studentsList: 'قائمة الطلاب',
    results: 'نتائج',
    student: 'طالب',
    admissionNo: 'رقم القبول',
    rollNo: 'رقم القيد',
    classSection: 'الفصل/الشعبة',
    contact: 'اتصال',
    hostel: 'السكن الداخلي',
    actions: 'الإجراءات',
    admitted: 'مقبول',
    noClass: 'لا يوجد فصل',
    notAvailable: 'غير متاح',
    viewDetails: 'عرض التفاصيل',
    editStudent: 'تعديل الطالب',
    deleteStudent: 'حذف',
    deleteConfirm: 'هل أنت متأكد أنك تريد حذف هذا الطالب؟',
    noStudentsFound: 'لم يتم العثور على طلاب',
    noStudentsMessage: 'حاول تعديل معايير البحث أو إضافة طالب جديد.',
  },
  forms: {
    required: 'هذا الحقل مطلوب',
    invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صحيح',
    invalidPhone: 'يرجى إدخال رقم هاتف صحيح',
    invalidCnic: 'يرجى إدخال رقم هوية صحيح',
    passwordMismatch: 'كلمات المرور غير متطابقة',
    minLength: 'الحد الأدنى للطول هو {min} أحرف',
    maxLength: 'الحد الأقصى للطول هو {max} أحرف',
  },
};

// Translation dictionary
export const translations = { en, ps, fa, ar };

// RTL languages
export const RTL_LANGUAGES: Language[] = ['ar', 'ps', 'fa'];

// Get translation function
export function t(key: string, lang: Language = 'en', params?: Record<string, string | number>): string {
  // Always default to English if language is not available
  const safeLang = lang && translations[lang] ? lang : 'en';
  const keys = key.split('.');
  let value: unknown = translations[safeLang];
  
  // Try to get translation from requested language
  for (const k of keys) {
    if (typeof value === 'object' && value !== null && k in (value as Record<string, unknown>)) {
      value = (value as Record<string, unknown>)[k];
    } else {
      value = undefined;
      break;
    }
  }
  
  // If translation not found, try English fallback
  if (typeof value !== 'string' && safeLang !== 'en') {
    value = translations.en;
    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = undefined;
        break;
      }
    }
  }
  
  // If still not found, return a readable version of the key
  if (typeof value !== 'string') {
    // Return last part of key as fallback (e.g., "nav.dashboard" -> "Dashboard")
    const lastKey = keys[keys.length - 1];
    return lastKey.charAt(0).toUpperCase() + lastKey.slice(1).replace(/([A-Z])/g, ' $1').trim();
  }
  
  // Replace parameters
  if (params) {
    return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }
  
  return value;
}

// Check if language is RTL
export function isRTL(lang: Language): boolean {
  return RTL_LANGUAGES.includes(lang);
}

// Get text direction
export function getDirection(lang: Language): 'ltr' | 'rtl' {
  return isRTL(lang) ? 'rtl' : 'ltr';
}

// Get appropriate font class
export function getFontClass(lang: Language): string {
  switch (lang) {
    case 'ar':
    case 'ps':
    case 'fa':
      return 'font-arabic';
    default:
      return 'font-inter';
  }
}