export interface Watermark {
  id: string;
  organization_id: string;
  branding_id: string;
  report_key: string | null;
  wm_type: 'text' | 'image';
  image_binary?: string | null;
  image_mime?: string | null;
  image_data_uri?: string; // Added by backend for image watermarks
  text: string | null;
  font_family: string | null;
  color: string;
  opacity: number;
  rotation_deg: number;
  scale: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  pos_x: number;
  pos_y: number;
  repeat_pattern: 'none' | 'repeat' | 'repeat-x' | 'repeat-y';
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateWatermarkData {
  branding_id: string;
  report_key?: string | null;
  wm_type: 'text' | 'image';
  text?: string | null;
  font_family?: string | null;
  color?: string;
  opacity?: number;
  rotation_deg?: number;
  scale?: number;
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  pos_x?: number;
  pos_y?: number;
  repeat_pattern?: 'none' | 'repeat' | 'repeat-x' | 'repeat-y';
  sort_order?: number;
  is_active?: boolean;
  image_binary?: string; // Base64 encoded
  image_mime?: string | null;
}

export type UpdateWatermarkData = Partial<CreateWatermarkData> & {
  branding_id?: never; // Cannot change branding_id
};

