// Student Mapper - Converts between API (snake_case) and Domain (camelCase) models

import type * as StudentApi from '@/types/api/student';
import type { Student, Address, Guardian, HealthInfo, PreviousSchool, StudentDocument } from '@/types/domain/student';

/**
 * Convert API Student model to Domain Student model
 */
export function mapStudentApiToDomain(api: StudentApi.Student): Student {
  // Parse address from home_address or construct from location fields
  const address: Address = {
    street: api.home_address || '',
    city: api.curr_district || api.orig_district || '',
    state: api.curr_province || api.orig_province || '',
    country: api.nationality || '',
    postalCode: '',
    landmark: undefined,
  };

  // Parse guardians - if guardian info exists, create guardian object
  const guardians: Guardian[] = [];
  if (api.guardian_name) {
    guardians.push({
      id: `guardian-${api.id}`,
      relationship: (api.guardian_relation as Guardian['relationship']) || 'guardian',
      firstName: api.guardian_name.split(' ')[0] || api.guardian_name,
      lastName: api.guardian_name.split(' ').slice(1).join(' ') || '',
      phone: api.guardian_phone || '',
      email: undefined,
      occupation: '',
      workAddress: undefined,
      annualIncome: undefined,
      isPrimary: true,
      photo: api.guardian_picture_path || undefined,
    });
  }

  // Parse health info
  const healthInfo: HealthInfo = {
    allergies: undefined,
    medicalConditions: api.disability_status ? [api.disability_status] : undefined,
    medications: undefined,
    emergencyContact: {
      name: api.emergency_contact_name || api.guardian_name || '',
      relationship: api.guardian_relation || 'guardian',
      phone: api.emergency_contact_phone || api.guardian_phone || '',
    },
    bloodGroup: undefined,
    height: undefined,
    weight: undefined,
    lastCheckupDate: undefined,
  };

  // Parse previous schools
  const previousSchools: PreviousSchool[] = [];
  if (api.previous_school) {
    previousSchools.push({
      name: api.previous_school,
      board: '',
      classCompleted: api.applying_grade || '',
      yearOfPassing: api.admission_year ? parseInt(api.admission_year) : new Date().getFullYear(),
      percentage: undefined,
      tcNumber: undefined,
      reasonForLeaving: undefined,
    });
  }

  // Parse name into first and last name
  const nameParts = api.full_name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Parse dates
  const createdAt = api.created_at ? new Date(api.created_at) : new Date();
  const updatedAt = api.updated_at ? new Date(api.updated_at) : new Date();
  const deletedAt = api.deleted_at ? new Date(api.deleted_at) : null;
  const dateOfBirth = api.birth_date ? new Date(api.birth_date) : undefined;

  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    admissionNumber: api.admission_no,
    studentCode: api.student_code,
    cardNumber: api.card_number,
    rollNumber: undefined,
    
    // Personal Information
    fullName: api.full_name,
    firstName,
    lastName,
    fatherName: api.father_name,
    grandfatherName: api.grandfather_name,
    motherName: api.mother_name,
    gender: api.gender,
    dateOfBirth,
    birthYear: api.birth_year,
    birthDate: api.birth_date,
    age: api.age,
    bloodGroup: undefined,
    religion: undefined,
    nationality: api.nationality,
    preferredLanguage: api.preferred_language,
    
    // Contact Information
    phone: api.guardian_phone || undefined,
    email: undefined,
    address,
    homeAddress: api.home_address,
    
    // Guardian Information
    guardians,
    guardianName: api.guardian_name,
    guardianRelation: api.guardian_relation,
    guardianPhone: api.guardian_phone,
    guardianTazkira: api.guardian_tazkira,
    guardianPicturePath: api.guardian_picture_path,
    
    // Zamin Information
    zaminName: api.zamin_name,
    zaminPhone: api.zamin_phone,
    zaminTazkira: api.zamin_tazkira,
    zaminAddress: api.zamin_address,
    
    // Academic Information
    admissionYear: api.admission_year,
    applyingGrade: api.applying_grade,
    previousSchool: api.previous_school,
    previousSchools,
    
    // Location Information
    origProvince: api.orig_province,
    origDistrict: api.orig_district,
    origVillage: api.orig_village,
    currProvince: api.curr_province,
    currDistrict: api.curr_district,
    currVillage: api.curr_village,
    
    // Status and Fees
    status: api.student_status as Student['status'],
    admissionFeeStatus: api.admission_fee_status,
    isOrphan: api.is_orphan,
    disabilityStatus: api.disability_status,
    
    // Health Information
    healthInfo,
    emergencyContactName: api.emergency_contact_name,
    emergencyContactPhone: api.emergency_contact_phone,
    
    // Financial Information
    familyIncome: api.family_income,
    
    // Documents and Media
    profilePhoto: api.picture_path || undefined,
    picturePath: api.picture_path,
    documents: [], // Documents are fetched separately
    
    // System Information
    createdAt,
    updatedAt,
    deletedAt,
    
    // Relations
    organization: api.organization,
    school: api.school ? {
      id: api.school.id,
      schoolName: api.school.school_name,
    } : undefined,
    currentClass: api.current_class ? {
      id: api.current_class.id,
      name: api.current_class.name,
      code: api.current_class.code,
      gradeLevel: api.current_class.grade_level,
    } : null,
  };
}

