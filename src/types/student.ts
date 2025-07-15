// Student Management Types

export interface Student {
  id: string;
  admissionNumber: string;
  rollNumber?: string;
  
  // Personal Information
  firstName: string;
  lastName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female';
  bloodGroup?: string;
  religion: string;
  nationality: string;
  caste?: string;
  category?: 'general' | 'sc' | 'st' | 'obc' | 'minority';
  
  // Contact Information
  phone?: string;
  email?: string;
  address: Address;
  
  // Guardian Information
  guardians: Guardian[];
  
  // Academic Information
  branchId: string;
  classId: string;
  sectionId: string;
  admissionDate: Date;
  academicYear: string;
  status: StudentStatus;
  
  // Previous School Information
  previousSchools: PreviousSchool[];
  
  // Health Information
  healthInfo: HealthInfo;
  
  // Documents and Media
  profilePhoto?: string;
  documents: StudentDocument[];
  
  // Financial Information
  feeCategory: string;
  scholarshipPercentage?: number;
  
  // Hostel Information
  isHostelStudent: boolean;
  hostelRoomId?: string;
  
  // System Information
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

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

export type StudentStatus = 
  | 'admitted'
  | 'active'
  | 'on_leave'
  | 'suspended'
  | 'expelled'
  | 'graduated'
  | 'transferred'
  | 'dropout'
  | 'alumni';

export interface StudentFilters {
  branchId?: string;
  classId?: string;
  sectionId?: string;
  status?: StudentStatus;
  gender?: 'male' | 'female';
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
    gender: 'male' | 'female';
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
