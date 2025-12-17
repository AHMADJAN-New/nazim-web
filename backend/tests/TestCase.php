<?php

namespace Tests;

use App\Models\Organization;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    /**
     * Create a test user with profile and organization
     */
    protected function createUser(array $attributes = [], array $profileAttributes = [], ?Organization $organization = null): User
    {
        $organization = $organization ?? Organization::factory()->create();

        $user = User::factory()->create($attributes);

        Profile::factory()->create(array_merge([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'is_active' => true,
        ], $profileAttributes));

        return $user->fresh();
    }

    /**
     * Authenticate a user via Sanctum
     */
    protected function actingAsUser(User $user): self
    {
        Sanctum::actingAs($user, ['*']);
        return $this;
    }

    /**
     * Create and authenticate a user
     */
    protected function authenticate(array $attributes = [], array $profileAttributes = [], ?Organization $organization = null): User
    {
        $user = $this->createUser($attributes, $profileAttributes, $organization);
        $this->actingAsUser($user);
        return $user;
    }

    /**
     * Create a user with specific role and permissions
     */
    protected function createUserWithRole(string $role, array $permissions = [], ?Organization $organization = null): User
    {
        $organization = $organization ?? Organization::factory()->create();

        $user = $this->createUser([], [
            'role' => $role,
            'organization_id' => $organization->id,
        ], $organization);

        // Assign permissions if needed
        if (!empty($permissions)) {
            foreach ($permissions as $permission) {
                $user->givePermissionTo($permission);
            }
        }

        return $user;
    }

    /**
     * Get the organization from authenticated user's profile
     */
    protected function getUserOrganization(User $user): ?Organization
    {
        return $user->profile->organization;
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
     * Create an authenticated API request
     */
    protected function jsonAs(User $user, string $method, string $uri, array $data = [], array $headers = [])
    {
        $token = $user->createToken('test-token')->plainTextToken;

        return $this->json($method, $uri, $data, array_merge([
            'Authorization' => "Bearer {$token}",
            'Accept' => 'application/json',
        ], $headers));
    }
}
