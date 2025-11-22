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
    authentication: string;
    academicSettings: string;
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
  
  // Settings
  settings: {
    buildingsManagement: string;
    roomsManagement: string;
    buildingName: string;
    roomNumber: string;
    building: string;
    staff: string;
    warden: string;
    noStaffAssigned: string;
    addBuilding: string;
    editBuilding: string;
    addRoom: string;
    editRoom: string;
    buildingCreated: string;
    buildingUpdated: string;
    buildingDeleted: string;
    roomCreated: string;
    roomUpdated: string;
    roomDeleted: string;
  };
  
  // Academic Settings
  academic: {
    residencyTypes: {
      title: string;
      management: string;
      addResidencyType: string;
      editResidencyType: string;
      deleteResidencyType: string;
      name: string;
      code: string;
      description: string;
      isActive: string;
      active: string;
      inactive: string;
      searchPlaceholder: string;
      noResidencyTypesFound: string;
      noResidencyTypesMessage: string;
      residencyTypeCreated: string;
      residencyTypeUpdated: string;
      residencyTypeDeleted: string;
      deleteConfirm: string;
      nameRequired: string;
      codeRequired: string;
      codeMaxLength: string;
      nameMaxLength: string;
      codeExists: string;
      globalType: string;
      organizationType: string;
      cannotDeleteGlobal: string;
    };
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
    authentication: 'Authentication',
    academicSettings: 'Academic Settings',
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
  settings: {
    buildingsManagement: 'Buildings Management',
    roomsManagement: 'Rooms Management',
    buildingName: 'Building Name',
    roomNumber: 'Room Number',
    building: 'Building',
    staff: 'Staff',
    warden: 'Warden',
    noStaffAssigned: 'No staff assigned',
    addBuilding: 'Add Building',
    editBuilding: 'Edit Building',
    addRoom: 'Add Room',
    editRoom: 'Edit Room',
    buildingCreated: 'Building created successfully',
    buildingUpdated: 'Building updated successfully',
    buildingDeleted: 'Building deleted successfully',
    roomCreated: 'Room created successfully',
    roomUpdated: 'Room updated successfully',
    roomDeleted: 'Room deleted successfully',
  },
  academic: {
    residencyTypes: {
      title: 'Residency Types',
      management: 'Residency Types Management',
      addResidencyType: 'Add Residency Type',
      editResidencyType: 'Edit Residency Type',
      deleteResidencyType: 'Delete Residency Type',
      name: 'Name',
      code: 'Code',
      description: 'Description',
      isActive: 'Active Status',
      active: 'Active',
      inactive: 'Inactive',
      searchPlaceholder: 'Search residency types...',
      noResidencyTypesFound: 'No residency types found',
      noResidencyTypesMessage: 'Try adjusting your search criteria or add a new residency type.',
      residencyTypeCreated: 'Residency type created successfully',
      residencyTypeUpdated: 'Residency type updated successfully',
      residencyTypeDeleted: 'Residency type deleted successfully',
      deleteConfirm: 'Are you sure you want to delete this residency type?',
      nameRequired: 'Name is required',
      codeRequired: 'Code is required',
      codeMaxLength: 'Code must be 50 characters or less',
      nameMaxLength: 'Name must be 100 characters or less',
      codeExists: 'This code already exists for this organization',
      globalType: 'Global',
      organizationType: 'Organization',
      cannotDeleteGlobal: 'Cannot delete global residency types',
    },
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
    authentication: 'د تصدیق مدیریت',
    academicSettings: 'د علمي ترتیباتو',
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
  settings: {
    buildingsManagement: 'د تعمیرونو مدیریت',
    roomsManagement: 'د اطاقونو مدیریت',
    buildingName: 'د تعمیر نوم',
    roomNumber: 'د اطاق شمیره',
    building: 'تعمیر',
    staff: 'کارکوونکی',
    warden: 'مسؤل نګران',
    noStaffAssigned: 'هیڅ کارکوونکی وټاکل شوی نه دی',
    addBuilding: 'تعمیر اضافه کړئ',
    editBuilding: 'تعمیر تغیر کړئ',
    addRoom: 'اطاق اضافه کړئ',
    editRoom: 'اطاق تغیر کړئ',
    buildingCreated: 'تعمیر په بریالیتوب سره اضافه شو',
    buildingUpdated: 'تعمیر په بریالیتوب سره تغیر شو',
    buildingDeleted: 'تعمیر په بریالیتوب سره پاک شو',
    roomCreated: 'اطاق په بریالیتوب سره اضافه شو',
    roomUpdated: 'اطاق په بریالیتوب سره تغیر شو',
    roomDeleted: 'اطاق په بریالیتوب سره پاک شو',
  },
  academic: {
    residencyTypes: {
      title: 'د اوسیدو ډولونه',
      management: 'د اوسیدو ډولونو مدیریت',
      addResidencyType: 'د اوسیدو ډول اضافه کول',
      editResidencyType: 'د اوسیدو ډول تغیر کول',
      deleteResidencyType: 'د اوسیدو ډول پاک کول',
      name: 'نوم',
      code: 'کوډ',
      description: 'تفصیل',
      isActive: 'فعال حالت',
      active: 'فعال',
      inactive: 'غیر فعال',
      searchPlaceholder: 'د اوسیدو ډولونه لټون...',
      noResidencyTypesFound: 'د اوسیدو ډولونه ونه موندل شول',
      noResidencyTypesMessage: 'خپل لټون معیارونه تنظیم کړئ یا نوی د اوسیدو ډول اضافه کړئ.',
      residencyTypeCreated: 'د اوسیدو ډول په بریالیتوب سره اضافه شو',
      residencyTypeUpdated: 'د اوسیدو ډول په بریالیتوب سره تغیر شو',
      residencyTypeDeleted: 'د اوسیدو ډول په بریالیتوب سره پاک شو',
      deleteConfirm: 'ایا تاسو ډاډه یاست چې تاسو غواړئ دا د اوسیدو ډول پاک کړئ؟',
      nameRequired: 'نوم اړینه دی',
      codeRequired: 'کوډ اړینه دی',
      codeMaxLength: 'کوډ باید 50 حروف یا لږ وي',
      nameMaxLength: 'نوم باید 100 حروف یا لږ وي',
      codeExists: 'دا کوډ د دې سازمان لپاره شتون لري',
      globalType: 'نړیوال',
      organizationType: 'سازمان',
      cannotDeleteGlobal: 'نړیوال د اوسیدو ډولونه پاک کیدی نشي',
    },
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
    authentication: 'مدیریت احراز هویت',
    academicSettings: 'تنظیمات آکادمیک',
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
  settings: {
    buildingsManagement: 'مدیریت ساختمان‌ها',
    roomsManagement: 'مدیریت اتاق‌ها',
    buildingName: 'نام ساختمان',
    roomNumber: 'شماره اتاق',
    building: 'ساختمان',
    staff: 'کارکنان',
    warden: 'مسئول نگهبان',
    noStaffAssigned: 'هیچ کارکنی اختصاص داده نشده',
    addBuilding: 'افزودن ساختمان',
    editBuilding: 'ویرایش ساختمان',
    addRoom: 'افزودن اتاق',
    editRoom: 'ویرایش اتاق',
    buildingCreated: 'ساختمان با موفقیت ایجاد شد',
    buildingUpdated: 'ساختمان با موفقیت به‌روزرسانی شد',
    buildingDeleted: 'ساختمان با موفقیت حذف شد',
    roomCreated: 'اتاق با موفقیت ایجاد شد',
    roomUpdated: 'اتاق با موفقیت به‌روزرسانی شد',
    roomDeleted: 'اتاق با موفقیت حذف شد',
  },
  academic: {
    residencyTypes: {
      title: 'انواع اقامت',
      management: 'مدیریت انواع اقامت',
      addResidencyType: 'افزودن نوع اقامت',
      editResidencyType: 'ویرایش نوع اقامت',
      deleteResidencyType: 'حذف نوع اقامت',
      name: 'نام',
      code: 'کد',
      description: 'توضیحات',
      isActive: 'وضعیت فعال',
      active: 'فعال',
      inactive: 'غیرفعال',
      searchPlaceholder: 'جستجوی انواع اقامت...',
      noResidencyTypesFound: 'نوع اقامتی یافت نشد',
      noResidencyTypesMessage: 'معیارهای جستجوی خود را تنظیم کنید یا نوع اقامت جدیدی اضافه کنید.',
      residencyTypeCreated: 'نوع اقامت با موفقیت ایجاد شد',
      residencyTypeUpdated: 'نوع اقامت با موفقیت به‌روزرسانی شد',
      residencyTypeDeleted: 'نوع اقامت با موفقیت حذف شد',
      deleteConfirm: 'آیا مطمئن هستید که می‌خواهید این نوع اقامت را حذف کنید؟',
      nameRequired: 'نام الزامی است',
      codeRequired: 'کد الزامی است',
      codeMaxLength: 'کد باید حداکثر 50 کاراکتر باشد',
      nameMaxLength: 'نام باید حداکثر 100 کاراکتر باشد',
      codeExists: 'این کد برای این سازمان قبلاً وجود دارد',
      globalType: 'جهانی',
      organizationType: 'سازمان',
      cannotDeleteGlobal: 'نمی‌توان انواع اقامت جهانی را حذف کرد',
    },
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
    authentication: 'إدارة المصادقة',
    academicSettings: 'الإعدادات الأكاديمية',
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
  settings: {
    buildingsManagement: 'إدارة المباني',
    roomsManagement: 'إدارة الغرف',
    buildingName: 'اسم المبنى',
    roomNumber: 'رقم الغرفة',
    building: 'المبنى',
    staff: 'الموظفون',
    warden: 'المسؤول',
    noStaffAssigned: 'لم يتم تعيين موظف',
    addBuilding: 'إضافة مبنى',
    editBuilding: 'تعديل المبنى',
    addRoom: 'إضافة غرفة',
    editRoom: 'تعديل الغرفة',
    buildingCreated: 'تم إنشاء المبنى بنجاح',
    buildingUpdated: 'تم تحديث المبنى بنجاح',
    buildingDeleted: 'تم حذف المبنى بنجاح',
    roomCreated: 'تم إنشاء الغرفة بنجاح',
    roomUpdated: 'تم تحديث الغرفة بنجاح',
    roomDeleted: 'تم حذف الغرفة بنجاح',
  },
  academic: {
    residencyTypes: {
      title: 'أنواع الإقامة',
      management: 'إدارة أنواع الإقامة',
      addResidencyType: 'إضافة نوع إقامة',
      editResidencyType: 'تعديل نوع الإقامة',
      deleteResidencyType: 'حذف نوع الإقامة',
      name: 'الاسم',
      code: 'الكود',
      description: 'الوصف',
      isActive: 'الحالة النشطة',
      active: 'نشط',
      inactive: 'غير نشط',
      searchPlaceholder: 'البحث عن أنواع الإقامة...',
      noResidencyTypesFound: 'لم يتم العثور على أنواع إقامة',
      noResidencyTypesMessage: 'حاول تعديل معايير البحث أو إضافة نوع إقامة جديد.',
      residencyTypeCreated: 'تم إنشاء نوع الإقامة بنجاح',
      residencyTypeUpdated: 'تم تحديث نوع الإقامة بنجاح',
      residencyTypeDeleted: 'تم حذف نوع الإقامة بنجاح',
      deleteConfirm: 'هل أنت متأكد أنك تريد حذف نوع الإقامة هذا؟',
      nameRequired: 'الاسم مطلوب',
      codeRequired: 'الكود مطلوب',
      codeMaxLength: 'يجب أن يكون الكود 50 حرفًا أو أقل',
      nameMaxLength: 'يجب أن يكون الاسم 100 حرف أو أقل',
      codeExists: 'هذا الكود موجود بالفعل لهذه المنظمة',
      globalType: 'عالمي',
      organizationType: 'المنظمة',
      cannotDeleteGlobal: 'لا يمكن حذف أنواع الإقامة العالمية',
    },
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