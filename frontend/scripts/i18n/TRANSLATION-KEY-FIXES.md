# Translation Key Mapping Fixes

This document describes the translation key mapping fixes applied to the codebase.

## Overview

Instead of adding new keys to translation files, this script corrects incorrect translation key references in the source code to use the correct existing keys.

## Fixed Mappings

### Events → Common Namespace

The following keys were incorrectly using the `events` namespace when they should use the `common` namespace:

- `events.loading` → `common.loading`
- `events.selectLanguage` → `common.selectLanguage`
- `events.selectSchool` → `common.selectSchool`
- `events.schoolManagement` → `common.schoolManagement`
- `events.toggleSidebar` → `common.toggleSidebar`

### Navigation Keys

- `nav.nav.reports` → `nav.reports` (typo fix)
- `nav.students.management` → `nav.studentManagement` (nested to flat)

### SmartSidebar titleKey Fixes

- `titleKey: "events.title"` (Teacher Subject Assignments) → `titleKey: "teacherSubjectAssignments.title"`
- `titleKey: "events.title"` (Timetable Generation) → `titleKey: "timetable.title"`

## Usage

Run the fix script:

```bash
npm run i18n:fix-mappings
```

The script will:
1. Scan all `.ts` and `.tsx` files in `src/`
2. Find incorrect translation key usages
3. Replace them with correct keys
4. Show a summary of all fixes

## How It Works

The script uses regex patterns to find:
- `t('key')` or `t("key")` calls with incorrect keys
- `titleKey: "key"` properties with incorrect values

It then replaces them with the correct keys from the `KEY_MAPPINGS` object.

## Adding New Mappings

To add new key mappings, edit `frontend/scripts/i18n/fix-translation-key-mappings.ts` and add entries to the `KEY_MAPPINGS` object:

```typescript
const KEY_MAPPINGS: Record<string, string> = {
  'incorrect.key': 'correct.key',
  // ... more mappings
};
```

## Notes

- The translation system (`i18n.ts`) already handles flat keys correctly
- Keys like `nav.academic.classes.title` work because the system tries the remaining path as a flat key
- All navigation keys exist in the translation files as flat keys in the `nav` object

