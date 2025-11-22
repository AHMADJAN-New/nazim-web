import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import type {
  TeachingPeriod,
  TimetableEntry,
  TimetableGenerationResult,
} from '@/types/academics';

const DAY_ORDER: TeachingPeriod['day_of_week'][] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

interface GenerateTimetablePayload {
  classId?: string;
  organizationId?: string;
}

interface UpdateTimetablePayload {
  id: string;
  period_id: string;
  day_of_week: TeachingPeriod['day_of_week'];
  start_time: string;
  end_time: string;
  is_locked?: boolean;
  status?: TimetableEntry['status'];
}

const sortPeriods = (periods: TeachingPeriod[]) =>
  [...periods].sort((a, b) => {
    const dayDiff = DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week);
    if (dayDiff !== 0) return dayDiff;
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return a.start_time.localeCompare(b.start_time);
  });

export const useTimetableEntries = (classId?: string, organizationIdParam?: string) => {
  const { profile } = useAuth();
  const organizationId = organizationIdParam ?? profile?.organization_id ?? null;

  return useQuery({
    queryKey: ['timetable', organizationId, classId],
    queryFn: async (): Promise<TimetableEntry[]> => {
      if (!organizationId) {
        return [];
      }

      let query = (supabase as any)
        .from('timetable_entries')
        .select(`
          *,
          subject:subjects(id, name, code, color),
          class:classes(id, name, code),
          teacher:staff(id, full_name, employee_id),
          period:teaching_periods(*)
        `)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      query = query.eq('organization_id', organizationId);
      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as TimetableEntry[];
    },
    enabled: !!profile?.role && !!organizationId,
  });
};

const buildPreferenceMaps = (preferences: Array<{ teacher_staff_id: string; period_id: string; preference: string }>) => {
  const result = new Map<string, Map<string, string>>();
  preferences.forEach((pref) => {
    if (!result.has(pref.teacher_staff_id)) {
      result.set(pref.teacher_staff_id, new Map());
    }
    result.get(pref.teacher_staff_id)?.set(pref.period_id, pref.preference);
  });
  return result;
};

const slotKey = (id: string | null | undefined, day: string, periodId: string) =>
  `${id || 'org'}-${day}-${periodId}`;

const SCORE = {
  preferred: 3,
  available: 1,
  default: 0,
};

const computeSchedule = ({
  assignments,
  periods,
  preferences,
  lockedEntries,
}: {
  assignments: Array<any>;
  periods: TeachingPeriod[];
  preferences: ReturnType<typeof buildPreferenceMaps>;
  lockedEntries: TimetableEntry[];
}) => {
  const orderedPeriods = sortPeriods(periods).filter((period) => !period.is_break);
  const classBusy = new Set<string>();
  const teacherBusy = new Set<string>();
  const periodLoad = new Map<string, number>();
  const generation: Array<{
    class_id: string;
    subject_id: string;
    teacher_staff_id: string;
    period: TeachingPeriod;
    sessions: number;
  }> = [];
  const unassigned: TimetableGenerationResult['unassigned'] = [];

  lockedEntries.forEach((entry) => {
    const classKey = slotKey(entry.class_id, entry.day_of_week, entry.period_id);
    const teacherKey = slotKey(entry.teacher_staff_id, entry.day_of_week, entry.period_id);
    classBusy.add(classKey);
    teacherBusy.add(teacherKey);
    periodLoad.set(entry.period_id, (periodLoad.get(entry.period_id) ?? 0) + 1);
  });

  assignments.forEach((assignment) => {
    const sessions = assignment.sessions_per_week ?? 1;
    const assignedDays = new Set<string>();
    let created = 0;

    while (created < sessions) {
      let bestSlot: TeachingPeriod | null = null;
      let bestScore = -Infinity;

      for (const period of orderedPeriods) {
        if (period.max_parallel_classes > 0 && (periodLoad.get(period.id) ?? 0) >= period.max_parallel_classes) {
          continue;
        }

        const classKeyVal = slotKey(assignment.class_id, period.day_of_week, period.id);
        const teacherKeyVal = slotKey(assignment.teacher_staff_id, period.day_of_week, period.id);
        if (classBusy.has(classKeyVal) || teacherBusy.has(teacherKeyVal)) {
          continue;
        }

        const pref = preferences.get(assignment.teacher_staff_id)?.get(period.id) ?? 'available';
        if (pref === 'unavailable') continue;

        let score = pref === 'preferred' ? SCORE.preferred : SCORE.available;
        if (!assignedDays.has(period.day_of_week)) {
          score += 2;
        }
        score -= orderedPeriods.indexOf(period) * 0.001;

        if (score > bestScore) {
          bestScore = score;
          bestSlot = period;
        }
      }

      if (!bestSlot) {
        unassigned.push({
          classId: assignment.class_id,
          subjectId: assignment.subject_id,
          teacherId: assignment.teacher_staff_id,
          reason: 'No available period without conflict',
        });
        break;
      }

      generation.push({
        class_id: assignment.class_id,
        subject_id: assignment.subject_id,
        teacher_staff_id: assignment.teacher_staff_id,
        period: bestSlot,
        sessions,
      });

      classBusy.add(slotKey(assignment.class_id, bestSlot.day_of_week, bestSlot.id));
      teacherBusy.add(slotKey(assignment.teacher_staff_id, bestSlot.day_of_week, bestSlot.id));
      assignedDays.add(bestSlot.day_of_week);
      periodLoad.set(bestSlot.id, (periodLoad.get(bestSlot.id) ?? 0) + 1);
      created += 1;
    }
  });

  return { generation, unassigned };
};

