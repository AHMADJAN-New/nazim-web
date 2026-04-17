// Room Domain Types - UI-friendly structure (camelCase, nested objects)

export interface Room {
    id: string;
    roomNumber: string;
    capacity: number | null;
    buildingId: string;
    schoolId: string;
    staffId: string | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    // Extended with relationship data
    building?: {
        id: string;
        buildingName: string;
        schoolId: string;
    };
    staff?: {
        id: string;
        duty?: string | null;
        profile?: {
            fullName: string;
        };
    } | null;
}
