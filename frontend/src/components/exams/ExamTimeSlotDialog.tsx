import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { useProfile } from '@/hooks/useProfiles';
import { useClassSubjects } from '@/hooks/useSubjects';
import { parseLocalDate, dateToLocalYYYYMMDD } from '@/lib/dateUtils';
import { examTimeSlotSchema, type ExamTimeSlotFormValues } from '@/lib/validations/examTime';

export interface ExamTimeSlotClassOption {
  id: string;
  name: string;
  classAcademicYearId: string;
}

export interface ExamTimeSlotSubjectRow {
  id: string;
  classSubjectId: string;
  name: string;
  locked: boolean;
}

interface NamedOption {
  id: string;
  name: string;
}

interface ExamTimeSlotDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  openKey: string;
  classes: ExamTimeSlotClassOption[];
  rooms: NamedOption[];
  staff: NamedOption[];
  minDate?: Date;
  maxDate?: Date;
  initial: ExamTimeSlotFormValues;
  slotSubjects: ExamTimeSlotSubjectRow[];
  savedClassId?: string;
  canArrangeSubjects: boolean;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ExamTimeSlotFormValues) => void;
  onReorder?: (orderedIds: string[]) => void;
  onAddClassSubject?: (classSubjectId: string) => void;
  onRemoveSlotSubject?: (examTimeId: string) => void;
}

const emptySlotValues: ExamTimeSlotFormValues = {
  examClassId: '',
  classSubjectId: '',
  date: '',
  startTime: '',
  endTime: '',
  roomId: '',
  invigilatorId: '',
  notes: '',
};

