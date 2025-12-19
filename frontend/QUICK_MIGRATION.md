# Quick Migration Guide - Date Preferences

## 🎯 Goal
Update all pages to support user-selected calendar types (Gregorian, Hijri Shamsi, Hijri Qamari) with **minimal code changes**.

---

## ⚡ Quick Start (3 Steps)

### Step 1: Import the component
```tsx
import { DateDisplay } from '@/components/ui/date-display';
```

### Step 2: Replace date formatting
```tsx
// Before ❌
{formatDate(entry.date)}
{format(new Date(exam.date), 'MMM dd, yyyy')}
{new Date(student.enrolledAt).toLocaleDateString()}

// After ✅
<DateDisplay date={entry.date} />
<DateDisplay date={exam.date} />
<DateDisplay date={student.enrolledAt} />
```

### Step 3: Done! 🎉

---

## 📦 Available Components

| Component | When to Use | Example Output |
|-----------|-------------|----------------|
| `<DateDisplay />` | Anywhere you show a date | Dec 10, 2025 |
| `<DateTimeDisplay />` | Date + time | Dec 10, 2025 3:30 PM |
| `<ShortDateDisplay />` | Compact tables | Dec 10 |
| `<DateBadge />` | Highlighted dates | 📅 Dec 10, 2025 |
| `<DateRangeDisplay />` | Start/end dates | Dec 10 - Dec 15 |

---

## 🔄 Common Replacements

### Tables
```tsx
import { DateDisplay } from '@/components/ui/date-display';

<TableCell>
  <DateDisplay date={item.date} />
</TableCell>
```

### Badges
```tsx
import { DateBadge } from '@/components/ui/date-display';

<DateBadge date={certificate.validFrom} variant="secondary" />
```

### Date Ranges
```tsx
import { DateRangeDisplay } from '@/components/ui/date-display';

<DateRangeDisplay startDate={year.startDate} endDate={year.endDate} />
```

### With Fallback
```tsx
<DateDisplay date={optionalDate} fallback="Not set" />
```

---

## 🔍 Find and Replace

### Using VS Code:

1. **Find:** `formatDate\(([^)]+)\)`
2. **Replace:** `<DateDisplay date={$1} />`
3. Add import: `import { DateDisplay } from '@/components/ui/date-display';`

### Using grep:
```bash
# Find all formatDate calls
grep -rn "formatDate(" src/pages/

# Find date-fns format calls
grep -rn "format(new Date" src/pages/

# Find toLocaleDateString
grep -rn "toLocaleDateString()" src/pages/
```

---

## 📋 Page-by-Page Checklist

### Priority 1 (User-facing dates)
- [ ] Dashboard
- [ ] Fee Payments & Statements
- [ ] Exam Timetables & Attendance
- [ ] Student Admissions
- [ ] Library Distribution
- [ ] Academic Years

### Priority 2 (Reports)
- [ ] Finance Reports
- [ ] Fee Reports
- [ ] Exam Reports
- [ ] Library Reports
- [ ] Leave Reports
- [ ] Attendance Reports

### Priority 3 (Settings & Admin)
- [ ] All Settings pages
- [ ] DMS (Documents)
- [ ] Certificates & Graduation
- [ ] Assets Management

---

## ⏱️ Time Estimate

- **Per Page:** 5-10 minutes
- **Per Dialog/Panel:** 2-5 minutes
- **Total (90 pages):** 7-15 hours

**Recommendation:** Migrate incrementally, testing each page.

---

## 🧪 Testing

After migrating a page:

1. Go to User Settings
2. Change calendar type (Gregorian → Hijri Shamsi → Hijri Qamari)
3. Navigate to the migrated page
4. Verify dates display correctly in each calendar

---

## 💡 Pro Tips

1. **Start with Finance/Fees** - These pages have the most date displays
2. **Use wrapper components** - Easier than hooks
3. **Test edge cases** - null dates, invalid dates
4. **Keep fallbacks** - Use `fallback="Not set"` for optional dates

---

## ❓ FAQs

**Q: Do I need to change date pickers?**
A: No, date pickers stay the same. Only the display format changes.

**Q: Will this break existing functionality?**
A: No, it only affects how dates are displayed, not how they're stored.

**Q: What if a date is null/undefined?**
A: Use the `fallback` prop: `<DateDisplay date={date} fallback="-" />`

**Q: Can I still use date-fns?**
A: Yes, for calculations. Use wrapper components only for display.

---

## 📞 Need Help?

Check `DATE_PREFERENCES_GUIDE.md` for detailed documentation.

---

## Example Migration

### Before (ExamAttendancePage.tsx)
```tsx
import { format } from 'date-fns';

<div>{format(new Date(time.date), 'MMM dd')}</div>
<div>{format(new Date(selectedExamTime.date), 'MMM dd, yyyy')}</div>
```

### After
```tsx
import { ShortDateDisplay, DateDisplay } from '@/components/ui/date-display';

<div><ShortDateDisplay date={time.date} /></div>
<div><DateDisplay date={selectedExamTime.date} /></div>
```

**Changed:** 3 lines | **Time:** < 2 minutes ✅
