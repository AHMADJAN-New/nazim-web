import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Use generated type from database schema
export type Class = Tables<'classes'>;
export type ClassInsert = TablesInsert<'classes'>;
export type ClassUpdate = TablesUpdate<'classes'>;

// Use generated type from database schema, extended with relations
export type ClassAcademicYear = Tables<'class_academic_years'> & {
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
};
export type ClassAcademicYearInsert = TablesInsert<'class_academic_years'>;
export type ClassAcademicYearUpdate = TablesUpdate<'class_academic_years'>;

export const useClasses = (organizationId?: string) => {
    const { user, profile } = useAuth();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

    return useQuery({
        queryKey: ['classes', organizationId || profile?.organization_id, orgIds.join(',')],
        queryFn: async () => {
            if (!user || !profile || orgsLoading) return [];

            let query = (supabase as any)
                .from('classes')
                .select('*');

            const resolvedOrgIds = organizationId ? [organizationId] : orgIds;

            if (resolvedOrgIds.length === 0) {
                query = query.is('organization_id', null);
            } else {
                query = query.or(`organization_id.is.null,organization_id.in.(${resolvedOrgIds.join(',')})`);
            }

            const { data, error } = await query
                .is('deleted_at', null)
                .order('grade_level', { ascending: true, nullsLast: true })
                .order('name', { ascending: true });

            if (error) {
                throw new Error(error.message);
            }

            return (data || []) as Class[];
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useClassAcademicYears = (academicYearId?: string, organizationId?: string) => {
    const { user, profile } = useAuth();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

    return useQuery({
        queryKey: ['class-academic-years', academicYearId, organizationId || profile?.organization_id, orgIds.join(',')],
        queryFn: async () => {
            if (!user || !profile || !academicYearId || orgsLoading) return [];

            let query = (supabase as any)
                .from('class_academic_years')
                .select(`
          *,
          class:classes(*),
          academic_year:academic_years(id, name, start_date, end_date)
        `);

            // Filter by academic year
            query = query.eq('academic_year_id', academicYearId);

            const resolvedOrgIds = organizationId ? [organizationId] : orgIds;
            if (resolvedOrgIds.length === 0) {
                return [];
            }
            query = query.in('organization_id', resolvedOrgIds);

            const { data, error } = await query
                .is('deleted_at', null)
                .order('section_name', { ascending: true, nullsFirst: true });

            if (error) {
                throw new Error(error.message);
            }

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

            const { data, error } = await (supabase as any)
                .from('class_academic_years')
                .select(`
          *,
          academic_year:academic_years(id, name, start_date, end_date, is_current)
        `)
                .eq('class_id', classId)
                .is('deleted_at', null);

            if (error) {
                throw new Error(error.message);
            }

            const instances = (data || []) as ClassAcademicYear[];

            // Enrich with room data (teacher removed - will be assigned per subject later)
            const roomIds = [...new Set(instances.map(i => i.room_id).filter(Boolean))] as string[];

            const roomsData = roomIds.length > 0
                ? await (supabase as any)
                    .from('rooms')
                    .select('id, room_number, building_id')
                    .in('id', roomIds)
                : { data: [] };

            const roomsMap = new Map((roomsData.data || []).map((r: any) => [r.id, r]));

            // Get building data for rooms
            const buildingIds = [...new Set((roomsData.data || []).map((r: any) => r.building_id).filter(Boolean))] as string[];
            let buildingsMap = new Map();
            if (buildingIds.length > 0) {
                const { data: buildingsData } = await (supabase as any)
                    .from('buildings')
                    .select('id, building_name')
                    .in('id', buildingIds);
                buildingsMap = new Map((buildingsData || []).map((b: any) => [b.id, b]));
            }

            // Enrich instances with room data
            const enriched = instances.map(instance => {
                const roomData = instance.room_id ? roomsMap.get(instance.room_id) : null;
                const buildingData = roomData && (roomData as any).building_id
                    ? buildingsMap.get((roomData as any).building_id)
                    : null;

                return {
                    ...instance,
                    room: instance.room_id && roomData
                        ? {
                            id: (roomData as any).id,
                            room_number: (roomData as any).room_number,
                            building: buildingData ? {
                                id: (buildingData as any).id,
                                building_name: (buildingData as any).building_name,
                            } : null,
                        }
                        : null,
                } as ClassAcademicYear;
            });

            // Sort by academic year start_date (descending - most recent first)
            return enriched.sort((a, b) => {
                const dateA = a.academic_year?.start_date ? new Date(a.academic_year.start_date).getTime() : 0;
                const dateB = b.academic_year?.start_date ? new Date(b.academic_year.start_date).getTime() : 0;
                return dateB - dateA;
            });
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

            // Get organization_id - use provided or user's org
            let organizationId = classData.organization_id;
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
                throw new Error('Cannot create class for different organization');
            }

            // Validation
            if (classData.name.length > 100) {
                throw new Error('Name must be 100 characters or less');
            }
            if (classData.code.length > 50) {
                throw new Error('Code must be 50 characters or less');
            }

            // Trim whitespace
            const trimmedName = classData.name.trim();
            const trimmedCode = classData.code.trim().toUpperCase();

            if (!trimmedName) throw new Error('Name cannot be empty');
            if (!trimmedCode) throw new Error('Code cannot be empty');

            // Check for duplicates
            const { data: existing } = await (supabase as any)
                .from('classes')
                .select('id')
                .eq('code', trimmedCode)
                .eq('organization_id', organizationId)
                .is('deleted_at', null)
                .maybeSingle();

            if (existing) {
                throw new Error('A class with this code already exists for this organization');
            }

            const { data, error } = await (supabase as any)
                .from('classes')
                .insert({
                    name: trimmedName,
                    code: trimmedCode,
                    grade_level: classData.grade_level || null,
                    description: classData.description || null,
                    default_capacity: classData.default_capacity || 30,
                    is_active: classData.is_active !== undefined ? classData.is_active : true,
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

            // Get current class to check organization
            const { data: currentClass } = await (supabase as any)
                .from('classes')
                .select('organization_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentClass) {
                throw new Error('Class not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentClass.organization_id !== profile.organization_id && currentClass.organization_id !== null) {
                throw new Error('Cannot update class from different organization');
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
                    : currentClass.organization_id;

                const { data: existing } = await (supabase as any)
                    .from('classes')
                    .select('id')
                    .eq('code', updateData.code)
                    .eq('organization_id', organizationId)
                    .neq('id', id)
                    .is('deleted_at', null)
                    .maybeSingle();

                if (existing) {
                    throw new Error('A class with this code already exists for this organization');
                }
            }

            const { data, error } = await (supabase as any)
                .from('classes')
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

            // Get current class to check organization
            const { data: currentClass } = await (supabase as any)
                .from('classes')
                .select('organization_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentClass) {
                throw new Error('Class not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentClass.organization_id !== profile.organization_id && currentClass.organization_id !== null) {
                throw new Error('Cannot delete class from different organization');
            }

            // Check if class is in use (has active class_academic_years)
            const { data: activeInstances } = await (supabase as any)
                .from('class_academic_years')
                .select('id')
                .eq('class_id', id)
                .is('deleted_at', null)
                .limit(1);

            if (activeInstances && activeInstances.length > 0) {
                throw new Error('Cannot delete class that is assigned to academic years. Please remove all assignments first.');
            }

            // Soft delete
            const { error } = await (supabase as any)
                .from('classes')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                throw new Error(error.message);
            }
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

            // Get academic year to verify organization_id matches
            const { data: academicYear } = await (supabase as any)
                .from('academic_years')
                .select('organization_id')
                .eq('id', assignmentData.academic_year_id)
                .is('deleted_at', null)
                .single();

            if (!academicYear) {
                throw new Error('Academic year not found');
            }

            // Determine organization_id (prefer class's, fallback to academic year's)
            const organizationId = classData.organization_id || academicYear.organization_id;

            // Validate organization access
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot assign class to academic year from different organization');
            }

            // Check for duplicate (same class, year, and section)
            const sectionKey = assignmentData.section_name || '';
            const { data: existing } = await (supabase as any)
                .from('class_academic_years')
                .select('id')
                .eq('class_id', assignmentData.class_id)
                .eq('academic_year_id', assignmentData.academic_year_id)
                .is('deleted_at', null)
                .maybeSingle();

            // Check if section already exists
            if (existing) {
                // Check if it's the same section
                const { data: existingSection } = await (supabase as any)
                    .from('class_academic_years')
                    .select('section_name')
                    .eq('id', existing.id)
                    .single();

                if ((existingSection?.section_name || '') === sectionKey) {
                    throw new Error('This class section is already assigned to this academic year');
                }
            }

            const { data, error } = await (supabase as any)
                .from('class_academic_years')
                .insert({
                    class_id: assignmentData.class_id,
                    academic_year_id: assignmentData.academic_year_id,
                    organization_id: organizationId,
                    section_name: assignmentData.section_name || null,
                    room_id: assignmentData.room_id || null,
                    capacity: assignmentData.capacity || null,
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

            // Get current instance to check organization
            const { data: currentInstance } = await (supabase as any)
                .from('class_academic_years')
                .select('organization_id, class_id, academic_year_id, section_name')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentInstance) {
                throw new Error('Class instance not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentInstance.organization_id !== profile.organization_id && currentInstance.organization_id !== null) {
                throw new Error('Cannot update class instance from different organization');
            }

            // Check for duplicate section if section_name is being updated
            if (updates.section_name !== undefined) {
                const sectionKey = updates.section_name || '';
                const { data: existing } = await (supabase as any)
                    .from('class_academic_years')
                    .select('id')
                    .eq('class_id', currentInstance.class_id)
                    .eq('academic_year_id', currentInstance.academic_year_id)
                    .neq('id', id)
                    .is('deleted_at', null)
                    .maybeSingle();

                if (existing) {
                    const { data: existingSection } = await (supabase as any)
                        .from('class_academic_years')
                        .select('section_name')
                        .eq('id', existing.id)
                        .single();

                    if ((existingSection?.section_name || '') === sectionKey) {
                        throw new Error('This section already exists for this class in this academic year');
                    }
                }
            }

            const { data, error } = await (supabase as any)
                .from('class_academic_years')
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

            // Get current instance to check organization
            const { data: currentInstance } = await (supabase as any)
                .from('class_academic_years')
                .select('organization_id, current_student_count')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentInstance) {
                throw new Error('Class instance not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentInstance.organization_id !== profile.organization_id && currentInstance.organization_id !== null) {
                throw new Error('Cannot remove class instance from different organization');
            }

            // Check if there are enrolled students
            if (currentInstance.current_student_count > 0) {
                throw new Error('Cannot remove class instance that has enrolled students. Please transfer or remove students first.');
            }

            // Soft delete
            const { error } = await (supabase as any)
                .from('class_academic_years')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                throw new Error(error.message);
            }
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

            // Get class to determine organization_id
            const { data: classData } = await (supabase as any)
                .from('classes')
                .select('organization_id, default_capacity')
                .eq('id', bulkData.class_id)
                .is('deleted_at', null)
                .single();

            if (!classData) {
                throw new Error('Class not found');
            }

            // Get academic year to verify organization_id matches
            const { data: academicYear } = await (supabase as any)
                .from('academic_years')
                .select('organization_id')
                .eq('id', bulkData.academic_year_id)
                .is('deleted_at', null)
                .single();

            if (!academicYear) {
                throw new Error('Academic year not found');
            }

            // Determine organization_id (prefer class's, fallback to academic year's)
            const organizationId = classData.organization_id || academicYear.organization_id;

            // Validate organization access
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot assign class to academic year from different organization');
            }

            // Check for existing sections
            const { data: existingInstances } = await (supabase as any)
                .from('class_academic_years')
                .select('section_name')
                .eq('class_id', bulkData.class_id)
                .eq('academic_year_id', bulkData.academic_year_id)
                .is('deleted_at', null);

            const existingSections = new Set(
                (existingInstances || []).map((inst: any) => (inst.section_name || '').toUpperCase())
            );

            // Filter out sections that already exist
            const newSections = bulkData.sections.filter(
                section => !existingSections.has(section.trim().toUpperCase())
            );

            if (newSections.length === 0) {
                throw new Error('All specified sections already exist for this class in this academic year');
            }

            // Prepare bulk insert data
            const insertData = newSections.map(section => ({
                class_id: bulkData.class_id,
                academic_year_id: bulkData.academic_year_id,
                organization_id: organizationId,
                section_name: section.trim(),
                room_id: bulkData.default_room_id || null,
                capacity: bulkData.default_capacity || classData.default_capacity || null,
                is_active: true,
                current_student_count: 0,
            }));

            // Bulk insert
            const { data, error } = await (supabase as any)
                .from('class_academic_years')
                .insert(insertData)
                .select();

            if (error) {
                throw new Error(error.message);
            }

            return {
                created: data,
                skipped: bulkData.sections.length - newSections.length,
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
            from_academic_year_id: string;
            to_academic_year_id: string;
            class_instance_ids: string[];
            copy_assignments?: boolean; // Copy teachers and rooms
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get all class instances to copy
            const { data: sourceInstances, error: fetchError } = await (supabase as any)
                .from('class_academic_years')
                .select('*')
                .eq('academic_year_id', copyData.from_academic_year_id)
                .in('id', copyData.class_instance_ids)
                .is('deleted_at', null);

            if (fetchError) {
                throw new Error(fetchError.message);
            }

            if (!sourceInstances || sourceInstances.length === 0) {
                throw new Error('No class instances found to copy');
            }

            // Prepare new instances
            const newInstances = sourceInstances.map((instance: ClassAcademicYear) => {
                const newInstance: any = {
                    class_id: instance.class_id,
                    academic_year_id: copyData.to_academic_year_id,
                    organization_id: instance.organization_id,
                    section_name: instance.section_name,
                    capacity: instance.capacity,
                    notes: instance.notes,
                    is_active: true,
                    current_student_count: 0, // Reset student count
                };

                // Copy assignments if requested
                if (copyData.copy_assignments) {
                    newInstance.teacher_id = instance.teacher_id;
                    newInstance.room_id = instance.room_id;
                }

                return newInstance;
            });

            // Check for duplicates before inserting
            for (const instance of newInstances) {
                const sectionKey = instance.section_name || '';
                const { data: existing } = await (supabase as any)
                    .from('class_academic_years')
                    .select('id')
                    .eq('class_id', instance.class_id)
                    .eq('academic_year_id', copyData.to_academic_year_id)
                    .is('deleted_at', null)
                    .maybeSingle();

                if (existing) {
                    const { data: existingSection } = await (supabase as any)
                        .from('class_academic_years')
                        .select('section_name')
                        .eq('id', existing.id)
                        .single();

                    if ((existingSection?.section_name || '') === sectionKey) {
                        throw new Error(`Class "${instance.class_id}" section "${sectionKey || 'Default'}" already exists in target academic year`);
                    }
                }
            }

            // Insert all new instances
            const { data, error } = await (supabase as any)
                .from('class_academic_years')
                .insert(newInstances)
                .select();

            if (error) {
                throw new Error(error.message);
            }

            return data;
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

