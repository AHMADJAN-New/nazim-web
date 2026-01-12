<?php

namespace Tests\Feature;

use App\Models\AttendanceSession;
use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use App\Models\ClassModel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceSystemTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function user_can_create_attendance_session()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $sessionData = [
            'class_id' => $class->id,
            'session_date' => now()->toDateString(),
            'method' => 'manual',
            'status' => 'open',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/attendance-sessions', $sessionData);

        $response->assertStatus(201)
            ->assertJsonFragment(['method' => 'manual']);

        $this->assertDatabaseHas('attendance_sessions', [
            'class_id' => $class->id,
            'method' => 'manual',
        ]);
    }

    /** @test */
    public function user_can_mark_student_attendance()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'method' => 'manual',
            'status' => 'open',
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
        ]);

        $response = $this->jsonAs($user, 'POST', "/api/attendance-sessions/{$session->id}/records", [
            'records' => [
                [
                    'student_id' => $student->id,
                    'status' => 'present',
                    'note' => 'On time',
                ],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('attendance_records', [
            'student_id' => $student->id,
            'status' => 'present',
        ]);
    }

    /** @test */
    public function user_can_list_attendance_sessions()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        AttendanceSession::factory()->count(5)->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/attendance-sessions', [
            'per_page' => 25,
        ]);

        $response->assertStatus(200);
        $sessions = $response->json('data');
        $this->assertCount(5, $sessions);
    }

    /** @test */
    public function attendance_records_are_organization_scoped()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);
        $school2 = SchoolBranding::factory()->create(['organization_id' => $org2->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        $session1 = AttendanceSession::factory()->create([
            'organization_id' => $org1->id,
            'school_id' => $school1->id,
        ]);
        $session2 = AttendanceSession::factory()->create([
            'organization_id' => $org2->id,
            'school_id' => $school2->id,
        ]);

        $response = $this->jsonAs($user1, 'GET', '/api/attendance-sessions', [
            'per_page' => 25,
        ]);

        $response->assertStatus(200);
        $sessions = $response->json('data');

        foreach ($sessions as $session) {
            $this->assertNotEquals($session2->id, $session['id']);
        }
    }

    /** @test */
    public function user_can_update_attendance_status()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'status' => 'open',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/attendance-sessions/{$session->id}", [
            'status' => 'closed',
            'remarks' => 'Session closed',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('attendance_sessions', [
            'id' => $session->id,
            'status' => 'closed',
        ]);
    }
}
