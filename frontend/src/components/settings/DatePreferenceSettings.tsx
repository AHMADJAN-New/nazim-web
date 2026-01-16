/**
 * Date Preference Settings Component
 * Allows users to select their preferred calendar type
 */

import { Calendar } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateDisplay, DateTimeDisplay } from '@/components/ui/date-display';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDatePreference } from '@/hooks/useDatePreference';
import { useLanguage } from '@/hooks/useLanguage';
import type { CalendarType } from '@/lib/datePreferences';
import { CALENDAR_TYPES } from '@/lib/datePreferences';

export function DatePreferenceSettings() {
  const { calendar, setCalendar } = useDatePreference();
  const { t } = useLanguage();

  const calendarOptions: Array<{ value: CalendarType; label: string; description: string }> = [
    {
      value: CALENDAR_TYPES.GREGORIAN,
      label: t('settings.datePreferences.gregorian.label'),
      description: t('settings.datePreferences.gregorian.description'),
    },
    {
      value: CALENDAR_TYPES.HIJRI_SHAMSI,
      label: t('settings.datePreferences.hijriShamsi.label'),
      description: t('settings.datePreferences.hijriShamsi.description'),
    },
    {
      value: CALENDAR_TYPES.HIJRI_QAMARI,
      label: t('settings.datePreferences.hijriQamari.label'),
      description: t('settings.datePreferences.hijriQamari.description'),
    },
  ];

  const handleCalendarChange = (value: string) => {
    setCalendar(value as CalendarType);
  };

  // Sample date for preview
  const sampleDate = new Date();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>{t('settings.datePreferences.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('settings.datePreferences.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calendar Type Selection */}
        <div className="space-y-4">
          <Label>{t('settings.datePreferences.calendarSystem')}</Label>
          <RadioGroup value={calendar} onValueChange={handleCalendarChange}>
            {calendarOptions.map((option) => (
              <div key={option.value} className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value={option.value} id={option.value} />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor={option.value}
                    className="font-medium cursor-pointer"
                  >
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Preview Section */}
        <div className="space-y-3 rounded-lg bg-muted p-4">
          <p className="text-sm font-medium">{t('settings.datePreferences.preview')}</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.datePreferences.date')}</span>
              <span className="font-medium">
                <DateDisplay date={sampleDate} />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('settings.datePreferences.dateTime')}</span>
              <span className="font-medium">
                <DateTimeDisplay date={sampleDate} />
              </span>
            </div>
          </div>
        </div>

        {/* Information Note */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>{t('settings.datePreferences.note')}</strong> {t('settings.datePreferences.noteText')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
