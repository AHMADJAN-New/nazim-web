import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/lib/toast';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { academicYearsApi, subjectsApi, classSubjectsApi, classSubjectTemplatesApi, classAcademicYearsApi } from '@/lib/api/client';
import type * as SubjectApi from '@/types/api/subject';
import type { Subject, ClassSubject, ClassSubjectTemplate } from '@/types/domain/subject';
import { 
    mapSubjectApiToDomain, 
    mapSubjectDomainToInsert, 
    mapSubjectDomainToUpdate,
    mapClassSubjectApiToDomain,
    mapClassSubjectDomainToInsert,
    mapClassSubjectDomainToUpdate,
    mapClassSubjectTemplateApiToDomain,
    mapClassSubjectTemplateDomainToInsert,
    mapClassSubjectTemplateDomainToUpdate,
} from '@/mappers/subjectMapper';
import type { PaginatedResponse, PaginationMeta } from '@/types/pagination';
import { usePagination } from './usePagination';
import { useEffect } from 'react';

// Re-export domain types for convenience
export type { Subject, ClassSubject, ClassSubjectTemplate } from '@/types/domain/subject';

export const useSubjects = (organizationId?: string, usePaginated?: boolean) => {
    const { user, profile } = useAuth();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();
    const { page, pageSize, setPage, setPageSize, updateFromMeta, paginationState } = usePagination({
        initialPage: 1,
        initialPageSize: 25,
    });

    const { data, isLoading, error } = useQuery<Subject[] | PaginatedResponse<SubjectApi.Subject>>({
        queryKey: [
            'subjects',
            organizationId || profile?.organization_id,
            orgIds.join(','),
            profile?.default_school_id ?? null,
            usePaginated ? page : undefined,
            usePaginated ? pageSize : undefined,
        ],
        queryFn: async () => {
            if (!user || !profile || orgsLoading) return [];

            // Use Laravel API
            const params: { organization_id?: string; page?: number; per_page?: number } = {};
            if (organizationId) {
                params.organization_id = organizationId;
            }

            // Add pagination params if using pagination
            if (usePaginated) {
                params.page = page;
                params.per_page = pageSize;
            }

            const apiSubjects = await subjectsApi.list(params);

            // Check if response is paginated (Laravel returns meta fields directly, not nested)
            if (usePaginated && apiSubjects && typeof apiSubjects === 'object' && 'data' in apiSubjects && 'current_page' in apiSubjects) {
                // Laravel's paginated response has data and meta fields at the same level
                const paginatedResponse = apiSubjects as any;
                // Map API models to domain models
                const subjects = (paginatedResponse.data as SubjectApi.Subject[]).map(mapSubjectApiToDomain);
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
                return { data: subjects, meta } as PaginatedResponse<SubjectApi.Subject>;
            }

            // Map API models to domain models (non-paginated)
            return (apiSubjects as SubjectApi.Subject[]).map(mapSubjectApiToDomain);
        },
        enabled: !!user && !!profile && !!profile.default_school_id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });

    // Update pagination state from API response
    useEffect(() => {
        if (usePaginated && data && typeof data === 'object' && 'meta' in data) {
            updateFromMeta((data as PaginatedResponse<SubjectApi.Subject>).meta);
        }
    }, [data, usePaginated, updateFromMeta]);

    // Return appropriate format based on pagination mode
    if (usePaginated) {
        const paginatedData = data as PaginatedResponse<SubjectApi.Subject> | undefined;
        return {
            subjects: paginatedData?.data || [],
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
        data: data as Subject[] | undefined,
        isLoading,
        error,
    };
};

export const useClassSubjects = (classAcademicYearId?: string, organizationId?: string) => {
    const { user, profile } = useAuth();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

    return useQuery<ClassSubject[]>({
        queryKey: ['class-subjects', classAcademicYearId, organizationId || profile?.organization_id, orgIds.join(','), profile?.default_school_id ?? null],
        queryFn: async () => {
            if (!user || !profile || !classAcademicYearId || orgsLoading) return [];

            // Use Laravel API
            const params: { class_academic_year_id: string; organization_id?: string } = {
                class_academic_year_id: classAcademicYearId,
            };

            const resolvedOrgIds = organizationId ? [organizationId] : orgIds;
            if (resolvedOrgIds.length === 0) {
                return [];
            }
            // If multiple orgs, we'll need to fetch for each, but for now use first
            if (resolvedOrgIds.length > 0) {
                params.organization_id = resolvedOrgIds[0];
            }

            const apiClassSubjects = await classSubjectsApi.list(params);
            
            // Map API models to domain models
            const classSubjects = (apiClassSubjects as SubjectApi.ClassSubject[]).map(mapClassSubjectApiToDomain);

            // Sort by subject name
            classSubjects.sort((a, b) => {
                const nameA = a.subject?.name || '';
                const nameB = b.subject?.name || '';
                return nameA.localeCompare(nameB);
            });

            return classSubjects;
        },
        enabled: !!user && !!profile && !!profile.default_school_id && !!classAcademicYearId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
};

// Hook to fetch class subjects for multiple class academic years
export const useClassSubjectsForMultipleClasses = (classAcademicYearIds: string[], organizationId?: string) => {
    const { user, profile } = useAuth();

    return useQuery<ClassSubject[]>({
        queryKey: ['class-subjects-multiple', classAcademicYearIds.sort().join(','), organizationId || profile?.organization_id],
        queryFn: async () => {
            if (!user || !profile || classAcademicYearIds.length === 0) return [];

            // Fetch class subjects for each class academic year
            const allClassSubjects: ClassSubject[] = [];
            
            for (const classAcademicYearId of classAcademicYearIds) {
                const params: { class_academic_year_id: string; organization_id?: string } = {
                    class_academic_year_id: classAcademicYearId,
                };

                // All users filter by org
                const userOrgId = organizationId || profile.organization_id;
                if (userOrgId) {
                    params.organization_id = userOrgId;
                } else {
                    continue; // Skip if no org ID
                }

                try {
                    const apiClassSubjects = await classSubjectsApi.list(params);
                    const classSubjects = (apiClassSubjects as SubjectApi.ClassSubject[]).map(mapClassSubjectApiToDomain);
                    allClassSubjects.push(...classSubjects);
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error(`[useClassSubjectsForMultipleClasses] Error fetching for class academic year ${classAcademicYearId}:`, error);
                    }
                }
            }

            // Sort by subject name
            allClassSubjects.sort((a, b) => {
                const nameA = a.subject?.name || '';
                const nameB = b.subject?.name || '';
                return nameA.localeCompare(nameB);
            });

            return allClassSubjects;
        },
        enabled: !!user && !!profile && classAcademicYearIds.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
};

export const useSubjectHistory = (subjectId: string) => {
    const { user, profile } = useAuth();

    return useQuery<ClassSubject[]>({
        queryKey: ['subject-history', subjectId],
        queryFn: async () => {
            if (!user || !profile || !subjectId) return [];

            // Use Laravel API
            const apiClassSubjects = await classSubjectsApi.list({ subject_id: subjectId });
            
            // Map API models to domain models
            const assignments = (apiClassSubjects as SubjectApi.ClassSubject[]).map(mapClassSubjectApiToDomain);

            // Sort by academic year start_date (descending - most recent first)
            return assignments.sort((a, b) => {
                const dateA = a.classAcademicYear?.academicYear?.startDate
                    ? a.classAcademicYear.academicYear.startDate.getTime()
                    : 0;
                const dateB = b.classAcademicYear?.academicYear?.startDate
                    ? b.classAcademicYear.academicYear.startDate.getTime()
                    : 0;
                return dateB - dateA;
            });
        },
        enabled: !!user && !!profile && !!subjectId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
};

export const useCreateSubject = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (subjectData: Partial<Subject>) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get organization_id - use provided or user's org
            let organizationId = subjectData.organizationId;
            if (organizationId === undefined) {
                if (profile.organization_id) {
                    organizationId = profile.organization_id;
                } else {
                    throw new Error('User must be assigned to an organization');
                }
            }

            // Validate organization access (all users)
            if (organizationId !== profile.organization_id) {
                throw new Error('Cannot create subject for different organization');
            }

            // Convert domain model to API insert payload
            const insertData = mapSubjectDomainToInsert({
                ...subjectData,
                name: subjectData.name?.trim() || '',
                code: subjectData.code?.trim().toUpperCase() || '',
                organizationId,
            });

            // Use Laravel API
            const apiSubject = await subjectsApi.create(insertData);
            // Map API response back to domain model
            return mapSubjectApiToDomain(apiSubject as SubjectApi.Subject);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            showToast.success('toast.subjectCreated');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectCreateFailed');
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
            const currentSubjectApi = await subjectsApi.get(id);
            const currentSubject = mapSubjectApiToDomain(currentSubjectApi as SubjectApi.Subject);

            if (!currentSubject) {
                throw new Error('Subject not found');
            }

            // Validate organization access (all users)
            if (currentSubject.organizationId !== profile.organization_id && currentSubject.organizationId !== null) {
                throw new Error('Cannot update subject from different organization');
            }

            // Prevent organizationId changes (all users)
            if (updates.organizationId !== undefined) {
                throw new Error('Cannot change organizationId');
            }

            // Prepare update data with trimmed values
            const updateData: Partial<Subject> = {};

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
            if (updates.isActive !== undefined) {
                updateData.isActive = updates.isActive;
            }
            // organizationId cannot be changed

            // Convert domain model to API update payload
            const apiUpdateData = mapSubjectDomainToUpdate(updateData);

            // Use Laravel API
            const apiSubject = await subjectsApi.update(id, apiUpdateData);
            // Map API response back to domain model
            return mapSubjectApiToDomain(apiSubject as SubjectApi.Subject);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            showToast.success('toast.subjectUpdated');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectUpdateFailed');
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

            // Validate organization access (all users)
            if (currentSubject.organization_id !== profile.organization_id && currentSubject.organization_id !== null) {
                throw new Error('Cannot delete subject from different organization');
            }

            // Use Laravel API (Laravel will handle soft delete and validation)
            await subjectsApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            showToast.success('toast.subjectDeleted');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectDeleteFailed');
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
            const classYearData = await classAcademicYearsApi.get(assignmentData.class_academic_year_id);

            if (!classYearData) {
                throw new Error('Class instance not found');
            }

            // Auto-fetch room from class_academic_year if not provided
            const roomId = assignmentData.room_id || (classYearData as any).room_id || null;

            // Get subject to verify organization_id matches
            const subjectData = await subjectsApi.get(assignmentData.subject_id);

            if (!subjectData) {
                throw new Error('Subject not found');
            }

            // Determine organization_id (prefer class_academic_year's)
            const organizationId = (classYearData as any).organization_id;

            // Validate organization access
            if (organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot assign subject to class from different organization');
            }

            // Check for duplicate (same subject in same class_academic_year)
            const existing = await classSubjectsApi.list({
                class_academic_year_id: assignmentData.class_academic_year_id,
                subject_id: assignmentData.subject_id,
            });

            if (Array.isArray(existing) && existing.length > 0) {
                throw new Error('This subject is already assigned to this class');
            }

            // Convert to API insert payload
            const insertData = mapClassSubjectDomainToInsert({
                classAcademicYearId: assignmentData.class_academic_year_id,
                subjectId: assignmentData.subject_id,
                organizationId,
                teacherId: null, // Teacher assignment will be handled separately
                roomId, // Use provided room or class's room
                notes: assignmentData.notes || null,
                isRequired: true,
            });

            const apiClassSubject = await classSubjectsApi.create(insertData);
            
            // Map API response back to domain model
            return mapClassSubjectApiToDomain(apiClassSubject as SubjectApi.ClassSubject);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            showToast.success('toast.subjectAssignedToClass');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectAssignFailed');
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
            const currentAssignmentApi = await classSubjectsApi.get(id);
            const currentAssignment = mapClassSubjectApiToDomain(currentAssignmentApi as SubjectApi.ClassSubject);

            if (!currentAssignment) {
                throw new Error('Subject assignment not found');
            }

            // Validate organization access (unless super admin)
            if (currentAssignment.organizationId !== profile.organization_id && currentAssignment.organizationId !== null) {
                throw new Error('Cannot update subject assignment from different organization');
            }

            // Check for duplicate if subjectId is being changed
            if (updates.subjectId !== undefined && updates.subjectId !== currentAssignment.subjectId) {
                const existing = await classSubjectsApi.list({
                    class_academic_year_id: currentAssignment.classAcademicYearId,
                    subject_id: updates.subjectId,
                });

                if (Array.isArray(existing) && existing.some((cs: any) => cs.id !== id)) {
                    throw new Error('This subject is already assigned to this class');
                }
            }

            // Convert domain model to API update payload
            const apiUpdateData = mapClassSubjectDomainToUpdate(updates);

            const apiClassSubject = await classSubjectsApi.update(id, apiUpdateData);
            
            // Map API response back to domain model
            return mapClassSubjectApiToDomain(apiClassSubject as SubjectApi.ClassSubject);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subject-history'] });
            showToast.success('toast.subjectAssignmentUpdated');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectAssignmentUpdateFailed');
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
            const currentAssignmentApi = await classSubjectsApi.get(id);
            const currentAssignment = mapClassSubjectApiToDomain(currentAssignmentApi as SubjectApi.ClassSubject);

            if (!currentAssignment) {
                throw new Error('Subject assignment not found');
            }

            // Validate organization access (unless super admin)
            if (currentAssignment.organizationId !== profile.organization_id && currentAssignment.organizationId !== null) {
                throw new Error('Cannot remove subject assignment from different organization');
            }

            // Delete via Laravel API (handles soft delete)
            await classSubjectsApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subject-history'] });
            showToast.success('toast.subjectRemovedFromClass');
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectRemoveFailed');
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
            const classYearData = await classAcademicYearsApi.get(bulkData.class_academic_year_id);

            if (!classYearData) {
                throw new Error('Class instance not found');
            }

            const organizationId = (classYearData as any).organization_id;
            // Auto-fetch room from class_academic_year if not provided
            const roomId = bulkData.default_room_id || (classYearData as any).room_id || null;

            // Validate organization access
            if (organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot assign subjects to class from different organization');
            }

            // Check for existing assignments
            const existingAssignments = await classSubjectsApi.list({
                class_academic_year_id: bulkData.class_academic_year_id,
            });

            const existingSubjectIds = new Set(
                (existingAssignments as SubjectApi.ClassSubject[] || []).map((a: any) => a.subject_id)
            );

            // Filter out subjects that are already assigned
            const newSubjectIds = bulkData.subject_ids.filter(
                subjectId => !existingSubjectIds.has(subjectId)
            );

            if (newSubjectIds.length === 0) {
                throw new Error('All specified subjects are already assigned to this class');
            }

            // Create assignments one by one (Laravel API handles bulk operations)
            const created: ClassSubject[] = [];
            for (const subjectId of newSubjectIds) {
                const insertData = mapClassSubjectDomainToInsert({
                    classAcademicYearId: bulkData.class_academic_year_id,
                    subjectId,
                    organizationId,
                    teacherId: null, // Teacher assignment will be handled separately
                    roomId, // Use provided room or class's room
                    isRequired: true,
                });

                const apiClassSubject = await classSubjectsApi.create(insertData);
                created.push(mapClassSubjectApiToDomain(apiClassSubject as SubjectApi.ClassSubject));
            }

            return {
                created,
                skipped: bulkData.subject_ids.length - newSubjectIds.length,
            };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            showToast.success(`Successfully assigned ${result.created.length} subject(s). ${result.skipped > 0 ? `${result.skipped} subject(s) were already assigned.` : ''}`);
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectAssignFailed');
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
            const sourceAssignmentsApi = await classSubjectsApi.list({
                class_academic_year_id: copyData.from_class_academic_year_id,
            });

            if (!sourceAssignmentsApi || (sourceAssignmentsApi as SubjectApi.ClassSubject[]).length === 0) {
                throw new Error('No subject assignments found to copy');
            }

            const sourceAssignments = (sourceAssignmentsApi as SubjectApi.ClassSubject[]).map(mapClassSubjectApiToDomain);

            // Get target class_academic_year to determine organization_id
            const targetClassYear = await classAcademicYearsApi.get(copyData.to_class_academic_year_id);

            if (!targetClassYear) {
                throw new Error('Target class instance not found');
            }

            // Check for duplicates before inserting
            const existingAssignments = await classSubjectsApi.list({
                class_academic_year_id: copyData.to_class_academic_year_id,
            });

            const existingSubjectIds = new Set(
                (existingAssignments as SubjectApi.ClassSubject[] || []).map((a: any) => a.subject_id)
            );

            // Create new assignments
            const created: ClassSubject[] = [];
            for (const assignment of sourceAssignments) {
                // Skip if already exists
                if (existingSubjectIds.has(assignment.subject_id)) {
                    continue;
                }

                const insertData = mapClassSubjectDomainToInsert({
                    classAcademicYearId: copyData.to_class_academic_year_id,
                    subjectId: assignment.subject_id,
                    organizationId: targetClassYear.organization_id,
                    hoursPerWeek: (assignment as any).weekly_hours || null,
                    notes: assignment.notes || null,
                    isRequired: true,
                    // Copy assignments if requested
                    teacherId: copyData.copy_assignments ? (assignment as any).teacher_id : null,
                    roomId: copyData.copy_assignments ? (assignment as any).room_id : null,
                });

                const apiClassSubject = await classSubjectsApi.create(insertData);
                created.push(mapClassSubjectApiToDomain(apiClassSubject as SubjectApi.ClassSubject));
            }

            if (created.length === 0) {
                throw new Error('All subjects are already assigned to the target class');
            }

            return {
                created,
                skipped: sourceAssignments.length - created.length,
            };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
            queryClient.invalidateQueries({ queryKey: ['subject-history'] });
            showToast.success(`Successfully copied ${result.created.length} subject assignment(s). ${result.skipped > 0 ? `${result.skipped} subject(s) were already assigned.` : ''}`);
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectAssignFailed');
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
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            const finalOrgId = organizationId || profile.organization_id;
            if (!finalOrgId) {
                return [] as ClassSubjectTemplate[];
            }

            const params: { class_id?: string; organization_id?: string } = {};
            if (classId) {
                params.class_id = classId;
            }
            if (finalOrgId) {
                params.organization_id = finalOrgId;
            }

            const apiTemplates = await classSubjectTemplatesApi.list(params);
            return (apiTemplates as SubjectApi.ClassSubjectTemplate[]).map(mapClassSubjectTemplateApiToDomain);
        },
        enabled: !!user && !!profile && (!!classId || !!organizationId || !!profile.organization_id),
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useAssignSubjectToClassTemplate = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (assignmentData: {
            classId: string;
            subjectId: string;
            isRequired?: boolean;
            credits?: number | null;
            hoursPerWeek?: number | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Convert to API insert payload
            const insertData = mapClassSubjectTemplateDomainToInsert({
                classId: assignmentData.classId,
                subjectId: assignmentData.subjectId,
                organizationId: profile.organization_id || null,
                isRequired: assignmentData.isRequired ?? false,
                credits: assignmentData.credits || null,
                hoursPerWeek: assignmentData.hoursPerWeek || null,
            });

            const apiTemplate = await classSubjectTemplatesApi.create(insertData);
            
            // Map API response back to domain model
            return mapClassSubjectTemplateApiToDomain(apiTemplate as SubjectApi.ClassSubjectTemplate);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subject-templates'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectAssignFailed');
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

            // Delete via Laravel API
            await classSubjectTemplatesApi.delete(templateId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subject-templates'] });
            queryClient.invalidateQueries({ queryKey: ['class-subjects'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectRemoveFailed');
        },
    });
};

export const useBulkAssignSubjectsToClassTemplate = () => {
    const queryClient = useQueryClient();
    const { user, profile } = useAuth();

    return useMutation({
        mutationFn: async (bulkData: {
            classId: string;
            subjectIds: string[];
            isRequired?: boolean;
            credits?: number | null;
            hoursPerWeek?: number | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Create templates one by one
            const created: ClassSubjectTemplate[] = [];
            for (const subjectId of bulkData.subjectIds) {
                const insertData = mapClassSubjectTemplateDomainToInsert({
                    classId: bulkData.classId,
                    subjectId,
                    organizationId: profile.organization_id || null,
                    isRequired: bulkData.isRequired ?? false,
                    credits: bulkData.credits || null,
                    hoursPerWeek: bulkData.hoursPerWeek || null,
                });

                const apiTemplate = await classSubjectTemplatesApi.create(insertData);
                created.push(mapClassSubjectTemplateApiToDomain(apiTemplate as SubjectApi.ClassSubjectTemplate));
            }

            return created;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['class-subject-templates'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
        },
        onError: (error: Error) => {
            showToast.error(error.message || 'toast.subjectAssignFailed');
        },
    });
};

