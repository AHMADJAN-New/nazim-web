<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use App\Models\User;
use App\Models\Profile;
use App\Models\Organization;
use App\Models\OrganizationSubscription;
use App\Models\Role;
use App\Models\SchoolBranding;
use App\Models\SubscriptionPlan;
use Database\Seeders\SubscriptionSeeder;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\PermissionRegistrar;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();
    }

    protected function authenticate(
        array $attributes = [],
        array $profileAttributes = [],
        $organization = null,
        $school = null,
        ?bool $schoolsAccessAll = null,
        array $options = []
    )
    {
        $user = $this->createUser($attributes, $profileAttributes, $organization, $school, $schoolsAccessAll, $options);
        Sanctum::actingAs($user);

        return $user;
    }

    protected function createUser(
        array $attributes = [],
        array $profileAttributes = [],
        $organization = null,
        $school = null,
        ?bool $schoolsAccessAll = null,
        array $options = []
    )
    {
        $options = array_merge([
            'withRole' => true,
            'role' => 'admin',
            'withSubscription' => true,
            'planSlug' => 'enterprise',
        ], $options);

        $user = User::factory()->create($attributes);

        $orgIdProvided = array_key_exists('organization_id', $profileAttributes);
        $orgId = $orgIdProvided ? $profileAttributes['organization_id'] : null;

        if (!$organization) {
            if ($orgIdProvided && $orgId) {
                $organization = Organization::find($orgId);
                if (!$organization) {
                    $organization = Organization::factory()->create(['id' => $orgId]);
                }
            } elseif (!$orgIdProvided) {
                $organization = Organization::factory()->create();
            }
        }

        $defaultSchoolId = $profileAttributes['default_school_id'] ?? null;
        if ($organization && !$school && !$defaultSchoolId) {
            $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        }

        if (!$school && $defaultSchoolId) {
            $school = SchoolBranding::find($defaultSchoolId);
        }

        $profileData = array_merge([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization?->id ?? $orgId,
            'default_school_id' => $school?->id ?? $defaultSchoolId,
            'schools_access_all' => $schoolsAccessAll ?? ($profileAttributes['schools_access_all'] ?? false),
        ], $profileAttributes);

        Profile::factory()->create($profileData);

        if ($organization && $options['withRole']) {
            $roleName = $options['role'] ?? 'admin';
            $role = Role::where('name', $roleName)
                ->where('organization_id', $organization->id)
                ->first();

            if (!$role) {
                $role = Role::create([
                    'name' => $roleName,
                    'guard_name' => 'web',
                    'organization_id' => $organization->id,
                ]);
            }

            app(PermissionRegistrar::class)->forgetCachedPermissions();
            setPermissionsTeamId($organization->id);
            $user->assignRole($role);
            setPermissionsTeamId(null);
        }

        if ($organization && $options['withSubscription']) {
            $this->ensureActiveSubscription($organization, $options['planSlug'] ?? 'enterprise');
        }

        return $user;
    }

    protected function actingAsUser($user)
    {
        Sanctum::actingAs($user);
        return $this;
    }

    protected function jsonAs($user, $method, $uri, array $data = [], array $headers = [])
    {
        return $this->actingAs($user)->json($method, $uri, $data, $headers);
    }

    protected function getUserOrganization($user)
    {
        return $user->profile->organization;
    }

    protected function getUserSchool($user)
    {
        $schoolId = $user->profile->default_school_id;
        return $schoolId ? SchoolBranding::find($schoolId) : null;
    }

    protected function ensureActiveSubscription(Organization $organization, string $planSlug): OrganizationSubscription
    {
        $existing = OrganizationSubscription::where('organization_id', $organization->id)
            ->whereNull('deleted_at')
            ->first();

        if ($existing) {
            return $existing;
        }

        $plan = $this->ensureSubscriptionPlan($planSlug);

        return OrganizationSubscription::create([
            'organization_id' => $organization->id,
            'plan_id' => $plan->id,
            'status' => OrganizationSubscription::STATUS_ACTIVE,
            'started_at' => now(),
            'expires_at' => now()->addDays(365),
            'currency' => 'AFN',
        ]);
    }

    protected function ensureSubscriptionPlan(string $planSlug): SubscriptionPlan
    {
        $plan = SubscriptionPlan::where('slug', $planSlug)->first();

        if ($plan) {
            return $plan;
        }

        app(SubscriptionSeeder::class)->run();

        $plan = SubscriptionPlan::where('slug', $planSlug)->first();
        if (!$plan) {
            throw new \RuntimeException("Subscription plan '{$planSlug}' not found after seeding.");
        }

        return $plan;
    }
}
