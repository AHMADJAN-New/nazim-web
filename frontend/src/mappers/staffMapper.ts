// Staff Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as StaffApi from '@/types/api/staff';
import type { Staff, StaffType, StaffDocument, Address, OriginLocation, CurrentLocation, Education } from '@/types/domain/staff';

/**
 * Convert API Staff model to Domain Staff model
 */
export function mapStaffApiToDomain(api: StaffApi.Staff): Staff {
  // Parse address from home_address
  const address: Address = {
    street: api.home_address || '',
    city: api.current_district || api.origin_district || '',
    state: api.current_province || api.origin_province || '',
    country: '',
    postalCode: '',
    landmark: undefined,
  };

  // Parse origin location
  const originLocation: OriginLocation = {
    province: api.origin_province,
    district: api.origin_district,
    village: api.origin_village,
  };

  // Parse current location
  const currentLocation: CurrentLocation = {
    province: api.current_province,
    district: api.current_district,
    village: api.current_village,
  };

  // Parse religious education
  const religiousEducation: Education = {
    level: api.religious_education,
    institution: api.religious_university,
    graduationYear: api.religious_graduation_year,
    department: api.religious_department,
  };

  // Parse modern education
  const modernEducation: Education = {
    level: api.modern_education,
    institution: api.modern_school_university,
    graduationYear: api.modern_graduation_year,
    department: api.modern_department,
  };

  // Parse dates
  const createdAt = api.created_at ? new Date(api.created_at) : new Date();
  const updatedAt = api.updated_at ? new Date(api.updated_at) : new Date();
  const deletedAt = api.deleted_at ? new Date(api.deleted_at) : null;
  const dateOfBirth = api.birth_date ? new Date(api.birth_date) : null;

  return {
    id: api.id,
    profileId: api.profile_id,
    organizationId: api.organization_id,
    employeeId: api.employee_id,
    staffCode: api.staff_code,
    staffType: api.staff_type,
    staffTypeId: api.staff_type_id,
    schoolId: api.school_id,
    
    // Personal Information
    firstName: api.first_name,
    fatherName: api.father_name,
    grandfatherName: api.grandfather_name,
    fullName: api.full_name,
    tazkiraNumber: api.tazkira_number,
    dateOfBirth,
    birthYear: api.birth_year,
    birthDate: api.birth_date,
    
    // Contact Information
    phoneNumber: api.phone_number,
    email: api.email,
    address,
    homeAddress: api.home_address,
    
    // Location Information
    originLocation,
    currentLocation,
    
    // Education Information
    religiousEducation,
    modernEducation,
    
    // Professional Information
    teachingSection: api.teaching_section,
    position: api.position,
    duty: api.duty,
    salary: api.salary,
    status: api.status,
    
    // Media and Documents
    pictureUrl: api.picture_url,
    documentUrls: api.document_urls || [],
    documents: [], // Documents are fetched separately
    
    // Additional Information
    notes: api.notes,
    
    // System Information
    createdBy: api.created_by,
    updatedBy: api.updated_by,
    createdAt,
    updatedAt,
    deletedAt,
    
    // Relations
    staffTypeRelation: api.staff_type ? mapStaffTypeApiToDomain(api.staff_type) : undefined,
    profile: api.profile,
    organization: api.organization,
    school: api.school ? {
      id: api.school.id,
      schoolName: api.school.school_name,
    } : undefined,
  };
}

/**
 * Convert Domain Staff model to API StaffInsert payload
 */
