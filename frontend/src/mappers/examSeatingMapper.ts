import type * as ExamSeatingApi from '@/types/api/examSeating';
import type {
  ExamSeatingAssignment,
  ExamSeatingAssignmentStudent,
  ExamSeatingClassColor,
  ExamSeatingConflictPair,
  ExamSeatingMap,
  ExamSeatingMapDetail,
  ExamSeatingMapFormData,
  ExamSeatingReportData,
  ExamSeatingRun,
  ExamSeatingSolverDiagnostics,
  ExamSeatingUnassignedStudent,
  MapRollNumberConfirmResponse,
  MapRollNumberPreviewItem,
  MapRollNumberPreviewResponse,
  SolveExamSeatingMapResult,
  SolveStatusResult,
  SyncExamSeatingAssignmentItem,
} from '@/types/domain/examSeating';

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const mapConflictPairApiToDomain = (
  api: ExamSeatingApi.ExamSeatingConflictPair
): ExamSeatingConflictPair => ({
  rowA: api.row_a,
  columnA: api.column_a,
  rowB: api.row_b,
  columnB: api.column_b,
  examClassIdA: api.exam_class_id_a,
  examClassIdB: api.exam_class_id_b,
});

const mapSolverDiagnosticsApiToDomain = (
  api: ExamSeatingApi.ExamSeatingSolverDiagnostics | null | undefined
): ExamSeatingSolverDiagnostics | null => {
  if (!api) return null;
  return {
    conflictsCount: api.conflicts_count,
    conflictPairs: api.conflict_pairs?.map(mapConflictPairApiToDomain),
    message: api.message,
    modeUsed: api.mode_used,
    status: api.status,
  };
};

export const mapExamSeatingMapApiToDomain = (
  api: ExamSeatingApi.ExamSeatingMap
): ExamSeatingMap => ({
  id: api.id,
  organizationId: api.organization_id,
  schoolId: api.school_id,
  examId: api.exam_id,
  roomId: api.room_id,
  name: api.name,
  rows: api.rows,
  columns: api.columns,
  startSeatNumber: api.start_seat_number,
  status: api.status,
  revision: api.revision,
  inputChecksum: api.input_checksum,
  solverStatus: api.solver_status,
  solverDiagnostics: mapSolverDiagnosticsApiToDomain(api.solver_diagnostics),
  appliedAt: parseDate(api.applied_at),
  appliedBy: api.applied_by,
  finalizedAt: parseDate(api.finalized_at),
  finalizedBy: api.finalized_by,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
  deletedAt: parseDate(api.deleted_at),
  room: api.room
    ? {
        id: api.room.id,
        name: api.room.name,
        roomNumber: api.room.room_number ?? null,
      }
    : null,
  assignedCount: api.assigned_count,
  totalSeats: api.total_seats,
  examClassIds: api.exam_class_ids ?? [],
});

const mapAssignmentStudentApiToDomain = (
  api: ExamSeatingApi.ExamSeatingAssignmentStudent
): ExamSeatingAssignmentStudent => ({
  id: api.id,
  studentId: api.student_id,
  fullName: api.full_name,
  fatherName: api.father_name,
  examRollNumber: api.exam_roll_number,
  className: api.class_name,
  examClassId: api.exam_class_id,
});

export const mapExamSeatingAssignmentApiToDomain = (
  api: ExamSeatingApi.ExamSeatingAssignment
): ExamSeatingAssignment => ({
  id: api.id,
  organizationId: api.organization_id,
  schoolId: api.school_id,
  examSeatingMapId: api.exam_seating_map_id,
  examId: api.exam_id,
  examStudentId: api.exam_student_id,
  rowNumber: api.row_number,
  columnNumber: api.column_number,
  seatNumber: api.seat_number,
  isLocked: api.is_locked,
  isDisabled: api.is_disabled,
  lockedAt: parseDate(api.locked_at),
  lockedBy: api.locked_by,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
  examStudent: api.exam_student
    ? mapAssignmentStudentApiToDomain(api.exam_student)
    : null,
});

export const mapExamSeatingClassColorApiToDomain = (
  api: ExamSeatingApi.ExamSeatingClassColor
): ExamSeatingClassColor => ({
  id: api.id,
  organizationId: api.organization_id,
  schoolId: api.school_id,
  examSeatingMapId: api.exam_seating_map_id,
  examClassId: api.exam_class_id,
  colorHex: api.color_hex,
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
  className: api.class_name ?? null,
});

export const mapExamSeatingRunApiToDomain = (
  api: ExamSeatingApi.ExamSeatingRun
): ExamSeatingRun => ({
  id: api.id,
  organizationId: api.organization_id,
  schoolId: api.school_id,
  examSeatingMapId: api.exam_seating_map_id,
  examId: api.exam_id,
  revision: api.revision,
  inputChecksum: api.input_checksum,
  algorithmVersion: api.algorithm_version,
  idempotencyKey: api.idempotency_key,
  status: api.status,
  seed: api.seed,
  conflictCount: api.conflict_count,
  diagnostics: mapSolverDiagnosticsApiToDomain(api.diagnostics),
  errorMessage: api.error_message,
  startedAt: parseDate(api.started_at),
  completedAt: parseDate(api.completed_at),
  failedAt: parseDate(api.failed_at),
  createdAt: new Date(api.created_at),
  updatedAt: new Date(api.updated_at),
});

const mapUnassignedStudentApiToDomain = (
  api: ExamSeatingApi.ExamSeatingUnassignedStudent
): ExamSeatingUnassignedStudent => ({
  examStudentId: api.exam_student_id,
  studentId: api.student_id,
  fullName: api.full_name,
  fatherName: api.father_name,
  examRollNumber: api.exam_roll_number,
  className: api.class_name,
  examClassId: api.exam_class_id,
});

