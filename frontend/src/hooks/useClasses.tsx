import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { classesApi } from '@/lib/api/client';
import type * as ClassApi from '@/types/api/class';
import type { Class, ClassAcademicYear } from '@/types/domain/class';
import {
    mapClassApiToDomain,
    mapClassDomainToInsert,
    mapClassDomainToUpdate,
    mapClassAcademicYearApiToDomain,
    mapClassAcademicYearDomainToInsert,
    mapClassAcademicYearDomainToUpdate,
} from '@/mappers/classMapper';
import type { PaginatedResponse } from '@/types/pagination';
import { usePagination } from './usePagination';
import { useEffect } from 'react';

// Re-export domain types for convenience
export type { Class, ClassAcademicYear } from '@/types/domain/class';

export const useClasses = (organizationId?: string, usePaginated?: boolean) => {
    const { user, profile, profileLoading } = useAuth();
    const isEventUser = profile?.is_event_user === true;
    const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
        initialPage: 1,
        initialPageSize: 25,
    });

    const { data, isLoading, error } = useQuery<Class[] | PaginatedResponse<ClassApi.Class>>({
        queryKey: ['classes', organizationId || profile?.organization_id, usePaginated ? page : undefined, usePaginated ? pageSize : undefined],
        queryFn: async () => {
            if (!user || !profile) return [];

            const params: { organization_id?: string; page?: number; per_page?: number } = {
                organization_id: organizationId || profile.organization_id,
            };

            // Add pagination params if using pagination
            if (usePaginated) {
                params.page = page;
                params.per_page = pageSize;
            }

            const apiClasses = await classesApi.list(params);

            // Check if response is paginated (Laravel returns meta fields directly, not nested)
            if (usePaginated && apiClasses && typeof apiClasses === 'object' && 'data' in apiClasses && 'current_page' in apiClasses) {
                // Laravel's paginated response has data and meta fields at the same level
                const paginatedResponse = apiClasses as any;
                // Map API models to domain models
                const classes = (paginatedResponse.data as ClassApi.Class[]).map(mapClassApiToDomain);
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
                return { data: classes, meta } as PaginatedResponse<ClassApi.Class>;
            }

            // Map API models to domain models (non-paginated)
            return (apiClasses as ClassApi.Class[]).map(mapClassApiToDomain);
        },
        enabled: !!user && !!profile && !profileLoading && !isEventUser, // Disable for event users and wait for profile
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    // Update pagination state from API response
    useEffect(() => {
        if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
            updateFromMeta((data as PaginatedResponse<ClassApi.Class>).meta);
        }
    }, [data, usePaginated, updateFromMeta]);

    // Return appropriate format based on pagination mode
    if (usePaginated) {
        const paginatedData = data as PaginatedResponse<ClassApi.Class> | undefined;
        return {
            classes: paginatedData?.data || [],
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
        data: data as Class[] | undefined,
        isLoading,
        error,
    };
};

export const useClassAcademicYears = (academicYearId?: string, organizationId?: string) => {
    const { user, profile } = useAuth();

    return useQuery<ClassAcademicYear[]>({
        queryKey: ['class-academic-years', academicYearId, organizationId || profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile || !academicYearId) return [];

            try {
                const apiClassYears = await classesApi.getByAcademicYear(academicYearId, organizationId || profile.organization_id);

                // Map API models to domain models
                return (apiClassYears as ClassApi.ClassAcademicYear[]).map(mapClassAcademicYearApiToDomain);
            } catch (error: any) {
                // Log error but don't throw - return empty array to prevent UI breakage
                const status = error?.response?.status || error?.status;
                const message = error?.message || error?.response?.data?.error || 'Unknown error';
                
                // Log only in development or for non-404 errors
                if (status !== 404) {
                    console.error('Failed to fetch class academic years:', {
                        status,
                        message,
                        academicYearId,
                        error
                    });
                }
                
                // Return empty array for any error (404, 500, etc.) to prevent UI breakage
                return [];
            }
        },
        enabled: !!user && !!profile && !!academicYearId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false, // REQUIRED: Performance optimization
        refetchOnReconnect: false, // REQUIRED: Performance optimization
        retry: false, // Don't retry on error to prevent console spam
    });
};

export const useClassHistory = (classId: string) => {
    const { user, profile } = useAuth();

    return useQuery<ClassAcademicYear[]>({
        queryKey: ['class-history', classId],
        queryFn: async () => {
            if (!user || !profile || !classId) return [];

            const apiClassYears = await classesApi.getAcademicYears(classId);

            // Map API models to domain models
            return (apiClassYears as ClassApi.ClassAcademicYear[]).map(mapClassAcademicYearApiToDomain);
        },
        enabled: !!user && !!profile && !!classId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false, // REQUIRED: Performance optimization
        refetchOnReconnect: false, // REQUIRED: Performance optimization
    });
};

