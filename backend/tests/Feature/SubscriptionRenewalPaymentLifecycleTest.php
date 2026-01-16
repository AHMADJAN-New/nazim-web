<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Models\PaymentRecord;
use App\Models\Permission;
use App\Models\Profile;
use App\Models\RenewalRequest;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SubscriptionRenewalPaymentLifecycleTest extends TestCase
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

    private function createPlan(string $slug, string $name, float $priceAfn, float $perSchoolAfn): SubscriptionPlan
    {
        return SubscriptionPlan::create([
            'name' => $name,
            'slug' => $slug,
            'description' => "{$name} (test)",
            'price_yearly_afn' => $priceAfn,
            'price_yearly_usd' => 0,
            'per_school_price_afn' => $perSchoolAfn,
            'per_school_price_usd' => 0,
            'is_active' => true,
            'is_default' => false,
            'is_custom' => false,
            'trial_days' => 0,
            'grace_period_days' => 14,
            'readonly_period_days' => 60,
            'max_schools' => 1,
            'sort_order' => 0,
        ]);
    }

    private function createActiveSubscription(Organization $org, SubscriptionPlan $plan, int $additionalSchools = 0): OrganizationSubscription
    {
        return OrganizationSubscription::create([
            'organization_id' => $org->id,
            'plan_id' => $plan->id,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'started_at' => now(),
            'expires_at' => now()->addDays(30),
            'currency' => 'AFN',
            'additional_schools' => $additionalSchools,
        ]);
    }

    private function grantPlatformAdminPermission(User $user): void
    {
        // Ensure the platform org exists (required by FK on model_has_permissions.organization_id).
        $this->createOrg('Platform', 'platform', self::PLATFORM_ORG_ID);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permission = Permission::firstOrCreate([
            'name' => 'subscription.admin',
            'guard_name' => 'web',
            'organization_id' => null, // permission itself is global
        ]);

        setPermissionsTeamId(self::PLATFORM_ORG_ID);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $user->refresh();
    }

    public function test_renewal_request_submit_payment_confirm_is_idempotent_and_activates_subscription(): void
    {
        $org = $this->createOrg('Renew Org', 'renew-org');
        $user = $this->createUserWithProfile($org, 'renew@example.com');

        $currentPlan = $this->createPlan('starter', 'Starter', 100, 5);
        $requestedPlan = $this->createPlan('pro', 'Pro', 200, 10);

        $this->createActiveSubscription($org, $currentPlan, 0);

        Sanctum::actingAs($user);

        // 1) Create renewal request
        $renewalRes = $this->postJson('/api/subscription/renewal-request', [
            'plan_id' => $requestedPlan->id,
            'additional_schools' => 2,
            'notes' => 'please renew',
        ]);
        $renewalRes->assertStatus(201)->assertJsonStructure(['data' => ['id']]);
        $renewalId = $renewalRes->json('data.id');

        /** @var RenewalRequest $renewal */
        $renewal = RenewalRequest::findOrFail($renewalId);
        $this->assertTrue($renewal->isPending());

        // 2) Submit payment (amount must match calculatePrice() legacy fields)
        // total = 200 + (2 * 10) = 220 AFN
        $paymentRes1 = $this->postJson('/api/subscription/submit-payment', [
            'renewal_request_id' => $renewalId,
            'amount' => 220,
            'currency' => 'AFN',
            'payment_method' => 'cash',
            'payment_reference' => 'TEST-REF',
            'payment_date' => now()->toDateString(),
            'notes' => 'test payment',
        ]);
        $paymentRes1->assertStatus(201)->assertJsonStructure(['data' => ['id', 'status']]);
        $paymentId1 = $paymentRes1->json('data.id');

        // 2b) Idempotency: submitting payment again returns the same pending payment
        $paymentRes2 = $this->postJson('/api/subscription/submit-payment', [
            'renewal_request_id' => $renewalId,
            'amount' => 220,
            'currency' => 'AFN',
            'payment_method' => 'cash',
            'payment_reference' => 'TEST-REF',
            'payment_date' => now()->toDateString(),
            'notes' => 'test payment',
        ]);
        $paymentRes2->assertStatus(201);
        $this->assertSame($paymentId1, $paymentRes2->json('data.id'));

        /** @var PaymentRecord $payment */
        $payment = PaymentRecord::findOrFail($paymentId1);
        $this->assertTrue($payment->isPending());

        // 3) Platform admin confirms payment (should approve renewal + activate new subscription)
        $admin = User::create([
            'email' => 'platform-admin@example.com',
            'encrypted_password' => 'test',
        ]);
        $this->grantPlatformAdminPermission($admin);

        Sanctum::actingAs($admin);

        $confirm1 = $this->postJson("/api/platform/payments/{$paymentId1}/confirm");
        $confirm1->assertOk()->assertJsonStructure(['data' => ['id', 'status'], 'message']);
        $this->assertSame(PaymentRecord::STATUS_CONFIRMED, $confirm1->json('data.status'));

        $active = OrganizationSubscription::where('organization_id', $org->id)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->first();

        $this->assertNotNull($active);
        $this->assertSame(OrganizationSubscription::STATUS_ACTIVE, $active->status);
        $this->assertSame($requestedPlan->id, $active->plan_id);
        $this->assertSame(2, (int) $active->additional_schools);

        $this->assertSame(
            1,
            OrganizationSubscription::where('organization_id', $org->id)->whereNull('deleted_at')->count(),
            'Only one active (non-deleted) subscription should exist after renewal'
        );

        // 3b) Idempotency: confirming the same payment again should not create another subscription
        $confirm2 = $this->postJson("/api/platform/payments/{$paymentId1}/confirm");
        $confirm2->assertOk();

        $this->assertSame(
            1,
            OrganizationSubscription::where('organization_id', $org->id)->whereNull('deleted_at')->count(),
            'Confirming the same payment twice must not create duplicate active subscriptions'
        );

        $activeAgain = OrganizationSubscription::where('organization_id', $org->id)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->first();

        $this->assertNotNull($activeAgain);
        $this->assertSame($active->id, $activeAgain->id);
    }
}