export const mapExamSeatingMapDetailApiToDomain = (
  api: ExamSeatingApi.ExamSeatingMapDetail
): ExamSeatingMapDetail => ({
  ...mapExamSeatingMapApiToDomain(api),
  assignments: (api.assignments ?? []).map(mapExamSeatingAssignmentApiToDomain),
  classColors: (api.class_colors ?? []).map(mapExamSeatingClassColorApiToDomain),
  unassignedStudents: (api.unassigned_students ?? []).map(mapUnassignedStudentApiToDomain),
  availableStudentCount: api.available_student_count ?? 0,
  seatedElsewhereCount: api.seated_elsewhere_count ?? 0,
  seatedElsewhereMaps: (api.seated_elsewhere_maps ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    count: row.count,
  })),
  latestRun: api.latest_run ? mapExamSeatingRunApiToDomain(api.latest_run) : null,
});

export const mapExamSeatingMapFormToInsert = (
  domain: ExamSeatingMapFormData
): ExamSeatingApi.ExamSeatingMapInsert => ({
  name: domain.name,
  rows: domain.rows,
  columns: domain.columns,
  start_seat_number: domain.startSeatNumber,
  room_id: domain.roomId,
  exam_class_ids: domain.examClassIds,
});

export const mapExamSeatingMapFormToUpdate = (
  domain: Partial<ExamSeatingMapFormData>
): ExamSeatingApi.ExamSeatingMapUpdate => ({
  ...(domain.name !== undefined ? { name: domain.name } : {}),
  ...(domain.rows !== undefined ? { rows: domain.rows } : {}),
  ...(domain.columns !== undefined ? { columns: domain.columns } : {}),
  ...(domain.startSeatNumber !== undefined ? { start_seat_number: domain.startSeatNumber } : {}),
  ...(domain.roomId !== undefined ? { room_id: domain.roomId } : {}),
});

export const mapSyncMapClassesDomainToApi = (
  examClassIds: string[]
): ExamSeatingApi.SyncExamSeatingMapClassesPayload => ({
  exam_class_ids: examClassIds,
});

export const mapSyncAssignmentsDomainToApi = (
  revision: number,
  assignments: SyncExamSeatingAssignmentItem[]
): ExamSeatingApi.SyncExamSeatingAssignmentsPayload => ({
  revision,
  assignments: assignments.map((item) => ({
    row_number: item.rowNumber,
    column_number: item.columnNumber,
    exam_student_id: item.examStudentId ?? null,
    is_locked: item.isLocked,
    is_disabled: item.isDisabled,
  })),
});

export const mapSyncClassColorsDomainToApi = (
  colors: Array<{ examClassId: string; colorHex: string }>
): ExamSeatingApi.SyncExamSeatingClassColorsPayload => ({
  class_colors: colors.map((color) => ({
    exam_class_id: color.examClassId,
    color_hex: color.colorHex,
  })),
});

export const mapSolveResponseApiToDomain = (
  api: ExamSeatingApi.SolveExamSeatingMapResponse
): SolveExamSeatingMapResult => ({
  runId: api.run_id,
  status: api.status,
  solverStatus: api.solver_status,
});

export const mapSolveStatusApiToDomain = (
  api: ExamSeatingApi.SolveStatusResponse & {
    latest_run?: ExamSeatingApi.ExamSeatingRun | null;
    map_id?: string;
  }
): SolveStatusResult => {
  const run = api.run ?? api.latest_run ?? null;
  const mapSource = api.map ?? (api as unknown as ExamSeatingApi.ExamSeatingMap);

  return {
    map: mapExamSeatingMapApiToDomain(mapSource),
    run: run ? mapExamSeatingRunApiToDomain(run) : null,
    solverStatus: api.solver_status ?? mapSource.solver_status,
    solverDiagnostics: mapSolverDiagnosticsApiToDomain(
      api.solver_diagnostics ?? mapSource.solver_diagnostics
    ),
  };
};

export const mapReportDataApiToDomain = (
  api: ExamSeatingApi.ExamSeatingReportDataResponse
): ExamSeatingReportData => ({
  map: mapExamSeatingMapApiToDomain(api.map),
  columns: api.columns,
  rows: api.rows,
  filters: api.filters,
});

const mapRollNumberPreviewItemApiToDomain = (
  api: ExamSeatingApi.MapRollNumberPreviewItem
): MapRollNumberPreviewItem => ({
  examStudentId: api.exam_student_id,
  studentId: api.student_id,
  studentName: api.student_name,
  className: api.class_name,
  currentRollNumber: api.current_roll_number,
  newRollNumber: api.new_roll_number,
  seatNumber: api.seat_number,
  willOverride: api.will_override,
  hasCollision: api.has_collision,
});

export const mapRollNumberPreviewApiToDomain = (
  api: ExamSeatingApi.MapRollNumberPreviewResponse
): MapRollNumberPreviewResponse => ({
  total: api.total,
  willOverrideCount: api.will_override_count,
  collisionCount: api.collision_count,
  startRoll: api.start_roll,
  revision: api.revision,
  inputChecksum: api.input_checksum ?? null,
  mapId: api.map_id,
  items: api.items.map(mapRollNumberPreviewItemApiToDomain),
});

export const mapRollNumberConfirmApiToDomain = (
  api: ExamSeatingApi.MapRollNumberConfirmResponse
): MapRollNumberConfirmResponse => ({
  updated: api.updated,
  errors: api.errors.map((error) => ({
    examStudentId: error.exam_student_id,
    error: error.error,
  })),
});
