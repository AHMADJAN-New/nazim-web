export interface LibraryCategory {
  id: string;
  organization_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface LibraryBook {
  id: string;
  organization_id: string;
  title: string;
  author?: string | null;
  isbn?: string | null;
  book_number?: string | null;
  category?: string | null; // Legacy string field for backward compatibility
  category_id?: string | null;
  volume?: string | null;
  description?: string | null;
  price: number;
  default_loan_days: number;
  total_copies?: number;
  available_copies?: number;
  copies?: LibraryCopy[];
  categoryRelation?: LibraryCategory | null; // Relationship to LibraryCategory
  deleted_at?: string | null; // Soft delete timestamp
}

export interface LibraryCopy {
  id: string;
  book_id: string;
  copy_code?: string | null;
  status: string;
  acquired_at?: string | null;
}

export interface LibraryLoan {
  id: string;
  organization_id: string;
  book_id: string;
  book_copy_id: string;
  student_id?: string | null;
  staff_id?: string | null;
  assigned_by?: string | null;
  loan_date: string;
  due_date?: string | null;
  returned_at?: string | null;
  deposit_amount: number;
  fee_retained: number;
  refunded: boolean;
  notes?: string | null;
  book?: LibraryBook;
  copy?: LibraryCopy;
}
