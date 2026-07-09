import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';
import { dateToLocalYYYYMMDD, parseLocalDate } from '@/lib/dateUtils';
import { formatDate } from '@/lib/utils';

export interface ExamTimetableGenerateConfig {
  startDate: string;
  endDate: string;
  restDays: string[];
  startTime: string;
  endTime: string;
  assignRooms: boolean;
  assignInvigilators: boolean;
}

interface ExamTimetableGeneratePanelProps {
  defaultStartDate?: string;
  defaultEndDate?: string;
  disabled?: boolean;
  isGenerating?: boolean;
  onGenerate: (config: ExamTimetableGenerateConfig) => void;
}

export function ExamTimetableGeneratePanel({
  defaultStartDate,
  defaultEndDate,
  disabled,
  isGenerating,
  onGenerate,
}: ExamTimetableGeneratePanelProps) {
  const { t } = useLanguage();
  const [startDate, setStartDate] = useState(defaultStartDate ?? '');
  const [endDate, setEndDate] = useState(defaultEndDate ?? '');
  const [restDays, setRestDays] = useState<string[]>([]);
  const [restDayDraft, setRestDayDraft] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('11:00');
  const [assignRooms, setAssignRooms] = useState(false);
  const [assignInvigilators, setAssignInvigilators] = useState(false);

  useEffect(() => {
    if (defaultStartDate) setStartDate(defaultStartDate);
    if (defaultEndDate) setEndDate(defaultEndDate);
  }, [defaultStartDate, defaultEndDate]);

  const minDate = defaultStartDate ? parseLocalDate(defaultStartDate) : undefined;
  const maxDate = defaultEndDate ? parseLocalDate(defaultEndDate) : undefined;

  const addRestDay = () => {
    if (!restDayDraft) return;
    if (!restDays.includes(restDayDraft)) {
      setRestDays([...restDays, restDayDraft].sort());
    }
    setRestDayDraft('');
  };

  const removeRestDay = (day: string) => {
    setRestDays(restDays.filter((d) => d !== day));
  };

  const handleGenerate = () => {
    onGenerate({
      startDate,
      endDate,
      restDays,
      startTime,
      endTime,
      assignRooms,
      assignInvigilators,
    });
  };

  const canGenerate =
    !disabled &&
    !!startDate &&
    !!endDate &&
    !!startTime &&
    !!endTime &&
    startTime < endTime;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t('exams.generateSchedule') || 'Generate schedule'}
        </CardTitle>
        <CardDescription>
          {t('exams.generateScheduleDescription') ||
            'Auto-place subjects across exam days, then drag to adjust'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('exams.dateRange') || 'Date range'}</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <CalendarDatePicker
                date={startDate ? parseLocalDate(startDate) : undefined}
                onDateChange={(date) =>
                  setStartDate(date ? dateToLocalYYYYMMDD(date) : '')
                }
                minDate={minDate}
                maxDate={maxDate}
                disabled={disabled}
              />
              <CalendarDatePicker
                date={endDate ? parseLocalDate(endDate) : undefined}
                onDateChange={(date) =>
                  setEndDate(date ? dateToLocalYYYYMMDD(date) : '')
                }
                minDate={minDate}
                maxDate={maxDate}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('exams.defaultTime') || 'Default exam time'}</Label>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('exams.startTime') || 'Start time'}
                </Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('exams.endTime') || 'End time'}
                </Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('exams.restDays') || 'Rest days (no exams)'}</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {restDays.map((day) => (
              <Badge
                key={day}
                variant="outline"
                className="cursor-pointer"
                onClick={() => removeRestDay(day)}
              >
                {formatDate(parseLocalDate(day))} ×
              </Badge>
            ))}
            <div className="flex gap-2 items-center">
              <CalendarDatePicker
                date={restDayDraft ? parseLocalDate(restDayDraft) : undefined}
                onDateChange={(date) =>
                  setRestDayDraft(date ? dateToLocalYYYYMMDD(date) : '')
                }
                minDate={startDate ? parseLocalDate(startDate) : minDate}
                maxDate={endDate ? parseLocalDate(endDate) : maxDate}
                disabled={disabled}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRestDay}
                disabled={disabled || !restDayDraft}
              >
                {t('exams.addRestDay') || 'Add rest day'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={assignRooms}
                onCheckedChange={(v) => setAssignRooms(v === true)}
                disabled={disabled}
              />
              {t('exams.assignRooms') || 'Assign rooms'}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={assignInvigilators}
                onCheckedChange={(v) => setAssignInvigilators(v === true)}
                disabled={disabled}
              />
              {t('exams.assignInvigilators') || 'Assign invigilators'}
            </label>
          </div>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || isGenerating}
            className="flex-shrink-0"
            aria-label={t('exams.generate') || 'Generate'}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">
              {t('exams.generate') || 'Generate'}
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
