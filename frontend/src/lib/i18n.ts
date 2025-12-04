// Nazim School Management System - Internationalization
// Translation system supporting English, Pashto, Dari, and Arabic

export type Language = 'en' | 'ps' | 'fa' | 'ar';

export interface TranslationKeys {
  // Common
  common: {
    loading: string;
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
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
    all: string;
    years: string;
    upload: string;
    uploading: string;
    download: string;
    actions: string;
  };

  // Pagination
  pagination: {
    showing: string;
    to: string;
    of: string;
    entries: string;
    total: string;
    noEntries: string;
    rowsPerPage: string;
  };

  // Navigation
  nav: {
    dashboard: string;
    students: string;
    admissions: string;
    studentManagement: string;
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
    academicManagement: string;
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
  // Students
  students: {
    title: string;
    subtitle: string;
    management: string;
    add: string;
    addDescription: string;
    list: string;
    listDescription: string;
    addStudent: string;
    studentProfile: string;
    personalInfo: string;
    guardianInfo: string;
    academicInfo: string;
    admissionInfo: string;
    addressInfo: string;
    otherInfo: string;
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
    applied: string;
    withdrawn: string;
    allSchools: string;
    allOrganizations: string;
    organization: string;
    acrossSelected: string;
    registeredMale: string;
    registeredFemale: string;
    needingSpecial: string;
    printProfile: string;
    viewProfile: string;
    applyingGrade: string;
    school: string;
    gender: string;
    male: string;
    female: string;
    orphan: string;
    total: string;
    father: string;
    guardian: string;
    guardianName: string;
    guardianPhone: string;
    noDataFound: string;
    deleteStudentRecord: string;
    deleteStudentDescription: string;
    updateDescription: string;
    selectSchool: string;
    potentialDuplicate: string;
    proceedCreate: string;
    fullName: string;
    grandfatherName: string;
    motherName: string;
    birthYear: string;
    birthDate: string;
    age: string;
    preferredLanguage: string;
    nationality: string;
    previousSchool: string;
    originProvince: string;
    originDistrict: string;
    originVillage: string;
    currentProvince: string;
    currentDistrict: string;
    currentVillage: string;
    homeAddress: string;
    relation: string;
    guardianTazkira: string;
    guardianPicturePath: string;
    zaminName: string;
    zaminPhone: string;
    zaminTazkira: string;
    zaminAddress: string;
    studentPicture: string;
    admissionFeeStatus: string;
    orphanStatus: string;
    disabilityStatus: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    familyIncome: string;
    educationalHistory: string;
    studentDocuments: string;
    disciplineRecords: string;
    cardNumber: string;
    admissionYear: string;
    hasParents: string;
    paid: string;
    pending: string;
    waived: string;
    partial: string;
    selectGender: string;
    feeStatus: string;
    originAddress: string;
    currentAddress: string;
    noOriginAddress: string;
    noCurrentAddress: string;
    noGuardianInfo: string;
    guarantorInfo: string;
    noGuarantorInfo: string;
    emergencyInfo: string;
    financialInfo: string;
    noEmergencyInfo: string;
    noFinancialInfo: string;
    // Documents dialog
    documentsDescription: string;
    uploadDocument: string;
    uploadDocumentDescription: string;
    selectFile: string;
    documentType: string;
    documentTypePlaceholder: string;
    description: string;
    descriptionPlaceholder: string;
    fileName: string;
    fileSize: string;
    uploadDate: string;
    noDocuments: string;
    deleteDocument: string;
    deleteDocumentConfirm: string;
    viewDocument: string;
    viewDocumentError: string;
    imageLoadError: string;
    pdfLoadError: string;
    unsupportedFileType: string;
    noDocumentToView: string;
    // Educational history dialog
    educationalHistoryDescription: string;
    addHistory: string;
    editHistory: string;
    deleteHistory: string;
    deleteHistoryConfirm: string;
    institutionName: string;
    institutionPlaceholder: string;
    academicYear: string;
    academicYearPlaceholder: string;
    gradeLevel: string;
    gradeLevelPlaceholder: string;
    period: string;
    startDate: string;
    endDate: string;
    achievements: string;
    achievementsPlaceholder: string;
    notes: string;
    notesPlaceholder: string;
    noEducationalHistory: string;
    educationalHistoryFormDescription: string;
    // Discipline records dialog
    disciplineRecordsDescription: string;
    addDisciplineRecord: string;
    editDisciplineRecord: string;
    deleteDisciplineRecord: string;
    deleteDisciplineConfirm: string;
    incidentDate: string;
    incidentType: string;
    incidentTypePlaceholder: string;
    severity: string;
    severityMinor: string;
    severityModerate: string;
    severityMajor: string;
    severitySevere: string;
    actionTaken: string;
    actionTakenPlaceholder: string;
    resolved: string;
    disciplinePending: string;
    markResolved: string;
    noDisciplineRecords: string;
    disciplineRecordFormDescription: string;
    disciplineDescriptionPlaceholder: string;
  };

  // Admissions
  admissions: {
    title: string;
    subtitle: string;
    add: string;
    list: string;
    listDescription: string;
    school: string;
    allSchools: string;
    status: string;
    allStatus: string;
    pending: string;
    admitted: string;
    active: string;
    inactive: string;
    suspended: string;
    withdrawn: string;
    graduated: string;
    residency: string;
    allResidency: string;
    room: string;
    class: string;
    actions: string;
    noDataFound: string;
    admissionNo: string;
    year: string;
    boarder: string;
    // Dialog
    admitStudentFromRegistration: string;
    updateAdmission: string;
    admitStudent: string;
    dialogDescription: string;
    studentFromRegistration: string;
    chooseStudent: string;
    selectSchool: string;
    academicYear: string;
    selectAcademicYear: string;
    classSection: string;
    selectClassSection: string;
    residencyType: string;
    selectResidency: string;
    roomDorm: string;
    assignRoom: string;
    admissionYear: string;
    admissionDate: string;
    enrollmentStatus: string;
    enrollmentType: string;
    enrollmentTypePlaceholder: string;
    shift: string;
    shiftPlaceholder: string;
    feeStatus: string;
    feeStatusPlaceholder: string;
    boarderYes: string;
    boarderNo: string;
    placementNotes: string;
    placementNotesPlaceholder: string;
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

  // Timetable (UI strings used in generator and dialogs)
  timetable: {
    title: string;
    generate: string;
    save: string;
    load: string;
    loadDesc: string;
    selectClasses: string;
    selectDays: string;
    selectPeriods: string;
    teacherPreferences: string;
    teacherPreferencesDesc: string;
    allYear: string;
    summary: string;
    unscheduledNotice: string;
    results: string;
    teacherView: string;
    classView: string;
    teacher: string;
    class: string;
    name: string;
    description: string;
    periods: string;
    selectTeacher: string;
    exportExcel: string;
    exportPdf: string;
    print: string;
  };
}

// English translations
const en: TranslationKeys = {
  common: {
    loading: 'Loading...',
    save: 'Save',
    saving: 'Saving...',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
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
    upload: 'Upload',
    uploading: 'Uploading...',
    download: 'Download',
    actions: 'Actions',
    all: 'All',
    years: 'years',
  },
  pagination: {
    showing: 'Showing',
    to: 'to',
    of: 'of',
    entries: 'entries',
    total: 'Total',
    noEntries: 'No entries',
    rowsPerPage: 'Rows per page',
  },
  nav: {
    dashboard: 'Dashboard',
    students: 'Students',
    admissions: 'Admissions',
    studentManagement: 'Student Management',
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
    academicManagement: 'Academic Management',
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
    subtitle: 'Manage admissions with complete Afghan student records',
    add: 'Register Student',
    addDescription: 'Capture admission details with guardian and residency information.',
    list: 'Student Registrations',
    listDescription: 'Search, filter and update admissions.',
    addStudent: 'Add Student',
    studentProfile: 'Student Profile',
    personalInfo: 'Personal Information',
    guardianInfo: 'Guardian Information',
    academicInfo: 'Academic Information',
    admissionInfo: 'Admission Information',
    addressInfo: 'Address Information',
    otherInfo: 'Other Information',
    health: 'Health Information',
    documents: 'Documents',
    name: 'Name',
    fatherName: "Father's Name",
    guardianName: 'Guardian Name',
    guardianPhone: 'Guardian Phone',
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
    male: 'Male',
    female: 'Female',
    orphan: 'Orphan',
    total: 'Total Students',
    noStudentsFound: 'No students found',
    noStudentsMessage: 'Try adjusting your search criteria or add a new student.',
    applied: 'Applied',
    withdrawn: 'Withdrawn',
    allSchools: 'All Schools',
    allOrganizations: 'All Organizations',
    organization: 'Organization',
    acrossSelected: 'Across selected organization',
    registeredMale: 'Registered male students',
    registeredFemale: 'Registered female students',
    needingSpecial: 'Needing special care',
    printProfile: 'Print Profile',
    viewProfile: 'View Profile',
    applyingGrade: 'Applying Grade',
    school: 'School',
    gender: 'Gender',
    father: 'Father',
    guardian: 'Guardian',
    noDataFound: 'No data found.',
    deleteStudentRecord: 'Delete student record?',
    deleteStudentDescription: 'Removing this student will keep the audit trail but hide it from admissions lists.',
    updateDescription: 'Update registration and guardian details.',
    selectSchool: 'Select school',
    potentialDuplicate: 'Potential duplicate found',
    proceedCreate: 'Do you still want to proceed creating a new record?',
    fullName: 'Full Name',
    grandfatherName: 'Grandfather Name',
    motherName: 'Mother Name',
    birthYear: 'Birth Year',
    birthDate: 'Birth Date',
    age: 'Age',
    preferredLanguage: 'Preferred Language',
    nationality: 'Nationality',
    previousSchool: 'Previous School',
    originProvince: 'Origin Province',
    originDistrict: 'Origin District',
    originVillage: 'Origin Village',
    currentProvince: 'Current Province',
    currentDistrict: 'Current District',
    currentVillage: 'Current Village',
    homeAddress: 'Home Address',
    relation: 'Relation',
    guardianTazkira: 'Guardian Tazkira',
    guardianPicturePath: 'Guardian Picture Path',
    zaminName: 'Zamin/Guarantor Name',
    zaminPhone: 'Zamin Phone',
    zaminTazkira: 'Zamin Tazkira',
    zaminAddress: 'Zamin Address',
    studentPicture: 'Student Picture',
    admissionFeeStatus: 'Admission Fee Status',
    orphanStatus: 'Orphan Status',
    disabilityStatus: 'Disability Status',
    emergencyContactName: 'Emergency Contact Name',
    emergencyContactPhone: 'Emergency Contact Phone',
    familyIncome: 'Family Income / Support Details',
    educationalHistory: 'Educational History',
    studentDocuments: 'Student Documents',
    disciplineRecords: 'Discipline Records',
    cardNumber: 'Card Number',
    admissionYear: 'Admission Year',
    hasParents: 'Has parents',
    paid: 'Paid',
    pending: 'Pending',
    waived: 'Waived',
    partial: 'Partial',
    selectGender: 'Select gender',
    feeStatus: 'Fee status',
    originAddress: 'Origin Address',
    currentAddress: 'Current Address',
    noOriginAddress: 'No origin address recorded',
    noCurrentAddress: 'No current address recorded',
    noGuardianInfo: 'No guardian information recorded',
    guarantorInfo: 'Guarantor (Zamin) Information',
    noGuarantorInfo: 'No guarantor information recorded',
    emergencyInfo: 'Emergency & Special Information',
    financialInfo: 'Financial & Support Information',
    noEmergencyInfo: 'No emergency information recorded',
    noFinancialInfo: 'No financial information recorded',
    // Documents dialog
    documentsDescription: 'Manage documents for',
    uploadDocument: 'Upload Document',
    uploadDocumentDescription: 'Upload a document for this student',
    selectFile: 'Select File',
    documentType: 'Document Type',
    documentTypePlaceholder: 'e.g., Birth Certificate, Tazkira',
    description: 'Description',
    descriptionPlaceholder: 'Optional description',
    fileName: 'File Name',
    fileSize: 'Size',
    uploadDate: 'Upload Date',
    noDocuments: 'No documents uploaded yet',
    deleteDocument: 'Delete Document',
    deleteDocumentConfirm: 'Are you sure you want to delete this document? This action cannot be undone.',
    viewDocument: 'View Document',
    viewDocumentError: 'Failed to load document',
    imageLoadError: 'Failed to load image',
    pdfLoadError: 'Failed to load PDF',
    unsupportedFileType: 'This file type cannot be previewed. Please download to view.',
    noDocumentToView: 'No document to view',
    // Educational history dialog
    educationalHistoryDescription: 'View and manage educational history for',
    addHistory: 'Add History',
    editHistory: 'Edit Educational History',
    deleteHistory: 'Delete Educational History',
    deleteHistoryConfirm: 'Are you sure you want to delete this educational history record? This action cannot be undone.',
    institutionName: 'Institution Name',
    institutionPlaceholder: 'School or institution name',
    academicYear: 'Academic Year',
    academicYearPlaceholder: '1403',
    gradeLevel: 'Grade Level',
    gradeLevelPlaceholder: '5',
    period: 'Period',
    startDate: 'Start Date',
    endDate: 'End Date',
    achievements: 'Achievements',
    achievementsPlaceholder: 'Any achievements or awards',
    notes: 'Notes',
    notesPlaceholder: 'Additional notes',
    noEducationalHistory: 'No educational history recorded',
    educationalHistoryFormDescription: 'Enter the educational history details',
    // Discipline records dialog
    disciplineRecordsDescription: 'View and manage discipline records for',
    addDisciplineRecord: 'Add Record',
    editDisciplineRecord: 'Edit Discipline Record',
    deleteDisciplineRecord: 'Delete Discipline Record',
    deleteDisciplineConfirm: 'Are you sure you want to delete this discipline record? This action cannot be undone.',
    incidentDate: 'Incident Date',
    incidentType: 'Incident Type',
    incidentTypePlaceholder: 'e.g., Tardiness, Fighting',
    severity: 'Severity',
    severityMinor: 'Minor',
    severityModerate: 'Moderate',
    severityMajor: 'Major',
    severitySevere: 'Severe',
    actionTaken: 'Action Taken',
    actionTakenPlaceholder: 'What action was taken',
    resolved: 'Resolved',
    disciplinePending: 'Pending',
    markResolved: 'Mark Resolved',
    noDisciplineRecords: 'No discipline records',
    disciplineRecordFormDescription: 'Enter the discipline record details',
    disciplineDescriptionPlaceholder: 'Describe the incident',
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
    timetable: {
      days: {
        title: 'Days of the Week',
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
  timetable: {
    title: 'Timetable Generation',
    generate: 'Generate',
    save: 'Save Timetable',
    load: 'Load Timetable',
    loadDesc: 'Select a saved timetable to load.',
    selectClasses: 'Select Classes',
    selectDays: 'Select Days',
    selectPeriods: 'Select Periods',
    teacherPreferences: 'Teacher Preferences',
    teacherPreferencesDesc: 'Mark slots the selected teacher cannot teach (blocked periods).',
    allYear: 'All Year',
    summary: 'Select classes, days, and periods, then click Generate.',
    unscheduledNotice: 'assignments could not be scheduled',
    results: 'Results',
    teacherView: 'Teacher View',
    classView: 'Class View',
    teacher: 'Teacher',
    class: 'Class',
    name: 'Name',
    description: 'Description',
    periods: 'Periods',
    selectTeacher: 'Select Teacher',
    exportExcel: 'Export to Excel',
    exportPdf: 'Export to PDF',
    print: 'Print',
  },
  admissions: {
    title: 'Student Admissions',
    subtitle: 'Admit registered students into classes with residency and year tracking.',
    add: 'Admit Student',
    list: 'Admissions',
    listDescription: 'Overview of class placements and residency tracking.',
    school: 'School',
    allSchools: 'All Schools',
    status: 'Status',
    allStatus: 'All Status',
    pending: 'Pending',
    admitted: 'Admitted',
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    withdrawn: 'Withdrawn',
    graduated: 'Graduated',
    residency: 'Residency',
    allResidency: 'All Residency',
    room: 'Room',
    class: 'Class',
    actions: 'Actions',
    noDataFound: 'No data found.',
    admissionNo: 'Adm',
    year: 'Year',
    boarder: 'Boarder',
    // Dialog
    admitStudentFromRegistration: 'Admit student from registration',
    updateAdmission: 'Update admission',
    admitStudent: 'Admit student',
    dialogDescription: 'Map a registered learner into a class, academic year, and residency type with status tracking.',
    studentFromRegistration: 'Student (from registration)',
    chooseStudent: 'Choose student',
    selectSchool: 'Select school',
    academicYear: 'Academic Year',
    selectAcademicYear: 'Select academic year',
    classSection: 'Class / Section',
    selectClassSection: 'Select class & section',
    residencyType: 'Residency Type',
    selectResidency: 'Select residency',
    roomDorm: 'Room / Dorm',
    assignRoom: 'Assign room',
    admissionYear: 'Admission Year',
    admissionDate: 'Admission Date',
    enrollmentStatus: 'Enrollment Status',
    enrollmentType: 'Enrollment Type',
    enrollmentTypePlaceholder: 'Boarder / Day scholar',
    shift: 'Shift',
    shiftPlaceholder: 'Morning / Evening',
    feeStatus: 'Fee Status',
    feeStatusPlaceholder: 'Paid / Partial / Waived',
    boarderYes: 'Boarder',
    boarderNo: 'Day scholar',
    placementNotes: 'Placement Notes',
    placementNotesPlaceholder: 'Health, guardian approvals, or special considerations',
  },
};

// Pashto translations
const ps: TranslationKeys = {
  common: {
    loading: 'بارول کیږي...',
    save: 'ساتل',
    saving: 'ساتل کیږي...',
    cancel: 'منسوخ',
    delete: 'پاک کول',
    edit: 'تغیر',
    view: 'کتل',
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
    upload: 'پورته کول',
    uploading: 'پورته کول کیږي...',
    download: 'ډاونلوډ',
    actions: 'کړنې',
    all: 'ټول',
    years: 'کلونه',
  },
  pagination: {
    showing: 'ښودل کیږي',
    to: 'تر',
    of: 'د',
    entries: 'ریکارډونه',
    total: 'ټول',
    noEntries: 'هیڅ ریکارډونه نشته',
    rowsPerPage: 'قطارونه په پاڼه',
  },
  nav: {
    dashboard: 'کنټرول پینل',
    students: 'زده کوونکي',
    admissions: 'داخلې',
    studentManagement: 'د زده کوونکو مدیریت',
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
    academicManagement: 'د علمي مدیریت',
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
    subtitle: 'د افغان زده کوونکو بشپړو ریکارډونو سره د داخلې مدیریت',
    add: 'زده کوونکی ثبت کړئ',
    addDescription: 'د سرپرست او استوګنځای معلوماتو سره د داخلې جزئیات ثبت کړئ.',
    list: 'د زده کوونکو ثبتونه',
    listDescription: 'د داخلې لټون، فلټر او تازه کول.',
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
    applied: 'غوښتل شوی',
    withdrawn: 'واستول شوی',
    allSchools: 'ټول ښوونځي',
    allOrganizations: 'ټول سازمانونه',
    organization: 'سازمان',
    acrossSelected: 'د غوره شوي سازمان په واسطه',
    registeredMale: 'ثبت شوي نارینه زده کوونکي',
    registeredFemale: 'ثبت شوي ښځینه زده کوونکي',
    needingSpecial: 'د ځانګړي پاملرنې ته اړتیا لري',
    printProfile: 'پروفایل چاپ کړئ',
    viewProfile: 'پروفایل وګورئ',
    applyingGrade: 'د داخلې درجه',
    school: 'ښوونځی',
    gender: 'جنس',
    male: 'نارینه',
    female: 'ښځینه',
    orphan: 'یتیم',
    total: 'ټول زده کوونکي',
    father: 'پلار',
    guardian: 'سرپرست',
    guardianName: 'د سرپرست نوم',
    guardianPhone: 'د سرپرست ټیلیفون',
    noDataFound: 'هیڅ معلومات ونه موندل شول.',
    deleteStudentRecord: 'د زده کوونکي ریکارډ پاک کړئ؟',
    deleteStudentDescription: 'د دې زده کوونکي لرې کول به د ساتنې نښه وساتي مګر د داخلې لیستونو څخه به پټ کړي.',
    updateDescription: 'د ثبت او سرپرست معلومات تازه کړئ.',
    selectSchool: 'ښوونځی وټاکئ',
    potentialDuplicate: 'د تکرار احتمالي شتون',
    proceedCreate: 'ایا تاسو لاهم غواړئ چې نوی ریکارډ جوړ کړئ؟',
    admissionInfo: 'د داخلې معلومات',
    addressInfo: 'د ادرس معلومات',
    otherInfo: 'نور معلومات',
    fullName: 'بشپړ نوم',
    grandfatherName: 'د نیکه نوم',
    motherName: 'د مور نوم',
    birthYear: 'د زیږون کال',
    birthDate: 'د زیږون نیټه',
    age: 'عمر',
    preferredLanguage: 'غوره ژبه',
    nationality: 'تابعیت',
    previousSchool: 'پخوانی ښوونځی',
    originProvince: 'اصلي ولایت',
    originDistrict: 'اصلي ولسوالۍ',
    originVillage: 'اصلي کلی',
    currentProvince: 'فعلي ولایت',
    currentDistrict: 'فعلي ولسوالۍ',
    currentVillage: 'فعلي کلی',
    homeAddress: 'کورنۍ ادرس',
    relation: 'تړاو',
    guardianTazkira: 'د سرپرست تذکره',
    guardianPicturePath: 'د سرپرست انځور',
    zaminName: 'د ضامن نوم',
    zaminPhone: 'د ضامن ټیلیفون',
    zaminTazkira: 'د ضامن تذکره',
    zaminAddress: 'د ضامن ادرس',
    studentPicture: 'د زده کوونکي انځور',
    admissionFeeStatus: 'د داخلې فیس حالت',
    orphanStatus: 'یتیم حالت',
    disabilityStatus: 'د معلولیت حالت',
    emergencyContactName: 'د اضطراري اړیکو نوم',
    emergencyContactPhone: 'د اضطراري اړیکو ټیلیفون',
    familyIncome: 'د کورنۍ عاید / ملاتړ جزئیات',
    educationalHistory: 'د زده کړو تاریخچه',
    studentDocuments: 'د زده کوونکي اسناد',
    disciplineRecords: 'د نظم ریکارډونه',
    cardNumber: 'کارډ نمبر',
    admissionYear: 'د داخلې کال',
    hasParents: 'والدین لري',
    paid: 'ورکړل شوی',
    pending: 'پاتې',
    waived: 'معاف شوی',
    partial: 'نیمه',
    selectGender: 'جنس وټاکئ',
    feeStatus: 'د فیس حالت',
    originAddress: 'اصلي ادرس',
    currentAddress: 'فعلي ادرس',
    noOriginAddress: 'اصلي ادرس ثبت نه دی شوی',
    noCurrentAddress: 'فعلي ادرس ثبت نه دی شوی',
    noGuardianInfo: 'د سرپرست معلومات ثبت نه دي شوي',
    guarantorInfo: 'د ضامن معلومات',
    noGuarantorInfo: 'د ضامن معلومات ثبت نه دي شوي',
    emergencyInfo: 'اضطراري او ځانګړي معلومات',
    financialInfo: 'مالي او ملاتړ معلومات',
    noEmergencyInfo: 'اضطراري معلومات ثبت نه دي شوي',
    noFinancialInfo: 'مالي معلومات ثبت نه دي شوي',
    // Documents dialog
    documentsDescription: 'د اسنادو مدیریت د',
    uploadDocument: 'سند پورته کړئ',
    uploadDocumentDescription: 'د دې زده کوونکي لپاره سند پورته کړئ',
    selectFile: 'فایل وټاکئ',
    documentType: 'د سند ډول',
    documentTypePlaceholder: 'لکه د زیږون سند، تذکره',
    description: 'توضیحات',
    descriptionPlaceholder: 'اختیاري توضیحات',
    fileName: 'د فایل نوم',
    fileSize: 'اندازه',
    uploadDate: 'د پورته کولو نیټه',
    noDocuments: 'تر اوسه سندونه نه دي پورته شوي',
    deleteDocument: 'سند پاک کړئ',
    deleteDocumentConfirm: 'ایا ډاډه یاست چې دا سند پاک کړئ؟ دا عمل نه شي بیرته راوستل کیدای.',
    viewDocument: 'سند وګورئ',
    viewDocumentError: 'د سند پورته کولو کې ستونزه',
    imageLoadError: 'د انځور پورته کولو کې ستونزه',
    pdfLoadError: 'د PDF پورته کولو کې ستونزه',
    unsupportedFileType: 'دا د فایل ډول نشي کیدای وښودل شي. د لیدو لپاره ډاونلوډ کړئ.',
    noDocumentToView: 'د لیدو لپاره سند نشته',
    // Educational history dialog
    educationalHistoryDescription: 'د زده کړو تاریخچه وګورئ او مدیریت یې کړئ د',
    addHistory: 'تاریخچه اضافه کړئ',
    editHistory: 'د زده کړو تاریخچه ویرایش کړئ',
    deleteHistory: 'د زده کړو تاریخچه پاک کړئ',
    deleteHistoryConfirm: 'ایا ډاډه یاست چې دا د زده کړو تاریخچه پاک کړئ؟ دا عمل نه شي بیرته راوستل کیدای.',
    institutionName: 'د موسسې نوم',
    institutionPlaceholder: 'د ښوونځي یا موسسې نوم',
    academicYear: 'تعلیمي کال',
    academicYearPlaceholder: '۱۴۰۳',
    gradeLevel: 'صنف',
    gradeLevelPlaceholder: '۵',
    period: 'موده',
    startDate: 'د پیل نیټه',
    endDate: 'د پای نیټه',
    achievements: 'لاسته راوړنې',
    achievementsPlaceholder: 'هر ډول لاسته راوړنې یا جایزې',
    notes: 'یادښتونه',
    notesPlaceholder: 'اضافي یادښتونه',
    noEducationalHistory: 'د زده کړو تاریخچه ثبت نه ده شوې',
    educationalHistoryFormDescription: 'د زده کړو تاریخچه جزئیات داخل کړئ',
    // Discipline records dialog
    disciplineRecordsDescription: 'د نظم ریکارډونه وګورئ او مدیریت یې کړئ د',
    addDisciplineRecord: 'ریکارډ اضافه کړئ',
    editDisciplineRecord: 'د نظم ریکارډ ویرایش کړئ',
    deleteDisciplineRecord: 'د نظم ریکارډ پاک کړئ',
    deleteDisciplineConfirm: 'ایا ډاډه یاست چې دا د نظم ریکارډ پاک کړئ؟ دا عمل نه شي بیرته راوستل کیدای.',
    incidentDate: 'د پیښې نیټه',
    incidentType: 'د پیښې ډول',
    incidentTypePlaceholder: 'لکه ناوخته راتلل، جنګ',
    severity: 'شدت',
    severityMinor: 'کم',
    severityModerate: 'منځنی',
    severityMajor: 'لوی',
    severitySevere: 'سخت',
    actionTaken: 'ترسره شوی اقدام',
    actionTakenPlaceholder: 'څه اقدام ترسره شوی',
    resolved: 'حل شوی',
    disciplinePending: 'پاتې',
    markResolved: 'حل شوی په توګه نښه کړئ',
    noDisciplineRecords: 'د نظم ریکارډونه نشته',
    disciplineRecordFormDescription: 'د نظم ریکارډ جزئیات داخل کړئ',
    disciplineDescriptionPlaceholder: 'پیښه تشریح کړئ',
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
  timetable: {
    title: 'د مهال ویش جوړول',
    generate: 'جوړول',
    save: 'مهال ویش خوندي کول',
    load: 'مهال ویش لور کول',
    loadDesc: 'خوندي شوی مهال ویش وټاکئ.',
    selectClasses: 'ټولګي انتخاب کړئ',
    selectDays: 'ورځې انتخاب کړئ',
    selectPeriods: 'ساعتونه انتخاب کړئ',
    teacherPreferences: 'د استادانو ځانګړي وختونه',
    teacherPreferencesDesc: 'هغه ساعتونه وټاکئ چې استاد پکې درس نه شي ورکولای.',
    allYear: 'دائمي',
    summary: 'ټولګي، ورځې او ساعتونه وټاکئ او بیا جوړول کلیک کړئ.',
    unscheduledNotice: 'دندې مهال‌ویش نه شوې',
    results: 'پایلې',
    teacherView: 'د استادانو لید',
    classView: 'د ټولګیو لید',
    teacher: 'استاد',
    class: 'ټولګی',
    name: 'نوم',
    description: 'تفصیل',
    periods: 'ساعتونه',
    selectTeacher: 'استاد انتخاب کړئ',
    exportExcel: 'د Excel لپاره صادرول',
    exportPdf: 'د PDF لپاره صادرول',
    print: 'چاپول',
  },
  admissions: {
    title: 'د زده کوونکو داخلې',
    subtitle: 'د ثبت شویو زده کوونکو د ټولګیو، کورنۍ او کال د تعقیب سره داخلول.',
    add: 'زده کوونکی داخل کړئ',
    list: 'داخلې',
    listDescription: 'د ټولګیو د ځای پرځای کولو او د کورنۍ د تعقیب عمومي کتنه.',
    school: 'ښوونځی',
    allSchools: 'ټول ښوونځي',
    status: 'حالت',
    allStatus: 'ټول حالتونه',
    pending: 'پاتې',
    admitted: 'داخل شوی',
    active: 'فعال',
    inactive: 'غیر فعال',
    suspended: 'تعلیق شوی',
    withdrawn: 'واستل شوی',
    graduated: 'فارغ شوی',
    residency: 'کورنۍ',
    allResidency: 'ټول کورنۍ',
    room: 'خونه',
    class: 'ټولګی',
    actions: 'کړنې',
    noDataFound: 'هیڅ معلومات ونه موندل شول.',
    admissionNo: 'داخلې',
    year: 'کال',
    boarder: 'خوابګاه',
    // Dialog
    admitStudentFromRegistration: 'د ثبت شوي زده کوونکی د داخلې',
    updateAdmission: 'د داخلې تازه کول',
    admitStudent: 'زده کوونکی داخل کړئ',
    dialogDescription: 'د ثبت شوی زده کوونکی د ټولګی، د زده کړو کال او د کورنۍ ډول سره د حالت د تعقیب سره تړل.',
    studentFromRegistration: 'زده کوونکی (د ثبت څخه)',
    chooseStudent: 'زده کوونکی وټاکئ',
    studentRequired: 'زده کوونکی اړین دی',
    selectSchool: 'ښوونځی وټاکئ',
    academicYear: 'د زده کړو کال',
    selectAcademicYear: 'د زده کړو کال وټاکئ',
    classSection: 'ټولګی / برخه',
    selectClassSection: 'ټولګی او برخه وټاکئ',
    residencyType: 'د کورنۍ ډول',
    selectResidency: 'کورنۍ وټاکئ',
    roomDorm: 'خونه / خوابګاه',
    assignRoom: 'خونه وټاکئ',
    admissionYear: 'د داخلې کال',
    admissionDate: 'د داخلې نیټه',
    enrollmentStatus: 'د نوم لیکنې حالت',
    enrollmentType: 'د نوم لیکنې ډول',
    enrollmentTypePlaceholder: 'خوابګاه / ورځنی زده کوونکی',
    shift: 'شیفت',
    shiftPlaceholder: 'سهار / ماښام',
    feeStatus: 'د فیس حالت',
    feeStatusPlaceholder: 'ورکړل شوی / نیمه / معاف شوی',
    boarderYes: 'خوابګاه',
    boarderNo: 'ورځنی زده کوونکی',
    placementNotes: 'د ځای پرځای کولو یادښتونه',
    placementNotesPlaceholder: 'روغتیا، د سرپرست تصویبونه، یا ځانګړي پاملرنې',
  },
};

// Dari (Farsi) translations
const fa: TranslationKeys = {
  common: {
    loading: 'در حال بارگذاری...',
    save: 'ذخیره',
    saving: 'در حال ذخیره...',
    cancel: 'لغو',
    delete: 'حذف',
    edit: 'ویرایش',
    view: 'مشاهده',
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
    upload: 'آپلود',
    uploading: 'در حال آپلود...',
    download: 'دانلود',
    actions: 'اقدامات',
    all: 'همه',
    years: 'سال',
  },
  pagination: {
    showing: 'نمایش',
    to: 'تا',
    of: 'از',
    entries: 'رکورد',
    total: 'مجموع',
    noEntries: 'رکوردی وجود ندارد',
    rowsPerPage: 'ردیف در صفحه',
  },
  nav: {
    dashboard: 'داشبورد',
    students: 'دانش‌آموزان',
    admissions: 'پذیرش',
    studentManagement: 'مدیریت دانش‌آموزان',
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
    academicManagement: 'مدیریت آکادمیک',
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
    subtitle: 'مدیریت پذیرش با سوابق کامل دانش‌آموزان افغان',
    add: 'ثبت دانش‌آموز',
    addDescription: 'ثبت جزئیات پذیرش با اطلاعات سرپرست و محل اقامت.',
    list: 'ثبت‌نام دانش‌آموزان',
    listDescription: 'جستجو، فیلتر و به‌روزرسانی پذیرش‌ها.',
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
    applied: 'درخواست شده',
    withdrawn: 'انصراف داده شده',
    allSchools: 'همه مدارس',
    allOrganizations: 'همه سازمان‌ها',
    organization: 'سازمان',
    acrossSelected: 'در سازمان انتخاب شده',
    registeredMale: 'دانش‌آموزان پسر ثبت‌نام شده',
    registeredFemale: 'دانش‌آموزان دختر ثبت‌نام شده',
    needingSpecial: 'نیازمند مراقبت ویژه',
    printProfile: 'چاپ پروفایل',
    viewProfile: 'مشاهده پروفایل',
    applyingGrade: 'درجه درخواستی',
    school: 'مدرسه',
    gender: 'جنسیت',
    male: 'پسر',
    female: 'دختر',
    orphan: 'یتیم',
    total: 'کل دانش‌آموزان',
    father: 'پدر',
    guardian: 'سرپرست',
    guardianName: 'نام سرپرست',
    guardianPhone: 'تلفن سرپرست',
    noDataFound: 'اطلاعاتی یافت نشد.',
    deleteStudentRecord: 'حذف رکورد دانش‌آموز؟',
    deleteStudentDescription: 'حذف این دانش‌آموز مسیر حسابرسی را حفظ می‌کند اما آن را از لیست‌های پذیرش پنهان می‌کند.',
    updateDescription: 'به‌روزرسانی جزئیات ثبت‌نام و سرپرست.',
    selectSchool: 'انتخاب مدرسه',
    potentialDuplicate: 'تکرار احتمالی یافت شد',
    proceedCreate: 'آیا هنوز می‌خواهید یک رکورد جدید ایجاد کنید؟',
    admissionInfo: 'اطلاعات پذیرش',
    addressInfo: 'اطلاعات آدرس',
    otherInfo: 'اطلاعات دیگر',
    fullName: 'نام کامل',
    grandfatherName: 'نام پدربزرگ',
    motherName: 'نام مادر',
    birthYear: 'سال تولد',
    birthDate: 'تاریخ تولد',
    age: 'سن',
    preferredLanguage: 'زبان ترجیحی',
    nationality: 'ملیت',
    previousSchool: 'مدرسه قبلی',
    originProvince: 'ولایت اصلی',
    originDistrict: 'ولسوالی اصلی',
    originVillage: 'قریه اصلی',
    currentProvince: 'ولایت فعلی',
    currentDistrict: 'ولسوالی فعلی',
    currentVillage: 'قریه فعلی',
    homeAddress: 'آدرس منزل',
    relation: 'رابطه',
    guardianTazkira: 'تذکره سرپرست',
    guardianPicturePath: 'مسیر تصویر سرپرست',
    zaminName: 'نام ضامن',
    zaminPhone: 'تلفن ضامن',
    zaminTazkira: 'تذکره ضامن',
    zaminAddress: 'آدرس ضامن',
    studentPicture: 'تصویر دانش‌آموز',
    admissionFeeStatus: 'وضعیت هزینه پذیرش',
    orphanStatus: 'وضعیت یتیم',
    disabilityStatus: 'وضعیت معلولیت',
    emergencyContactName: 'نام تماس اضطراری',
    emergencyContactPhone: 'تلفن تماس اضطراری',
    familyIncome: 'درآمد خانواده / جزئیات حمایت',
    educationalHistory: 'تاریخچه تحصیلی',
    studentDocuments: 'اسناد دانش‌آموز',
    disciplineRecords: 'سوابق انضباطی',
    cardNumber: 'شماره کارت',
    admissionYear: 'سال پذیرش',
    hasParents: 'والدین دارد',
    paid: 'پرداخت شده',
    pending: 'در انتظار',
    waived: 'معاف شده',
    partial: 'جزئی',
    selectGender: 'انتخاب جنسیت',
    feeStatus: 'وضعیت هزینه',
    originAddress: 'آدرس اصلی',
    currentAddress: 'آدرس فعلی',
    noOriginAddress: 'هیچ آدرس اصلی ثبت نشده است',
    noCurrentAddress: 'هیچ آدرس فعلی ثبت نشده است',
    noGuardianInfo: 'هیچ اطلاعات سرپرست ثبت نشده است',
    guarantorInfo: 'اطلاعات ضامن (زمین)',
    noGuarantorInfo: 'هیچ اطلاعات ضامن ثبت نشده است',
    emergencyInfo: 'اطلاعات اضطراری و ویژه',
    financialInfo: 'اطلاعات مالی و پشتیبانی',
    noEmergencyInfo: 'هیچ اطلاعات اضطراری ثبت نشده است',
    noFinancialInfo: 'هیچ اطلاعات مالی ثبت نشده است',
    // Documents dialog
    documentsDescription: 'مدیریت اسناد برای',
    uploadDocument: 'آپلود سند',
    uploadDocumentDescription: 'یک سند برای این دانش‌آموز آپلود کنید',
    selectFile: 'فایل را انتخاب کنید',
    documentType: 'نوع سند',
    documentTypePlaceholder: 'مثلا، شناسنامه، تذکره',
    description: 'توضیحات',
    descriptionPlaceholder: 'توضیحات اختیاری',
    fileName: 'نام فایل',
    fileSize: 'اندازه',
    uploadDate: 'تاریخ آپلود',
    noDocuments: 'هنوز سندی آپلود نشده است',
    deleteDocument: 'حذف سند',
    deleteDocumentConfirm: 'آیا مطمئن هستید که می‌خواهید این سند را حذف کنید؟ این عمل قابل بازگشت نیست.',
    viewDocument: 'مشاهده سند',
    viewDocumentError: 'بارگذاری سند ناموفق بود',
    imageLoadError: 'بارگذاری تصویر ناموفق بود',
    pdfLoadError: 'بارگذاری PDF ناموفق بود',
    unsupportedFileType: 'این نوع فایل قابل پیش‌نمایش نیست. برای مشاهده دانلود کنید.',
    noDocumentToView: 'سندی برای مشاهده وجود ندارد',
    // Educational history dialog
    educationalHistoryDescription: 'مشاهده و مدیریت تاریخچه تحصیلی برای',
    addHistory: 'افزودن تاریخچه',
    editHistory: 'ویرایش تاریخچه تحصیلی',
    deleteHistory: 'حذف تاریخچه تحصیلی',
    deleteHistoryConfirm: 'آیا مطمئن هستید که می‌خواهید این تاریخچه تحصیلی را حذف کنید؟ این عمل قابل بازگشت نیست.',
    institutionName: 'نام موسسه',
    institutionPlaceholder: 'نام مدرسه یا موسسه',
    academicYear: 'سال تحصیلی',
    academicYearPlaceholder: '۱۴۰۳',
    gradeLevel: 'صنف',
    gradeLevelPlaceholder: '۵',
    period: 'دوره',
    startDate: 'تاریخ شروع',
    endDate: 'تاریخ پایان',
    achievements: 'دستاوردها',
    achievementsPlaceholder: 'دستاوردها یا جوایز',
    notes: 'یادداشت‌ها',
    notesPlaceholder: 'یادداشت‌های اضافی',
    noEducationalHistory: 'تاریخچه تحصیلی ثبت نشده است',
    educationalHistoryFormDescription: 'جزئیات تاریخچه تحصیلی را وارد کنید',
    // Discipline records dialog
    disciplineRecordsDescription: 'مشاهده و مدیریت سوابق انضباطی برای',
    addDisciplineRecord: 'افزودن رکورد',
    editDisciplineRecord: 'ویرایش رکورد انضباطی',
    deleteDisciplineRecord: 'حذف رکورد انضباطی',
    deleteDisciplineConfirm: 'آیا مطمئن هستید که می‌خواهید این رکورد انضباطی را حذف کنید؟ این عمل قابل بازگشت نیست.',
    incidentDate: 'تاریخ حادثه',
    incidentType: 'نوع حادثه',
    incidentTypePlaceholder: 'مثلا، تأخیر، دعوا',
    severity: 'شدت',
    severityMinor: 'کم',
    severityModerate: 'متوسط',
    severityMajor: 'زیاد',
    severitySevere: 'شدید',
    actionTaken: 'اقدام انجام شده',
    actionTakenPlaceholder: 'چه اقدامی انجام شده',
    resolved: 'حل شده',
    disciplinePending: 'در انتظار',
    markResolved: 'علامت‌گذاری به عنوان حل شده',
    noDisciplineRecords: 'سوابق انضباطی ندارد',
    disciplineRecordFormDescription: 'جزئیات رکورد انضباطی را وارد کنید',
    disciplineDescriptionPlaceholder: 'حادثه را توصیف کنید',
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
  timetable: {
    title: 'ایجاد برنامهٔ زمانی',
    generate: 'ایجاد',
    save: 'ذخیرهٔ برنامهٔ زمانی',
    load: 'بارگذاری برنامهٔ زمانی',
    loadDesc: 'یک برنامهٔ زمانی ذخیره‌شده را انتخاب کنید.',
    selectClasses: 'انتخاب کلاس‌ها',
    selectDays: 'انتخاب روزها',
    selectPeriods: 'انتخاب ساعات',
    teacherPreferences: 'ترجیحات معلم',
    teacherPreferencesDesc: 'ساعات غیرقابل تدریس برای معلم را علامت بزنید.',
    allYear: 'طول سال',
    summary: 'کلاس‌ها، روزها و ساعات را انتخاب کرده سپس ایجاد را بزنید.',
    unscheduledNotice: 'تکالیف زمان‌بندی نشد',
    results: 'نتایج',
    teacherView: 'نمای معلم',
    classView: 'نمای کلاس',
    teacher: 'معلم',
    class: 'کلاس',
    name: 'نام',
    description: 'توضیحات',
    periods: 'ساعات',
    selectTeacher: 'انتخاب معلم',
    exportExcel: 'صدور به Excel',
    exportPdf: 'صدور به PDF',
    print: 'چاپ',
  },
  admissions: {
    title: 'پذیرش دانش‌آموزان',
    subtitle: 'دانش‌آموزان ثبت‌شده را در کلاس‌ها با ردیابی اقامت و سال پذیرش کنید.',
    add: 'پذیرش دانش‌آموز',
    list: 'پذیرش‌ها',
    listDescription: 'نمای کلی از قرارگیری کلاس و ردیابی اقامت.',
    school: 'مدرسه',
    allSchools: 'همه مدارس',
    status: 'وضعیت',
    allStatus: 'همه وضعیت‌ها',
    pending: 'در انتظار',
    admitted: 'پذیرفته شده',
    active: 'فعال',
    inactive: 'غیرفعال',
    suspended: 'تعلیق شده',
    withdrawn: 'انصراف داده',
    graduated: 'فارغ‌التحصیل',
    residency: 'اقامت',
    allResidency: 'همه اقامت‌ها',
    room: 'اتاق',
    class: 'کلاس',
    actions: 'اقدامات',
    noDataFound: 'هیچ داده‌ای یافت نشد.',
    admissionNo: 'پذیرش',
    year: 'سال',
    boarder: 'خوابگاه',
    // Dialog
    admitStudentFromRegistration: 'پذیرش دانش‌آموز از ثبت‌نام',
    updateAdmission: 'به‌روزرسانی پذیرش',
    admitStudent: 'پذیرش دانش‌آموز',
    dialogDescription: 'یک یادگیرنده ثبت‌شده را به یک کلاس، سال تحصیلی و نوع اقامت با ردیابی وضعیت متصل کنید.',
    studentFromRegistration: 'دانش‌آموز (از ثبت‌نام)',
    chooseStudent: 'دانش‌آموز را انتخاب کنید',
    studentRequired: 'دانش‌آموز الزامی است',
    selectSchool: 'مدرسه را انتخاب کنید',
    academicYear: 'سال تحصیلی',
    selectAcademicYear: 'سال تحصیلی را انتخاب کنید',
    classSection: 'کلاس / بخش',
    selectClassSection: 'کلاس و بخش را انتخاب کنید',
    residencyType: 'نوع اقامت',
    selectResidency: 'اقامت را انتخاب کنید',
    roomDorm: 'اتاق / خوابگاه',
    assignRoom: 'اتاق را اختصاص دهید',
    admissionYear: 'سال پذیرش',
    admissionDate: 'تاریخ پذیرش',
    enrollmentStatus: 'وضعیت ثبت‌نام',
    enrollmentType: 'نوع ثبت‌نام',
    enrollmentTypePlaceholder: 'خوابگاهی / روزانه',
    shift: 'شیفت',
    shiftPlaceholder: 'صبح / عصر',
    feeStatus: 'وضعیت هزینه',
    feeStatusPlaceholder: 'پرداخت شده / جزئی / معاف شده',
    boarderYes: 'خوابگاهی',
    boarderNo: 'روزانه',
    placementNotes: 'یادداشت‌های قرارگیری',
    placementNotesPlaceholder: 'سلامت، تأییدهای سرپرست، یا ملاحظات ویژه',
  },
};

// Arabic translations  
const ar: TranslationKeys = {
  common: {
    loading: 'جاري التحميل...',
    save: 'حفظ',
    saving: 'جاري الحفظ...',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    view: 'عرض',
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
    upload: 'رفع',
    uploading: 'جاري الرفع...',
    download: 'تنزيل',
    actions: 'الإجراءات',
    all: 'الكل',
    years: 'سنوات',
  },
  pagination: {
    showing: 'عرض',
    to: 'إلى',
    of: 'من',
    entries: 'إدخال',
    total: 'المجموع',
    noEntries: 'لا توجد إدخالات',
    rowsPerPage: 'صفوف في الصفحة',
  },
  nav: {
    dashboard: 'لوحة التحكم',
    students: 'الطلاب',
    admissions: 'القبول',
    studentManagement: 'إدارة الطلاب',
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
    academicManagement: 'الإدارة الأكاديمية',
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
    subtitle: 'إدارة القبول مع سجلات الطلاب الأفغان الكاملة',
    management: 'إدارة الطلاب',
    add: 'تسجيل طالب',
    addDescription: 'تسجيل تفاصيل القبول مع معلومات الوصي ومكان الإقامة.',
    list: 'تسجيلات الطلاب',
    listDescription: 'البحث والتصفية وتحديث القبول.',
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
    applied: 'تم التقديم',
    withdrawn: 'تم الانسحاب',
    allSchools: 'جميع المدارس',
    allOrganizations: 'جميع المنظمات',
    organization: 'المنظمة',
    acrossSelected: 'في المنظمة المحددة',
    registeredMale: 'الطلاب الذكور المسجلين',
    registeredFemale: 'الطالبات الإناث المسجلات',
    needingSpecial: 'يحتاجون إلى رعاية خاصة',
    printProfile: 'طباعة الملف الشخصي',
    viewProfile: 'عرض الملف الشخصي',
    applyingGrade: 'الصف المطلوب',
    school: 'المدرسة',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    orphan: 'يتيم',
    total: 'إجمالي الطلاب',
    father: 'الأب',
    guardian: 'الوصي',
    guardianName: 'اسم الوصي',
    guardianPhone: 'هاتف الوصي',
    noDataFound: 'لم يتم العثور على بيانات.',
    deleteStudentRecord: 'حذف سجل الطالب؟',
    deleteStudentDescription: 'إزالة هذا الطالب ستحتفظ بسجل التدقيق ولكن تخفيه من قوائم القبول.',
    updateDescription: 'تحديث تفاصيل التسجيل والوصي.',
    selectSchool: 'اختر المدرسة',
    potentialDuplicate: 'تم العثور على تكرار محتمل',
    proceedCreate: 'هل لا تزال تريد المتابعة بإنشاء سجل جديد؟',
    admissionInfo: 'معلومات القبول',
    addressInfo: 'معلومات العنوان',
    otherInfo: 'معلومات أخرى',
    fullName: 'الاسم الكامل',
    grandfatherName: 'اسم الجد',
    motherName: 'اسم الأم',
    birthYear: 'سنة الميلاد',
    birthDate: 'تاريخ الميلاد',
    age: 'العمر',
    preferredLanguage: 'اللغة المفضلة',
    nationality: 'الجنسية',
    previousSchool: 'المدرسة السابقة',
    originProvince: 'المحافظة الأصلية',
    originDistrict: 'المنطقة الأصلية',
    originVillage: 'القرية الأصلية',
    currentProvince: 'المحافظة الحالية',
    currentDistrict: 'المنطقة الحالية',
    currentVillage: 'القرية الحالية',
    homeAddress: 'عنوان المنزل',
    relation: 'العلاقة',
    guardianTazkira: 'هوية الوصي',
    guardianPicturePath: 'مسار صورة الوصي',
    zaminName: 'اسم الضامن',
    zaminPhone: 'هاتف الضامن',
    zaminTazkira: 'هوية الضامن',
    zaminAddress: 'عنوان الضامن',
    studentPicture: 'صورة الطالب',
    admissionFeeStatus: 'حالة رسوم القبول',
    orphanStatus: 'حالة اليتيم',
    disabilityStatus: 'حالة الإعاقة',
    emergencyContactName: 'اسم جهة الاتصال الطارئة',
    emergencyContactPhone: 'هاتف جهة الاتصال الطارئة',
    familyIncome: 'دخل الأسرة / تفاصيل الدعم',
    educationalHistory: 'السجل التعليمي',
    studentDocuments: 'وثائق الطالب',
    disciplineRecords: 'سجلات الانضباط',
    cardNumber: 'رقم البطاقة',
    admissionYear: 'سنة القبول',
    hasParents: 'لديه والدان',
    paid: 'مدفوع',
    pending: 'معلق',
    waived: 'معفى',
    partial: 'جزئي',
    selectGender: 'اختر الجنس',
    feeStatus: 'حالة الرسوم',
    originAddress: 'العنوان الأصلي',
    currentAddress: 'العنوان الحالي',
    noOriginAddress: 'لم يتم تسجيل أي عنوان أصلي',
    noCurrentAddress: 'لم يتم تسجيل أي عنوان حالي',
    noGuardianInfo: 'لم يتم تسجيل معلومات الوصي',
    guarantorInfo: 'معلومات الضامن',
    noGuarantorInfo: 'لم يتم تسجيل معلومات الضامن',
    emergencyInfo: 'معلومات الطوارئ والخاصة',
    financialInfo: 'المعلومات المالية والدعم',
    noEmergencyInfo: 'لم يتم تسجيل معلومات الطوارئ',
    noFinancialInfo: 'لم يتم تسجيل المعلومات المالية',
    // Documents dialog
    documentsDescription: 'إدارة الوثائق لـ',
    uploadDocument: 'رفع وثيقة',
    uploadDocumentDescription: 'رفع وثيقة لهذا الطالب',
    selectFile: 'اختر ملف',
    documentType: 'نوع الوثيقة',
    documentTypePlaceholder: 'مثل، شهادة الميلاد، الهوية',
    description: 'الوصف',
    descriptionPlaceholder: 'وصف اختياري',
    fileName: 'اسم الملف',
    fileSize: 'الحجم',
    uploadDate: 'تاريخ الرفع',
    noDocuments: 'لم يتم رفع أي وثائق بعد',
    deleteDocument: 'حذف الوثيقة',
    deleteDocumentConfirm: 'هل أنت متأكد أنك تريد حذف هذه الوثيقة؟ لا يمكن التراجع عن هذا الإجراء.',
    viewDocument: 'عرض الوثيقة',
    viewDocumentError: 'فشل تحميل الوثيقة',
    imageLoadError: 'فشل تحميل الصورة',
    pdfLoadError: 'فشل تحميل PDF',
    unsupportedFileType: 'لا يمكن معاينة نوع الملف هذا. يرجى التنزيل للمشاهدة.',
    noDocumentToView: 'لا توجد وثيقة للعرض',
    // Educational history dialog
    educationalHistoryDescription: 'عرض وإدارة السجل التعليمي لـ',
    addHistory: 'إضافة سجل',
    editHistory: 'تعديل السجل التعليمي',
    deleteHistory: 'حذف السجل التعليمي',
    deleteHistoryConfirm: 'هل أنت متأكد أنك تريد حذف هذا السجل التعليمي؟ لا يمكن التراجع عن هذا الإجراء.',
    institutionName: 'اسم المؤسسة',
    institutionPlaceholder: 'اسم المدرسة أو المؤسسة',
    academicYear: 'السنة الدراسية',
    academicYearPlaceholder: '۱۴۰۳',
    gradeLevel: 'الصف',
    gradeLevelPlaceholder: '۵',
    period: 'الفترة',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    achievements: 'الإنجازات',
    achievementsPlaceholder: 'أي إنجازات أو جوائز',
    notes: 'ملاحظات',
    notesPlaceholder: 'ملاحظات إضافية',
    noEducationalHistory: 'لم يتم تسجيل سجل تعليمي',
    educationalHistoryFormDescription: 'أدخل تفاصيل السجل التعليمي',
    // Discipline records dialog
    disciplineRecordsDescription: 'عرض وإدارة سجلات الانضباط لـ',
    addDisciplineRecord: 'إضافة سجل',
    editDisciplineRecord: 'تعديل سجل الانضباط',
    deleteDisciplineRecord: 'حذف سجل الانضباط',
    deleteDisciplineConfirm: 'هل أنت متأكد أنك تريد حذف سجل الانضباط هذا؟ لا يمكن التراجع عن هذا الإجراء.',
    incidentDate: 'تاريخ الحادثة',
    incidentType: 'نوع الحادثة',
    incidentTypePlaceholder: 'مثل، التأخير، الشجار',
    severity: 'الشدة',
    severityMinor: 'طفيف',
    severityModerate: 'متوسط',
    severityMajor: 'كبير',
    severitySevere: 'شديد',
    actionTaken: 'الإجراء المتخذ',
    actionTakenPlaceholder: 'ما الإجراء الذي تم اتخاذه',
    resolved: 'تم الحل',
    disciplinePending: 'معلق',
    markResolved: 'وضع علامة تم الحل',
    noDisciplineRecords: 'لا توجد سجلات انضباط',
    disciplineRecordFormDescription: 'أدخل تفاصيل سجل الانضباط',
    disciplineDescriptionPlaceholder: 'صف الحادثة',
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
  timetable: {
    title: 'إنشاء الجدول الزمني',
    generate: 'إنشاء',
    save: 'حفظ الجدول الزمني',
    load: 'تحميل الجدول الزمني',
    loadDesc: 'اختر جدولًا زمنيًا محفوظًا لتحميله.',
    selectClasses: 'اختر الفصول',
    selectDays: 'اختر الأيام',
    selectPeriods: 'اختر الحصص',
    teacherPreferences: 'تفضيلات المعلمين',
    teacherPreferencesDesc: 'حدد الأوقات التي لا يستطيع المعلم التدريس فيها.',
    allYear: 'طوال العام',
    summary: 'اختر الفصول والأيام والحصص ثم اضغط إنشاء.',
    unscheduledNotice: 'تعذر جدولة بعض الدروس',
    results: 'النتائج',
    teacherView: 'عرض المعلمين',
    classView: 'عرض الفصول',
    teacher: 'المعلم',
    class: 'الفصل',
    name: 'الاسم',
    description: 'الوصف',
    periods: 'الحصص',
    selectTeacher: 'اختر المعلم',
    exportExcel: 'تصدير إلى Excel',
    exportPdf: 'تصدير إلى PDF',
    print: 'طباعة',
  },
  admissions: {
    title: 'قبول الطلاب',
    subtitle: 'قبول الطلاب المسجلين في الفصول مع تتبع الإقامة والسنة.',
    add: 'قبول طالب',
    list: 'القبولات',
    listDescription: 'نظرة عامة على مواضع الفصول وتتبع الإقامة.',
    school: 'المدرسة',
    allSchools: 'جميع المدارس',
    status: 'الحالة',
    allStatus: 'جميع الحالات',
    pending: 'قيد الانتظار',
    admitted: 'مقبول',
    active: 'نشط',
    inactive: 'غير نشط',
    suspended: 'معلق',
    withdrawn: 'منسحب',
    graduated: 'متخرج',
    residency: 'الإقامة',
    allResidency: 'جميع الإقامات',
    room: 'الغرفة',
    class: 'الفصل',
    actions: 'الإجراءات',
    noDataFound: 'لم يتم العثور على بيانات.',
    admissionNo: 'القبول',
    year: 'السنة',
    boarder: 'نزل',
    // Dialog
    admitStudentFromRegistration: 'قبول طالب من التسجيل',
    updateAdmission: 'تحديث القبول',
    admitStudent: 'قبول طالب',
    dialogDescription: 'ربط متعلم مسجل بفصل وسنة أكاديمية ونوع إقامة مع تتبع الحالة.',
    studentFromRegistration: 'الطالب (من التسجيل)',
    chooseStudent: 'اختر الطالب',
    studentRequired: 'الطالب مطلوب',
    selectSchool: 'اختر المدرسة',
    academicYear: 'السنة الأكاديمية',
    selectAcademicYear: 'اختر السنة الأكاديمية',
    classSection: 'الفصل / القسم',
    selectClassSection: 'اختر الفصل والقسم',
    residencyType: 'نوع الإقامة',
    selectResidency: 'اختر الإقامة',
    roomDorm: 'الغرفة / النزل',
    assignRoom: 'تعيين غرفة',
    admissionYear: 'سنة القبول',
    admissionDate: 'تاريخ القبول',
    enrollmentStatus: 'حالة التسجيل',
    enrollmentType: 'نوع التسجيل',
    enrollmentTypePlaceholder: 'نزيل / يومي',
    shift: 'الوردية',
    shiftPlaceholder: 'صباح / مساء',
    feeStatus: 'حالة الرسوم',
    feeStatusPlaceholder: 'مدفوع / جزئي / معفى',
    boarderYes: 'نزيل',
    boarderNo: 'يومي',
    placementNotes: 'ملاحظات الموضع',
    placementNotesPlaceholder: 'الصحة، موافقات الوصي، أو اعتبارات خاصة',
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