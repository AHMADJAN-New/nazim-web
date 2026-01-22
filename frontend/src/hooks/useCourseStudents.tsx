import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from './useAuth';
import { usePagination } from './usePagination';

import { courseStudentsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { mapCourseStudentApiToDomain, mapCourseStudentDomainToInsert, mapCourseStudentDomainToUpdate } from '@/mappers/courseStudentMapper';
import type * as Api from '@/types/api/courseStudent';
import type { CourseStudent } from '@/types/domain/courseStudent';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';


export const useCourseStudents = (courseId?: string, usePaginated?: boolean) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 10,
  });

  const { data, isLoading, error, refetch } = useQuery<CourseStudent[] | PaginatedResponse<Api.CourseStudent>>({
    queryKey: ['course-students', courseId ?? 'all', profile?.organization_id ?? null, profile?.default_school_id ?? null, usePaginated ? page : undefined, usePaginated ? pageSize : undefined],
    queryFn: async () => {
      if (!user || !profile) return [];
      const params: { course_id?: string; organization_id?: string; page?: number; per_page?: number } = {
        organization_id: profile.organization_id || undefined,
      };
      if (courseId) params.course_id = courseId;
      if (usePaginated) {
        params.page = page;
        params.per_page = pageSize;
      }
      const apiStudents = await courseStudentsApi.list(params);
      
      if (import.meta.env.DEV) {
        console.log('[useCourseStudents] API response:', apiStudents);
      }
      
      if (usePaginated && apiStudents && typeof apiStudents === 'object' && 'data' in apiStudents) {
        const paginated = apiStudents as any;
        // Debug: Log raw API data before mapping
        if (import.meta.env.DEV && paginated.data && paginated.data.length > 0) {
          const sample = paginated.data[0];
          console.log('[useCourseStudents] Sample raw API student:', {
            id: sample.id,
            picture_path: sample.picture_path,
            full_name: sample.full_name,
          });
        }
        const students = (paginated.data || []).map(mapCourseStudentApiToDomain);
        // Debug: Log mapped data
        if (import.meta.env.DEV && students.length > 0) {
          const sample = students[0];
          console.log('[useCourseStudents] Sample mapped student:', {
            id: sample.id,
            picturePath: sample.picturePath,
            fullName: sample.fullName,
          });
          const withPictures = students.filter(s => s.picturePath);
          if (withPictures.length > 0) {
            console.log('[useCourseStudents] Students with pictures:', withPictures.length, 'out of', students.length);
          }
        }
        const meta: PaginationMeta = {
          current_page: paginated.current_page,
          from: paginated.from,
          last_page: paginated.last_page,
          per_page: paginated.per_page,
          to: paginated.to,
          total: paginated.total,
          path: paginated.path,
          first_page_url: paginated.first_page_url,
          last_page_url: paginated.last_page_url,
          next_page_url: paginated.next_page_url,
          prev_page_url: paginated.prev_page_url,
        };
        return { data: students, meta } as PaginatedResponse<Api.CourseStudent>;
      }
      // Handle non-paginated response
      if (Array.isArray(apiStudents)) {
        return apiStudents.map(mapCourseStudentApiToDomain);
      }
      // If response is not an array, return empty array
      if (import.meta.env.DEV) {
        console.warn('[useCourseStudents] Unexpected response format:', apiStudents);
      }
      return [];
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<Api.CourseStudent>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  if (usePaginated) {
    const paginated = data as PaginatedResponse<Api.CourseStudent> | undefined;
    return {
      data: paginated?.data || [],
      isLoading,
      error,
      pagination: paginated?.meta ?? null,
      paginationState,
      page,
      pageSize,
      setPage,
      setPageSize,
      refetch,
    };
  }

  return { data: data as CourseStudent[] | undefined, isLoading, error, refetch };
};

export const useCreateCourseStudent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: Partial<CourseStudent>) => {
      const organizationId = payload.organizationId || profile?.organization_id;
      if (!organizationId) throw new Error('Organization is required');
      const insertPayload = mapCourseStudentDomainToInsert({ ...payload, organizationId });
      const apiStudent = await courseStudentsApi.create(insertPayload);
      return mapCourseStudentApiToDomain(apiStudent as Api.CourseStudent);
    },
    onSuccess: async () => {
      showToast.success('toast.courseStudents.saved');
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['course-students'] });
      await queryClient.refetchQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseStudents.saveFailed'),
  });
};

