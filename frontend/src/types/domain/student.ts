// Student Domain Types - UI-friendly structure (camelCase, nested objects)

export type StudentStatus = 
  | 'applied'
  | 'admitted'
  | 'active'
  | 'on_leave'
  | 'suspended'
  | 'expelled'
  | 'graduated'
  | 'transferred'
  | 'dropout'
  | 'withdrawn'
  | 'alumni';

export type AdmissionFeeStatus = 'paid' | 'pending' | 'waived' | 'partial';
export type Gender = 'male' | 'female';

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  landmark?: string;
}

export interface Guardian {
  id: string;
  relationship: 'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'grandfather' | 'grandmother' | 'other';
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  occupation: string;
  workAddress?: string;
  annualIncome?: number;
  isPrimary: boolean;
  photo?: string;
}

export interface PreviousSchool {
  name: string;
  board: string;
  classCompleted: string;
  yearOfPassing: number;
  percentage?: number;
  tcNumber?: string;
  reasonForLeaving?: string;
}

export interface HealthInfo {
  allergies?: string[];
  medicalConditions?: string[];
  medications?: string[];
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  bloodGroup?: string;
  height?: number;
  weight?: number;
  lastCheckupDate?: Date;
}

export type DocumentType = 
  | 'birth_certificate'
  | 'aadhar_card'
  | 'passport'
  | 'transfer_certificate'
  | 'mark_sheet'
  | 'caste_certificate'
  | 'income_certificate'
  | 'photo'
  | 'medical_certificate'
  | 'other';

export interface StudentDocument {
  id: string;
  type: DocumentType;
  title: string;
  filename: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface Student {
  id: string;
  organizationId: string;
  schoolId: string | null;
  admissionNumber: string;
  studentCode?: string | null;
  cardNumber?: string | null;
  rollNumber?: string;
  
  // Personal Information
  fullName: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  grandfatherName?: string | null;
  motherName?: string | null;
  gender: Gender;
  dateOfBirth?: Date;
  birthYear?: string | null;
  birthDate?: string | null;
  age?: number | null;
  bloodGroup?: string;
  religion?: string;
  nationality?: string | null;
  preferredLanguage?: string | null;
  
  // Contact Information
  phone?: string;
  email?: string;
  address: Address;
  homeAddress?: string | null;
  
  // Guardian Information
  guardians: Guardian[];
  guardianName?: string | null;
  guardianRelation?: string | null;
  guardianPhone?: string | null;
  guardianTazkira?: string | null;
  guardianPicturePath?: string | null;
  
  // Zamin (Guarantor) Information
  zaminName?: string | null;
  zaminPhone?: string | null;
  zaminTazkira?: string | null;
  zaminAddress?: string | null;
  
  // Academic Information
  admissionYear?: string | null;
  applyingGrade?: string | null;
  previousSchool?: string | null;
  previousSchools: PreviousSchool[];
  
  // Location Information
  origProvince?: string | null;
  origDistrict?: string | null;
  origVillage?: string | null;
  currProvince?: string | null;
  currDistrict?: string | null;
  currVillage?: string | null;
  
  // Status and Fees
  status: StudentStatus;
  admissionFeeStatus: AdmissionFeeStatus;
  isOrphan: boolean;
  disabilityStatus?: string | null;
  
  // Health Information
  healthInfo: HealthInfo;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  
  // Financial Information
  familyIncome?: string | null;
  
  // Documents and Media
  profilePhoto?: string;
  picturePath?: string | null;
  documents: StudentDocument[];
  
  // System Information
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
  
  // Relations
  organization?: {
    id: string;
    name: string;
  };
  school?: {
    id: string;
    schoolName: string;
  };
  currentClass?: {
    id: string;
    name: string;
    code?: string;
    gradeLevel?: string;
  } | null;
}

export interface StudentFilters {
  branchId?: string;
  classId?: string;
  sectionId?: string;
  status?: StudentStatus;
  gender?: Gender;
  isHostelStudent?: boolean;
  academicYear?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export interface AdmissionFormData {
  // Step 1: Personal Information
  personalInfo: {
    firstName: string;
    lastName: string;
    fatherName: string;
    motherName: string;
    dateOfBirth: Date;
    gender: Gender;
    bloodGroup?: string;
    religion: string;
    nationality: string;
    caste?: string;
    category?: string;
  };
  
  // Step 2: Contact Information
  contactInfo: {
    phone?: string;
    email?: string;
    address: Address;
  };
  
  // Step 3: Guardian Information
  guardianInfo: {
    guardians: Guardian[];
  };
  
  // Step 4: Academic Information
  academicInfo: {
    branchId: string;
    classId: string;
    sectionId?: string;
    previousSchools: PreviousSchool[];
  };
  
  // Step 5: Health & Additional Information
  additionalInfo: {
    healthInfo: HealthInfo;
    isHostelStudent: boolean;
    documents: File[];
  };
}

// For bulk import/export
export interface StudentImportRow {
  admissionNumber?: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName?: string;
  dateOfBirth: string;
  gender: string;
  religion: string;
  phone?: string;
  email?: string;
  address: string;
  className: string;
  sectionName?: string;
  // ... other fields for bulk import
}
