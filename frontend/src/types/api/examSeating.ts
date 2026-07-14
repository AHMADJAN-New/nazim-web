export type ExamSeatingMapStatus = 'draft' | 'generated' | 'applied' | 'finalized';

export type ExamSeatingSolverStatus = 'not_run' | 'pending' | 'running' | 'succeeded' | 'failed';

export type ExamSeatingRunStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface ExamSeatingMapRoom {
  id: string;
  name: string;
  room_number?: string | null;
}

export interface ExamSeatingConflictPair {
  row_a: number;
  column_a: number;
  row_b: number;
  column_b: number;
  exam_class_id_a: string;
  exam_class_id_b: string;
}

export interface ExamSeatingSolverDiagnostics {
  conflicts_count?: number;
  conflict_pairs?: ExamSeatingConflictPair[];
  message?: string;
  mode_used?: string;
  status?: string;
}

export interface ExamSeatingMap {
  id: string;
  organization_id: string;
  school_id: string;
  exam_id: string;
  room_id: string | null;
  name: string;
  rows: number;
  columns: number;
  start_seat_number: number;
  status: ExamSeatingMapStatus;
  revision: number;
  input_checksum: string | null;
  solver_status: ExamSeatingSolverStatus;
  solver_diagnostics: ExamSeatingSolverDiagnostics | null;
  applied_at: string | null;
  applied_by: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  room?: ExamSeatingMapRoom | null;
  assigned_count?: number;
  total_seats?: number;
  exam_class_ids?: string[];
}

export interface ExamSeatingAssignmentStudent {
  id: string;
  student_id: string | null;
  full_name: string;
  father_name: string | null;
  exam_roll_number: string | null;
  class_name: string;
  exam_class_id: string;
}

export interface ExamSeatingAssignment {
  id: string;
  organization_id: string;
  school_id: string;
  exam_seating_map_id: string;
  exam_id: string;
  exam_student_id: string | null;
  row_number: number;
  column_number: number;
  seat_number: number;
  is_locked: boolean;
  is_disabled: boolean;
  locked_at: string | null;
  locked_by: string | null;
  created_at: string;
  updated_at: string;
  exam_student?: ExamSeatingAssignmentStudent | null;
}

export interface ExamSeatingClassColor {
  id: string;
  organization_id: string;
  school_id: string;
  exam_seating_map_id: string;
  exam_class_id: string;
  color_hex: string;
  created_at: string;
  updated_at: string;
  class_name?: string | null;
}

export interface ExamSeatingRun {
  id: string;
  organization_id: string;
  school_id: string;
  exam_seating_map_id: string;
  exam_id: string;
  revision: number;
  input_checksum: string;
  algorithm_version: string;
  idempotency_key: string;
  status: ExamSeatingRunStatus;
  seed: number | null;
  conflict_count: number;
  diagnostics: ExamSeatingSolverDiagnostics | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamSeatingUnassignedStudent {
  exam_student_id: string;
  student_id: string | null;
  full_name: string;
  father_name: string | null;
  exam_roll_number: string | null;
  class_name: string;
  exam_class_id: string;
}

export interface ExamSeatingMapDetail extends ExamSeatingMap {
  assignments: ExamSeatingAssignment[];
  class_colors: ExamSeatingClassColor[];
  unassigned_students?: ExamSeatingUnassignedStudent[];
  available_student_count?: number;
  seated_elsewhere_count?: number;
  seated_elsewhere_maps?: Array<{ id: string; name: string; count: number }>;
  latest_run?: ExamSeatingRun | null;
}

export interface ExamSeatingMapInsert {
  name: string;
  rows: number;
  columns: number;
  start_seat_number?: number;
  room_id?: string | null;
  exam_class_ids: string[];
}

export type ExamSeatingMapUpdate = Partial<Omit<ExamSeatingMapInsert, 'exam_class_ids'>>;

export interface SyncExamSeatingMapClassesPayload {
  exam_class_ids: string[];
}

export interface SyncExamSeatingAssignmentsPayload {
  revision: number;
  assignments: Array<{
    row_number: number;
    column_number: number;
    exam_student_id?: string | null;
    is_locked?: boolean;
    is_disabled?: boolean;
  }>;
}

export interface SyncExamSeatingClassColorsPayload {
  class_colors: Array<{
    exam_class_id: string;
    color_hex: string;
  }>;
}

export interface SolveExamSeatingMapPayload {
  revision: number;
  input_checksum: string;
  strict_mode?: boolean;
  seed?: number;
}

export interface ConfirmMapRollNumbersPayload {
  revision: number;
  input_checksum: string;
}

export interface SolveExamSeatingMapResponse {
  run_id: string;
  status: ExamSeatingRunStatus;
  solver_status: ExamSeatingSolverStatus;
}

export interface SolveStatusResponse {
  map: ExamSeatingMap;
  run: ExamSeatingRun | null;
  solver_status: ExamSeatingSolverStatus;
  solver_diagnostics: ExamSeatingSolverDiagnostics | null;
}

export interface FinalizeExamSeatingMapPayload {
  revision: number;
}

export interface DuplicateExamSeatingMapResponse {
  map: ExamSeatingMap;
}

export interface ExamSeatingReportDataResponse {
  map: ExamSeatingMap;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number | null>>;
  filters?: Record<string, string | null>;
}

export interface MapRollNumberPreviewItem {
  exam_student_id: string;
  student_id: string | null;
  student_name: string;
  class_name: string;
  current_roll_number: string | null;
  new_roll_number: string;
  seat_number: number;
  will_override: boolean;
  has_collision: boolean;
}

export interface MapRollNumberPreviewResponse {
  total: number;
  will_override_count: number;
  collision_count: number;
  start_roll?: number;
  revision?: number;
  input_checksum?: string | null;
  map_id?: string;
  items: MapRollNumberPreviewItem[];
}

export interface MapRollNumberConfirmResponse {
  updated: number;
  errors: Array<{
    exam_student_id: string;
    error: string;
  }>;
}
