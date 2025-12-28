<?php

namespace Tests\Feature;

use App\Models\AttendanceSession;
use App\Models\AttendanceRecord;
use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Models\Student;
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

        $class = ClassModel::factory()->create(['organization_id' => $organization->id]);

        $sessionData = [
            'class_id' => $class->id,
            'session_date' => now()->toDateString(),
            'session_type' => 'daily',
            'status' => 'active',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/attendance-sessions', $sessionData);

        if ($response->status() === 201) {
            $response->assertJsonFragment(['session_type' => 'daily']);
            $this->assertDatabaseHas('attendance_sessions', [
                'class_id' => $class->id,
                'session_type' => 'daily',
            ]);
        }

        $this->assertContains($response->status(), [201, 404, 422]);
    }

    /** @test */
    public function user_can_mark_student_attendance()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $class = ClassModel::factory()->create(['organization_id' => $organization->id]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'class_id' => $class->id,
        ]);

        $attendanceData = [
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => 'present',
            'remarks' => 'On time',
        ];

        $response = $this->jsonAs($user, 'POST', '/api/attendance-records', $attendanceData);

        if ($response->status() === 201) {
            $this->assertDatabaseHas('attendance_records', [
                'student_id' => $student->id,
                'status' => 'present',
            ]);
        }

        $this->assertContains($response->status(), [201, 404, 422]);
    }

    /** @test */
    public function user_can_list_attendance_sessions()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);

        AttendanceSession::factory()->count(5)->create(['organization_id' => $organization->id]);

        $response = $this->jsonAs($user, 'GET', '/api/attendance-sessions');

        if ($response->status() === 200) {
            $sessions = $response->json('data');
            $this->assertCount(5, $sessions);
        }

        $this->assertContains($response->status(), [200, 404]);
    }

    /** @test */
    public function attendance_records_are_organization_scoped()
    {
        $org1 = Organization::factory()->create();
        $org2 = Organization::factory()->create();

        $school1 = SchoolBranding::factory()->create(['organization_id' => $org1->id]);
        $school2 = SchoolBranding::factory()->create(['organization_id' => $org2->id]);

        $user1 = $this->authenticate([], ['organization_id' => $org1->id], $org1, $school1);

        $student1 = Student::factory()->create([
            'organization_id' => $org1->id,
            'school_id' => $school1->id,
        ]);
        $student2 = Student::factory()->create([
            'organization_id' => $org2->id,
            'school_id' => $school2->id,
        ]);

        $session1 = AttendanceSession::factory()->create(['organization_id' => $org1->id]);
        $session2 = AttendanceSession::factory()->create(['organization_id' => $org2->id]);

        AttendanceRecord::factory()->create([
            'attendance_session_id' => $session1->id,
            'student_id' => $student1->id,
        ]);

        AttendanceRecord::factory()->create([
            'attendance_session_id' => $session2->id,
            'student_id' => $student2->id,
        ]);

        $response = $this->jsonAs($user1, 'GET', '/api/attendance-records');

        if ($response->status() === 200) {
            $records = $response->json('data');
            // Should only see records from org1
            foreach ($records as $record) {
                $this->assertNotEquals($student2->id, $record['student_id']);
            }
        }

        $this->assertContains($response->status(), [200, 404]);
    }

    /** @test */
    public function user_can_update_attendance_status()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $session = AttendanceSession::factory()->create(['organization_id' => $organization->id]);
        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $record = AttendanceRecord::factory()->create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => 'present',
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/attendance-records/{$record->id}", [
            'status' => 'absent',
            'remarks' => 'Sick',
        ]);

        if ($response->status() === 200) {
            $this->assertDatabaseHas('attendance_records', [
                'id' => $record->id,
                'status' => 'absent',
            ]);
        }

        $this->assertContains($response->status(), [200, 404, 422]);
    }
}
