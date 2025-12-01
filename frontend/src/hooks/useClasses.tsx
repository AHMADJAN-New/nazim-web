import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { classesApi } from '@/lib/api/client';

// Class type definition
export interface Class {
    id: string;
    organization_id: string | null;
    name: string;
    code: string;
    grade_level: number | null;
    description: string | null;
    default_capacity: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export type ClassInsert = Omit<Class, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type ClassUpdate = Partial<Omit<Class, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'organization_id'>>;

// Class Academic Year type definition
export interface ClassAcademicYear {
    id: string;
    class_id: string;
    academic_year_id: string;
    organization_id: string | null;
    section_name: string | null;
    teacher_id: string | null;
    room_id: string | null;
    capacity: number | null;
    current_student_count: number;
    is_active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Extended with relationship data
    class?: Class;
    academic_year?: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        is_current?: boolean;
    };
    teacher?: {
        id: string;
        full_name: string;
    };
    room?: {
        id: string;
        room_number: string;
        building?: {
            id: string;
            building_name: string;
        };
    };
}

export type ClassAcademicYearInsert = Omit<ClassAcademicYear, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'class' | 'academic_year' | 'teacher' | 'room'>;
export type ClassAcademicYearUpdate = Partial<Omit<ClassAcademicYear, 'id' | 'class_id' | 'academic_year_id' | 'organization_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'class' | 'academic_year' | 'teacher' | 'room'>>;

export const useClasses = (organizationId?: string) => {
    const { user, profile } = useAuth();

    return useQuery({
        queryKey: ['classes', organizationId || profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile) return [];

            const data = await classesApi.list({
                organization_id: organizationId || profile?.organization_id,
            });

            return (data || []) as Class[];
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useClassAcademicYears = (academicYearId?: string, organizationId?: string) => {
    const { user, profile } = useAuth();

    return useQuery({
        queryKey: ['class-academic-years', academicYearId, organizationId || profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile || !academicYearId) return [];

            const data = await classesApi.getByAcademicYear(academicYearId, organizationId || profile?.organization_id);

            return (data || []) as ClassAcademicYear[];
        },
        enabled: !!user && !!profile && !!academicYearId,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useClassHistory = (classId: string) => {
    const { user, profile } = useAuth();

    return useQuery({
        queryKey: ['class-history', classId],
        queryFn: async () => {
            if (!user || !profile || !classId) return [];

            const data = await classesApi.getAcademicYears(classId);

            return (data || []) as ClassAcademicYear[];
        },
        enabled: !!user && !!profile && !!classId,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useCreateClass = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (classData: {
            name: string;
            code: string;
            grade_level?: number | null;
            description?: string | null;
            default_capacity?: number;
            is_active?: boolean;
            organization_id?: string | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            const data = await classesApi.create({
                ...classData,
                organization_id: classData.organization_id ?? (profile.role === 'super_admin' ? null : profile.organization_id),
            });

            return data as Class;
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

            const data = await classesApi.update(id, updates);

            return data as Class;
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
        mutationFn: async (assignmentData: {
            class_id: string;
            academic_year_id: string;
            section_name?: string | null;
            room_id?: string | null;
            capacity?: number | null;
            notes?: string | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            const { class_id, ...rest } = assignmentData;
            const data = await classesApi.assignToYear(class_id, rest);

            return data as ClassAcademicYear;
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

            const data = await classesApi.updateInstance(id, updates);

            return data as ClassAcademicYear;
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
            class_id: string;
            academic_year_id: string;
            sections: string[]; // Array of section names like ['A', 'B', 'C', 'D']
            default_room_id?: string | null;
            default_capacity?: number | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            const result = await classesApi.bulkAssignSections(bulkData);

            return result as { created: ClassAcademicYear[]; skipped: number };
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
            from_academic_year_id: string;
            to_academic_year_id: string;
            class_instance_ids: string[];
            copy_assignments?: boolean; // Copy teachers and rooms
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            const data = await classesApi.copyBetweenYears(copyData);

            return data as ClassAcademicYear[];
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

