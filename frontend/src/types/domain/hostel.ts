export interface HostelOccupant {
  id: string;
  studentId: string;
  studentName: string | null;
  fatherName: string | null;
  admissionNumber: string | null;
  cardNumber: string | null;
  admissionYear: string | null;
  academicYearId: string | null;
  academicYearName: string | null;
  classId: string | null;
  classAcademicYearId: string | null;
  className: string | null;
  residencyTypeId: string | null;
  residencyTypeName: string | null;
  enrollmentStatus: string | null;
}

export interface HostelRoom {
  id: string;
  roomNumber: string;
  capacity: number | null;
  buildingId: string | null;
  buildingName: string | null;
  staffId: string | null;
  staffName: string | null;
  occupants: HostelOccupant[];
}

export interface HostelBuildingReport {
  id: string;
  buildingName: string;
  roomCount: number;
  occupiedRooms: number;
  studentsInRooms: number;
  wardensAssigned: number;
}

export interface HostelSummary {
  totalRooms: number;
  occupiedRooms: number;
  totalStudentsInRooms: number;
  totalBuildings: number;
  uniqueWardens: number;
  unassignedBoarders: number;
  occupancyRate: number;
}

export interface HostelOverview {
  summary: HostelSummary;
  rooms: HostelRoom[];
  buildings: HostelBuildingReport[];
  unassignedBoarders: HostelUnassignedBoarder[];
}

export interface HostelUnassignedBoarder {
  id: string;
  studentId: string;
  studentName: string | null;
  fatherName: string | null;
  admissionNumber: string | null;
  cardNumber: string | null;
  admissionYear: string | null;
  academicYearId: string | null;
  academicYearName: string | null;
  classId: string | null;
  classAcademicYearId: string | null;
  className: string | null;
  residencyTypeId: string | null;
  residencyTypeName: string | null;
  enrollmentStatus: string | null;
}
