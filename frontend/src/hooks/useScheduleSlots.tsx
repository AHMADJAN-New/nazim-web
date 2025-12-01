import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';
import { scheduleSlotsApi } from '@/lib/api/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

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

    return useQuery({
        queryKey: ['schedule-slots', organizationId || profile?.organization_id, academicYearId],
        queryFn: async () => {
            if (!user || !profile) return [];

            // Fetch schedule slots from Laravel API
            const slots = await scheduleSlotsApi.list({
                organization_id: organizationId || profile.organization_id || undefined,
                academic_year_id: academicYearId,
            });

            // Parse days_of_week JSONB array and ensure proper format
            const parsed = (slots || []).map((slot: any) => ({
                ...slot,
                days_of_week: Array.isArray(slot.days_of_week)
                    ? slot.days_of_week
                    : (typeof slot.days_of_week === 'string'
                        ? JSON.parse(slot.days_of_week)
                        : (slot.day_of_week ? [slot.day_of_week] : [])),
                default_duration_minutes: slot.default_duration_minutes || 45,
            }));

            return parsed as ScheduleSlot[];
        },
        enabled: !!user && !!profile,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: false, // Prevent infinite retries on connection errors
    });
};

export const useScheduleSlot = (id: string) => {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery({
        queryKey: ['schedule-slot', id],
        queryFn: async () => {
            if (!user || !profile || !id) return null;

            // Fetch schedule slot from Laravel API
            const slot = await scheduleSlotsApi.get(id);

            if (!slot) return null;

            // Parse days_of_week JSONB array
            const parsed = {
                ...slot,
                days_of_week: Array.isArray(slot.days_of_week)
                    ? slot.days_of_week
                    : (typeof slot.days_of_week === 'string'
                        ? JSON.parse(slot.days_of_week)
                        : (slot.day_of_week ? [slot.day_of_week] : [])),
                default_duration_minutes: slot.default_duration_minutes || 45,
            };
            return parsed as ScheduleSlot;
        },
        enabled: !!user && !!profile && !!id,
        retry: false, // Prevent infinite retries on connection errors
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
            if (organizationId === undefined || organizationId === null) {
                if (profile.organization_id) {
                    organizationId = profile.organization_id;
                } else if (profile.role === 'super_admin') {
                    organizationId = null; // Global slot
                } else {
                    throw new Error('User must be assigned to an organization');
                }
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && organizationId !== profile.organization_id && organizationId !== null) {
                throw new Error('Cannot create slot for different organization');
            }

            // Create schedule slot via Laravel API
            const slot = await scheduleSlotsApi.create({
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
            });

            return slot as ScheduleSlot;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-slots'] });
            queryClient.invalidateQueries({ queryKey: ['schedule-slot'] });
            toast.success('Schedule slot created successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create schedule slot');
        },
        retry: false, // Prevent infinite retries on connection errors
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
            const currentSlot = await scheduleSlotsApi.get(id);

            if (!currentSlot) {
                throw new Error('Schedule slot not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentSlot.organization_id !== profile.organization_id && currentSlot.organization_id !== null) {
                throw new Error('Cannot update slot from different organization');
            }

            // Prevent organization_id changes (unless super admin)
            if (updates.organization_id && profile.role !== 'super_admin') {
                throw new Error('Cannot change organization_id');
            }

            // Prepare update data
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

            // Update schedule slot via Laravel API
            const slot = await scheduleSlotsApi.update(id, updateData);

            return slot as ScheduleSlot;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-slots'] });
            queryClient.invalidateQueries({ queryKey: ['schedule-slot'] });
            toast.success('Schedule slot updated successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update schedule slot');
        },
        retry: false, // Prevent infinite retries on connection errors
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
            const currentSlot = await scheduleSlotsApi.get(id);

            if (!currentSlot) {
                throw new Error('Schedule slot not found');
            }

            // Validate organization access (unless super admin)
            if (profile.role !== 'super_admin' && currentSlot.organization_id !== profile.organization_id && currentSlot.organization_id !== null) {
                throw new Error('Cannot delete slot from different organization');
            }

            // Delete schedule slot via Laravel API (soft delete)
            await scheduleSlotsApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedule-slots'] });
            queryClient.invalidateQueries({ queryKey: ['schedule-slot'] });
            toast.success('Schedule slot deleted successfully');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete schedule slot');
        },
        retry: false, // Prevent infinite retries on connection errors
    });
};
