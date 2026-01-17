<?php

namespace App\Jobs;

use App\Models\ReportRun;
use App\Models\User;
use App\Services\Reports\ReportEmailService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Job to email a report once it's ready
 * Polls the report status and emails when completed
 */
class EmailReportWhenReady implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 10; // Try up to 10 times (with delays)
    public int $timeout = 60;

    public function __construct(
        public string $reportRunId,
        public array $recipientUserIds = [],
        public ?string $permission = null,
        public ?string $subject = null
    ) {
    }

    public function handle(ReportEmailService $emailService): void
    {
        $reportRun = ReportRun::find($this->reportRunId);

        if (!$reportRun) {
            Log::warning('Report run not found for email', [
                'report_run_id' => $this->reportRunId,
            ]);
            return;
        }

        // If report is still processing, retry later
        if ($reportRun->status === 'processing' || $reportRun->status === 'queued') {
            Log::info('Report still processing, retrying email job', [
                'report_run_id' => $this->reportRunId,
                'status' => $reportRun->status,
                'attempt' => $this->attempts(),
            ]);

            // Retry with exponential backoff
            $this->release(now()->addSeconds(30 * $this->attempts()));
            return;
        }

        // If report failed, don't email
        if ($reportRun->status === 'failed') {
            Log::warning('Report failed, not emailing', [
                'report_run_id' => $this->reportRunId,
                'error' => $reportRun->error_message,
            ]);
            return;
        }

        // Report is completed, email it
        if ($reportRun->status === 'completed') {
            $recipients = [];

            // Get recipients by user IDs
            if (!empty($this->recipientUserIds)) {
                $recipients = User::whereIn('id', $this->recipientUserIds)
                    ->whereNotNull('email')
                    ->get()
                    ->toArray();
            }

            // Get recipients by permission
            if ($this->permission && $reportRun->organization_id) {
                $permissionUsers = User::whereHas('profile', function ($query) use ($reportRun) {
                    $query->where('organization_id', $reportRun->organization_id);
                })
                ->whereHas('permissions', function ($query) use ($reportRun) {
                    $query->where('name', $this->permission)
                        ->where(function ($q) use ($reportRun) {
                            $q->where('organization_id', $reportRun->organization_id)
                                ->orWhereNull('organization_id');
                        });
                })
                ->whereNotNull('email')
                ->get();

                // Merge with existing recipients (avoid duplicates)
                $existingEmails = collect($recipients)->pluck('email')->toArray();
                foreach ($permissionUsers as $user) {
                    if (!in_array($user->email, $existingEmails)) {
                        $recipients[] = $user;
                    }
                }
            }

            if (empty($recipients)) {
                Log::warning('No recipients found for scheduled report email', [
                    'report_run_id' => $this->reportRunId,
                    'recipient_user_ids' => $this->recipientUserIds,
                    'permission' => $this->permission,
                ]);
                return;
            }

            // Email to all recipients
            $results = $emailService->emailReportToMultiple(
                $reportRun,
                $recipients,
                $this->subject
            );

            Log::info('Scheduled report emailed', [
                'report_run_id' => $this->reportRunId,
                'recipient_count' => count($recipients),
                'success_count' => count(array_filter($results)),
            ]);
        }
    }
}

