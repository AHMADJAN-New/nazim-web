// Grade Domain Types - UI-friendly structure (camelCase, nested objects)

export interface Grade {
    id: string;
    organizationId: string;
    nameEn: string;
    nameAr: string;
    namePs: string;
    nameFa: string;
    minPercentage: number;
    maxPercentage: number;
    order: number;
    isPass: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface GradeDetails {
    id: string;
    name: string;
    nameEn: string;
    nameAr: string;
    namePs: string;
    nameFa: string;
    minPercentage: number;
    maxPercentage: number;
    order: number;
    isPass: boolean;
}

export interface GradeFormData {
    nameEn: string;
    nameAr: string;
    namePs: string;
    nameFa: string;
    minPercentage: number;
    maxPercentage: number;
    order: number;
    isPass: boolean;
}
