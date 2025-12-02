import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { 
  studentsApi, 
  studentDocumentsApi, 
  studentEducationalHistoryApi, 
  studentDisciplineRecordsApi 
} from '@/lib/api/client';
import type * as StudentApi from '@/types/api/student';
import type { Student } from '@/types/domain/student';
import { mapStudentApiToDomain, mapStudentDomainToInsert, mapStudentDomainToUpdate } from '@/mappers/studentMapper';

// Re-export domain types for convenience
export type { Student, StudentStatus, AdmissionFeeStatus, Gender } from '@/types/domain/student';

// Re-export API types for documents, history, and discipline (these remain API models)
export type {
  StudentDocument,
  StudentEducationalHistory,
  StudentEducationalHistoryInsert,
  StudentDisciplineRecord,
  StudentDisciplineRecordInsert,
  DisciplineSeverity,
  StudentStats,
} from '@/types/api/student';

export const useStudents = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Student[]>({
    queryKey: ['students', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) {
        return [];
      }

      try {
        const effectiveOrgId = organizationId || profile.organization_id;

        const apiStudents = await studentsApi.list({
          organization_id: effectiveOrgId || undefined,
        });

        // Map API models to domain models
        const domainStudents = (apiStudents as StudentApi.Student[]).map(mapStudentApiToDomain);

        return domainStudents;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[useStudents] Error fetching students:', error);
        }
        throw error;
      }
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: Partial<Student>) => {
      const organizationId = payload.organizationId || profile?.organization_id;
      if (!organizationId) {
        throw new Error('Organization is required to create a student');
      }

      // Convert domain model to API insert payload
      const insertData = mapStudentDomainToInsert({
        ...payload,
        organizationId,
      });

      const apiStudent = await studentsApi.create(insertData);
      // Map API response back to domain model
      return mapStudentApiToDomain(apiStudent as StudentApi.Student);
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
    mutationFn: async ({ id, data }: { id: string; data: Partial<Student> }) => {
      if (!profile) throw new Error('User not authenticated');

      // Convert domain model to API update payload
      const updateData = mapStudentDomainToUpdate(data);

      const apiStudent = await studentsApi.update(id, updateData);
      // Map API response back to domain model
      return mapStudentApiToDomain(apiStudent as StudentApi.Student);
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

export const useStudentStats = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentApi.StudentStats>({
    queryKey: ['student-stats', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) {
        return { total: 0, male: 0, female: 0, orphans: 0, feePending: 0 };
      }

      const effectiveOrgId = organizationId || profile.organization_id;
      const stats = await studentsApi.stats({
        organization_id: effectiveOrgId || undefined,
      });

      return stats as StudentApi.StudentStats;
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // REQUIRED: Performance optimization
    refetchOnReconnect: false, // REQUIRED: Performance optimization
  });
};

// =============================================================================
// Student Documents
// =============================================================================

export const useStudentDocuments = (studentId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentApi.StudentDocument[]>({
    queryKey: ['student-documents', studentId],
    queryFn: async () => {
      if (!user || !profile || !studentId) {
        return [];
      }

      const documents = await studentDocumentsApi.list(studentId);
      return documents as StudentApi.StudentDocument[];
    },
    enabled: !!user && !!profile && !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // REQUIRED: Performance optimization
    refetchOnReconnect: false, // REQUIRED: Performance optimization
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

      return document as StudentApi.StudentDocument;
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

export const useStudentEducationalHistory = (studentId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentApi.StudentEducationalHistory[]>({
    queryKey: ['student-educational-history', studentId],
    queryFn: async () => {
      if (!user || !profile || !studentId) {
        return [];
      }

      const history = await studentEducationalHistoryApi.list(studentId);
      return history as StudentApi.StudentEducationalHistory[];
    },
    enabled: !!user && !!profile && !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // REQUIRED: Performance optimization
    refetchOnReconnect: false, // REQUIRED: Performance optimization
  });
};

export const useCreateStudentEducationalHistory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentApi.StudentEducationalHistoryInsert) => {
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

      return history as StudentApi.StudentEducationalHistory;
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
    mutationFn: async ({ id, studentId, data }: { id: string; studentId: string; data: Partial<StudentApi.StudentEducationalHistoryInsert> }) => {
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required');
      }

      const updated = await studentEducationalHistoryApi.update(id, data);
      return { record: updated as StudentApi.StudentEducationalHistory, studentId };
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

export const useStudentDisciplineRecords = (studentId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<StudentApi.StudentDisciplineRecord[]>({
    queryKey: ['student-discipline-records', studentId],
    queryFn: async () => {
      if (!user || !profile || !studentId) {
        return [];
      }

      const records = await studentDisciplineRecordsApi.list(studentId);
      return records as StudentApi.StudentDisciplineRecord[];
    },
    enabled: !!user && !!profile && !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // REQUIRED: Performance optimization
    refetchOnReconnect: false, // REQUIRED: Performance optimization
  });
};

export const useCreateStudentDisciplineRecord = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentApi.StudentDisciplineRecordInsert) => {
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

      return record as StudentApi.StudentDisciplineRecord;
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
    mutationFn: async ({ id, studentId, data }: { id: string; studentId: string; data: Partial<StudentApi.StudentDisciplineRecordInsert> }) => {
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required');
      }

      const updated = await studentDisciplineRecordsApi.update(id, data);
      return { record: updated as StudentApi.StudentDisciplineRecord, studentId };
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
      return { record: updated as StudentApi.StudentDisciplineRecord, studentId };
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