export const useUpdateCourseStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CourseStudent> }) => {
      const updatePayload = mapCourseStudentDomainToUpdate(data);
      const apiStudent = await courseStudentsApi.update(id, updatePayload);
      return mapCourseStudentApiToDomain(apiStudent as Api.CourseStudent);
    },
    onSuccess: async () => {
      showToast.success('toast.courseStudents.updated');
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['course-students'] });
      await queryClient.refetchQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseStudents.updateFailed'),
  });
};

export const useDeleteCourseStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await courseStudentsApi.delete(id);
      return id;
    },
    onSuccess: async () => {
      showToast.success('toast.courseStudents.deleted');
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['course-students'] });
      await queryClient.refetchQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseStudents.deleteFailed'),
  });
};

export const useEnrollFromMain = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { course_id: string; main_student_ids: string[]; registration_date: string; fee_paid?: boolean; fee_amount?: number }) => {
      const result = await courseStudentsApi.enrollFromMain(data);
      
      // Handle case where backend returns error object instead of array
      if (result && typeof result === 'object' && 'error' in result && !Array.isArray(result)) {
        throw new Error((result as any).error || 'Failed to enroll students');
      }
      
      // Ensure result is an array
      const studentsArray = Array.isArray(result) ? result : [];
      return studentsArray.map(mapCourseStudentApiToDomain);
    },
    onSuccess: async (students) => {
      if (students && students.length > 0) {
        showToast.success(`${students.length} student(s) enrolled successfully`);
      } else {
        showToast.warning('toast.courseStudents.noStudentsEnrolled');
      }
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['course-students'] });
      await queryClient.refetchQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseStudents.enrollFailed'),
  });
};

export const useCopyToMain = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { generate_new_admission?: boolean; link_to_course_student?: boolean } }) => {
      const result = await courseStudentsApi.copyToMain(id, data);
      return result as { course_student_id: string; new_student_id: string };
    },
    onSuccess: () => {
      showToast.success('toast.courseStudents.copiedToMain');
      void queryClient.invalidateQueries({ queryKey: ['course-students'] });
      void queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseStudents.copyFailed'),
  });
};

export const useMarkCompleted = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completionDate }: { id: string; completionDate?: string }) => {
      const result = await courseStudentsApi.markCompleted(id);
      return mapCourseStudentApiToDomain(result as Api.CourseStudent);
    },
    onSuccess: async () => {
      showToast.success('toast.courseStudents.markedCompleted');
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['course-students'] });
      await queryClient.refetchQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseStudents.markCompletedFailed'),
  });
};

export const useMarkDropped = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await courseStudentsApi.markDropped(id);
      return mapCourseStudentApiToDomain(result as Api.CourseStudent);
    },
    onSuccess: async () => {
      showToast.success('toast.courseStudents.markedDropped');
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['course-students'] });
      await queryClient.refetchQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseStudents.markDroppedFailed'),
  });
};

export const useIssueCertificate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await courseStudentsApi.issueCertificate(id);
      return mapCourseStudentApiToDomain(result as Api.CourseStudent);
    },
    onSuccess: async () => {
      showToast.success('toast.courseStudents.certificateIssued');
      // CRITICAL: Use both invalidateQueries AND refetchQueries for immediate UI updates
      await queryClient.invalidateQueries({ queryKey: ['course-students'] });
      await queryClient.refetchQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => showToast.error(error.message || 'toast.courseStudents.certificateIssueFailed'),
  });
};
