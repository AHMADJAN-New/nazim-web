<?php

namespace App\Console\Commands;

use App\Models\AttendanceSession;
use App\Models\Exam;
use App\Models\FeeAssignment;
use App\Models\IncomeEntry;
use App\Models\LibraryLoan;
use App\Models\Notification;
use App\Models\StudentAdmission;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TestNotification extends Command
{
    protected $signature = 'notifications:test {type?} {--user-id=}';
    protected $description = 'Test notification system for all notification types';

    private array $notificationTypes = [
        'admission' => [
            'admission.created',
            'admission.approved',
            'admission.rejected',
            'admission.deleted',
        ],
        'finance' => [
            'income.created',
            'income.updated',
            'income.deleted',
            'expense.created',
            'expense.approved',
            'expense.rejected',
            'expense.deleted',
            'invoice.created',
            'payment.received',
            'invoice.overdue',
            'finance.account.low_balance',
            'finance.project.budget_warning',
            'finance_document.created',
            'finance_document.deleted',
        ],
        'library' => [
            'library.book_overdue',
            'library.book_due_soon',
            'library.book_reserved',
        ],
        'assets' => [
            'asset.assigned',
            'asset.maintenance_due',
            'asset.returned',
        ],
        'fees' => [
            'fee.assignment.created',
            'fee.payment.received',
            'fee.assignment.overdue',
            'fee.assignment.paid',
            'fee.assignment.status_changed',
        ],
        'exams' => [
            'exam.created',
            'exam.published',
            'exam.marks_published',
            'exam.timetable_updated',
            'exam.marks_updated',
        ],
        'students' => [
            'student.created',
            'student.updated',
            'student.deleted',
        ],
        'dms' => [
            'doc.assigned',
            'doc.approved',
            'doc.returned',
        ],
        'attendance' => [
            'attendance.sync_failed',
            'attendance.anomaly',
            'attendance.session.created',
            'attendance.session.closed',
        ],
        'security' => [
            'security.password_changed',
            'security.new_device_login',
        ],
        'subscription' => [
            'subscription.limit_approaching',
            'subscription.limit_reached',
            'subscription.expiring_soon',
            'subscription.expired',
        ],
        'system' => [
            'system.backup_failed',
            'system.license_expiring',
        ],
    ];

    private int $totalEvents = 0;
    private int $testedEvents = 0;

    public function handle(NotificationService $notificationService)
    {
        $type = $this->argument('type');
        $userId = $this->option('user-id');
        $verbose = $this->getOutput()->isVerbose();

        // Count total events
        foreach ($this->notificationTypes as $events) {
            $this->totalEvents += count($events);
        }

        if ($type) {
            return $this->testSpecificType($notificationService, $type, $userId, $verbose);
        }

        // Show menu
        $this->displayMenu();
        return 0;
    }

    private function displayMenu(): void
    {
        $this->info('╔════════════════════════════════════════════════════════════╗');
        $this->info('║         Notification Testing Tool                         ║');
        $this->info('╚════════════════════════════════════════════════════════╝');
        $this->newLine();
        
        $this->info('📋 Available notification types:');
        $this->newLine();
        
        foreach ($this->notificationTypes as $key => $events) {
            $count = count($events);
            $this->line("  • {$key} ({$count} events)");
        }
        
        $this->newLine();
        $this->info('📊 Total: ' . $this->totalEvents . ' notification types');
        $this->newLine();
        
        $this->info('💡 Usage:');
        $this->line('  php artisan notifications:test {type}');
        $this->line('  php artisan notifications:test {type} --user-id={user_id}');
        $this->line('  php artisan notifications:test {type} -v          # Verbose output');
        $this->line('  php artisan notifications:test {type} -vv        # Very verbose output');
        $this->newLine();
        
        $this->info('📝 Examples:');
        $this->line('  php artisan notifications:test all              # Test all notifications');
        $this->line('  php artisan notifications:test admission         # Test admission notifications');
        $this->line('  php artisan notifications:test security --user-id=123');
        $this->line('  php artisan notifications:test all -v            # Show detailed output');
    }

    private function testSpecificType(NotificationService $notificationService, string $type, ?string $userId, bool $verbose): int
    {
        if ($type === 'all') {
            return $this->testAllTypes($notificationService, $userId, $verbose);
        }

        if (!isset($this->notificationTypes[$type])) {
            $this->error("❌ Unknown notification type: {$type}");
            $this->info('Available types: ' . implode(', ', array_keys($this->notificationTypes)));
            return 1;
        }

        $events = $this->notificationTypes[$type];
        $this->info("🧪 Testing {$type} notifications ({count($events)} events)...");
        $this->newLine();

        // Get test user
        $testUser = $this->getTestUser($userId);
        if (!$testUser) {
            return 1;
        }

        $successCount = 0;
        $failCount = 0;
        $skippedCount = 0;

        $bar = $this->output->createProgressBar(count($events));
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% %message%');
        $bar->setMessage('Starting...');
        $bar->start();

        foreach ($events as $eventType) {
            $bar->setMessage("Testing: {$eventType}");
            
            try {
                $result = $this->testEvent($notificationService, $eventType, $testUser, $verbose);
                if ($result) {
                    $successCount++;
                    if ($verbose) {
                        $this->newLine();
                        $this->line("  ✅ {$eventType}");
                    }
                } else {
                    $skippedCount++;
                    if ($verbose) {
                        $this->newLine();
                        $this->line("  ⚠️  {$eventType} (skipped - no entity found)");
                    }
                }
            } catch (\Exception $e) {
                $failCount++;
                if ($verbose) {
                    $this->newLine();
                    $this->error("  ❌ {$eventType}: {$e->getMessage()}");
                }
            }
            
            $bar->advance();
            $this->testedEvents++;
        }

        $bar->finish();
        $this->newLine(2);

        // Display results
        $this->displayResults($successCount, $failCount, $skippedCount, count($events));

        return $failCount > 0 ? 1 : 0;
    }

    private function testAllTypes(NotificationService $notificationService, ?string $userId, bool $verbose): int
    {
        $this->info('🧪 Testing ALL notification types...');
        $this->info("📊 Total: {$this->totalEvents} notification types");
        $this->newLine();

        $testUser = $this->getTestUser($userId);
        if (!$testUser) {
            return 1;
        }

        $totalSuccess = 0;
        $totalFail = 0;
        $totalSkipped = 0;

        $bar = $this->output->createProgressBar($this->totalEvents);
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% %message%');
        $bar->setMessage('Starting...');
        $bar->start();

        foreach ($this->notificationTypes as $type => $events) {
            if ($verbose) {
                $this->newLine();
                $this->info("📦 Testing {$type}...");
            }
            
            foreach ($events as $eventType) {
                $bar->setMessage("Testing: {$eventType}");
                
                try {
                    $result = $this->testEvent($notificationService, $eventType, $testUser, $verbose);
                if ($result) {
                    $totalSuccess++;
                    if ($verbose) {
                        $this->line("  ✅ {$eventType}");
                    }
                } else {
                    $totalSkipped++;
                    if ($verbose) {
                        $entity = $this->getTestEntity($eventType, $testUser);
                        $reason = $entity ? 'entity found but notification not created' : 'no test entity found';
                        $this->line("  ⚠️  {$eventType} (skipped - {$reason})");
                    }
                }
                } catch (\Exception $e) {
                    $totalFail++;
                    if ($verbose) {
                        $this->error("  ❌ {$eventType}: {$e->getMessage()}");
                    }
                }
                
                $bar->advance();
                $this->testedEvents++;
            }
        }

        $bar->finish();
        $this->newLine(2);

        // Display results
        $this->displayResults($totalSuccess, $totalFail, $totalSkipped, $this->totalEvents);

        return $totalFail > 0 ? 1 : 0;
    }

    private function displayResults(int $success, int $fail, int $skipped, int $total): void
    {
        $this->info('╔════════════════════════════════════════════════════════════╗');
        $this->info('║                    Test Results                            ║');
        $this->info('╚════════════════════════════════════════════════════════╝');
        $this->newLine();
        
        $this->line("Total Events:     {$total}");
        $this->line("✅ Succeeded:     {$success} (" . round(($success / $total) * 100, 1) . "%)");
        $this->line("⚠️  Skipped:       {$skipped} (" . round(($skipped / $total) * 100, 1) . "%)");
        $this->line("❌ Failed:         {$fail} (" . round(($fail / $total) * 100, 1) . "%)");
        $this->newLine();
        
        if ($fail > 0) {
            $this->warn("⚠️  Some notifications failed. Use -v flag for details.");
        } elseif ($skipped > 0 && $success === 0) {
            $this->warn("⚠️  All notifications were skipped (no test entities found).");
            $this->newLine();
            $this->info("💡 Tip: Create some test data first:");
            $this->line("   - Create students, admissions, exams, fees, etc.");
            $this->line("   - Or test specific modules that have data");
            $this->line("   - Use -v flag to see which entities are missing");
        } elseif ($skipped > 0) {
            $this->info("ℹ️  Some notifications were skipped (no test entities found).");
            $this->line("   Use -v flag to see which ones were skipped.");
        } else {
            $this->info("✅ All notifications tested successfully!");
        }
    }

    private function testEvent(NotificationService $notificationService, string $eventType, User $testUser, bool $verbose): bool
    {
        $entity = $this->getTestEntity($eventType, $testUser);
        if (!$entity) {
            return false;
        }

        $payload = $this->getTestPayload($eventType, $entity);

        try {
            $notificationService->notify(
                $eventType,
                $entity,
                $testUser,
                array_merge($payload, ['exclude_actor' => false])
            );

            // Verify notification was created
            $notification = Notification::whereHas('event', function($q) use ($eventType, $entity) {
                $q->where('type', $eventType)
                  ->where('entity_type', get_class($entity))
                  ->where('entity_id', $entity->id);
            })
            ->where('user_id', $testUser->id)
            ->where('created_at', '>=', now()->subMinute())
            ->first();

            return $notification !== null;
        } catch (\Exception $e) {
            if ($verbose) {
                Log::error("Test notification failed for {$eventType}", [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
            throw $e;
        }
    }

    private function getTestEntity(string $eventType, User $testUser)
    {
        // Get organization_id from user's profile
        $profile = DB::table('profiles')->where('id', $testUser->id)->first();
        $organizationId = $profile->organization_id ?? null;

        if (!$organizationId) {
            return null;
        }

        // Map event types to entities
        $entityMap = [
            // Admissions
            'admission.created' => fn() => StudentAdmission::where('organization_id', $organizationId)->latest()->first(),
            'admission.approved' => fn() => StudentAdmission::where('organization_id', $organizationId)->latest()->first(),
            'admission.rejected' => fn() => StudentAdmission::where('organization_id', $organizationId)->latest()->first(),
            'admission.deleted' => fn() => StudentAdmission::where('organization_id', $organizationId)->latest()->first(),
            
            // Finance - Income
            'income.created' => fn() => IncomeEntry::where('organization_id', $organizationId)->latest()->first(),
            'income.updated' => fn() => IncomeEntry::where('organization_id', $organizationId)->latest()->first(),
            'income.deleted' => fn() => IncomeEntry::where('organization_id', $organizationId)->latest()->first(),
            
            // Finance - Expense
            'expense.created' => fn() => \App\Models\ExpenseEntry::where('organization_id', $organizationId)->latest()->first(),
            'expense.approved' => fn() => \App\Models\ExpenseEntry::where('organization_id', $organizationId)->latest()->first(),
            'expense.rejected' => fn() => \App\Models\ExpenseEntry::where('organization_id', $organizationId)->latest()->first(),
            'expense.deleted' => fn() => \App\Models\ExpenseEntry::where('organization_id', $organizationId)->latest()->first(),
            
            // Finance - Invoice/Payment (using ExpenseEntry or PaymentRecord as fallback)
            'invoice.created' => fn() => \App\Models\ExpenseEntry::where('organization_id', $organizationId)->latest()->first()
                ?? \App\Models\PaymentRecord::where('organization_id', $organizationId)->latest()->first(),
            'payment.received' => fn() => \App\Models\FeePayment::where('organization_id', $organizationId)->latest()->first()
                ?? \App\Models\PaymentRecord::where('organization_id', $organizationId)->latest()->first()
                ?? \App\Models\IncomeEntry::where('organization_id', $organizationId)->latest()->first(),
            'invoice.overdue' => fn() => \App\Models\ExpenseEntry::where('organization_id', $organizationId)->latest()->first()
                ?? \App\Models\PaymentRecord::where('organization_id', $organizationId)->latest()->first(),
            
            // Finance - Account/Project
            'finance.account.low_balance' => fn() => \App\Models\FinanceAccount::where('organization_id', $organizationId)->latest()->first(),
            'finance.project.budget_warning' => fn() => \App\Models\FinanceProject::where('organization_id', $organizationId)->latest()->first(),
            
            // Finance - Documents
            'finance_document.created' => fn() => \App\Models\FinanceDocument::where('organization_id', $organizationId)->latest()->first(),
            'finance_document.deleted' => fn() => \App\Models\FinanceDocument::where('organization_id', $organizationId)->latest()->first(),
            
            // Fees
            'fee.assignment.created' => fn() => FeeAssignment::where('organization_id', $organizationId)->latest()->first(),
            'fee.payment.received' => fn() => FeeAssignment::where('organization_id', $organizationId)->latest()->first(),
            'fee.assignment.overdue' => fn() => FeeAssignment::where('organization_id', $organizationId)->latest()->first(),
            'fee.assignment.paid' => fn() => FeeAssignment::where('organization_id', $organizationId)->latest()->first(),
            'fee.assignment.status_changed' => fn() => FeeAssignment::where('organization_id', $organizationId)->latest()->first(),
            
            // Exams
            'exam.created' => fn() => Exam::where('organization_id', $organizationId)->latest()->first(),
            'exam.published' => fn() => Exam::where('organization_id', $organizationId)->latest()->first(),
            'exam.marks_published' => fn() => Exam::where('organization_id', $organizationId)->latest()->first(),
            'exam.timetable_updated' => fn() => Exam::where('organization_id', $organizationId)->latest()->first(),
            'exam.marks_updated' => fn() => \App\Models\ExamResult::where('organization_id', $organizationId)->latest()->first(),
            
            // Students
            'student.created' => fn() => \App\Models\Student::where('organization_id', $organizationId)->latest()->first(),
            'student.updated' => fn() => \App\Models\Student::where('organization_id', $organizationId)->latest()->first(),
            'student.deleted' => fn() => \App\Models\Student::where('organization_id', $organizationId)->latest()->first(),
            
            // Attendance
            'attendance.sync_failed' => fn() => AttendanceSession::where('organization_id', $organizationId)->latest()->first()
                ?? \App\Models\Organization::find($organizationId),
            'attendance.anomaly' => fn() => AttendanceSession::where('organization_id', $organizationId)->latest()->first(),
            'attendance.session.created' => fn() => AttendanceSession::where('organization_id', $organizationId)->latest()->first(),
            'attendance.session.closed' => fn() => AttendanceSession::where('organization_id', $organizationId)->latest()->first(),
            
            // Library
            'library.book_overdue' => fn() => LibraryLoan::where('organization_id', $organizationId)->latest()->first(),
            'library.book_due_soon' => fn() => LibraryLoan::where('organization_id', $organizationId)->latest()->first(),
            'library.book_reserved' => fn() => LibraryLoan::where('organization_id', $organizationId)->latest()->first(),
            
            // Assets
            'asset.assigned' => fn() => \App\Models\AssetAssignment::where('organization_id', $organizationId)->latest()->first()
                ?? \App\Models\Asset::where('organization_id', $organizationId)->latest()->first(),
            'asset.maintenance_due' => fn() => \App\Models\Asset::where('organization_id', $organizationId)->latest()->first(),
            'asset.returned' => fn() => \App\Models\AssetAssignment::where('organization_id', $organizationId)->latest()->first()
                ?? \App\Models\Asset::where('organization_id', $organizationId)->latest()->first(),
            
            // DMS
            'doc.assigned' => fn() => \App\Models\IncomingDocument::where('organization_id', $organizationId)->latest()->first(),
            'doc.approved' => fn() => \App\Models\IncomingDocument::where('organization_id', $organizationId)->latest()->first(),
            'doc.returned' => fn() => \App\Models\IncomingDocument::where('organization_id', $organizationId)->latest()->first(),
            
            // Security
            'security.password_changed' => fn() => $testUser,
            'security.new_device_login' => fn() => $testUser,
            
            // Subscription
            'subscription.limit_approaching' => fn() => \App\Models\Organization::find($organizationId),
            'subscription.limit_reached' => fn() => \App\Models\Organization::find($organizationId),
            'subscription.expiring_soon' => fn() => \App\Models\OrganizationSubscription::where('organization_id', $organizationId)->latest()->first(),
            'subscription.expired' => fn() => \App\Models\OrganizationSubscription::where('organization_id', $organizationId)->latest()->first(),
            
            // System
            'system.backup_failed' => fn() => \App\Models\Organization::find($organizationId),
            'system.license_expiring' => fn() => \App\Models\Organization::find($organizationId),
        ];

        $getter = $entityMap[$eventType] ?? null;
        if (!$getter) {
            return null;
        }

        try {
            $entity = $getter();
            // If entity is null, try fallback entities for some event types
            if (!$entity && in_array($eventType, ['invoice.created', 'payment.received', 'invoice.overdue'])) {
                // For invoice/payment events, use organization as fallback
                return \App\Models\Organization::find($organizationId);
            }
            return $entity;
        } catch (\Exception $e) {
            // Handle class not found errors gracefully
            if (str_contains($e->getMessage(), 'Class') && str_contains($e->getMessage(), 'not found')) {
                if ($this->getOutput()->isVerbose()) {
                    $this->warn("  Model class not found for {$eventType}, using organization as fallback");
                }
                return \App\Models\Organization::find($organizationId);
            }
            if ($this->getOutput()->isVerbose()) {
                Log::debug("Entity getter failed for {$eventType}", ['error' => $e->getMessage()]);
            }
            return null;
        }
    }

    private function getTestPayload(string $eventType, $entity): array
    {
        $basePayloads = [
            // Admissions
            'admission.created' => [
                'title' => 'Test: Admission Created',
                'body' => 'Test notification for admission creation',
                'url' => '/students/admissions',
            ],
            'admission.approved' => [
                'title' => 'Test: Admission Approved',
                'body' => 'Test notification for admission approval',
                'url' => '/students/admissions',
            ],
            'admission.rejected' => [
                'title' => 'Test: Admission Rejected',
                'body' => 'Test notification for admission rejection',
                'url' => '/students/admissions',
                'level' => 'warning',
            ],
            'admission.deleted' => [
                'title' => 'Test: Admission Deleted',
                'body' => 'Test notification for admission deletion',
                'url' => '/students/admissions',
                'level' => 'warning',
            ],
            
            // Finance - Income
            'income.created' => [
                'title' => 'Test: Income Created',
                'body' => 'Test notification for income creation',
                'url' => '/finance/income',
            ],
            'income.updated' => [
                'title' => 'Test: Income Updated',
                'body' => 'Test notification for income update',
                'url' => '/finance/income',
            ],
            'income.deleted' => [
                'title' => 'Test: Income Deleted',
                'body' => 'Test notification for income deletion',
                'url' => '/finance/income',
                'level' => 'warning',
            ],
            
            // Finance - Expense
            'expense.created' => [
                'title' => 'Test: Expense Created',
                'body' => 'Test notification for expense creation',
                'url' => '/finance/expenses',
            ],
            'expense.approved' => [
                'title' => 'Test: Expense Approved',
                'body' => 'Test notification for expense approval',
                'url' => '/finance/expenses',
            ],
            'expense.rejected' => [
                'title' => 'Test: Expense Rejected',
                'body' => 'Test notification for expense rejection',
                'url' => '/finance/expenses',
                'level' => 'warning',
            ],
            'expense.deleted' => [
                'title' => 'Test: Expense Deleted',
                'body' => 'Test notification for expense deletion',
                'url' => '/finance/expenses',
                'level' => 'warning',
            ],
            
            // Finance - Invoice/Payment
            'invoice.created' => [
                'title' => 'Test: Invoice Created',
                'body' => 'Test notification for invoice creation',
                'url' => '/finance/invoices',
            ],
            'payment.received' => [
                'title' => 'Test: Payment Received',
                'body' => 'Test notification for payment received',
                'url' => '/finance/payments',
            ],
            'invoice.overdue' => [
                'title' => 'Test: Invoice Overdue',
                'body' => 'Test notification for overdue invoice',
                'url' => '/finance/invoices',
                'level' => 'warning',
            ],
            
            // Finance - Account/Project
            'finance.account.low_balance' => [
                'title' => 'Test: Account Low Balance',
                'body' => 'Test notification for low account balance',
                'url' => '/finance/accounts',
                'level' => 'warning',
            ],
            'finance.project.budget_warning' => [
                'title' => 'Test: Project Budget Warning',
                'body' => 'Test notification for project budget warning',
                'url' => '/finance/projects',
                'level' => 'warning',
            ],
            
            // Finance - Documents
            'finance_document.created' => [
                'title' => 'Test: Finance Document Created',
                'body' => 'Test notification for finance document creation',
                'url' => '/finance/documents',
            ],
            'finance_document.deleted' => [
                'title' => 'Test: Finance Document Deleted',
                'body' => 'Test notification for finance document deletion',
                'url' => '/finance/documents',
                'level' => 'warning',
            ],
            
            // Fees
            'fee.assignment.created' => [
                'title' => 'Test: Fee Assignment Created',
                'body' => 'Test notification for fee assignment',
                'url' => '/fees/assignments',
            ],
            'fee.payment.received' => [
                'title' => 'Test: Fee Payment Received',
                'body' => 'Test notification for fee payment',
                'url' => '/fees/payments',
            ],
            'fee.assignment.overdue' => [
                'title' => 'Test: Fee Assignment Overdue',
                'body' => 'Test notification for overdue fee assignment',
                'url' => '/fees/assignments',
                'level' => 'warning',
            ],
            'fee.assignment.paid' => [
                'title' => 'Test: Fee Assignment Paid',
                'body' => 'Test notification for paid fee assignment',
                'url' => '/fees/assignments',
            ],
            'fee.assignment.status_changed' => [
                'title' => 'Test: Fee Status Changed',
                'body' => 'Test notification for fee status change',
                'url' => '/fees/assignments',
            ],
            
            // Exams
            'exam.created' => [
                'title' => 'Test: Exam Created',
                'body' => 'Test notification for exam creation',
                'url' => '/exams',
            ],
            'exam.published' => [
                'title' => 'Test: Exam Published',
                'body' => 'Test notification for exam publication',
                'url' => '/exams',
            ],
            'exam.marks_published' => [
                'title' => 'Test: Exam Marks Published',
                'body' => 'Test notification for exam marks publication',
                'url' => '/exams/results',
            ],
            'exam.timetable_updated' => [
                'title' => 'Test: Exam Timetable Updated',
                'body' => 'Test notification for exam timetable update',
                'url' => '/exams/timetable',
                'level' => 'warning',
            ],
            'exam.marks_updated' => [
                'title' => 'Test: Exam Marks Updated',
                'body' => 'Test notification for exam marks update',
                'url' => '/exams/results',
            ],
            
            // Students
            'student.created' => [
                'title' => 'Test: Student Created',
                'body' => 'Test notification for student creation',
                'url' => '/students',
            ],
            'student.updated' => [
                'title' => 'Test: Student Updated',
                'body' => 'Test notification for student update',
                'url' => '/students',
            ],
            'student.deleted' => [
                'title' => 'Test: Student Deleted',
                'body' => 'Test notification for student deletion',
                'url' => '/students',
                'level' => 'warning',
            ],
            
            // Attendance
            'attendance.sync_failed' => [
                'title' => 'Test: Attendance Sync Failed',
                'body' => 'Test notification for attendance sync failure',
                'url' => '/attendance/sessions',
                'level' => 'critical',
            ],
            'attendance.anomaly' => [
                'title' => 'Test: Attendance Anomaly',
                'body' => 'Test notification for attendance anomaly',
                'url' => '/attendance/sessions',
                'level' => 'warning',
            ],
            'attendance.session.created' => [
                'title' => 'Test: Attendance Session Created',
                'body' => 'Test notification for attendance session creation',
                'url' => '/attendance/sessions',
            ],
            'attendance.session.closed' => [
                'title' => 'Test: Attendance Session Closed',
                'body' => 'Test notification for attendance session closure',
                'url' => '/attendance/sessions',
            ],
            
            // Library
            'library.book_overdue' => [
                'title' => 'Test: Book Overdue',
                'body' => 'Test notification for overdue book',
                'url' => '/library/loans',
                'level' => 'critical',
            ],
            'library.book_due_soon' => [
                'title' => 'Test: Book Due Soon',
                'body' => 'Test notification for book due soon',
                'url' => '/library/loans',
                'level' => 'warning',
            ],
            'library.book_reserved' => [
                'title' => 'Test: Book Reserved',
                'body' => 'Test notification for book reservation',
                'url' => '/library/reservations',
            ],
            
            // Assets
            'asset.assigned' => [
                'title' => 'Test: Asset Assigned',
                'body' => 'Test notification for asset assignment',
                'url' => '/assets',
            ],
            'asset.maintenance_due' => [
                'title' => 'Test: Asset Maintenance Due',
                'body' => 'Test notification for asset maintenance due',
                'url' => '/assets/maintenance',
                'level' => 'warning',
            ],
            'asset.returned' => [
                'title' => 'Test: Asset Returned',
                'body' => 'Test notification for asset return',
                'url' => '/assets',
            ],
            
            // DMS
            'doc.assigned' => [
                'title' => 'Test: Document Assigned',
                'body' => 'Test notification for document assignment',
                'url' => '/dms/incoming',
            ],
            'doc.approved' => [
                'title' => 'Test: Document Approved',
                'body' => 'Test notification for document approval',
                'url' => '/dms/incoming',
            ],
            'doc.returned' => [
                'title' => 'Test: Document Returned',
                'body' => 'Test notification for document return',
                'url' => '/dms/incoming',
                'level' => 'warning',
            ],
            
            // Security
            'security.password_changed' => [
                'title' => 'Test: Password Changed',
                'body' => 'Test notification for password change',
                'url' => '/settings/security',
                'level' => 'critical',
            ],
            'security.new_device_login' => [
                'title' => 'Test: New Device Login',
                'body' => 'Test notification for new device login',
                'url' => '/settings/security',
                'level' => 'critical',
            ],
            
            // Subscription
            'subscription.limit_approaching' => [
                'title' => 'Test: Subscription Limit Approaching',
                'body' => 'Test notification for subscription limit approaching',
                'url' => '/settings/subscription',
                'level' => 'warning',
            ],
            'subscription.limit_reached' => [
                'title' => 'Test: Subscription Limit Reached',
                'body' => 'Test notification for subscription limit reached',
                'url' => '/settings/subscription',
                'level' => 'critical',
            ],
            'subscription.expiring_soon' => [
                'title' => 'Test: Subscription Expiring Soon',
                'body' => 'Test notification for subscription expiring soon',
                'url' => '/settings/subscription',
                'level' => 'warning',
            ],
            'subscription.expired' => [
                'title' => 'Test: Subscription Expired',
                'body' => 'Test notification for subscription expired',
                'url' => '/settings/subscription',
                'level' => 'critical',
            ],
            
            // System
            'system.backup_failed' => [
                'title' => 'Test: Backup Failed',
                'body' => 'Test notification for backup failure',
                'url' => '/settings/backup',
                'level' => 'critical',
            ],
            'system.license_expiring' => [
                'title' => 'Test: License Expiring',
                'body' => 'Test notification for license expiring',
                'url' => '/settings/license',
                'level' => 'warning',
            ],
        ];

        return $basePayloads[$eventType] ?? [
            'title' => "Test: {$eventType}",
            'body' => "Test notification for {$eventType}",
            'url' => '/',
        ];
    }

    private function getTestUser(?string $userId): ?User
    {
        if ($userId) {
            $user = User::find($userId);
            if (!$user) {
                $this->error("❌ User not found: {$userId}");
                return null;
            }
            return $user;
        }

        // Get first user with organization_id
        $user = User::whereHas('profile', function($q) {
            $q->whereNotNull('organization_id');
        })->first();

        if (!$user) {
            $this->error("❌ No users found with organization_id");
            $this->warn("💡 Tip: Create a user with an organization_id to test notifications");
            return null;
        }

        $this->info("👤 Using test user: {$user->email} (ID: {$user->id})");
        return $user;
    }
}
