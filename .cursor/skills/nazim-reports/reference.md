# Reports Reference

## ReportConfig Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| report_key | string | required | Unique identifier for report type |
| report_type | string | 'pdf' | 'pdf' or 'excel' |
| branding_id | string | null | School branding UUID |
| report_template_id | string | null | ReportTemplate for custom header/footer |
| title | string | '' | Report title |
| calendar_preference | string | 'jalali' | 'gregorian', 'jalali', 'qamari' |
| language | string | 'fa' | 'fa', 'ps', 'ar', 'en' |

## Template Auto-Selection

| Columns | Template | Page Size |
|---------|----------|-----------|
| 1-6 | table_a4_portrait | A4 Portrait |
| 7-13 | table_a4_landscape | A4 Landscape |
| 14+ | table_a3_landscape | A3 Landscape |

## API Endpoints

- POST `/api/reports/generate` — start generation
- GET `/api/reports/{id}/status` — poll status
- GET `/api/reports/{id}/download` — download when ready

## Blade Date Variables

CURRENT_DATE, CURRENT_DATE_NUMERIC, CURRENT_DATE_SHORT, CURRENT_DATE_GREGORIAN, CURRENT_DATETIME
