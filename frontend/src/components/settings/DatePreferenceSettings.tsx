/**
 * Date Preference Settings Component
 * Allows users to select their preferred calendar type
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from 'lucide-react';
import { useDatePreference } from '@/hooks/useDatePreference';
import { useLanguage } from '@/hooks/useLanguage';
import type { CalendarType } from '@/lib/datePreferences';
import { CALENDAR_TYPES } from '@/lib/datePreferences';
import { DateDisplay, DateTimeDisplay } from '@/components/ui/date-display';

export function DatePreferenceSettings() {
  const { calendar, setCalendar } = useDatePreference();
  const { t } = useLanguage();

  const calendarOptions: Array<{ value: CalendarType; label: string; description: string }> = [
    {
      value: CALENDAR_TYPES.GREGORIAN,
      label: 'Gregorian Calendar',
      description: 'Standard international calendar (January, February, March...)',
    },
    {
      value: CALENDAR_TYPES.HIJRI_SHAMSI,
      label: 'Hijri Shamsi (Solar)',
      description: 'Afghan/Iranian solar calendar (Hamal, Sawr, Jawza...)',
    },
    {
      value: CALENDAR_TYPES.HIJRI_QAMARI,
      label: 'Hijri Qamari (Lunar)',
      description: 'Islamic lunar calendar (Muharram, Safar, Rabi...)',
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
          <CardTitle>Date Format Preferences</CardTitle>
        </div>
        <CardDescription>
          Choose your preferred calendar system. All dates throughout the application will be displayed in your selected format.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calendar Type Selection */}
        <div className="space-y-4">
          <Label>Calendar System</Label>
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
          <p className="text-sm font-medium">Preview:</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">
                <DateDisplay date={sampleDate} />
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date & Time:</span>
              <span className="font-medium">
                <DateTimeDisplay date={sampleDate} />
              </span>
            </div>
          </div>
        </div>

        {/* Information Note */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Note:</strong> Your date preference is saved locally and will persist across sessions.
            This preference affects how dates are displayed in tables, forms, reports, and throughout the application.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
