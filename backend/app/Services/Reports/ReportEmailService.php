<?php

namespace App\Services\Reports;

use App\Mail\ReportEmail;
use App\Models\ReportRun;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Service for emailing reports to users
 */
class ReportEmailService
{
    /**
     * Email a completed report to a user
     *
     * @param ReportRun $reportRun The completed report run
     * @param User|string $recipient User model or email address
     * @param string|null $subject Custom email subject (optional)
     * @return bool Success status
     */
    public function emailReport(ReportRun $reportRun, User|string $recipient, ?string $subject = null): bool
    {
        if ($reportRun->status !== 'completed') {
            Log::warning('Cannot email report: report not completed', [
                'report_run_id' => $reportRun->id,
                'status' => $reportRun->status,
            ]);
            return false;
        }

        if (!$reportRun->output_path) {
            Log::warning('Cannot email report: no output path', [
                'report_run_id' => $reportRun->id,
            ]);
            return false;
        }

        try {
            $email = $recipient instanceof User ? $recipient->email : $recipient;
            $user = $recipient instanceof User ? $recipient : null;

            if (!$email) {
                Log::warning('Cannot email report: no email address', [
                    'report_run_id' => $reportRun->id,
                ]);
                return false;
            }

            $emailSubject = $subject ?? $reportRun->title ?? 'Nazim Report';

            Mail::to($email)->send(new ReportEmail(
                $reportRun,
                $user,
                $emailSubject
            ));

            Log::info('Report emailed successfully', [
                'report_run_id' => $reportRun->id,
                'recipient' => $email,
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('Failed to email report', [
                'report_run_id' => $reportRun->id,
                'recipient' => $recipient instanceof User ? $recipient->email : $recipient,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Email a report to multiple recipients
     *
     * @param ReportRun $reportRun The completed report run
     * @param array<User|string> $recipients Array of User models or email addresses
     * @param string|null $subject Custom email subject (optional)
     * @return array<string, bool> Map of recipient email to success status
     */
    public function emailReportToMultiple(ReportRun $reportRun, array $recipients, ?string $subject = null): array
    {
        $results = [];

        foreach ($recipients as $recipient) {
            $email = $recipient instanceof User ? $recipient->email : $recipient;
            $results[$email] = $this->emailReport($reportRun, $recipient, $subject);
        }

        return $results;
    }

    /**
     * Email a report to all users in an organization with a specific permission
     *
     * @param ReportRun $reportRun The completed report run
     * @param string $permission Permission name (e.g., 'finance.summary.read')
     * @param string|null $subject Custom email subject (optional)
     * @return array<string, bool> Map of recipient email to success status
     */
    public function emailReportToPermissionHolders(ReportRun $reportRun, string $permission, ?string $subject = null): array
    {
        $organizationId = $reportRun->organization_id;

        if (!$organizationId) {
            Log::warning('Cannot email report: no organization_id', [
                'report_run_id' => $reportRun->id,
            ]);
            return [];
        }

        // Get users with the permission in this organization
        $users = User::whereHas('profile', function ($query) use ($organizationId) {
            $query->where('organization_id', $organizationId);
        })
        ->whereHas('permissions', function ($query) use ($permission, $organizationId) {
            $query->where('name', $permission)
                ->where(function ($q) use ($organizationId) {
                    $q->where('organization_id', $organizationId)
                        ->orWhereNull('organization_id');
                });
        })
        ->whereNotNull('email')
        ->get();

        if ($users->isEmpty()) {
            Log::info('No users found with permission for report email', [
                'report_run_id' => $reportRun->id,
                'permission' => $permission,
                'organization_id' => $organizationId,
            ]);
            return [];
        }

        return $this->emailReportToMultiple($reportRun, $users->toArray(), $subject);
    }
}

