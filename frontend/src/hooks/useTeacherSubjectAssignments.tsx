import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from './useAuth';
import { usePagination } from './usePagination';
import { useProfile } from './useProfiles';

import { teacherSubjectAssignmentsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';



// Type definition for teacher subject assignment
export type TeacherSubjectAssignment = {
    id: string;
    organization_id: string | null;
    teacher_id: string;
    class_academic_year_id: string;
    subject_id: string;
    schedule_slot_ids: string[];
    school_id: string | null;
    academic_year_id: string | null;
    is_active: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    // Extended with relationship data from Laravel API
    teacher?: {
        id: string;
        employee_id: string;
        first_name: string;
        father_name: string;
        grandfather_name: string | null;
        email: string | null;
        staff_type_id: string | null;
        staff_type?: {
            id: string;
            name: string;
            code: string;
        };
    };
    subject?: {
        id: string;
        name: string;
        code: string;
    };
    class_academic_year?: {
        id: string;
        class_id: string;
        academic_year_id: string;
        section_name: string | null;
        class?: {
            id: string;
            name: string;
            code: string;
        };
    };
    academic_year?: {
        id: string;
        name: string;
    };
    school?: {
        id: string;
        school_name: string;
    };
    organization?: {
        id: string;
        name: string;
    };
    schedule_slots?: Array<{
        id: string;
        name: string;
        code: string;
        start_time: string;
        end_time: string;
    }>;
};

export type TeacherSubjectAssignmentInsert = {
    teacher_id: string;
    class_academic_year_id: string;
    subject_id: string;
    schedule_slot_ids: string[];
    school_id?: string | null;
    academic_year_id?: string | null;
    organization_id?: string;
    is_active?: boolean;
    notes?: string | null;
};

export type TeacherSubjectAssignmentUpdate = {
    schedule_slot_ids?: string[];
    is_active?: boolean;
    notes?: string | null;
};

export const useTeacherSubjectAssignments = (organizationId?: string, teacherId?: string, academicYearId?: string, usePaginated?: boolean) => {
    const { user } = useAuth();
    const { data: profile } = useProfile();
    const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
        initialPage: 1,
        initialPageSize: 25,
    });

    const { data, isLoading, error } = useQuery<TeacherSubjectAssignment[] | PaginatedResponse<any>>({
        queryKey: ['teacher-subject-assignments', organizationId || profile?.organization_id, profile?.default_school_id ?? null, teacherId, academicYearId, usePaginated ? page : undefined, usePaginated ? pageSize : undefined],
        queryFn: async () => {
            if (!user || !profile) return [];

            const params: { organization_id?: string; teacher_id?: string; academic_year_id?: string; page?: number; per_page?: number } = {
                organization_id: organizationId || profile.organization_id || undefined,
                teacher_id: teacherId,
                academic_year_id: academicYearId,
            };

            // Add pagination params if using pagination
            if (usePaginated) {
                params.page = page;
                params.per_page = pageSize;
            }

            // Fetch assignments from Laravel API
            const assignments = await teacherSubjectAssignmentsApi.list(params);

            // Check if response is paginated (Laravel returns meta fields directly, not nested)
            if (usePaginated && assignments && typeof assignments === 'object' && 'data' in assignments && 'current_page' in assignments) {
                // Laravel's paginated response has data and meta fields at the same level
                const paginatedResponse = assignments as any;
                // Map assignments with schedule slots and teacher full_name
                const mapped = (paginatedResponse.data as any[]).map((assignment: any) => ({
                    ...assignment,
                    schedule_slots: [],
                    teacher: assignment.teacher ? {
                        ...assignment.teacher,
                        full_name: [
                            assignment.teacher.first_name,
                            assignment.teacher.father_name,
                            assignment.teacher.grandfather_name,
                        ].filter(Boolean).join(' '),
                    } : undefined,
                })) as TeacherSubjectAssignment[];
                
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
                return { data: mapped, meta } as PaginatedResponse<TeacherSubjectAssignment>;
            }

            // Note: Schedule slots are fetched separately by the component using useScheduleSlots hook
            // We just return the assignments with schedule_slot_ids array
            return (assignments as any[]).map((assignment: any) => ({
                ...assignment,
                // schedule_slots will be populated by the component using useScheduleSlots hook
                schedule_slots: [], // Empty array - component will populate this
                // Build full_name for teacher from first_name, father_name, grandfather_name
                teacher: assignment.teacher ? {
                    ...assignment.teacher,
                    full_name: [
                        assignment.teacher.first_name,
                        assignment.teacher.father_name,
                        assignment.teacher.grandfather_name,
                    ].filter(Boolean).join(' '),
                } : undefined,
            })) as TeacherSubjectAssignment[];
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    // Update pagination state from API response
    useEffect(() => {
        if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
            updateFromMeta((data as PaginatedResponse<any>).meta);
        }
    }, [data, usePaginated, updateFromMeta]);

    // Return appropriate format based on pagination mode
    if (usePaginated) {
        const paginatedData = data as PaginatedResponse<TeacherSubjectAssignment> | undefined;
        return {
            assignments: paginatedData?.data || [],
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
        data: data as TeacherSubjectAssignment[] | undefined,
        isLoading,
        error,
    };
};

export const useCreateTeacherSubjectAssignment = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useMutation({
        mutationFn: async (assignmentData: {
            teacher_id: string;
            class_academic_year_id: string;
            subject_id: string;
            schedule_slot_ids: string[];
            school_id?: string | null;
            academic_year_id?: string | null;
            organization_id?: string;
            is_active?: boolean;
            notes?: string | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get organization_id - use provided or user's org
            let organizationId = assignmentData.organization_id;
            if (!organizationId) {
                if (profile.organization_id) {
                    organizationId = profile.organization_id;
                } else {
                    throw new Error('User must be assigned to an organization');
                }
            }

            // Create assignment via Laravel API
            // Strict school scoping: do not allow client-selected school_id.
            // The backend derives school from current school context.
            const { school_id: _ignoredSchoolId, organization_id: _ignoredOrgId, ...rest } = assignmentData;
            const assignment = await teacherSubjectAssignmentsApi.create({
                ...rest,
                organization_id: organizationId,
            });

            // Build full_name for teacher
            if (assignment.teacher) {
                assignment.teacher = {
                    ...assignment.teacher,
                    full_name: [
                        assignment.teacher.first_name,
                        assignment.teacher.father_name,
                        assignment.teacher.grandfather_name,
                    ].filter(Boolean).join(' '),
                };
            }

            return assignment as TeacherSubjectAssignment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-subject-assignments'] });
            showToast.success('toast.teacherSubjectAssignmentCreated');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.teacherSubjectAssignmentCreateFailed');
        },
    });
};

export const useUpdateTeacherSubjectAssignment = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<TeacherSubjectAssignment> & { id: string }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Update assignment via Laravel API
            const assignment = await teacherSubjectAssignmentsApi.update(id, {
                schedule_slot_ids: updates.schedule_slot_ids,
                is_active: updates.is_active,
                notes: updates.notes,
            });

            // Build full_name for teacher
            if (assignment.teacher) {
                assignment.teacher = {
                    ...assignment.teacher,
                    full_name: [
                        assignment.teacher.first_name,
                        assignment.teacher.father_name,
                        assignment.teacher.grandfather_name,
                    ].filter(Boolean).join(' '),
                };
            }

            return assignment as TeacherSubjectAssignment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-subject-assignments'] });
            showToast.success('toast.teacherSubjectAssignmentUpdated');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.teacherSubjectAssignmentUpdateFailed');
        },
    });
};

export const useDeleteTeacherSubjectAssignment = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Delete assignment via Laravel API
            await teacherSubjectAssignmentsApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-subject-assignments'] });
            showToast.success('toast.teacherSubjectAssignmentDeleted');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.teacherSubjectAssignmentDeleteFailed');
        },
    });
};
