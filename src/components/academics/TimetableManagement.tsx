import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CalendarClock, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { useClasses } from '@/hooks/useClasses';
import { useStaffByType } from '@/hooks/useStaff';
import { useCurrentOrganization } from '@/hooks/useOrganizations';
import { useAuth } from '@/hooks/useAuth';
import {
  useTeachingPeriods,
  useUpsertTeachingPeriod,
  useDeleteTeachingPeriod,
  useTeacherPeriodPreferences,
  useUpsertTeacherPreference,
  useDeleteTeacherPreference,
} from '@/hooks/useTeachingPeriods';
import {
  useTimetableEntries,
  useGenerateTimetable,
  useUpdateTimetableEntry,
  useDeleteTimetableEntry,
} from '@/hooks/useTimetable';
import type { TeachingPeriod, TeacherPeriodPreference, TimetableEntry } from '@/types/academics';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Switch } from '@/components/ui/switch';

const DAYS: TeachingPeriod['day_of_week'][] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const dayLabel = (t: ReturnType<typeof useLanguage>['t'], day: TeachingPeriod['day_of_week']) => {
  const map: Record<string, string> = {
    monday: t('academic.timetable.days.monday'),
    tuesday: t('academic.timetable.days.tuesday'),
    wednesday: t('academic.timetable.days.wednesday'),
    thursday: t('academic.timetable.days.thursday'),
    friday: t('academic.timetable.days.friday'),
    saturday: t('academic.timetable.days.saturday'),
    sunday: t('academic.timetable.days.sunday'),
  };
  return map[day] || day;
};

interface PeriodFormValues {
  id?: string;
  name: string;
  day_of_week: TeachingPeriod['day_of_week'];
  start_time: string;
  end_time: string;
  sort_order: number;
  is_break: boolean;
  max_parallel_classes: number;
}

