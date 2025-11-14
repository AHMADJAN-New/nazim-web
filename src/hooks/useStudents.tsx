import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Student {
  id: string;
  user_id: string;
  student_id: string;
  admission_date: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  emergency_contact?: string;
  status: 'active' | 'inactive' | 'graduated' | 'transferred' | 'suspended';
  class_id?: string;
  branch_id: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
    phone?: string;
    address?: string;
    avatar_url?: string;
  };
  classes?: {
    name: string;
    grade_level?: number;
    section?: string;
  };
}

interface UseStudentsParams {
  page: number;
  pageSize: number;
  search?: string;
  classId?: string;
  section?: string;
  status?: string;
}

export const useStudents = ({
  page,
  pageSize,
  search,
  classId,
  section,
  status,
}: UseStudentsParams) => {
  return useQuery({
    queryKey: ['students', page, pageSize, search, classId, section, status],
    queryFn: async () => {
      const classJoin = section ? 'classes!inner' : 'classes';

      let query = supabase
        .from('students')
        .select(
          `
          *,
          profiles:user_id (
            full_name,
            email,
            phone,
            address,
            avatar_url
          ),
          ${classJoin} (
            name,
            grade_level,
            section
          )
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }

      if (section) {
        query = query.eq('classes.section', section);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(
          `student_id.ilike.%${search}%,guardian_name.ilike.%${search}%,profiles.full_name.ilike.%${search}%`
        );
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) {
        throw new Error(error.message);
      }

      return { students: data as Student[], count: count || 0 };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useCreateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (studentData: {
      email: string;
      full_name: string;
      student_id: string;
      admission_date: string;
      date_of_birth?: string;
      gender?: string;
      blood_group?: string;
      guardian_name?: string;
      guardian_phone?: string;
      guardian_email?: string;
      emergency_contact?: string;
      class_id?: string;
      branch_id: string;
    }) => {
      // Create student through auth signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: studentData.email,
        password: 'TempPassword123!', // This should be handled differently in production
        options: {
          data: {
            full_name: studentData.full_name,
            role: 'student'
          }
        }
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Failed to create user');
      }

      // Then create the student record
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          user_id: authData.user.id,
          student_id: studentData.student_id,
          admission_date: studentData.admission_date,
          date_of_birth: studentData.date_of_birth,
          gender: studentData.gender,
          blood_group: studentData.blood_group,
          guardian_name: studentData.guardian_name,
          guardian_phone: studentData.guardian_phone,
          guardian_email: studentData.guardian_email,
          emergency_contact: studentData.emergency_contact,
          class_id: studentData.class_id,
          branch_id: studentData.branch_id,
        })
        .select()
        .single();

      if (studentError) {
        throw new Error(studentError.message);
      }

      return student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create student');
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Student> & { id: string }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update student');
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete student');
    },
  });
};