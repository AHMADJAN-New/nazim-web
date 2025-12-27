# Report Migration Plan - Centralized Export System

## Overview
This document outlines the migration of 10 reports to the centralized export system using `ReportExportButtons` component and `useServerReport` hook.

## Reports to Migrate

1. ✅ **Classes report** - Base classes list
2. ✅ **Classes academic year report** - Class instances in academic years
3. ✅ **Classes subjects report** - Subjects assigned to classes
4. ✅ **Class subject academic year report** - Subjects for classes in specific academic year
5. ✅ **Teachers assignments report** - Teacher-subject-class assignments
6. ✅ **Timetable export** - Generated timetable (currently uses old system)
7. ✅ **Residency type report** - Residency types list
8. ✅ **Academic years report** - Academic years list
9. ✅ **Grades report** - Grade definitions
10. ✅ **Events general report** - Events list

## Implementation Pattern

For each report, we need to:

1. **Add ReportExportButtons component** to the page/component
2. **Define columns** for the report (matching table columns)
3. **Create transformData function** to convert domain models to report rows
4. **Create buildFiltersSummary function** (optional) to show active filters
5. **Set reportKey** (unique identifier for report type)
6. **Set templateType** (for finding default report template)

## Report Keys

- `classes` - Base classes report
- `classes_academic_year` - Classes in academic years
- `classes_subjects` - Subjects assigned to classes
- `class_subject_academic_year` - Class subjects for specific academic year
- `teacher_assignments` - Teacher subject assignments
- `timetable` - Timetable export
- `residency_types` - Residency types
- `academic_years` - Academic years
- `grades` - Grade definitions
- `events` - Events list

## Status

- [ ] Classes report
- [ ] Classes academic year report
- [ ] Classes subjects report
- [ ] Class subject academic year report
- [ ] Teachers assignments report
- [ ] Timetable export
- [ ] Residency type report
- [ ] Academic years report
- [ ] Grades report
- [ ] Events general report

