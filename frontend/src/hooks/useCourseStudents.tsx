import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { courseStudentsApi } from '@/lib/api/client';
import type * as Api from '@/types/api/courseStudent';
import type { CourseStudent } from '@/types/domain/courseStudent';
import { mapCourseStudentApiToDomain, mapCourseStudentDomainToInsert, mapCourseStudentDomainToUpdate } from '@/mappers/courseStudentMapper';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import { usePagination } from './usePagination';

export const useCourseStudents = (courseId?: string, usePaginated?: boolean) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 10,
  });

  const { data, isLoading, error, refetch } = useQuery<CourseStudent[] | PaginatedResponse<Api.CourseStudent>>({
    queryKey: ['course-students', courseId ?? 'all', usePaginated ? page : undefined, usePaginated ? pageSize : undefined],
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
      if (usePaginated && apiStudents && typeof apiStudents === 'object' && 'data' in apiStudents) {
        const paginated = apiStudents as any;
        const students = (paginated.data as Api.CourseStudent[]).map(mapCourseStudentApiToDomain);
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
      return (apiStudents as Api.CourseStudent[]).map(mapCourseStudentApiToDomain);
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
    onSuccess: () => {
      toast.success('Course student saved');
      void queryClient.invalidateQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not save course student'),
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
    onSuccess: () => {
      toast.success('Course student updated');
      void queryClient.invalidateQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not update course student'),
  });
};

export const useDeleteCourseStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await courseStudentsApi.delete(id);
      return id;
    },
    onSuccess: () => {
      toast.success('Course student deleted');
      void queryClient.invalidateQueries({ queryKey: ['course-students'] });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete course student'),
  });
};
