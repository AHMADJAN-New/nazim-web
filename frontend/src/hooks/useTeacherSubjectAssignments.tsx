import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';
import { teacherSubjectAssignmentsApi } from '@/lib/api/client';

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

export const useTeacherSubjectAssignments = (organizationId?: string, teacherId?: string, academicYearId?: string) => {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery({
        queryKey: ['teacher-subject-assignments', organizationId || profile?.organization_id, teacherId, academicYearId],
        queryFn: async () => {
            if (!user || !profile) return [];

            // Fetch assignments from Laravel API
            const assignments = await teacherSubjectAssignmentsApi.list({
                organization_id: organizationId || profile.organization_id || undefined,
                teacher_id: teacherId,
                academic_year_id: academicYearId,
            });

            // Note: Schedule slots are fetched separately by the component using useScheduleSlots hook
            // We just return the assignments with schedule_slot_ids array
            return assignments.map((assignment: any) => ({
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
                } else if (profile.role === 'super_admin') {
                    throw new Error('Organization ID is required for super admin');
                } else {
                    throw new Error('User must be assigned to an organization');
                }
            }

            // Create assignment via Laravel API
            const assignment = await teacherSubjectAssignmentsApi.create({
                ...assignmentData,
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
            toast.success('Teacher subject assignment created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create teacher subject assignment');
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
            toast.success('Teacher subject assignment updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update teacher subject assignment');
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
            toast.success('Teacher subject assignment deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete teacher subject assignment');
        },
    });
};