export function ExamTimeSlotDialog({
  open,
  mode,
  openKey,
  classes,
  rooms,
  staff,
  minDate,
  maxDate,
  initial,
  slotSubjects,
  savedClassId,
  canArrangeSubjects,
  pending = false,
  onOpenChange,
  onSubmit,
  onReorder,
  onAddClassSubject,
  onRemoveSlotSubject,
}: ExamTimeSlotDialogProps) {
  const { t } = useLanguage();
  const { data: profile } = useProfile();
  const [subjectToAdd, setSubjectToAdd] = useState('');
  const initialRef = useRef(initial);
  initialRef.current = initial;

  const form = useForm<ExamTimeSlotFormValues>({
    resolver: zodResolver(examTimeSlotSchema),
    defaultValues: emptySlotValues,
  });

  const selectedClassId = useWatch({ control: form.control, name: 'examClassId' });
  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const { data: classSubjects = [], isLoading: classSubjectsLoading } = useClassSubjects(
    selectedClass?.classAcademicYearId,
    profile?.organization_id,
  );

  useEffect(() => {
    if (!open) return;
    form.reset(initialRef.current);
    setSubjectToAdd('');
  }, [open, openKey, form]);

  const availableToAdd = useMemo(
    () => classSubjects.filter((subject) => !slotSubjects.some((row) => row.classSubjectId === subject.id)),
    [classSubjects, slotSubjects],
  );

  const classMatchesSlot = !savedClassId || selectedClassId === savedClassId;
  const arrangeEnabled = canArrangeSubjects && classMatchesSlot;

  const moveSubject = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (!onReorder || nextIndex < 0 || nextIndex >= slotSubjects.length) return;
    const ordered = slotSubjects.map((row) => row.id);
    const [moved] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, moved);
    onReorder(ordered);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? (t('exams.addTimeSlot') || 'Add Time Slot')
              : (t('exams.editTimeSlot') || 'Edit Time Slot')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? (t('exams.addTimeSlotDescription') || 'Schedule a new exam session')
              : (t('exams.editTimeSlotDescription') || 'Update exam session details')}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('search.class') || 'Class'} *</Label>
              <Controller
                control={form.control}
                name="examClassId"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('classSubjectId', '');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('events.selectClass') || 'Select class'} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.examClassId && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.examClassId.message}</p>
              )}
            </div>
            <div>
              <Label>{t('exams.subject') || 'Subject'} *</Label>
              <Controller
                control={form.control}
                name="classSubjectId"
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={!selectedClassId || classSubjectsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('exams.selectSubject') || 'Select subject'} />
                    </SelectTrigger>
                    <SelectContent>
                      {classSubjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.subject?.name || t('exams.subject')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.classSubjectId && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.classSubjectId.message}</p>
              )}
              {!classSubjectsLoading && selectedClassId && classSubjects.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">{t('exams.noClassSubjects')}</p>
              )}
            </div>
          </div>

          <div>
            <Label>{t('events.date') || 'Date'} *</Label>
            <Controller
              control={form.control}
              name="date"
              render={({ field }) => (
                <CalendarDatePicker
                  date={field.value ? parseLocalDate(field.value) : undefined}
                  onDateChange={(date) => field.onChange(date ? dateToLocalYYYYMMDD(date) : '')}
                  minDate={minDate}
                  maxDate={maxDate}
                  placeholder={t('common.selectDate') || 'Select date'}
                  className="w-full"
                />
              )}
            />
            {form.formState.errors.date && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="slot-start-time">{t('exams.startTime') || 'Start Time'} *</Label>
              <Input id="slot-start-time" type="time" {...form.register('startTime')} />
              {form.formState.errors.startTime && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.startTime.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="slot-end-time">{t('exams.endTime') || 'End Time'} *</Label>
              <Input id="slot-end-time" type="time" {...form.register('endTime')} />
              {form.formState.errors.endTime && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.endTime.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('exams.room') || 'Room'}</Label>
              <Controller
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('exams.selectRoom') || 'Select room'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('events.none') || 'None'}</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>{t('exams.invigilator') || 'Invigilator'}</Label>
              <Controller
                control={form.control}
                name="invigilatorId"
                render={({ field }) => (
                  <Select value={field.value || 'none'} onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('exams.selectInvigilator') || 'Select invigilator'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('events.none') || 'None'}</SelectItem>
                      {staff.map((person) => (
                        <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="slot-notes">{t('events.notes') || 'Notes'}</Label>
            <Textarea id="slot-notes" rows={3} {...form.register('notes')} placeholder={t('exams.notesPlaceholder') || 'Optional notes...'} />
          </div>

          {mode === 'edit' && (
            <div className="space-y-2 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{t('exams.slotSubjects')}</p>
                <p className="text-xs text-muted-foreground">{t('exams.addClassSubjectHint')}</p>
              </div>
              {slotSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('exams.noClassSubjects')}</p>
              ) : (
                <ul className="space-y-1">
                  {slotSubjects.map((row, index) => (
                    <li key={row.id} className="flex items-center gap-1">
                      <span className="flex-1 truncate text-sm">{row.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!arrangeEnabled || index === 0 || pending}
                        aria-label={t('exams.moveSubjectUp')}
                        onClick={() => moveSubject(index, -1)}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!arrangeEnabled || index === slotSubjects.length - 1 || pending}
                        aria-label={t('exams.moveSubjectDown')}
                        onClick={() => moveSubject(index, 1)}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!arrangeEnabled || row.locked || pending}
                        aria-label={t('exams.removeSubjectFromSlot')}
                        onClick={() => onRemoveSlotSubject?.(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={subjectToAdd} onValueChange={setSubjectToAdd} disabled={!arrangeEnabled || availableToAdd.length === 0}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('exams.addClassSubject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableToAdd.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.subject?.name || t('exams.subject')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-shrink-0"
                  disabled={!arrangeEnabled || !subjectToAdd || pending}
                  onClick={() => {
                    onAddClassSubject?.(subjectToAdd);
                    setSubjectToAdd('');
                  }}
                >
                  {t('exams.addClassSubject')}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('events.cancel') || 'Cancel'}
            </Button>
            <Button type="submit" disabled={pending}>
              {mode === 'create' ? (t('events.create') || 'Create') : (t('events.save') || 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
