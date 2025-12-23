# Calendar Date Picker Guide

## 🎯 Overview

Calendar-aware date pickers that automatically display dates in the user's preferred calendar (Gregorian, Hijri Shamsi, or Hijri Qamari) while storing Gregorian dates in the database.

---

## 📦 Available Components

### 1. CalendarDatePicker
Basic date picker with calendar awareness.

### 2. CalendarInput
Styled as an input field (alias for CalendarDatePicker).

### 3. CalendarDateRangePicker
For selecting date ranges (start and end dates).

### 4. CalendarFormField
Integrated with react-hook-form.

### 5. CalendarRangeFormField
Date range integrated with react-hook-form.

---

## 🚀 Quick Start

### Basic Usage

```tsx
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';

function MyComponent() {
  const [date, setDate] = useState<Date>();

  return (
    <CalendarDatePicker
      date={date}
      onDateChange={setDate}
      placeholder="Pick a date"
    />
  );
}
```

### With React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import { CalendarFormField } from '@/components/ui/calendar-form-field';

function MyForm() {
  const form = useForm({
    defaultValues: {
      startDate: new Date(),
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <CalendarFormField
        control={form.control}
        name="startDate"
        label="Start Date"
        placeholder="Select start date"
        required
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

---

## 📝 Migration Examples

### Example 1: Simple Date Input

**Before:**
```tsx
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

function DateField() {
  const [date, setDate] = useState<Date>();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : 'Pick a date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Calendar mode="single" selected={date} onSelect={setDate} />
      </PopoverContent>
    </Popover>
  );
}
```

**After:**
```tsx
import { CalendarDatePicker } from '@/components/ui/calendar-date-picker';

function DateField() {
  const [date, setDate] = useState<Date>();

  return (
    <CalendarDatePicker
      date={date}
      onDateChange={setDate}
      placeholder="Pick a date"
    />
  );
}
```

**Changes:**
- 1 import instead of 5
- 5 lines instead of 15
- Automatic calendar conversion
- Cleaner code

---

### Example 2: Form with Date Field

**Before:**
```tsx
import { useForm } from 'react-hook-form';
import { Calendar } from '@/components/ui/calendar';
import { Popover } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';

function StudentForm() {
  const form = useForm();

  return (
    <form>
      <FormField
        control={form.control}
        name="enrollmentDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Enrollment Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant="outline">
                    {field.value ? format(field.value, 'PPP') : 'Select date'}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                />
              </PopoverContent>
            </Popover>
          </FormItem>
        )}
      />
    </form>
  );
}
```

**After:**
```tsx
import { useForm } from 'react-hook-form';
import { CalendarFormField } from '@/components/ui/calendar-form-field';

function StudentForm() {
  const form = useForm();

  return (
    <form>
      <CalendarFormField
        control={form.control}
        name="enrollmentDate"
        label="Enrollment Date"
        placeholder="Select enrollment date"
        required
      />
    </form>
  );
}
```

**Changes:**
- 2 imports instead of 6
- 12 lines instead of 27
- Automatic calendar conversion
- Built-in validation UI

---

### Example 3: Date Range Picker

**Before:**
```tsx
function DateRangePicker() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            {startDate ? format(startDate, 'PPP') : 'Start date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={setStartDate}
            disabled={(date) => endDate ? date > endDate : false}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            {endDate ? format(endDate, 'PPP') : 'End date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={setEndDate}
            disabled={(date) => startDate ? date < startDate : false}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

**After:**
```tsx
import { CalendarDateRangePicker } from '@/components/ui/calendar-date-picker';

function DateRangePicker() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  return (
    <CalendarDateRangePicker
      startDate={startDate}
      endDate={endDate}
      onStartDateChange={setStartDate}
      onEndDateChange={setEndDate}
      startPlaceholder="Start date"
      endPlaceholder="End date"
    />
  );
}
```

**Changes:**
- 1 import instead of 4
- 12 lines instead of 35
- Automatic calendar conversion
- Built-in min/max date logic

---

## 🎨 Advanced Usage

### With Min/Max Dates

```tsx
<CalendarDatePicker
  date={date}
  onDateChange={setDate}
  minDate={new Date('2024-01-01')}
  maxDate={new Date('2025-12-31')}
  placeholder="Select date (2024-2025)"
/>
```

### With Custom Styling

```tsx
<CalendarDatePicker
  date={date}
  onDateChange={setDate}
  className="w-full md:w-64"
  placeholder="Custom width date picker"
/>
```

### Disabled State

```tsx
<CalendarDatePicker
  date={date}
  onDateChange={setDate}
  disabled={isLoading}
  placeholder="Disabled while loading"
/>
```

### In Dialog/Modal

```tsx
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Select Date</DialogTitle>
    </DialogHeader>
    <CalendarDatePicker
      date={selectedDate}
      onDateChange={setSelectedDate}
      placeholder="Pick a date"
    />
  </DialogContent>
</Dialog>
```

### With react-hook-form Validation

```tsx
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date({
    required_error: 'End date is required',
  }),
}).refine(
  (data) => data.endDate > data.startDate,
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
);

function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <CalendarFormField
        control={form.control}
        name="startDate"
        label="Start Date"
        required
      />
      <CalendarFormField
        control={form.control}
        name="endDate"
        label="End Date"
        required
      />
    </form>
  );
}
```

---

## 🔍 How It Works

### Display vs Storage

```
User sees:     "Hamal 15, 1403" (Hijri Shamsi)
                     ↕