export function mapStaffDomainToInsert(domain: Partial<Staff>): StaffApi.StaffInsert {
  return {
    profile_id: domain.profileId || null,
    organization_id: domain.organizationId || '',
    employee_id: domain.employeeId || '',
    staff_code: domain.staffCode || null,
    staff_type: domain.staffType || '',
    staff_type_id: domain.staffTypeId || null,
    school_id: domain.schoolId || null,
    first_name: domain.firstName || '',
    father_name: domain.fatherName || '',
    grandfather_name: domain.grandfatherName || null,
    tazkira_number: domain.tazkiraNumber || null,
    birth_year: domain.birthYear || null,
    birth_date: domain.birthDate || domain.dateOfBirth?.toISOString() || null,
    phone_number: domain.phoneNumber || null,
    email: domain.email || null,
    home_address: domain.homeAddress || (domain.address 
      ? `${domain.address.street}, ${domain.address.city}, ${domain.address.state}` 
      : null),
    origin_province: domain.originLocation?.province || null,
    origin_district: domain.originLocation?.district || null,
    origin_village: domain.originLocation?.village || null,
    current_province: domain.currentLocation?.province || null,
    current_district: domain.currentLocation?.district || null,
    current_village: domain.currentLocation?.village || null,
    religious_education: domain.religiousEducation?.level || null,
    religious_university: domain.religiousEducation?.institution || null,
    religious_graduation_year: domain.religiousEducation?.graduationYear || null,
    religious_department: domain.religiousEducation?.department || null,
    modern_education: domain.modernEducation?.level || null,
    modern_school_university: domain.modernEducation?.institution || null,
    modern_graduation_year: domain.modernEducation?.graduationYear || null,
    modern_department: domain.modernEducation?.department || null,
    teaching_section: domain.teachingSection || null,
    position: domain.position || null,
    duty: domain.duty || null,
    salary: domain.salary || null,
    status: domain.status || 'active',
    picture_url: domain.pictureUrl || null,
    document_urls: domain.documentUrls || [],
    notes: domain.notes || null,
    created_by: domain.createdBy || null,
    updated_by: domain.updatedBy || null,
  };
}

/**
 * Convert Domain Staff model to API StaffUpdate payload
 */
export function mapStaffDomainToUpdate(domain: Partial<Staff>): StaffApi.StaffUpdate {
  const insertData = mapStaffDomainToInsert(domain);
  
  // For updates, only include fields that are actually being updated
  // Don't include staff_type if it's not provided (empty string means not updating)
  const updateData: StaffApi.StaffUpdate = {};
  
  // Only include fields that are explicitly provided (not undefined)
  if (domain.profileId !== undefined) updateData.profile_id = insertData.profile_id;
  if (domain.employeeId !== undefined) updateData.employee_id = insertData.employee_id;
  if (domain.staffCode !== undefined) updateData.staff_code = insertData.staff_code;
  if (domain.staffTypeId !== undefined) updateData.staff_type_id = insertData.staff_type_id;
  // Only include staff_type if staffType is explicitly provided (not empty string)
  if (domain.staffType !== undefined && domain.staffType !== '') {
    updateData.staff_type = insertData.staff_type;
  }
  if (domain.schoolId !== undefined) updateData.school_id = insertData.school_id;
  if (domain.firstName !== undefined) updateData.first_name = insertData.first_name;
  if (domain.fatherName !== undefined) updateData.father_name = insertData.father_name;
  if (domain.grandfatherName !== undefined) updateData.grandfather_name = insertData.grandfather_name;
  if (domain.tazkiraNumber !== undefined) updateData.tazkira_number = insertData.tazkira_number;
  if (domain.birthYear !== undefined) updateData.birth_year = insertData.birth_year;
  if (domain.birthDate !== undefined || domain.dateOfBirth !== undefined) updateData.birth_date = insertData.birth_date;
  if (domain.phoneNumber !== undefined) updateData.phone_number = insertData.phone_number;
  if (domain.email !== undefined) updateData.email = insertData.email;
  if (domain.homeAddress !== undefined || domain.address !== undefined) updateData.home_address = insertData.home_address;
  if (domain.originLocation !== undefined) {
    updateData.origin_province = insertData.origin_province;
    updateData.origin_district = insertData.origin_district;
    updateData.origin_village = insertData.origin_village;
  }
  if (domain.currentLocation !== undefined) {
    updateData.current_province = insertData.current_province;
    updateData.current_district = insertData.current_district;
    updateData.current_village = insertData.current_village;
  }
  if (domain.religiousEducation !== undefined) {
    updateData.religious_education = insertData.religious_education;
    updateData.religious_university = insertData.religious_university;
    updateData.religious_graduation_year = insertData.religious_graduation_year;
    updateData.religious_department = insertData.religious_department;
  }
  if (domain.modernEducation !== undefined) {
    updateData.modern_education = insertData.modern_education;
    updateData.modern_school_university = insertData.modern_school_university;
    updateData.modern_graduation_year = insertData.modern_graduation_year;
    updateData.modern_department = insertData.modern_department;
  }
  if (domain.teachingSection !== undefined) updateData.teaching_section = insertData.teaching_section;
  if (domain.position !== undefined) updateData.position = insertData.position;
  if (domain.duty !== undefined) updateData.duty = insertData.duty;
  if (domain.salary !== undefined) updateData.salary = insertData.salary;
  if (domain.status !== undefined) updateData.status = insertData.status;
  if (domain.pictureUrl !== undefined) updateData.picture_url = insertData.picture_url;
  if (domain.documentUrls !== undefined) updateData.document_urls = insertData.document_urls;
  if (domain.notes !== undefined) updateData.notes = insertData.notes;
  if (domain.updatedBy !== undefined) updateData.updated_by = insertData.updated_by;
  
  return updateData;
}

