<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PlatformOrganizationOrderFormPaymentsTest extends TestCase
{
    use RefreshDatabase;

    private const PLATFORM_ORG_ID = '00000000-0000-0000-0000-000000000000';

    private function createOrg(string $name, string $slug, ?string $id = null): Organization
    {
        $payload = [
            'name' => $name,
            'slug' => $slug,
            'settings' => [],
        ];

        if ($id) {
            $payload['id'] = $id;
        }

        return Organization::create($payload);
    }

    private function grantPlatformAdminPermission(User $user): void
    {
        $this->createOrg('Platform', 'platform', self::PLATFORM_ORG_ID);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permission = Permission::firstOrCreate([
            'name' => 'subscription.admin',
            'guard_name' => 'web',
            'organization_id' => null,
        ]);

        setPermissionsTeamId(self::PLATFORM_ORG_ID);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $user->refresh();
    }

    public function test_platform_admin_can_record_order_form_payments_and_get_due_summary(): void
    {
        $organization = $this->createOrg('Order Form Org', 'order-form-org');
        $admin = User::create([
            'email' => 'order-form-admin@example.com',
            'encrypted_password' => 'test',
        ]);
        $this->grantPlatformAdminPermission($admin);

        Sanctum::actingAs($admin);

        $this->putJson("/api/platform/organizations/{$organization->id}/order-form", [
            'currency' => 'AFN',
            'license_fee' => 1000,
            'maintenance_fee' => 250,
            'additional_services_fee' => 0,
            'tax_amount' => 0,
            'discount_amount' => 0,
        ])->assertOk();

        $this->postJson("/api/platform/organizations/{$organization->id}/order-form/payments", [
            'payment_type' => 'license',
            'amount' => 600,
            'currency' => 'AFN',
            'payment_date' => now()->toDateString(),
            'payment_method' => 'cash',
            'notes' => 'First license payment',
        ])->assertCreated();

        $response = $this->getJson("/api/platform/organizations/{$organization->id}/order-form");
        $response->assertOk();
        $summary = $response->json('data.payment_summary');
        $this->assertNotNull($summary);
        $this->assertEquals(1000.0, (float) ($summary['license']['total'] ?? 0));
        $this->assertEquals(600.0, (float) ($summary['license']['paid'] ?? 0));
        $this->assertEquals(400.0, (float) ($summary['license']['due'] ?? 0));
        $this->assertEquals(250.0, (float) ($summary['maintenance']['total'] ?? 0));
        $this->assertEquals(0.0, (float) ($summary['maintenance']['paid'] ?? 0));
        $this->assertEquals(250.0, (float) ($summary['maintenance']['due'] ?? 0));
        $response->assertJsonCount(1, 'data.payments');
    }
}

