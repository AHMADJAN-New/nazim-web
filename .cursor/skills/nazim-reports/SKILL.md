---
name: nazim-reports
description: PDF and Excel report generation for Nazim. Use when adding or changing reports. Backend uses ReportService and ReportConfig; frontend uses useServerReport. Covers branding, DateConversionService, RTL, acceptance criteria.
---

# Nazim Reports

Use the unified report system: **ReportService** (backend) and **useServerReport** (frontend). Never generate PDF/Excel directly.

## Acceptance Criteria

- **Exports match on-screen filters** — report data must match current filter state
- **RTL:** Pashto/Arabic/Farsi text must not break; right-align RTL columns; use RTL-friendly fonts (e.g. Noto Sans Arabic)
- **PDF:** Title, org/school name, date range or generation date, page numbers
- **Excel:** Title row (merged), column headers, totals row where applicable, filter summary optional

## Backend

### ReportService + ReportConfig

```php
use App\Services\Reports\ReportService;
use App\Services\Reports\ReportConfig;
use App\Services\Reports\DateConversionService;

public function __construct(private ReportService $reportService) {}

$config = ReportConfig::fromArray([
    'report_key' => 'student_list',
    'report_type' => 'pdf',  // or 'excel'
    'branding_id' => $request->branding_id,
    'report_template_id' => $request->template_id,
    'title' => 'Student List Report',
    'calendar_preference' => $request->calendar_preference ?? 'jalali', // gregorian, jalali, qamari
    'language' => $request->language ?? 'ps',
]);

// Format dates before passing data
$dateService = app(DateConversionService::class);
foreach ($data['rows'] as &$row) {
    if (!empty($row['enrollment_date'])) {
        $row['enrollment_date'] = $dateService->formatDate(
            $row['enrollment_date'], $config->calendar_preference, 'full', $config->language
        );
    }
}

$reportRun = $this->reportService->generateReport($config, $data, $profile->organization_id);
return response()->json(['id' => $reportRun->id, 'status' => $reportRun->status], 202);
```

- Check permission (e.g. `reports.generate`) and organization_id before generating
- Template auto-selection: 1–6 cols → A4 Portrait; 7–13 → A4 Landscape; 14+ → A3 Landscape
- Logos: use binary from school_branding (base64 in HTML); fallback to file path only if needed

## Frontend

### useServerReport

```typescript
import { useServerReport } from '@/hooks/useServerReport';
import { ReportProgressDialog } from '@/components/reports/ReportProgressDialog';

const { generateReport, status, progress, downloadUrl, isGenerating, error } = useServerReport();

await generateReport({
  report_key: 'student_list',
  report_type: 'pdf',
  branding_id: selectedBrandingId,
  title: 'Student Report',
  calendar_preference: 'jalali',
  language: 'ps',
  async: true,
  data: { columns: [...], rows: [...] },
});

// Use ReportProgressDialog for UX
<ReportProgressDialog open={showProgress} onOpenChange={setShowProgress} status={status} progress={progress} downloadUrl={downloadUrl} />
```

## Checklist

- [ ] Backend uses ReportService (no direct PDF/Excel generation)
- [ ] Dates formatted with DateConversionService
- [ ] Report data matches current filters
- [ ] RTL columns right-aligned; RTL-friendly fonts in PDF
- [ ] Frontend uses useServerReport; show progress/download when async

## Additional Resources

- ReportConfig params, template selection, API endpoints: [reference.md](reference.md)
