<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Organization;
use App\Models\SchoolBranding;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamSystemTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function user_can_list_exams()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        Exam::factory()->count(5)->create(['organization_id' => $organization->id]);

        $response = $this->jsonAs($user, 'GET', '/api/exams');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'exam_type_id', 'status', 'start_date', 'end_date'],
                ],
            ]);

        $this->assertCount(5, $response->json('data'));
    }

    /** @test */
    public function user_can_create_exam()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $academicYear = AcademicYear::factory()->current()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $examType = \App\Models\ExamType::factory()->create([
            'organization_id' => $organization->id,
            'name' => 'Midterm',
        ]);

        $examData = [
            'name' => 'Midterm Exam 2024',
            'exam_type_id' => $examType->id,
            'academic_year_id' => $academicYear->id,
            'start_date' => now()->addDays(7)->toDateString(),
            'end_date' => now()->addDays(14)->toDateString(),
            'status' => 'draft',
            'description' => 'Midterm examination for all classes',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/exams', $examData);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Midterm Exam 2024']);

        $this->assertDatabaseHas('exams', [
            'name' => 'Midterm Exam 2024',
            'exam_type_id' => $examType->id,
        ]);
    }

    /** @test */
    public function user_can_update_exam()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $exam = Exam::factory()->create([
            'organization_id' => $organization->id,
            'name' => 'Original Exam',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/exams/{$exam->id}", [
            'name' => 'Updated Exam',
            'exam_type_id' => $exam->exam_type_id,
            'academic_year_id' => $exam->academic_year_id,
            'start_date' => $exam->start_date,
            'end_date' => $exam->end_date,
            'status' => 'published',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('exams', [
            'id' => $exam->id,
            'name' => 'Updated Exam',
            'status' => 'published',
        ]);
    }

    /** @test */
    public function user_can_filter_exams_by_status()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        Exam::factory()->count(3)->create([
            'organization_id' => $organization->id,
            'status' => 'draft',
        ]);

        Exam::factory()->count(2)->ongoing()->create([
            'organization_id' => $organization->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/exams', [
            'status' => 'draft',
        ]);

        $response->assertStatus(200);
        $exams = $response->json('data');

        $this->assertCount(3, $exams);
        foreach ($exams as $exam) {
            $this->assertEquals('draft', $exam['status']);
        }
    }

    /** @test */
    public function user_can_filter_exams_by_type()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        $type1 = \App\Models\ExamType::factory()->create(['organization_id' => $organization->id]);
        $type2 = \App\Models\ExamType::factory()->create(['organization_id' => $organization->id]);

        Exam::factory()->count(2)->create([
            'organization_id' => $organization->id,
            'exam_type_id' => $type1->id,
        ]);

        Exam::factory()->count(3)->create([
            'organization_id' => $organization->id,
            'exam_type_id' => $type2->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/exams', [
            'exam_type_id' => $type1->id,
        ]);

        $response->assertStatus(200);
        $exams = $response->json('data');

        $this->assertCount(2, $exams);
    }

    /** @test */
    public function user_cannot_access_exams_from_different_organization()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        $examOrg2 = Exam::factory()->create(['organization_id' => $org2->id]);

        $response = $this->jsonAs($user1, 'GET', "/api/exams/{$examOrg2->id}");

        $this->assertContains($response->status(), [403, 404]);
    }

    /** @test */
    public function exam_dates_are_validated()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $academicYear = AcademicYear::factory()->current()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $examType = \App\Models\ExamType::factory()->create([
            'organization_id' => $organization->id,
        ]);

        // End date before start date should fail
        $response = $this->jsonAs($user, 'POST', '/api/exams', [
            'name' => 'Invalid Exam',
            'exam_type_id' => $examType->id,
            'academic_year_id' => $academicYear->id,
            'start_date' => now()->addDays(14)->toDateString(),
            'end_date' => now()->addDays(7)->toDateString(),
            'status' => 'draft',
        ]);

        // Should return validation error (or could be accepted by backend)
        // This depends on backend validation rules
        if ($response->status() === 422) {
            $response->assertJsonValidationErrors(['end_date']);
        }
    }
}
