import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import type { Tables, TablesInsert, TablesUpdate, Json } from '@/integrations/supabase/types';

// Day of week type for schedule slots
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

// Use generated type from database schema, extended with relations
export type ScheduleSlot = Omit<Tables<'schedule_slots'>, 'days_of_week'> & {
    days_of_week: DayOfWeek[];  // Override Json type with proper array type
    academic_year?: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
    } | null;
    school?: {
        id: string;
        school_name: string;
    } | null;
};
export type ScheduleSlotInsert = TablesInsert<'schedule_slots'>;
export type ScheduleSlotUpdate = TablesUpdate<'schedule_slots'>;

export const useScheduleSlots = (organizationId?: string, academicYearId?: string) => {
    const { user } = useAuth();
    const { data: profile } = useProfile();
    const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

    return useQuery({
        queryKey: ['schedule-slots', organizationId || profile?.organization_id, academicYearId, orgIds.join(',')],
        queryFn: async () => {
            if (!user || !profile || orgsLoading) return [];

            let query = (supabase as any)
                .from('schedule_slots')
                .select(`
                    *,
                    academic_year:academic_years(id, name, start_date, end_date),
                    school:school_branding(id, school_name)
                `)
                .is('deleted_at', null)
                .order('sort_order', { ascending: true })
                .order('start_time', { ascending: true });

            const resolvedOrgIds = organizationId ? [organizationId] : orgIds;
            if (resolvedOrgIds.length === 0) {
                query = query.is('organization_id', null);
            } else {
                query = query.or(`organization_id.is.null,organization_id.in.(${resolvedOrgIds.join(',')})`);
            }

            // Filter by academic year if provided
            if (academicYearId) {
                // Show slots for this academic year OR global slots (academic_year_id IS NULL)
                query = query.or(`academic_year_id.eq.${academicYearId},academic_year_id.is.null`);
            }
            // If no academic year specified, show all slots (global + year-specific)

            const { data, error } = await query;

            if (error) {
                // If error is about the school relationship, try fetching without it
                if (error.message?.includes('school') || error.message?.includes('school_branding')) {
                    // Retry without school relation
                    let retryQuery = (supabase as any)
                        .from('schedule_slots')
                        .select(`
                            *,
                            academic_year:academic_years(id, name, start_date, end_date)
                        `)
                        .is('deleted_at', null)
                        .order('sort_order', { ascending: true })
                        .order('start_time', { ascending: true });

                    // Apply same filters
                    const isSuperAdmin = profile.role === 'super_admin';
                    if (isSuperAdmin) {
                        if (organizationId) {
                            retryQuery = retryQuery.eq('organization_id', organizationId);
                        }
                    } else {
                        const userOrgId = profile.organization_id;
                        if (userOrgId) {
                            retryQuery = retryQuery.or(`organization_id.is.null,organization_id.eq.${userOrgId}`);
                        } else {
                            return [];
                        }
                    }

                    if (academicYearId) {
                        retryQuery = retryQuery.or(`academic_year_id.eq.${academicYearId},academic_year_id.is.null`);
                    }

                    const { data: retryData, error: retryError } = await retryQuery;

                    if (retryError) {
                        throw new Error(retryError.message);
                    }

                    // Fetch schools separately
                    const slots = retryData || [];
                    const schoolIds = [...new Set(slots.map((s: any) => s.school_id).filter(Boolean))];
                    let schoolsMap: Record<string, { id: string; school_name: string }> = {};

                    if (schoolIds.length > 0) {
                        const { data: schools } = await (supabase as any)
                            .from('school_branding')
                            .select('id, school_name')
                            .in('id', schoolIds);

                        if (schools) {
                            schoolsMap = schools.reduce((acc: Record<string, { id: string; school_name: string }>, school: any) => {
                                acc[school.id] = { id: school.id, school_name: school.school_name };
                                return acc;
                            }, {});
                        }
                    }

                    // Parse days_of_week JSONB array and ensure default_duration_minutes
                    const parsed = slots.map((slot: any) => ({
                        ...slot,
                        days_of_week: Array.isArray(slot.days_of_week)
                            ? slot.days_of_week
                            : (typeof slot.days_of_week === 'string'
                                ? JSON.parse(slot.days_of_week)
                                : (slot.day_of_week ? [slot.day_of_week] : [])),
                        default_duration_minutes: slot.default_duration_minutes || 45,
                        school: slot.school_id ? schoolsMap[slot.school_id] || null : null,
                    }));
                    return parsed as ScheduleSlot[];
                }
                throw new Error(error.message);
            }

            // Parse days_of_week JSONB array and ensure default_duration_minutes
            const parsed = (data || []).map((slot: any) => ({
                ...slot,
                days_of_week: Array.isArray(slot.days_of_week)
                    ? slot.days_of_week
                    : (typeof slot.days_of_week === 'string'
                        ? JSON.parse(slot.days_of_week)
                        : (slot.day_of_week ? [slot.day_of_week] : [])), // Fallback for old data
                default_duration_minutes: slot.default_duration_minutes || 45,
            }));
            return parsed as ScheduleSlot[];
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
};

export const useScheduleSlot = (id: string) => {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery({
        queryKey: ['schedule-slot', id],
        queryFn: async () => {
            if (!user || !profile) return null;

            const { data, error } = await (supabase as any)
                .from('schedule_slots')
                .select('*')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (error) {
                throw new Error(error.message);
            }

            if (!data) return null;

            // Parse days_of_week JSONB array
            const parsed = {
                ...data,
                days_of_week: Array.isArray(data.days_of_week)
                    ? data.days_of_week
                    : (typeof data.days_of_week === 'string'
                        ? JSON.parse(data.days_of_week)
                        : (data.day_of_week ? [data.day_of_week] : [])),
                default_duration_minutes: data.default_duration_minutes || 45,
            };
            return parsed as ScheduleSlot;
        },
        enabled: !!user && !!profile && !!id,
    });
};

export const useCreateScheduleSlot = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useMutation({
        mutationFn: async (slotData: {
            name: string;
            code: string;
            start_time: string;
            end_time: string;
            days_of_week?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
            default_duration_minutes?: number;
            academic_year_id?: string | null;
            school_id?: string | null;
            sort_order?: number;
            is_active?: boolean;
            description?: string | null;
            organization_id?: string | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get organization_id - use provided or user's org
            let organizationId = slotData.organization_id;
            if (!organizationId) {
                if (profile.organization_id) {
                    organizationId = profile.organization_id;
                } else if (profile.role === 'super_admin') {
                    organizationId = null; // Global slot
                } else {
                    throw new Error('User must be assigned to an organization');
                }
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id) {
                throw new Error('Cannot create slot for different organization');
            }

            const { data, error } = await (supabase as any)
                .from('schedule_slots')
                .insert({
                    name: slotData.name.trim(),
                    code: slotData.code.trim(),
                    start_time: slotData.start_time,
                    end_time: slotData.end_time,
                    days_of_week: slotData.days_of_week || [],
                    default_duration_minutes: slotData.default_duration_minutes ?? 45,
                    academic_year_id: slotData.academic_year_id || null,
                    school_id: slotData.school_id || null,
                    sort_order: slotData.sort_order ?? 1,
                    is_active: slotData.is_active ?? true,
                    description: slotData.description || null,
                    organization_id: organizationId,
                })
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data as ScheduleSlot;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-slots'] });
            queryClient.invalidateQueries({ queryKey: ['schedule-slot'] });
            toast.success('Schedule slot created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create schedule slot');
        },
    });
};

export const useUpdateScheduleSlot = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ScheduleSlot> & { id: string }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get current slot to check organization
            const { data: currentSlot } = await (supabase as any)
                .from('schedule_slots')
                .select('organization_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentSlot) {
                throw new Error('Schedule slot not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentSlot.organization_id !== profile.organization_id) {
                throw new Error('Cannot update slot from different organization');
            }

            // Prevent organization_id changes (unless super admin)
            if (updates.organization_id && profile.role !== 'super_admin') {
                throw new Error('Cannot change organization_id');
            }

            const updateData: any = {};
            if (updates.name !== undefined) updateData.name = updates.name.trim();
            if (updates.code !== undefined) updateData.code = updates.code.trim();
            if (updates.start_time !== undefined) updateData.start_time = updates.start_time;
            if (updates.end_time !== undefined) updateData.end_time = updates.end_time;
            if (updates.days_of_week !== undefined) updateData.days_of_week = updates.days_of_week;
            if (updates.default_duration_minutes !== undefined) updateData.default_duration_minutes = updates.default_duration_minutes;
            if (updates.academic_year_id !== undefined) updateData.academic_year_id = updates.academic_year_id;
            if (updates.school_id !== undefined) updateData.school_id = updates.school_id;
            if (updates.sort_order !== undefined) updateData.sort_order = updates.sort_order;
            if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
            if (updates.description !== undefined) updateData.description = updates.description;

            const { data, error } = await (supabase as any)
                .from('schedule_slots')
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return data as ScheduleSlot;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-slots'] });
            queryClient.invalidateQueries({ queryKey: ['schedule-slot'] });
            toast.success('Schedule slot updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update schedule slot');
        },
    });
};

export const useDeleteScheduleSlot = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get current slot to check organization
            const { data: currentSlot } = await (supabase as any)
                .from('schedule_slots')
                .select('organization_id')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            if (!currentSlot) {
                throw new Error('Schedule slot not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentSlot.organization_id !== profile.organization_id) {
                throw new Error('Cannot delete slot from different organization');
            }

            // Hard delete - permanently remove the record
            const { error } = await (supabase as any)
                .from('schedule_slots')
                .delete()
                .eq('id', id);

            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-slots'] });
            queryClient.invalidateQueries({ queryKey: ['schedule-slot'] });
            toast.success('Schedule slot deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete schedule slot');
        },
    });
};

