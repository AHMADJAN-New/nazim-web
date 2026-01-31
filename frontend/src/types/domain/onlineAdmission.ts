export type OnlineAdmissionStatus =
  | 'submitted'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'archived';

export type OnlineAdmissionFieldType =
  | 'text'
  | 'textarea'
  | 'phone'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'toggle'
  | 'email'
  | 'id_number'
  | 'address'
  | 'photo'
  | 'file';

export interface OnlineAdmission {
  id: string;
  organizationId: string;
  schoolId: string;
  studentId: string | null;
  applicationNo: string;
  status: OnlineAdmissionStatus;
  submittedAt: Date;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  notes: string | null;
  fullName: string;
  fatherName: string;
  grandfatherName: string | null;
  motherName: string | null;
  gender: 'male' | 'female';
  birthYear: string | null;
  birthDate: Date | null;
  age: number | null;
  admissionYear: string | null;
  origProvince: string | null;
  origDistrict: string | null;
  origVillage: string | null;
  currProvince: string | null;
  currDistrict: string | null;
  currVillage: string | null;
  nationality: string | null;
  preferredLanguage: string | null;
  previousSchool: string | null;
  previousGradeLevel: string | null;
  previousAcademicYear: string | null;
  previousSchoolNotes: string | null;
  guardianName: string | null;
  guardianRelation: string | null;
  guardianPhone: string | null;
  guardianTazkira: string | null;
  guardianPicturePath: string | null;
  homeAddress: string | null;
  zaminName: string | null;
  zaminPhone: string | null;
  zaminTazkira: string | null;
  zaminAddress: string | null;
  applyingGrade: string | null;
  isOrphan: boolean;
  disabilityStatus: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  familyIncome: string | null;
  picturePath: string | null;
  pictureUrl?: string | null;
  guardianPictureUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  documents?: OnlineAdmissionDocument[];
  fieldValues?: OnlineAdmissionFieldValue[];
}

export interface OnlineAdmissionDocument {
  id: string;
  onlineAdmissionId: string;
  organizationId: string;
  schoolId: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  description: string | null;
  uploadedBy: string | null;
  fileUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface OnlineAdmissionField {
  id: string;
  organizationId: string;
  schoolId: string;
  key: string;
  label: string;
  fieldType: OnlineAdmissionFieldType;
  isRequired: boolean;
  isEnabled: boolean;
  sortOrder: number;
  placeholder: string | null;
  helpText: string | null;
  validationRules: Record<string, unknown> | null;
  options: Array<{ value: string; label: string }> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OnlineAdmissionFieldValue {
  id: string;
  onlineAdmissionId: string;
  fieldId: string;
  valueText: string | null;
  valueJson: string[] | Record<string, unknown> | null;
  filePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  fileUrl?: string | null;
  field?: OnlineAdmissionField;
  createdAt?: Date;
  updatedAt?: Date;
}
