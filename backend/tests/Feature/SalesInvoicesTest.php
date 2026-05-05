<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationOrderFormPayment;
use App\Models\PaymentRecord;
use App\Models\Permission;
use App\Models\Profile;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SalesInvoicesTest extends TestCase
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

    private function createUserWithProfile(Organization $org, string $email): User
    {
        $user = User::create([
            'email' => $email,
            'encrypted_password' => 'test',
        ]);

        Profile::create([
            'id' => $user->id,
            'organization_id' => $org->id,
            'email' => $email,
            'role' => 'admin',
            'is_active' => true,
        ]);

        return $user;
    }

    private function grantOrgPermission(User $user, Organization $org, string $permissionName): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permission = Permission::firstOrCreate([
            'name' => $permissionName,
            'guard_name' => 'web',
            'organization_id' => $org->id,
        ]);

        setPermissionsTeamId($org->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $user->refresh();
    }

    public function test_platform_admin_can_view_sales_invoice_created_from_order_form(): void
    {
        $org = $this->createOrg('Invoice Org', 'invoice-org');
        $admin = User::create([
            'email' => 'platform-invoice-admin@example.com',
            'encrypted_password' => 'test',
        ]);
        $this->grantPlatformAdminPermission($admin);

        Sanctum::actingAs($admin);

        $this->putJson("/api/platform/organizations/{$org->id}/order-form", [
            'currency' => 'AFN',
            'license_fee' => 120000,
            'maintenance_fee' => 75000,
            'additional_services_fee' => 10000,
            'tax_amount' => 5000,
            'discount_amount' => 15000,
            'total_amount' => 120000 + 10000 + 5000 - 15000,
        ])->assertOk();

        $res = $this->getJson("/api/platform/organizations/{$org->id}/sales-invoice");
        $res->assertOk();
        $res->assertJsonPath('data.invoice.organization_id', $org->id);
        $this->assertEquals(120000 + 10000 + 5000 - 15000, (float) $res->json('data.invoice.total_amount'));
        $res->assertJsonCount(3, 'data.items');
    }

    public function test_org_user_can_only_access_own_sales_invoices(): void
    {
        $orgA = $this->createOrg('Org A', 'org-a');
        $orgB = $this->createOrg('Org B', 'org-b');

        $userA = $this->createUserWithProfile($orgA, 'orga-user@example.com');
        $this->grantOrgPermission($userA, $orgA, 'subscription.read');

        $invA = SalesInvoice::create([
            'organization_id' => $orgA->id,
            'invoice_number' => 'SAL-202605-0001',
            'currency' => 'AFN',
            'subtotal' => 100,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => 100,
            'status' => SalesInvoice::STATUS_SENT,
        ]);
        SalesInvoiceItem::create([
            'sales_invoice_id' => $invA->id,
            'title' => 'License fee',
            'quantity' => 1,
            'unit_price' => 100,
            'line_total' => 100,
            'sort_order' => 0,
        ]);

        $invB = SalesInvoice::create([
            'organization_id' => $orgB->id,
            'invoice_number' => 'SAL-202605-0002',
            'currency' => 'AFN',
            'subtotal' => 200,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => 200,
            'status' => SalesInvoice::STATUS_SENT,
        ]);

        Sanctum::actingAs($userA);

        $list = $this->getJson('/api/subscription/sales-invoices');
        $list->assertOk();
        $this->assertCount(1, $list->json('data'));
        $this->assertEquals($invA->id, $list->json('data.0.id'));

        $this->getJson("/api/subscription/sales-invoices/{$invB->id}")
            ->assertStatus(404);
    }

    public function test_migration_command_creates_invoice_and_links_license_payments(): void
    {
        $org = $this->createOrg('Migrate Org', 'migrate-org');

        $admin = User::create([
            'email' => 'platform-migrate-admin@example.com',
            'encrypted_password' => 'test',
        ]);
        $this->grantPlatformAdminPermission($admin);
        Sanctum::actingAs($admin);

        $this->putJson("/api/platform/organizations/{$org->id}/order-form", [
            'currency' => 'AFN',
            'license_fee' => 1000,
            'maintenance_fee' => 250,
            'additional_services_fee' => 0,
            'tax_amount' => 0,
            'discount_amount' => 0,
            'total_amount' => 1000,
        ])->assertOk();

        // Record two payments in the legacy order-form payments table
        $this->postJson("/api/platform/organizations/{$org->id}/order-form/payments", [
            'payment_type' => 'license',
            'amount' => 600,
            'currency' => 'AFN',
            'payment_date' => now()->toDateString(),
            'payment_method' => 'cash',
            'notes' => 'First license payment',
        ])->assertCreated();

        $this->postJson("/api/platform/organizations/{$org->id}/order-form/payments", [
            'payment_type' => 'maintenance',
            'amount' => 250,
            'currency' => 'AFN',
            'payment_date' => now()->toDateString(),
            'payment_method' => 'cash',
            'notes' => 'Maintenance paid',
        ])->assertCreated();

        // Run migration command
        $exit = Artisan::call('sales-invoices:migrate-from-order-forms', [
            '--organization_id' => $org->id,
        ]);
        $this->assertSame(0, $exit);

        $invoice = SalesInvoice::where('organization_id', $org->id)->first();
        $this->assertNotNull($invoice);

        // License payment should be linked to sales_invoice_id
        $linkedLicensePayments = PaymentRecord::where('organization_id', $org->id)
            ->where('payment_type', PaymentRecord::TYPE_LICENSE)
            ->where('sales_invoice_id', $invoice->id)
            ->get();
        $this->assertCount(1, $linkedLicensePayments);
        $this->assertEquals(600.0, (float) $linkedLicensePayments->first()->amount);

        // Maintenance payment should exist but not be linked
        $maintenancePayments = PaymentRecord::where('organization_id', $org->id)
            ->where('payment_type', PaymentRecord::TYPE_MAINTENANCE)
            ->whereNull('sales_invoice_id')
            ->get();
        $this->assertCount(1, $maintenancePayments);
        $this->assertEquals(250.0, (float) $maintenancePayments->first()->amount);

        // Ensure original order-form payments still exist (we don't delete them in migration)
        $this->assertGreaterThanOrEqual(
            2,
            OrganizationOrderFormPayment::where('organization_id', $org->id)->count()
        );
    }
}

