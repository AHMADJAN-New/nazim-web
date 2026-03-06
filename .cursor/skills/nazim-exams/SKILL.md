---
name: nazim-exams
description: Exams module patterns for Nazim. Use when working on exams, exam classes, subjects, timetable, enrollment, marks, attendance, or reports. Covers class_subjects dependency, hooks, exam flow, academic year, exam types, permissions.
---

# Nazim Exams

Exams are scoped to an academic year. Exam subjects come from **class_subjects** (not subjects directly). See [nazim-class-subjects](.cursor/skills/nazim-class-subjects/SKILL.md) for the two-step subject workflow.

## Class Subjects Dependency

- **Exam subjects** use `class_subject_id` — subjects must be assigned to the class academic year (via class_subjects) before enrolling in an exam
- When enrolling a subject to an exam: `useEnrollSubjectToExam` expects `exam_id`, `exam_class_id`, `class_subject_id`, and optional `total_marks`, `passing_marks`, `scheduled_at`
- Do NOT link exams to the `subjects` table directly; always use class_subjects

## Exam Flow

1. **Exam** — Created for an academic year; has status: `draft` | `scheduled` | `in_progress` | `completed` | `archived`
2. **Exam classes** — Assign class academic years to the exam (`useAssignClassToExam`, `exam_classes` with `class_academic_year_id`)
3. **Exam subjects** — Enroll class subjects per exam class (`useEnrollSubjectToExam`, `class_subject_id`)
4. **Exam times** — Timetable (date, startTime, endTime, room, invigilator) per exam subject

## Hooks (useExams.tsx)

- **Exams:** `useExams(organizationId?)`, `useLatestExamFromCurrentYear(organizationId?)`, `useExam(examId?)`, `useCreateExam`, `useUpdateExam`, `useUpdateExamStatus`, `useDeleteExam`
- **Exam classes:** `useExamClasses(examId?)`, `useAssignClassToExam`, `useRemoveClassFromExam`
- **Exam subjects:** `useExamSubjects(examId?, examClassId?)`, `useEnrollSubjectToExam`, `useUpdateExamSubject`, `useRemoveExamSubject`
- **Exam times:** `useExamTimes(examId?, examClassId?)`, `useCreateExamTime`, `useUpdateExamTime`, `useDeleteExamTime`
- **Enrollment / results / attendance:** `useExamStudents`, `useExamResults`, `useExamAttendance`, and related report/attendance hooks

Query keys include `profile?.organization_id`, `profile?.default_school_id`. Use `useCurrentAcademicYear` when scoping to current year.

## Academic Year and Exam Types

- Exams belong to an **academic year** (`academicYearId`); use `useCurrentAcademicYear` for “current year” filters
- **Exam types** (e.g. Mid-term, Final) are in Settings > Exam Types; `useExamTypes`

## Permissions

- `exams.read`, `exams.create`, `exams.update`, `exams.delete` — use for menu visibility and backend checks
- Use `useHasPermission('exams.read')` etc. in main app (not platform admin)

## Pages

- Exams list, Exam timetable, Exam enrollment, Exam student enrollment, Exam marks, Exam attendance
- Exam roll numbers, Secret numbers, Number reports, Reports hub, Consolidated mark sheet, Class-subject mark sheet, Student exam report
- Question bank, Exam paper templates, Exam papers, Print tracking, Exam documents, Exam classes/subjects page

## Types and Mapper

- **Domain:** [frontend/src/types/domain/exam.ts](frontend/src/types/domain/exam.ts) — Exam, ExamClass, ExamSubject, ExamTime, ExamStatus, report types
- **API:** [frontend/src/types/api/exam.ts](frontend/src/types/api/exam.ts)
- **Mapper:** [frontend/src/mappers/examMapper.ts](frontend/src/mappers/examMapper.ts)

## Multi-Tenancy

- Query keys include `organization_id` and `default_school_id` where applicable
- Follow [nazim-multi-tenancy](.cursor/skills/nazim-multi-tenancy/SKILL.md) for new exam endpoints

## Checklist

- [ ] Use class_subject_id for exam subjects (never subject_id only)
- [ ] Scope exams by academic year
- [ ] Invalidate exam-classes and exam-subjects when removing class from exam
- [ ] Check permissions (exams.read, exams.create, etc.) for UI and backend

## Additional Resources

- Exam status values, report types, permission names: [reference.md](reference.md)
