<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SubscriptionFeaturesAccessTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function organization_users_can_load_feature_status_without_subscription_read_permission(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        $this->actingAsUser($user)
            ->getJson('/api/subscription/features')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }
}
