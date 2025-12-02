// Room Domain Types - UI-friendly structure (camelCase, nested objects)

export interface Room {
    id: string;
    roomNumber: string;
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
        profile?: {
            fullName: string;
        };
    } | null;
}
