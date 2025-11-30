import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Use generated type from database schema
export type Subject = Tables<'subjects'>;
export type SubjectInsert = TablesInsert<'subjects'>;
export type SubjectUpdate = TablesUpdate<'subjects'>;

// Use generated type from database schema, extended with relations
export type ClassSubjectTemplate = Tables<'class_subject_templates'> & {
    // Extended with relationship data
    subject?: Subject;
    class?: {
        id: string;
        name: string;
        code: string;
    };
};
export type ClassSubjectTemplateInsert = TablesInsert<'class_subject_templates'>;
export type ClassSubjectTemplateUpdate = TablesUpdate<'class_subject_templates'>;

// Use generated type from database schema, extended with relations
export type ClassSubject = Tables<'class_subjects'> & {
    // Extended with relationship data
    subject?: Subject;
    class_subject_template?: ClassSubjectTemplate;
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
            start_date: string;
            end_date: string;
        };
    };
    teacher?: {
        id: string;
        full_name: string;
    };
    room?: {
        id: string;
        room_number: string;
    };
};
export type ClassSubjectInsert = TablesInsert<'class_subjects'>;
export type ClassSubjectUpdate = TablesUpdate<'class_subjects'>;

export const useSubjects = (organizationId?: string) => {
    const { user, profile } = useAuth();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

    return useQuery({
        queryKey: ['subjects', organizationId || profile?.organization_id, orgIds.join(',')],
        queryFn: async () => {
            if (!user || !profile || orgsLoading) return [];

            let query = (supabase as any)
                .from('subjects')
                .select('*');

            const resolvedOrgIds = organizationId ? [organizationId] : orgIds;

            if (resolvedOrgIds.length === 0) {
                query = query.is('organization_id', null);
            } else {
                query = query.or(`organization_id.is.null,organization_id.in.(${resolvedOrgIds.join(',')})`);
            }

            const { data, error } = await query
                .is('deleted_at', null)
                .order('name', { ascending: true });

            if (error) {
                throw new Error(error.message);
            }

            return (data || []) as Subject[];
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useClassSubjects = (classAcademicYearId?: string, organizationId?: string) => {
    const { user, profile } = useAuth();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

    return useQuery({
        queryKey: ['class-subjects', classAcademicYearId, organizationId || profile?.organization_id, orgIds.join(',')],
        queryFn: async () => {
            if (!user || !profile || !classAcademicYearId || orgsLoading) return [];

            let query = (supabase as any)
                .from('class_subjects')
                .select(`
          *,
          subject:subjects(*),
          class_academic_year:class_academic_years(
            id,
            class_id,
            academic_year_id,
            section_name,
            class:classes(id, name, code),
            academic_year:academic_years(id, name, start_date, end_date)
          )
        `);

            // Filter by class_academic_year
            query = query.eq('class_academic_year_id', classAcademicYearId);

            const resolvedOrgIds = organizationId ? [organizationId] : orgIds;
            if (resolvedOrgIds.length === 0) {
                return [];
            }
            query = query.in('organization_id', resolvedOrgIds);

            const { data, error } = await query
                .is('deleted_at', null);

            if (error) {
                throw new Error(error.message);
            }

            // Enrich with teacher and room data
            let classSubjects = (data || []) as ClassSubject[];

            const teacherIds = [...new Set(classSubjects.map(cs => cs.teacher_id).filter(Boolean))] as string[];
            const roomIds = [...new Set(classSubjects.map(cs => cs.room_id).filter(Boolean))] as string[];

            let teachersMap = new Map();
            if (teacherIds.length > 0) {
                const { data: teachersData } = await (supabase as any)
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', teacherIds);
                teachersMap = new Map((teachersData || []).map((t: any) => [t.id, t]));
            }

            let roomsMap = new Map();
            if (roomIds.length > 0) {
                const { data: roomsData } = await (supabase as any)
                    .from('rooms')
                    .select('id, room_number')
                    .in('id', roomIds);
                roomsMap = new Map((roomsData || []).map((r: any) => [r.id, r]));
            }

            const enriched = classSubjects.map(cs => ({
                ...cs,
                teacher: cs.teacher_id && teachersMap.has(cs.teacher_id)
                    ? { id: cs.teacher_id, full_name: (teachersMap.get(cs.teacher_id) as any).full_name }
                    : null,
                room: cs.room_id && roomsMap.has(cs.room_id)
                    ? { id: cs.room_id, room_number: (roomsMap.get(cs.room_id) as any).room_number }
                    : null,
            })) as ClassSubject[];

            // Sort by subject name (can't order by nested relation in Supabase)
            enriched.sort((a, b) => {
                const nameA = a.subject?.name || '';
                const nameB = b.subject?.name || '';
                return nameA.localeCompare(nameB);
            });

            return enriched;
        },
        enabled: !!user && !!profile && !!classAcademicYearId,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

// Hook to fetch class subjects for multiple class academic years
export const useClassSubjectsForMultipleClasses = (classAcademicYearIds: string[], organizationId?: string) => {
    const { user, profile } = useAuth();

    return useQuery({
        queryKey: ['class-subjects-multiple', classAcademicYearIds.sort().join(','), organizationId || profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile || classAcademicYearIds.length === 0) return [];

            let query = (supabase as any)
                .from('class_subjects')
                .select(`
          *,
          subject:subjects(*),
          class_academic_year:class_academic_years(
            id,
            class_id,
            academic_year_id,
            section_name,
            class:classes(id, name, code),
            academic_year:academic_years(id, name, start_date, end_date)
          )
        `)
                .in('class_academic_year_id', classAcademicYearIds);

            // Super admin can see all or filter by org
            const isSuperAdmin = profile.role === 'super_admin';

            if (!isSuperAdmin) {
                // Regular users see only their organization's class subjects
                const userOrgId = organizationId || profile.organization_id;
                if (userOrgId) {
                    query = query.eq('organization_id', userOrgId);
                } else {
                    return [];
                }
            } else if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }

            const { data, error } = await query
                .is('deleted_at', null);

            if (error) {
                throw new Error(error.message);
            }

            // Enrich with teacher and room data
            let classSubjects = (data || []) as ClassSubject[];

            const teacherIds = [...new Set(classSubjects.map(cs => cs.teacher_id).filter(Boolean))] as string[];
            const roomIds = [...new Set(classSubjects.map(cs => cs.room_id).filter(Boolean))] as string[];

            let teachersMap = new Map();
            if (teacherIds.length > 0) {
                const { data: teachersData } = await (supabase as any)
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', teacherIds);
                teachersMap = new Map((teachersData || []).map((t: any) => [t.id, t]));
            }

            let roomsMap = new Map();
            if (roomIds.length > 0) {
                const { data: roomsData } = await (supabase as any)
                    .from('rooms')
                    .select('id, room_number')
                    .in('id', roomIds);
                roomsMap = new Map((roomsData || []).map((r: any) => [r.id, r]));
            }

            const enriched = classSubjects.map(cs => ({
                ...cs,
                teacher: cs.teacher_id && teachersMap.has(cs.teacher_id)
                    ? { id: cs.teacher_id, full_name: (teachersMap.get(cs.teacher_id) as any).full_name }
                    : null,
                room: cs.room_id && roomsMap.has(cs.room_id)
                    ? { id: cs.room_id, room_number: (roomsMap.get(cs.room_id) as any).room_number }
                    : null,
            })) as ClassSubject[];

            // Sort by subject name
            enriched.sort((a, b) => {
                const nameA = a.subject?.name || '';
                const nameB = b.subject?.name || '';
                return nameA.localeCompare(nameB);
            });

            return enriched;
        },
        enabled: !!user && !!profile && classAcademicYearIds.length > 0,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useSubjectHistory = (subjectId: string) => {
    const { user, profile } = useAuth();

    return useQuery({
        queryKey: ['subject-history', subjectId],
        queryFn: async () => {
            if (!user || !profile || !subjectId) return [];

            const { data, error } = await (supabase as any)
                .from('class_subjects')
                .select(`
          *,
          class_academic_year:class_academic_years(
            id,
            class_id,
            academic_year_id,
            section_name,
            class:classes(id, name, code),
            academic_year:academic_years(id, name, start_date, end_date, is_current)
          )
        `)
                .eq('subject_id', subjectId)
                .is('deleted_at', null);

            if (error) {
                throw new Error(error.message);
            }

            const assignments = (data || []) as ClassSubject[];

            // Sort by academic year start_date (descending - most recent first)
            return assignments.sort((a, b) => {
                const dateA = a.class_academic_year?.academic_year?.start_date
                    ? new Date(a.class_academic_year.academic_year.start_date).getTime()
                    : 0;
                const dateB = b.class_academic_year?.academic_year?.start_date
                    ? new Date(b.class_academic_year.academic_year.start_date).getTime()
                    : 0;
                return dateB - dateA;
            });
        },
        enabled: !!user && !!profile && !!subjectId,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useCreateSubject = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (subjectData: {
            name: string;
            code: string;
            description?: string | null;
            is_active?: boolean;
            organization_id?: string | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get organization_id - use provided or user's org
            let organizationId = subjectData.organization_id;
            if (organizationId === undefined) {
                if (profile.role === 'super_admin') {
                    organizationId = null; // Default to global
                } else if (profile.organization_id) {
                    organizationId = profile.organization_id;
                } else {
                    throw new Error('User must be assigned to an organization');
                }
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot create subject for different organization');
            }

            // Validation
            if (subjectData.name.length > 100) {
                throw new Error('Name must be 100 characters or less');
            }
            if (subjectData.code.length > 50) {
                throw new Error('Code must be 50 characters or less');
            }

            // Trim whitespace
            const trimmedName = subjectData.name.trim();
            const trimmedCode = subjectData.code.trim().toUpperCase();

            if (!trimmedName) throw new Error('Name cannot be empty');
            if (!trimmedCode) throw new Error('Code cannot be empty');

            // Check for duplicates
            const { data: existing } = await (supabase as any)
                .from('subjects')
                .select('id')
                .eq('code', trimmedCode)
                .eq('organization_id', organizationId)
                .is('deleted_at', null)
                .maybeSingle();

            if (existing) {
                throw new Error('A subject with this code already exists for this organization');
            }

            const { data, error } = await (supabase as any)
                .from('subjects')
                .insert({
                    name: trimmedName,
                    code: trimmedCode,
                    description: subjectData.description || null,
                    is_active: subjectData.is_active !== undefined ? subjectData.is_active : true,
                    organization_id: organizationId,
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            toast.success('Subject created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create subject');
        },
    });
};

export const useUpdateSubject = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Subject> & { id: string }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get current subject to check organization
            const { data: currentSubject } = await (supabase as any)
                .from('subjects')
                .select('organization_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentSubject) {
                throw new Error('Subject not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentSubject.organization_id !== profile.organization_id && currentSubject.organization_id !== null) {
                throw new Error('Cannot update subject from different organization');
            }

            // Prevent organization_id changes (unless super admin)
            if (updates.organization_id !== undefined && profile.role !== 'super_admin') {
                throw new Error('Cannot change organization_id');
            }

            // Validation
            if (updates.name && updates.name.length > 100) {
                throw new Error('Name must be 100 characters or less');
            }
            if (updates.code && updates.code.length > 50) {
                throw new Error('Code must be 50 characters or less');
            }

            // Trim whitespace
            const updateData = { ...updates };
            if (updateData.name) {
                const trimmedName = updateData.name.trim();
                if (!trimmedName) throw new Error('Name cannot be empty');
                updateData.name = trimmedName;
            }
            if (updateData.code) {
                const trimmedCode = updateData.code.trim().toUpperCase();
                if (!trimmedCode) throw new Error('Code cannot be empty');
                updateData.code = trimmedCode;
            }

            // Check for duplicates
            if (updateData.code) {
                const organizationId = updateData.organization_id !== undefined
                    ? updateData.organization_id
                    : currentSubject.organization_id;

                const { data: existing } = await (supabase as any)
                    .from('subjects')
                    .select('id')
                    .eq('code', updateData.code)
                    .eq('organization_id', organizationId)
                    .neq('id', id)
                    .is('deleted_at', null)
                    .maybeSingle();

                if (existing) {
                    throw new Error('A subject with this code already exists for this organization');
                }
            }

            const { data, error } = await (supabase as any)
                .from('subjects')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            toast.success('Subject updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update subject');
        },
    });
};

export const useDeleteSubject = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get current subject to check organization
            const { data: currentSubject } = await (supabase as any)
                .from('subjects')
                .select('organization_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentSubject) {
                throw new Error('Subject not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentSubject.organization_id !== profile.organization_id && currentSubject.organization_id !== null) {
                throw new Error('Cannot delete subject from different organization');
            }

            // Check if subject is in use (has active class_subjects)
            const { data: activeAssignments } = await (supabase as any)
                .from('class_subjects')
                .select('id')
                .eq('subject_id', id)
                .is('deleted_at', null)
                .limit(1);

            if (activeAssignments && activeAssignments.length > 0) {
                throw new Error('Cannot delete subject that is assigned to classes. Please remove all assignments first.');
            }

            // Soft delete
            const { error } = await (supabase as any)
                .from('subjects')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            toast.success('Subject deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete subject');
        },
    });
};

export const useAssignSubjectToClass = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (assignmentData: {
            class_academic_year_id: string;
            subject_id: string;
            room_id?: string | null;
            notes?: string | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get class_academic_year to determine organization_id and room_id
            const { data: classYearData } = await (supabase as any)
                .from('class_academic_years')
                .select('organization_id, room_id')
                .eq('id', assignmentData.class_academic_year_id)
                .is('deleted_at', null)
                .single();

            if (!classYearData) {
                throw new Error('Class instance not found');
            }

            // Auto-fetch room from class_academic_year if not provided
            const roomId = assignmentData.room_id || classYearData.room_id || null;

            // Get subject to verify organization_id matches
            const { data: subjectData } = await (supabase as any)
                .from('subjects')
                .select('organization_id')
                .eq('id', assignmentData.subject_id)
                .is('deleted_at', null)
                .single();

            if (!subjectData) {
                throw new Error('Subject not found');
            }

            // Determine organization_id (prefer class_academic_year's)
            const organizationId = classYearData.organization_id;

            // Validate organization access
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot assign subject to class from different organization');
            }

            // Check for duplicate (same subject in same class_academic_year)
            const { data: existing } = await (supabase as any)
                .from('class_subjects')
                .select('id')
                .eq('class_academic_year_id', assignmentData.class_academic_year_id)
                .eq('subject_id', assignmentData.subject_id)
                .is('deleted_at', null)
                .maybeSingle();

            if (existing) {
                throw new Error('This subject is already assigned to this class');
            }

            const { data, error } = await (supabase as any)
                .from('class_subjects')
                .insert({
                    class_academic_year_id: assignmentData.class_academic_year_id,
                    subject_id: assignmentData.subject_id,
                    organization_id: organizationId,
                    teacher_id: null, // Teacher assignment will be handled separately
                    room_id: roomId, // Use provided room or class's room
                    notes: assignmentData.notes || null,
                    is_active: true,
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            toast.success('Subject assigned to class successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to assign subject to class');
        },
    });
};

export const useUpdateClassSubject = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ClassSubject> & { id: string }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get current assignment to check organization
            const { data: currentAssignment } = await (supabase as any)
                .from('class_subjects')
                .select('organization_id, class_academic_year_id, subject_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentAssignment) {
                throw new Error('Subject assignment not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentAssignment.organization_id !== profile.organization_id && currentAssignment.organization_id !== null) {
                throw new Error('Cannot update subject assignment from different organization');
            }

            // Check for duplicate if subject_id is being changed
            if (updates.subject_id !== undefined && updates.subject_id !== currentAssignment.subject_id) {
                const { data: existing } = await (supabase as any)
                    .from('class_subjects')
                    .select('id')
                    .eq('class_academic_year_id', currentAssignment.class_academic_year_id)
                    .eq('subject_id', updates.subject_id)
                    .neq('id', id)
                    .is('deleted_at', null)
                    .maybeSingle();

                if (existing) {
                    throw new Error('This subject is already assigned to this class');
                }
            }

            const { data, error } = await (supabase as any)
                .from('class_subjects')
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
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subject-history'] });
            toast.success('Subject assignment updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update subject assignment');
        },
    });
};

export const useRemoveSubjectFromClass = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get current assignment to check organization
            const { data: currentAssignment } = await (supabase as any)
                .from('class_subjects')
                .select('organization_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentAssignment) {
                throw new Error('Subject assignment not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentAssignment.organization_id !== profile.organization_id && currentAssignment.organization_id !== null) {
                throw new Error('Cannot remove subject assignment from different organization');
            }

            // Soft delete
            const { error } = await (supabase as any)
                .from('class_subjects')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subject-history'] });
            toast.success('Subject removed from class successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to remove subject from class');
        },
    });
};

