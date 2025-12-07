import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
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
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import { usePagination } from './usePagination';
import { useEffect } from 'react';

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

export const useStudents = (organizationId?: string, usePaginated?: boolean) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 25,
  });

  const { data, isLoading, error } = useQuery<Student[] | PaginatedResponse<StudentApi.Student>>({
    queryKey: ['students', organizationId ?? profile?.organization_id ?? null, usePaginated ? page : undefined, usePaginated ? pageSize : undefined],
    queryFn: async () => {
      if (!user || !profile) {
        return [];
      }

      try {
        const effectiveOrgId = organizationId || profile.organization_id;

        const params: { organization_id?: string; page?: number; per_page?: number } = {
          organization_id: effectiveOrgId || undefined,
        };

        // Add pagination params if using pagination
        if (usePaginated) {
          params.page = page;
          params.per_page = pageSize;
        }

        const apiStudents = await studentsApi.list(params);

        // Check if response is paginated (Laravel returns meta fields directly, not nested)
        if (usePaginated && apiStudents && typeof apiStudents === 'object' && 'data' in apiStudents && 'current_page' in apiStudents) {
          // Laravel's paginated response has data and meta fields at the same level
          const paginatedResponse = apiStudents as any;
          // Map API models to domain models
          const students = (paginatedResponse.data as StudentApi.Student[]).map(mapStudentApiToDomain);
          // Extract meta from Laravel's response structure
          const meta: PaginationMeta = {
            current_page: paginatedResponse.current_page,
            from: paginatedResponse.from,
            last_page: paginatedResponse.last_page,
            per_page: paginatedResponse.per_page,
            to: paginatedResponse.to,
            total: paginatedResponse.total,
            path: paginatedResponse.path,
            first_page_url: paginatedResponse.first_page_url,
            last_page_url: paginatedResponse.last_page_url,
            next_page_url: paginatedResponse.next_page_url,
            prev_page_url: paginatedResponse.prev_page_url,
          };
          return { data: students, meta } as PaginatedResponse<StudentApi.Student>;
        }

        // Map API models to domain models (non-paginated)
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

  // Update pagination state from API response
  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<StudentApi.Student>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  // Return appropriate format based on pagination mode
  if (usePaginated) {
    const paginatedData = data as PaginatedResponse<StudentApi.Student> | undefined;
    return {
      data: paginatedData?.data || [],
      isLoading,
      error,
      pagination: paginatedData?.meta ?? null,
      paginationState,
      page,
      pageSize,
      setPage,
      setPageSize,
    };
  }

  return {
    data: data as Student[] | undefined,
    isLoading,
    error,
  };
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
      showToast.success('toast.studentRegistered');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentRegisterFailed');
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
      showToast.success('toast.studentInformationUpdated');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentUpdateFailed');
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
      showToast.success('toast.studentRemoved');
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.studentRemoveFailed');
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
      showToast.success('toast.documentUploaded');
      void queryClient.invalidateQueries({ queryKey: ['student-documents', variables.studentId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.documentUploadFailed');
    },
  });
};

export const useDeleteStudentDocument = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ documentId, studentId }: { documentId: string; studentId: string }) => {
      if (!profile?.organization_id) {
        throw new Error('Organization is required');
      }

      await studentDocumentsApi.delete(documentId);
      return { documentId, studentId };
    },
    onSuccess: (_, variables) => {
      showToast.success('toast.documentDeleted');
      void queryClient.invalidateQueries({ queryKey: ['student-documents', variables.studentId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.documentDeleteFailed');
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
      showToast.success('toast.educationalHistoryAdded');
      void queryClient.invalidateQueries({ queryKey: ['student-educational-history', variables.student_id] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.educationalHistoryAddFailed');
    },
  });
};

export const useUpdateStudentEducationalHistory = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId, data }: { id: string; studentId: string; data: Partial<StudentApi.StudentEducationalHistoryInsert> }) => {
      if (!profile?.organization_id) {
        throw new Error('Organization is required');
      }

      const updated = await studentEducationalHistoryApi.update(id, data);
      return { record: updated as StudentApi.StudentEducationalHistory, studentId };
    },
    onSuccess: (result) => {
      showToast.success('toast.educationalHistoryUpdated');
      void queryClient.invalidateQueries({ queryKey: ['student-educational-history', result.studentId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.educationalHistoryUpdateFailed');
    },
  });
};

export const useDeleteStudentEducationalHistory = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
      if (!profile?.organization_id) {
        throw new Error('Organization is required');
      }

      await studentEducationalHistoryApi.delete(id);
      return { id, studentId };
    },
    onSuccess: (_, variables) => {
      showToast.success('toast.educationalHistoryDeleted');
      void queryClient.invalidateQueries({ queryKey: ['student-educational-history', variables.studentId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.educationalHistoryDeleteFailed');
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
      showToast.success('toast.disciplineRecordAdded');
      void queryClient.invalidateQueries({ queryKey: ['student-discipline-records', variables.student_id] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.disciplineRecordAddFailed');
    },
  });
};

export const useUpdateStudentDisciplineRecord = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId, data }: { id: string; studentId: string; data: Partial<StudentApi.StudentDisciplineRecordInsert> }) => {
      if (!profile?.organization_id) {
        throw new Error('Organization is required');
      }

      const updated = await studentDisciplineRecordsApi.update(id, data);
      return { record: updated as StudentApi.StudentDisciplineRecord, studentId };
    },
    onSuccess: (result) => {
      showToast.success('toast.disciplineRecordUpdated');
      void queryClient.invalidateQueries({ queryKey: ['student-discipline-records', result.studentId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.disciplineRecordUpdateFailed');
    },
  });
};

export const useDeleteStudentDisciplineRecord = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
      if (!profile?.organization_id) {
        throw new Error('Organization is required');
      }

      await studentDisciplineRecordsApi.delete(id);
      return { id, studentId };
    },
    onSuccess: (_, variables) => {
      showToast.success('toast.disciplineRecordDeleted');
      void queryClient.invalidateQueries({ queryKey: ['student-discipline-records', variables.studentId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.disciplineRecordDeleteFailed');
    },
  });
};

export const useResolveStudentDisciplineRecord = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
      if (!user) throw new Error('User not authenticated');
      if (!profile?.organization_id) {
        throw new Error('Organization is required');
      }

      const updated = await studentDisciplineRecordsApi.resolve(id);
      return { record: updated as StudentApi.StudentDisciplineRecord, studentId };
    },
    onSuccess: (result) => {
      showToast.success('toast.disciplineRecordResolved');
      void queryClient.invalidateQueries({ queryKey: ['student-discipline-records', result.studentId] });
    },
    onError: (error: Error) => {
      showToast.error(error.message || 'toast.disciplineRecordResolveFailed');
    },
  });
};
