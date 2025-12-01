import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { 
  studentsApi, 
  studentDocumentsApi, 
  studentEducationalHistoryApi, 
  studentDisciplineRecordsApi 
} from '@/lib/api/client';

// Custom enum types for stricter validation
export type StudentStatus = 'applied' | 'admitted' | 'active' | 'withdrawn';
export type AdmissionFeeStatus = 'paid' | 'pending' | 'waived' | 'partial';
export type Gender = 'male' | 'female';

// Student interface matching the database schema
export interface Student {
  id: string;
  organization_id: string;
  school_id: string | null;
  card_number: string | null;
  admission_no: string;
  full_name: string;
  father_name: string;
  grandfather_name: string | null;
  mother_name: string | null;
  gender: Gender;
  birth_year: string | null;
  birth_date: string | null;
  age: number | null;
  admission_year: string | null;
  orig_province: string | null;
  orig_district: string | null;
  orig_village: string | null;
  curr_province: string | null;
  curr_district: string | null;
  curr_village: string | null;
  nationality: string | null;
  preferred_language: string | null;
  previous_school: string | null;
  guardian_name: string | null;
  guardian_relation: string | null;
  guardian_phone: string | null;
  guardian_tazkira: string | null;
  guardian_picture_path: string | null;
  home_address: string | null;
  zamin_name: string | null;
  zamin_phone: string | null;
  zamin_tazkira: string | null;
  zamin_address: string | null;
  applying_grade: string | null;
  is_orphan: boolean;
  admission_fee_status: AdmissionFeeStatus;
  student_status: StudentStatus;
  disability_status: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  family_income: string | null;
  picture_path: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  organization?: {
    id: string;
    name: string;
  };
  school?: {
    id: string;
    school_name: string;
  };
}

export interface StudentInsert {
  admission_no: string;
  full_name: string;
  father_name: string;
  gender: string;
  organization_id?: string | null;
  school_id?: string | null;
  card_number?: string | null;
  grandfather_name?: string | null;
  mother_name?: string | null;
  birth_year?: string | null;
  birth_date?: string | null;
  age?: number | null;
  admission_year?: string | null;
  orig_province?: string | null;
  orig_district?: string | null;
  orig_village?: string | null;
  curr_province?: string | null;
  curr_district?: string | null;
  curr_village?: string | null;
  nationality?: string | null;
  preferred_language?: string | null;
  previous_school?: string | null;
  guardian_name?: string | null;
  guardian_relation?: string | null;
  guardian_phone?: string | null;
  guardian_tazkira?: string | null;
  guardian_picture_path?: string | null;
  home_address?: string | null;
  zamin_name?: string | null;
  zamin_phone?: string | null;
  zamin_tazkira?: string | null;
  zamin_address?: string | null;
  applying_grade?: string | null;
  is_orphan?: boolean;
  admission_fee_status?: string;
  student_status?: string;
  disability_status?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  family_income?: string | null;
  picture_path?: string | null;
}

export type StudentUpdate = Partial<StudentInsert>;

export const useStudents = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Student[]>({
    queryKey: ['students', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) {
        console.log('[useStudents] No user or profile, returning empty array');
        return [];
      }

      try {
        const effectiveOrgId = organizationId || profile.organization_id;
        console.log('[useStudents] Fetching students for organization:', effectiveOrgId);

        const students = await studentsApi.list({
          organization_id: effectiveOrgId || undefined,
        });

        console.log('[useStudents] Fetched', (students as Student[]).length, 'students');
        return students as Student[];
      } catch (error) {
        console.error('[useStudents] Error fetching students:', error);
        throw error;
      }
    },
    enabled: !!user && !!profile,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentInsert) => {
      const organizationId = payload.organization_id || profile?.organization_id;
      if (!organizationId) {
        throw new Error('Organization is required to create a student');
      }

      const insertData = {
        ...payload,
        organization_id: organizationId,
      };

      const student = await studentsApi.create(insertData);
      return student as Student;
    },
    onSuccess: () => {
      toast.success('Student registered successfully');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to register student');
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StudentInsert> }) => {
      if (!profile) throw new Error('User not authenticated');

      const updated = await studentsApi.update(id, data);
      return updated as Student;
    },
    onSuccess: () => {
      toast.success('Student information updated');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update student');
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!profile) {
        throw new Error('User not authenticated');
      }

      await studentsApi.delete(id);
      return id;
    },
    onSuccess: () => {
      toast.success('Student removed');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove student');
    },
  });
};

