// Building Domain Types - UI-friendly structure (camelCase, nested objects)

export interface Building {
    id: string;
    buildingName: string;
    schoolId: string;
    organizationId?: string | null; // Computed from school relationship
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
