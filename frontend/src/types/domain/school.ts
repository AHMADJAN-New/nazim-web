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
    primaryLogoBinary: string | null; // Base64 encoded binary data
    primaryLogoMimeType: string | null;
    primaryLogoFilename: string | null;
    primaryLogoSize: number | null;
    secondaryLogoBinary: string | null; // Base64 encoded binary data
    secondaryLogoMimeType: string | null;
    secondaryLogoFilename: string | null;
    secondaryLogoSize: number | null;
    ministryLogoBinary: string | null; // Base64 encoded binary data
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
    showPrimaryLogo: boolean;
    showSecondaryLogo: boolean;
    showMinistryLogo: boolean;
    primaryLogoPosition: string;
    secondaryLogoPosition: string | null;
    ministryLogoPosition: string | null;
    calendarPreference: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