export interface StudentStats {
  total: number;
  male: number;
  female: number;
  orphans: number;
  feePending: number;
}

export const useStudentStats = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentStats>({
    queryKey: ['student-stats', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) {
        return { total: 0, male: 0, female: 0, orphans: 0, feePending: 0 };
      }

      const effectiveOrgId = organizationId || profile.organization_id;
      const stats = await studentsApi.stats({
        organization_id: effectiveOrgId || undefined,
      });

      return stats as StudentStats;
    },
    enabled: !!user && !!profile,
  });
};

// =============================================================================
// Student Documents
// =============================================================================

export interface StudentDocument {
  id: string;
  student_id: string;
  organization_id: string;
  school_id: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const useStudentDocuments = (studentId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentDocument[]>({
    queryKey: ['student-documents', studentId],
    queryFn: async () => {
      if (!user || !profile || !studentId) {
        return [];
      }

      const documents = await studentDocumentsApi.list(studentId);
      return documents as StudentDocument[];
    },
    enabled: !!user && !!profile && !!studentId,
  });
};

export const useUploadStudentDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      studentId,
      file,
      documentType,
      description,
    }: {
      studentId: string;
      organizationId: string;
      schoolId?: string | null;
      file: File;
      documentType: string;
      description?: string | null;
    }) => {
      if (!user) throw new Error('User not authenticated');

      const document = await studentDocumentsApi.create(
        studentId,
        file,
        documentType,
        description
      );

      return document as StudentDocument;
    },
    onSuccess: (_, variables) => {
      toast.success('Document uploaded successfully');
      void queryClient.invalidateQueries({ queryKey: ['student-documents', variables.studentId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload document');
    },
  });
};

export const useDeleteStudentDocument = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ documentId, studentId }: { documentId: string; studentId: string }) => {
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required');
      }

      await studentDocumentsApi.delete(documentId);
      return { documentId, studentId };
    },
    onSuccess: (_, variables) => {
      toast.success('Document deleted successfully');
      void queryClient.invalidateQueries({ queryKey: ['student-documents', variables.studentId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete document');
    },
  });
};

// =============================================================================
// Student Educational History
// =============================================================================

export interface StudentEducationalHistory {
  id: string;
  student_id: string;
  organization_id: string;
  school_id: string | null;
  institution_name: string;
  academic_year: string | null;
  grade_level: string | null;
  start_date: string | null;
  end_date: string | null;
  achievements: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentEducationalHistoryInsert {
  student_id: string;
  organization_id?: string;
  school_id?: string | null;
  institution_name: string;
  academic_year?: string | null;
  grade_level?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  achievements?: string | null;
  notes?: string | null;
}

export const useStudentEducationalHistory = (studentId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentEducationalHistory[]>({
    queryKey: ['student-educational-history', studentId],
    queryFn: async () => {
      if (!user || !profile || !studentId) {
        return [];
      }

      const history = await studentEducationalHistoryApi.list(studentId);
      return history as StudentEducationalHistory[];
    },
    enabled: !!user && !!profile && !!studentId,
  });
};

export const useCreateStudentEducationalHistory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentEducationalHistoryInsert) => {
      if (!user) throw new Error('User not authenticated');

      const history = await studentEducationalHistoryApi.create(payload.student_id, {
        institution_name: payload.institution_name,
        school_id: payload.school_id,
        academic_year: payload.academic_year,
        grade_level: payload.grade_level,
        start_date: payload.start_date,
        end_date: payload.end_date,
        achievements: payload.achievements,
        notes: payload.notes,
      });

      return history as StudentEducationalHistory;
    },
    onSuccess: (_, variables) => {
      toast.success('Educational history added');
      void queryClient.invalidateQueries({ queryKey: ['student-educational-history', variables.student_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add educational history');
    },
  });
};

