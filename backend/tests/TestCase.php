<?php

namespace Tests;

use App\Models\Organization;
use App\Models\Profile;
use App\Models\SchoolBranding;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /**
     * Setup the test environment.
     */
    protected function setUp(): void
    {
        parent::setUp();

        // Reset permissions cache
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    /**
     * Create a test user with profile, organization, and school
     */
    protected function createUser(
        array $userAttributes = [],
        array $profileAttributes = [],
        ?Organization $organization = null,
        ?SchoolBranding $school = null
    ): User {
        // Create organization if not provided
        $organization = $organization ?? Organization::factory()->create();

        // Create school if not provided
        $school = $school ?? SchoolBranding::factory()->create([
            'organization_id' => $organization->id,
        ]);

        // Create user
        $user = User::factory()->create(array_merge([
            'email' => fake()->unique()->safeEmail(),
            'encrypted_password' => Hash::make('password'),
        ], $userAttributes));

        // Create profile with organization and school
        Profile::factory()->create(array_merge([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => true,
            'role' => 'admin',
        ], $profileAttributes));

        return $user->fresh();
    }

    /**
     * Authenticate a user via Sanctum and set organization context
     */
    protected function actingAsUser(User $user): self
    {
        Sanctum::actingAs($user, ['*']);

        // Set organization context for Spatie permissions
        $profile = Profile::find($user->id);
        if ($profile && $profile->organization_id) {
            setPermissionsTeamId($profile->organization_id);
        }

        return $this;
    }

    /**
     * Create and authenticate a user with school access
     */
    protected function authenticate(
        array $userAttributes = [],
        array $profileAttributes = [],
        ?Organization $organization = null,
        ?SchoolBranding $school = null,
        bool $giveSchoolAccessPermission = true
    ): User {
        $user = $this->createUser($userAttributes, $profileAttributes, $organization, $school);
        $this->actingAsUser($user);

        // Give schools.access_all permission by default so tests can access all schools
        if ($giveSchoolAccessPermission) {
            $this->givePermissionTo($user, 'schools.access_all');
        }

        return $user;
    }

    /**
     * Give permission to a user in their organization context
     */
    protected function givePermissionTo(User $user, string|array $permissions): void
    {
        $profile = Profile::find($user->id);

        if (!$profile || !$profile->organization_id) {
            return;
        }

        // Set organization context
        setPermissionsTeamId($profile->organization_id);

        $permissions = is_array($permissions) ? $permissions : [$permissions];

        foreach ($permissions as $permissionName) {
            // Create permission if it doesn't exist
            $permission = Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web',
            ]);

            $user->givePermissionTo($permission);
        }
    }

    /**
     * Create a user with specific role and permissions
     */
    protected function createUserWithRole(
        string $role,
        array $permissions = [],
        ?Organization $organization = null,
        ?SchoolBranding $school = null
    ): User {
        $organization = $organization ?? Organization::factory()->create();
        $school = $school ?? SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = $this->createUser([], [
            'role' => $role,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
        ], $organization, $school);

        // Set organization context
        setPermissionsTeamId($organization->id);

        // Give permissions
        if (!empty($permissions)) {
            $this->givePermissionTo($user, $permissions);
        }

        // Give schools.access_all by default
        $this->givePermissionTo($user, 'schools.access_all');

        return $user;
    }

    /**
     * Get the organization from authenticated user's profile
     */
    protected function getUserOrganization(User $user): ?Organization
    {
        $profile = $user->profile;
        return $profile ? $profile->organization : null;
    }

    /**
     * Get the school from authenticated user's profile
     */
    protected function getUserSchool(User $user): ?SchoolBranding
    {
        $profile = Profile::find($user->id);
        return $profile && $profile->default_school_id
            ? SchoolBranding::find($profile->default_school_id)
            : null;
    }

    /**
     * Assert JSON response has validation errors
     */
    protected function assertHasValidationErrors($response, array $fields): void
    {
        $response->assertStatus(422);

        foreach ($fields as $field) {
            $response->assertJsonValidationErrors($field);
        }
    }

    /**
     * Create an authenticated API request with Bearer token
     */
    protected function jsonAs(User $user, string $method, string $uri, array $data = [], array $headers = [])
    {
        $token = $user->createToken('test-token')->plainTextToken;

        // Set organization context for the request
        $profile = Profile::find($user->id);
        if ($profile && $profile->organization_id) {
            setPermissionsTeamId($profile->organization_id);
        }

        return $this->json($method, $uri, $data, array_merge([
            'Authorization' => "Bearer {$token}",
            'Accept' => 'application/json',
        ], $headers));
    }

    /**
     * Create multiple users in the same organization/school
     */
    protected function createUsersInSameOrg(int $count, Organization $organization, SchoolBranding $school): array
    {
        $users = [];
        for ($i = 0; $i < $count; $i++) {
            $users[] = $this->createUser([], [], $organization, $school);
        }
        return $users;
    }
}
