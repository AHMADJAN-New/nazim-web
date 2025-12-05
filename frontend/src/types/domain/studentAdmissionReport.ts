import type { AdmissionStatus, StudentAdmission } from './studentAdmission';

export interface StudentAdmissionStatusSummary {
  status: AdmissionStatus;
  count: number;
}

export interface StudentAdmissionSchoolSummary {
  schoolId: string | null;
  schoolName: string;
  total: number;
  active: number;
  boarders: number;
}

export interface StudentAdmissionAcademicYearSummary {
  academicYearId: string | null;
  academicYearName: string;
  total: number;
  active: number;
  boarders: number;
}

export interface StudentAdmissionResidencySummary {
  residencyTypeId: string | null;
  residencyTypeName: string;
  total: number;
  boarders: number;
  active: number;
}

export interface StudentAdmissionReport {
  totals: {
    total: number;
    active: number;
    pending: number;
    boarders: number;
  };
  statusBreakdown: StudentAdmissionStatusSummary[];
  schoolBreakdown: StudentAdmissionSchoolSummary[];
  academicYearBreakdown: StudentAdmissionAcademicYearSummary[];
  residencyBreakdown: StudentAdmissionResidencySummary[];
  recentAdmissions: StudentAdmission[];
}

export interface StudentAdmissionReportFilters {
  organizationId?: string;
  schoolId?: string;
  academicYearId?: string;
  enrollmentStatus?: AdmissionStatus;
  residencyTypeId?: string;
  isBoarder?: boolean;
  fromDate?: string;
  toDate?: string;
}
