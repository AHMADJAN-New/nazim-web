export type ExamSeatingMapStatus = 'draft' | 'generated' | 'applied' | 'finalized';

export type ExamSeatingSolverStatus = 'not_run' | 'pending' | 'running' | 'succeeded' | 'failed';

export type ExamSeatingRunStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface ExamSeatingMapRoom {
  id: string;
  name: string;
  roomNumber?: string | null;
}

export interface ExamSeatingConflictPair {
  rowA: number;
  columnA: number;
  rowB: number;
  columnB: number;
  examClassIdA: string;
  examClassIdB: string;
}

export interface ExamSeatingSolverDiagnostics {
  conflictsCount?: number;
  conflictPairs?: ExamSeatingConflictPair[];
  message?: string;
  modeUsed?: string;
  status?: string;
}

export interface ExamSeatingMap {
  id: string;
  organizationId: string;
  schoolId: string;
  examId: string;
  roomId: string | null;
  name: string;
  rows: number;
  columns: number;
  startSeatNumber: number;
  status: ExamSeatingMapStatus;
  revision: number;
  inputChecksum: string | null;
  solverStatus: ExamSeatingSolverStatus;
  solverDiagnostics: ExamSeatingSolverDiagnostics | null;
  appliedAt: Date | null;
  appliedBy: string | null;
  finalizedAt: Date | null;
  finalizedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  room?: ExamSeatingMapRoom | null;
  assignedCount?: number;
  totalSeats?: number;
}

export interface ExamSeatingAssignmentStudent {
  id: string;
  studentId: string | null;
  fullName: string;
  fatherName: string | null;
  examRollNumber: string | null;
  className: string;
  examClassId: string;
}

export interface ExamSeatingAssignment {
  id: string;
  organizationId: string;
  schoolId: string;
  examSeatingMapId: string;
  examId: string;
  examStudentId: string | null;
  rowNumber: number;
  columnNumber: number;
  seatNumber: number;
  isLocked: boolean;
  isDisabled: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  examStudent?: ExamSeatingAssignmentStudent | null;
}

export interface ExamSeatingClassColor {
  id: string;
  organizationId: string;
  schoolId: string;
  examSeatingMapId: string;
  examClassId: string;
  colorHex: string;
  createdAt: Date;
  updatedAt: Date;
  className?: string | null;
}

export interface ExamSeatingRun {
  id: string;
  organizationId: string;
  schoolId: string;
  examSeatingMapId: string;
  examId: string;
  revision: number;
  inputChecksum: string;
  algorithmVersion: string;
  idempotencyKey: string;
  status: ExamSeatingRunStatus;
  seed: number | null;
  conflictCount: number;
  diagnostics: ExamSeatingSolverDiagnostics | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamSeatingUnassignedStudent {
  examStudentId: string;
  studentId: string | null;
  fullName: string;
  fatherName: string | null;
  examRollNumber: string | null;
  className: string;
  examClassId: string;
}

export interface ExamSeatingMapDetail extends ExamSeatingMap {
  assignments: ExamSeatingAssignment[];
  classColors: ExamSeatingClassColor[];
  unassignedStudents: ExamSeatingUnassignedStudent[];
  latestRun: ExamSeatingRun | null;
}

export interface ExamSeatingMapFormData {
  name: string;
  rows: number;
  columns: number;
  startSeatNumber: number;
  roomId: string | null;
}

export interface SyncExamSeatingAssignmentItem {
  rowNumber: number;
  columnNumber: number;
  examStudentId?: string | null;
  isLocked?: boolean;
  isDisabled?: boolean;
}

export interface ExamSeatingReportData {
  map: ExamSeatingMap;
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number | null>>;
  filters?: Record<string, string | null>;
}

export interface MapRollNumberPreviewItem {
  examStudentId: string;
  studentId: string | null;
  studentName: string;
  className: string;
  currentRollNumber: string | null;
  newRollNumber: string;
  seatNumber: number;
  willOverride: boolean;
  hasCollision: boolean;
}

export interface MapRollNumberPreviewResponse {
  total: number;
  willOverrideCount: number;
  collisionCount: number;
  items: MapRollNumberPreviewItem[];
}

export interface MapRollNumberConfirmResponse {
  updated: number;
  errors: Array<{
    examStudentId: string;
    error: string;
  }>;
}

export interface SolveExamSeatingMapResult {
  runId: string;
  status: ExamSeatingRunStatus;
  solverStatus: ExamSeatingSolverStatus;
}

export interface SolveStatusResult {
  map: ExamSeatingMap;
  run: ExamSeatingRun | null;
  solverStatus: ExamSeatingSolverStatus;
  solverDiagnostics: ExamSeatingSolverDiagnostics | null;
}