/**
 * Convert Domain Student model to API StudentInsert payload
 */
export function mapStudentDomainToInsert(domain: Partial<Student>): StudentApi.StudentInsert {
  // Build full_name from fullName or firstName + lastName, but don't allow empty
  const fullName = domain.fullName || `${domain.firstName || ''} ${domain.lastName || ''}`.trim();
  
  // Validate required fields
  if (!domain.admissionNumber || domain.admissionNumber.trim() === '') {
    throw new Error('Admission number is required');
  }
  if (!fullName || fullName.trim() === '') {
    throw new Error('Full name is required');
  }
  if (!domain.fatherName || domain.fatherName.trim() === '') {
    throw new Error('Father name is required');
  }
  
  return {
    admission_no: domain.admissionNumber.trim(),
    student_code: domain.studentCode || null,
    full_name: fullName.trim(),
    father_name: domain.fatherName.trim(),
    gender: domain.gender || 'male',
    organization_id: domain.organizationId || null,
    school_id: domain.schoolId || null,
    card_number: domain.cardNumber || null,
    grandfather_name: domain.grandfatherName || null,
    mother_name: domain.motherName || null,
    birth_year: domain.birthYear || null,
    birth_date: domain.birthDate || domain.dateOfBirth?.toISOString() || null,
    age: domain.age || null,
    admission_year: domain.admissionYear || null,
    orig_province: domain.origProvince || null,
    orig_district: domain.origDistrict || null,
    orig_village: domain.origVillage || null,
    curr_province: domain.currProvince || null,
    curr_district: domain.currDistrict || null,
    curr_village: domain.currVillage || null,
    nationality: domain.nationality || null,
    preferred_language: domain.preferredLanguage || null,
    previous_school: domain.previousSchool || null,
    guardian_name: domain.guardianName || (domain.guardians && domain.guardians.length > 0 
      ? `${domain.guardians[0].firstName} ${domain.guardians[0].lastName}`.trim() 
      : null),
    guardian_relation: domain.guardianRelation || (domain.guardians && domain.guardians.length > 0 
      ? domain.guardians[0].relationship 
      : null),
    guardian_phone: domain.guardianPhone || (domain.guardians && domain.guardians.length > 0 
      ? domain.guardians[0].phone 
      : null),
    guardian_tazkira: domain.guardianTazkira || null,
    guardian_picture_path: domain.guardianPicturePath || null,
    home_address: domain.homeAddress || (domain.address 
      ? `${domain.address.street}, ${domain.address.city}, ${domain.address.state}` 
      : null),
    zamin_name: domain.zaminName || null,
    zamin_phone: domain.zaminPhone || null,
    zamin_tazkira: domain.zaminTazkira || null,
    zamin_address: domain.zaminAddress || null,
    applying_grade: domain.applyingGrade || null,
    is_orphan: domain.isOrphan ?? false,
    admission_fee_status: domain.admissionFeeStatus || 'pending',
    student_status: domain.status || 'applied',
    disability_status: domain.disabilityStatus || null,
    emergency_contact_name: domain.emergencyContactName || domain.healthInfo?.emergencyContact?.name || null,
    emergency_contact_phone: domain.emergencyContactPhone || domain.healthInfo?.emergencyContact?.phone || null,
    family_income: domain.familyIncome || null,
    picture_path: domain.picturePath || domain.profilePhoto || null,
  };
}

/**
 * Convert Domain Student model to API StudentUpdate payload
 * Only includes fields that are actually provided (not undefined)
 */
export function mapStudentDomainToUpdate(domain: Partial<Student>): StudentApi.StudentUpdate {
  const insertData = mapStudentDomainToInsert(domain);
  
  // Filter out undefined values - only send fields that are explicitly set
  const updateData: StudentApi.StudentUpdate = {};
  Object.entries(insertData).forEach(([key, value]) => {
    // Include the field if it's not undefined
    // For required fields like admission_no, full_name, father_name, if they're empty string or null, don't include them
    if (value !== undefined) {
      if (key === 'admission_no' && (value === '' || value === null)) {
        // Skip empty admission_no - it's required and shouldn't be set to empty
        return;
      }
      if (key === 'full_name' && (value === '' || value === null || (typeof value === 'string' && value.trim() === ''))) {
        // Skip empty full_name - it's required and shouldn't be set to empty
        return;
      }
      if (key === 'father_name' && (value === '' || value === null || (typeof value === 'string' && value.trim() === ''))) {
        // Skip empty father_name - it's required and shouldn't be set to empty
        return;
      }
      updateData[key as keyof StudentApi.StudentUpdate] = value;
    }
  });
  
  return updateData;
}
