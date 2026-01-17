<?php

namespace App\Jobs;

use App\Models\ReportRun;
use App\Services\Reports\ReportEmailService;
use App\Services\Reports\ReportService;
use App\Services\Reports\ReportConfig;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job to generate and email a scheduled report
 * 
 * Examples:
 * - Attendance session closed report
 * - Daily financial summary
 * - Weekly attendance summary
 */
class SendScheduledReportEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;
    public int $timeout = 300;

    public function __construct(
        public string $reportKey,
        public string $organizationId,
        public string $schoolId,
        public array $reportData,
        public array $recipientUserIds = [],
        public ?string $permission = null,
        public ?string $subject = null,
        public array $config = []
    ) {
    }

    public function handle(
        ReportService $reportService,
        ReportEmailService $emailService
    ): void {
        try {
            // Build report config
            $config = ReportConfig::fromArray(array_merge([
                'report_key' => $this->reportKey,
                'report_type' => $this->config['report_type'] ?? 'pdf',
                'branding_id' => $this->schoolId,
                'title' => $this->config['title'] ?? $this->subject ?? 'Scheduled Report',
                'calendar_preference' => $this->config['calendar_preference'] ?? 'jalali',
                'language' => $this->config['language'] ?? 'ps',
            ], $this->config));

            // Generate the report (async)
            $reportRun = $reportService->generateReport(
                $config,
                $this->reportData,
                $this->organizationId
            );

            Log::info('Scheduled report generated', [
                'report_run_id' => $reportRun->id,
                'report_key' => $this->reportKey,
                'organization_id' => $this->organizationId,
            ]);

            // Wait for report to complete (poll or use event)
            // For now, we'll dispatch a follow-up job to email when ready
            EmailReportWhenReady::dispatch($reportRun->id, $this->recipientUserIds, $this->permission, $this->subject)
                ->delay(now()->addSeconds(10)); // Give report time to generate

        } catch (\Throwable $e) {
            Log::error('Failed to generate scheduled report', [
                'report_key' => $this->reportKey,
                'organization_id' => $this->organizationId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}

