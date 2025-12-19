# Date Preferences System - Implementation Guide

## Overview

The Date Preferences system allows users to select their preferred calendar type (Gregorian, Hijri Shamsi, or Hijri Qamari) and automatically displays all dates throughout the application in the selected format.

**Key Features:**
- ✅ Supports 3 calendar types: Gregorian, Hijri Shamsi (Solar), Hijri Qamari (Lunar)
- ✅ Automatic conversion on the frontend
- ✅ Database always stores Gregorian dates
- ✅ Month names in multiple languages (en, fa, ps, ar)
- ✅ Minimal code changes required (wrapper components)
- ✅ User preference saved in localStorage
- ✅ Context-based global state management

---

## Quick Start

### 1. User Interface

Users can select their preferred calendar in **User Settings** page:
- Navigate to `/user-settings`
- Select from: Gregorian, Hijri Shamsi, or Hijri Qamari
- Preference is saved automatically

---

## For Developers

### Option 1: Wrapper Components (Easiest - Recommended)

Replace date display with wrapper components. **No formatting logic needed.**

#### Before:
```tsx
<TableCell>
  {formatDate(entry.date)}
</TableCell>
```

#### After:
```tsx
import { DateDisplay } from '@/components/ui/date-display';

<TableCell>
  <DateDisplay date={entry.date} />
</TableCell>
```

#### Available Components:

| Component | Use Case | Example |
|-----------|----------|---------|
| `<DateDisplay />` | Standard date display | Dec 10, 2025 |
| `<DateTimeDisplay />` | Date with time | Dec 10, 2025 3:30 PM |
| `<ShortDateDisplay />` | Short date format | Dec 10 |
| `<DateBadge />` | Date as a badge | 📅 Dec 10, 2025 |
| `<ShortDateBadge />` | Short date badge | 📅 Dec 10 |
| `<DateRangeDisplay />` | Date range | Dec 10 - Dec 15 |
| `<TableDateCell />` | Date in table cell | With proper styling |
| `<TableDateTimeCell />` | DateTime in table cell | With proper styling |

#### Full Examples:

```tsx
import {
  DateDisplay,
  DateTimeDisplay,
  ShortDateDisplay,
  DateBadge,
  DateRangeDisplay,
  TableDateCell,
} from '@/components/ui/date-display';

// Simple date display
<DateDisplay date={user.createdAt} />

// Date with time
<DateTimeDisplay date={document.issuedAt} />

// Short date (e.g., for compact tables)
<ShortDateDisplay date={exam.date} />

// Date as badge
<DateBadge date={certificate.validFrom} variant="secondary" />

// Date range
<DateRangeDisplay
  startDate={academicYear.startDate}
  endDate={academicYear.endDate}
  separator=" to "
/>

// In table cells
<TableCell>
  <TableDateCell date={entry.date} />
</TableCell>

// With fallback
<DateDisplay date={optionalDate} fallback="Not set" />

// With custom className
<DateDisplay date={date} className="text-blue-600 font-semibold" />
```

---

### Option 2: useDateFormatter Hook (More Control)

Use the hook when you need formatting logic in your component.

#### Before:
```tsx
import { format } from 'date-fns';

const formatted = format(new Date(exam.date), 'MMM dd, yyyy');
```

#### After:
```tsx
import { useDateFormatter } from '@/hooks/useDatePreference';

const { formatDate, formatDateTime, formatShortDate } = useDateFormatter();

const formatted = formatDate(exam.date);
const formattedWithTime = formatDateTime(exam.date);
const short = formatShortDate(exam.date);
```

#### Hook API:

```tsx
const {
  formatDate,        // (date) => "Dec 10, 2025"
  formatDateTime,    // (date) => "Dec 10, 2025 3:30 PM"
  formatShortDate,   // (date) => "Dec 10"
  calendar,          // Current calendar type
} = useDateFormatter();
```

---

### Option 3: Full Date Preference Context (Advanced)

Access the complete date preference context for advanced use cases.

```tsx
import { useDatePreference } from '@/hooks/useDatePreference';

const {
  calendar,          // 'gregorian' | 'hijri_shamsi' | 'hijri_qamari'
  setCalendar,       // (calendar: CalendarType) => void
  preference,        // Full preference object
  formatDate,        // Format functions
  formatDateTime,
  formatShortDate,
  getMonthName,      // (monthNumber, language, short) => string
  convertedDate,     // (date) => { year, month, day, calendar }
} = useDatePreference();

// Get month name in current calendar
const monthName = getMonthName(3, 'en', false); // "March" or "Jawza" or "Rabi al-Awwal"

// Get converted date object
const converted = convertedDate(new Date());
console.log(converted); // { year: 1403, month: 9, day: 19, calendar: 'hijri_shamsi' }
```

---

## Migration Guide

### Migrating Existing Pages

#### Step 1: Identify Date Displays

Search for:
- `formatDate()` calls
- `format()` from date-fns
- `.toLocaleDateString()`
- Direct date rendering

#### Step 2: Replace with Wrapper Components

