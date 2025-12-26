// School Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as SchoolApi from '@/types/api/school';
import type { School } from '@/types/domain/school';

/**
 * Convert API School model to Domain School model
 */
export function mapSchoolApiToDomain(api: SchoolApi.School): School {
    return {
        id: api.id,
        organizationId: api.organization_id,
        schoolName: api.school_name,
        schoolNameArabic: api.school_name_arabic,
        schoolNamePashto: api.school_name_pashto,
        schoolAddress: api.school_address,
        schoolPhone: api.school_phone,
        schoolEmail: api.school_email,
        schoolWebsite: api.school_website,
        logoPath: api.logo_path,
        headerImagePath: api.header_image_path,
        footerText: api.footer_text,
        primaryColor: api.primary_color,
        secondaryColor: api.secondary_color,
        accentColor: api.accent_color,
        fontFamily: api.font_family,
        reportFontSize: api.report_font_size,
        primaryLogoBinary: api.primary_logo_binary,
        primaryLogoMimeType: api.primary_logo_mime_type,
        primaryLogoFilename: api.primary_logo_filename,
        primaryLogoSize: api.primary_logo_size,
        secondaryLogoBinary: api.secondary_logo_binary,
        secondaryLogoMimeType: api.secondary_logo_mime_type,
        secondaryLogoFilename: api.secondary_logo_filename,
        secondaryLogoSize: api.secondary_logo_size,
        ministryLogoBinary: api.ministry_logo_binary,
        ministryLogoMimeType: api.ministry_logo_mime_type,
        ministryLogoFilename: api.ministry_logo_filename,
        ministryLogoSize: api.ministry_logo_size,
        primaryLogoUsage: api.primary_logo_usage,
        secondaryLogoUsage: api.secondary_logo_usage,
        ministryLogoUsage: api.ministry_logo_usage,
        headerText: api.header_text,
        tableAlternatingColors: api.table_alternating_colors,
        showPageNumbers: api.show_page_numbers,
        showGenerationDate: api.show_generation_date,
        reportLogoSelection: api.report_logo_selection,
        showPrimaryLogo: api.show_primary_logo ?? true,
        showSecondaryLogo: api.show_secondary_logo ?? false,
        showMinistryLogo: api.show_ministry_logo ?? false,
        primaryLogoPosition: api.primary_logo_position || 'left',
        secondaryLogoPosition: api.secondary_logo_position || null,
        ministryLogoPosition: api.ministry_logo_position || null,
        calendarPreference: api.calendar_preference,
        isActive: api.is_active,
        createdAt: api.created_at ? new Date(api.created_at) : new Date(),
        updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
        deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
    };
}

/**
 * Convert Domain School model to API SchoolInsert payload
 */
export function mapSchoolDomainToInsert(domain: Partial<School>): SchoolApi.SchoolInsert {
    return {
        organization_id: domain.organizationId || '',
        school_name: domain.schoolName || '',
        school_name_arabic: domain.schoolNameArabic || null,
        school_name_pashto: domain.schoolNamePashto || null,
        school_address: domain.schoolAddress || null,
        school_phone: domain.schoolPhone || null,
        school_email: domain.schoolEmail || null,
        school_website: domain.schoolWebsite || null,
        logo_path: domain.logoPath || null,
        header_image_path: domain.headerImagePath || null,
        footer_text: domain.footerText || null,
        primary_color: domain.primaryColor || '#000000',
        secondary_color: domain.secondaryColor || '#ffffff',
        accent_color: domain.accentColor || '#0066cc',
        font_family: domain.fontFamily || 'Bahij Nassim',
        report_font_size: domain.reportFontSize || '12px',
        primary_logo_binary: domain.primaryLogoBinary || null,
        primary_logo_mime_type: domain.primaryLogoMimeType || null,
        primary_logo_filename: domain.primaryLogoFilename || null,
        primary_logo_size: domain.primaryLogoSize || null,
        secondary_logo_binary: domain.secondaryLogoBinary || null,
        secondary_logo_mime_type: domain.secondaryLogoMimeType || null,
        secondary_logo_filename: domain.secondaryLogoFilename || null,
        secondary_logo_size: domain.secondaryLogoSize || null,
        ministry_logo_binary: domain.ministryLogoBinary || null,
        ministry_logo_mime_type: domain.ministryLogoMimeType || null,
        ministry_logo_filename: domain.ministryLogoFilename || null,
        ministry_logo_size: domain.ministryLogoSize || null,
        primary_logo_usage: domain.primaryLogoUsage || 'header',
        secondary_logo_usage: domain.secondaryLogoUsage || 'footer',
        ministry_logo_usage: domain.ministryLogoUsage || 'none',
        header_text: domain.headerText || null,
        table_alternating_colors: domain.tableAlternatingColors ?? true,
        show_page_numbers: domain.showPageNumbers ?? true,
        show_generation_date: domain.showGenerationDate ?? true,
        report_logo_selection: domain.reportLogoSelection || 'primary',
        show_primary_logo: domain.showPrimaryLogo ?? true,
        show_secondary_logo: domain.showSecondaryLogo ?? false,
        show_ministry_logo: domain.showMinistryLogo ?? false,
        primary_logo_position: domain.primaryLogoPosition || 'left',
        secondary_logo_position: domain.secondaryLogoPosition || null,
        ministry_logo_position: domain.ministryLogoPosition || null,
        calendar_preference: domain.calendarPreference || 'gregorian',
        is_active: domain.isActive ?? true,
    };
}

