<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use App\Models\User;
use App\Models\Profile;
use App\Models\Organization;
use App\Models\SchoolBranding;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();
    }

    protected function authenticate(array $attributes = [], array $profileAttributes = [], $organization = null, $school = null)
    {
        $user = User::factory()->create($attributes);
        
        if (!$organization) {
            $organization = Organization::factory()->create();
        }

        if (!$school && !isset($profileAttributes['default_school_id'])) {
             // Create a school for the organization if not provided
            $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        }

        Profile::factory()->create(array_merge([
            'id' => $user->id,
            'organization_id' => $organization->id,
            'default_school_id' => $school?->id ?? ($profileAttributes['default_school_id'] ?? null),
        ], $profileAttributes));

        Sanctum::actingAs($user);

        return $user;
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
}