export const useGenerateTimetable = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ classId, organizationId }: GenerateTimetablePayload) => {
      const orgId = organizationId ?? profile?.organization_id ?? null;
      if (!orgId) {
        throw new Error('Organization context is required');
      }

      let assignmentsQuery = (supabase as any)
        .from('class_subjects')
        .select(`
          id,
          class_id,
          subject_id,
          teacher_staff_id,
          sessions_per_week,
          class:classes(id, name, code),
          subject:subjects(id, name, code, color)
        `);

      if (orgId) {
        assignmentsQuery = assignmentsQuery.eq('organization_id', orgId);
      }
      if (classId) {
        assignmentsQuery = assignmentsQuery.eq('class_id', classId);
      }

      const [{ data: assignments, error: assignmentsError }, { data: periods, error: periodsError }, { data: preferences, error: preferencesError }, { data: locked, error: lockedError }] =
        await Promise.all([
          assignmentsQuery,
          (supabase as any)
            .from('teaching_periods')
            .select('*')
            .eq('organization_id', orgId)
            .order('day_of_week')
            .order('sort_order'),
          (supabase as any)
            .from('teacher_period_preferences')
            .select('teacher_staff_id, period_id, preference')
            .eq('organization_id', orgId),
          (supabase as any)
            .from('timetable_entries')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_locked', true),
        ]);

      if (assignmentsError) throw new Error(assignmentsError.message);
      if (periodsError) throw new Error(periodsError.message);
      if (preferencesError) throw new Error(preferencesError.message);
      if (lockedError) throw new Error(lockedError.message);

      if (!periods || periods.length === 0) {
        throw new Error('Define teaching periods before generating a timetable.');
      }

      const prefMap = buildPreferenceMaps(preferences || []);
      const { generation, unassigned } = computeSchedule({
        assignments: assignments || [],
        periods: periods || [],
        preferences: prefMap,
        lockedEntries: locked || [],
      });

      if (generation.length === 0) {
        return { created: 0, skippedLocked: locked?.length ?? 0, unassigned };
      }

      let deleteQuery = (supabase as any)
        .from('timetable_entries')
        .delete()
        .eq('organization_id', orgId)
        .eq('is_locked', false);

      if (classId) {
        deleteQuery = deleteQuery.eq('class_id', classId);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      const payload = generation.map((item) => ({
        organization_id: orgId,
        class_id: item.class_id,
        subject_id: item.subject_id,
        teacher_staff_id: item.teacher_staff_id,
        period_id: item.period.id,
        day_of_week: item.period.day_of_week,
        start_time: item.period.start_time,
        end_time: item.period.end_time,
        status: 'draft',
        is_locked: false,
      }));

      const { error: insertError } = await (supabase as any)
        .from('timetable_entries')
        .insert(payload);

      if (insertError) {
        throw new Error(insertError.message);
      }

      return {
        created: payload.length,
        skippedLocked: locked?.length ?? 0,
        unassigned,
      } as TimetableGenerationResult;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      toast.success(`Generated ${result.created} slots${result.unassigned.length ? `, ${result.unassigned.length} unassigned` : ''}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to generate timetable');
    },
  });
};

export const useUpdateTimetableEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTimetablePayload) => {
      const { data, error } = await (supabase as any)
        .from('timetable_entries')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as TimetableEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      toast.success('Timetable entry updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update entry');
    },
  });
};

export const useDeleteTimetableEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('timetable_entries')
        .delete()
        .eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      toast.success('Timetable entry removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove entry');
    },
  });
};
