# Exam Number PDF — Queued via ReportService

## Problem
Roll slips / secret labels PDF was generated synchronously in the HTTP request (QR + Browsershot), so the browser waited 20–60s+.

## Solution (Approach A)
Use existing `POST /api/reports/generate` with `async: true` → `GenerateReportJob` → poll status → download.

### Report keys
- `exam_roll_slips` — template hint `roll-slips`
- `exam_secret_labels` — template hint `secret-labels`

### Parameters
- `exam_id` (required)
- `exam_class_id` (optional)
- `layout` — `single` | `grid` (secret labels only; default `single`)
- `school_id` — must match branding / current school

### Backend
- `ExamNumberReportService` owns slip/label data, QR cache, Blade HTML, and PDF (Browsershot + DomPDF fallback) + FileStorageService store.
- `GenerateReportJob` / `ReportService` short-circuit for these report keys (standalone HTML, not branded table templates).
- `ReportGenerationController` treats these keys like custom templates (columns/rows optional) and requires `exams.numbers.print`.

### Frontend
- Preview stays light (`preview=true` HTML sample).
- Download PDF → `useServerReport` + `ReportProgressDialog`.
- Remove sync `requestFile` PDF path from the page.

## Out of scope
- Changing label layout design
- Excel export for slips/labels
