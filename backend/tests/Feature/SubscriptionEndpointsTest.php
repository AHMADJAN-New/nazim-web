<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Models\Permission;
use App\Models\Profile;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class SubscriptionEndpointsTest extends TestCase
{
    use RefreshDatabase;

    private function createOrg(string $name, string $slug): Organization
    {
        return Organization::create([
            'name' => $name,
            'slug' => $slug,
            'settings' => [],
        ]);
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

    private function createUserWithoutOrganization(string $email): User
    {
        $user = User::create([
            'email' => $email,
            'encrypted_password' => 'test',
        ]);

        Profile::create([
            'id' => $user->id,
            'organization_id' => null,
            'email' => $email,
            'role' => 'admin',
            'is_active' => true,
        ]);

        return $user;
    }

    private function createPlan(string $slug, string $name): SubscriptionPlan
    {
        return SubscriptionPlan::create([
            'name' => $name,
            'slug' => $slug,
            'description' => "{$name} (test)",
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

    private function createActiveSubscription(Organization $org, SubscriptionPlan $plan): OrganizationSubscription
    {
        return OrganizationSubscription::create([
            'organization_id' => $org->id,
            'plan_id' => $plan->id,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'started_at' => now(),
            'expires_at' => now()->addDays(30),
            'currency' => 'AFN',
        ]);
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

    public function test_status_lite_is_accessible_for_authenticated_user_without_subscription_read_permission(): void
    {
        $org = $this->createOrg('StatusLite Org', 'statuslite-org');
        $user = $this->createUserWithProfile($org, 'statuslite@example.com');
        $plan = $this->createPlan('starter', 'Starter');
        $this->createActiveSubscription($org, $plan);

        Sanctum::actingAs($user);

        $res = $this->getJson('/api/subscription/status-lite');

        $res->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'status',
                    'access_level',
                    'can_read',
                    'can_write',
                    'trial_ends_at',
                    'grace_period_ends_at',
                    'readonly_period_ends_at',
                    'message',
                ],
            ]);
    }

    public function test_status_usage_and_features_require_subscription_read_permission(): void
    {
        $org = $this->createOrg('Perm Org', 'perm-org');
        $user = $this->createUserWithProfile($org, 'perm@example.com');
        $plan = $this->createPlan('starter', 'Starter');
        $this->createActiveSubscription($org, $plan);

        Sanctum::actingAs($user);

        $this->getJson('/api/subscription/status')->assertStatus(403);
        $this->getJson('/api/subscription/usage')->assertStatus(403);
        $this->getJson('/api/subscription/features')->assertStatus(403);

        $this->grantOrgPermission($user, $org, 'subscription.read');

        $this->getJson('/api/subscription/status')->assertOk()->assertJsonStructure(['data']);
        $this->getJson('/api/subscription/usage')->assertOk()->assertJsonStructure(['data' => ['usage', 'warnings']]);
        $this->getJson('/api/subscription/features')->assertOk()->assertJsonStructure(['data']);
    }

    public function test_status_lite_returns_none_when_no_active_subscription(): void
    {
        $org = $this->createOrg('No Sub Org', 'no-sub-org');
        $user = $this->createUserWithProfile($org, 'nosub@example.com');

        Sanctum::actingAs($user);

        $res = $this->getJson('/api/subscription/status-lite');

        $res->assertOk()
            ->assertJson([
                'data' => [
                    'status' => 'none',
                    'access_level' => 'none',
                    'can_read' => false,
                    'can_write' => false,
                    'message' => 'No active subscription',
                ],
            ]);
    }

    public function test_status_lite_requires_organization_context(): void
    {
        $user = $this->createUserWithoutOrganization('no-org@example.com');

        Sanctum::actingAs($user);

        $this->getJson('/api/subscription/status-lite')->assertStatus(403);
    }
}