Database gets:  "2024-04-03" (Gregorian)
```

### The Flow:

1. **User selects calendar preference** in settings
2. **CalendarDatePicker reads preference** from global state
3. **User picks a date** from calendar
4. **Component stores Gregorian date** (for database)
5. **Display shows preferred calendar** format

### Key Points:

✅ **Storage:** Always Gregorian (Date object)
✅ **Display:** User's preferred calendar
✅ **Database:** No changes needed
✅ **Conversion:** Automatic
✅ **Month names:** Localized

---

## 📋 Common Use Cases

### 1. Academic Year Management

```tsx
<CalendarFormField
  control={form.control}
  name="startDate"
  label="Academic Year Start"
  minDate={new Date(new Date().getFullYear(), 0, 1)}
  maxDate={new Date(new Date().getFullYear(), 11, 31)}
  required
/>
```

### 2. Student Enrollment

```tsx
<CalendarFormField
  control={form.control}
  name="enrollmentDate"
  label="Enrollment Date"
  maxDate={new Date()} // Can't enroll in future
  required
/>
```

### 3. Fee Payment Dates

```tsx
<CalendarDateRangePicker
  startDate={filters.startDate}
  endDate={filters.endDate}
  onStartDateChange={(date) => setFilters({ ...filters, startDate: date })}
  onEndDateChange={(date) => setFilters({ ...filters, endDate: date })}
  startPlaceholder="Payment from"
  endPlaceholder="Payment to"
/>
```

### 4. Exam Schedules

```tsx
<CalendarFormField
  control={form.control}
  name="examDate"
  label="Exam Date"
  minDate={new Date()} // Future dates only
  description="Select the date for this exam"
  required
/>
```

### 5. Library Book Due Dates

```tsx
<CalendarDatePicker
  date={dueDate}
  onDateChange={setDueDate}
  minDate={new Date()} // Can't be in past
  maxDate={addDays(new Date(), 30)} // Max 30 days from now
  placeholder="Due date"
