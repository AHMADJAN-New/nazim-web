// Organization Domain Types - UI-friendly structure (camelCase, nested objects)

export interface Organization {
    id: string;
    name: string;
    slug: string;
    settings?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
    deletedAt?: Date | null;
}
