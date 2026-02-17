<?php

namespace Tests\Unit;

use App\Services\LoginAttemptService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LoginAttemptServiceTest extends TestCase
{
    use RefreshDatabase;

    private LoginAttemptService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ensureNazimLogsSchemaExists();
        $this->service = app(LoginAttemptService::class);
    }

    private function ensureNazimLogsSchemaExists(): void
    {
        try {
            DB::connection('pgsql')->statement('CREATE SCHEMA IF NOT EXISTS nazim_logs');
        } catch (\Throwable $e) {
            // Schema may already exist
        }
    }

    /** @test */
    public function record_attempt_inserts_row_in_login_attempts(): void
    {
        $request = Request::create('/api/auth/login', 'POST', [
            'email' => 'test@example.com',
            'password' => 'secret',
        ]);
        $request->headers->set('User-Agent', 'TestAgent');

        $this->service->recordAttempt('test@example.com', false, 'invalid_password', $request);

        $attempt = DB::connection('pgsql')
            ->table('nazim_logs.login_attempts')
            ->where('email', 'test@example.com')
            ->first();

        $this->assertNotNull($attempt);
        $this->assertFalse((bool) $attempt->success);
        $this->assertSame('invalid_password', $attempt->failure_reason);
        $this->assertSame('main_app', $attempt->login_context);
    }

    /** @test */
    public function get_login_context_returns_platform_admin_from_header(): void
    {
        $request = Request::create('/api/auth/login', 'POST');
        $request->headers->set('X-Login-Context', 'platform_admin');

        $context = $this->service->getLoginContext($request);

        $this->assertSame('platform_admin', $context);
    }

    /** @test */
    public function get_login_context_returns_main_app_by_default(): void
    {
        $request = Request::create('/api/auth/login', 'POST');

        $context = $this->service->getLoginContext($request);

        $this->assertSame('main_app', $context);
    }

    /** @test */
    public function is_locked_returns_true_when_active_lock_exists(): void
    {
        config(['login.lockout_duration_minutes' => 15]);

        DB::connection('pgsql')->table('nazim_logs.login_lockouts')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'email' => 'locked@example.com',
            'locked_at' => now(),
            'unlocked_at' => null,
            'unlock_reason' => null,
            'unlocked_by' => null,
            'failed_attempt_count' => 5,
            'ip_address' => '127.0.0.1',
        ]);

        $this->assertTrue($this->service->isLocked('locked@example.com'));
    }

    /** @test */
    public function is_locked_returns_false_when_no_lock(): void
    {
        $this->assertFalse($this->service->isLocked('nobody@example.com'));
    }

    /** @test */
    public function clear_lockout_sets_unlocked_at_and_reason(): void
    {
        DB::connection('pgsql')->table('nazim_logs.login_lockouts')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'email' => 'toclear@example.com',
            'locked_at' => now(),
            'unlocked_at' => null,
            'unlock_reason' => null,
            'unlocked_by' => null,
            'failed_attempt_count' => 5,
            'ip_address' => '127.0.0.1',
        ]);

        $adminUserId = (string) \Illuminate\Support\Str::uuid();
        $this->service->clearLockout('toclear@example.com', 'admin_unlocked', $adminUserId);

        $lock = DB::connection('pgsql')
            ->table('nazim_logs.login_lockouts')
            ->where('email', 'toclear@example.com')
            ->first();

        $this->assertNotNull($lock->unlocked_at);
        $this->assertSame('admin_unlocked', $lock->unlock_reason);
        $this->assertSame($adminUserId, $lock->unlocked_by);
    }

    /** @test */
    public function get_consecutive_failures_returns_count_within_window(): void
    {
        config(['login.lockout_duration_minutes' => 15]);

        $request = Request::create('/api/auth/login', 'POST');
        $this->service->recordAttempt('failures@example.com', false, 'invalid_password', $request);
        $this->service->recordAttempt('failures@example.com', false, 'invalid_password', $request);

        $count = $this->service->getConsecutiveFailures('failures@example.com');

        $this->assertSame(2, $count);
    }
}
