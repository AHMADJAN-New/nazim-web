# Translation Coverage Excel Export

## Overview

The enhanced translation coverage analyzer generates a comprehensive Excel report that provides a **single source of truth** for all translation keys across all languages (English, Pashto, Farsi, Arabic).

## Features

### Excel Report Contains 4 Sheets:

1. **Complete Coverage** - Every translation key with:
   - Exists/Doesn't exist in each language (EN, PS, FA, AR)
   - Empty/Not empty status for each language
   - Actual translation values (truncated to 100 chars)
   - Usage status (Used/Unused)
   - Priority level (High/Medium/Low/Unused)
   - Missing languages list
   - Empty languages list

2. **High Priority** - Filtered view showing only:
   - Keys that are **used in code** AND **missing in at least one language**
   - These are the most critical translations to complete

3. **Summary** - Statistics including:
   - Total keys, used keys, unused keys
   - Priority breakdown
   - Language coverage (total, missing, empty)
   - Missing translations by language (for used keys only)

4. **By Namespace** - Aggregated statistics by namespace (e.g., `attendance`, `exams`, `leave`):
   - Total keys per namespace
   - Used keys per namespace
   - Missing/empty counts per language per namespace

## Usage

### Run the Script

From the `frontend` directory:

```bash
npm run i18n:coverage:excel
```

Or directly:

```bash
npx tsx scripts/i18n/translation-coverage-excel.ts
```

### Output Location

The Excel file is generated in:
```
translation-reports/translation-coverage-YYYY-MM-DD.xlsx
```

## Priority Levels

- **High**: Key is used in code AND missing in at least one language
- **Medium**: Key is used in code AND empty (blank string) in at least one language
- **Low**: Key is used in code AND complete in all languages
- **Unused**: Key is defined but never used in the codebase

## Single Source of Truth

The script uses `TranslationKeys` interface (`frontend/src/lib/translations/types.ts`) as the **single source of truth** for all translation keys. This means:

1. All keys are extracted from the TypeScript interface
2. All language files are compared against this master list
3. Missing keys are identified by comparing against the interface
4. Empty keys are detected (keys that exist but have empty string values)

## Key Detection

The script detects translation key usage from:

- `t('key')` function calls
- `showToast.success('key')`, `showToast.error('key')`, etc.
- `titleKey: 'key'` properties

## Benefits

1. **Complete Visibility**: See every key's status across all languages in one place
2. **Prioritization**: Focus on high-priority keys (used + missing) first
3. **Empty Detection**: Identify keys that exist but are empty (need translation)
4. **Usage Tracking**: Know which keys are actually used vs. unused
5. **Namespace Analysis**: Understand which modules need the most translation work

## Example Use Cases

### Find Missing Attendance Translations

1. Open the Excel file
2. Filter the "Complete Coverage" sheet by:
   - Namespace = "attendance"
   - PS Exists = "No" OR FA Exists = "No" OR AR Exists = "No"
3. Sort by Priority = "High"
4. These are the attendance keys that need translation

### Find Unused Keys

1. Open the Excel file
2. Filter by "Used" = "No"
3. These keys can potentially be removed or are for future use

### Find Empty Translations

1. Open the Excel file
2. Filter by "PS Empty" = "Yes" OR "FA Empty" = "Yes" OR "AR Empty" = "Yes"
3. These keys exist but have empty values and need to be filled

## Integration with Existing Coverage Script

This script complements the existing `translation-coverage.ts` script:

- **Existing script**: Generates JSON and Markdown reports, used in CI
- **Excel script**: Generates detailed Excel reports for manual analysis and translation work

Both scripts use the same source of truth (`TranslationKeys` interface) and detection methods.

