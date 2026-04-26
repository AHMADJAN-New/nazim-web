import type * as HostelApi from '@/types/api/hostel';
import type {
  HostelBuildingReport,
  HostelOverview,
  HostelRoom,
  HostelSummary,
  HostelUnassignedBoarder,
} from '@/types/domain/hostel';

/** Laravel may JSON-encode keyed collections as objects; normalize to array. */
function asJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value !== null && typeof value === 'object') {
    return Object.values(value) as T[];
  }
  return [];
}

export const mapHostelSummaryApiToDomain = (summary: HostelApi.HostelSummary): HostelSummary => ({
  totalRooms: summary.total_rooms,
  occupiedRooms: summary.occupied_rooms,
  totalStudentsInRooms: summary.total_students_in_rooms,
  totalBuildings: summary.total_buildings,
  uniqueWardens: summary.unique_wardens,
  unassignedBoarders: summary.unassigned_boarders,
  occupancyRate: summary.occupancy_rate,
});

export const mapHostelRoomApiToDomain = (room: HostelApi.HostelRoom): HostelRoom => ({
  id: room.id,
  roomNumber: room.room_number,
  capacity: room.capacity,
  buildingId: room.building_id,
  buildingName: room.building_name,
  staffId: room.staff_id,
  staffName: room.staff_name,
  occupants: asJsonArray<HostelApi.HostelOccupant>(room.occupants).map((occupant) => ({
    id: occupant.id,
    studentId: occupant.student_id,
    studentName: occupant.student_name,
    fatherName: occupant.father_name ?? null,
    admissionNumber: occupant.admission_number,
    cardNumber: occupant.card_number ?? null,
    admissionYear: occupant.admission_year,
    academicYearId: occupant.academic_year_id ?? null,
    academicYearName: occupant.academic_year_name ?? null,
    classId: occupant.class_id ?? null,
    classAcademicYearId: occupant.class_academic_year_id ?? null,
    className: occupant.class_name ?? null,
    residencyTypeId: occupant.residency_type_id ?? null,
    residencyTypeName: occupant.residency_type_name ?? null,
    enrollmentStatus: occupant.enrollment_status ?? null,
  })),
});

export const mapHostelBuildingApiToDomain = (building: HostelApi.HostelBuildingReport): HostelBuildingReport => ({
  id: building.id,
  buildingName: building.building_name,
  roomCount: building.room_count,
  occupiedRooms: building.occupied_rooms,
  studentsInRooms: building.students_in_rooms,
  wardensAssigned: building.wardens_assigned,
});

export const mapUnassignedBoarderApiToDomain = (
  admission: HostelApi.HostelUnassignedBoarder
): HostelUnassignedBoarder => ({
  id: admission.id,
  studentId: admission.student_id,
  studentName: admission.student_name,
  fatherName: admission.father_name ?? null,
  admissionNumber: admission.admission_number,
  cardNumber: admission.card_number ?? null,
  admissionYear: admission.admission_year ?? null,
  academicYearId: admission.academic_year_id ?? null,
  academicYearName: admission.academic_year_name ?? null,
  classId: admission.class_id,
  classAcademicYearId: admission.class_academic_year_id ?? null,
  className: admission.class_name,
  residencyTypeId: admission.residency_type_id,
  residencyTypeName: admission.residency_type_name,
  enrollmentStatus: admission.enrollment_status ?? null,
});

export const mapHostelOverviewApiToDomain = (payload: HostelApi.HostelOverviewResponse): HostelOverview => ({
  summary: mapHostelSummaryApiToDomain(payload.summary),
  rooms: asJsonArray<HostelApi.HostelRoom>(payload.rooms).map(mapHostelRoomApiToDomain),
  buildings: asJsonArray<HostelApi.HostelBuildingReport>(payload.buildings).map(mapHostelBuildingApiToDomain),
  unassignedBoarders: asJsonArray<HostelApi.HostelUnassignedBoarder>(payload.unassigned_boarders).map(
    mapUnassignedBoarderApiToDomain
  ),
});
