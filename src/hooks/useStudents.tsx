import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export type StudentStatus = 'applied' | 'admitted' | 'active' | 'withdrawn';
export type AdmissionFeeStatus = 'paid' | 'pending' | 'waived' | 'partial';
export type Gender = 'male' | 'female';

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
}

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
}

export interface StudentPreviousStudy {
  id: string;
  student_id: string;
  organization_id: string;
  school_id: string | null;
  institution_name: string;
  level: string | null;
  start_year: string | null;
  end_year: string | null;
  notes: string | null;
  created_at: string;
}

export interface StudentBehavior {
  id: string;
  student_id: string;
  organization_id: string;
  school_id: string | null;
  behavior_type: 'positive' | 'negative';
  severity: 'low' | 'medium' | 'high' | null;
  title: string;
  description: string | null;
  reported_by: string | null;
  occurred_on: string | null;
  created_at: string;
}

export interface StudentInsert {
  organization_id?: string;
  school_id?: string | null;
  card_number?: string | null;
  admission_no: string;
  full_name: string;
  father_name: string;
  grandfather_name?: string | null;
  mother_name?: string | null;
  gender: Gender;
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
  admission_fee_status?: AdmissionFeeStatus;
  student_status?: StudentStatus;
  disability_status?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  family_income?: string | null;
  picture_path?: string | null;
}

const buildOrganizationFilter = async (
  profile: any,
  user: any,
  organizationId?: string
): Promise<{ column: string; value: string | string[] | null }> => {
  if (!profile) {
    return { column: 'organization_id', value: null };
  }

  const isSuperAdmin = profile.role === 'super_admin';
  if (isSuperAdmin) {
    if (organizationId) {
      return { column: 'organization_id', value: organizationId };
    }

    const { data: orgs, error } = await (supabase as any)
      .from('super_admin_organizations')
      .select('organization_id')
      .eq('super_admin_id', user?.id)
      .is('deleted_at', null);

    if (error) {
      throw new Error(error.message);
    }

    const orgIds = orgs?.map((o: any) => o.organization_id) || [];
    if (profile.organization_id && !orgIds.includes(profile.organization_id)) {
      orgIds.push(profile.organization_id);
    }

    return { column: 'organization_id', value: orgIds };
  }

  return { column: 'organization_id', value: organizationId || profile.organization_id };
};

export const useStudents = (organizationId?: string) => {
  const { user, profile } = useAuth();

  return useQuery<Student[]>({
    queryKey: ['students', organizationId ?? profile?.organization_id ?? null],
    queryFn: async () => {
      if (!user || !profile) return [];

      const orgFilter = await buildOrganizationFilter(profile, user, organizationId);
      let query = (supabase as any)
        .from('students')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (Array.isArray(orgFilter.value)) {
        query = query.in(orgFilter.column, orgFilter.value);
      } else if (orgFilter.value) {
        query = query.eq(orgFilter.column, orgFilter.value);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []) as Student[];
    },
    enabled: !!user && !!profile,
  });
};

export const useStudentDocuments = (studentId?: string) => {
  const { user } = useAuth();

  return useQuery<StudentDocument[]>({
    queryKey: ['student-documents', studentId],
    queryFn: async () => {
      if (!user || !studentId) return [];

      const { data, error } = await (supabase as any)
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as StudentDocument[];
    },
    enabled: !!user && !!studentId,
  });
};

export const useStudentPreviousStudies = (studentId?: string) => {
  const { user } = useAuth();

  return useQuery<StudentPreviousStudy[]>({
    queryKey: ['student-previous-studies', studentId],
    queryFn: async () => {
      if (!user || !studentId) return [];

      const { data, error } = await (supabase as any)
        .from('student_previous_studies')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as StudentPreviousStudy[];
    },
    enabled: !!user && !!studentId,
  });
};

export const useStudentBehaviors = (studentId?: string) => {
  const { user } = useAuth();

  return useQuery<StudentBehavior[]>({
    queryKey: ['student-behaviors', studentId],
    queryFn: async () => {
      if (!user || !studentId) return [];

      const { data, error } = await (supabase as any)
        .from('student_behaviors')
        .select('*')
        .eq('student_id', studentId)
        .order('occurred_on', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return (data || []) as StudentBehavior[];
    },
    enabled: !!user && !!studentId,
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
        is_orphan: payload.is_orphan ?? false,
        admission_fee_status: payload.admission_fee_status ?? 'pending',
        student_status: payload.student_status ?? 'active',
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
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required to update student');
      }

      let query = (supabase as any)
        .from('students')
        .update({ ...data, organization_id: data.organization_id || profile?.organization_id })
        .eq('id', id)
        .is('deleted_at', null);

      if (profile.role !== 'super_admin') {
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
      if (!profile?.organization_id && profile?.role !== 'super_admin') {
        throw new Error('Organization is required to delete student');
      }

      let query = (supabase as any)
        .from('students')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (profile.role !== 'super_admin') {
        query = query.eq('organization_id', profile.organization_id);
      }

      const { error } = await query;
      if (error) throw new Error(error.message);
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

export const useUploadStudentPicture = () => {
  return useMutation({
    mutationFn: async ({
      studentId,
      organizationId,
      schoolId,
      file,
    }: {
      studentId: string;
      organizationId: string;
      schoolId?: string | null;
      file: File;
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const schoolPath = schoolId ? `${schoolId}/` : '';
      const filePath = `${organizationId}/${schoolPath}${studentId}/picture/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { error: updateError } = await (supabase as any)
        .from('students')
        .update({ picture_path: filePath })
        .eq('id', studentId)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('student-files').getPublicUrl(filePath);

      return publicUrl;
    },
    onSuccess: () => {
      toast.success('Student photo updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload photo');
    },
  });
};

export const useUploadStudentDocument = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const schoolPath = schoolId ? `${schoolId}/` : '';
      const filePath = `${organizationId}/${schoolPath}${studentId}/documents/${documentType}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: document, error: insertError } = await (supabase as any)
        .from('student_documents')
        .insert({
          student_id: studentId,
          organization_id: organizationId,
          school_id: schoolId || null,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || null,
          description: description || null,
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('student-files').getPublicUrl(filePath);

      return { document, publicUrl } as { document: StudentDocument; publicUrl: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-documents'] });
      toast.success('Student document uploaded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload document');
    },
  });
};

export const useCreateStudentPreviousStudy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: Omit<StudentPreviousStudy, 'id' | 'created_at'>
    ) => {
      const { data, error } = await (supabase as any)
        .from('student_previous_studies')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as StudentPreviousStudy;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-previous-studies'] });
      toast.success('Previous study added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add previous study');
    },
  });
};

export const useCreateStudentBehavior = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload: Omit<StudentBehavior, 'id' | 'created_at'>
    ) => {
      const { data, error } = await (supabase as any)
        .from('student_behaviors')
        .insert(payload)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as StudentBehavior;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-behaviors'] });
      toast.success('Behavior note saved');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save behavior note');
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
