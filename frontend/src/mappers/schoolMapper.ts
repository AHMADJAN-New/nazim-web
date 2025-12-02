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
        font_family: domain.fontFamily || 'Arial',
        report_font_size: domain.reportFontSize || '12pt',
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
        calendar_preference: domain.calendarPreference || 'gregorian',
        is_active: domain.isActive ?? true,
    };
}

/**
 * Convert Domain School model to API SchoolUpdate payload
 */
export function mapSchoolDomainToUpdate(domain: Partial<School>): SchoolApi.SchoolUpdate {
    return mapSchoolDomainToInsert(domain);
}
