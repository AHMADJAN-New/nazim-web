import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Custom enum types for stricter validation
export type StudentStatus = 'applied' | 'admitted' | 'active' | 'withdrawn';
export type AdmissionFeeStatus = 'paid' | 'pending' | 'waived' | 'partial';
export type Gender = 'male' | 'female';

// Use generated type from database schema, with custom enums for stricter typing
export type Student = Omit<Tables<'students'>, 'gender' | 'admission_fee_status' | 'student_status'> & {
  gender: Gender;
  admission_fee_status: AdmissionFeeStatus;
  student_status: StudentStatus;
};
export type StudentInsert = TablesInsert<'students'>;
export type StudentUpdate = TablesUpdate<'students'>;

const buildOrganizationFilter = async (
  profile: any,
  accessibleOrgIds: string[],
  organizationId?: string
): Promise<{ column: string; value: string[] }> => {
  if (!profile) {
    return { column: 'organization_id', value: [] };
  }

  if (organizationId) {
    if (accessibleOrgIds.length === 0 || !accessibleOrgIds.includes(organizationId)) {
      return { column: 'organization_id', value: [] };
    }
    return { column: 'organization_id', value: [organizationId] };
  }

  return { column: 'organization_id', value: accessibleOrgIds };
};

export const useStudents = (organizationId?: string) => {
  const { user, profile } = useAuth();
  const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

  return useQuery<Student[]>({
    queryKey: ['students', organizationId ?? profile?.organization_id ?? null, orgIds.join(',')],
    queryFn: async () => {
      if (!user || !profile) {
        console.log('[useStudents] No user or profile, returning empty array');
        return [];
      }
      if (orgsLoading) return [];

      try {
        console.log('[useStudents] Fetching students for:', {
          userId: user.id,
          profileRole: profile.role,
          profileOrgId: profile.organization_id,
          requestedOrgId: organizationId,
        });

        const orgFilter = await buildOrganizationFilter(profile, orgIds, organizationId);
        console.log('[useStudents] Organization filter:', orgFilter);

        let query = (supabase as any)
          .from('students')
          .select('*')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (orgFilter.value.length === 0) {
          console.log('[useStudents] No accessible organizations, returning empty list');
          return [];
        }

        query = query.in(orgFilter.column, orgFilter.value);
        console.log('[useStudents] Filtering by organization_ids:', orgFilter.value);

        const { data, error } = await query;
        if (error) {
          console.error('[useStudents] Query error:', error);
          throw new Error(error.message || 'Failed to fetch students');
        }

        console.log('[useStudents] Query successful, returned', data?.length || 0, 'students');
        return (data || []) as Student[];
      } catch (error) {
        console.error('[useStudents] Error fetching students:', error);
        throw error;
      }
    },
    enabled: !!user && !!profile && !orgsLoading,
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

      // Convert empty strings to null for date and optional fields
      const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
        // Convert empty strings to null for date fields
        if (key === 'birth_date' && (value === '' || value === null || value === undefined)) {
          acc[key] = null;
        }
        // Convert empty strings to null for optional string fields
        else if (typeof value === 'string' && value.trim() === '' && key !== 'admission_no' && key !== 'full_name' && key !== 'father_name' && key !== 'gender') {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const insertData = {
        ...cleanPayload,
        organization_id: organizationId,
        is_orphan: cleanPayload.is_orphan ?? false,
        admission_fee_status: cleanPayload.admission_fee_status ?? 'pending',
        student_status: cleanPayload.student_status ?? 'active',
      };

      const { data, error } = await (supabase as any)
        .from('students')
        .insert(insertData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Student;
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

      // Convert empty strings to null for date and optional fields
      const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        // Convert empty strings to null for date fields
        if (key === 'birth_date' && (value === '' || value === null || value === undefined)) {
          acc[key] = null;
        }
        // Convert empty strings to null for optional string fields
        else if (typeof value === 'string' && value.trim() === '' && key !== 'admission_no' && key !== 'full_name' && key !== 'father_name' && key !== 'gender') {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      let query = (supabase as any)
        .from('students')
        .update({ ...cleanData, organization_id: cleanData.organization_id || profile?.organization_id })
        .eq('id', id)
        .is('deleted_at', null);

      if (profile.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }

      const { data: updated, error } = await query.select().single();

      if (error) throw new Error(error.message);
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
        throw new Error('Organization is required to delete student');
      }

      // Soft delete: set deleted_at timestamp
      // Must filter by deleted_at IS NULL to match RLS policy USING clause
      let query = (supabase as any)
        .from('students')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null); // Only update rows that aren't already deleted

      if (profile.organization_id) {
        query = query.eq('organization_id', profile.organization_id);
      }

      const { data, error } = await query.select();
      if (error) {
        console.error('[useDeleteStudent] Delete error:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          studentId: id,
          profileRole: profile?.role,
          profileOrgId: profile?.organization_id,
        });
        throw new Error(error.message || 'Failed to delete student');
      }

      // Log success for debugging
      if (data && data.length > 0) {
        console.log('[useDeleteStudent] Successfully soft-deleted student:', data[0].id);
      } else {
        console.warn('[useDeleteStudent] Update succeeded but no rows returned. Student may already be deleted or not found.');
      }
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
  const { data: students, isLoading } = useStudents(organizationId);

  const stats = (students || []).reduce(
    (acc, student) => {
      acc.total += 1;
      if (student.gender === 'male') acc.male += 1;
      if (student.gender === 'female') acc.female += 1;
      if (student.is_orphan) acc.orphans += 1;
      if (student.admission_fee_status !== 'paid') acc.feePending += 1;
      return acc;
    },
    { total: 0, male: 0, female: 0, orphans: 0, feePending: 0 }
  );

  return { data: stats, isLoading };
};

export const useSyncStudentOrg = (organizationId?: string) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  useEffect(() => {
    const effectiveOrg = organizationId || profile?.organization_id || null;
    void queryClient.invalidateQueries({ queryKey: ['students', effectiveOrg] });
  }, [organizationId, profile?.organization_id, queryClient]);
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

      const { data, error } = await (supabase as any)
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as StudentDocument[];
    },
    enabled: !!user && !!profile && !!studentId,
  });
};

