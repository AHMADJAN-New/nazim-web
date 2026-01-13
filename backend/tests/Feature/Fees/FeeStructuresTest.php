<?php

namespace Tests\Feature\Fees;

use App\Models\FeeStructure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class FeeStructuresTest extends TestCase
{
    use RefreshDatabase;
    use CreatesSchoolData;

    /** @test */
    public function user_can_create_fee_structure(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);
        $academicYear = $this->createAcademicYearForSchool($organization, $school);

        $response = $this->jsonAs($user, 'POST', '/api/fees/structures', [
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'name' => 'Registration Fee',
            'fee_type' => 'one_time',
            'amount' => 250,
        ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Registration Fee']);

        $this->assertDatabaseHas('fee_structures', [
            'organization_id' => $organization->id,
            'name' => 'Registration Fee',
        ]);
    }

    /** @test */
    public function fee_structure_requires_amount(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);
        $academicYear = $this->createAcademicYearForSchool($organization, $school);

        $response = $this->jsonAs($user, 'POST', '/api/fees/structures', [
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'name' => 'Registration Fee',
            'fee_type' => 'one_time',
        ]);

        $response->assertStatus(422);
        $this->assertArrayHasKey('amount', $response->json('errors'));
    }

    /** @test */
    public function user_can_update_fee_structure(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);
        $academicYear = $this->createAcademicYearForSchool($organization, $school);

        $structure = FeeStructure::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'name' => 'Original Fee',
            'fee_type' => 'one_time',
            'amount' => 100,
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/fees/structures/{$structure->id}", [
            'name' => 'Updated Fee',
            'amount' => 150,
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('fee_structures', [
            'id' => $structure->id,
            'name' => 'Updated Fee',
            'amount' => 150,
        ]);
    }

    /** @test */
    public function user_can_delete_fee_structure(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);
        $academicYear = $this->createAcademicYearForSchool($organization, $school);

        $structure = FeeStructure::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'academic_year_id' => $academicYear->id,
            'name' => 'Disposable Fee',
            'fee_type' => 'one_time',
            'amount' => 50,
        ]);

        $response = $this->jsonAs($user, 'DELETE', "/api/fees/structures/{$structure->id}");

        $response->assertStatus(204);
        $this->assertSoftDeleted('fee_structures', ['id' => $structure->id]);
    }
}
