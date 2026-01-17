---
name: Fix All Translation Issues
overview: Systematically fix all hardcoded strings in priority files (top 20) and add all 780 missing USED translation keys to Pashto, ensuring all components use translation keys instead of hardcoded English strings.
todos:
  - id: fix-dms-incoming
    content: Fix IncomingDocuments.tsx - Replace all 159 hardcoded strings with translation keys (statusOptions, form labels, buttons, dialogs)
    status: completed
  - id: fix-dms-outgoing
    content: Fix OutgoingDocuments.tsx - Replace all 119 hardcoded strings with translation keys
    status: in_progress
  - id: add-dms-pashto
    content: Add 334 missing DMS Pashto translation keys to ps.ts
    status: pending
    dependencies:
      - fix-dms-incoming
      - fix-dms-outgoing
  - id: fix-priority-files
    content: Fix remaining 18 priority files (IdCardAssignment, ExpenseEntries, StudentFormDialog, etc.) - Replace hardcoded strings
    status: pending
    dependencies:
      - fix-dms-incoming
      - fix-dms-outgoing
  - id: add-all-pashto
    content: Add all 780 missing USED Pashto translation keys to ps.ts
    status: pending
    dependencies:
      - add-dms-pashto
  - id: verify-coverage
    content: Run verification scripts (i18n:find-hardcoded, i18n:coverage, i18n:check) to verify fixes
    status: pending
    dependencies:
      - fix-priority-files
      - add-all-pashto
  - id: test-pashto
    content: Manual testing - Switch to Pashto language and verify all text appears correctly in DMS and priority pages
    status: pending
    dependencies:
      - verify-coverage
---

# Comprehensive Translat

ion Fix Plan

## Overview

This plan addresses the root cause: **translation keys exist in files, but components use hardcoded strings**. The fix has two parts:

1. **Fix components** to use `t()` calls instead of hardcoded strings
2. **Add missing Pashto translations** for all 780 missing USED keys

## Phase 1: Priority Files (Top 20 with Most Hardcoded Strings)

### 1.1 DMS Module (Highest Priority)

#### File: `frontend/src/pages/dms/IncomingDocuments.tsx` (159 hardcoded strings)

**Status Options Fix:**

- **Current (Line 43-47):** Hardcoded `{ label: "Pending", value: "pending" }`
- **Fix:** Use `dms.archiveSearch.pending`, `dms.archiveSearch.underReview`, `dms.archiveSearch.completed`
- **Pattern:** Follow `ArchiveSearch.tsx` - use `labelKey` in array, then `t()` in JSX

**Form Labels Fix:**

- **Line 262:** `"Basic Information"` → `t('dms.forms.incoming.basicInfo')`
- **Line 265:** `"Document Number"` → `t('dms.forms.incoming.documentNumber')`
- **Line 269:** `"Received Date"` → `t('dms.forms.incoming.receivedDate')`
- **Line 273:** `"Subject"` → `t('dms.forms.incoming.subject')`
- **Line 277:** `"Status"` → `t('dms.forms.incoming.status')`
- **Line 281:** `"Security Level"` → `t('dms.forms.incoming.securityLevel')`
- **Line 287:** `"Pages Count (ضمائم)"` → `t('dms.forms.incoming.pagesCount')`

**Buttons & Actions:**

- `"Preview"` → `t('common.preview')` (exists in common)
- `"Download"` → `t('common.download')`
- `"Save Document"` → `t('common.save')` or `t('dms.actions.saveDocument')`
- `"Cancel"` → `t('common.cancel')`
- `"Updating..."` → `t('common.updating')`

**Dialog Titles:**

- `"Edit Incoming Document"` → `t('dms.forms.incoming.editTitle')` (may need to add key)
- `"Update the incoming document information"` → `t('dms.forms.incoming.editDescription')`

**Security Levels:**

- Use `dms.archiveSearch.public`, `dms.archiveSearch.internal`, `dms.archiveSearch.confidential`, `dms.archiveSearch.secret`, `dms.archiveSearch.topSecret`

**Status Rendering:**

- Replace `{opt.label}` with `{t(opt.labelKey)}` or create helper function

#### File: `frontend/src/pages/dms/OutgoingDocuments.tsx` (119 hardcoded strings)