export const useCreateClass = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (classData: Partial<Class>) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Convert domain model to API insert payload
            const insertData = mapClassDomainToInsert({
                ...classData,
                organizationId: classData.organizationId ?? profile.organization_id,
            });

            const apiClass = await classesApi.create(insertData);
            // Map API response back to domain model
            return mapClassApiToDomain(apiClass as ClassApi.Class);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            showToast.success('academic.classes.classCreated');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.classes.createFailed');
        },
    });
};

export const useUpdateClass = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Class> & { id: string }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Convert domain model to API update payload
            const updateData = mapClassDomainToUpdate(updates);

            const apiClass = await classesApi.update(id, updateData);
            // Map API response back to domain model
            return mapClassApiToDomain(apiClass as ClassApi.Class);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['class-academic-years'] });
            showToast.success('academic.classes.classUpdated');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.classes.updateFailed');
        },
    });
};

export const useDeleteClass = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            await classesApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            showToast.success('academic.classes.classDeleted');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.classes.deleteFailed');
        },
    });
};

export const useAssignClassToYear = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (assignmentData: Partial<ClassAcademicYear>) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Convert domain model to API insert payload
            const insertData = mapClassAcademicYearDomainToInsert(assignmentData);

            // Extract class_id from insertData (it's mapped as class_id, not classId)
            const classId = assignmentData.classId || insertData.class_id;
            
            if (!classId) {
                throw new Error('Class ID is required');
            }

            // Remove class_id from rest data since it's passed as URL parameter
            const { class_id, ...rest } = insertData;
            const apiClassYear = await classesApi.assignToYear(classId, rest);
            // Map API response back to domain model
            return mapClassAcademicYearApiToDomain(apiClassYear as ClassApi.ClassAcademicYear);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-academic-years'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            showToast.success('academic.classes.classAssigned');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.classes.assignFailed');
        },
    });
};

export const useUpdateClassYearInstance = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ClassAcademicYear> & { id: string }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Convert domain model to API update payload
            const updateData = mapClassAcademicYearDomainToUpdate(updates);

            const apiClassYear = await classesApi.updateInstance(id, updateData);
            // Map API response back to domain model
            return mapClassAcademicYearApiToDomain(apiClassYear as ClassApi.ClassAcademicYear);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-academic-years'] });
            queryClient.invalidateQueries({ queryKey: ['class-history'] });
            showToast.success('academic.classes.classInstanceUpdated');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.classes.instanceUpdateFailed');
        },
    });
};

export const useRemoveClassFromYear = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            await classesApi.removeFromYear(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-academic-years'] });
            queryClient.invalidateQueries({ queryKey: ['class-history'] });
            showToast.success('academic.classes.classRemoved');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.classes.removeFailed');
        },
    });
};

export const useBulkAssignClassSections = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (bulkData: {
            classId: string;
            academicYearId: string;
            sections: string[]; // Array of section names like ['A', 'B', 'C', 'D']
            defaultRoomId?: string | null;
            defaultCapacity?: number | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            const result = await classesApi.bulkAssignSections({
                class_id: bulkData.classId,
                academic_year_id: bulkData.academicYearId,
                sections: bulkData.sections,
                default_room_id: bulkData.defaultRoomId,
                default_capacity: bulkData.defaultCapacity,
            });

            return {
                created: (result.created as ClassApi.ClassAcademicYear[]).map(mapClassAcademicYearApiToDomain),
                skipped: result.skipped,
            };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['class-academic-years'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            showToast.success(`Successfully created ${result.created.length} section(s). ${result.skipped > 0 ? `${result.skipped} section(s) already existed.` : ''}`);
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.classes.sectionCreateFailed');
        },
    });
};

export const useCopyClassesBetweenYears = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (copyData: {
            fromAcademicYearId: string;
            toAcademicYearId: string;
            classInstanceIds: string[];
            copyAssignments?: boolean; // Copy teachers and rooms
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            const apiClassYears = await classesApi.copyBetweenYears({
                from_academic_year_id: copyData.fromAcademicYearId,
                to_academic_year_id: copyData.toAcademicYearId,
                class_instance_ids: copyData.classInstanceIds,
                copy_assignments: copyData.copyAssignments,
            });

            // Map API models to domain models
            return (apiClassYears as ClassApi.ClassAcademicYear[]).map(mapClassAcademicYearApiToDomain);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['class-academic-years'] });
            queryClient.invalidateQueries({ queryKey: ['class-history'] });
            showToast.success('academic.classes.classesCopied');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.classes.copyFailed');
        },
    });
};
