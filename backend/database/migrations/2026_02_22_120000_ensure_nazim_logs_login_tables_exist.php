<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Ensures nazim_logs schema and login_attempts / login_lockouts tables exist.
     * Idempotent: safe to run when tables already exist (e.g. after original migrations ran).
     */
    public function up(): void
    {
        $connection = DB::connection('pgsql');

        $connection->statement('CREATE SCHEMA IF NOT EXISTS nazim_logs');

        // login_attempts: create only if not exists (match 2026_02_17_085019_create_login_attempts_table)
        $connection->statement(<<<'SQL'
CREATE TABLE IF NOT EXISTS nazim_logs.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempted_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    email VARCHAR(255) NOT NULL,
    user_id UUID NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason VARCHAR(50) NULL,
    organization_id UUID NULL,
    school_id UUID NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NULL,
    login_context VARCHAR(20) NOT NULL DEFAULT 'main_app',
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    was_locked BOOLEAN NOT NULL DEFAULT false
)
SQL);
        $connection->statement('CREATE INDEX IF NOT EXISTS login_attempts_email_attempted_at_idx ON nazim_logs.login_attempts (email, attempted_at)');
        $connection->statement('CREATE INDEX IF NOT EXISTS login_attempts_organization_id_attempted_at_idx ON nazim_logs.login_attempts (organization_id, attempted_at)');
        $connection->statement('CREATE INDEX IF NOT EXISTS login_attempts_ip_address_attempted_at_idx ON nazim_logs.login_attempts (ip_address, attempted_at)');
        $connection->statement('CREATE INDEX IF NOT EXISTS login_attempts_success_attempted_at_idx ON nazim_logs.login_attempts (success, attempted_at)');
        $connection->statement('CREATE INDEX IF NOT EXISTS login_attempts_attempted_at_idx ON nazim_logs.login_attempts (attempted_at)');
        $connection->statement('CREATE INDEX IF NOT EXISTS login_attempts_user_id_attempted_at_idx ON nazim_logs.login_attempts (user_id, attempted_at)');

        // login_lockouts: create only if not exists (match 2026_02_17_085019_create_login_lockouts_table)
        $connection->statement(<<<'SQL'
CREATE TABLE IF NOT EXISTS nazim_logs.login_lockouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    locked_at TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unlocked_at TIMESTAMP(0) NULL,
    unlock_reason VARCHAR(50) NULL,
    unlocked_by UUID NULL,
    failed_attempt_count INTEGER NOT NULL,
    ip_address VARCHAR(45) NOT NULL
)
SQL);
        $connection->statement('CREATE INDEX IF NOT EXISTS login_lockouts_email_idx ON nazim_logs.login_lockouts (email)');
        $connection->statement('CREATE INDEX IF NOT EXISTS login_lockouts_unlocked_at_idx ON nazim_logs.login_lockouts (unlocked_at)');
    }

    /**
     * Reverse the migrations.
     * Down() is a no-op: we do not drop tables that may have been created by the original migrations.
     */
    public function down(): void
    {
        // Intentionally no-op: tables may have been created by 2026_02_17_* migrations.
    }
};
