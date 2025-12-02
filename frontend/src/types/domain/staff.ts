// Staff Domain Types - UI-friendly structure (camelCase, nested objects)

export type StaffStatus = 'active' | 'inactive' | 'on_leave' | 'terminated' | 'suspended';

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  landmark?: string;
}

export interface OriginLocation {
  province: string | null;
  district: string | null;
  village: string | null;
}

export interface CurrentLocation {
  province: string | null;
  district: string | null;
  village: string | null;
}

export interface Education {
  level: string | null;
  institution: string | null;
  graduationYear: string | null;
  department: string | null;
}

export interface StaffType {
  id: string;
  organizationId: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface StaffDocument {
  id: string;
  staffId: string;
  organizationId: string;
  schoolId: string | null;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  description: string | null;
  uploadedBy: string | null;
  uploadedAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface Staff {
  id: string;
  profileId: string | null;
  organizationId: string;
  employeeId: string;
  staffType: string;
  staffTypeId: string | null;
  schoolId: string | null;
  
  // Personal Information
  firstName: string;
  fatherName: string;
  grandfatherName: string | null;
  fullName: string;
  tazkiraNumber: string | null;
  dateOfBirth: Date | null;
  birthYear: string | null;
  birthDate: string | null;
  
  // Contact Information
  phoneNumber: string | null;
  email: string | null;
  address: Address;
  homeAddress: string | null;
  
  // Location Information
  originLocation: OriginLocation;
  currentLocation: CurrentLocation;
  
  // Education Information
  religiousEducation: Education;
  modernEducation: Education;
  
  // Professional Information
  teachingSection: string | null;
  position: string | null;
  duty: string | null;
  salary: string | null;
  status: StaffStatus;
  
  // Media and Documents
  pictureUrl: string | null;
  documentUrls: any[];
  documents: StaffDocument[];
  
  // Additional Information
  notes: string | null;
  
  // System Information
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  
  // Relations
  staffTypeRelation?: StaffType;
  profile?: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    role: string;
  };
  organization?: {
    id: string;
    name: string;
  };
  school?: {
    id: string;
    schoolName: string;
  };
}

export interface StaffStats {
  total: number;
  active: number;
  inactive: number;
  onLeave: number;
  terminated: number;
  suspended: number;
  byType: {
    teacher: number;
    admin: number;
    accountant: number;
    librarian: number;
    other: number;
  };
}
