<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Profile;
use App\Models\SchoolBranding;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginLockoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ensureNazimLogsSchemaExists();
        Config::set('login.max_attempts', 3);
        Config::set('login.lockout_duration_minutes', 15);
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
    public function account_is_locked_after_max_failed_attempts(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = User::factory()->create([
            'email' => 'lockout@example.com',
            'encrypted_password' => Hash::make('password123'),
        ]);
        Profile::factory()->create([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => true,
        ]);

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'lockout@example.com',
                'password' => 'wrong',
            ]);
        }

        $response = $this->postJson('/api/auth/login', [
            'email' => 'lockout@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
        $response->assertJsonStructure(['locked_until']);
    }

    /** @test */
    public function successful_login_clears_existing_lockout_after_lock_expires(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = User::factory()->create([
            'email' => 'clearlock@example.com',
            'encrypted_password' => Hash::make('password123'),
        ]);
        Profile::factory()->create([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => true,
        ]);

        $lockedAt = now()->subMinutes(20);
        DB::connection('pgsql')->table('nazim_logs.login_lockouts')->insert([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'email' => 'clearlock@example.com',
            'locked_at' => $lockedAt,
            'unlocked_at' => null,
            'unlock_reason' => null,
            'unlocked_by' => null,
            'failed_attempt_count' => 3,
            'ip_address' => '127.0.0.1',
        ]);

        $successResponse = $this->postJson('/api/auth/login', [
            'email' => 'clearlock@example.com',
            'password' => 'password123',
        ]);

        $successResponse->assertStatus(200);

        $lock = DB::connection('pgsql')
            ->table('nazim_logs.login_lockouts')
            ->where('email', 'clearlock@example.com')
            ->first();

        $this->assertNotNull($lock->unlocked_at);
        $this->assertSame('login_success', $lock->unlock_reason);
    }
}
