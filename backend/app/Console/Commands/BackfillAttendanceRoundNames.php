<?php

namespace App\Console\Commands;

use App\Models\AttendanceRoundName;
use App\Models\AttendanceSession;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BackfillAttendanceRoundNames extends Command
{
    protected $signature = 'attendance:backfill-round-names
                            {--organization-id= : Limit to one organization UUID}
                            {--school-id= : Limit to one school UUID}
                            {--chunk=500 : Sessions per DB chunk}
                            {--dry-run : Preview changes without writing}
                            {--force : Skip confirmation prompt}';

    protected $description = 'Backfill attendance_round_name_id on legacy attendance sessions safely';

    public function handle(): int
    {
        $organizationId = trim((string) ($this->option('organization-id') ?? ''));
        $schoolId = trim((string) ($this->option('school-id') ?? ''));
        $chunkSize = max(50, (int) ($this->option('chunk') ?? 500));
        $dryRun = (bool) $this->option('dry-run');

        if ($organizationId !== '' && ! Str::isUuid($organizationId)) {
            $this->error('--organization-id must be a valid UUID.');

            return self::FAILURE;
        }
        if ($schoolId !== '' && ! Str::isUuid($schoolId)) {
            $this->error('--school-id must be a valid UUID.');

            return self::FAILURE;
        }

        $scopeQuery = AttendanceSession::query()
            ->whereNull('deleted_at')
            ->whereNull('attendance_round_name_id');

        if ($organizationId !== '') {
            $scopeQuery->where('organization_id', $organizationId);
        }
        if ($schoolId !== '') {
            $scopeQuery->where('school_id', $schoolId);
        }

        $targetCount = (clone $scopeQuery)->count();
        if ($targetCount === 0) {
            $this->info('No legacy sessions found that need backfill.');

            return self::SUCCESS;
        }

        $this->warn("Found {$targetCount} legacy session(s) to backfill.");
        if ($dryRun) {
            $this->warn('Dry-run mode: no data will be written.');
        } elseif (! $this->option('force') && ! $this->confirm("Proceed with backfilling {$targetCount} session(s)?", true)) {
            $this->warn('Aborted.');

            return self::FAILURE;
        }

        $createdRounds = 0;
        $updatedSessions = 0;
        $scopesProcessed = 0;

        $scopes = (clone $scopeQuery)
            ->select('organization_id', 'school_id')
            ->groupBy('organization_id', 'school_id')
            ->get();

        foreach ($scopes as $scope) {
            $orgId = (string) $scope->organization_id;
            $schId = (string) $scope->school_id;
            $scopesProcessed++;

            $rounds = AttendanceRoundName::query()
                ->whereNull('deleted_at')
                ->where('organization_id', $orgId)
                ->where('school_id', $schId)
                ->orderBy('order_index')
                ->orderBy('name')
                ->get()
                ->values();

            $roundByName = [];
            $roundByOrder = [];
            foreach ($rounds as $round) {
                $roundByName[mb_strtolower(trim((string) $round->name))] = $round;
                if (! isset($roundByOrder[(int) $round->order_index])) {
                    $roundByOrder[(int) $round->order_index] = $round;
                }
            }

            $sessions = AttendanceSession::query()
                ->whereNull('deleted_at')
                ->whereNull('attendance_round_name_id')
                ->where('organization_id', $orgId)
                ->where('school_id', $schId)
                ->orderBy('session_date')
                ->orderBy('round_number')
                ->orderBy('created_at')
                ->orderBy('id')
                ->get(['id', 'session_label', 'round_number']);

            foreach ($sessions->chunk($chunkSize) as $chunk) {
                DB::transaction(function () use (
                    $chunk,
                    $orgId,
                    $schId,
                    $dryRun,
                    &$createdRounds,
                    &$updatedSessions,
                    &$roundByName,
                    &$roundByOrder
                ) {
                    foreach ($chunk as $session) {
                        $existingLabel = trim((string) ($session->session_label ?? ''));
                        $orderIndex = max(1, (int) ($session->round_number ?? 1));
                        $fallbackName = "Round {$orderIndex}";
                        $targetName = $existingLabel !== '' ? $existingLabel : $fallbackName;
                        $nameKey = mb_strtolower($targetName);

                        $round = $roundByName[$nameKey] ?? null;
                        if (! $round && $existingLabel === '' && isset($roundByOrder[$orderIndex])) {
                            $round = $roundByOrder[$orderIndex];
                        }

                        if (! $round) {
                            if ($dryRun) {
                                $round = new AttendanceRoundName([
                                    'id' => '(dry-run)',
                                    'organization_id' => $orgId,
                                    'school_id' => $schId,
                                    'name' => $targetName,
                                    'order_index' => $orderIndex,
                                    'is_active' => true,
                                ]);
                            } else {
                                $round = AttendanceRoundName::create([
                                    'organization_id' => $orgId,
                                    'school_id' => $schId,
                                    'name' => $targetName,
                                    'order_index' => $orderIndex,
                                    'is_active' => true,
                                ]);
                            }

                            $createdRounds++;
                            $roundByName[mb_strtolower($targetName)] = $round;
                            if (! isset($roundByOrder[$orderIndex])) {
                                $roundByOrder[$orderIndex] = $round;
                            }
                        }

                        $sessionLabel = $existingLabel !== '' ? $existingLabel : $round->name;
                        if (! $dryRun) {
                            DB::table('attendance_sessions')
                                ->where('id', $session->id)
                                ->update([
                                    'attendance_round_name_id' => $round->id,
                                    'session_label' => $sessionLabel,
                                    'updated_at' => now(),
                                ]);
                        }

                        $updatedSessions++;
                    }
                });
            }
        }

        $this->newLine();
        $this->info("Scopes processed: {$scopesProcessed}");
        $this->info("Round names created: {$createdRounds}");
        $this->info("Sessions linked: {$updatedSessions}");
        $this->line($dryRun ? 'Dry run finished. Re-run without --dry-run to apply.' : 'Backfill completed successfully.');

        return self::SUCCESS;
    }
}

