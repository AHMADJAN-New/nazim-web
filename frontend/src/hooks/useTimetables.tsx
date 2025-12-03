import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { toast } from 'sonner';
import { timetablesApi, teacherTimetablePreferencesApi } from '@/lib/api/client';
import type * as TimetableApi from '@/types/api/timetable';
import type { Timetable, TimetableEntry, TeacherPreference } from '@/types/domain/timetable';
import {
	mapTimetableApiToDomain,
	mapTimetableDomainToInsert,
	mapTimetableDomainToUpdate,
	mapTimetableEntryApiToDomain,
	mapTimetableEntryDomainToInsert,
	mapTeacherPreferenceApiToDomain,
	mapTeacherPreferenceDomainToInsert,
} from '@/mappers/timetableMapper';

// Re-export domain types and DayName for convenience
export type { Timetable, TimetableEntry, TeacherPreference } from '@/types/domain/timetable';
export type { DayName } from '@/types/api/timetable';

export const useTimetables = (organizationId?: string, academicYearId?: string) => {
	const { user } = useAuth();
	const { data: profile } = useProfile();
	const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

	return useQuery<Timetable[]>({
		queryKey: ['timetables', organizationId || profile?.organization_id, academicYearId, orgIds.join(',')],
		queryFn: async () => {
			if (!user || !profile || orgsLoading) return [];

			// Fetch timetables from Laravel API
			const apiTimetables = await timetablesApi.list({
				organization_id: organizationId || profile.organization_id || undefined,
				academic_year_id: academicYearId,
			});

			// Map API models to domain models
			return (apiTimetables as TimetableApi.Timetable[]).map(mapTimetableApiToDomain);
		},
		enabled: !!user && !!profile,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
};

export const useTimetable = (timetableId?: string) => {
	const { user } = useAuth();
	const { data: profile } = useProfile();

	return useQuery<{ timetable: Timetable | null; entries: TimetableEntry[] }>({
		queryKey: ['timetable', timetableId],
		queryFn: async () => {
			if (!user || !profile || !timetableId) return { timetable: null, entries: [] };

			// Fetch timetable with entries from Laravel API
			const response = await timetablesApi.get(timetableId) as { timetable?: TimetableApi.Timetable; entries?: TimetableApi.TimetableEntry[] };

			return {
				timetable: response.timetable ? mapTimetableApiToDomain(response.timetable) : null,
				entries: (response.entries || []).map(entry => mapTimetableEntryApiToDomain(entry)),
			};
		},
		enabled: !!user && !!profile && !!timetableId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
};

export const useCreateTimetable = () => {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { data: profile } = useProfile();

	return useMutation({
		mutationFn: async (params: {
			name: string;
			description?: string | null;
			timetableType?: string;
			organizationId?: string | null;
			academicYearId?: string | null;
			schoolId?: string | null;
			entries: Array<{
				classAcademicYearId: string;
				subjectId: string;
				teacherId: string;
				scheduleSlotId: string;
				dayName: TimetableApi.DayName;
				periodOrder: number;
			}>;
		}) => {
			if (!user || !profile) throw new Error('User not authenticated');

			let organizationId = params.organizationId;
			if (organizationId === undefined) {
				if (profile.organization_id) {
					organizationId = profile.organization_id;
				} else {
					throw new Error('User must be assigned to an organization');
				}
			}

			// Convert domain model to API insert payload
			const insertData = mapTimetableDomainToInsert({
				name: params.name.trim(),
				timetableType: params.timetableType || 'teaching',
				description: params.description || null,
				organizationId,
				academicYearId: params.academicYearId || null,
				schoolId: params.schoolId || null,
				isActive: true,
			});

			// Convert entries to API format
			const entries = params.entries.map(entry => mapTimetableEntryDomainToInsert({
				timetableId: '', // Will be set by backend
				classAcademicYearId: entry.classAcademicYearId,
				subjectId: entry.subjectId,
				teacherId: entry.teacherId,
				scheduleSlotId: entry.scheduleSlotId,
				dayName: entry.dayName,
				periodOrder: entry.periodOrder,
			}));

			// Create timetable with entries via Laravel API
			const apiTimetable = await timetablesApi.create({
				...insertData,
				entries,
			});

			// Map API response back to domain model
			return mapTimetableApiToDomain(apiTimetable as TimetableApi.Timetable);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['timetables'] });
			toast.success('Timetable created successfully');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to create timetable');
		},
	});
};

export const useUpdateTimetable = () => {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { data: profile } = useProfile();

	return useMutation({
		mutationFn: async ({ id, ...updates }: Partial<Timetable> & { id: string }) => {
			if (!user || !profile) throw new Error('User not authenticated');

			// Convert domain model to API update payload
			const updateData: Partial<Timetable> = {};
			if (updates.name !== undefined) updateData.name = updates.name.trim();
			if (updates.description !== undefined) updateData.description = updates.description || null;
			if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
			if (updates.timetableType !== undefined) updateData.timetableType = updates.timetableType;
			if (updates.academicYearId !== undefined) updateData.academicYearId = updates.academicYearId;
			if (updates.schoolId !== undefined) updateData.schoolId = updates.schoolId;

			const apiUpdateData = mapTimetableDomainToUpdate(updateData);

			// Update timetable via Laravel API
			const apiTimetable = await timetablesApi.update(id, apiUpdateData);
			
			// Map API response back to domain model
			return mapTimetableApiToDomain(apiTimetable as TimetableApi.Timetable);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['timetables'] });
			queryClient.invalidateQueries({ queryKey: ['timetable'] });
			toast.success('Timetable updated successfully');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update timetable');
		},
	});
};

