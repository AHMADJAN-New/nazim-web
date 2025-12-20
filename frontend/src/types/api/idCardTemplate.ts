export interface IdCardTemplate {
  id: string;
  organization_id: string;
  school_id: string | null;
  name: string;
  description: string | null;
  background_image_path_front: string | null;
  background_image_path_back: string | null;
  layout_config_front: Record<string, any> | null;
  layout_config_back: Record<string, any> | null;
  card_size: string;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IdCardTemplateInsert {
  name: string;
  description?: string | null;
  background_image_front?: File | null;
  background_image_back?: File | null;
  layout_config_front?: Record<string, any> | null;
  layout_config_back?: Record<string, any> | null;
  card_size?: string;
  school_id?: string | null;
  is_default?: boolean;
  is_active?: boolean;
}

export type IdCardTemplateUpdate = Partial<IdCardTemplateInsert>;

