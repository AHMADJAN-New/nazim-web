<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Profile;
use App\Models\SchoolBranding;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function user_can_login_with_valid_credentials()
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = User::factory()->create([
            'email' => 'test@example.com',
            'encrypted_password' => Hash::make('password123'),
        ]);

        Profile::factory()->create([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'email'],
                'profile' => ['id', 'email', 'full_name', 'role', 'organization_id'],
                'token',
            ]);

        $this->assertNotEmpty($response->json('token'));
    }

    /** @test */
    public function user_cannot_login_with_invalid_password()
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = User::factory()->create([
            'email' => 'test@example.com',
            'encrypted_password' => Hash::make('password123'),
        ]);

        Profile::factory()->create([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /** @test */
    public function user_cannot_login_with_nonexistent_email()
    {
        $response = $this->postJson('/api/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /** @test */
    public function inactive_user_cannot_login()
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = User::factory()->create([
            'email' => 'test@example.com',
            'encrypted_password' => Hash::make('password123'),
        ]);

        Profile::factory()->create([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    /** @test */
    public function login_requires_email_and_password()
    {
        $response = $this->postJson('/api/login', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);
    }

    /** @test */
    public function user_can_logout()
    {
        $user = $this->authenticate();

        $response = $this->jsonAs($user, 'POST', '/api/logout');

        $response->assertStatus(200)
            ->assertJson(['message' => 'Logged out successfully']);
    }

    /** @test */
    public function authenticated_user_can_get_profile()
    {
        $user = $this->authenticate();

        $response = $this->jsonAs($user, 'GET', '/api/profile');

        $response->assertStatus(200)
            ->assertJsonStructure(['id', 'email', 'full_name', 'role', 'organization_id']);
    }

    /** @test */
    public function unauthenticated_user_cannot_access_protected_routes()
    {
        $response = $this->getJson('/api/profile');

        $response->assertStatus(401);
    }

    /** @test */
    public function user_can_update_profile()
    {
        $user = $this->authenticate();

        $response = $this->jsonAs($user, 'PATCH', '/api/profile', [
            'full_name' => 'Updated Name',
            'phone' => '+93700123456',
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'full_name' => 'Updated Name',
                'phone' => '+93700123456',
            ]);
    }

    /** @test */
    public function user_can_change_password()
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $user = User::factory()->create([
            'encrypted_password' => Hash::make('oldpassword'),
        ]);

        Profile::factory()->create([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => $organization->id,
            'default_school_id' => $school->id,
            'is_active' => true,
        ]);

        $this->actingAsUser($user);

        $response = $this->jsonAs($user, 'POST', '/api/change-password', [
            'current_password' => 'oldpassword',
            'new_password' => 'newpassword123',
            'new_password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Password changed successfully']);

        // Verify new password works
        $loginResponse = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'newpassword123',
        ]);

        $loginResponse->assertStatus(200);
    }

    /** @test */
    public function user_cannot_change_password_with_wrong_current_password()
    {
        $user = $this->createUser([
            'encrypted_password' => Hash::make('oldpassword'),
        ]);

        $this->actingAsUser($user);

        $response = $this->jsonAs($user, 'POST', '/api/change-password', [
            'current_password' => 'wrongpassword',
            'new_password' => 'newpassword123',
            'new_password_confirmation' => 'newpassword123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);
    }

    /** @test */
    public function user_without_organization_gets_auto_assigned()
    {
        // Create default organization and school
        $defaultOrg = Organization::factory()->create([
            'name' => 'ناظم',
            'slug' => 'nazim',
        ]);
        SchoolBranding::factory()->create(['organization_id' => $defaultOrg->id]);

        $user = User::factory()->create([
            'email' => 'test@example.com',
            'encrypted_password' => Hash::make('password123'),
        ]);

        Profile::factory()->create([
            'id' => $user->id,
            'email' => $user->email,
            'organization_id' => null, // No organization
            'default_school_id' => null, // No school
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);

        $this->assertNotNull($response->json('profile.organization_id'));
    }
}
