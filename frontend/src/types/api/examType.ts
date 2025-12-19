export interface ExamType {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ExamTypeInsert {
  name: string;
  code?: string | null;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export interface ExamTypeUpdate {
  name?: string;
  code?: string | null;
  description?: string | null;
  display_order?: number;
  is_active?: boolean;
}