**Similar fixes as IncomingDocuments:**

- Status options: `"Draft"`, `"Issued"`, `"Printed"` → Use `dms.archiveSearch.draft`, `dms.archiveSearch.issued`, `dms.archiveSearch.printed`
- Form labels: Use `dms.forms.outgoing.*` keys
- Recipient types: May need new keys or use existing ones

### 1.2 Other Priority Files

#### Files to Fix (in order):

1. `frontend/src/pages/IdCardAssignment.tsx` (132 hardcoded)
2. `frontend/src/pages/finance/ExpenseEntries.tsx` (106 hardcoded)
3. `frontend/src/components/students/StudentFormDialog.tsx` (106 hardcoded)
4. `frontend/src/pages/QuestionBank.tsx` (105 hardcoded)
5. `frontend/src/pages/ExamTimetablePage.tsx` (102 hardcoded)
6. `frontend/src/pages/graduation/GraduationBatchesPage.tsx` (102 hardcoded)
7. `frontend/src/pages/ExamPaperTemplates.tsx` (101 hardcoded)
8. `frontend/src/pages/finance/IncomeEntries.tsx` (99 hardcoded)
9. `frontend/src/pages/StudentAdmissionsReport.tsx` (97 hardcoded)
10. `frontend/src/pages/fees/FeeReportsPage.tsx` (95 hardcoded)
11. `frontend/src/pages/finance/FinanceReports.tsx` (93 hardcoded)
12. `frontend/src/pages/AttendanceTotalsReports.tsx` (92 hardcoded)
13. `frontend/src/pages/Exams.tsx` (90 hardcoded)
14. `frontend/src/pages/StudentReport.tsx` (89 hardcoded)
15. `frontend/src/components/students/StudentProfileView.tsx` (82 hardcoded)
16. `frontend/src/components/admissions/AdmissionFormDialog.tsx` (82 hardcoded)
17. `frontend/src/pages/finance/FinanceAccounts.tsx` (78 hardcoded)
18. `frontend/src/components/id-cards/IdCardLayoutEditor.tsx` (74 hardcoded)

**For each file:**

- Identify hardcoded strings using `find-hardcoded-strings.ts` output
- Map to existing translation keys (check `en.ts` first)
- Replace with `t()` calls
- If key doesn't exist, add to `en.ts` first, then all languages

## Phase 2: Add Missing Pashto Translations

### 2.1 Extract Missing USED Keys

**Source:** `translation-coverage.json` - `missingUsedPs` array (780 keys)**Process:**

1. Read `translation-coverage.json` to get list of 780 missing keys
2. For each key, get English value from `en.ts`
3. Add to `ps.ts` with Pashto translation
4. Verify structure matches English file

### 2.2 Key Categories to Add

**DMS Namespace (334 keys):**

- `dms.forms.incoming.*` - All form field labels
- `dms.forms.outgoing.*` - All form field labels
- `dms.archiveSearch.*` - Archive search translations
- `dms.dashboard.*` - Dashboard translations
- `dms.actions.*` - Action buttons
- `dms.tableHeaders.*` - Table column headers

**Other Namespaces:**

- `assets.*` (72 keys)
- `hostel.*` (65 keys)
- `userManagement.*` (58 keys)
- `exams.*` (44 keys)
- `events.*` (42 keys)
- And remaining keys from other namespaces

### 2.3 Translation File Structure

**File:** `frontend/src/lib/translations/ps.ts`**Pattern:**

```typescript
export const ps: TranslationKeys = {
  // ... existing translations ...
  dms: {
    forms: {
      incoming: {
        basicInfo: 'لومړني معلومات', // Pashto translation
        documentNumber: 'د سند شمیره',
        // ... all missing keys
      },
    },
  },
};
```



## Phase 3: Systematic Replacement Pattern

### 3.1 Status Options Pattern

**Before:**

```typescript
const statusOptions = [
  { label: "Pending", value: "pending" },
  { label: "Under review", value: "under_review" },
];
// Usage:
{statusOptions.map((opt) => (
  <SelectItem value={opt.value}>{opt.label}</SelectItem>
))}
```

**After:**

