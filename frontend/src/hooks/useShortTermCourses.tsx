import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { shortTermCoursesApi } from '@/lib/api/client';
import type * as Api from '@/types/api/shortTermCourse';
import type { ShortTermCourse } from '@/types/domain/shortTermCourse';
import { mapShortTermCourseApiToDomain, mapShortTermCourseDomainToInsert, mapShortTermCourseDomainToUpdate } from '@/mappers/shortTermCourseMapper';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import { usePagination } from './usePagination';

export const useShortTermCourses = (organizationId?: string, usePaginated?: boolean) => {
  const { user, profile } = useAuth();
  const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
    initialPage: 1,
    initialPageSize: 10,
  });

  const { data, isLoading, error, refetch } = useQuery<ShortTermCourse[] | PaginatedResponse<Api.ShortTermCourse>>({
    queryKey: ['short-term-courses', organizationId ?? profile?.organization_id ?? null, usePaginated ? page : undefined, usePaginated ? pageSize : undefined],
    queryFn: async () => {
      if (!user || !profile) return [];
      const effectiveOrgId = organizationId || profile.organization_id;
      const params: { organization_id?: string; page?: number; per_page?: number } = {
        organization_id: effectiveOrgId || undefined,
      };
      if (usePaginated) {
        params.page = page;
        params.per_page = pageSize;
      }
      const apiCourses = await shortTermCoursesApi.list(params);
      
      if (usePaginated && apiCourses && typeof apiCourses === 'object' && 'data' in apiCourses) {
        const paginated = apiCourses as any;
        const courses = (paginated.data as Api.ShortTermCourse[]).map(mapShortTermCourseApiToDomain);
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
        return { data: courses, meta } as PaginatedResponse<Api.ShortTermCourse>;
      }
      
      // Non-paginated response
      const coursesArray = Array.isArray(apiCourses) 
        ? (apiCourses as Api.ShortTermCourse[]).map(mapShortTermCourseApiToDomain)
        : [];
      
      return coursesArray;
    },
    enabled: !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
      updateFromMeta((data as PaginatedResponse<Api.ShortTermCourse>).meta);
    }
  }, [data, usePaginated, updateFromMeta]);

  if (usePaginated) {
    const paginated = data as PaginatedResponse<Api.ShortTermCourse> | undefined;
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

  return { data: (data as ShortTermCourse[] | undefined) || [], isLoading, error, refetch };
};

export const useCreateShortTermCourse = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (payload: Partial<ShortTermCourse>) => {
      const organizationId = payload.organizationId || profile?.organization_id;
      if (!organizationId) throw new Error('Organization is required');
      const insertPayload = mapShortTermCourseDomainToInsert({ ...payload, organizationId });
      const apiCourse = await shortTermCoursesApi.create(insertPayload);
      return mapShortTermCourseApiToDomain(apiCourse as Api.ShortTermCourse);
    },
    onSuccess: async () => {
      toast.success('Course saved successfully');
      // Invalidate all short-term-courses queries (with any pagination params)
      await queryClient.invalidateQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
      // Refetch all matching queries
      await queryClient.refetchQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not save course'),
  });
};

export const useUpdateShortTermCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ShortTermCourse> }) => {
      const updatePayload = mapShortTermCourseDomainToUpdate(data);
      const apiCourse = await shortTermCoursesApi.update(id, updatePayload);
      return mapShortTermCourseApiToDomain(apiCourse as Api.ShortTermCourse);
    },
    onSuccess: async () => {
      toast.success('Course updated');
      await queryClient.invalidateQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
      await queryClient.refetchQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not update course'),
  });
};

export const useDeleteShortTermCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await shortTermCoursesApi.delete(id);
      return id;
    },
    onSuccess: async () => {
      toast.success('Course deleted');
      await queryClient.invalidateQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
      await queryClient.refetchQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete course'),
  });
};

export const useCloseCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const apiCourse = await shortTermCoursesApi.close(id);
      return mapShortTermCourseApiToDomain(apiCourse as Api.ShortTermCourse);
    },
    onSuccess: async () => {
      toast.success('Course closed');
      await queryClient.invalidateQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
      await queryClient.refetchQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not close course'),
  });
};

export const useReopenCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const apiCourse = await shortTermCoursesApi.reopen(id);
      return mapShortTermCourseApiToDomain(apiCourse as Api.ShortTermCourse);
    },
    onSuccess: async () => {
      toast.success('Course reopened');
      await queryClient.invalidateQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
      await queryClient.refetchQueries({ 
        queryKey: ['short-term-courses'],
        exact: false 
      });
    },
    onError: (error: Error) => toast.error(error.message || 'Could not reopen course'),
  });
};

export const useCourseStats = (courseId: string) => {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ['course-stats', courseId],
    queryFn: async () => {
      if (!user || !profile) return null;
      const stats = await shortTermCoursesApi.stats(courseId);
      return stats as {
        course_id: string;
        enrollment_count: number;
        enrolled: number;
        completed: number;
        dropped: number;
      };
    },
    enabled: !!user && !!profile && !!courseId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