**Tables:**
```tsx
// Before
<TableCell>{formatDate(entry.date)}</TableCell>

// After
import { DateDisplay } from '@/components/ui/date-display';
<TableCell><DateDisplay date={entry.date} /></TableCell>
```

**Badges:**
```tsx
// Before
<Badge>{format(new Date(cert.validFrom), 'PP')}</Badge>

// After
import { DateBadge } from '@/components/ui/date-display';
<DateBadge date={cert.validFrom} />
```

**Forms & Labels:**
```tsx
// Before
<div>{new Date(student.enrollmentDate).toLocaleDateString()}</div>

// After
import { DateDisplay } from '@/components/ui/date-display';
<div><DateDisplay date={student.enrollmentDate} /></div>
```

**Dialogs & Sidepanels:**
```tsx
// Before
<p>Created: {formatDate(item.createdAt)}</p>

// After
import { DateDisplay } from '@/components/ui/date-display';
<p>Created: <DateDisplay date={item.createdAt} /></p>
```

#### Step 3: Update Utility Functions

If you have custom date utilities, update them to use the formatter:

```tsx
// Before
export function formatDate(date: Date | string) {
  return format(date, 'MMM d, yyyy');
}

// After - Option A: Use the hook (in components only)
import { useDateFormatter } from '@/hooks/useDatePreference';
const { formatDate } = useDateFormatter();

// After - Option B: Make component use wrapper
// Replace utility calls with <DateDisplay /> component
```

---

## Common Use Cases

### 1. Finance Pages (Income/Expense Entries)

```tsx
import { TableDateCell } from '@/components/ui/date-display';

<TableCell>
  <TableDateCell date={entry.date} />
</TableCell>

<TableCell>
  <TableDateCell date={entry.createdAt} />
</TableCell>
```

### 2. Exam Pages

```tsx
import { ShortDateDisplay, DateTimeDisplay } from '@/components/ui/date-display';

// Exam schedule
<div className="text-sm">
  <ShortDateDisplay date={examTime.date} /> - {examTime.startTime} to {examTime.endTime}
</div>

// Exam attendance
<div>
  Checked in at: <DateTimeDisplay date={checkedInAt} />
</div>
```

### 3. Academic Year Management

```tsx
import { DateRangeDisplay } from '@/components/ui/date-display';

<TableCell>
  <DateRangeDisplay
    startDate={year.startDate}
    endDate={year.endDate}
    separator=" → "
  />
</TableCell>
```

### 4. Fee Structures & Exceptions

```tsx
import { DateDisplay } from '@/components/ui/date-display';

<TableCell>
  <DateDisplay date={exception.validFrom} fallback="-" />
</TableCell>

<TableCell>
  <DateDisplay date={exception.validTo} fallback="-" />
</TableCell>
```

### 5. Library & Document Management

```tsx
import { DateDisplay, DateBadge } from '@/components/ui/date-display';

// Borrowed date
<DateBadge date={book.borrowedAt} variant="secondary" />

// Due date
<DateBadge date={book.dueDate} variant="destructive" />

// Document issued date
<div className="text-sm text-muted-foreground">
  Issued: <DateDisplay date={document.issuedAt} />
</div>
```

### 6. Certificates & Graduation

```tsx
import { DateDisplay } from '@/components/ui/date-display';

// Certificate date on template
<DateDisplay date={certificate.issueDate} />

// Graduation batch date range
<DateRangeDisplay
  startDate={batch.startDate}
  endDate={batch.endDate}
/>
```

---

## Backend Integration (Optional)

Currently, the date preference is stored in localStorage. To persist it to the backend:

### Step 1: Update User Profile Schema

Add to backend user profile:

```php
// database/migrations/xxxx_add_date_preference_to_users.php
Schema::table('users', function (Blueprint $table) {
    $table->string('date_preference')->default('gregorian')->after('language');
});
```

### Step 2: Update Profile Update API

```php
// app/Http/Controllers/ProfileController.php
public function updatePreferences(Request $request)
{
    $validated = $request->validate([
        'language' => 'string|in:en,ps,fa,ar',
        'date_preference' => 'string|in:gregorian,hijri_shamsi,hijri_qamari',
    ]);

    auth()->user()->update($validated);

    return response()->json(['message' => 'Preferences updated']);
}
```

### Step 3: Sync with Backend in Frontend

Update the `DatePreferenceSettings` component to call the API:

```tsx
// Add mutation
const updatePreferenceMutation = useMutation({
  mutationFn: (datePreference: CalendarType) =>
    profileApi.updatePreferences({ date_preference: datePreference }),
});

// Call mutation when calendar changes
const handleCalendarChange = (value: string) => {
  setCalendar(value as CalendarType);
  updatePreferenceMutation.mutate(value as CalendarType);
};
```

---

## Testing

### Manual Testing Checklist

1. **Change Calendar Type:**
   - Go to User Settings
   - Select Gregorian → Check all pages display Gregorian dates
   - Select Hijri Shamsi → Check all pages display Shamsi dates
   - Select Hijri Qamari → Check all pages display Qamari dates

