# Central Reporting System

A unified PDF and Excel report generation system with branding, templates, watermarks, and calendar support.

## Quick Start

### Backend API Usage

```php
use App\Services\Reports\ReportService;
use App\Services\Reports\ReportConfig;

// Inject the service
public function __construct(private ReportService $reportService) {}

// Generate a report
public function generateStudentReport(Request $request)
{
    $config = ReportConfig::fromArray([
        'report_key' => 'student_list',
        'report_type' => 'pdf',  // or 'excel'
        'branding_id' => $request->branding_id,
        'report_template_id' => $request->template_id, // optional
        'title' => 'Student List Report',
        'calendar_preference' => 'jalali', // 'gregorian', 'jalali', 'qamari'
        'language' => 'ps', // 'fa', 'ps', 'ar', 'en'
    ]);

    $data = [
        'columns' => [
            ['key' => 'name', 'label' => 'نوم'],
            ['key' => 'class', 'label' => 'صنف'],
            ['key' => 'enrollment_date', 'label' => 'د شمولیت نیټه'],
        ],
        'rows' => [
            ['name' => 'احمد', 'class' => '10A', 'enrollment_date' => '2024-01-15'],
            ['name' => 'محمد', 'class' => '10B', 'enrollment_date' => '2024-02-20'],
        ],
    ];

    $reportRun = $this->reportService->generateReport($config, $data, $organizationId);

    return response()->json([
        'id' => $reportRun->id,
        'status' => $reportRun->status,
    ]);
}
```

### Frontend API Usage

```typescript
import { useServerReport } from '@/hooks/useServerReport';

function MyReportComponent() {
  const { generateReport, status, progress, downloadUrl, isGenerating } = useServerReport();

  const handleGenerate = async () => {
    await generateReport({
      report_key: 'student_list',
      report_type: 'pdf',
      branding_id: selectedBrandingId,
      report_template_id: selectedTemplateId,
      title: 'Student Report',
      calendar_preference: 'jalali',
      language: 'ps',
      data: {
        columns: [...],
        rows: [...],
      },
    });
  };

  return (
    <div>
      <Button onClick={handleGenerate} disabled={isGenerating}>
        Generate Report
      </Button>
      {isGenerating && <p>Progress: {progress}%</p>}
      {downloadUrl && <a href={downloadUrl}>Download</a>}
    </div>
  );
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports/generate` | Generate a new report |
| GET | `/api/reports/{id}/status` | Check report generation status |
| GET | `/api/reports/{id}/download` | Download completed report |
| GET | `/api/reports` | List all reports |
| DELETE | `/api/reports/{id}` | Delete a report |

### POST /api/reports/generate

```json
{
  "report_key": "student_list",
  "report_type": "pdf",
  "branding_id": "uuid",
  "report_template_id": "uuid",
  "title": "Report Title",
  "calendar_preference": "jalali",
  "language": "ps",
  "async": true,
  "data": {
    "columns": [
      { "key": "name", "label": "Name" },
      { "key": "date", "label": "Date" }
    ],
    "rows": [
      { "name": "Value", "date": "2024-01-01" }
    ]
  }
}
```

---

## Configuration Options

### ReportConfig Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `report_key` | string | required | Unique identifier for report type |
| `report_type` | string | `'pdf'` | `'pdf'` or `'excel'` |
| `branding_id` | string | null | School branding UUID |
| `layout_id` | string | null | Specific layout UUID |
| `report_template_id` | string | null | ReportTemplate UUID for custom header/footer |
| `template_name` | string | null | Blade template name (auto-selected if null) |
| `title` | string | `''` | Report title |
| `watermark_mode` | string | `'default'` | `'default'`, `'pick'`, `'none'` |
| `notes_mode` | string | `'defaults'` | `'defaults'`, `'custom'`, `'none'` |
| `calendar_preference` | string | `'jalali'` | `'gregorian'`, `'jalali'`, `'qamari'` |
| `language` | string | `'fa'` | `'fa'`, `'ps'`, `'ar'`, `'en'` |

### Calendar Preferences

| Value | Description | Example Output |
|-------|-------------|----------------|
| `gregorian` | Western calendar | `December 24, 2024` |
| `jalali` / `shamsi` | Solar Hijri (Afghan/Iranian) | `۴ جدی ۱۴۰۳` |
| `qamari` / `hijri_qamari` | Lunar Hijri (Islamic) | `۲۲ جمادی الثانی ۱۴۴۶ هـ` |

