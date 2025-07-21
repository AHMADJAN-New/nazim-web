export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          branch_id: string
          created_at: string
          end_date: string
          id: string
          is_current: boolean | null
          name: string
          start_date: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean | null
          name: string
          start_date: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean | null
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      answer_keys: {
        Row: {
          answers: Json
          created_at: string
          created_by: string
          exam_id: string
          id: string
          layout_id: string
        }
        Insert: {
          answers: Json
          created_at?: string
          created_by: string
          exam_id: string
          id?: string
          layout_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          created_by?: string
          exam_id?: string
          id?: string
          layout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answer_keys_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_code: string
          assigned_to: string | null
          branch_id: string
          category: string | null
          condition: string | null
          created_at: string
          current_value: number | null
          description: string | null
          id: string
          location: string | null
          name: string
          purchase_cost: number | null
          purchase_date: string | null
        }
        Insert: {
          asset_code: string
          assigned_to?: string | null
          branch_id: string
          category?: string | null
          condition?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          location?: string | null
          name: string
          purchase_cost?: number | null
          purchase_date?: string | null
        }
        Update: {
          asset_code?: string
          assigned_to?: string | null
          branch_id?: string
          category?: string | null
          condition?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          purchase_cost?: number | null
          purchase_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string
          remarks: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          marked_by: string
          remarks?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          code: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          principal_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          principal_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          principal_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year_id: string
          branch_id: string
          capacity: number | null
          class_teacher_id: string | null
          created_at: string
          grade_level: number | null
          id: string
          name: string
          section: string | null
        }
        Insert: {
          academic_year_id: string
          branch_id: string
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          grade_level?: number | null
          id?: string
          name: string
          section?: string | null
        }
        Update: {
          academic_year_id?: string
          branch_id?: string
          capacity?: number | null
          class_teacher_id?: string | null
          created_at?: string
          grade_level?: number | null
          id?: string
          name?: string
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          branch_id: string
          class_ids: string[] | null
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          priority: string | null
          published_date: string | null
          target_audience: string[] | null
          title: string
          type: string | null
        }
        Insert: {
          branch_id: string
          class_ids?: string[] | null
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          priority?: string | null
          published_date?: string | null
          target_audience?: string[] | null
          title: string
          type?: string | null
        }
        Update: {
          branch_id?: string
          class_ids?: string[] | null
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          priority?: string | null
          published_date?: string | null
          target_audience?: string[] | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          branch_id: string
          class_id: string
          created_at: string
          created_by: string
          duration_minutes: number | null
          exam_date: string
          id: string
          instructions: string | null
          name: string
          pass_marks: number | null
          subject_id: string
          total_marks: number
          type: Database["public"]["Enums"]["exam_type"]
        }
        Insert: {
          branch_id: string
          class_id: string
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          exam_date: string
          id?: string
          instructions?: string | null
          name: string
          pass_marks?: number | null
          subject_id: string
          total_marks: number
          type: Database["public"]["Enums"]["exam_type"]
        }
        Update: {
          branch_id?: string
          class_id?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          exam_date?: string
          id?: string
          instructions?: string | null
          name?: string
          pass_marks?: number | null
          subject_id?: string
          total_marks?: number
          type?: Database["public"]["Enums"]["exam_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exams_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          academic_year_id: string
          amount: number
          created_at: string
          due_date: string
          fee_type: string
          id: string
          paid_date: string | null
          payment_method: string | null
          remarks: string | null
          status: Database["public"]["Enums"]["fee_status"] | null
          student_id: string
          transaction_id: string | null
        }
        Insert: {
          academic_year_id: string
          amount: number
          created_at?: string
          due_date: string
          fee_type: string
          id?: string
          paid_date?: string | null
          payment_method?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["fee_status"] | null
          student_id: string
          transaction_id?: string | null
        }
        Update: {
          academic_year_id?: string
          amount?: number
          created_at?: string
          due_date?: string
          fee_type?: string
          id?: string
          paid_date?: string | null
          payment_method?: string | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["fee_status"] | null
          student_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fees_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      hifz_progress: {
        Row: {
          ayah_from: number | null
          ayah_to: number | null
          created_at: string
          date: string
          id: string
          mistakes_count: number | null
          pages_memorized: number | null
          rating: number | null
          recorded_by: string
          revision_pages: number | null
          student_id: string
          surah_name: string | null
          teacher_feedback: string | null
        }
        Insert: {
          ayah_from?: number | null
          ayah_to?: number | null
          created_at?: string
          date: string
          id?: string
          mistakes_count?: number | null
          pages_memorized?: number | null
          rating?: number | null
          recorded_by: string
          revision_pages?: number | null
          student_id: string
          surah_name?: string | null
          teacher_feedback?: string | null
        }
        Update: {
          ayah_from?: number | null
          ayah_to?: number | null
          created_at?: string
          date?: string
          id?: string
          mistakes_count?: number | null
          pages_memorized?: number | null
          rating?: number | null
          recorded_by?: string
          revision_pages?: number | null
          student_id?: string
          surah_name?: string | null
          teacher_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hifz_progress_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hifz_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_allocations: {
        Row: {
          allocated_by: string
          allocated_date: string
          checkout_date: string | null
          created_at: string
          id: string
          monthly_fee: number | null
          room_id: string
          status: string | null
          student_id: string
        }
        Insert: {
          allocated_by: string
          allocated_date: string
          checkout_date?: string | null
          created_at?: string
          id?: string
          monthly_fee?: number | null
          room_id: string
          status?: string | null
          student_id: string
        }
        Update: {
          allocated_by?: string
          allocated_date?: string
          checkout_date?: string | null
          created_at?: string
          id?: string
          monthly_fee?: number | null
          room_id?: string
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_allocations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "hostel_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hostel_allocations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_rooms: {
        Row: {
          branch_id: string
          capacity: number | null
          created_at: string
          facilities: string[] | null
          floor: number | null
          id: string
          monthly_fee: number | null
          occupied_count: number | null
          room_number: string
          room_type: string | null
        }
        Insert: {
          branch_id: string
          capacity?: number | null
          created_at?: string
          facilities?: string[] | null
          floor?: number | null
          id?: string
          monthly_fee?: number | null
          occupied_count?: number | null
          room_number: string
          room_type?: string | null
        }
        Update: {
          branch_id?: string
          capacity?: number | null
          created_at?: string
          facilities?: string[] | null
          floor?: number | null
          id?: string
          monthly_fee?: number | null
          occupied_count?: number | null
          room_number?: string
          room_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hostel_rooms_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      library_books: {
        Row: {
          author: string
          available_copies: number | null
          branch_id: string
          category: string | null
          created_at: string
          id: string
          isbn: string | null
          location: string | null
          publication_year: number | null
          publisher: string | null
          title: string
          total_copies: number | null
        }
        Insert: {
          author: string
          available_copies?: number | null
          branch_id: string
          category?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          location?: string | null
          publication_year?: number | null
          publisher?: string | null
          title: string
          total_copies?: number | null
        }
        Update: {
          author?: string
          available_copies?: number | null
          branch_id?: string
          category?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          location?: string | null
          publication_year?: number | null
          publisher?: string | null
          title?: string
          total_copies?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "library_books_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      library_transactions: {
        Row: {
          book_id: string
          created_at: string
          due_date: string
          fine_amount: number | null
          id: string
          issue_date: string
          issued_by: string
          return_date: string | null
          returned_by: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          due_date: string
          fine_amount?: number | null
          id?: string
          issue_date: string
          issued_by: string
          return_date?: string | null
          returned_by?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          due_date?: string
          fine_amount?: number | null
          id?: string
          issue_date?: string
          issued_by?: string
          return_date?: string | null
          returned_by?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_transactions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_transactions_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_transactions_returned_by_fkey"
            columns: ["returned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      omr_scans: {
        Row: {
          answers: Json | null
          exam_id: string
          file_name: string
          file_url: string | null
          id: string
          layout_id: string | null
          scan_accuracy: number | null
          scanned_at: string
          scanned_by: string
          score: number | null
          student_id: string
          student_id_extracted: string | null
          total_questions: number | null
        }
        Insert: {
          answers?: Json | null
          exam_id: string
          file_name: string
          file_url?: string | null
          id?: string
          layout_id?: string | null
          scan_accuracy?: number | null
          scanned_at?: string
          scanned_by: string
          score?: number | null
          student_id: string
          student_id_extracted?: string | null
          total_questions?: number | null
        }
        Update: {
          answers?: Json | null
          exam_id?: string
          file_name?: string
          file_url?: string | null
          id?: string
          layout_id?: string | null
          scan_accuracy?: number | null
          scanned_at?: string
          scanned_by?: string
          score?: number | null
          student_id?: string
          student_id_extracted?: string | null
          total_questions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "omr_scans_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omr_scans_scanned_by_fkey"
            columns: ["scanned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "omr_scans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          branch_id: string
          created_at: string
          department: string | null
          designation: string | null
          employee_id: string
          experience_years: number | null
          hire_date: string | null
          id: string
          qualification: string | null
          salary: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id: string
          experience_years?: number | null
          hire_date?: string | null
          id?: string
          qualification?: string | null
          salary?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          department?: string | null
          designation?: string | null
          employee_id?: string
          experience_years?: number | null
          hire_date?: string | null
          id?: string
          qualification?: string | null
          salary?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_date: string
          blood_group: string | null
          branch_id: string
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          status: Database["public"]["Enums"]["student_status"] | null
          student_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admission_date: string
          blood_group?: string | null
          branch_id: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admission_date?: string
          blood_group?: string | null
          branch_id?: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          status?: Database["public"]["Enums"]["student_status"] | null
          student_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          branch_id: string
          code: string
          created_at: string
          credits: number | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          branch_id: string
          code: string
          created_at?: string
          credits?: number | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          branch_id?: string
          code?: string
          created_at?: string
          credits?: number | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      attendance_status: "present" | "absent" | "late" | "excused"
      exam_type: "midterm" | "final" | "quiz" | "assignment" | "omr"
      fee_status: "pending" | "paid" | "overdue" | "waived"
      student_status:
        | "active"
        | "inactive"
        | "graduated"
        | "transferred"
        | "suspended"
      user_role:
        | "super_admin"
        | "admin"
        | "teacher"
        | "staff"
        | "student"
        | "parent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["present", "absent", "late", "excused"],
      exam_type: ["midterm", "final", "quiz", "assignment", "omr"],
      fee_status: ["pending", "paid", "overdue", "waived"],
      student_status: [
        "active",
        "inactive",
        "graduated",
        "transferred",
        "suspended",
      ],
      user_role: [
        "super_admin",
        "admin",
        "teacher",
        "staff",
        "student",
        "parent",
      ],
    },
  },
} as const