export const useUpdateStudentEducationalHistory = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId, data }: { id: string; studentId: string; data: Partial<StudentEducationalHistoryInsert> }) => {
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required');
      }

      const updated = await studentEducationalHistoryApi.update(id, data);
      return { record: updated as StudentEducationalHistory, studentId };
    },
    onSuccess: (result) => {
      toast.success('Educational history updated');
      void queryClient.invalidateQueries({ queryKey: ['student-educational-history', result.studentId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update educational history');
    },
  });
};

export const useDeleteStudentEducationalHistory = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required');
      }

      await studentEducationalHistoryApi.delete(id);
      return { id, studentId };
    },
    onSuccess: (_, variables) => {
      toast.success('Educational history deleted');
      void queryClient.invalidateQueries({ queryKey: ['student-educational-history', variables.studentId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete educational history');
    },
  });
};

// =============================================================================
// Student Discipline Records
// =============================================================================

export type DisciplineSeverity = 'minor' | 'moderate' | 'major' | 'severe';

export interface StudentDisciplineRecord {
  id: string;
  student_id: string;
  organization_id: string;
  school_id: string | null;
  incident_date: string;
  incident_type: string;
  description: string | null;
  severity: DisciplineSeverity;
  action_taken: string | null;
  resolved: boolean;
  resolved_date: string | null;
  resolved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface StudentDisciplineRecordInsert {
  student_id: string;
  organization_id?: string;
  school_id?: string | null;
  incident_date: string;
  incident_type: string;
  description?: string | null;
  severity?: DisciplineSeverity;
  action_taken?: string | null;
  resolved?: boolean;
  resolved_date?: string | null;
  resolved_by?: string | null;
}

export const useStudentDisciplineRecords = (studentId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentDisciplineRecord[]>({
    queryKey: ['student-discipline-records', studentId],
    queryFn: async () => {
      if (!user || !profile || !studentId) {
        return [];
      }

      const records = await studentDisciplineRecordsApi.list(studentId);
      return records as StudentDisciplineRecord[];
    },
    enabled: !!user && !!profile && !!studentId,
  });
};

export const useCreateStudentDisciplineRecord = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentDisciplineRecordInsert) => {
      if (!user) throw new Error('User not authenticated');

      const record = await studentDisciplineRecordsApi.create(payload.student_id, {
        incident_date: payload.incident_date,
        incident_type: payload.incident_type,
        school_id: payload.school_id,
        description: payload.description,
        severity: payload.severity,
        action_taken: payload.action_taken,
        resolved: payload.resolved,
        resolved_date: payload.resolved_date,
      });

      return record as StudentDisciplineRecord;
    },
    onSuccess: (_, variables) => {
      toast.success('Discipline record added');
      void queryClient.invalidateQueries({ queryKey: ['student-discipline-records', variables.student_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add discipline record');
    },
  });
};

export const useUpdateStudentDisciplineRecord = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId, data }: { id: string; studentId: string; data: Partial<StudentDisciplineRecordInsert> }) => {
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required');
      }

      const updated = await studentDisciplineRecordsApi.update(id, data);
      return { record: updated as StudentDisciplineRecord, studentId };
    },
    onSuccess: (result) => {
      toast.success('Discipline record updated');
      void queryClient.invalidateQueries({ queryKey: ['student-discipline-records', result.studentId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update discipline record');
    },
  });
};

export const useDeleteStudentDisciplineRecord = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required');
      }

      await studentDisciplineRecordsApi.delete(id);
      return { id, studentId };
    },
    onSuccess: (_, variables) => {
      toast.success('Discipline record deleted');
      void queryClient.invalidateQueries({ queryKey: ['student-discipline-records', variables.studentId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete discipline record');
    },
  });
};

export const useResolveStudentDisciplineRecord = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
      if (!user) throw new Error('User not authenticated');
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required');
      }

      const updated = await studentDisciplineRecordsApi.resolve(id);
      return { record: updated as StudentDisciplineRecord, studentId };
    },
    onSuccess: (result) => {
      toast.success('Discipline record marked as resolved');
      void queryClient.invalidateQueries({ queryKey: ['student-discipline-records', result.studentId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resolve discipline record');
    },
  });
};
