<?php

namespace App\Console\Commands;

use App\Jobs\SendScheduledReportEmail;
use App\Models\Organization;
use App\Services\Reports\DateConversionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Command to send daily financial summary reports via email
 * 
 * Usage: php artisan reports:daily-financial-summary
 * Schedule in app/Console/Kernel.php:
 * $schedule->command('reports:daily-financial-summary')->dailyAt('18:00');
 */
class SendDailyFinancialSummary extends Command
{
    protected $signature = 'reports:daily-financial-summary 
                            {--organization= : Specific organization ID (optional)}
                            {--school= : Specific school ID (optional)}';

    protected $description = 'Generate and email daily financial summary reports';

    public function handle(DateConversionService $dateService): int
    {
        $this->info('Starting daily financial summary report generation...');

        $organizationId = $this->option('organization');
        $schoolId = $this->option('school');

        // Get organizations to process
        $organizations = Organization::whereNull('deleted_at')
            ->when($organizationId, fn($q) => $q->where('id', $organizationId))
            ->get();

        if ($organizations->isEmpty()) {
            $this->warn('No organizations found.');
            return Command::FAILURE;
        }

        $processed = 0;
        $failed = 0;

        foreach ($organizations as $organization) {
            try {
                // Get schools for this organization
                $schools = DB::table('school_branding')
                    ->where('organization_id', $organization->id)
                    ->whereNull('deleted_at')
                    ->when($schoolId, fn($q) => $q->where('id', $schoolId))
                    ->get();

                if ($schools->isEmpty()) {
                    $this->warn("No schools found for organization: {$organization->name}");
                    continue;
                }

                foreach ($schools as $school) {
                    try {
                        // Get financial data for today
                        $reportData = $this->buildFinancialSummaryData($organization->id, $school->id, $dateService);

                        if (empty($reportData['rows'])) {
                            $this->info("No financial data for today - skipping {$organization->name} / {$school->school_name}");
                            continue;
                        }

                        // Dispatch job to generate and email report
                        SendScheduledReportEmail::dispatch(
                            reportKey: 'daily_financial_summary',
                            organizationId: $organization->id,
                            schoolId: $school->id,
                            reportData: $reportData,
                            recipientUserIds: [], // Empty = use permission
                            permission: 'finance.summary.read', // Permission required to receive report
                            subject: "Daily Financial Summary - {$dateService->formatDate(now(), 'jalali', 'full', 'ps')}",
                            config: [
                                'report_type' => 'pdf',
                                'title' => "Daily Financial Summary - {$dateService->formatDate(now(), 'jalali', 'full', 'ps')}",
                                'calendar_preference' => 'jalali',
                                'language' => 'ps',
                            ]
                        );

                        $processed++;
                        $this->info("Queued financial summary for: {$organization->name} / {$school->school_name}");

                    } catch (\Throwable $e) {
                        $failed++;
                        Log::error('Failed to queue financial summary', [
                            'organization_id' => $organization->id,
                            'school_id' => $school->id,
                            'error' => $e->getMessage(),
                        ]);
                        $this->error("Failed for {$organization->name} / {$school->school_name}: {$e->getMessage()}");
                    }
                }

            } catch (\Throwable $e) {
                $failed++;
                Log::error('Failed to process organization for financial summary', [
                    'organization_id' => $organization->id,
                    'error' => $e->getMessage(),
                ]);
                $this->error("Failed for {$organization->name}: {$e->getMessage()}");
            }
        }

        $this->info("Completed: {$processed} reports queued, {$failed} failed.");

        return Command::SUCCESS;
    }

    /**
     * Build financial summary data for the report
     */
    private function buildFinancialSummaryData(string $organizationId, string $schoolId, DateConversionService $dateService): array
    {
        $today = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        // Get today's payments
        $payments = DB::table('fee_payments')
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereBetween('payment_date', [$today, $todayEnd])
            ->whereNull('deleted_at')
            ->get();

        // Get today's fee assignments
        $assignments = DB::table('fee_assignments')
            ->where('organization_id', $organizationId)
            ->where('school_id', $schoolId)
            ->whereBetween('created_at', [$today, $todayEnd])
            ->whereNull('deleted_at')
            ->get();

        // Calculate totals
        $totalPayments = $payments->sum('amount');
        $totalAssignments = $assignments->sum('assigned_amount');

        // Build report data
        $columns = [
            ['key' => 'type', 'label' => 'Type'],
            ['key' => 'count', 'label' => 'Count'],
            ['key' => 'amount', 'label' => 'Amount'],
        ];

        $rows = [
            [
                'type' => 'Payments Received',
                'count' => $payments->count(),
                'amount' => number_format($totalPayments, 2),
            ],
            [
                'type' => 'Fee Assignments',
                'count' => $assignments->count(),
                'amount' => number_format($totalAssignments, 2),
            ],
            [
                'type' => 'Net Total',
                'count' => $payments->count() + $assignments->count(),
                'amount' => number_format($totalPayments + $totalAssignments, 2),
            ],
        ];

        return [
            'columns' => $columns,
            'rows' => $rows,
        ];
    }
}

