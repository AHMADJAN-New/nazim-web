// School Domain Types - UI-friendly structure (camelCase, nested objects)

export interface School {
    id: string;
    organizationId: string;
    schoolName: string;
    schoolNameArabic: string | null;
    schoolNamePashto: string | null;
    schoolAddress: string | null;
    schoolPhone: string | null;
    schoolEmail: string | null;
    schoolWebsite: string | null;
    logoPath: string | null;
    headerImagePath: string | null;
    footerText: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    reportFontSize: string;
    primaryLogoBinary: Uint8Array | null;
    primaryLogoMimeType: string | null;
    primaryLogoFilename: string | null;
    primaryLogoSize: number | null;
    secondaryLogoBinary: Uint8Array | null;
    secondaryLogoMimeType: string | null;
    secondaryLogoFilename: string | null;
    secondaryLogoSize: number | null;
    ministryLogoBinary: Uint8Array | null;
    ministryLogoMimeType: string | null;
    ministryLogoFilename: string | null;
    ministryLogoSize: number | null;
    primaryLogoUsage: string;
    secondaryLogoUsage: string;
    ministryLogoUsage: string;
    headerText: string | null;
    tableAlternatingColors: boolean;
    showPageNumbers: boolean;
    showGenerationDate: boolean;
    reportLogoSelection: string;
    calendarPreference: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
