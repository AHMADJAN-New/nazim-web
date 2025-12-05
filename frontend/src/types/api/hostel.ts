export interface HostelOccupant {
  id: string;
  student_id: string;
  student_name: string | null;
  admission_number: string | null;
  admission_year: string | null;
}

export interface HostelRoom {
  id: string;
  room_number: string;
  building_id: string | null;
  building_name: string | null;
  staff_id: string | null;
  staff_name: string | null;
  occupants: HostelOccupant[];
}

export interface HostelBuildingReport {
  id: string;
  building_name: string;
  room_count: number;
  occupied_rooms: number;
  students_in_rooms: number;
  wardens_assigned: number;
}

export interface HostelSummary {
  total_rooms: number;
  occupied_rooms: number;
  total_students_in_rooms: number;
  total_buildings: number;
  unique_wardens: number;
  unassigned_boarders: number;
  occupancy_rate: number;
}

export interface HostelOverviewResponse {
  summary: HostelSummary;
  rooms: HostelRoom[];
  buildings: HostelBuildingReport[];
  unassigned_boarders?: HostelUnassignedBoarder[];
}

export interface HostelUnassignedBoarder {
  id: string;
  student_id: string;
  student_name: string | null;
  admission_number: string | null;
  class_id: string | null;
  class_name: string | null;
  residency_type_id: string | null;
  residency_type_name: string | null;
}
