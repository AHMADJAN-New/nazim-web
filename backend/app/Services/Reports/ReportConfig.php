<?php

namespace App\Services\Reports;

/**
 * Configuration object for report generation
 */
class ReportConfig
{
    public function __construct(
        public string $reportKey,
        public string $reportType = 'pdf', // pdf, excel
        public ?string $brandingId = null,
        public ?string $layoutId = null,
        public ?string $reportTemplateId = null, // Reference to ReportTemplate for custom header/footer
        public ?string $templateName = null,
        public string $title = '',
        public string $watermarkMode = 'default', // default, pick, none
        public string $notesMode = 'defaults', // defaults, custom, none
        public ?string $outputPath = null,
        public string $generatedBy = 'NazimWeb',
        public array $parameters = [],
        public array $columnConfig = [],
        public string $calendarPreference = 'jalali', // gregorian, jalali/shamsi, qamari/hijri_qamari
        public string $language = 'fa', // fa, ps, ar, en
    ) {}

    /**
     * Create from array
     */
    public static function fromArray(array $data): self
    {
        return new self(
            reportKey: $data['report_key'] ?? 'default',
            reportType: $data['report_type'] ?? 'pdf',
            brandingId: $data['branding_id'] ?? null,
            layoutId: $data['layout_id'] ?? null,
            reportTemplateId: $data['report_template_id'] ?? null,
            templateName: $data['template_name'] ?? null,
            title: $data['title'] ?? '',
            watermarkMode: $data['watermark_mode'] ?? 'default',
            notesMode: $data['notes_mode'] ?? 'defaults',
            outputPath: $data['output_path'] ?? null,
            generatedBy: $data['generated_by'] ?? 'NazimWeb',
            parameters: $data['parameters'] ?? [],
            columnConfig: $data['column_config'] ?? [],
            calendarPreference: $data['calendar_preference'] ?? 'jalali',
            language: $data['language'] ?? 'fa',
        );
    }

    /**
     * Convert to array
     */
    public function toArray(): array
    {
        return [
            'report_key' => $this->reportKey,
            'report_type' => $this->reportType,
            'branding_id' => $this->brandingId,
            'layout_id' => $this->layoutId,
            'report_template_id' => $this->reportTemplateId,
            'template_name' => $this->templateName,
            'title' => $this->title,
            'watermark_mode' => $this->watermarkMode,
            'notes_mode' => $this->notesMode,
            'output_path' => $this->outputPath,
            'generated_by' => $this->generatedBy,
            'parameters' => $this->parameters,
            'column_config' => $this->columnConfig,
            'calendar_preference' => $this->calendarPreference,
            'language' => $this->language,
        ];
    }

    /**
     * Check if PDF report
     */
    public function isPdf(): bool
    {
        return $this->reportType === 'pdf';
    }

    /**
     * Check if Excel report
     */
    public function isExcel(): bool
    {
        return $this->reportType === 'excel';
    }

    /**
     * Get page size from parameters or default
     */
    public function getPageSize(): string
    {
        return $this->parameters['page_size'] ?? 'A4';
    }

    /**
     * Get orientation from parameters or default
     */
    public function getOrientation(): string
    {
        return $this->parameters['orientation'] ?? 'portrait';
    }

    /**
     * Auto-select template based on column count
     */
    public function autoSelectTemplate(int $columnCount): string
    {
        if ($this->templateName) {
            return $this->templateName;
        }

        // Auto-select based on column count
        return match (true) {
            $columnCount <= 6 => 'table_a4_portrait',
            $columnCount <= 13 => 'table_a4_landscape',
            default => 'table_a3_landscape',
        };
    }
}