export const useDeleteTimetable = () => {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { data: profile } = useProfile();

	return useMutation({
		mutationFn: async (id: string) => {
			if (!user || !profile) throw new Error('User not authenticated');

			// Delete timetable via Laravel API (soft delete)
			await timetablesApi.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['timetables'] });
			queryClient.invalidateQueries({ queryKey: ['timetable'] });
			toast.success('Timetable deleted successfully');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete timetable');
		},
	});
};

export const useTeacherPreferences = (organizationId?: string, teacherId?: string, academicYearId?: string) => {
	const { user } = useAuth();
	const { data: profile } = useProfile();
	const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

	return useQuery<TeacherPreference[]>({
		queryKey: ['teacher-prefs', organizationId || profile?.organization_id, teacherId, academicYearId, orgIds.join(',')],
		queryFn: async () => {
			if (!user || !profile || orgsLoading) return [];

			// Fetch teacher preferences from Laravel API
			const apiPreferences = await teacherTimetablePreferencesApi.list({
				organization_id: organizationId || profile.organization_id || undefined,
				teacher_id: teacherId,
				academic_year_id: academicYearId,
			});

			// Map API models to domain models
			return (apiPreferences as TimetableApi.TeacherPreference[]).map(mapTeacherPreferenceApiToDomain);
		},
		enabled: !!user && !!profile,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	});
};

export const useUpsertTeacherPreference = () => {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { data: profile } = useProfile();
	const { orgIds } = useAccessibleOrganizations();

	return useMutation({
		mutationFn: async (params: {
			teacherId: string;
			scheduleSlotIds: string[];
			organizationId?: string | null;
			academicYearId?: string | null;
			isActive?: boolean;
			notes?: string | null;
		}) => {
			if (!user || !profile) throw new Error('User not authenticated');

			let organizationId = params.organizationId ?? profile.organization_id ?? null;
			if (organizationId && !orgIds.includes(organizationId)) {
				throw new Error('Cannot update preferences for a non-accessible organization');
			}

			// Convert domain model to API insert payload
			const insertData = mapTeacherPreferenceDomainToInsert({
				teacherId: params.teacherId,
				scheduleSlotIds: params.scheduleSlotIds,
				organizationId,
				academicYearId: params.academicYearId || null,
				isActive: params.isActive ?? true,
				notes: params.notes || null,
			});

			// Upsert preference via Laravel API
			const apiPreference = await teacherTimetablePreferencesApi.upsert(insertData);

			// Map API response back to domain model
			return mapTeacherPreferenceApiToDomain(apiPreference as TimetableApi.TeacherPreference);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['teacher-prefs'] });
			toast.success('Teacher preferences saved');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to save teacher preferences');
		},
	});
};

export const useDeleteTeacherPreference = () => {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { data: profile } = useProfile();

	return useMutation({
		mutationFn: async (id: string) => {
			if (!user || !profile) throw new Error('User not authenticated');

			// Delete preference via Laravel API (soft delete)
			await teacherTimetablePreferencesApi.delete(id);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['teacher-prefs'] });
			toast.success('Teacher preference deleted');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete teacher preference');
		},
	});
};


