import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Lock } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import {
  canMoveExamEntry,
  type ExamSolverEntry,
} from '@/lib/examTimetableSolver';
import { showToast } from '@/lib/toast';
import { parseLocalDate } from '@/lib/dateUtils';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export interface ExamTimetableBoardClass {
  id: string;
  name: string;
}

interface ExamTimetableBoardProps {
  classes: ExamTimetableBoardClass[];
  /** All calendar days in range (including rest days) */
  allDays: string[];
  restDays: string[];
  entries: ExamSolverEntry[];
  dirty: boolean;
  isApplying?: boolean;
  disabled?: boolean;
  onEntriesChange: (entries: ExamSolverEntry[]) => void;
  onApply: () => void;
  onDiscard: () => void;
}

function DraggableChip({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        'rounded-md bg-primary/10 border border-primary/20 p-2 text-xs space-y-0.5',
        disabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      )}
    >
      <div className="flex items-start gap-1">
        {!disabled && (
          <button
            type="button"
            className="mt-0.5 text-muted-foreground"
            aria-label="Drag"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        )}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function DroppableCell({
  id,
  isRest,
  children,
}: {
  id: string;
  isRest: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: isRest });

  return (
    <td
      ref={setNodeRef}
      className={cn(
        'border p-1.5 align-top min-w-[110px] h-[72px]',
        isRest && 'bg-muted/40',
        isOver && !isRest && 'bg-primary/5 ring-2 ring-primary/30 ring-inset'
      )}
    >
      {children}
    </td>
  );
}

export function ExamTimetableBoard({
  classes,
  allDays,
  restDays,
  entries,
  dirty,
  isApplying,
  disabled,
  onEntriesChange,
  onApply,
  onDiscard,
}: ExamTimetableBoardProps) {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const restSet = useMemo(() => new Set(restDays), [restDays]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const entryByKey = useMemo(() => {
    const map = new Map<string, { entry: ExamSolverEntry; index: number }>();
    entries.forEach((entry, index) => {
      map.set(`${entry.examClassId}|${entry.date}`, { entry, index });
    });
    return map;
  }, [entries]);

  const activeEntry = useMemo(() => {
    if (!activeId?.startsWith('entry-')) return null;
    const index = Number(activeId.replace('entry-', ''));
    return entries[index] ?? null;
  }, [activeId, entries]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || disabled) return;

    const activeStr = String(active.id);
    const overStr = String(over.id);
    if (!activeStr.startsWith('entry-') || !overStr.startsWith('cell-')) return;

    const entryIndex = Number(activeStr.replace('entry-', ''));
    const parts = overStr.replace('cell-', '').split('|');
    if (parts.length < 2) return;
    const targetClassId = parts[0];
    const targetDate = parts.slice(1).join('|');

    const entry = entries[entryIndex];
    if (!entry || entry.isLocked) return;
    // Only allow moving within the same class row
    if (entry.examClassId !== targetClassId) return;

    if (restSet.has(targetDate)) {
      showToast.error(t('exams.moveRestDayBlocked') || 'Cannot place an exam on a rest day');
      return;
    }

    if (!canMoveExamEntry(entries, entryIndex, targetDate, restDays)) {
      showToast.error(
        t('exams.moveConflict') || 'Cannot move: this class already has an exam on that day'
      );
      return;
    }

    if (entry.date === targetDate) return;

    const next = entries.map((e, i) =>
      i === entryIndex ? { ...e, date: targetDate } : e
    );
    onEntriesChange(next);
  };

  if (allDays.length === 0 || classes.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{t('exams.timetable') || 'Exam Timetable'}</CardTitle>
            <CardDescription>
              {dirty
                ? t('exams.unsavedScheduleChanges') || 'You have unsaved timetable changes'
                : t('exams.timetableDescription') || 'Manage exam timetable and schedule'}
            </CardDescription>
          </div>
          {dirty && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDiscard}
                disabled={isApplying || disabled}
              >
                {t('exams.discardChanges') || 'Discard'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onApply}
                disabled={isApplying || disabled}
              >
                {t('exams.applySchedule') || 'Apply schedule'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="border p-2 text-left sticky left-0 bg-muted/50 z-10 min-w-[100px]">
                    {t('exams.boardClass') || 'Class'}
                  </th>
                  {allDays.map((day) => {
                    const isRest = restSet.has(day);
                    return (
                      <th
                        key={day}
                        className={cn(
                          'border p-2 text-center font-medium whitespace-nowrap',
                          isRest && 'text-muted-foreground bg-muted/30'
                        )}
                      >
                        <div>{formatDate(parseLocalDate(day))}</div>
                        {isRest && (
                          <div className="text-[10px] font-normal">
                            {t('exams.restDay') || 'Rest'}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {classes.map((cls) => (
                  <tr key={cls.id}>
                    <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                      {cls.name}
                    </td>
                    {allDays.map((day) => {
                      const isRest = restSet.has(day);
                      const cellId = `cell-${cls.id}|${day}`;
                      const found = entryByKey.get(`${cls.id}|${day}`);
                      return (
                        <DroppableCell key={cellId} id={cellId} isRest={isRest}>
                          {found && (
                            <DraggableChip
                              id={`entry-${found.index}`}
                              disabled={disabled || found.entry.isLocked}
                            >
                              <div className="font-medium truncate flex items-center gap-1">
                                {found.entry.subjectName || found.entry.subjectId}
                                {found.entry.isLocked && (
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <div className="text-muted-foreground">
                                {found.entry.startTime.slice(0, 5)}–{found.entry.endTime.slice(0, 5)}
                              </div>
                            </DraggableChip>
                          )}
                        </DroppableCell>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <DragOverlay>
              {activeEntry ? (
                <div className="rounded-md bg-primary/15 border border-primary/30 p-2 text-xs shadow-lg">
                  <div className="font-medium">
                    {activeEntry.subjectName || activeEntry.subjectId}
                  </div>
                  <div className="text-muted-foreground">
                    {activeEntry.startTime.slice(0, 5)}–{activeEntry.endTime.slice(0, 5)}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
        {dirty && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary">
              {t('exams.unsavedScheduleChanges') || 'Unsaved changes'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
