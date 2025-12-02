// Academic Year Domain Types - UI-friendly structure (camelCase, nested objects)

export interface AcademicYear {
    id: string;
    organizationId: string | null;
    name: string;
    startDate: Date;
    endDate: Date;
    isCurrent: boolean;
    description: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
