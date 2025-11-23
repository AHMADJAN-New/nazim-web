import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfiles';
import { toast } from 'sonner';

export interface TimetableRow {
	name: string;
	timetable_type: string;
	description: string | null;
	is_active: boolean;
	organization_id: string | null;
	academic_year_id: string | null;
	school_id: string | null;
	created_by: string | null;
	created_at: string;
	updated_at: string;
	deleted_at?: string | null;
	id: string;
}

export interface TimetableEntryRow {
	id: string;
	organization_id: string | null;
	timetable_id: string;
	class_academic_year_id: string;
	subject_id: string;
	teacher_id: string;
	schedule_slot_id: string;
	day_name: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'all_year';
	period_order: number;
	created_at: string;
	updated_at: string;
	deleted_at?: string | null;
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
}

export interface TeacherPreferenceRow {
	id: string;
	organization_id: string | null;
	academic_year_id: string | null;
	teacher_id: string;
	schedule_slot_ids: string[]; // JSONB array at boundary, cast to string[]
	is_active: boolean;
	notes: string | null;
	created_at: string;
	updated_at: string;
	deleted_at?: string | null;
}

export const useTimetables = (organizationId?: string, academicYearId?: string) => {
	const { user } = useAuth();
	const { data: profile } = useProfile();

	return useQuery({
		queryKey: ['timetables', organizationId || profile?.organization_id, academicYearId],
		queryFn: async (): Promise<TimetableRow[]> => {
			if (!user || !profile) return [];

			let query = (supabase as any)
				.from('generated_timetables')
				.select('*')
				.is('deleted_at', null)
				.order('created_at', { ascending: false });

			const isSuperAdmin = profile.organization_id === null && profile.role === 'super_admin';
			if (isSuperAdmin) {
				if (organizationId) {
					query = query.eq('organization_id', organizationId);
				}
			} else {
				const userOrgId = profile.organization_id;
				if (userOrgId) {
					query = query.eq('organization_id', userOrgId);
				} else {
					return [];
				}
			}

			if (academicYearId) {
				query = query.eq('academic_year_id', academicYearId);
			}

			const { data, error } = await query;
			if (error) throw new Error(error.message);
			return (data || []) as TimetableRow[];
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

			const { data: timetable, error: tErr } = await (supabase as any)
				.from('generated_timetables')
				.select('*')
				.eq('id', timetableId)
				.is('deleted_at', null)
				.single();
			if (tErr) throw new Error(tErr.message);

			const { data: entries, error: eErr } = await (supabase as any)
				.from('timetable_entries')
				.select(`
          *,
          class_academic_year:class_academic_years(
            id, section_name,
            class:classes(id, name, code),
            academic_year:academic_years(id, name)
          ),
          subject:subjects(id, name, code),
          teacher:staff(id, full_name),
          schedule_slot:schedule_slots(id, name, start_time, end_time)
        `)
				.eq('timetable_id', timetableId)
				.is('deleted_at', null)
				.order('period_order', { ascending: true });
			if (eErr) throw new Error(eErr.message);

			return {
				timetable: (timetable || null) as TimetableRow | null,
				entries: (entries || []) as TimetableEntryRow[],
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

			// 1) Create timetable
			const { data: timetable, error: tErr } = await (supabase as any)
				.from('generated_timetables')
				.insert({
					name: params.name.trim(),
					timetable_type: params.timetable_type || 'teaching',
					description: params.description || null,
					organization_id: organizationId,
					academic_year_id: params.academic_year_id || null,
					school_id: params.school_id || null,
					is_active: true,
				})
				.select('*')
				.single();
			if (tErr) throw new Error(tErr.message);

			// 2) Insert entries (bulk)
			const rows = params.entries.map((e) => ({
				organization_id: organizationId,
				timetable_id: timetable.id,
				class_academic_year_id: e.class_academic_year_id,
				subject_id: e.subject_id,
				teacher_id: e.teacher_id,
				schedule_slot_id: e.schedule_slot_id,
				day_name: e.day_name,
				period_order: e.period_order,
			}));

			if (rows.length > 0) {
				const { error: eErr } = await (supabase as any)
					.from('timetable_entries')
					.insert(rows);
				if (eErr) throw new Error(eErr.message);
			}

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

			// Validate org access
			const { data: current } = await (supabase as any)
				.from('generated_timetables')
				.select('organization_id')
				.eq('id', id)
				.is('deleted_at', null)
				.single();
			if (!current) throw new Error('Timetable not found');
			if (profile.role !== 'super_admin' && current.organization_id !== profile.organization_id) {
				throw new Error('Cannot update timetable from different organization');
			}

			const payload: any = {};
			if (updates.name !== undefined) payload.name = updates.name.trim();
			if (updates.description !== undefined) payload.description = updates.description || null;
			if (updates.is_active !== undefined) payload.is_active = updates.is_active;
			if (updates.timetable_type !== undefined) payload.timetable_type = updates.timetable_type;
			if (updates.academic_year_id !== undefined) payload.academic_year_id = updates.academic_year_id;
			if (updates.school_id !== undefined) payload.school_id = updates.school_id;

			const { data, error } = await (supabase as any)
				.from('generated_timetables')
				.update(payload)
				.eq('id', id)
				.select('*')
				.single();
			if (error) throw new Error(error.message);
			return data as TimetableRow;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['timetables'] });
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

			// Validate org access
			const { data: current } = await (supabase as any)
				.from('generated_timetables')
				.select('organization_id')
				.eq('id', id)
				.is('deleted_at', null)
				.single();
			if (!current) throw new Error('Timetable not found');
			if (profile.role !== 'super_admin' && current.organization_id !== profile.organization_id) {
				throw new Error('Cannot delete timetable from different organization');
			}

			// Soft delete
			const { error } = await (supabase as any)
				.from('generated_timetables')
				.update({ deleted_at: new Date().toISOString(), is_active: false })
				.eq('id', id);
			if (error) throw new Error(error.message);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['timetables'] });
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

	return useQuery({
		queryKey: ['teacher-prefs', organizationId || profile?.organization_id, teacherId, academicYearId],
		queryFn: async (): Promise<TeacherPreferenceRow[]> => {
			if (!user || !profile) return [];

			let query = (supabase as any)
				.from('teacher_timetable_preferences')
				.select('*')
				.is('deleted_at', null)
				.order('created_at', { ascending: false });

			const isSuperAdmin = profile.organization_id === null && profile.role === 'super_admin';
			if (isSuperAdmin) {
				if (organizationId) query = query.eq('organization_id', organizationId);
			} else {
				if (profile.organization_id) {
					query = query.eq('organization_id', profile.organization_id);
				} else {
					return [];
				}
			}
			if (teacherId) query = query.eq('teacher_id', teacherId);
			if (academicYearId) query = query.eq('academic_year_id', academicYearId);

			const { data, error } = await query;
			if (error) throw new Error(error.message);

			// Parse JSONB
			return (data || []).map((row: any) => ({
				...row,
				schedule_slot_ids: Array.isArray(row.schedule_slot_ids)
					? row.schedule_slot_ids
					: typeof row.schedule_slot_ids === 'string'
						? JSON.parse(row.schedule_slot_ids)
						: [],
			})) as TeacherPreferenceRow[];
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

			let organizationId = params.organization_id;
			if (organizationId === undefined) {
				if (profile.organization_id) {
					organizationId = profile.organization_id;
				} else if (profile.role === 'super_admin') {
					// Super admin can work with null organization_id (global preferences)
					organizationId = null;
				} else {
					throw new Error('User must be assigned to an organization');
				}
			}

			// Check if a preference exists (by teacher + academic_year + org)
			let query = (supabase as any)
				.from('teacher_timetable_preferences')
				.select('id')
				.eq('teacher_id', params.teacher_id)
				.eq('organization_id', organizationId)
				.is('deleted_at', null)
				.limit(1);
			if (params.academic_year_id) {
				query = query.eq('academic_year_id', params.academic_year_id);
			} else {
				query = query.is('academic_year_id', null);
			}
			const { data: existing, error: sErr } = await query;
			if (sErr) throw new Error(sErr.message);

			if (existing && existing.length > 0) {
				const prefId = existing[0].id;
				const { data, error } = await (supabase as any)
					.from('teacher_timetable_preferences')
					.update({
						schedule_slot_ids: params.schedule_slot_ids,
						is_active: params.is_active ?? true,
						notes: params.notes || null,
					})
					.eq('id', prefId)
					.select('*')
					.single();
				if (error) throw new Error(error.message);
				return data as TeacherPreferenceRow;
			}

			const { data, error } = await (supabase as any)
				.from('teacher_timetable_preferences')
				.insert({
					teacher_id: params.teacher_id,
					schedule_slot_ids: params.schedule_slot_ids,
					organization_id: organizationId,
					academic_year_id: params.academic_year_id || null,
					is_active: params.is_active ?? true,
					notes: params.notes || null,
				})
				.select('*')
				.single();
			if (error) throw new Error(error.message);
			return data as TeacherPreferenceRow;
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

			// Validate org access
			const { data: current } = await (supabase as any)
				.from('teacher_timetable_preferences')
				.select('organization_id')
				.eq('id', id)
				.is('deleted_at', null)
				.single();
			if (!current) throw new Error('Preference not found');
			if (profile.role !== 'super_admin' && current.organization_id !== profile.organization_id) {
				throw new Error('Cannot delete preference from different organization');
			}

			const { error } = await (supabase as any)
				.from('teacher_timetable_preferences')
				.update({ deleted_at: new Date().toISOString(), is_active: false })
				.eq('id', id);
			if (error) throw new Error(error.message);
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


