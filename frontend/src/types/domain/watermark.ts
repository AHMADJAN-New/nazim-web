export interface Watermark {
  id: string;
  organizationId: string;
  brandingId: string;
  reportKey: string | null;
  type: 'text' | 'image';
  imageDataUri?: string | null;
  text: string | null;
  fontFamily: string | null;
  color: string;
  opacity: number;
  rotationDeg: number;
  scale: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  posX: number;
  posY: number;
  repeatPattern: 'none' | 'repeat' | 'repeat-x' | 'repeat-y';
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWatermarkData {
  brandingId: string;
  reportKey?: string | null;
  type: 'text' | 'image';
  text?: string | null;
  fontFamily?: string | null;
  color?: string;
  opacity?: number;
  rotationDeg?: number;
  scale?: number;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  posX?: number;
  posY?: number;
  repeatPattern?: 'none' | 'repeat' | 'repeat-x' | 'repeat-y';
  sortOrder?: number;
  isActive?: boolean;
  imageBinary?: string; // Base64 encoded
  imageMime?: string | null;
}

export type UpdateWatermarkData = Partial<CreateWatermarkData> & {
  brandingId?: never; // Cannot change branding_id
};