/>
```

---

## 🧪 Testing

### Manual Testing Checklist

1. **Change calendar type** in User Settings
2. **Open date picker** in a form
3. **Verify** month names match selected calendar
4. **Select a date**
5. **Verify** display shows in selected calendar
6. **Submit form**
7. **Verify** database receives Gregorian date
8. **Reload page**
9. **Verify** date displays in selected calendar

### Test Different Calendars

- [ ] Gregorian: "Dec 10, 2025"
- [ ] Hijri Shamsi: "Hamal 15, 1403"
- [ ] Hijri Qamari: "Muharram 12, 1447"

---

## 🐛 Troubleshooting

### Issue: Month names not changing

**Solution:** Make sure DatePreferenceProvider is in main.tsx:
```tsx
<DatePreferenceProvider>
  <App />
</DatePreferenceProvider>
```

### Issue: Date picker not opening

**Solution:** Check that Popover components are installed:
```bash
npm install @radix-ui/react-popover
```

### Issue: Form validation not working

**Solution:** Make sure you're using CalendarFormField with react-hook-form:
```tsx
<CalendarFormField control={form.control} name="date" />
```

### Issue: Date shows "Invalid Date"

**Solution:** Ensure the date value is a valid Date object:
```tsx
// ✅ Good
const date = new Date('2024-01-01');

// ❌ Bad
const date = '2024-01-01'; // String, not Date
```

---

## 📊 Migration Effort

| Component Type | Before (Lines) | After (Lines) | Time Saved |
|----------------|----------------|---------------|------------|
| Basic Date Picker | ~15 | ~5 | 2-3 min |
| Form Date Field | ~25 | ~8 | 5-7 min |
| Date Range Picker | ~35 | ~10 | 8-10 min |

**Estimated time per page:** 5-15 minutes
**Total for 90+ pages:** 7-22 hours

---

## 🎁 Benefits

### Code Quality
- ✅ Less boilerplate
- ✅ Consistent API
- ✅ Type-safe
- ✅ Easier to maintain

### User Experience
- ✅ Automatic calendar conversion
- ✅ Localized month names
- ✅ Familiar UI patterns
- ✅ Accessible

### Developer Experience
- ✅ Drop-in replacement
- ✅ Works with react-hook-form
- ✅ Well-documented
- ✅ Easy to test

---

## 📚 API Reference

### CalendarDatePicker

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `date` | `Date \| undefined` | - | Selected date (Gregorian) |
| `onDateChange` | `(date?: Date) => void` | - | Callback when date changes |
| `placeholder` | `string` | `'Pick a date'` | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |
| `className` | `string` | - | Custom class name |
| `minDate` | `Date` | - | Minimum selectable date |
| `maxDate` | `Date` | - | Maximum selectable date |

### CalendarFormField

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `control` | `Control<TFieldValues>` | - | React Hook Form control |
| `name` | `FieldPath<TFieldValues>` | - | Field name |
| `label` | `string` | - | Field label |
| `description` | `string` | - | Help text |
| `placeholder` | `string` | - | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |
| `required` | `boolean` | `false` | Required indicator |
| `minDate` | `Date` | - | Minimum selectable date |
| `maxDate` | `Date` | - | Maximum selectable date |
| `className` | `string` | - | Custom class name |

### CalendarDateRangePicker

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `startDate` | `Date \| undefined` | - | Start date |
| `endDate` | `Date \| undefined` | - | End date |
| `onStartDateChange` | `(date?: Date) => void` | - | Start date callback |
| `onEndDateChange` | `(date?: Date) => void` | - | End date callback |
| `startPlaceholder` | `string` | `'Start date'` | Start placeholder |
| `endPlaceholder` | `string` | `'End date'` | End placeholder |
| `disabled` | `boolean` | `false` | Disabled state |
| `className` | `string` | - | Custom class name |

---

## 🚀 Summary

**Before:** Complex date picker setup with manual calendar handling
**After:** Simple, calendar-aware components that just work

**Migration:** Optional - existing date pickers still work
**Recommendation:** Migrate new features first, then gradually update existing code

**Result:** Consistent, calendar-aware date pickers across all 90+ pages with minimal effort!
