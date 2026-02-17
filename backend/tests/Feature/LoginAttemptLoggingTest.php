<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Profile;
use App\Models\SchoolBranding;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginAttemptLoggingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ensureNazimLogsSchemaExists();
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
    public function successful_login_is_logged_in_login_attempts(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = User::factory()->create([
            'email' => 'success@example.com',
            'encrypted_password' => Hash::make('password123'),
        ]);
        Profile::factory()->create([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => true,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'success@example.com',
            'password' => 'password123',
        ]);

        $attempt = DB::connection('pgsql')
            ->table('nazim_logs.login_attempts')
            ->where('email', 'success@example.com')
            ->latest('attempted_at')
            ->first();

        $this->assertNotNull($attempt);
        $this->assertTrue((bool) $attempt->success);
        $this->assertNull($attempt->failure_reason);
    }

    /** @test */
    public function failed_login_user_not_found_is_logged(): void
    {
        $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'wrong',
        ]);

        $attempt = DB::connection('pgsql')
            ->table('nazim_logs.login_attempts')
            ->where('email', 'nonexistent@example.com')
            ->latest('attempted_at')
            ->first();

        $this->assertNotNull($attempt);
        $this->assertFalse((bool) $attempt->success);
        $this->assertSame('user_not_found', $attempt->failure_reason);
    }

    /** @test */
    public function failed_login_invalid_password_is_logged(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = User::factory()->create([
            'email' => 'wrongpass@example.com',
            'encrypted_password' => Hash::make('password123'),
        ]);
        Profile::factory()->create([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => true,
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'wrongpass@example.com',
            'password' => 'wrongpassword',
        ]);

        $attempt = DB::connection('pgsql')
            ->table('nazim_logs.login_attempts')
            ->where('email', 'wrongpass@example.com')
            ->latest('attempted_at')
            ->first();

        $this->assertNotNull($attempt);
        $this->assertFalse((bool) $attempt->success);
        $this->assertSame('invalid_password', $attempt->failure_reason);
    }
}
