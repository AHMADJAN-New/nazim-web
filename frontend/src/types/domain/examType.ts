export interface ExamType {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamTypeInsert {
  name: string;
  code?: string | null;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ExamTypeUpdate {
  name?: string;
  code?: string | null;
  description?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}
