// Building Domain Types - UI-friendly structure (camelCase, nested objects)

export interface SchoolInfo {
    id: string;
    schoolName: string;
    schoolNameArabic?: string | null;
    schoolNamePashto?: string | null;
}

export interface Building {
    id: string;
    buildingName: string;
    schoolId: string;
    organizationId?: string | null; // Computed from school relationship
    school?: SchoolInfo | null; // School information
    roomsCount?: number; // Number of rooms in this building
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
