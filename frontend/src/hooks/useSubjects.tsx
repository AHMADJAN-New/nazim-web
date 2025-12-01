import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { academicYearsApi, subjectsApi } from '@/lib/api/client';
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

            // Use Laravel API
            const params: { organization_id?: string } = {};
            if (organizationId) {
                params.organization_id = organizationId;
            }

            const data = await subjectsApi.list(params);
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
            class:classes(id, name, code)
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

            // Fetch academic years separately via Laravel API
            const academicYearIds = [...new Set(classSubjects.map(cs => cs.class_academic_year?.academic_year_id).filter(Boolean))] as string[];
            const academicYearsMap: Record<string, { id: string; name: string; start_date: string; end_date: string }> = {};
            if (academicYearIds.length > 0) {
                const academicYearsPromises = academicYearIds.map(id => academicYearsApi.get(id).catch(() => null));
                const academicYearsResults = await Promise.all(academicYearsPromises);

                academicYearsResults.forEach((academicYear: any) => {
                    if (academicYear && academicYear.id) {
                        academicYearsMap[academicYear.id] = {
                            id: academicYear.id,
                            name: academicYear.name,
                            start_date: academicYear.start_date,
                            end_date: academicYear.end_date,
                        };
                    }
                });
            }

            // Merge academic year data into class_academic_year
            classSubjects = classSubjects.map(cs => ({
                ...cs,
                class_academic_year: cs.class_academic_year ? {
                    ...cs.class_academic_year,
                    academic_year: cs.class_academic_year.academic_year_id ? academicYearsMap[cs.class_academic_year.academic_year_id] || null : null,
                } : undefined,
            })) as ClassSubject[];

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
            class:classes(id, name, code)
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

            // Fetch academic years separately via Laravel API
            const academicYearIds = [...new Set(classSubjects.map(cs => cs.class_academic_year?.academic_year_id).filter(Boolean))] as string[];
            const academicYearsMap: Record<string, { id: string; name: string; start_date: string; end_date: string }> = {};
            if (academicYearIds.length > 0) {
                const academicYearsPromises = academicYearIds.map(id => academicYearsApi.get(id).catch(() => null));
                const academicYearsResults = await Promise.all(academicYearsPromises);

                academicYearsResults.forEach((academicYear: any) => {
                    if (academicYear && academicYear.id) {
                        academicYearsMap[academicYear.id] = {
                            id: academicYear.id,
                            name: academicYear.name,
                            start_date: academicYear.start_date,
                            end_date: academicYear.end_date,
                        };
                    }
                });
            }

            // Merge academic year data into class_academic_year
            classSubjects = classSubjects.map(cs => ({
                ...cs,
                class_academic_year: cs.class_academic_year ? {
                    ...cs.class_academic_year,
                    academic_year: cs.class_academic_year.academic_year_id ? academicYearsMap[cs.class_academic_year.academic_year_id] || null : null,
                } : undefined,
            })) as ClassSubject[];

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
            class:classes(id, name, code)
          )
        `)
                .eq('subject_id', subjectId)
                .is('deleted_at', null);

            if (error) {
                throw new Error(error.message);
            }

            let assignments = (data || []) as ClassSubject[];

            // Fetch academic years separately via Laravel API
            const academicYearIds = [...new Set(assignments.map(a => a.class_academic_year?.academic_year_id).filter(Boolean))] as string[];
            const academicYearsMap: Record<string, { id: string; name: string; start_date: string; end_date: string; is_current: boolean }> = {};
            if (academicYearIds.length > 0) {
                const academicYearsPromises = academicYearIds.map(id => academicYearsApi.get(id).catch(() => null));
                const academicYearsResults = await Promise.all(academicYearsPromises);

                academicYearsResults.forEach((academicYear: any) => {
                    if (academicYear && academicYear.id) {
                        academicYearsMap[academicYear.id] = {
                            id: academicYear.id,
                            name: academicYear.name,
                            start_date: academicYear.start_date,
                            end_date: academicYear.end_date,
                            is_current: academicYear.is_current || false,
                        };
                    }
                });
            }

            // Merge academic year data into class_academic_year
            assignments = assignments.map(a => ({
                ...a,
                class_academic_year: a.class_academic_year ? {
                    ...a.class_academic_year,
                    academic_year: a.class_academic_year.academic_year_id ? academicYearsMap[a.class_academic_year.academic_year_id] || null : null,
                } : undefined,
            })) as ClassSubject[];

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

            // Use Laravel API
            const data = await subjectsApi.create({
                name: subjectData.name.trim(),
                code: subjectData.code.trim().toUpperCase(),
                description: subjectData.description || null,
                is_active: subjectData.is_active !== undefined ? subjectData.is_active : true,
                organization_id: organizationId,
            });

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
            const currentSubject = await subjectsApi.get(id);

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

            // Prepare update data
            const updateData: {
                name?: string;
                code?: string;
                description?: string | null;
                is_active?: boolean;
                organization_id?: string | null;
            } = {};

            if (updates.name !== undefined) {
                const trimmedName = updates.name.trim();
                if (!trimmedName) throw new Error('Name cannot be empty');
                updateData.name = trimmedName;
            }
            if (updates.code !== undefined) {
                const trimmedCode = updates.code.trim().toUpperCase();
                if (!trimmedCode) throw new Error('Code cannot be empty');
                updateData.code = trimmedCode;
            }
            if (updates.description !== undefined) {
                updateData.description = updates.description;
            }
            if (updates.is_active !== undefined) {
                updateData.is_active = updates.is_active;
            }
            if (updates.organization_id !== undefined && profile.role === 'super_admin') {
                updateData.organization_id = updates.organization_id;
            }

            // Use Laravel API
            const data = await subjectsApi.update(id, updateData);

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
            const currentSubject = await subjectsApi.get(id);

            if (!currentSubject) {
                throw new Error('Subject not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentSubject.organization_id !== profile.organization_id && currentSubject.organization_id !== null) {
                throw new Error('Cannot delete subject from different organization');
            }

            // Use Laravel API (Laravel will handle soft delete and validation)
            await subjectsApi.delete(id);
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

// TODO: Migrate to Laravel API - class_subject_templates not yet migrated
export const useClassSubjectTemplates = (classId?: string, organizationId?: string) => {
    const { user, profile } = useAuth();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

    return useQuery({
        queryKey: ['class-subject-templates', classId, organizationId, orgIds.join(',')],
        queryFn: async () => {
            // Temporarily disabled - class_subject_templates not yet migrated to Laravel
            // Return empty array to prevent Supabase errors
            return [] as ClassSubjectTemplate[];
        },
        enabled: false, // Disabled until migrated
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

// TODO: Migrate to Laravel API - class_subject_templates not yet migrated
export const useAssignSubjectToClassTemplate = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (assignmentData: {
            class_id: string;
            subject_id: string;
            notes?: string | null;
        }) => {
            throw new Error('Class subject templates not yet migrated to Laravel API');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subject-templates'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to assign subject to class');
        },
    });
};

// TODO: Migrate to Laravel API - class_subject_templates not yet migrated
export const useRemoveSubjectFromClassTemplate = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (templateId: string) => {
            throw new Error('Class subject templates not yet migrated to Laravel API');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subject-templates'] });
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to remove subject from class');
        },
    });
};

// TODO: Migrate to Laravel API - class_subject_templates not yet migrated
export const useBulkAssignSubjectsToClassTemplate = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (bulkData: {
            class_id: string;
            subject_ids: string[];
        }) => {
            throw new Error('Class subject templates not yet migrated to Laravel API');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subject-templates'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to assign subjects to class');
        },
    });
};

