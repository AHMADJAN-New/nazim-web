import type * as OnlineAdmissionApi from '@/types/api/onlineAdmission';
import type {
  OnlineAdmission,
  OnlineAdmissionDocument,
  OnlineAdmissionField,
  OnlineAdmissionFieldValue,
} from '@/types/domain/onlineAdmission';

const toDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

export function mapOnlineAdmissionDocumentApiToDomain(
  api: OnlineAdmissionApi.OnlineAdmissionDocument
): OnlineAdmissionDocument {
  return {
    id: api.id,
    onlineAdmissionId: api.online_admission_id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    documentType: api.document_type,
    fileName: api.file_name,
    filePath: api.file_path,
    fileSize: api.file_size ?? null,
    mimeType: api.mime_type ?? null,
    description: api.description ?? null,
    uploadedBy: api.uploaded_by ?? null,
    fileUrl: api.file_url ?? null,
    createdAt: toDate(api.created_at) ?? new Date(),
    updatedAt: toDate(api.updated_at) ?? new Date(),
    deletedAt: toDate(api.deleted_at),
  };
}

export function mapOnlineAdmissionFieldApiToDomain(
  api: OnlineAdmissionApi.OnlineAdmissionField
): OnlineAdmissionField {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    key: api.key,
    label: api.label,
    fieldType: api.field_type,
    isRequired: api.is_required,
    isEnabled: api.is_enabled,
    sortOrder: api.sort_order,
    placeholder: api.placeholder ?? null,
    helpText: api.help_text ?? null,
    validationRules: api.validation_rules ?? null,
    options: api.options ?? null,
    createdAt: toDate(api.created_at),
    updatedAt: toDate(api.updated_at),
  };
}

export function mapOnlineAdmissionFieldValueApiToDomain(
  api: OnlineAdmissionApi.OnlineAdmissionFieldValue
): OnlineAdmissionFieldValue {
  return {
    id: api.id,
    onlineAdmissionId: api.online_admission_id,
    fieldId: api.field_id,
    valueText: api.value_text ?? null,
    valueJson: api.value_json ?? null,
    filePath: api.file_path ?? null,
    fileName: api.file_name ?? null,
    mimeType: api.mime_type ?? null,
    fileSize: api.file_size ?? null,
    fileUrl: api.file_url ?? null,
    field: api.field ? mapOnlineAdmissionFieldApiToDomain(api.field) : undefined,
    createdAt: api.created_at ? toDate(api.created_at) ?? undefined : undefined,
    updatedAt: api.updated_at ? toDate(api.updated_at) ?? undefined : undefined,
  };
}

export function mapOnlineAdmissionApiToDomain(
  api: OnlineAdmissionApi.OnlineAdmission
): OnlineAdmission {
  return {
    id: api.id,
    organizationId: api.organization_id,
    schoolId: api.school_id,
    studentId: api.student_id ?? null,
    applicationNo: api.application_no,
    status: api.status,
    submittedAt: toDate(api.submitted_at) ?? new Date(),
    reviewedBy: api.reviewed_by ?? null,
    reviewedAt: toDate(api.reviewed_at),
    acceptedAt: toDate(api.accepted_at),
    rejectedAt: toDate(api.rejected_at),
    rejectionReason: api.rejection_reason ?? null,
    notes: api.notes ?? null,
    fullName: api.full_name,
    fatherName: api.father_name,
    grandfatherName: api.grandfather_name ?? null,
    motherName: api.mother_name ?? null,
    gender: api.gender,
    birthYear: api.birth_year ?? null,
    birthDate: toDate(api.birth_date),
    age: api.age ?? null,
    admissionYear: api.admission_year ?? null,
    origProvince: api.orig_province ?? null,
    origDistrict: api.orig_district ?? null,
    origVillage: api.orig_village ?? null,
    currProvince: api.curr_province ?? null,
    currDistrict: api.curr_district ?? null,
    currVillage: api.curr_village ?? null,
    nationality: api.nationality ?? null,
    preferredLanguage: api.preferred_language ?? null,
    previousSchool: api.previous_school ?? null,
    previousGradeLevel: api.previous_grade_level ?? null,
    previousAcademicYear: api.previous_academic_year ?? null,
    previousSchoolNotes: api.previous_school_notes ?? null,
    guardianName: api.guardian_name ?? null,
    guardianRelation: api.guardian_relation ?? null,
    guardianPhone: api.guardian_phone ?? null,
    guardianTazkira: api.guardian_tazkira ?? null,
    guardianPicturePath: api.guardian_picture_path ?? null,
    homeAddress: api.home_address ?? null,
    zaminName: api.zamin_name ?? null,
    zaminPhone: api.zamin_phone ?? null,
    zaminTazkira: api.zamin_tazkira ?? null,
    zaminAddress: api.zamin_address ?? null,
    applyingGrade: api.applying_grade ?? null,
    isOrphan: api.is_orphan,
    disabilityStatus: api.disability_status ?? null,
    emergencyContactName: api.emergency_contact_name ?? null,
    emergencyContactPhone: api.emergency_contact_phone ?? null,
    familyIncome: api.family_income ?? null,
    picturePath: api.picture_path ?? null,
    pictureUrl: api.picture_url ?? null,
    guardianPictureUrl: api.guardian_picture_url ?? null,
    createdAt: toDate(api.created_at) ?? new Date(),
    updatedAt: toDate(api.updated_at) ?? new Date(),
    deletedAt: toDate(api.deleted_at),
    documents: api.documents?.map(mapOnlineAdmissionDocumentApiToDomain),
    fieldValues: api.field_values?.map(mapOnlineAdmissionFieldValueApiToDomain),
  };
}

export function mapOnlineAdmissionFieldDomainToInsert(
  domain: OnlineAdmissionField
): OnlineAdmissionApi.OnlineAdmissionFieldInsert {
  return {
    key: domain.key,
    label: domain.label,
    field_type: domain.fieldType,
    is_required: domain.isRequired,
    is_enabled: domain.isEnabled,
    sort_order: domain.sortOrder,
    placeholder: domain.placeholder ?? null,
    help_text: domain.helpText ?? null,
    validation_rules: domain.validationRules ?? null,
    options: domain.options ?? null,
  };
}

export function mapOnlineAdmissionFieldDomainToUpdate(
  domain: Partial<OnlineAdmissionField>
): OnlineAdmissionApi.OnlineAdmissionFieldUpdate {
  return {
    key: domain.key,
    label: domain.label,
    field_type: domain.fieldType,
    is_required: domain.isRequired,
    is_enabled: domain.isEnabled,
    sort_order: domain.sortOrder,
    placeholder: domain.placeholder ?? null,
    help_text: domain.helpText ?? null,
    validation_rules: domain.validationRules ?? null,
    options: domain.options ?? null,
  };
}