export const useUploadStudentDocument = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      studentId,
      organizationId,
      schoolId,
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

      // Generate file path: organization_id/students/student_id/documents/timestamp_filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${organizationId}/students/${studentId}/documents/${timestamp}_${sanitizedFileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('student-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      // Get school_id from student if not provided
      let finalSchoolId = schoolId;
      if (!finalSchoolId) {
        const { data: studentData } = await (supabase as any)
          .from('students')
          .select('school_id')
          .eq('id', studentId)
          .single();
        finalSchoolId = studentData?.school_id || null;
      }

      // Insert document record
      const { data: document, error: insertError } = await (supabase as any)
        .from('student_documents')
        .insert({
          student_id: studentId,
          organization_id: organizationId,
          school_id: finalSchoolId,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          description: description || null,
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (insertError) throw new Error(insertError.message);

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

      // Soft delete
      const { error } = await (supabase as any)
        .from('student_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentId)
        .is('deleted_at', null);

      if (error) throw new Error(error.message);
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

      const { data, error } = await (supabase as any)
        .from('student_educational_history')
        .select('*')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('start_date', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as StudentEducationalHistory[];
    },
    enabled: !!user && !!profile && !!studentId,
  });
};

export const useCreateStudentEducationalHistory = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentEducationalHistoryInsert) => {
      if (!user) throw new Error('User not authenticated');

      const organizationId = payload.organization_id || profile?.organization_id;
      if (!organizationId) {
        throw new Error('Organization is required');
      }

      // Convert empty strings to null
      const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && value.trim() === '' && key !== 'institution_name') {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const { data, error } = await (supabase as any)
        .from('student_educational_history')
        .insert({
          ...cleanPayload,
          organization_id: organizationId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as StudentEducationalHistory;
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

      // Convert empty strings to null
      const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && value.trim() === '' && key !== 'institution_name') {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const { data: updated, error } = await (supabase as any)
        .from('student_educational_history')
        .update(cleanData)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw new Error(error.message);
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

      const { error } = await (supabase as any)
        .from('student_educational_history')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);

      if (error) throw new Error(error.message);
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

      const { data, error } = await (supabase as any)
        .from('student_discipline_records')
        .select('*')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('incident_date', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as StudentDisciplineRecord[];
    },
    enabled: !!user && !!profile && !!studentId,
  });
};

export const useCreateStudentDisciplineRecord = () => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: StudentDisciplineRecordInsert) => {
      if (!user) throw new Error('User not authenticated');

      const organizationId = payload.organization_id || profile?.organization_id;
      if (!organizationId) {
        throw new Error('Organization is required');
      }

      // Convert empty strings to null
      const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && value.trim() === '' && key !== 'incident_date' && key !== 'incident_type') {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const { data, error } = await (supabase as any)
        .from('student_discipline_records')
        .insert({
          ...cleanPayload,
          organization_id: organizationId,
          severity: cleanPayload.severity || 'minor',
          resolved: cleanPayload.resolved ?? false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as StudentDisciplineRecord;
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

      // Convert empty strings to null
      const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
        if (typeof value === 'string' && value.trim() === '' && key !== 'incident_date' && key !== 'incident_type') {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      const { data: updated, error } = await (supabase as any)
        .from('student_discipline_records')
        .update(cleanData)
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw new Error(error.message);
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

      const { error } = await (supabase as any)
        .from('student_discipline_records')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .is('deleted_at', null);

      if (error) throw new Error(error.message);
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

      const { data: updated, error } = await (supabase as any)
        .from('student_discipline_records')
        .update({
          resolved: true,
          resolved_date: new Date().toISOString().split('T')[0],
          resolved_by: user.id,
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select()
        .single();

      if (error) throw new Error(error.message);
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
