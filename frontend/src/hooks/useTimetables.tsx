import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';
import { useAccessibleOrganizations } from './useAccessibleOrganizations';
import { toast } from 'sonner';
import { timetablesApi, teacherTimetablePreferencesApi } from '@/lib/api/client';
import type { Tables, TablesInsert, TablesUpdate, Json } from '@/integrations/supabase/types';

// Day of week type for timetable entries
export type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'all_year';

// Use generated type from database schema
export type TimetableRow = Tables<'generated_timetables'>;
export type TimetableRowInsert = TablesInsert<'generated_timetables'>;
export type TimetableRowUpdate = TablesUpdate<'generated_timetables'>;

// Use generated type from database schema, extended with relations
export type TimetableEntryRow = Omit<Tables<'timetable_entries'>, 'day_name'> & {
	day_name: DayName; // Override string with specific enum
	// Optional denormalized data for UI convenience
	class_academic_year?: {
		id: string;
		section_name: string | null;
		class?: { id: string; name: string; code: string } | null;
		academic_year?: { id: string; name: string } | null;
	} | null;
	subject?: { id: string; name: string; code: string } | null;
	teacher?: { id: string; full_name: string } | null;
	schedule_slot?: { id: string; name: string; start_time: string; end_time: string } | null;
};
export type TimetableEntryRowInsert = TablesInsert<'timetable_entries'>;
export type TimetableEntryRowUpdate = TablesUpdate<'timetable_entries'>;

// Use generated type from database schema, with override for Json array
export type TeacherPreferenceRow = Omit<Tables<'teacher_timetable_preferences'>, 'schedule_slot_ids'> & {
	schedule_slot_ids: string[]; // JSONB array at boundary, cast to string[]
};
export type TeacherPreferenceRowInsert = TablesInsert<'teacher_timetable_preferences'>;
export type TeacherPreferenceRowUpdate = TablesUpdate<'teacher_timetable_preferences'>;

export const useTimetables = (organizationId?: string, academicYearId?: string) => {
	const { user } = useAuth();
	const { data: profile } = useProfile();
	const { orgIds, isLoading: orgsLoading } = useAccessibleOrganizations();

	return useQuery({
		queryKey: ['timetables', organizationId || profile?.organization_id, academicYearId, orgIds.join(',')],
		queryFn: async (): Promise<TimetableRow[]> => {
			if (!user || !profile || orgsLoading) return [];

			// Fetch timetables from Laravel API
			const timetables = await timetablesApi.list({
				organization_id: organizationId || profile.organization_id || undefined,
				academic_year_id: academicYearId,
			});

			return (timetables || []) as TimetableRow[];
		},
		enabled: !!user && !!profile,
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	});
};

export const useTimetable = (timetableId?: string) => {
	const { user } = useAuth();
	const { data: profile } = useProfile();

	return useQuery({
		queryKey: ['timetable', timetableId],
		queryFn: async (): Promise<{ timetable: TimetableRow | null; entries: TimetableEntryRow[] }> => {
			if (!user || !profile || !timetableId) return { timetable: null, entries: [] };

			// Fetch timetable with entries from Laravel API
			const response = await timetablesApi.get(timetableId);

			return {
				timetable: (response.timetable || null) as TimetableRow | null,
				entries: (response.entries || []) as TimetableEntryRow[],
			};
		},
		enabled: !!user && !!profile && !!timetableId,
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
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
			timetable_type?: string;
			organization_id?: string | null;
			academic_year_id?: string | null;
			school_id?: string | null;
			entries: Array<{
				class_academic_year_id: string;
				subject_id: string;
				teacher_id: string;
				schedule_slot_id: string;
				day_name: TimetableEntryRow['day_name'];
				period_order: number;
			}>;
		}) => {
			if (!user || !profile) throw new Error('User not authenticated');

			let organizationId = params.organization_id;
			if (organizationId === undefined) {
				if (profile.organization_id) {
					organizationId = profile.organization_id;
				} else if (profile.role === 'super_admin') {
					// Super admin can work with null organization_id (global timetables)
					organizationId = null;
				} else {
					throw new Error('User must be assigned to an organization');
				}
			}

			// Create timetable with entries via Laravel API
			const timetable = await timetablesApi.create({
				name: params.name.trim(),
				timetable_type: params.timetable_type || 'teaching',
				description: params.description || null,
				organization_id: organizationId,
				academic_year_id: params.academic_year_id || null,
				school_id: params.school_id || null,
				is_active: true,
				entries: params.entries,
			});

			return timetable as TimetableRow;
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
		mutationFn: async ({ id, ...updates }: Partial<TimetableRow> & { id: string }) => {
			if (!user || !profile) throw new Error('User not authenticated');

			const payload: any = {};
			if (updates.name !== undefined) payload.name = updates.name.trim();
			if (updates.description !== undefined) payload.description = updates.description || null;
			if (updates.is_active !== undefined) payload.is_active = updates.is_active;
			if (updates.timetable_type !== undefined) payload.timetable_type = updates.timetable_type;
			if (updates.academic_year_id !== undefined) payload.academic_year_id = updates.academic_year_id;
			if (updates.school_id !== undefined) payload.school_id = updates.school_id;

			// Update timetable via Laravel API
			const timetable = await timetablesApi.update(id, payload);
			return timetable as TimetableRow;
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

	return useQuery({
		queryKey: ['teacher-prefs', organizationId || profile?.organization_id, teacherId, academicYearId, orgIds.join(',')],
		queryFn: async (): Promise<TeacherPreferenceRow[]> => {
			if (!user || !profile || orgsLoading) return [];

			// Fetch teacher preferences from Laravel API
			const preferences = await teacherTimetablePreferencesApi.list({
				organization_id: organizationId || profile.organization_id || undefined,
				teacher_id: teacherId,
				academic_year_id: academicYearId,
			});

			// Laravel returns schedule_slot_ids as array directly (JSONB handled server-side)
			return (preferences || []) as TeacherPreferenceRow[];
		},
		enabled: !!user && !!profile,
		staleTime: 10 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	});
};

export const useUpsertTeacherPreference = () => {
	const queryClient = useQueryClient();
	const { user } = useAuth();
	const { data: profile } = useProfile();
	const { orgIds } = useAccessibleOrganizations();

	return useMutation({
		mutationFn: async (params: {
			teacher_id: string;
			schedule_slot_ids: string[];
			organization_id?: string | null;
			academic_year_id?: string | null;
			is_active?: boolean;
			notes?: string | null;
		}) => {
			if (!user || !profile) throw new Error('User not authenticated');

			let organizationId = params.organization_id ?? profile.organization_id ?? null;
			if (organizationId && !orgIds.includes(organizationId)) {
				throw new Error('Cannot update preferences for a non-accessible organization');
			}

			// Upsert preference via Laravel API
			const preference = await teacherTimetablePreferencesApi.upsert({
				teacher_id: params.teacher_id,
				schedule_slot_ids: params.schedule_slot_ids,
				organization_id: organizationId,
				academic_year_id: params.academic_year_id || null,
				is_active: params.is_active ?? true,
				notes: params.notes || null,
			});

			return preference as TeacherPreferenceRow;
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


