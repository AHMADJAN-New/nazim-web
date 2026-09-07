# Student History Print — i18n + Modern Card Layout

**Date:** 2026-09-07  
**Status:** Pending user review  
**Approach:** Backend label catalog (Approach 1)  
**Design:** Modern card layout (user choice 2)

## Problem

Student Lifetime History PDF/Excel exports render almost entirely in English. The frontend already sends `language` (and calendar) via `getReportLocaleOptions()`, but:

- `StudentHistoryController::buildPdfReportData()` and `ReportService::fetchStudentHistoryData()` set `'labels' => []`
- `student-history.blade.php` falls back to English hardcoded defaults (`?? 'Full Name'`, etc.)
- Excel sheet/column headers are also hardcoded English

## Goals

1. PDF and Excel labels, titles, Yes/No, empty-state messages, and report title follow the user’s UI language (`en` | `ps` | `fa` | `ar`).
2. PDF uses a modern card layout: hero profile + summary metric cards + section cards with accent colors.
3. RTL (`dir="rtl"`) for `ps` / `fa` / `ar`; keep numbers/phones/dates in LTR spans.
4. Keep school branding (logos, primary color, watermark) from the existing report pipeline.

## Non-goals

- Changing which history data sections are fetched
- Redesigning the on-screen Student History UI (in-app page)
- Moving strings into Laravel `lang/` files (can be a later refactor)
- Dropping existing data fields from the export

## Approach

Mirror `ExamMarksEntryReportService::labelsForLanguage()`:

1. Add `StudentHistoryReportLabels` (or a method on `StudentHistoryService` / dedicated class) with a full key map for `en`, `ps`, `fa`, `ar`.
2. When building PDF/Excel report data, call `labelsForLanguage($config->language)` and set `$data['labels']`.
3. Use the same labels for Excel column headers and sheet titles.
4. Rebuild `student-history.blade.php` visual structure (cards); continue reading `$labels[...]` for all user-facing text.
5. Translate known enum-like values where practical (status, yes/no); leave free-text student data as stored.

## PDF layout

```
[ Branding header — logos + school name + translated report title ]

[ Hero profile card ]
  Photo | Full name, admission no, class/section/year, status badge, generated-at

[ Summary metrics strip ]
  Years | Attendance % | Exam avg | Fees paid | Library | Courses
  (soft accent tint from PRIMARY_COLOR)

[ Detail section cards — each with accent title bar ]
  Personal | Contact | Location | Guardian | Guarantor (Zamin) | Academic | Financial | System

[ History section cards ]
  Admissions | Attendance | Exams | Fees | Library | ID Cards | Courses | Graduations
  (tables inside cards; empty state uses translated “no records” string)
```

### Visual rules

- Card: light border, slight radius, padding; accent bar uses `$PRIMARY_COLOR`
- Avoid purple/glow; stay on school branding colors
- Dense enough for print; `page-break-inside: avoid` on cards where possible
- Remove dead `@if(false)` duplicate detail blocks once the new card sections replace them

## Excel

- Same `labels` map for sheet names and column headers
- No HTML card layout; keep multi-sheet structure
- Report title / first-row branding text translated when applicable

## Language wiring

| Source | Behavior |
|--------|----------|
| Frontend `StudentHistoryPage` | Already passes `reportLocale` (`language`, calendar) on export |
| `ReportConfig.language` | Already set from request (default `ps`) |
| New labels helper | Selected by `language`; fallback to `en` if unknown |
| Blade / Excel builders | Never rely on English-only fallbacks for keys that exist in the map |

## Key files

| File | Change |
|------|--------|
| New: `backend/app/Services/Reports/StudentHistoryReportLabels.php` (or equivalent) | Label catalogs `en/ps/fa/ar` |
| `StudentHistoryController.php` | Populate `labels`; translate Excel headers |
| `ReportService.php` (`fetchStudentHistoryData`) | Populate `labels` from config language |
| `resources/views/reports/student-history.blade.php` | Modern card markup + RTL + use `$labels` |
| Tests | Assert labels for `ps`/`fa`/`ar`; assert PDF data includes non-empty translated labels |

## Acceptance criteria

- [ ] Export with UI language Pashto → PDF section titles and field labels are Pashto (not English)
- [ ] Same for Dari (`fa`) and Arabic (`ar`); English remains correct for `en`
- [ ] PDF shows hero + summary metrics + section cards with branding accent
- [ ] RTL layout correct for `ps`/`fa`/`ar`; phones/dates still readable LTR
- [ ] Excel column/sheet headers match the same language
- [ ] Empty sections show translated empty messages
- [ ] Existing export flow (async report + download) unchanged for the user

## Out of scope follow-ups

- Syncing backend label catalog with frontend `studentHistory.*.ts` via codegen
- Translating free-text status values that come from the database when they are not controlled enums
