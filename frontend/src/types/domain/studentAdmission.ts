// Student Admission Domain Types - UI-friendly structure (camelCase, Date objects, nested structures)

export type AdmissionStatus = 'pending' | 'admitted' | 'active' | 'inactive' | 'suspended' | 'withdrawn' | 'graduated';

export interface StudentAdmission {
  id: string;
  organizationId: string;
  schoolId: string | null;
  studentId: string;
  academicYearId: string | null;
  classId: string | null;
  classAcademicYearId: string | null;
  residencyTypeId: string | null;
  roomId: string | null;
  admissionYear: string | null;
  admissionDate: Date;
  enrollmentStatus: AdmissionStatus;
  enrollmentType: string | null;
  shift: string | null;
  isBoarder: boolean;
  feeStatus: string | null;
  placementNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  student?: {
    id: string;
    fullName: string;
    admissionNumber: string;
    studentCode?: string | null;
    gender: string | null;
    admissionYear: string | null;
    guardianPhone: string | null;
  };
  organization?: {
    id: string;
    name: string;
  };
  academicYear?: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  class?: {
    id: string;
    name: string;
    gradeLevel: number | null;
  };
  classAcademicYear?: {
    id: string;
    sectionName: string | null;
  };
  residencyType?: {
    id: string;
    name: string;
  };
  room?: {
    id: string;
    roomNumber: string;
  };
  school?: {
    id: string;
    schoolName: string;
  };
}

export interface StudentAdmissionInsert {
  studentId: string;
  organizationId?: string | null;
  schoolId?: string | null;
  academicYearId?: string | null;
  classId?: string | null;
  classAcademicYearId?: string | null;
  residencyTypeId?: string | null;
  roomId?: string | null;
  admissionYear?: string | null;
  admissionDate?: string;
  enrollmentStatus?: string;
  enrollmentType?: string | null;
  shift?: string | null;
  isBoarder?: boolean;
  feeStatus?: string | null;
  placementNotes?: string | null;
}

export type StudentAdmissionUpdate = Partial<StudentAdmissionInsert>;

export interface AdmissionStats {
  total: number;
  active: number;
  pending: number;
  boarders: number;
}
