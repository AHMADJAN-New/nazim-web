import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type { Tables, TablesInsert, TablesUpdate, Json } from '@/integrations/supabase/types';

// Use generated type from database schema, extended with relations
export type TeacherSubjectAssignment = Omit<Tables<'teacher_subject_assignments'>, 'schedule_slot_ids'> & {
    schedule_slot_ids: string[]; // Override Json type with proper array type
    // Extended with relationship data
    teacher?: {
        id: string;
        employee_id: string;
        full_name: string;
        email: string | null;
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
        academic_year?: {
            id: string;
            name: string;
        };
    };
    schedule_slots?: Array<{
        id: string;
        name: string;
        code: string;
        start_time: string;
        end_time: string;
    }>;
};
export type TeacherSubjectAssignmentInsert = TablesInsert<'teacher_subject_assignments'>;
export type TeacherSubjectAssignmentUpdate = TablesUpdate<'teacher_subject_assignments'>;

export const useTeacherSubjectAssignments = (organizationId?: string, teacherId?: string, academicYearId?: string) => {
    const { user } = useAuth();
    const { data: profile } = useProfile();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

    return useQuery({
        queryKey: ['teacher-subject-assignments', organizationId || profile?.organization_id, teacherId, academicYearId, orgIds.join(',')],
        queryFn: async () => {
            if (!user || !profile || orgsLoading) return [];

            let query = (supabase as any)
                .from('teacher_subject_assignments')
                .select(`
                    *,
                    teacher:staff(id, employee_id, full_name, email, staff_type:staff_types(id, name, code)),
                    subject:subjects(id, name, code),
                    class_academic_year:class_academic_years(
                        id,
                        class_id,
                        academic_year_id,
                        section_name,
                        class:classes(id, name, code),
                        academic_year:academic_years(id, name)
                    )
                `)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            const resolvedOrgIds = organizationId ? [organizationId] : orgIds;
            if (resolvedOrgIds.length === 0) {
                return [];
            }
            query = query.in('organization_id', resolvedOrgIds);

            // Filter by teacher if provided
            if (teacherId) {
                query = query.eq('teacher_id', teacherId);
            }

            // Filter by academic year if provided
            if (academicYearId) {
                query = query.eq('academic_year_id', academicYearId);
            }

            const { data, error } = await query;

            if (error) {
                throw new Error(error.message);
            }

            // Parse schedule_slot_ids JSONB array
            const parsed = (data || []).map((assignment: any) => ({
                ...assignment,
                schedule_slot_ids: Array.isArray(assignment.schedule_slot_ids)
                    ? assignment.schedule_slot_ids
                    : (typeof assignment.schedule_slot_ids === 'string'
                        ? JSON.parse(assignment.schedule_slot_ids)
                        : []),
            }));

            // Fetch schedule slots for each assignment
            const allSlotIds = [...new Set(parsed.flatMap((a: any) => a.schedule_slot_ids))];
            let slotsMap: Record<string, any> = {};

            if (allSlotIds.length > 0) {
                const { data: slotsData } = await (supabase as any)
                    .from('schedule_slots')
                    .select('id, name, code, start_time, end_time')
                    .in('id', allSlotIds)
                    .is('deleted_at', null);

                if (slotsData) {
                    slotsMap = slotsData.reduce((acc: Record<string, any>, slot: any) => {
                        acc[slot.id] = slot;
                        return acc;
                    }, {});
                }
            }

            // Enrich assignments with schedule slots
            return parsed.map((assignment: any) => ({
                ...assignment,
                schedule_slots: assignment.schedule_slot_ids
                    .map((id: string) => slotsMap[id])
                    .filter(Boolean),
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

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id) {
                throw new Error('Cannot create assignment for different organization');
            }

            const { data, error } = await (supabase as any)
                .from('teacher_subject_assignments')
                .insert({
                    teacher_id: assignmentData.teacher_id,
                    class_academic_year_id: assignmentData.class_academic_year_id,
                    subject_id: assignmentData.subject_id,
                    schedule_slot_ids: assignmentData.schedule_slot_ids,
                    school_id: assignmentData.school_id || null,
                    academic_year_id: assignmentData.academic_year_id || null,
                    organization_id: organizationId,
                    is_active: assignmentData.is_active ?? true,
                    notes: assignmentData.notes || null,
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data as TeacherSubjectAssignment;
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

            // Get current assignment to check organization
            const { data: currentAssignment } = await (supabase as any)
                .from('teacher_subject_assignments')
                .select('organization_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentAssignment) {
                throw new Error('Assignment not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentAssignment.organization_id !== profile.organization_id) {
                throw new Error('Cannot update assignment from different organization');
            }

            const updateData: any = {};
            if (updates.schedule_slot_ids !== undefined) updateData.schedule_slot_ids = updates.schedule_slot_ids;
            if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
            if (updates.notes !== undefined) updateData.notes = updates.notes;

            const { data, error } = await (supabase as any)
                .from('teacher_subject_assignments')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data as TeacherSubjectAssignment;
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

            // Get current assignment to check organization
            const { data: currentAssignment } = await (supabase as any)
                .from('teacher_subject_assignments')
                .select('organization_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentAssignment) {
                throw new Error('Assignment not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentAssignment.organization_id !== profile.organization_id) {
                throw new Error('Cannot delete assignment from different organization');
            }

            // Hard delete
            const { error } = await (supabase as any)
                .from('teacher_subject_assignments')
                .delete()
                .eq('id', id);

            if (error) {
                throw new Error(error.message);
            }
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

