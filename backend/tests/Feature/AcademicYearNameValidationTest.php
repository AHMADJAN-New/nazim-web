<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class AcademicYearNameValidationTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    #[Test]
    public function academic_year_name_cannot_exceed_twenty_characters_on_create(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $response = $this->jsonAs($user, 'POST', '/api/academic-years', [
            'name' => str_repeat('A', 21),
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'is_current' => false,
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('error', 'Validation failed')
            ->assertJsonStructure(['details' => ['name']]);
    }

    #[Test]
    public function academic_year_name_accepts_up_to_twenty_characters_on_create(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $name = str_repeat('Y', 20);

        $response = $this->jsonAs($user, 'POST', '/api/academic-years', [
            'name' => $name,
            'start_date' => '2026-01-01',
            'end_date' => '2026-12-31',
            'is_current' => false,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('name', $name);

        $this->assertDatabaseHas('academic_years', [
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => $name,
        ]);
    }

    #[Test]
    public function academic_year_name_cannot_exceed_twenty_characters_on_update(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $academicYear = $this->createAcademicYearForSchool($organization, $school, [
            'name' => '2025-2026',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/academic-years/{$academicYear->id}", [
            'name' => str_repeat('B', 21),
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('error', 'Validation failed')
            ->assertJsonStructure(['details' => ['name']]);
    }
}
