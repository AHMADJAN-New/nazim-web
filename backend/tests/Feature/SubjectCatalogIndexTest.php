<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\SchoolBranding;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SubjectCatalogIndexTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function all_flag_returns_every_subject_for_the_school_and_ignores_pagination(): void
    {
        [$user, $organization, $school] = $this->makeReader();

        for ($i = 1; $i <= 30; $i++) {
            Subject::create([
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'name' => sprintf('Subject %02d', $i),
                'code' => sprintf('SUB-%02d', $i),
                'description' => $i === 7 ? 'UniqueAlpha marker' : null,
                'is_active' => true,
            ]);
        }

        $otherSchool = SchoolBranding::factory()->create([
            'organization_id' => $organization->id,
        ]);
        Subject::create([
            'organization_id' => $organization->id,
            'school_id' => $otherSchool->id,
            'name' => 'Other School Subject',
            'code' => 'OTHER-1',
            'is_active' => true,
        ]);

        $otherOrganization = Organization::factory()->create();
        $otherOrgSchool = SchoolBranding::factory()->create([
            'organization_id' => $otherOrganization->id,
        ]);
        Subject::create([
            'organization_id' => $otherOrganization->id,
            'school_id' => $otherOrgSchool->id,
            'name' => 'Other Org Subject',
            'code' => 'ORG-1',
            'is_active' => true,
        ]);

        $page = $this->actingAsUser($user)->getJson('/api/subjects?page=1&per_page=10');
        $page->assertOk();
        $page->assertJsonPath('total', 30);
        $page->assertJsonPath('per_page', 10);
        $page->assertJsonCount(10, 'data');

        $all = $this->actingAsUser($user)->getJson('/api/subjects?all=1&page=1&per_page=10');
        $all->assertOk();
        $all->assertJsonCount(30);
        $this->assertArrayNotHasKey('current_page', $all->json());

        $codes = collect($all->json())->pluck('code');
        $this->assertFalse($codes->contains('OTHER-1'));
        $this->assertFalse($codes->contains('ORG-1'));

        $search = $this->actingAsUser($user)->getJson('/api/subjects?all=1&search=UniqueAlpha');
        $search->assertOk();
        $search->assertJsonCount(1);
        $search->assertJsonPath('0.code', 'SUB-07');
    }

    /**
     * @return array{0: \App\Models\User, 1: Organization, 2: SchoolBranding}
     */
    private function makeReader(): array
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create([
            'organization_id' => $organization->id,
        ]);
        $user = $this->createUser(
            [],
            [
                'organization_id' => $organization->id,
                'default_school_id' => $school->id,
            ],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        DB::table('organization_feature_addons')->updateOrInsert(
            ['organization_id' => $organization->id, 'feature_key' => 'subjects'],
            [
                'is_enabled' => true,
                'started_at' => now(),
                'expires_at' => null,
                'price_paid' => 0,
                'currency' => 'AFN',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $permission = Permission::firstOrCreate([
            'name' => 'subjects.read',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ], [
            'resource' => 'subjects',
            'action' => 'read',
            'description' => 'View subjects',
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return [$user, $organization, $school];
    }
}
