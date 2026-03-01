export interface IdCardLayoutConfig {
  enabledFields?: string[];
  fieldFonts?: Record<string, { fontSize?: number; fontFamily?: string; textColor?: string }>;
  fieldValues?: Record<string, string | null>; // Custom text/values for editable fields (labels, notes, expiryDate, schoolName, etc.)
  
  // Text field positions (as percentages)
  studentNameLabelPosition?: { x: number; y: number };
  studentNamePosition?: { x: number; y: number };
  fatherNameLabelPosition?: { x: number; y: number };
  fatherNamePosition?: { x: number; y: number };
  studentCodeLabelPosition?: { x: number; y: number };
  studentCodePosition?: { x: number; y: number };
  admissionNumberLabelPosition?: { x: number; y: number };
  admissionNumberPosition?: { x: number; y: number };
  cardNumberLabelPosition?: { x: number; y: number };
  cardNumberPosition?: { x: number; y: number };
  classLabelPosition?: { x: number; y: number };
  classPosition?: { x: number; y: number };
  expiryDatePosition?: { x: number; y: number };
  schoolNamePosition?: { x: number; y: number };
  notesPosition?: { x: number; y: number };
  
  // Image field positions (with dimensions)
  studentPhotoPosition?: { x: number; y: number; width?: number; height?: number };
  qrCodePosition?: { x: number; y: number; width?: number; height?: number };
  
  // QR Code configuration
  qrCodeValueSource?: 'student_id' | 'student_code' | 'admission_number' | 'card_number' | 'roll_number';
  
  // Global styles
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  rtl?: boolean;
}

export interface IdCardTemplate {
  id: string;
  organizationId: string;
  schoolId: string | null;
  name: string;
  description: string | null;
  backgroundImagePathFront: string | null;
  backgroundImagePathBack: string | null;
  layoutConfigFront: IdCardLayoutConfig;
  layoutConfigBack: IdCardLayoutConfig;
  cardSize: string;
  isDefault: boolean;
  isActive: boolean;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface IdCardTemplateInsert {
  name: string;
  description?: string | null;
  backgroundImageFront?: File | null;
  backgroundImageBack?: File | null;
  layoutConfigFront?: IdCardLayoutConfig;
  layoutConfigBack?: IdCardLayoutConfig;
  cardSize?: string;
  schoolId?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
}

export type IdCardTemplateUpdate = Partial<IdCardTemplateInsert>;