/**
 * Convert API StaffType model to Domain StaffType model
 */
export function mapStaffTypeApiToDomain(api: StaffApi.StaffType): StaffType {
  return {
    id: api.id,
    organizationId: api.organization_id,
    name: api.name,
    code: api.code,
    description: api.description,
    isActive: api.is_active,
    displayOrder: api.display_order,
    createdAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain StaffType model to API StaffTypeInsert payload
 */
export function mapStaffTypeDomainToInsert(domain: Partial<StaffType>): StaffApi.StaffTypeInsert {
  return {
    organization_id: domain.organizationId || null,
    name: domain.name || '',
    code: domain.code || '',
    description: domain.description || null,
    is_active: domain.isActive ?? true,
    display_order: domain.displayOrder ?? 0,
  };
}

/**
 * Convert Domain StaffType model to API StaffTypeUpdate payload
 */
export function mapStaffTypeDomainToUpdate(domain: Partial<StaffType>): StaffApi.StaffTypeUpdate {
  return mapStaffTypeDomainToInsert(domain);
}

/**
 * Convert API StaffDocument model to Domain StaffDocument model
 */
export function mapStaffDocumentApiToDomain(api: StaffApi.StaffDocument): StaffDocument {
  return {
    id: api.id,
    staffId: api.staff_id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    documentType: api.document_type,
    fileName: api.file_name,
    filePath: api.file_path,
    fileSize: api.file_size,
    mimeType: api.mime_type,
    description: api.description,
    uploadedBy: api.uploaded_by,
    uploadedAt: api.created_at ? new Date(api.created_at) : new Date(),
    updatedAt: api.updated_at ? new Date(api.updated_at) : new Date(),
    deletedAt: api.deleted_at ? new Date(api.deleted_at) : null,
  };
}

/**
 * Convert Domain StaffDocument model to API StaffDocumentInsert payload
 */
export function mapStaffDocumentDomainToInsert(domain: Partial<StaffDocument>): StaffApi.StaffDocumentInsert {
  return {
    staff_id: domain.staffId || '',
    organization_id: domain.organizationId || '',
    school_id: domain.schoolId || null,
    document_type: domain.documentType || '',
    file_name: domain.fileName || '',
    file_path: domain.filePath || '',
    file_size: domain.fileSize || null,
    mime_type: domain.mimeType || null,
    description: domain.description || null,
    uploaded_by: domain.uploadedBy || null,
  };
}

/**
 * Convert Domain StaffDocument model to API StaffDocumentUpdate payload
 */
export function mapStaffDocumentDomainToUpdate(domain: Partial<StaffDocument>): StaffApi.StaffDocumentUpdate {
  return mapStaffDocumentDomainToInsert(domain);
}