/**
 * Convert Domain School model to API SchoolUpdate payload
 */
/**
 * Convert Domain School model to API SchoolUpdate payload
 * Only includes fields that are explicitly provided (not undefined)
 */
export function mapSchoolDomainToUpdate(domain: Partial<School>): SchoolApi.SchoolUpdate {
    const update: SchoolApi.SchoolUpdate = {};
    
    // Only include fields that are explicitly provided (not undefined)
    if (domain.organizationId !== undefined) update.organization_id = domain.organizationId;
    if (domain.schoolName !== undefined) update.school_name = domain.schoolName;
    if (domain.schoolNameArabic !== undefined) update.school_name_arabic = domain.schoolNameArabic;
    if (domain.schoolNamePashto !== undefined) update.school_name_pashto = domain.schoolNamePashto;
    if (domain.schoolAddress !== undefined) update.school_address = domain.schoolAddress;
    if (domain.schoolPhone !== undefined) update.school_phone = domain.schoolPhone;
    if (domain.schoolEmail !== undefined) update.school_email = domain.schoolEmail;
    if (domain.schoolWebsite !== undefined) update.school_website = domain.schoolWebsite;
    if (domain.logoPath !== undefined) update.logo_path = domain.logoPath;
    if (domain.headerImagePath !== undefined) update.header_image_path = domain.headerImagePath;
    if (domain.footerText !== undefined) update.footer_text = domain.footerText;
    if (domain.primaryColor !== undefined) update.primary_color = domain.primaryColor;
    if (domain.secondaryColor !== undefined) update.secondary_color = domain.secondaryColor;
    if (domain.accentColor !== undefined) update.accent_color = domain.accentColor;
    if (domain.fontFamily !== undefined) update.font_family = domain.fontFamily;
    if (domain.reportFontSize !== undefined) update.report_font_size = domain.reportFontSize;
    if (domain.primaryLogoBinary !== undefined) update.primary_logo_binary = domain.primaryLogoBinary;
    if (domain.primaryLogoMimeType !== undefined) update.primary_logo_mime_type = domain.primaryLogoMimeType;
    if (domain.primaryLogoFilename !== undefined) update.primary_logo_filename = domain.primaryLogoFilename;
    if (domain.primaryLogoSize !== undefined) update.primary_logo_size = domain.primaryLogoSize;
    if (domain.secondaryLogoBinary !== undefined) update.secondary_logo_binary = domain.secondaryLogoBinary;
    if (domain.secondaryLogoMimeType !== undefined) update.secondary_logo_mime_type = domain.secondaryLogoMimeType;
    if (domain.secondaryLogoFilename !== undefined) update.secondary_logo_filename = domain.secondaryLogoFilename;
    if (domain.secondaryLogoSize !== undefined) update.secondary_logo_size = domain.secondaryLogoSize;
    if (domain.ministryLogoBinary !== undefined) update.ministry_logo_binary = domain.ministryLogoBinary;
    if (domain.ministryLogoMimeType !== undefined) update.ministry_logo_mime_type = domain.ministryLogoMimeType;
    if (domain.ministryLogoFilename !== undefined) update.ministry_logo_filename = domain.ministryLogoFilename;
    if (domain.ministryLogoSize !== undefined) update.ministry_logo_size = domain.ministryLogoSize;
    if (domain.primaryLogoUsage !== undefined) update.primary_logo_usage = domain.primaryLogoUsage;
    if (domain.secondaryLogoUsage !== undefined) update.secondary_logo_usage = domain.secondaryLogoUsage;
    if (domain.ministryLogoUsage !== undefined) update.ministry_logo_usage = domain.ministryLogoUsage;
    if (domain.headerText !== undefined) update.header_text = domain.headerText;
    if (domain.tableAlternatingColors !== undefined) update.table_alternating_colors = domain.tableAlternatingColors;
    if (domain.showPageNumbers !== undefined) update.show_page_numbers = domain.showPageNumbers;
    if (domain.showGenerationDate !== undefined) update.show_generation_date = domain.showGenerationDate;
    if (domain.reportLogoSelection !== undefined) update.report_logo_selection = domain.reportLogoSelection;
    if (domain.showPrimaryLogo !== undefined) update.show_primary_logo = domain.showPrimaryLogo;
    if (domain.showSecondaryLogo !== undefined) update.show_secondary_logo = domain.showSecondaryLogo;
    if (domain.showMinistryLogo !== undefined) update.show_ministry_logo = domain.showMinistryLogo;
    if (domain.primaryLogoPosition !== undefined) update.primary_logo_position = domain.primaryLogoPosition;
    if (domain.secondaryLogoPosition !== undefined) update.secondary_logo_position = domain.secondaryLogoPosition;
    if (domain.ministryLogoPosition !== undefined) update.ministry_logo_position = domain.ministryLogoPosition;
    if (domain.calendarPreference !== undefined) update.calendar_preference = domain.calendarPreference;
    if (domain.isActive !== undefined) update.is_active = domain.isActive;
    
    return update;
}