export function TimetableManagement() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const { data: currentOrg } = useCurrentOrganization();
  const organizationId = currentOrg?.id ?? profile?.organization_id ?? undefined;
  const { data: periods, isLoading: periodsLoading } = useTeachingPeriods(organizationId);
  const { data: classes } = useClasses(organizationId);
  const { data: teachers } = useStaffByType('teacher', organizationId);
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined);
  const [selectedTeacher, setSelectedTeacher] = useState<string | undefined>(undefined);

  const { data: timetable, isLoading: timetableLoading } = useTimetableEntries(selectedClass, organizationId);
  const { data: teacherPrefs } = useTeacherPeriodPreferences(selectedTeacher, organizationId);

  const upsertPeriod = useUpsertTeachingPeriod();
  const deletePeriod = useDeleteTeachingPeriod();
  const upsertPreference = useUpsertTeacherPreference();
  const deletePreference = useDeleteTeacherPreference();
  const generateTimetable = useGenerateTimetable();
  const updateEntry = useUpdateTimetableEntry();
  const deleteEntry = useDeleteTimetableEntry();

  const periodForm = useForm<PeriodFormValues>({
    defaultValues: {
      name: '',
      day_of_week: 'monday',
      start_time: '08:00',
      end_time: '09:00',
      sort_order: 1,
      is_break: false,
      max_parallel_classes: 1,
    },
  });

  const teacherOptions = useMemo(
    () =>
      (teachers ?? []).map((teacher) => ({
        id: teacher.id,
        label: teacher.profile?.full_name || teacher.full_name || teacher.employee_id || t('academic.timetable.unknownTeacher'),
      })),
    [teachers, t]
  );

  const classOptions = useMemo(
    () =>
      (classes ?? []).map((cls) => ({
        id: cls.id,
        label: `${cls.name} (${cls.code})`,
      })),
    [classes]
  );

  const periodOptions = useMemo(
    () => (periods ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [periods]
  );

  const onSubmitPeriod = periodForm.handleSubmit(async (values) => {
    await upsertPeriod.mutateAsync({
      ...values,
      sort_order: Number(values.sort_order),
      max_parallel_classes: Number(values.max_parallel_classes),
      organization_id: organizationId,
    });
    periodForm.reset({
      name: '',
      day_of_week: values.day_of_week,
      start_time: values.start_time,
      end_time: values.end_time,
      sort_order: values.sort_order + 1,
      is_break: false,
      max_parallel_classes: values.max_parallel_classes,
    });
  });

  const teacherPreferenceMap = useMemo(() => {
    const map = new Map<string, TeacherPeriodPreference['preference']>();
    teacherPrefs?.forEach((pref) => map.set(pref.period_id, pref.preference));
    return map;
  }, [teacherPrefs]);

  const handlePreferenceChange = async (periodId: string, preference: 'preferred' | 'available' | 'unavailable') => {
    if (!selectedTeacher) {
      toast.error(t('academic.timetable.selectTeacherFirst'));
      return;
    }

    const existing = teacherPrefs?.find((pref) => pref.period_id === periodId);
    if (preference === 'available' && existing) {
      await deletePreference.mutateAsync(existing.id);
      return;
    }

    await upsertPreference.mutateAsync({
      id: existing?.id,
      teacher_staff_id: selectedTeacher,
      period_id: periodId,
      preference,
      organization_id: organizationId,
    });
  };

  const timetableByDay = useMemo(() => {
    const map = new Map<TeachingPeriod['day_of_week'], TimetableEntry[]>();
    timetable?.forEach((entry) => {
      if (!map.has(entry.day_of_week)) {
        map.set(entry.day_of_week, []);
      }
      map.get(entry.day_of_week)!.push(entry);
    });
    return map;
  }, [timetable]);

  const handleGenerate = async () => {
    await generateTimetable.mutateAsync({ classId: selectedClass, organizationId });
  };

  if (!organizationId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('academic.timetable.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{t('academic.timetable.selectOrganizationPrompt')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            {t('academic.timetable.title')}
          </h1>
          <p className="text-muted-foreground">{t('academic.timetable.description')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedClass ?? ''} onValueChange={(value) => setSelectedClass(value || undefined)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('academic.timetable.selectClass')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('academic.timetable.allClasses')}</SelectItem>
              {classOptions.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={generateTimetable.isPending || periodsLoading}>
            {generateTimetable.isPending ? t('academic.timetable.generating') : t('academic.timetable.generateButton')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('academic.periods.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmitPeriod} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('academic.periods.name')}</Label>
                <Input {...periodForm.register('name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>{t('academic.periods.day')}</Label>
                <Select value={periodForm.watch('day_of_week')} onValueChange={(value) => periodForm.setValue('day_of_week', value as TeachingPeriod['day_of_week'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {dayLabel(t, day)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('academic.periods.start')}</Label>
                <Input type="time" {...periodForm.register('start_time', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>{t('academic.periods.end')}</Label>
                <Input type="time" {...periodForm.register('end_time', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>{t('academic.periods.sortOrder')}</Label>
                <Input type="number" {...periodForm.register('sort_order', { valueAsNumber: true, required: true })} />
              </div>
              <div className="space-y-2">
                <Label>{t('academic.periods.maxParallel')}</Label>
                <Input type="number" min={1} {...periodForm.register('max_parallel_classes', { valueAsNumber: true })} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch checked={periodForm.watch('is_break')} onCheckedChange={(checked) => periodForm.setValue('is_break', checked)} />
                <Label className="leading-none">{t('academic.periods.isBreak')}</Label>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={upsertPeriod.isPending}>
                  {t('common.save')}
                </Button>
              </div>
            </form>
            {periodsLoading ? (
              <LoadingSpinner text={t('common.loading')} />
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('academic.periods.name')}</TableHead>
                      <TableHead>{t('academic.periods.day')}</TableHead>
                      <TableHead>{t('academic.periods.timeRange')}</TableHead>
                      <TableHead>{t('academic.periods.meta')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodOptions.map((period) => (
                      <TableRow key={period.id}>
                        <TableCell>{period.name}</TableCell>
                        <TableCell>{dayLabel(t, period.day_of_week)}</TableCell>
                        <TableCell>
                          {period.start_time} - {period.end_time}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <span>
                              {t('academic.periods.sortOrder')}: {period.sort_order}
                            </span>
                            <span>
                              {t('academic.periods.maxParallel')}: {period.max_parallel_classes}
                            </span>
                            {period.is_break && (
                              <Badge variant="outline">{t('academic.periods.break')}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => periodForm.reset(period as PeriodFormValues)}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deletePeriod.mutate(period.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('academic.timetable.preferencesTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('academic.timetable.selectTeacher')}</Label>
              <Select value={selectedTeacher ?? ''} onValueChange={(value) => setSelectedTeacher(value || undefined)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('academic.timetable.selectTeacher')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('academic.timetable.noTeacherSelected')}</SelectItem>
                  {teacherOptions.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTeacher ? (
              <div className="space-y-3 max-h-72 overflow-y-auto border rounded-md p-3">
                {periodOptions.map((period) => {
                  const pref = teacherPreferenceMap.get(period.id) ?? 'available';
                  return (
                    <div key={period.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{period.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {dayLabel(t, period.day_of_week)} · {period.start_time}-{period.end_time}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant={pref === 'preferred' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePreferenceChange(period.id, 'preferred')}
                        >
                          {t('academic.timetable.preferred')}
                        </Button>
                        <Button
                          variant={pref === 'available' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePreferenceChange(period.id, 'available')}
                        >
                          {t('academic.timetable.available')}
                        </Button>
                        <Button
                          variant={pref === 'unavailable' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePreferenceChange(period.id, 'unavailable')}
                        >
                          {t('academic.timetable.unavailable')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('academic.timetable.selectTeacherFirst')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>{t('academic.timetable.gridTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('academic.timetable.gridSubtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['timetable'] })}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              {t('academic.timetable.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timetableLoading ? (
            <LoadingSpinner text={t('common.loading')} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('academic.periods.day')}</TableHead>
                    <TableHead>{t('academic.periods.timeRange')}</TableHead>
                    <TableHead>{t('academic.timetable.class')}</TableHead>
                    <TableHead>{t('academic.timetable.subject')}</TableHead>
                    <TableHead>{t('academic.timetable.teacher')}</TableHead>
                    <TableHead>{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DAYS.flatMap((day) => {
                    const entries = timetableByDay.get(day) ?? [];
                    return entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{dayLabel(t, day)}</TableCell>
                        <TableCell>
                          {entry.start_time} - {entry.end_time}
                        </TableCell>
                        <TableCell>{entry.class?.name}</TableCell>
                        <TableCell>{entry.subject?.name}</TableCell>
                        <TableCell>{entry.teacher?.full_name || t('academic.timetable.unknownTeacher')}</TableCell>
                        <TableCell className="space-y-2">
                          {!entry.is_locked && (
                            <Select
                              value={entry.period_id}
                              onValueChange={(value) => {
                                const nextPeriod = periodOptions.find((p) => p.id === value);
                                if (nextPeriod) {
                                  updateEntry.mutate({
                                    id: entry.id,
                                    period_id: nextPeriod.id,
                                    day_of_week: nextPeriod.day_of_week,
                                    start_time: nextPeriod.start_time,
                                    end_time: nextPeriod.end_time,
                                  });
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={t('academic.periods.name')} />
                              </SelectTrigger>
                              <SelectContent>
                                {periodOptions.map((period) => (
                                  <SelectItem key={period.id} value={period.id}>
                                    {period.name} · {dayLabel(t, period.day_of_week)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateEntry.mutate({
                                id: entry.id,
                                period_id: entry.period_id,
                                day_of_week: entry.day_of_week,
                                start_time: entry.start_time,
                                end_time: entry.end_time,
                                is_locked: !entry.is_locked,
                                status: entry.is_locked ? 'draft' : 'locked',
                              })
                            }
                          >
                            {entry.is_locked ? t('academic.timetable.unlock') : t('academic.timetable.lock')}
                          </Button>
                          {!entry.is_locked && (
                            <Button size="icon" variant="ghost" onClick={() => deleteEntry.mutate(entry.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ));
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TimetableManagement;
