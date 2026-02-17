<?php

namespace App\Console\Commands;

use App\Services\LoginAttemptService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class UnlockLoginCommand extends Command
{
    protected $signature = 'login-audit:unlock {email : The email address to unlock}';

    protected $description = 'Unlock a login-locked account by email (for recovery when locked out)';

    public function handle(LoginAttemptService $loginAttemptService): int
    {
        $email = $this->argument('email');

        if (empty(trim($email))) {
            $this->error('Email is required.');

            return Command::FAILURE;
        }

        $normalizedEmail = $loginAttemptService->normalizeEmail($email);

        $locked = DB::connection('pgsql')
            ->table('nazim_logs.login_lockouts')
            ->where('email', $normalizedEmail)
            ->whereNull('unlocked_at')
            ->exists();

        if (! $locked) {
            $this->warn("No active lockout found for: {$email}");
            $this->info('The account may already be unlocked or the lock has expired.');

            return Command::SUCCESS;
        }

        $loginAttemptService->clearLockout($email, 'artisan_unlock', null);

        $this->info("Account unlocked successfully: {$email}");
        $this->info('You can now log in with the correct password.');

        return Command::SUCCESS;
    }
}