---

## Template Auto-Selection

Templates are automatically selected based on column count:

| Columns | Template | Page |
|---------|----------|------|
| 1-6 | `table_a4_portrait` | A4 Portrait |
| 7-13 | `table_a4_landscape` | A4 Landscape |
| 14+ | `table_a3_landscape` | A3 Landscape |

---

## ReportTemplate Integration

ReportTemplates allow users to customize report appearance per report type:

```php
// In your controller
$config = ReportConfig::fromArray([
    'report_key' => 'attendance_report',
    'report_template_id' => $templateId, // UUID from report_templates table
    // ...
]);
```

ReportTemplate overrides:
- Header/Footer HTML
- Header/Footer text
- Logo selection (primary, secondary, ministry, all, none)
- Show page numbers
- Show generation date
- Table alternating colors
- Font size

---

## Date Formatting in Reports

The system provides these date variables in templates:

| Variable | Description | Example |
|----------|-------------|---------|
| `CURRENT_DATE` | Full formatted date | `۴ جدی ۱۴۰۳` |
| `CURRENT_DATE_NUMERIC` | Numeric format | `۱۴۰۳/۱۰/۰۴` |
| `CURRENT_DATE_SHORT` | Short format | `۴ جدی ۱۴۰۳` |
| `CURRENT_DATE_GREGORIAN` | Always Gregorian | `2024-12-24` |
| `CURRENT_DATETIME` | Date + Time | `۴ جدی ۱۴۰۳ 14:30` |

### Format dates in row data

```php
// In a controller or service
$dateService = app(DateConversionService::class);

foreach ($rows as &$row) {
    if (!empty($row['enrollment_date'])) {
        $row['enrollment_date'] = $dateService->formatDate(
            $row['enrollment_date'],
            'jalali',
            'full',
            'ps'
        );
    }
}
```

---

## Database Tables

| Table | Description |
|-------|-------------|
| `school_branding` | Main branding settings (logos, colors, fonts) |
| `branding_layouts` | Page layout configurations |
| `branding_notes` | Header/body/footer notes |
| `branding_watermarks` | Text/image watermarks |
| `report_templates` | Custom report templates per type |
| `report_runs` | Report generation history/logging |

---

## Cleanup Old Reports

### Via Artisan Command

```bash
# Delete reports older than 7 days (default)
php artisan reports:cleanup

# Delete reports older than 30 days
php artisan reports:cleanup --days=30

# Dry run (show what would be deleted)
php artisan reports:cleanup --dry-run

# Only delete failed reports
php artisan reports:cleanup --status=failed
```

### Via Code

```php
$reportService->cleanupOldReports(7); // Delete reports older than 7 days
```

---

## File Structure

```
backend/
├── app/
│   ├── Http/Controllers/
│   │   └── ReportGenerationController.php
│   ├── Jobs/
│   │   └── GenerateReportJob.php
│   ├── Models/
│   │   ├── BrandingLayout.php
│   │   ├── BrandingNote.php
│   │   ├── BrandingWatermark.php
│   │   ├── ReportRun.php
│   │   └── ReportTemplate.php
│   ├── Services/Reports/
│   │   ├── BrandingCacheService.php
│   │   ├── DateConversionService.php
│   │   ├── ExcelReportService.php
│   │   ├── PdfReportService.php
│   │   ├── ReportConfig.php
│   │   └── ReportService.php
│   └── Console/Commands/
│       └── CleanupOldReports.php
├── resources/views/reports/
│   ├── base.blade.php
│   ├── table_a4_portrait.blade.php
│   ├── table_a4_landscape.blade.php
│   └── table_a3_landscape.blade.php
└── docs/
    └── REPORTING_SYSTEM.md

frontend/
├── src/
│   ├── hooks/
│   │   └── useServerReport.ts
│   ├── components/reports/
│   │   └── ReportProgressDialog.tsx
│   └── lib/reporting/
│       ├── serverReportTypes.ts
│       └── index.ts
```

---

## Setup Checklist

1. Run migrations:
   ```bash
   php artisan migrate
   ```

2. Install PhpSpreadsheet (for Excel):
   ```bash
   composer install
   ```

3. Ensure Browsershot requirements (for PDF):
   - Node.js installed
   - Puppeteer/Chrome available

4. Configure queue worker (for async reports):
   ```bash
   php artisan queue:work
   ```
