import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';

import { scheduleSlotsApi } from '@/lib/api/client';
import { showToast } from '@/lib/toast';
import { mapScheduleSlotApiToDomain, mapScheduleSlotDomainToInsert, mapScheduleSlotDomainToUpdate } from '@/mappers/scheduleSlotMapper';
import type * as ScheduleSlotApi from '@/types/api/scheduleSlot';
import type { ScheduleSlot } from '@/types/domain/scheduleSlot';

// Re-export domain types and DayOfWeek for convenience
export type { ScheduleSlot, DayOfWeek } from '@/types/domain/scheduleSlot';

export const useScheduleSlots = (organizationId?: string, academicYearId?: string) => {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery<ScheduleSlot[]>({
        queryKey: ['schedule-slots', organizationId || profile?.organization_id, academicYearId, profile?.default_school_id ?? null],
        queryFn: async () => {
            if (!user || !profile) return [];

            // Fetch schedule slots from Laravel API
            const apiSlots = await scheduleSlotsApi.list({
                organization_id: organizationId || profile.organization_id || undefined,
                academic_year_id: academicYearId,
            });

            // Map API models to domain models
            return (apiSlots as ScheduleSlotApi.ScheduleSlot[]).map(mapScheduleSlotApiToDomain);
        },
        enabled: !!user && !!profile,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
};

export const useScheduleSlot = (id: string) => {
    const { user } = useAuth();
    const { data: profile } = useProfile();

    return useQuery<ScheduleSlot | null>({
        queryKey: ['schedule-slot', id, profile?.default_school_id ?? null],
        queryFn: async () => {
            if (!user || !profile || !id) return null;

            // Fetch schedule slot from Laravel API
            const apiSlot = await scheduleSlotsApi.get(id);

            if (!apiSlot) return null;

            // Map API model to domain model
            return mapScheduleSlotApiToDomain(apiSlot as ScheduleSlotApi.ScheduleSlot);
        },
        enabled: !!user && !!profile && !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
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
            startTime: string;
            endTime: string;
            daysOfWeek?: ScheduleSlotApi.DayOfWeek[];
            defaultDurationMinutes?: number;
            academicYearId?: string | null;
            schoolId?: string | null;
            sortOrder?: number;
            isActive?: boolean;
            description?: string | null;
            organizationId?: string | null;
        }) => {
            if (!user || !profile) {
                throw new Error('User not authenticated');
            }

            // Get organization_id - use provided or user's org
            let organizationId = slotData.organizationId;
            if (organizationId === undefined || organizationId === null) {
                if (profile.organization_id) {
                    organizationId = profile.organization_id;
                } else {
                    throw new Error('User must be assigned to an organization');
                }
            }

            // Validate organization access (all users)
            if (organizationId !== profile.organization_id) {
                throw new Error('Cannot create slot for different organization');
            }

            // Convert domain model to API insert payload
            const insertData = mapScheduleSlotDomainToInsert({
                name: slotData.name.trim(),
                code: slotData.code.trim(),
                startTime: slotData.startTime,
                endTime: slotData.endTime,
                daysOfWeek: slotData.daysOfWeek || [],
                defaultDurationMinutes: slotData.defaultDurationMinutes ?? 45,
                academicYearId: slotData.academicYearId || null,
                schoolId: slotData.schoolId || null,
                sortOrder: slotData.sortOrder ?? 1,
                isActive: slotData.isActive ?? true,
                description: slotData.description || null,
                organizationId,
            });

            // Create schedule slot via Laravel API
            const apiSlot = await scheduleSlotsApi.create(insertData);
            
            // Map API response back to domain model
            return mapScheduleSlotApiToDomain(apiSlot as ScheduleSlotApi.ScheduleSlot);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['schedule-slots'] });
            await queryClient.invalidateQueries({ queryKey: ['schedule-slot'] });
            await queryClient.refetchQueries({ queryKey: ['schedule-slots'] });
            showToast.success('toast.scheduleSlotCreated');
          },
          onError: (error: Error) => {
            showToast.error(error.message || 'toast.scheduleSlotCreateFailed');
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
            const currentSlotApi = await scheduleSlotsApi.get(id);
            const currentSlot = mapScheduleSlotApiToDomain(currentSlotApi as ScheduleSlotApi.ScheduleSlot);

            if (!currentSlot) {
                throw new Error('Schedule slot not found');
            }

            // Validate organization access (all users)
            if (currentSlot.organizationId !== profile.organization_id && currentSlot.organizationId !== null) {
                throw new Error('Cannot update slot from different organization');
            }

            // Prevent organizationId changes (all users)
            if (updates.organizationId) {
                throw new Error('Cannot change organizationId');
            }

            // Prepare update data
            const updateData: Partial<ScheduleSlot> = {};
            if (updates.name !== undefined) updateData.name = updates.name.trim();
            if (updates.code !== undefined) updateData.code = updates.code.trim();
            if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
            if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
            if (updates.daysOfWeek !== undefined) updateData.daysOfWeek = updates.daysOfWeek;
            if (updates.defaultDurationMinutes !== undefined) updateData.defaultDurationMinutes = updates.defaultDurationMinutes;
            if (updates.academicYearId !== undefined) updateData.academicYearId = updates.academicYearId;
            if (updates.schoolId !== undefined) updateData.schoolId = updates.schoolId;
            if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
            if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
            if (updates.description !== undefined) updateData.description = updates.description;

            // Convert domain model to API update payload
            const apiUpdateData = mapScheduleSlotDomainToUpdate(updateData);

            // Update schedule slot via Laravel API
            const apiSlot = await scheduleSlotsApi.update(id, apiUpdateData);

            // Map API response back to domain model
            return mapScheduleSlotApiToDomain(apiSlot as ScheduleSlotApi.ScheduleSlot);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['schedule-slots'] });
            await queryClient.invalidateQueries({ queryKey: ['schedule-slot'] });
            await queryClient.refetchQueries({ queryKey: ['schedule-slots'] });
            showToast.success('toast.scheduleSlotUpdated');
          },
          onError: (error: Error) => {
            showToast.error(error.message || 'toast.scheduleSlotUpdateFailed');
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
            const currentSlotApi = await scheduleSlotsApi.get(id);
            const currentSlot = mapScheduleSlotApiToDomain(currentSlotApi as ScheduleSlotApi.ScheduleSlot);

            if (!currentSlot) {
                throw new Error('Schedule slot not found');
            }

            // Validate organization access (all users)
            if (currentSlot.organizationId !== profile.organization_id && currentSlot.organizationId !== null) {
                throw new Error('Cannot delete slot from different organization');
            }

            // Delete schedule slot via Laravel API (soft delete)
            await scheduleSlotsApi.delete(id);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['schedule-slots'] });
            await queryClient.invalidateQueries({ queryKey: ['schedule-slot'] });
            await queryClient.refetchQueries({ queryKey: ['schedule-slots'] });
            showToast.success('toast.scheduleSlotDeleted');
          },
          onError: (error: Error) => {
            showToast.error(error.message || 'toast.scheduleSlotDeleteFailed');
        },
        retry: false, // Prevent infinite retries on connection errors
    });
};
