<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\AcademicYear;
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
            'round_number' => 1,
        ]);
    }

    /** @test */
    public function attendance_sessions_get_incrementing_round_numbers_per_school_and_date()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $payload = [
            'class_id' => $class->id,
            'session_date' => '2026-04-24',
            'method' => 'manual',
        ];

        $this->jsonAs($user, 'POST', '/api/attendance-sessions', $payload)->assertStatus(201);
        $this->jsonAs($user, 'POST', '/api/attendance-sessions', $payload)->assertStatus(201);
        $this->jsonAs($user, 'POST', '/api/attendance-sessions', array_merge($payload, [
            'session_label' => 'After lunch',
        ]))->assertStatus(201);

        $this->assertDatabaseHas('attendance_sessions', [
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'session_date' => '2026-04-24',
            'round_number' => 1,
        ]);
        $this->assertDatabaseHas('attendance_sessions', [
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'session_date' => '2026-04-24',
            'round_number' => 2,
        ]);
        $this->assertDatabaseHas('attendance_sessions', [
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'session_date' => '2026-04-24',
            'round_number' => 3,
            'session_label' => 'After lunch',
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
            'entry_method' => 'manual',
        ]);
    }

    /** @test */
    public function manual_records_in_barcode_session_keep_manual_entry_method()
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
            'method' => 'barcode',
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
                    'entry_method' => 'manual',
                ],
            ],
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'entry_method' => 'manual',
        ]);
    }

    /** @test */
    public function closed_sessions_reject_session_and_record_edits()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'status' => 'closed',
            'closed_at' => now(),
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $this->jsonAs($user, 'PUT', "/api/attendance-sessions/{$session->id}", [
            'remarks' => 'Should not change',
        ])->assertStatus(422);

        $this->jsonAs($user, 'POST', "/api/attendance-sessions/{$session->id}/records", [
            'records' => [
                [
                    'student_id' => $student->id,
                    'status' => 'present',
                ],
            ],
        ])->assertStatus(422);
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

    /** @test */
    public function closing_a_session_marks_unmarked_students_absent()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'method' => 'barcode',
            'status' => 'open',
        ]);

        $presentStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $absentStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        foreach ([$presentStudent, $absentStudent] as $student) {
            StudentAdmission::create([
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'student_id' => $student->id,
                'class_id' => $class->id,
                'academic_year_id' => $academicYear->id,
            ]);
        }

        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $presentStudent->id,
            'status' => 'present',
            'entry_method' => 'barcode',
            'marked_at' => now(),
            'marked_by' => $user->id,
        ]);

        $response = $this->jsonAs($user, 'POST', "/api/attendance-sessions/{$session->id}/close");

        $response->assertStatus(200);

        $this->assertDatabaseHas('attendance_sessions', [
            'id' => $session->id,
            'status' => 'closed',
        ]);

        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $presentStudent->id,
            'status' => 'present',
        ]);

        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $absentStudent->id,
            'status' => 'absent',
        ]);
    }

    /** @test */
    public function closing_a_session_preserves_explicit_statuses_before_marking_remaining_students_absent()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'method' => 'manual',
            'status' => 'open',
        ]);

        $sickStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $leaveStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);
        $unmarkedStudent = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        foreach ([$sickStudent, $leaveStudent, $unmarkedStudent] as $student) {
            StudentAdmission::create([
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'student_id' => $student->id,
                'class_id' => $class->id,
                'academic_year_id' => $academicYear->id,
            ]);
        }

        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $sickStudent->id,
            'status' => 'sick',
            'entry_method' => 'manual',
            'marked_at' => now(),
            'marked_by' => $user->id,
        ]);

        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $leaveStudent->id,
            'status' => 'leave',
            'entry_method' => 'manual',
            'marked_at' => now(),
            'marked_by' => $user->id,
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/attendance-sessions/{$session->id}", [
            'status' => 'closed',
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $sickStudent->id,
            'status' => 'sick',
        ]);

        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $leaveStudent->id,
            'status' => 'leave',
        ]);

        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $unmarkedStudent->id,
            'status' => 'absent',
        ]);
    }

    /** @test */
    public function attendance_report_class_filter_includes_sessions_attached_through_pivot_classes()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $primaryClass = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $attachedClass = ClassModel::factory()->create([
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
            'class_id' => $primaryClass->id,
            'round_number' => 2,
            'session_label' => 'After lunch',
        ]);

        $session->classes()->attach($attachedClass->id, [
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $record = AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'status' => 'present',
            'entry_method' => 'manual',
            'marked_at' => now(),
            'marked_by' => $user->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/attendance-sessions/report', [
            'class_id' => $attachedClass->id,
            'per_page' => 25,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $record->id,
                'student_id' => $student->id,
            ])
            ->assertJsonFragment([
                'round_number' => 2,
                'session_label' => 'After lunch',
            ]);
    }
}
