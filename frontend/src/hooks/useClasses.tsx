import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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

// Re-export domain types for convenience
export type { Class, ClassAcademicYear } from '@/types/domain/class';

export const useClasses = (organizationId?: string) => {
    const { user, profile } = useAuth();

    return useQuery<Class[]>({
        queryKey: ['classes', organizationId || profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile) return [];

            const apiClasses = await classesApi.list({
                organization_id: organizationId || profile.organization_id,
            });

            // Map API models to domain models
            return (apiClasses as ClassApi.Class[]).map(mapClassApiToDomain);
        },
        enabled: !!user && !!profile,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
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
                organizationId: classData.organizationId ?? (profile.role === 'super_admin' ? null : profile.organization_id),
            });

            const apiClass = await classesApi.create(insertData);
            // Map API response back to domain model
            return mapClassApiToDomain(apiClass as ClassApi.Class);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            toast.success('Class created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create class');
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
            toast.success('Class updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update class');
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
            toast.success('Class deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete class');
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

            const { classId, ...rest } = insertData;
            const apiClassYear = await classesApi.assignToYear(classId, rest);
            // Map API response back to domain model
            return mapClassAcademicYearApiToDomain(apiClassYear as ClassApi.ClassAcademicYear);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-academic-years'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            toast.success('Class assigned to academic year successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to assign class to academic year');
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
            toast.success('Class instance updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update class instance');
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
            toast.success('Class removed from academic year successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to remove class from academic year');
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
            toast.success(`Successfully created ${result.created.length} section(s). ${result.skipped > 0 ? `${result.skipped} section(s) already existed.` : ''}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create sections');
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
            toast.success(`Successfully copied ${data.length} class instance(s) to the new academic year`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to copy classes between academic years');
        },
    });
};