2. **Test Pages:**
   - [ ] Dashboard
   - [ ] Finance (Income/Expense entries)
   - [ ] Fees (Payments, Statements)
   - [ ] Exams (Timetable, Attendance, Reports)
   - [ ] Library (Books, Distribution, Reports)
   - [ ] Academic Years Management
   - [ ] Students (Admissions, Reports)
   - [ ] Certificates & Graduation
   - [ ] Documents (DMS)
   - [ ] Leave Management

3. **Test Components:**
   - [ ] Tables
   - [ ] Badges
   - [ ] Forms
   - [ ] Dialogs
   - [ ] Sidepanels
   - [ ] Reports
   - [ ] Print views

4. **Test Edge Cases:**
   - [ ] Invalid dates (should show fallback)
   - [ ] Null/undefined dates (should show fallback)
   - [ ] Future dates
   - [ ] Past dates
   - [ ] Leap year dates

---

## Performance Considerations

### Optimization Tips

1. **Use Wrapper Components:** They're memoized and optimized
2. **Avoid Unnecessary Re-renders:** Date formatting is cached
3. **Use Short Format:** For large tables with many dates
4. **Lazy Load:** Date components are tree-shakeable

### Bundle Size

- **jalaali-js**: ~5KB gzipped
- **Date components**: ~3KB gzipped
- **Total overhead**: ~8KB gzipped

---

## Troubleshooting

### Issue: Dates not converting

**Solution:** Ensure DatePreferenceProvider is added to `main.tsx`:
```tsx
<DatePreferenceProvider>
  <App />
</DatePreferenceProvider>
```

### Issue: Month names not showing correctly

**Solution:** Check that the language and calendar combination exists in `MONTH_NAMES` constant.

### Issue: Dates showing "Invalid Date"

**Solution:** Verify the date value is valid:
```tsx
// Add fallback
<DateDisplay date={maybeInvalidDate} fallback="No date" />
```

### Issue: Date picker not respecting calendar

**Note:** The date picker still uses Gregorian dates internally (as it's based on the browser's Date object). The display format will be converted, but input will be Gregorian.

For a fully integrated date picker, you would need to create a custom date picker component that understands different calendars.

---

## Example: Migrating a Complete Page

### Before (ExamAttendancePage.tsx):

```tsx
import { format } from 'date-fns';

// In component
<div className="text-sm">
  {format(new Date(time.date), 'MMM dd')} - {time.startTime} to {time.endTime}
</div>

<div className="text-lg">
  {format(new Date(selectedExamTime.date), 'MMM dd, yyyy')}
</div>

<div className="text-sm text-muted-foreground">
  {format(checkedInAt, 'pp')}
</div>
```

### After:

```tsx
import { ShortDateDisplay, DateDisplay, DateTimeDisplay } from '@/components/ui/date-display';

// In component
<div className="text-sm">
  <ShortDateDisplay date={time.date} /> - {time.startTime} to {time.endTime}
</div>

<div className="text-lg">
  <DateDisplay date={selectedExamTime.date} />
</div>

<div className="text-sm text-muted-foreground">
  <DateTimeDisplay date={checkedInAt} showTime={true} />
</div>
```

**Lines changed:** 3
**Time required:** < 2 minutes

---

## Bulk Migration Script (Optional)

For automated migration, you can use this regex pattern:

```bash
# Find all formatDate calls
grep -r "formatDate(" src/pages src/components

# Find all date-fns format calls
grep -r "format(new Date" src/pages src/components

# Find all toLocaleDateString calls
grep -r "toLocaleDateString()" src/pages src/components
```

Then use search & replace in your IDE:

**Pattern:** `formatDate\(([^)]+)\)`
**Replace:** `<DateDisplay date={$1} />`

(Remember to add import at the top)

---

## Summary

### Minimal Changes Required

| Approach | Effort | Pages Affected | Lines per Page |
|----------|--------|----------------|----------------|
| Wrapper Components | Low | All (~90) | 1-5 lines |
| Hook | Medium | All (~90) | 5-10 lines |
| Full Context | High | Few | 10+ lines |

### Recommended Approach

For **90+ pages** with **hundreds of dialogs/sidepanels**:

**Use Wrapper Components** (`<DateDisplay />`, `<DateBadge />`, etc.)

**Why?**
- ✅ Only 1-2 lines change per component
- ✅ No formatting logic needed
- ✅ Consistent across the app
- ✅ Easy to maintain
- ✅ TypeScript support
- ✅ Automatic error handling

**Time Estimate:**
- 5-10 minutes per page
- Total: 7-15 hours for all 90 pages
- Can be done incrementally

---

## Support

For issues or questions:
1. Check this guide first
2. Review `src/lib/datePreferences.ts` for constants
3. Check `src/lib/calendarConverter.ts` for conversion logic
4. Test with different calendar types in User Settings

---

## Changelog

### v1.0.0 (Initial Release)
- ✅ Gregorian calendar support
- ✅ Hijri Shamsi (Solar) support
- ✅ Hijri Qamari (Lunar) support
- ✅ Wrapper components
- ✅ useDateFormatter hook
- ✅ User settings UI
- ✅ localStorage persistence
- ✅ Month names in 4 languages (en, fa, ps, ar)
