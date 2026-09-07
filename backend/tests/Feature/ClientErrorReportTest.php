<?php

namespace Tests\Feature;

use App\Models\ClientErrorReport;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ClientErrorReportTest extends TestCase
{
    use RefreshDatabase;

    private const PLATFORM_ORG_ID = '00000000-0000-0000-0000-000000000000';

    private function createPlatformAdmin(): User
    {
        Organization::firstOrCreate(
            ['id' => self::PLATFORM_ORG_ID],
            ['name' => 'Platform (Global Permissions)', 'slug' => 'platform-global', 'settings' => []]
        );

        $user = User::create([
            'email' => 'platform-errors@example.com',
            'encrypted_password' => Hash::make('password'),
        ]);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permission = \App\Models\Permission::firstOrCreate(
            ['name' => 'subscription.admin', 'guard_name' => 'web', 'organization_id' => null],
            ['resource' => 'subscription', 'action' => 'admin', 'description' => 'Platform administration']
        );

        setPermissionsTeamId(self::PLATFORM_ORG_ID);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $user->refresh();

        return $user;
    }

    public function test_guest_can_create_client_error_report(): void
    {
        $response = $this->postJson('/api/client-error-reports', [
            'client_error_id' => 'abc123xyz',
            'message' => 'Cannot read properties of undefined',
            'stack' => 'Error: Cannot read…\n    at Foo',
            'component_stack' => '    in StudentsPage',
            'url' => 'http://localhost:5173/students',
            'level' => 'critical',
            'user_agent' => 'PHPUnit',
        ]);

        $response->assertCreated();
        $response->assertJsonStructure(['data' => ['id', 'client_error_id']]);

        $this->assertDatabaseHas('client_error_reports', [
            'client_error_id' => 'abc123xyz',
            'message' => 'Cannot read properties of undefined',
            'user_reported' => false,
            'status' => 'new',
            'level' => 'critical',
        ]);
    }

    public function test_user_can_flag_report_with_optional_note(): void
    {
        $create = $this->postJson('/api/client-error-reports', [
            'message' => 'Render crash',
            'url' => 'http://localhost/dashboard',
            'level' => 'component',
        ]);
        $create->assertCreated();
        $id = $create->json('data.id');

        $response = $this->patchJson("/api/client-error-reports/{$id}/report", [
            'user_note' => 'Clicked save on student form',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('client_error_reports', [
            'id' => $id,
            'user_reported' => true,
            'user_note' => 'Clicked save on student form',
        ]);
    }

    public function test_platform_admin_can_list_and_update_error_reports(): void
    {
        $report = ClientErrorReport::create([
            'message' => 'Platform list test error',
            'url' => '/exams',
            'level' => 'page',
            'status' => 'new',
            'user_reported' => true,
        ]);

        $admin = $this->createPlatformAdmin();
        Sanctum::actingAs($admin);

        $list = $this->getJson('/api/platform/error-reports');
        $list->assertOk();
        $list->assertJsonFragment(['id' => $report->id]);

        $stats = $this->getJson('/api/platform/error-reports/stats');
        $stats->assertOk();
        $stats->assertJsonPath('data.new', 1);

        $update = $this->putJson("/api/platform/error-reports/{$report->id}", [
            'status' => 'resolved',
            'admin_notes' => 'Fixed in next release',
        ]);
        $update->assertOk();

        $this->assertDatabaseHas('client_error_reports', [
            'id' => $report->id,
            'status' => 'resolved',
            'admin_notes' => 'Fixed in next release',
        ]);
    }

    public function test_regular_user_cannot_access_platform_error_reports(): void
    {
        $user = $this->authenticate(['email' => 'regular-errors@example.com']);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/platform/error-reports');
        $response->assertStatus(403);
    }
}
