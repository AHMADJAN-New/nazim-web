import type { AdmissionStatus, StudentAdmission } from './studentAdmission';

export interface StudentAdmissionStatusBreakdown {
  enrollment_status: AdmissionStatus;
  total: number;
}

export interface StudentAdmissionSchoolBreakdown {
  school_id: string | null;
  school_name: string | null;
  total: number;
  active_count: number;
  boarder_count: number;
}

export interface StudentAdmissionAcademicYearBreakdown {
  academic_year_id: string | null;
  academic_year_name: string | null;
  total: number;
  active_count: number;
  boarder_count: number;
}

export interface StudentAdmissionResidencyBreakdown {
  residency_type_id: string | null;
  residency_type_name: string | null;
  total: number;
  boarder_count: number;
  active_count: number;
}

export interface StudentAdmissionReport {
  totals: {
    total: number;
    active: number;
    pending: number;
    boarders: number;
  };
  status_breakdown: StudentAdmissionStatusBreakdown[];
  school_breakdown: StudentAdmissionSchoolBreakdown[];
  academic_year_breakdown: StudentAdmissionAcademicYearBreakdown[];
  residency_breakdown: StudentAdmissionResidencyBreakdown[];
  recent_admissions: StudentAdmission[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}
