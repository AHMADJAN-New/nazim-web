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
      actions: string;
  };
  
  // Navigation
    nav: {
    dashboard: string;
    students: string;
    admissions: string;
    attendance: string;
    classes: string;
      subjects: string;
      subjectAssignments: string;
      timetable: string;
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
      classes: {
        title: string;
        management: string;
        addClass: string;
        editClass: string;
        deleteClass: string;
        deleteConfirm: string;
        className: string;
        code: string;
        gradeLevel: string;
        section: string;
        description: string;
        homeroomTeacher: string;
        selectHomeroomTeacher: string;
        noHomeroomTeacher: string;
        teachers: string;
        noTeachersAssigned: string;
        noClassesFound: string;
      };
      subjects: {
        title: string;
        management: string;
        addSubject: string;
        editSubject: string;
        deleteSubject: string;
        deleteConfirm: string;
        subjectName: string;
        code: string;
        gradeLevel: string;
        creditHours: string;
        description: string;
        color: string;
        isCore: string;
        core: string;
        elective: string;
        coreDescription: string;
        assignedTeachers: string;
        noTeachersAssigned: string;
        noSubjectsFound: string;
      };
      assignments: {
        title: string;
        management: string;
        addAssignment: string;
        editAssignment: string;
        deleteAssignment: string;
        deleteConfirm: string;
        class: string;
        subject: string;
        teacher: string;
        schedule: string;
        notes: string;
        filters: string;
        filterClassPlaceholder: string;
        filterSubjectPlaceholder: string;
        allClasses: string;
        allSubjects: string;
        selectClass: string;
        selectSubject: string;
        selectTeacher: string;
        assignButton: string;
        noAssignmentsFound: string;
        unassigned: string;
      };
      periods: {
        title: string;
        name: string;
        day: string;
        start: string;
        end: string;
        timeRange: string;
        sortOrder: string;
        maxParallel: string;
        meta: string;
        isBreak: string;
        break: string;
      };
      timetable: {
        title: string;
        description: string;
        selectClass: string;
        allClasses: string;
        selectOrganizationPrompt: string;
        generateButton: string;
        generating: string;
        preferencesTitle: string;
        selectTeacher: string;
        noTeacherSelected: string;
        selectTeacherFirst: string;
        preferred: string;
        available: string;
        unavailable: string;
        gridTitle: string;
        gridSubtitle: string;
        refresh: string;
        class: string;
        subject: string;
        teacher: string;
        lock: string;
        unlock: string;
        unknownTeacher: string;
        days: {
          monday: string;
          tuesday: string;
          wednesday: string;
          thursday: string;
          friday: string;
          saturday: string;
          sunday: string;
        };
        generateSummary?: string;
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
      actions: 'Actions',
  },
  nav: {
    dashboard: 'Dashboard',
    students: 'Students',
    admissions: 'Admissions',
    attendance: 'Attendance',
    classes: 'Classes',
    subjects: 'Subjects',
    subjectAssignments: 'Subject Assignments',
      timetable: 'Timetable',
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
      classes: {
        title: 'Classes',
        management: 'Classes Management',
        addClass: 'Add Class',
        editClass: 'Edit Class',
        deleteClass: 'Delete Class',
        deleteConfirm: 'Are you sure you want to delete this class?',
        className: 'Class Name',
        code: 'Code',
        gradeLevel: 'Grade Level',
        section: 'Section',
        description: 'Description',
        homeroomTeacher: 'Homeroom Teacher',
        selectHomeroomTeacher: 'Select homeroom teacher',
        noHomeroomTeacher: 'No homeroom teacher',
        teachers: 'Subject Teachers',
        noTeachersAssigned: 'No teachers assigned yet',
        noClassesFound: 'No classes found',
      },
      subjects: {
        title: 'Subjects',
        management: 'Subjects Management',
        addSubject: 'Add Subject',
        editSubject: 'Edit Subject',
        deleteSubject: 'Delete Subject',
        deleteConfirm: 'Are you sure you want to delete this subject?',
        subjectName: 'Subject Name',
        code: 'Code',
        gradeLevel: 'Grade Level',
        creditHours: 'Credit Hours',
        description: 'Description',
        color: 'Color',
        isCore: 'Core Subject',
        core: 'Core',
        elective: 'Elective',
        coreDescription: 'Mark as core to highlight mandatory curriculum subjects.',
        assignedTeachers: 'Assigned Teachers',
        noTeachersAssigned: 'No teachers assigned yet',
        noSubjectsFound: 'No subjects found',
      },
      assignments: {
        title: 'Subject Assignments',
        management: 'Assign subjects to teachers across classes',
        addAssignment: 'Assign Subject',
        editAssignment: 'Reassign Subject',
        deleteAssignment: 'Remove Assignment',
        deleteConfirm: 'Are you sure you want to remove this assignment?',
        class: 'Class',
        subject: 'Subject',
        teacher: 'Teacher',
        schedule: 'Schedule Slot',
        notes: 'Notes',
        filters: 'Filters',
        filterClassPlaceholder: 'Filter by class',
        filterSubjectPlaceholder: 'Filter by subject',
        allClasses: 'All Classes',
        allSubjects: 'All Subjects',
        selectClass: 'Select class',
        selectSubject: 'Select subject',
        selectTeacher: 'Select teacher',
        assignButton: 'Assign Subject',
        noAssignmentsFound: 'No assignments found',
        unassigned: 'Unassigned',
      },
      periods: {
        title: 'Teaching Periods',
        name: 'Name',
        day: 'Day',
        start: 'Start Time',
        end: 'End Time',
        timeRange: 'Time Range',
        sortOrder: 'Sort Order',
        maxParallel: 'Max Parallel Classes',
        meta: 'Details',
        isBreak: 'Mark as break period',
        break: 'Break',
      },
      timetable: {
        title: 'Smart Timetable',
        description: 'Generate conflict-free schedules that respect teacher availability.',
        selectClass: 'Filter by class',
        allClasses: 'All classes',
        selectOrganizationPrompt: 'Select an organization to manage timetables.',
        generateButton: 'Generate timetable',
        generating: 'Generating...',
        preferencesTitle: 'Teacher preferences',
        selectTeacher: 'Select a teacher',
        noTeacherSelected: 'No teacher selected',
        selectTeacherFirst: 'Select a teacher to manage preferences',
        preferred: 'Preferred',
        available: 'Available',
        unavailable: 'Blocked',
        gridTitle: 'Timetable grid',
        gridSubtitle: 'Lock important sessions or remove conflicts inline.',
        refresh: 'Refresh',
        class: 'Class',
        subject: 'Subject',
        teacher: 'Teacher',
        lock: 'Lock',
        unlock: 'Unlock',
        unknownTeacher: 'Unknown teacher',
        days: {
          monday: 'Monday',
          tuesday: 'Tuesday',
          wednesday: 'Wednesday',
          thursday: 'Thursday',
          friday: 'Friday',
          saturday: 'Saturday',
          sunday: 'Sunday',
        },
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
      actions: 'عملونه',
  },
    nav: {
    dashboard: 'کنټرول پینل',
    students: 'زده کوونکي',
    admissions: 'داخلې',
    attendance: 'حاضري',
    classes: 'ټولګۍ',
      subjects: 'مضامین',
      subjectAssignments: 'د مضمونونو سپارښتنه',
      timetable: 'مهالوېش',
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
      classes: {
        title: 'ټولګۍ',
        management: 'د ټولګیو مدیریت',
        addClass: 'ټولګی اضافه کړئ',
        editClass: 'ټولګی سم کړئ',
        deleteClass: 'ټولګی پاک کړئ',
        deleteConfirm: 'ایا ډاډه یاست چې دا ټولګی پاک کړئ؟',
        className: 'د ټولګی نوم',
        code: 'کوډ',
        gradeLevel: 'صنف',
        section: 'څانګه',
        description: 'تفصیل',
        homeroomTeacher: 'د ټولګی استاد',
        selectHomeroomTeacher: 'استاد وټاکئ',
        noHomeroomTeacher: 'هیڅ استاد نشته',
        teachers: 'د مضمون استادان',
        noTeachersAssigned: 'هیڅ استاد نه دی ټاکل شوی',
        noClassesFound: 'هیڅ ټولګی ونه موندل شو',
      },
      subjects: {
        title: 'مضامین',
        management: 'د مضامینو مدیریت',
        addSubject: 'مضمون اضافه کړئ',
        editSubject: 'مضمون سم کړئ',
        deleteSubject: 'مضمون پاک کړئ',
        deleteConfirm: 'ایا ډاډه یاست چې دا مضمون پاک کړئ؟',
        subjectName: 'د مضمون نوم',
        code: 'کوډ',
        gradeLevel: 'صنف',
        creditHours: 'کریدت ساعته',
        description: 'تفصیل',
        color: 'رنګ',
        isCore: 'اصلي مضمون',
        core: 'اصلي',
        elective: 'انتخابي',
        coreDescription: 'اصلي نښه د لازمي نصاب لپاره وکاروئ.',
        assignedTeachers: 'ټاکل شوي استادان',
        noTeachersAssigned: 'هیڅ استاد نه دی ټاکل شوی',
        noSubjectsFound: 'هیڅ مضمون ونه موندل شو',
      },
      assignments: {
        title: 'د مضمونونو سپارښتنه',
        management: 'مضامین استادانو ته وویشئ',
        addAssignment: 'مضمون وټاکئ',
        editAssignment: 'مضمون بیا وټاکئ',
        deleteAssignment: 'سپارښتنه پاک کړئ',
        deleteConfirm: 'ایا ډاډه یاست چې دا سپارښتنه لرې کړئ؟',
        class: 'ټولګی',
        subject: 'مضمون',
        teacher: 'استاد',
        schedule: 'مهالوېش',
        notes: 'یادښت',
        filters: 'فلټرونه',
        filterClassPlaceholder: 'ټولګی وټاکئ',
        filterSubjectPlaceholder: 'مضمون وټاکئ',
        allClasses: 'ټول ټولګۍ',
        allSubjects: 'ټول مضامین',
        selectClass: 'ټولګی انتخاب کړئ',
        selectSubject: 'مضمون انتخاب کړئ',
        selectTeacher: 'استاد انتخاب کړئ',
        assignButton: 'مضمون ټاکل',
        noAssignmentsFound: 'هیڅ سپارښتنه ونه موندل شوه',
        unassigned: 'نه دی ټاکل شوی',
      },
      periods: {
        title: 'د تدریس دورې',
        name: 'نوم',
        day: 'ورځ',
        start: 'پیل وخت',
        end: 'پای وخت',
        timeRange: 'د وخت لړ',
        sortOrder: 'د ترتیب شمېره',
        maxParallel: 'اعظمي موازي ټولګي',
        meta: 'جزیات',
        isBreak: 'د وقفې په توګه نښه کړئ',
        break: 'وقـفه',
      },
      timetable: {
        title: 'هوښیار مهالوېش',
        description: 'د استادانو د شتون په پام کې نیولو سره بې ټکره مهال وېش جوړ کړئ.',
        selectClass: 'ټولګی وټاکئ',
        allClasses: 'ټول ټولګۍ',
        selectOrganizationPrompt: 'د مهالوېش د مدیریت لپاره سازمان وټاکئ.',
        generateButton: 'مهالوېش تولید کړئ',
        generating: 'جوړېږي...',
        preferencesTitle: 'د استاد خوښې',
        selectTeacher: 'استاد وټاکئ',
        noTeacherSelected: 'هیڅ استاد نه دی ټاکل شوی',
        selectTeacherFirst: 'د خوښې تنظیمولو لپاره استاد وټاکئ',
        preferred: 'خوښ',
        available: 'شته',
        unavailable: 'نه شته',
        gridTitle: 'د مهالوېش جدول',
        gridSubtitle: 'مهم دورې قفل کړئ یا ټکرونه سم کړئ.',
        refresh: 'تازه کول',
        class: 'ټولګی',
        subject: 'مضمون',
        teacher: 'استاد',
        lock: 'قفل',
        unlock: 'خلاص کړئ',
        unknownTeacher: 'نامعلوم استاد',
        days: {
          monday: 'دوشنبه',
          tuesday: 'سه شنبه',
          wednesday: 'چهارشنبه',
          thursday: 'پنجشنبه',
          friday: 'جمعه',
          saturday: 'شنبه',
          sunday: 'یکشنبه',
        },
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
      actions: 'اقدامات',
  },
    nav: {
    dashboard: 'داشبورد',
    students: 'دانش‌آموزان',
    admissions: 'پذیرش',
    attendance: 'حاضری',
    classes: 'کلاس‌ها',
      subjects: 'مضامین',
      subjectAssignments: 'تخصیص مضامین',
      timetable: 'برنامه زمانی',
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
      classes: {
        title: 'کلاس‌ها',
        management: 'مدیریت کلاس‌ها',
        addClass: 'افزودن کلاس',
        editClass: 'ویرایش کلاس',
        deleteClass: 'حذف کلاس',
        deleteConfirm: 'آیا از حذف این کلاس مطمئن هستید؟',
        className: 'نام کلاس',
        code: 'کد',
        gradeLevel: 'پایه',
        section: 'بخش',
        description: 'توضیحات',
        homeroomTeacher: 'معلم مسوول',
        selectHomeroomTeacher: 'انتخاب معلم مسوول',
        noHomeroomTeacher: 'معلم مشخص نشده',
        teachers: 'معلمان مضامین',
        noTeachersAssigned: 'هیچ معلمی تعیین نشده است',
        noClassesFound: 'کلاسی یافت نشد',
      },
      subjects: {
        title: 'مضامین',
        management: 'مدیریت مضامین',
        addSubject: 'افزودن مضمون',
        editSubject: 'ویرایش مضمون',
        deleteSubject: 'حذف مضمون',
        deleteConfirm: 'آیا از حذف این مضمون مطمئن هستید؟',
        subjectName: 'نام مضمون',
        code: 'کد',
        gradeLevel: 'پایه',
        creditHours: 'ساعات درسی',
        description: 'توضیحات',
        color: 'رنگ',
        isCore: 'مضمون اساسی',
        core: 'اساسی',
        elective: 'انتخابی',
        coreDescription: 'برای مشخص کردن مضامین اجباری این گزینه را فعال کنید.',
        assignedTeachers: 'معلمان تعیین شده',
        noTeachersAssigned: 'هیچ معلمی تعیین نشده است',
        noSubjectsFound: 'مضامینی یافت نشد',
      },
      assignments: {
        title: 'تخصیص مضامین',
        management: 'توزیع مضامین بین معلمان و کلاس‌ها',
        addAssignment: 'تخصیص مضمون',
        editAssignment: 'تغییر تخصیص',
        deleteAssignment: 'حذف تخصیص',
        deleteConfirm: 'آیا از حذف این تخصیص مطمئن هستید؟',
        class: 'کلاس',
        subject: 'مضمون',
        teacher: 'معلم',
        schedule: 'برنامه زمانی',
        notes: 'یادداشت‌ها',
        filters: 'فیلترها',
        filterClassPlaceholder: 'فیلتر بر اساس کلاس',
        filterSubjectPlaceholder: 'فیلتر بر اساس مضمون',
        allClasses: 'تمام کلاس‌ها',
        allSubjects: 'تمام مضامین',
        selectClass: 'انتخاب کلاس',
        selectSubject: 'انتخاب مضمون',
        selectTeacher: 'انتخاب معلم',
        assignButton: 'تخصیص مضمون',
        noAssignmentsFound: 'هیچ تخصیصی یافت نشد',
        unassigned: 'تعیین نشده',
      },
      periods: {
        title: 'دوره‌های تدریس',
        name: 'نام',
        day: 'روز',
        start: 'زمان شروع',
        end: 'زمان پایان',
        timeRange: 'بازه زمانی',
        sortOrder: 'ترتیب',
        maxParallel: 'حداکثر کلاس همزمان',
        meta: 'جزئیات',
        isBreak: 'علامت به عنوان استراحت',
        break: 'استراحت',
      },
      timetable: {
        title: 'برنامه‌ریز هوشمند',
        description: 'بدون تداخل، با رعایت ترجیحات استادان، برنامه هفتگی بسازید.',
        selectClass: 'فیلتر بر اساس کلاس',
        allClasses: 'همه کلاس‌ها',
        selectOrganizationPrompt: 'برای مدیریت برنامه زمانی، سازمانی را انتخاب کنید.',
        generateButton: 'تولید برنامه',
        generating: 'در حال تولید...',
        preferencesTitle: 'ترجیحات استاد',
        selectTeacher: 'انتخاب استاد',
        noTeacherSelected: 'استادی انتخاب نشده است',
        selectTeacherFirst: 'برای مدیریت ترجیحات ابتدا استاد را انتخاب کنید',
        preferred: 'مطلوب',
        available: 'موجود',
        unavailable: 'ناموجود',
        gridTitle: 'شبکه برنامه',
        gridSubtitle: 'جلسات مهم را قفل کرده یا تداخل‌ها را اصلاح کنید.',
        refresh: 'تازه‌سازی',
        class: 'کلاس',
        subject: 'مضمون',
        teacher: 'استاد',
        lock: 'قفل',
        unlock: 'باز کردن',
        unknownTeacher: 'استاد نامشخص',
        days: {
          monday: 'دوشنبه',
          tuesday: 'سه‌شنبه',
          wednesday: 'چهارشنبه',
          thursday: 'پنج‌شنبه',
          friday: 'جمعه',
          saturday: 'شنبه',
          sunday: 'یک‌شنبه',
        },
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
      actions: 'إجراءات',
  },
    nav: {
      dashboard: 'لوحة التحكم',
      students: 'الطلاب',
      admissions: 'القبول',
      attendance: 'الحضور',
      classes: 'الفصول',
      subjects: 'المواد',
      subjectAssignments: 'تعيين المواد',
      timetable: 'الجدول الدراسي',
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
      classes: {
        title: 'الفصول',
        management: 'إدارة الفصول',
        addClass: 'إضافة فصل',
        editClass: 'تعديل الفصل',
        deleteClass: 'حذف الفصل',
        deleteConfirm: 'هل أنت متأكد من حذف هذا الفصل؟',
        className: 'اسم الفصل',
        code: 'الرمز',
        gradeLevel: 'المرحلة',
        section: 'الشعبة',
        description: 'الوصف',
        homeroomTeacher: 'معلم الفصل',
        selectHomeroomTeacher: 'اختر معلم الفصل',
        noHomeroomTeacher: 'لم يتم تعيين معلم',
        teachers: 'معلمو المواد',
        noTeachersAssigned: 'لا يوجد معلمون معينون',
        noClassesFound: 'لا توجد فصول',
      },
      subjects: {
        title: 'المواد',
        management: 'إدارة المواد',
        addSubject: 'إضافة مادة',
        editSubject: 'تعديل المادة',
        deleteSubject: 'حذف المادة',
        deleteConfirm: 'هل أنت متأكد من حذف هذه المادة؟',
        subjectName: 'اسم المادة',
        code: 'الرمز',
        gradeLevel: 'المرحلة',
        creditHours: 'عدد الساعات',
        description: 'الوصف',
        color: 'اللون',
        isCore: 'مادة أساسية',
        core: 'أساسية',
        elective: 'اختيارية',
        coreDescription: 'حدد هذا الخيار لتمييز المواد الإجبارية.',
        assignedTeachers: 'المعلمون المعينون',
        noTeachersAssigned: 'لا يوجد معلمون معينون',
        noSubjectsFound: 'لا توجد مواد',
      },
      assignments: {
        title: 'تعيين المواد',
        management: 'توزيع المواد على المعلمين والفصول',
        addAssignment: 'تعيين مادة',
        editAssignment: 'تعديل التعيين',
        deleteAssignment: 'إزالة التعيين',
        deleteConfirm: 'هل أنت متأكد من إزالة هذا التعيين؟',
        class: 'الفصل',
        subject: 'المادة',
        teacher: 'المعلم',
        schedule: 'الجدول الزمني',
        notes: 'ملاحظات',
        filters: 'عوامل التصفية',
        filterClassPlaceholder: 'تصفية حسب الفصل',
        filterSubjectPlaceholder: 'تصفية حسب المادة',
        allClasses: 'جميع الفصول',
        allSubjects: 'جميع المواد',
        selectClass: 'اختر الفصل',
        selectSubject: 'اختر المادة',
        selectTeacher: 'اختر المعلم',
        assignButton: 'تعيين المادة',
        noAssignmentsFound: 'لا توجد تعيينات',
        unassigned: 'غير معيّن',
      },
      periods: {
        title: 'حصص التدريس',
        name: 'الاسم',
        day: 'اليوم',
        start: 'وقت البدء',
        end: 'وقت الانتهاء',
        timeRange: 'الفترة الزمنية',
        sortOrder: 'ترتيب العرض',
        maxParallel: 'أقصى عدد فصول متزامنة',
        meta: 'تفاصيل',
        isBreak: 'تحديد كفترة استراحة',
        break: 'استراحة',
      },
      timetable: {
        title: 'الجدول الذكي',
        description: 'أنشئ جدولاً خالياً من التعارضات مع مراعاة تفضيلات المعلمين.',
        selectClass: 'تصفية حسب الفصل',
        allClasses: 'جميع الفصول',
        selectOrganizationPrompt: 'يرجى اختيار منظمة لإدارة الجداول الدراسية.',
        generateButton: 'توليد الجدول',
        generating: 'جارٍ التوليد...',
        preferencesTitle: 'تفضيلات المعلمين',
        selectTeacher: 'اختر المعلم',
        noTeacherSelected: 'لم يتم اختيار معلم',
        selectTeacherFirst: 'اختر معلمًا لإدارة تفضيلاته',
        preferred: 'مفضل',
        available: 'متاح',
        unavailable: 'غير متاح',
        gridTitle: 'عرض الجدول',
        gridSubtitle: 'يمكنك قفل الحصص المهمة أو تعديل التعارضات مباشرة.',
        refresh: 'تحديث',
        class: 'الفصل',
        subject: 'المادة',
        teacher: 'المعلم',
        lock: 'قفل',
        unlock: 'فتح',
        unknownTeacher: 'معلم غير معروف',
        days: {
          monday: 'الاثنين',
          tuesday: 'الثلاثاء',
          wednesday: 'الأربعاء',
          thursday: 'الخميس',
          friday: 'الجمعة',
          saturday: 'السبت',
          sunday: 'الأحد',
        },
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