export const useBulkAssignSubjects = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (bulkData: {
            class_academic_year_id: string;
            subject_ids: string[]; // Array of subject IDs
            default_room_id?: string | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get class_academic_year to determine organization_id and room_id
            const { data: classYearData } = await (supabase as any)
                .from('class_academic_years')
                .select('organization_id, room_id')
                .eq('id', bulkData.class_academic_year_id)
                .is('deleted_at', null)
                .single();

            if (!classYearData) {
                throw new Error('Class instance not found');
            }

            const organizationId = classYearData.organization_id;
            // Auto-fetch room from class_academic_year if not provided
            const roomId = bulkData.default_room_id || classYearData.room_id || null;

            // Validate organization access
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot assign subjects to class from different organization');
            }

            // Check for existing assignments
            const { data: existingAssignments } = await (supabase as any)
                .from('class_subjects')
                .select('subject_id')
                .eq('class_academic_year_id', bulkData.class_academic_year_id)
                .is('deleted_at', null);

            const existingSubjectIds = new Set(
                (existingAssignments || []).map((a: any) => a.subject_id)
            );

            // Filter out subjects that are already assigned
            const newSubjectIds = bulkData.subject_ids.filter(
                subjectId => !existingSubjectIds.has(subjectId)
            );

            if (newSubjectIds.length === 0) {
                throw new Error('All specified subjects are already assigned to this class');
            }

            // Prepare bulk insert data
            const insertData = newSubjectIds.map(subjectId => ({
                class_academic_year_id: bulkData.class_academic_year_id,
                subject_id: subjectId,
                organization_id: organizationId,
                teacher_id: null, // Teacher assignment will be handled separately
                room_id: roomId, // Use provided room or class's room
                is_active: true,
            }));

            // Bulk insert
            const { data, error } = await (supabase as any)
                .from('class_subjects')
                .insert(insertData)
                .select();

            if (error) {
                throw new Error(error.message);
            }

            return {
                created: data,
                skipped: bulkData.subject_ids.length - newSubjectIds.length,
            };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            toast.success(`Successfully assigned ${result.created.length} subject(s). ${result.skipped > 0 ? `${result.skipped} subject(s) were already assigned.` : ''}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to assign subjects');
        },
    });
};

export const useCopySubjectsBetweenYears = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (copyData: {
            from_class_academic_year_id: string;
            to_class_academic_year_id: string;
            copy_assignments?: boolean; // Copy teachers and rooms
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get all subject assignments to copy
            const { data: sourceAssignments, error: fetchError } = await (supabase as any)
                .from('class_subjects')
                .select('*')
                .eq('class_academic_year_id', copyData.from_class_academic_year_id)
                .is('deleted_at', null);

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            if (!sourceAssignments || sourceAssignments.length === 0) {
                throw new Error('No subject assignments found to copy');
            }

            // Get target class_academic_year to determine organization_id
            const { data: targetClassYear } = await (supabase as any)
                .from('class_academic_years')
                .select('organization_id')
                .eq('id', copyData.to_class_academic_year_id)
                .is('deleted_at', null)
                .single();

            if (!targetClassYear) {
                throw new Error('Target class instance not found');
            }

            // Prepare new assignments
            const newAssignments = sourceAssignments.map((assignment: ClassSubject) => {
                const newAssignment: any = {
                    class_academic_year_id: copyData.to_class_academic_year_id,
                    subject_id: assignment.subject_id,
                    organization_id: targetClassYear.organization_id,
                    weekly_hours: assignment.weekly_hours,
                    notes: assignment.notes,
                    is_active: true,
                };

                // Copy assignments if requested
                if (copyData.copy_assignments) {
                    newAssignment.teacher_id = assignment.teacher_id;
                    newAssignment.room_id = assignment.room_id;
                }

                return newAssignment;
            });

            // Check for duplicates before inserting
            const { data: existingAssignments } = await (supabase as any)
                .from('class_subjects')
                .select('subject_id')
                .eq('class_academic_year_id', copyData.to_class_academic_year_id)
                .is('deleted_at', null);

            const existingSubjectIds = new Set(
                (existingAssignments || []).map((a: any) => a.subject_id)
            );

            // Filter out duplicates
            const assignmentsToInsert = newAssignments.filter(
                (a: any) => !existingSubjectIds.has(a.subject_id)
            );

            if (assignmentsToInsert.length === 0) {
                throw new Error('All subjects are already assigned to the target class');
            }

            // Insert all new assignments
            const { data, error } = await (supabase as any)
                .from('class_subjects')
                .insert(assignmentsToInsert)
                .select();

            if (error) {
                throw new Error(error.message);
            }

            return {
                created: data,
                skipped: newAssignments.length - assignmentsToInsert.length,
            };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subject-history'] });
            toast.success(`Successfully copied ${result.created.length} subject assignment(s). ${result.skipped > 0 ? `${result.skipped} subject(s) were already assigned.` : ''}`);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to copy subjects between academic years');
        },
    });
};

// ============================================================================
// Class Subject Templates (Subjects assigned to Classes)
// ============================================================================

export const useClassSubjectTemplates = (classId?: string, organizationId?: string) => {
    const { user, profile } = useAuth();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

    return useQuery({
        queryKey: ['class-subject-templates', classId, organizationId, orgIds.join(',')],
        queryFn: async () => {
            if (!user || !profile || orgsLoading) return [];

            let query = (supabase as any)
                .from('class_subject_templates')
                .select(`
                    *,
                    subject:subjects(*),
                    class:classes(id, name, code)
                `)
                .is('deleted_at', null);

            // Filter by class_id if provided
            if (classId) {
                query = query.eq('class_id', classId);
            }

            const resolvedOrgIds = organizationId ? [organizationId] : orgIds;
            if (resolvedOrgIds.length === 0) {
                return [];
            }
            query = query.in('organization_id', resolvedOrgIds);

            const { data, error } = await query;

            if (error) {
                throw new Error(error.message);
            }

            // Sort by subject name (can't order by nested relation in Supabase)
            const templates = (data || []) as ClassSubjectTemplate[];
            templates.sort((a, b) => {
                const nameA = a.subject?.name || '';
                const nameB = b.subject?.name || '';
                return nameA.localeCompare(nameB);
            });

            return templates;
        },
        enabled: !!user && !!profile && (classId !== undefined || organizationId !== undefined),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useAssignSubjectToClassTemplate = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (assignmentData: {
            class_id: string;
            subject_id: string;
            notes?: string | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get class to determine organization_id
            const { data: classData } = await (supabase as any)
                .from('classes')
                .select('organization_id')
                .eq('id', assignmentData.class_id)
                .is('deleted_at', null)
                .single();

            if (!classData) {
                throw new Error('Class not found');
            }

            // Get subject to verify organization_id matches
            const { data: subjectData } = await (supabase as any)
                .from('subjects')
                .select('organization_id')
                .eq('id', assignmentData.subject_id)
                .is('deleted_at', null)
                .single();

            if (!subjectData) {
                throw new Error('Subject not found');
            }

            // Determine organization_id (prefer class's)
            const organizationId = classData.organization_id;

            // Validate organization access
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot assign subject to class from different organization');
            }

            // Check for duplicate (same subject in same class)
            const { data: existing } = await (supabase as any)
                .from('class_subject_templates')
                .select('id')
                .eq('class_id', assignmentData.class_id)
                .eq('subject_id', assignmentData.subject_id)
                .is('deleted_at', null)
                .maybeSingle();

            if (existing) {
                throw new Error('This subject is already assigned to this class');
            }

            const { data, error } = await (supabase as any)
                .from('class_subject_templates')
                .insert({
                    class_id: assignmentData.class_id,
                    subject_id: assignmentData.subject_id,
                    organization_id: organizationId,
                    notes: assignmentData.notes || null,
                    is_active: true,
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subject-templates'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            toast.success('Subject assigned to class successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to assign subject to class');
        },
    });
};

export const useRemoveSubjectFromClassTemplate = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (templateId: string) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get template to check organization
            const { data: template } = await (supabase as any)
                .from('class_subject_templates')
                .select('organization_id')
                .eq('id', templateId)
                .is('deleted_at', null)
                .single();

            if (!template) {
                throw new Error('Subject assignment not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && template.organization_id !== profile.organization_id && template.organization_id !== null) {
                throw new Error('Cannot remove subject assignment from different organization');
            }

            // Soft delete
            const { error } = await (supabase as any)
                .from('class_subject_templates')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', templateId);

            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subject-templates'] });
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            toast.success('Subject removed from class successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to remove subject from class');
        },
    });
};

export const useBulkAssignSubjectsToClassTemplate = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (bulkData: {
            class_id: string;
            subject_ids: string[];
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get class to determine organization_id
            const { data: classData } = await (supabase as any)
                .from('classes')
                .select('organization_id')
                .eq('id', bulkData.class_id)
                .is('deleted_at', null)
                .single();

            if (!classData) {
                throw new Error('Class not found');
            }

            const organizationId = classData.organization_id;

            // Validate organization access
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot assign subjects to class from different organization');
            }

            // Check for existing assignments
            const { data: existing } = await (supabase as any)
                .from('class_subject_templates')
                .select('subject_id')
                .eq('class_id', bulkData.class_id)
                .in('subject_id', bulkData.subject_ids)
                .is('deleted_at', null);

            const existingSubjectIds = new Set((existing || []).map((e: any) => e.subject_id));

            // Filter out duplicates
            const subjectIdsToInsert = bulkData.subject_ids.filter(id => !existingSubjectIds.has(id));

            if (subjectIdsToInsert.length === 0) {
                throw new Error('All selected subjects are already assigned to this class');
            }

            // Prepare insert data
            const assignmentsToInsert = subjectIdsToInsert.map(subject_id => ({
                class_id: bulkData.class_id,
                subject_id,
                organization_id: organizationId,
                is_active: true,
            }));

            const { data, error } = await (supabase as any)
                .from('class_subject_templates')
                .insert(assignmentsToInsert)
                .select();

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subject-templates'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            toast.success('Subjects assigned to class successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to assign subjects to class');
        },
    });
};

