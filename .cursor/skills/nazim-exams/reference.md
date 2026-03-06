# Exams Reference

## Exam Status

`ExamStatus`: `'draft' | 'scheduled' | 'in_progress' | 'completed' | 'archived'`

## Permission Names

- `exams.read`
- `exams.create`
- `exams.update`
- `exams.delete`

Use for nav visibility and backend controller checks. Format is `{resource}.{action}` (no prefix like `academic.exams.read`).

## Query Keys

- `exams`, `exam`, `exam-classes`, `exam-subjects`, `exam-times`
- Include `examId`, `examClassId`, `profile?.organization_id`, `profile?.default_school_id` where relevant

## Report Types (from useExams / examMapper)

- Exam report, exam summary report, class mark sheet, student result report
- Enrollment stats, marks progress, exam attendance, attendance summary
- Timeslot students, student attendance report, timeslot attendance summary

## Related Skills

- [nazim-class-subjects](.cursor/skills/nazim-class-subjects/SKILL.md) — Subject assignment workflow; exam subjects must use class_subjects