```typescript
const statusOptions = [
  { labelKey: "dms.archiveSearch.pending", value: "pending" },
  { labelKey: "dms.archiveSearch.underReview", value: "under_review" },
];
// Usage:
{statusOptions.map((opt) => (
  <SelectItem value={opt.value}>{t(opt.labelKey)}</SelectItem>
))}
```



### 3.2 Form Labels Pattern

**Before:**

```typescript
<Label>Basic Information</Label>
```

**After:**

```typescript
<Label>{t('dms.forms.incoming.basicInfo')}</Label>
```



### 3.3 Button Text Pattern

**Before:**

```typescript
<Button>Save Document</Button>
```

**After:**

```typescript
<Button>{t('common.save')}</Button>
// OR if specific:
<Button>{t('dms.actions.saveDocument')}</Button>
```



### 3.4 Dialog Content Pattern

**Before:**

```typescript
<DialogTitle>Edit Incoming Document</DialogTitle>
<DialogDescription>Update the incoming document information</DialogDescription>
```

**After:**

```typescript
<DialogTitle>{t('dms.forms.incoming.editTitle')}</DialogTitle>
<DialogDescription>{t('dms.forms.incoming.editDescription')}</DialogDescription>
```



## Phase 4: Verification & Testing

### 4.1 Run Verification Scripts

```bash
# Check for remaining hardcoded strings
npm run i18n:find-hardcoded

# Check translation coverage
npm run i18n:coverage

# Check for bad patterns (t() || fallback)
npm run i18n:check
```



### 4.2 Manual Testing

1. **Switch to Pashto language** in app
2. **Navigate to DMS pages:**

- Incoming Documents
- Outgoing Documents
- Archive Search
- DMS Dashboard

3. **Verify all text appears in Pashto:**

- Form labels
- Button text
- Status options
- Dialog titles
- Table headers
- Error messages

### 4.3 Expected Results

- **Hardcoded strings:** Should drop from 6,654 to near 0
- **Missing Pashto keys:** Should drop from 780 to 0
- **Translation coverage:** Should show 100% for USED keys in Pashto

## Phase 5: Remaining Files (After Priority)

### 5.1 Systematic Cleanup

After priority files are fixed, continue with remaining files:

- Use `find-hardcoded-strings.ts` output to identify next batch
- Apply same patterns as Phase 1
- Focus on files with 50+ hardcoded strings first

### 5.2 Fallback Pattern Cleanup

**Current (bad):**

```typescript
{t('key') || 'English Fallback'}
```

**Fix:** Remove fallback, ensure key exists in all languages

## Implementation Order

1. **Fix DMS IncomingDocuments.tsx** (highest impact, 159 hardcoded)
2. **Fix DMS OutgoingDocuments.tsx** (119 hardcoded)
3. **Add missing DMS Pashto keys** (334 keys)
4. **Fix remaining priority files** (18 files)
5. **Add all remaining missing Pashto keys** (446 keys)
6. **Verify and test**
7. **Fix remaining files** (systematic cleanup)

## Key Files to Modify

### Component Files (Fix hardcoded strings):

- `frontend/src/pages/dms/IncomingDocuments.tsx`
- `frontend/src/pages/dms/OutgoingDocuments.tsx`
- `frontend/src/pages/IdCardAssignment.tsx`
- `frontend/src/pages/finance/ExpenseEntries.tsx`
- `frontend/src/components/students/StudentFormDialog.tsx`
- ... (18 more priority files)

### Translation Files (Add missing keys):

- `frontend/src/lib/translations/ps.ts` (add 780 missing USED keys)
- `frontend/src/lib/translations/en.ts` (add any missing keys if needed)
- `frontend/src/lib/translations/fa.ts` (add 19 missing USED keys)
- `frontend/src/lib/translations/ar.ts` (add 21 missing USED keys)

## Success Criteria

- [ ] All priority files (top 20) have zero hardcoded strings
- [ ] All 780 missing USED Pashto keys are added
- [ ] All status options use `labelKey` pattern with `t()` calls
- [ ] All form labels use `t()` calls
- [ ] All buttons use `t()` calls
- [ ] All dialog content uses `t()` calls
- [ ] Translation coverage shows 100% for USED keys in Pashto
- [ ] Manual testing shows all text in Pashto when language is switched
- [ ] No `t('key') || 'fallback'` patterns remain

## Notes