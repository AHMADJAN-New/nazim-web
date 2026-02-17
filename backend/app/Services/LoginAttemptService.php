<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoginAttemptService
{
    /**
     * Normalize email to lowercase for consistent storage and lookup.
     */
    public function normalizeEmail(string $email): string
    {
        return strtolower(trim($email));
    }

    /**
     * Derive login context from request headers or referrer.
     */
    public function getLoginContext(Request $request): string
    {
        if ($request->header('X-Login-Context') === 'platform_admin') {
            return 'platform_admin';
        }

        $referer = $request->header('Referer', '');
        if (str_contains($referer, '/platform/login')) {
            return 'platform_admin';
        }

        return 'main_app';
    }

    /**
     * Record a login attempt (success or failure).
     *
     * @param  array{id: string, organization_id?: string, default_school_id?: string}|null  $profile
     */
    public function recordAttempt(
        string $email,
        bool $success,
        ?string $failureReason,
        Request $request,
        ?object $user = null,
        ?object $profile = null
    ): void {
        $normalizedEmail = $this->normalizeEmail($email);
        $userId = $user?->id ?? null;
        $organizationId = $profile?->organization_id ?? null;
        $schoolId = $profile?->default_school_id ?? null;

        $consecutiveFailures = $success ? 0 : $this->getConsecutiveFailures($normalizedEmail);
        $wasLocked = $this->isLocked($normalizedEmail);

        DB::connection('pgsql')->table('nazim_logs.login_attempts')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'attempted_at' => now(),
            'email' => $normalizedEmail,
            'user_id' => $userId,
            'success' => $success,
            'failure_reason' => $failureReason,
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'ip_address' => $request->ip() ?? '0.0.0.0',
            'user_agent' => $request->userAgent(),
            'login_context' => $this->getLoginContext($request),
            'consecutive_failures' => $consecutiveFailures,
            'was_locked' => $wasLocked,
        ]);
    }

    /**
     * Get count of consecutive failed attempts for an email within the lockout window.
     */
    public function getConsecutiveFailures(string $email): int
    {
        $normalizedEmail = $this->normalizeEmail($email);
        $windowMinutes = config('login.lockout_duration_minutes', 15);
        $since = now()->subMinutes($windowMinutes);

        return (int) DB::connection('pgsql')
            ->table('nazim_logs.login_attempts')
            ->where('email', $normalizedEmail)
            ->where('success', false)
            ->where('attempted_at', '>=', $since)
            ->count();
    }

    /**
     * Check if an email is currently locked.
     */
    public function isLocked(string $email): bool
    {
        $normalizedEmail = $this->normalizeEmail($email);

        $lock = DB::connection('pgsql')
            ->table('nazim_logs.login_lockouts')
            ->where('email', $normalizedEmail)
            ->whereNull('unlocked_at')
            ->orderByDesc('locked_at')
            ->first();

        if (! $lock) {
            return false;
        }

        $unlockTime = \Carbon\Carbon::parse($lock->locked_at)->addMinutes(config('login.lockout_duration_minutes', 15));

        return now()->lt($unlockTime);
    }

    /**
     * Get the locked until timestamp for an email, or null if not locked.
     */
    public function getLockedUntil(string $email): ?\Carbon\Carbon
    {
        $normalizedEmail = $this->normalizeEmail($email);

        $lock = DB::connection('pgsql')
            ->table('nazim_logs.login_lockouts')
            ->where('email', $normalizedEmail)
            ->whereNull('unlocked_at')
            ->orderByDesc('locked_at')
            ->first();

        if (! $lock) {
            return null;
        }

        $unlockTime = \Carbon\Carbon::parse($lock->locked_at)->addMinutes(config('login.lockout_duration_minutes', 15));

        if (now()->gte($unlockTime)) {
            $this->clearLockout($normalizedEmail, 'auto_expired');

            return null;
        }

        return $unlockTime;
    }

    /**
     * Record a new lockout for an email.
     */
    public function recordLockout(string $email, string $ip, int $failedAttemptCount): void
    {
        $normalizedEmail = $this->normalizeEmail($email);

        DB::connection('pgsql')->table('nazim_logs.login_lockouts')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'email' => $normalizedEmail,
            'locked_at' => now(),
            'unlocked_at' => null,
            'unlock_reason' => null,
            'unlocked_by' => null,
            'failed_attempt_count' => $failedAttemptCount,
            'ip_address' => $ip,
        ]);
    }

    /**
     * Clear lockout for an email.
     *
     * @param  string|null  $unlockedBy  Admin user ID who unlocked, if manual
     */
    public function clearLockout(string $email, string $reason = 'admin_unlocked', ?string $unlockedBy = null): void
    {
        $normalizedEmail = $this->normalizeEmail($email);

        DB::connection('pgsql')
            ->table('nazim_logs.login_lockouts')
            ->where('email', $normalizedEmail)
            ->whereNull('unlocked_at')
            ->update([
                'unlocked_at' => now(),
                'unlock_reason' => $reason,
                'unlocked_by' => $unlockedBy,
            ]);
    }

    /**
     * Get currently locked accounts for platform admin.
     *
     * @return array<int, object{email: string, locked_at: string, failed_attempt_count: int, ip_address: string}>
     */
    public function getLockedAccounts(): array
    {
        $durationMinutes = config('login.lockout_duration_minutes', 15);
        $cutoff = now()->subMinutes($durationMinutes);

        $rows = DB::connection('pgsql')
            ->table('nazim_logs.login_lockouts')
            ->whereNull('unlocked_at')
            ->where('locked_at', '>', $cutoff)
            ->orderByDesc('locked_at')
            ->get();

        return $rows->map(function ($row) use ($durationMinutes) {
            $unlockTime = \Carbon\Carbon::parse($row->locked_at)->addMinutes($durationMinutes);

            return (object) [
                'id' => $row->id ?? (string) \Illuminate\Support\Str::uuid(),
                'email' => $row->email,
                'locked_at' => $row->locked_at,
                'unlocked_at' => null,
                'unlock_reason' => $row->unlock_reason,
                'unlocked_by' => $row->unlocked_by,
                'failed_attempt_count' => (int) $row->failed_attempt_count,
                'ip_address' => $row->ip_address,
                'locked_until' => $unlockTime->toIso8601String(),
            ];
        })->values()->all();
    }

    /**
     * Check if we should trigger a lockout after this failure.
     */
    public function shouldLockout(string $email): bool
    {
        $consecutive = $this->getConsecutiveFailures($email);

        return $consecutive >= config('login.max_attempts', 5);
    }
}
