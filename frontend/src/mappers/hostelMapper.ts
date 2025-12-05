import type * as HostelApi from '@/types/api/hostel';
import type {
  HostelBuildingReport,
  HostelOverview,
  HostelRoom,
  HostelSummary,
  HostelUnassignedBoarder,
} from '@/types/domain/hostel';

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
  buildingId: room.building_id,
  buildingName: room.building_name,
  staffId: room.staff_id,
  staffName: room.staff_name,
  occupants: (room.occupants || []).map((occupant) => ({
    id: occupant.id,
    studentId: occupant.student_id,
    studentName: occupant.student_name,
    admissionNumber: occupant.admission_number,
    admissionYear: occupant.admission_year,
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
  admissionNumber: admission.admission_number,
  classId: admission.class_id,
  className: admission.class_name,
  residencyTypeId: admission.residency_type_id,
  residencyTypeName: admission.residency_type_name,
});

export const mapHostelOverviewApiToDomain = (payload: HostelApi.HostelOverviewResponse): HostelOverview => ({
  summary: mapHostelSummaryApiToDomain(payload.summary),
  rooms: (payload.rooms || []).map(mapHostelRoomApiToDomain),
  buildings: (payload.buildings || []).map(mapHostelBuildingApiToDomain),
  unassignedBoarders: (payload.unassigned_boarders || []).map(mapUnassignedBoarderApiToDomain),
});
