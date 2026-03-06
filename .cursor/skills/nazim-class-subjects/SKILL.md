---
name: nazim-class-subjects
description: Enforces the two-step subject assignment workflow for Nazim academic features. Use when building exams, grades, attendance, timetables, or any feature that needs subjects for a class. Covers class_subject_templates vs class_subjects, class_academic_year_id filtering.
---

# Nazim Class Subjects Architecture

The app uses a **two-step subject assignment workflow**. Academic features must use `class_subjects`, not `subjects` directly.

## Two Steps

### Step 1: Assign Subjects to Classes (Templates)
- Table: `class_subject_templates`
- Defines which subjects are *available* for a class
- Acts as blueprint/template

### Step 2: Assign Subjects to Class Academic Years
- Table: `class_subjects`
- Links subjects to a specific class instance in an academic year
- Includes teacher, room, schedule, etc.
- **This is the source of truth for academic-year features**

## When to Use class_subjects

| Feature | Use | Do NOT Use |
|---------|-----|------------|
| Exams | Subjects from `class_subjects` | `subjects` directly |
| Grades/Assessments | Link to `class_subjects` | `subjects` |
| Attendance | Per `class_subjects` | Per `subjects` |
| Timetables | Build from `class_subjects` | `subjects` |
| Reports | Based on `class_subjects` | `subjects` |

## Frontend Pattern

```typescript
// ✅ CORRECT: Get subjects for a class academic year
const { data: classSubjects } = useClassSubjects(classAcademicYearId, organizationId);

// ❌ WRONG: All subjects without class context
const { data: subjects } = useSubjects(organizationId);
```

## Key Rules

- ✅ **ALWAYS** query from `class_subjects` for academic-year features
- ✅ **ALWAYS** filter by `class_academic_year_id`
- ✅ **ALWAYS** validate subjects exist in `class_subject_templates` before Step 2 assignment
- ❌ **NEVER** link exams/grades/attendance to `subjects` without `class_subjects`
- ❌ **NEVER** bypass Step 1 → Step 2 workflow

## Validation

Before allowing assignment in Step 2: subject must exist in `class_subject_templates` for that class.
