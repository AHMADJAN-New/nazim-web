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
    academicYears: {
      title: string;
      management: string;
      addAcademicYear: string;
      editAcademicYear: string;
      deleteAcademicYear: string;
      name: string;
      startDate: string;
      endDate: string;
      description: string;
      status: string;
      isCurrent: string;
      current: string;
      setAsCurrent: string;
      active: string;
      archived: string;
      planned: string;
      searchPlaceholder: string;
      noAcademicYearsFound: string;
      noAcademicYearsMessage: string;
      academicYearCreated: string;
      academicYearUpdated: string;
      academicYearDeleted: string;
      academicYearSetAsCurrent: string;
      deleteConfirm: string;
      nameRequired: string;
      startDateRequired: string;
      endDateRequired: string;
      nameMaxLength: string;
      dateRangeError: string;
      nameExists: string;
      cannotDeleteCurrent: string;
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
      assignToYear: string;
      copyBetweenYears: string;
      name: string;
      code: string;
      gradeLevel: string;
      description: string;
      defaultCapacity: string;
      capacity: string;
      isActive: string;
      active: string;
      inactive: string;
      section: string;
      sectionName: string;
      teacher: string;
      room: string;
      studentCount: string;
      notes: string;
      searchPlaceholder: string;
      noClassesFound: string;
      noClassesMessage: string;
      classCreated: string;
      classUpdated: string;
      classDeleted: string;
      classAssigned: string;
      classInstanceUpdated: string;
      classRemoved: string;
      classesCopied: string;
      deleteConfirm: string;
      removeConfirm: string;
      nameRequired: string;
      codeRequired: string;
      nameMaxLength: string;
      codeMaxLength: string;
      codeExists: string;
      cannotDeleteInUse: string;
      cannotRemoveWithStudents: string;
      selectAcademicYear: string;
      selectClass: string;
      selectTeacher: string;
      selectRoom: string;
      fromYear: string;
      toYear: string;
      selectClasses: string;
      copyAssignments: string;
      allSections: string;
      baseClasses: string;
      yearClasses: string;
      copyClasses: string;
      history: string;
      viewHistory: string;
      bulkCreateSections: string;
      createSections: string;
      defaultTeacher: string;
      defaultRoom: string;
      sectionsInput: string;
      noSections: string;
      globalType: string;
      organizationType: string;
      cannotDeleteGlobal: string;
    };
    subjects: {
      title: string;
      management: string;
      addSubject: string;
      editSubject: string;
      deleteSubject: string;
      assignToClass: string;
      copyBetweenYears: string;
      name: string;
      code: string;
      gradeLevel: string;
      description: string;
      isActive: string;
      active: string;
      inactive: string;
      teacher: string;
      room: string;
      weeklyHours: string;
      notes: string;
      searchPlaceholder: string;
      noSubjectsFound: string;
      noSubjectsMessage: string;
      subjectCreated: string;
      subjectUpdated: string;
      subjectDeleted: string;
      subjectAssigned: string;
      subjectAssignmentUpdated: string;
      subjectRemoved: string;
      subjectsCopied: string;
      deleteConfirm: string;
      removeConfirm: string;
      nameRequired: string;
      codeRequired: string;
      nameMaxLength: string;
      codeMaxLength: string;
      codeExists: string;
      cannotDeleteInUse: string;
      selectAcademicYear: string;
      selectClass: string;
      selectSubject: string;
      selectSubjects: string;
      fromYear: string;
      toYear: string;
      copyAssignments: string;
      baseSubjects: string;
      classSubjects: string;
      assignSubjects: string;
      bulkAssignSubjects: string;
      weeklyHoursPlaceholder: string;
      noClassSelected: string;
      noSubjectsAssigned: string;
      globalType: string;
      organizationType: string;
      cannotDeleteGlobal: string;
    };
    scheduleSlots: {
      title: string;
      management: string;
      addSlot: string;
      editSlot: string;
      deleteSlot: string;
      name: string;
      code: string;
      startTime: string;
      endTime: string;
      days: string;
      duration: string;
      academicYear: string;
      school: string;
      sortOrder: string;
      isActive: string;
      description: string;
      active: string;
      inactive: string;
      global: string;
      selectAcademicYear: string;
      selectDaysHint: string;
      academicYearHint: string;
      schoolHint: string;
      allSchools: string;
      searchPlaceholder: string;
      noSlotsFound: string;
      noSlotsMessage: string;
      slotCreated: string;
      slotUpdated: string;
      slotDeleted: string;
      deleteConfirm: string;
      nameRequired: string;
      codeRequired: string;
      codeMaxLength: string;
      nameMaxLength: string;
      timeRequired: string;
      invalidTimeFormat: string;
      endTimeAfterStart: string;
    };
    timetable: {
      days: {
        title: string;
        monday: string;
        tuesday: string;
        wednesday: string;
        thursday: string;
        friday: string;
        saturday: string;
        sunday: string;
      };
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
    academicYears: {
      title: 'Academic Years',
      management: 'Academic Years Management',
      addAcademicYear: 'Add Academic Year',
      editAcademicYear: 'Edit Academic Year',
      deleteAcademicYear: 'Delete Academic Year',
      name: 'Name',
      startDate: 'Start Date',
      endDate: 'End Date',
      description: 'Description',
      status: 'Status',
      isCurrent: 'Current Year',
      current: 'Current',
      setAsCurrent: 'Set as Current',
      active: 'Active',
      archived: 'Archived',
      planned: 'Planned',
      searchPlaceholder: 'Search academic years...',
      noAcademicYearsFound: 'No academic years found',
      noAcademicYearsMessage: 'Try adjusting your search criteria or add a new academic year.',
      academicYearCreated: 'Academic year created successfully',
      academicYearUpdated: 'Academic year updated successfully',
      academicYearDeleted: 'Academic year deleted successfully',
      academicYearSetAsCurrent: 'Academic year set as current successfully',
      deleteConfirm: 'Are you sure you want to delete this academic year?',
      nameRequired: 'Name is required',
      startDateRequired: 'Start date is required',
      endDateRequired: 'End date is required',
      nameMaxLength: 'Name must be 100 characters or less',
      dateRangeError: 'End date must be after start date',
      nameExists: 'This academic year name already exists for this organization',
      cannotDeleteCurrent: 'Cannot delete the current academic year. Please set another year as current first.',
      globalType: 'Global',
      organizationType: 'Organization',
      cannotDeleteGlobal: 'Cannot delete global academic years',
    },
    classes: {
      title: 'Classes',
      management: 'Classes Management',
      addClass: 'Add Class',
      editClass: 'Edit Class',
      deleteClass: 'Delete Class',
      assignToYear: 'Assign to Academic Year',
      copyBetweenYears: 'Copy Classes Between Years',
      name: 'Name',
      code: 'Code',
      gradeLevel: 'Grade Level',
      description: 'Description',
      defaultCapacity: 'Default Capacity',
      capacity: 'Capacity',
      isActive: 'Active Status',
      active: 'Active',
      inactive: 'Inactive',
      section: 'Section',
      sectionName: 'Section Name',
      teacher: 'Teacher',
      room: 'Room',
      studentCount: 'Student Count',
      notes: 'Notes',
      searchPlaceholder: 'Search classes...',
      noClassesFound: 'No classes found',
      noClassesMessage: 'Try adjusting your search criteria or add a new class.',
      classCreated: 'Class created successfully',
      classUpdated: 'Class updated successfully',
      classDeleted: 'Class deleted successfully',
      classAssigned: 'Class assigned to academic year successfully',
      classInstanceUpdated: 'Class instance updated successfully',
      classRemoved: 'Class removed from academic year successfully',
      classesCopied: 'Classes copied successfully',
      deleteConfirm: 'Are you sure you want to delete this class?',
      removeConfirm: 'Are you sure you want to remove this class from the academic year?',
      nameRequired: 'Name is required',
      codeRequired: 'Code is required',
      nameMaxLength: 'Name must be 100 characters or less',
      codeMaxLength: 'Code must be 50 characters or less',
      codeExists: 'A class with this code already exists for this organization',
      cannotDeleteInUse: 'Cannot delete class that is assigned to academic years',
      cannotRemoveWithStudents: 'Cannot remove class instance that has enrolled students',
      selectAcademicYear: 'Select Academic Year',
      selectClass: 'Select Class',
      selectTeacher: 'Select Teacher',
      selectRoom: 'Select Room',
      fromYear: 'From Academic Year',
      toYear: 'To Academic Year',
      selectClasses: 'Select Classes to Copy',
      copyAssignments: 'Copy Assignments (Teachers & Rooms)',
      allSections: 'All Sections',
      baseClasses: 'Base Classes',
      yearClasses: 'Classes by Academic Year',
      copyClasses: 'Copy Classes',
      history: 'History',
      viewHistory: 'View History',
      bulkCreateSections: 'Bulk Create Sections',
      createSections: 'Create Sections',
      defaultTeacher: 'Default Teacher',
      defaultRoom: 'Default Room',
      sectionsInput: 'Sections (comma-separated)',
      noSections: 'No sections',
      globalType: 'Global',
      organizationType: 'Organization',
      cannotDeleteGlobal: 'Cannot delete global classes',
    },
    subjects: {
      title: 'Subjects',
      management: 'Subjects Management',
      addSubject: 'Add Subject',
      editSubject: 'Edit Subject',
      deleteSubject: 'Delete Subject',
      assignToClass: 'Assign to Class',
      copyBetweenYears: 'Copy Subjects Between Years',
      name: 'Name',
      code: 'Code',
      gradeLevel: 'Grade Level',
      description: 'Description',
      isActive: 'Active Status',
      active: 'Active',
      inactive: 'Inactive',
      teacher: 'Teacher',
      room: 'Room',
      weeklyHours: 'Weekly Hours',
      notes: 'Notes',
      searchPlaceholder: 'Search subjects...',
      noSubjectsFound: 'No subjects found',
      noSubjectsMessage: 'Try adjusting your search criteria or add a new subject.',
      subjectCreated: 'Subject created successfully',
      subjectUpdated: 'Subject updated successfully',
      subjectDeleted: 'Subject deleted successfully',
      subjectAssigned: 'Subject assigned to class successfully',
      subjectAssignmentUpdated: 'Subject assignment updated successfully',
      subjectRemoved: 'Subject removed from class successfully',
      subjectsCopied: 'Subjects copied successfully',
      deleteConfirm: 'Are you sure you want to delete this subject?',
      removeConfirm: 'Are you sure you want to remove this subject from the class?',
      nameRequired: 'Name is required',
      codeRequired: 'Code is required',
      nameMaxLength: 'Name must be 100 characters or less',
      codeMaxLength: 'Code must be 50 characters or less',
      codeExists: 'A subject with this code already exists for this organization',
      cannotDeleteInUse: 'Cannot delete subject that is assigned to classes',
      selectAcademicYear: 'Select Academic Year',
      selectClass: 'Select Class',
      selectSubject: 'Select Subject',
      selectSubjects: 'Select Subjects',
      fromYear: 'From Academic Year',
      toYear: 'To Academic Year',
      copyAssignments: 'Copy Assignments (Teachers & Rooms)',
      baseSubjects: 'Base Subjects',
      classSubjects: 'Class Subjects',
      assignSubjects: 'Assign Subjects',
      bulkAssignSubjects: 'Bulk Assign Subjects',
      weeklyHoursPlaceholder: 'Hours per week',
      noClassSelected: 'Please select a class to view subjects',
      noSubjectsAssigned: 'No subjects assigned to this class',
      globalType: 'Global',
      organizationType: 'Organization',
      cannotDeleteGlobal: 'Cannot delete global subjects',
    },
    scheduleSlots: {
      title: 'Schedule Slots',
      management: 'Schedule Slots Management',
      addSlot: 'Add Schedule Slot',
      editSlot: 'Edit Schedule Slot',
      deleteSlot: 'Delete Schedule Slot',
      name: 'Name',
      code: 'Code',
      startTime: 'Start Time',
      endTime: 'End Time',
      days: 'Days of Week',
      duration: 'Duration (minutes)',
      academicYear: 'Academic Year',
      school: 'School',
      sortOrder: 'Sort Order',
      isActive: 'Active Status',
      description: 'Description',
      active: 'Active',
      inactive: 'Inactive',
      global: 'Global',
      selectAcademicYear: 'Select Academic Year',
      selectDaysHint: 'Select the days of the week this slot is available',
      academicYearHint: 'Leave empty for global slots available to all academic years',
      schoolHint: 'Leave empty for organization-wide slots, or select a specific school',
      allSchools: 'All Schools',
      searchPlaceholder: 'Search schedule slots...',
      noSlotsFound: 'No schedule slots found',
      noSlotsMessage: 'Try adjusting your search criteria or add a new schedule slot.',
      slotCreated: 'Schedule slot created successfully',
      slotUpdated: 'Schedule slot updated successfully',
      slotDeleted: 'Schedule slot deleted successfully',
      deleteConfirm: 'Are you sure you want to delete this schedule slot?',
      nameRequired: 'Name is required',
      codeRequired: 'Code is required',
      codeMaxLength: 'Code must be 50 characters or less',
      nameMaxLength: 'Name must be 100 characters or less',
      timeRequired: 'Start and end times are required',
      invalidTimeFormat: 'Invalid time format (HH:MM)',
      endTimeAfterStart: 'End time must be after start time',
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
    academicYears: {
      title: 'د علمي کلونو',
      management: 'د علمي کلونو مدیریت',
      addAcademicYear: 'علمی کال اضافه کول',
      editAcademicYear: 'علمی کال تغیر کول',
      deleteAcademicYear: 'علمی کال پاک کول',
      name: 'نوم',
      startDate: 'د پیل نیټه',
      endDate: 'د پای نیټه',
      description: 'تفصیل',
      status: 'حالت',
      isCurrent: 'اوسنی کال',
      current: 'اوسنی',
      setAsCurrent: 'اوسنی کال ټاکل',
      active: 'فعال',
      archived: 'آرشیف شوی',
      planned: 'پلان شوی',
      searchPlaceholder: 'د علمي کلونو لټون...',
      noAcademicYearsFound: 'علمي کلونه ونه موندل شول',
      noAcademicYearsMessage: 'خپل لټون معیارونه تنظیم کړئ یا نوی علمی کال اضافه کړئ.',
      academicYearCreated: 'علمی کال په بریالیتوب سره اضافه شو',
      academicYearUpdated: 'علمی کال په بریالیتوب سره تغیر شو',
      academicYearDeleted: 'علمی کال په بریالیتوب سره پاک شو',
      academicYearSetAsCurrent: 'علمی کال په بریالیتوب سره اوسنی کال ټاکل شو',
      deleteConfirm: 'ایا تاسو ډاډه یاست چې تاسو غواړئ دا علمی کال پاک کړئ؟',
      nameRequired: 'نوم اړینه دی',
      startDateRequired: 'د پیل نیټه اړینه ده',
      endDateRequired: 'د پای نیټه اړینه ده',
      nameMaxLength: 'نوم باید 100 حروف یا لږ وي',
      dateRangeError: 'د پای نیټه باید د پیل نیټې وروسته وي',
      nameExists: 'دا د علمي کال نوم د دې سازمان لپاره شتون لري',
      cannotDeleteCurrent: 'اوسنی علمی کال پاک کیدی نشي. لطفاً لومړی بل کال اوسنی کال ټاکئ.',
      globalType: 'نړیوال',
      organizationType: 'سازمان',
      cannotDeleteGlobal: 'نړیوال علمي کلونه پاک کیدی نشي',
    },
    classes: {
      title: 'ټولګۍ',
      management: 'د ټولګیو مدیریت',
      addClass: 'ټولګۍ اضافه کول',
      editClass: 'ټولګۍ تغیر کول',
      deleteClass: 'ټولګۍ پاک کول',
      assignToYear: 'د علمي کال ته ټولګۍ ټاکل',
      copyBetweenYears: 'د ټولګیو د کلونو ترمنځ کاپي کول',
      name: 'نوم',
      code: 'کوډ',
      gradeLevel: 'د درجې کچه',
      description: 'تفصیل',
      defaultCapacity: 'د ظرفیت حد',
      capacity: 'ظرفیت',
      isActive: 'فعال حالت',
      active: 'فعال',
      inactive: 'غیر فعال',
      section: 'برخه',
      sectionName: 'د برخې نوم',
      teacher: 'استاد',
      room: 'خونه',
      studentCount: 'د زده کوونکو شمیر',
      notes: 'یادښتونه',
      searchPlaceholder: 'د ټولګیو لټون...',
      noClassesFound: 'ټولګۍ ونه موندل شول',
      noClassesMessage: 'خپل لټون معیارونه تنظیم کړئ یا نوی ټولګۍ اضافه کړئ.',
      classCreated: 'ټولګۍ په بریالیتوب سره اضافه شوه',
      classUpdated: 'ټولګۍ په بریالیتوب سره تغیر شوه',
      classDeleted: 'ټولګۍ په بریالیتوب سره پاک شوه',
      classAssigned: 'ټولګۍ په بریالیتوب سره د علمي کال ته ټاکل شوه',
      classInstanceUpdated: 'د ټولګۍ نمونه په بریالیتوب سره تغیر شوه',
      classRemoved: 'ټولګۍ په بریالیتوب سره د علمي کال څخه لرې شوه',
      classesCopied: 'ټولګۍ په بریالیتوب سره کاپي شول',
      deleteConfirm: 'ایا تاسو ډاډه یاست چې تاسو غواړئ دا ټولګۍ پاک کړئ؟',
      removeConfirm: 'ایا تاسو ډاډه یاست چې تاسو غواړئ دا ټولګۍ د علمي کال څخه لرې کړئ؟',
      nameRequired: 'نوم اړینه دی',
      codeRequired: 'کوډ اړینه دی',
      nameMaxLength: 'نوم باید 100 حروف یا لږ وي',
      codeMaxLength: 'کوډ باید 50 حروف یا لږ وي',
      codeExists: 'دا کوډ د دې سازمان لپاره شتون لري',
      cannotDeleteInUse: 'د علمي کلونو ته ټاکل شوې ټولګۍ پاک کیدی نشي',
      cannotRemoveWithStudents: 'د نوم لیکل شویو زده کوونکو سره د ټولګۍ نمونه لرې کیدی نشي',
      selectAcademicYear: 'د علمي کال غوره کول',
      selectClass: 'د ټولګۍ غوره کول',
      selectTeacher: 'د استاد غوره کول',
      selectRoom: 'د خونې غوره کول',
      fromYear: 'د علمي کال څخه',
      toYear: 'د علمي کال ته',
      selectClasses: 'د کاپي کولو لپاره ټولګۍ غوره کړئ',
      copyAssignments: 'د دندو کاپي کول (استادان او خونې)',
      allSections: 'ټولې برخې',
      baseClasses: 'اساسي ټولګۍ',
      yearClasses: 'د علمي کال له مخې ټولګۍ',
      copyClasses: 'د ټولګیو کاپي کول',
      history: 'تاریخ',
      viewHistory: 'د تاریخ لیدل',
      noSections: 'برخې نشته',
      bulkCreateSections: 'د برخو د جوړولو ډله',
      createSections: 'برخې جوړول',
      defaultTeacher: 'د استاد حد',
      defaultRoom: 'د خونې حد',
      sectionsInput: 'برخې (د کاما سره جلا شوي)',
      globalType: 'نړیوال',
      organizationType: 'سازمان',
      cannotDeleteGlobal: 'نړیوال ټولګۍ پاک کیدی نشي',
    },
    subjects: {
      title: 'مضامین',
      management: 'د مضامینو مدیریت',
      addSubject: 'مضمون اضافه کول',
      editSubject: 'مضمون تغیر کول',
      deleteSubject: 'مضمون پاک کول',
      assignToClass: 'د ټولګۍ ته مضمون ټاکل',
      copyBetweenYears: 'د مضامینو د کلونو ترمنځ کاپي کول',
      name: 'نوم',
      code: 'کوډ',
      gradeLevel: 'د درجې کچه',
      description: 'تفصیل',
      isActive: 'فعال حالت',
      active: 'فعال',
      inactive: 'غیر فعال',
      teacher: 'استاد',
      room: 'خونه',
      weeklyHours: 'د اونۍ ساعات',
      notes: 'یادښتونه',
      searchPlaceholder: 'د مضامینو لټون...',
      noSubjectsFound: 'مضامین ونه موندل شول',
      noSubjectsMessage: 'خپل لټون معیارونه تنظیم کړئ یا نوی مضمون اضافه کړئ.',
      subjectCreated: 'مضمون په بریالیتوب سره اضافه شو',
      subjectUpdated: 'مضمون په بریالیتوب سره تغیر شو',
      subjectDeleted: 'مضمون په بریالیتوب سره پاک شو',
      subjectAssigned: 'مضمون په بریالیتوب سره د ټولګۍ ته ټاکل شو',
      subjectAssignmentUpdated: 'د مضمون دنده په بریالیتوب سره تغیر شوه',
      subjectRemoved: 'مضمون په بریالیتوب سره د ټولګۍ څخه لرې شو',
      subjectsCopied: 'مضامین په بریالیتوب سره کاپي شول',
      deleteConfirm: 'ایا تاسو ډاډه یاست چې تاسو غواړئ دا مضمون پاک کړئ؟',
      removeConfirm: 'ایا تاسو ډاډه یاست چې تاسو غواړئ دا مضمون د ټولګۍ څخه لرې کړئ؟',
      nameRequired: 'نوم اړینه دی',
      codeRequired: 'کوډ اړینه دی',
      nameMaxLength: 'نوم باید 100 حروف یا لږ وي',
      codeMaxLength: 'کوډ باید 50 حروف یا لږ وي',
      codeExists: 'دا کوډ د دې سازمان لپاره شتون لري',
      cannotDeleteInUse: 'د ټولګیو ته ټاکل شوي مضامین پاک کیدی نشي',
      selectAcademicYear: 'د علمي کال غوره کول',
      selectClass: 'د ټولګۍ غوره کول',
      selectSubject: 'د مضمون غوره کول',
      selectSubjects: 'د مضامینو غوره کول',
      fromYear: 'د علمي کال څخه',
      toYear: 'د علمي کال ته',
      copyAssignments: 'د دندو کاپي کول (استادان او خونې)',
      baseSubjects: 'اساسي مضامین',
      classSubjects: 'د ټولګۍ مضامین',
      assignSubjects: 'مضامین ټاکل',
      bulkAssignSubjects: 'د مضامینو د ټاکلو ډله',
      weeklyHoursPlaceholder: 'د اونۍ ساعات',
      noClassSelected: 'د مضامینو د لیدو لپاره لطفاً ټولګۍ غوره کړئ',
      noSubjectsAssigned: 'د دې ټولګۍ ته هیڅ مضمون ټاکل شوی نه دی',
      globalType: 'نړیوال',
      organizationType: 'سازمان',
      cannotDeleteGlobal: 'نړیوال مضامین پاک کیدی نشي',
    },
    scheduleSlots: {
      title: 'د وخت جدول سلاټونه',
      management: 'د وخت جدول سلاټونو مدیریت',
      addSlot: 'د وخت جدول سلاټ اضافه کول',
      editSlot: 'د وخت جدول سلاټ تغیر کول',
      deleteSlot: 'د وخت جدول سلاټ پاک کول',
      name: 'نوم',
      code: 'کوډ',
      startTime: 'د پیل وخت',
      endTime: 'د پای وخت',
      days: 'د اونۍ ورځې',
      duration: 'موده (دقیقې)',
      academicYear: 'علمی کال',
      school: 'ښوونځی',
      sortOrder: 'د ترتیب کچه',
      isActive: 'فعال حالت',
      description: 'تفصیل',
      active: 'فعال',
      inactive: 'غیر فعال',
      global: 'نړیوال',
      selectAcademicYear: 'علمی کال وټاکئ',
      selectDaysHint: 'د اونۍ هغه ورځې وټاکئ چې دا سلاټ شتون لري',
      academicYearHint: 'د نړیوالو سلاټونو لپاره خالي پریږدئ چې ټولو علمي کلونو ته شتون ولري',
      schoolHint: 'د سازمان پراخو سلاټونو لپاره خالي پریږدئ، یا یو ځانګړی ښوونځی وټاکئ',
      allSchools: 'ټول ښوونځي',
      searchPlaceholder: 'د وخت جدول سلاټونه لټون...',
      noSlotsFound: 'د وخت جدول سلاټونه ونه موندل شول',
      noSlotsMessage: 'خپل لټون معیارونه تنظیم کړئ یا نوی د وخت جدول سلاټ اضافه کړئ.',
      slotCreated: 'د وخت جدول سلاټ په بریالیتوب سره اضافه شو',
      slotUpdated: 'د وخت جدول سلاټ په بریالیتوب سره تغیر شو',
      slotDeleted: 'د وخت جدول سلاټ په بریالیتوب سره پاک شو',
      deleteConfirm: 'ایا تاسو ډاډه یاست چې تاسو غواړئ دا د وخت جدول سلاټ پاک کړئ؟',
      nameRequired: 'نوم اړینه دی',
      codeRequired: 'کوډ اړینه دی',
      codeMaxLength: 'کوډ باید 50 حروف یا لږ وي',
      nameMaxLength: 'نوم باید 100 حروف یا لږ وي',
      timeRequired: 'د پیل او پای وختونه اړین دي',
      invalidTimeFormat: 'د وخت بڼه ناسمه ده (ساعت:دقیقه)',
      endTimeAfterStart: 'د پای وخت باید د پیل وخت وروسته وي',
    },
    timetable: {
      days: {
        title: 'د اونۍ ورځې',
        monday: 'دوشنبه',
        tuesday: 'سه‌شنبه',
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
    academicYears: {
      title: 'سال‌های تحصیلی',
      management: 'مدیریت سال‌های تحصیلی',
      addAcademicYear: 'افزودن سال تحصیلی',
      editAcademicYear: 'ویرایش سال تحصیلی',
      deleteAcademicYear: 'حذف سال تحصیلی',
      name: 'نام',
      startDate: 'تاریخ شروع',
      endDate: 'تاریخ پایان',
      description: 'توضیحات',
      status: 'وضعیت',
      isCurrent: 'سال جاری',
      current: 'جاری',
      setAsCurrent: 'تنظیم به عنوان جاری',
      active: 'فعال',
      archived: 'بایگانی شده',
      planned: 'برنامه‌ریزی شده',
      searchPlaceholder: 'جستجوی سال‌های تحصیلی...',
      noAcademicYearsFound: 'سال تحصیلی یافت نشد',
      noAcademicYearsMessage: 'معیارهای جستجوی خود را تنظیم کنید یا سال تحصیلی جدیدی اضافه کنید.',
      academicYearCreated: 'سال تحصیلی با موفقیت ایجاد شد',
      academicYearUpdated: 'سال تحصیلی با موفقیت به‌روزرسانی شد',
      academicYearDeleted: 'سال تحصیلی با موفقیت حذف شد',
      academicYearSetAsCurrent: 'سال تحصیلی با موفقیت به عنوان جاری تنظیم شد',
      deleteConfirm: 'آیا مطمئن هستید که می‌خواهید این سال تحصیلی را حذف کنید؟',
      nameRequired: 'نام الزامی است',
      startDateRequired: 'تاریخ شروع الزامی است',
      endDateRequired: 'تاریخ پایان الزامی است',
      nameMaxLength: 'نام باید حداکثر 100 کاراکتر باشد',
      dateRangeError: 'تاریخ پایان باید بعد از تاریخ شروع باشد',
      nameExists: 'این نام سال تحصیلی برای این سازمان قبلاً وجود دارد',
      cannotDeleteCurrent: 'نمی‌توان سال تحصیلی جاری را حذف کرد. لطفاً ابتدا سال دیگری را به عنوان جاری تنظیم کنید.',
      globalType: 'جهانی',
      organizationType: 'سازمان',
      cannotDeleteGlobal: 'نمی‌توان سال‌های تحصیلی جهانی را حذف کرد',
    },
    classes: {
      title: 'کلاس‌ها',
      management: 'مدیریت کلاس‌ها',
      addClass: 'افزودن کلاس',
      editClass: 'ویرایش کلاس',
      deleteClass: 'حذف کلاس',
      assignToYear: 'اختصاص به سال تحصیلی',
      copyBetweenYears: 'کپی کلاس‌ها بین سال‌ها',
      name: 'نام',
      code: 'کد',
      gradeLevel: 'سطح پایه',
      description: 'توضیحات',
      defaultCapacity: 'ظرفیت پیش‌فرض',
      capacity: 'ظرفیت',
      isActive: 'وضعیت فعال',
      active: 'فعال',
      inactive: 'غیرفعال',
      section: 'بخش',
      sectionName: 'نام بخش',
      teacher: 'معلم',
      room: 'اتاق',
      studentCount: 'تعداد دانش‌آموز',
      notes: 'یادداشت‌ها',
      searchPlaceholder: 'جستجوی کلاس‌ها...',
      noClassesFound: 'کلاسی یافت نشد',
      noClassesMessage: 'معیارهای جستجوی خود را تنظیم کنید یا کلاس جدیدی اضافه کنید.',
      classCreated: 'کلاس با موفقیت ایجاد شد',
      classUpdated: 'کلاس با موفقیت به‌روزرسانی شد',
      classDeleted: 'کلاس با موفقیت حذف شد',
      classAssigned: 'کلاس با موفقیت به سال تحصیلی اختصاص داده شد',
      classInstanceUpdated: 'نمونه کلاس با موفقیت به‌روزرسانی شد',
      classRemoved: 'کلاس با موفقیت از سال تحصیلی حذف شد',
      classesCopied: 'کلاس‌ها با موفقیت کپی شدند',
      deleteConfirm: 'آیا مطمئن هستید که می‌خواهید این کلاس را حذف کنید؟',
      removeConfirm: 'آیا مطمئن هستید که می‌خواهید این کلاس را از سال تحصیلی حذف کنید؟',
      nameRequired: 'نام الزامی است',
      codeRequired: 'کد الزامی است',
      nameMaxLength: 'نام باید حداکثر 100 کاراکتر باشد',
      codeMaxLength: 'کد باید حداکثر 50 کاراکتر باشد',
      codeExists: 'کلاسی با این کد برای این سازمان قبلاً وجود دارد',
      cannotDeleteInUse: 'نمی‌توان کلاسی که به سال‌های تحصیلی اختصاص داده شده را حذف کرد',
      cannotRemoveWithStudents: 'نمی‌توان نمونه کلاسی که دانش‌آموز دارد را حذف کرد',
      selectAcademicYear: 'انتخاب سال تحصیلی',
      selectClass: 'انتخاب کلاس',
      selectTeacher: 'انتخاب معلم',
      selectRoom: 'انتخاب اتاق',
      fromYear: 'از سال تحصیلی',
      toYear: 'به سال تحصیلی',
      selectClasses: 'انتخاب کلاس‌ها برای کپی',
      copyAssignments: 'کپی اختصاصات (معلمان و اتاق‌ها)',
      allSections: 'همه بخش‌ها',
      baseClasses: 'کلاس‌های پایه',
      yearClasses: 'کلاس‌ها بر اساس سال تحصیلی',
      copyClasses: 'کپی کلاس‌ها',
      history: 'تاریخچه',
      viewHistory: 'مشاهده تاریخچه',
      bulkCreateSections: 'ایجاد دسته‌ای بخش‌ها',
      createSections: 'ایجاد بخش‌ها',
      defaultTeacher: 'معلم پیش‌فرض',
      defaultRoom: 'اتاق پیش‌فرض',
      sectionsInput: 'بخش‌ها (جدا شده با کاما)',
      noSections: 'بخشی وجود ندارد',
      globalType: 'جهانی',
      organizationType: 'سازمان',
      cannotDeleteGlobal: 'نمی‌توان کلاس‌های جهانی را حذف کرد',
    },
    subjects: {
      title: 'موضوعات',
      management: 'مدیریت موضوعات',
      addSubject: 'افزودن موضوع',
      editSubject: 'ویرایش موضوع',
      deleteSubject: 'حذف موضوع',
      assignToClass: 'اختصاص به کلاس',
      copyBetweenYears: 'کپی موضوعات بین سال‌ها',
      name: 'نام',
      code: 'کد',
      gradeLevel: 'سطح پایه',
      description: 'توضیحات',
      isActive: 'وضعیت فعال',
      active: 'فعال',
      inactive: 'غیرفعال',
      teacher: 'معلم',
      room: 'اتاق',
      weeklyHours: 'ساعات هفتگی',
      notes: 'یادداشت‌ها',
      searchPlaceholder: 'جستجوی موضوعات...',
      noSubjectsFound: 'موضوعی یافت نشد',
      noSubjectsMessage: 'معیارهای جستجوی خود را تنظیم کنید یا موضوع جدیدی اضافه کنید.',
      subjectCreated: 'موضوع با موفقیت ایجاد شد',
      subjectUpdated: 'موضوع با موفقیت به‌روزرسانی شد',
      subjectDeleted: 'موضوع با موفقیت حذف شد',
      subjectAssigned: 'موضوع با موفقیت به کلاس اختصاص داده شد',
      subjectAssignmentUpdated: 'اختصاص موضوع با موفقیت به‌روزرسانی شد',
      subjectRemoved: 'موضوع با موفقیت از کلاس حذف شد',
      subjectsCopied: 'موضوعات با موفقیت کپی شدند',
      deleteConfirm: 'آیا مطمئن هستید که می‌خواهید این موضوع را حذف کنید؟',
      removeConfirm: 'آیا مطمئن هستید که می‌خواهید این موضوع را از کلاس حذف کنید؟',
      nameRequired: 'نام الزامی است',
      codeRequired: 'کد الزامی است',
      nameMaxLength: 'نام باید حداکثر 100 کاراکتر باشد',
      codeMaxLength: 'کد باید حداکثر 50 کاراکتر باشد',
      codeExists: 'موضوعی با این کد برای این سازمان قبلاً وجود دارد',
      cannotDeleteInUse: 'نمی‌توان موضوعی که به کلاس‌ها اختصاص داده شده را حذف کرد',
      selectAcademicYear: 'انتخاب سال تحصیلی',
      selectClass: 'انتخاب کلاس',
      selectSubject: 'انتخاب موضوع',
      selectSubjects: 'انتخاب موضوعات',
      fromYear: 'از سال تحصیلی',
      toYear: 'به سال تحصیلی',
      copyAssignments: 'کپی اختصاصات (معلمان و اتاق‌ها)',
      baseSubjects: 'موضوعات پایه',
      classSubjects: 'موضوعات کلاس',
      assignSubjects: 'اختصاص موضوعات',
      bulkAssignSubjects: 'اختصاص دسته‌ای موضوعات',
      weeklyHoursPlaceholder: 'ساعات در هفته',
      noClassSelected: 'لطفاً کلاسی را برای مشاهده موضوعات انتخاب کنید',
      noSubjectsAssigned: 'هیچ موضوعی به این کلاس اختصاص داده نشده است',
      globalType: 'جهانی',
      organizationType: 'سازمان',
      cannotDeleteGlobal: 'نمی‌توان موضوعات جهانی را حذف کرد',
    },
    scheduleSlots: {
      title: 'زمان‌بندی اسلات',
      management: 'مدیریت زمان‌بندی اسلات',
      addSlot: 'افزودن اسلات زمان‌بندی',
      editSlot: 'ویرایش اسلات زمان‌بندی',
      deleteSlot: 'حذف اسلات زمان‌بندی',
      name: 'نام',
      code: 'کد',
      startTime: 'زمان شروع',
      endTime: 'زمان پایان',
      days: 'روزهای هفته',
      duration: 'مدت زمان (دقیقه)',
      academicYear: 'سال تحصیلی',
      school: 'مدرسه',
      sortOrder: 'ترتیب',
      isActive: 'وضعیت فعال',
      description: 'توضیحات',
      active: 'فعال',
      inactive: 'غیرفعال',
      global: 'جهانی',
      selectAcademicYear: 'انتخاب سال تحصیلی',
      selectDaysHint: 'روزهای هفته‌ای که این اسلات در دسترس است را انتخاب کنید',
      academicYearHint: 'برای اسلات‌های جهانی که برای همه سال‌های تحصیلی در دسترس است، خالی بگذارید',
      schoolHint: 'برای اسلات‌های سازمانی، خالی بگذارید یا یک مدرسه خاص انتخاب کنید',
      allSchools: 'همه مدارس',
      searchPlaceholder: 'جستجوی اسلات زمان‌بندی...',
      noSlotsFound: 'اسلات زمان‌بندی یافت نشد',
      noSlotsMessage: 'معیارهای جستجوی خود را تنظیم کنید یا اسلات زمان‌بندی جدیدی اضافه کنید.',
      slotCreated: 'اسلات زمان‌بندی با موفقیت ایجاد شد',
      slotUpdated: 'اسلات زمان‌بندی با موفقیت به‌روزرسانی شد',
      slotDeleted: 'اسلات زمان‌بندی با موفقیت حذف شد',
      deleteConfirm: 'آیا مطمئن هستید که می‌خواهید این اسلات زمان‌بندی را حذف کنید؟',
      nameRequired: 'نام الزامی است',
      codeRequired: 'کد الزامی است',
      codeMaxLength: 'کد باید حداکثر 50 کاراکتر باشد',
      nameMaxLength: 'نام باید حداکثر 100 کاراکتر باشد',
      timeRequired: 'زمان شروع و پایان الزامی است',
      invalidTimeFormat: 'فرمت زمان نامعتبر است (ساعت:دقیقه)',
      endTimeAfterStart: 'زمان پایان باید بعد از زمان شروع باشد',
    },
    timetable: {
      days: {
        title: 'روزهای هفته',
        monday: 'دوشنبه',
        tuesday: 'سه‌شنبه',
        wednesday: 'چهارشنبه',
        thursday: 'پنجشنبه',
        friday: 'جمعه',
        saturday: 'شنبه',
        sunday: 'یکشنبه',
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
    academicYears: {
      title: 'السنوات الأكاديمية',
      management: 'إدارة السنوات الأكاديمية',
      addAcademicYear: 'إضافة سنة أكاديمية',
      editAcademicYear: 'تعديل السنة الأكاديمية',
      deleteAcademicYear: 'حذف السنة الأكاديمية',
      name: 'الاسم',
      startDate: 'تاريخ البدء',
      endDate: 'تاريخ الانتهاء',
      description: 'الوصف',
      status: 'الحالة',
      isCurrent: 'السنة الحالية',
      current: 'حالي',
      setAsCurrent: 'تعيين كحالي',
      active: 'نشط',
      archived: 'مؤرشف',
      planned: 'مخطط',
      searchPlaceholder: 'البحث عن السنوات الأكاديمية...',
      noAcademicYearsFound: 'لم يتم العثور على سنوات أكاديمية',
      noAcademicYearsMessage: 'حاول تعديل معايير البحث أو إضافة سنة أكاديمية جديدة.',
      academicYearCreated: 'تم إنشاء السنة الأكاديمية بنجاح',
      academicYearUpdated: 'تم تحديث السنة الأكاديمية بنجاح',
      academicYearDeleted: 'تم حذف السنة الأكاديمية بنجاح',
      academicYearSetAsCurrent: 'تم تعيين السنة الأكاديمية كحالية بنجاح',
      deleteConfirm: 'هل أنت متأكد أنك تريد حذف هذه السنة الأكاديمية؟',
      nameRequired: 'الاسم مطلوب',
      startDateRequired: 'تاريخ البدء مطلوب',
      endDateRequired: 'تاريخ الانتهاء مطلوب',
      nameMaxLength: 'يجب أن يكون الاسم 100 حرف أو أقل',
      dateRangeError: 'يجب أن يكون تاريخ الانتهاء بعد تاريخ البدء',
      nameExists: 'اسم السنة الأكاديمية هذا موجود بالفعل لهذه المنظمة',
      cannotDeleteCurrent: 'لا يمكن حذف السنة الأكاديمية الحالية. يرجى تعيين سنة أخرى كحالية أولاً.',
      globalType: 'عالمي',
      organizationType: 'المنظمة',
      cannotDeleteGlobal: 'لا يمكن حذف السنوات الأكاديمية العالمية',
    },
    classes: {
      title: 'الفصول',
      management: 'إدارة الفصول',
      addClass: 'إضافة فصل',
      editClass: 'تعديل الفصل',
      deleteClass: 'حذف الفصل',
      assignToYear: 'تعيين إلى السنة الأكاديمية',
      copyBetweenYears: 'نسخ الفصول بين السنوات',
      name: 'الاسم',
      code: 'الكود',
      gradeLevel: 'مستوى الصف',
      description: 'الوصف',
      defaultCapacity: 'السعة الافتراضية',
      capacity: 'السعة',
      isActive: 'حالة النشاط',
      active: 'نشط',
      inactive: 'غير نشط',
      section: 'القسم',
      sectionName: 'اسم القسم',
      teacher: 'المعلم',
      room: 'الغرفة',
      studentCount: 'عدد الطلاب',
      notes: 'ملاحظات',
      searchPlaceholder: 'البحث عن الفصول...',
      noClassesFound: 'لم يتم العثور على فصول',
      noClassesMessage: 'حاول تعديل معايير البحث أو إضافة فصل جديد.',
      classCreated: 'تم إنشاء الفصل بنجاح',
      classUpdated: 'تم تحديث الفصل بنجاح',
      classDeleted: 'تم حذف الفصل بنجاح',
      classAssigned: 'تم تعيين الفصل إلى السنة الأكاديمية بنجاح',
      classInstanceUpdated: 'تم تحديث مثيل الفصل بنجاح',
      classRemoved: 'تم إزالة الفصل من السنة الأكاديمية بنجاح',
      classesCopied: 'تم نسخ الفصول بنجاح',
      deleteConfirm: 'هل أنت متأكد أنك تريد حذف هذا الفصل؟',
      removeConfirm: 'هل أنت متأكد أنك تريد إزالة هذا الفصل من السنة الأكاديمية؟',
      nameRequired: 'الاسم مطلوب',
      codeRequired: 'الكود مطلوب',
      nameMaxLength: 'يجب أن يكون الاسم 100 حرف أو أقل',
      codeMaxLength: 'يجب أن يكون الكود 50 حرف أو أقل',
      codeExists: 'فصل بهذا الكود موجود بالفعل لهذه المنظمة',
      cannotDeleteInUse: 'لا يمكن حذف فصل مخصص لسنوات أكاديمية',
      cannotRemoveWithStudents: 'لا يمكن إزالة مثيل فصل به طلاب مسجلين',
      selectAcademicYear: 'اختر السنة الأكاديمية',
      selectClass: 'اختر الفصل',
      selectTeacher: 'اختر المعلم',
      selectRoom: 'اختر الغرفة',
      fromYear: 'من السنة الأكاديمية',
      toYear: 'إلى السنة الأكاديمية',
      selectClasses: 'اختر الفصول للنسخ',
      copyAssignments: 'نسخ التعيينات (المعلمون والغرف)',
      allSections: 'جميع الأقسام',
      baseClasses: 'الفصول الأساسية',
      yearClasses: 'الفصول حسب السنة الأكاديمية',
      copyClasses: 'نسخ الفصول',
      history: 'التاريخ',
      viewHistory: 'عرض التاريخ',
      noSections: 'لا توجد أقسام',
      bulkCreateSections: 'إنشاء أقسام متعددة',
      createSections: 'إنشاء الأقسام',
      defaultTeacher: 'المعلم الافتراضي',
      defaultRoom: 'الغرفة الافتراضية',
      sectionsInput: 'الأقسام (مفصولة بفواصل)',
      globalType: 'عالمي',
      organizationType: 'المنظمة',
      cannotDeleteGlobal: 'لا يمكن حذف الفصول العالمية',
    },
    subjects: {
      title: 'المواد الدراسية',
      management: 'إدارة المواد الدراسية',
      addSubject: 'إضافة مادة',
      editSubject: 'تعديل المادة',
      deleteSubject: 'حذف المادة',
      assignToClass: 'تعيين إلى الفصل',
      copyBetweenYears: 'نسخ المواد بين السنوات',
      name: 'الاسم',
      code: 'الكود',
      gradeLevel: 'مستوى الصف',
      description: 'الوصف',
      isActive: 'حالة النشاط',
      active: 'نشط',
      inactive: 'غير نشط',
      teacher: 'المعلم',
      room: 'الغرفة',
      weeklyHours: 'الساعات الأسبوعية',
      notes: 'ملاحظات',
      searchPlaceholder: 'البحث عن المواد...',
      noSubjectsFound: 'لم يتم العثور على مواد',
      noSubjectsMessage: 'حاول تعديل معايير البحث أو إضافة مادة جديدة.',
      subjectCreated: 'تم إنشاء المادة بنجاح',
      subjectUpdated: 'تم تحديث المادة بنجاح',
      subjectDeleted: 'تم حذف المادة بنجاح',
      subjectAssigned: 'تم تعيين المادة إلى الفصل بنجاح',
      subjectAssignmentUpdated: 'تم تحديث تعيين المادة بنجاح',
      subjectRemoved: 'تم إزالة المادة من الفصل بنجاح',
      subjectsCopied: 'تم نسخ المواد بنجاح',
      deleteConfirm: 'هل أنت متأكد أنك تريد حذف هذه المادة؟',
      removeConfirm: 'هل أنت متأكد أنك تريد إزالة هذه المادة من الفصل؟',
      nameRequired: 'الاسم مطلوب',
      codeRequired: 'الكود مطلوب',
      nameMaxLength: 'يجب أن يكون الاسم 100 حرف أو أقل',
      codeMaxLength: 'يجب أن يكون الكود 50 حرفًا أو أقل',
      codeExists: 'مادة بهذا الكود موجودة بالفعل لهذه المنظمة',
      cannotDeleteInUse: 'لا يمكن حذف مادة مخصصة للفصول',
      selectAcademicYear: 'اختر السنة الأكاديمية',
      selectClass: 'اختر الفصل',
      selectSubject: 'اختر المادة',
      selectSubjects: 'اختر المواد',
      fromYear: 'من السنة الأكاديمية',
      toYear: 'إلى السنة الأكاديمية',
      copyAssignments: 'نسخ التعيينات (المعلمون والغرف)',
      baseSubjects: 'المواد الأساسية',
      classSubjects: 'مواد الفصل',
      assignSubjects: 'تعيين المواد',
      bulkAssignSubjects: 'تعيين المواد بالجملة',
      weeklyHoursPlaceholder: 'ساعات في الأسبوع',
      noClassSelected: 'يرجى اختيار فصل لعرض المواد',
      noSubjectsAssigned: 'لم يتم تعيين أي مواد لهذا الفصل',
      globalType: 'عالمي',
      organizationType: 'المنظمة',
      cannotDeleteGlobal: 'لا يمكن حذف المواد العالمية',
    },
    scheduleSlots: {
      title: 'فتحات الجدول الزمني',
      management: 'إدارة فتحات الجدول الزمني',
      addSlot: 'إضافة فتحة جدول زمني',
      editSlot: 'تعديل فتحة الجدول الزمني',
      deleteSlot: 'حذف فتحة الجدول الزمني',
      name: 'الاسم',
      code: 'الكود',
      startTime: 'وقت البدء',
      endTime: 'وقت الانتهاء',
      days: 'أيام الأسبوع',
      duration: 'المدة (بالدقائق)',
      academicYear: 'السنة الأكاديمية',
      school: 'المدرسة',
      sortOrder: 'ترتيب',
      isActive: 'حالة النشاط',
      description: 'الوصف',
      active: 'نشط',
      inactive: 'غير نشط',
      global: 'عالمي',
      selectAcademicYear: 'اختر السنة الأكاديمية',
      selectDaysHint: 'اختر أيام الأسبوع التي تكون هذه الفتحة متاحة فيها',
      academicYearHint: 'اتركه فارغًا للفتحات العالمية المتاحة لجميع السنوات الأكاديمية',
      schoolHint: 'اتركه فارغًا للفتحات على مستوى المنظمة، أو اختر مدرسة محددة',
      allSchools: 'جميع المدارس',
      searchPlaceholder: 'البحث عن فتحات الجدول الزمني...',
      noSlotsFound: 'لم يتم العثور على فتحات جدول زمني',
      noSlotsMessage: 'حاول تعديل معايير البحث أو إضافة فتحة جدول زمني جديدة.',
      slotCreated: 'تم إنشاء فتحة الجدول الزمني بنجاح',
      slotUpdated: 'تم تحديث فتحة الجدول الزمني بنجاح',
      slotDeleted: 'تم حذف فتحة الجدول الزمني بنجاح',
      deleteConfirm: 'هل أنت متأكد أنك تريد حذف هذه فتحة الجدول الزمني؟',
      nameRequired: 'الاسم مطلوب',
      codeRequired: 'الكود مطلوب',
      codeMaxLength: 'يجب أن يكون الكود 50 حرفًا أو أقل',
      nameMaxLength: 'يجب أن يكون الاسم 100 حرف أو أقل',
      timeRequired: 'وقت البدء والانتهاء مطلوب',
      invalidTimeFormat: 'تنسيق الوقت غير صالح (ساعة:دقيقة)',
      endTimeAfterStart: 'يجب أن يكون وقت الانتهاء بعد وقت البدء',
    },
    timetable: {
      days: {
        title: 'أيام الأسبوع',
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