# Exam Number ZIP Packs

## Goal
Queued downloads for roll slips and secret labels produce a **ZIP** of separate PDFs for easy printing—not one combined PDF.

## Layout

**Roll slips** (`exam_roll_slips`):
```text
{ExamName}/
  roll-slips/
    {ClassName}/
      {Section}/
        roll-slips.pdf
```

**Secret labels** (`exam_secret_labels`):
```text
{ExamName}/
  secret-labels/
    {ClassName}/
      {Section}/
        {SubjectName}/
          secret-labels.pdf
```

Empty section folder name is `_`. Path segments are sanitized for ZIP safety.

## Filters
- Optional `exam_class_id`: ZIP includes only that exam class (still split by section/subject).
- Optional `subject_id` (secret labels): only that subject under matching classes.
- Empty groups are skipped.

## Pipeline
`POST /api/reports/generate` (`async: true`) → `GenerateReportJob` → `ExamNumberReportService::generateStoredZip` → store `.zip` via `FileStorageService` → poll/download.
