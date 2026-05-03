<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\AttendanceRecord;
use App\Models\AttendanceRoundName;
use App\Models\AttendanceSession;
use App\Models\Building;
use App\Models\ClassAcademicYear;
use App\Models\ClassModel;
use App\Models\Organization;
use App\Models\Room;
use App\Models\SchoolBranding;
use App\Models\Student;
use App\Models\StudentAdmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
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
        $round = $this->createAttendanceRoundName($organization->id, $school->id, [
            'name' => 'Morning',
            'order_index' => 1,
        ]);

        $sessionData = [
            'class_id' => $class->id,
            'session_date' => now()->toDateString(),
            'attendance_round_name_id' => $round->id,
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
            'attendance_round_name_id' => $this->createAttendanceRoundName($organization->id, $school->id, [
                'name' => 'Morning',
                'order_index' => 1,
            ])->id,
            'method' => 'manual',
        ];

        $this->jsonAs($user, 'POST', '/api/attendance-sessions', $payload)->assertStatus(201);
        $this->jsonAs($user, 'POST', '/api/attendance-sessions', $payload)->assertStatus(201);
        $this->jsonAs($user, 'POST', '/api/attendance-sessions', array_merge($payload, [
            'attendance_round_name_id' => $this->createAttendanceRoundName($organization->id, $school->id, [
                'name' => 'After lunch',
                'order_index' => 2,
            ])->id,
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
            'attendance_round_name_id' => $this->createAttendanceRoundName($organization->id, $school->id)->id,
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
            'attendance_round_name_id' => $this->createAttendanceRoundName($organization->id, $school->id)->id,
        ]);
        $newRound = $this->createAttendanceRoundName($organization->id, $school->id, [
            'name' => 'Noon',
            'order_index' => 3,
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/attendance-sessions/{$session->id}", [
            'status' => 'closed',
            'remarks' => 'Session closed',
            'attendance_round_name_id' => $newRound->id,
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
            'attendance_round_name_id' => $this->createAttendanceRoundName($organization->id, $school->id)->id,
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
            'attendance_round_name_id' => $session->attendance_round_name_id,
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

    /** @test */
    public function attendance_report_uses_student_admission_class_when_session_primary_differs(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $primaryClass = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Primary Session Class',
        ]);

        $attachedClass = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Student Actual Class',
        ]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'class_id' => $attachedClass->id,
            'academic_year_id' => $academicYear->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $primaryClass->id,
            'academic_year_id' => $academicYear->id,
            'round_number' => 1,
            'session_label' => 'Combined',
        ]);

        $pivotPayload = [
            'organization_id' => $organization->id,
        ];
        if (Schema::hasColumn('attendance_session_classes', 'school_id')) {
            $pivotPayload['school_id'] = $school->id;
        }
        $session->classes()->attach($attachedClass->id, $pivotPayload);

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

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/report', [
            'student_id' => $student->id,
            'per_page' => 25,
        ])->assertStatus(200)
            ->assertJsonFragment([
                'id' => $record->id,
                'student_class_name' => 'Student Actual Class',
                'report_student_class_id' => $attachedClass->id,
            ]);
    }

    /** @test */
    public function attendance_report_includes_active_student_room_name()
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $building = Building::create([
            'building_name' => 'Hostel Block A',
            'school_id' => $school->id,
        ]);

        $room = Room::create([
            'room_number' => 'A-12',
            'building_id' => $building->id,
            'school_id' => $school->id,
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'room_id' => $room->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => true,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
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
            'student_id' => $student->id,
            'per_page' => 25,
        ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $record->id,
                'student_room_name' => 'Hostel Block A - A-12',
            ]);
    }

    /** @test */
    public function attendance_totals_report_filters_by_student_id_and_student_type()
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

        $boarder = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $dayScholar = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $boarder->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => true,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $dayScholar->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
        ]);

        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $boarder->id,
            'status' => 'present',
            'entry_method' => 'manual',
            'marked_at' => now(),
            'marked_by' => $user->id,
        ]);

        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $dayScholar->id,
            'status' => 'present',
            'entry_method' => 'manual',
            'marked_at' => now(),
            'marked_by' => $user->id,
        ]);

        $dateFrom = $session->session_date->toDateString();
        $dateTo = $dateFrom;

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/totals-report', [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ])
            ->assertStatus(200)
            ->assertJsonPath('totals.present', 2);

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/totals-report', [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'academic_year_id' => $academicYear->id,
        ])
            ->assertStatus(200)
            ->assertJsonCount(2, 'student_breakdown')
            ->assertJsonPath('student_breakdown_meta.total', 2)
            ->assertJsonPath('student_breakdown_meta.current_page', 1)
            ->assertJsonPath('student_breakdown_meta.per_page', 25)
            ->assertJsonPath('student_breakdown_meta.last_page', 1);

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/totals-report', [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'student_id' => $boarder->id,
            'academic_year_id' => $academicYear->id,
        ])
            ->assertStatus(200)
            ->assertJsonPath('totals.present', 1)
            ->assertJsonCount(0, 'student_breakdown');

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/totals-report', [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'student_type' => 'boarders',
        ])
            ->assertStatus(200)
            ->assertJsonPath('totals.present', 1);

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/totals-report', [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'student_type' => 'day_scholars',
        ])
            ->assertStatus(200)
            ->assertJsonPath('totals.present', 1);
    }

    /** @test */
    public function attendance_report_matches_academic_year_via_class_academic_year_when_session_academic_year_is_null(): void
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

        ClassAcademicYear::create([
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'section_name' => 'A',
            'is_active' => true,
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'academic_year_id' => null,
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

        $day = $session->session_date->toDateString();

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/report', [
            'academic_year_id' => $academicYear->id,
            'date_from' => $day,
            'date_to' => $day,
            'per_page' => 25,
        ])
            ->assertStatus(200)
            ->assertJsonFragment([
                'id' => $record->id,
                'student_id' => $student->id,
            ]);

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/totals-report', [
            'academic_year_id' => $academicYear->id,
            'date_from' => $day,
            'date_to' => $day,
        ])
            ->assertStatus(200)
            ->assertJsonPath('totals.present', 1)
            ->assertJsonCount(1, 'student_breakdown')
            ->assertJsonPath('student_breakdown.0.student_id', $student->id);
    }

    /** @test */
    public function attendance_totals_report_student_breakdown_pagination_and_enriched_fields(): void
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

        $studentA = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'father_name' => 'Father A',
        ]);

        $studentB = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'father_name' => 'Father B',
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $studentA->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => true,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $studentB->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
        ]);

        foreach ([$studentA, $studentB] as $stu) {
            AttendanceRecord::create([
                'attendance_session_id' => $session->id,
                'organization_id' => $organization->id,
                'school_id' => $school->id,
                'student_id' => $stu->id,
                'status' => 'present',
                'entry_method' => 'manual',
                'marked_at' => now(),
                'marked_by' => $user->id,
            ]);
        }

        $day = $session->session_date->toDateString();

        $page1 = $this->jsonAs($user, 'GET', '/api/attendance-sessions/totals-report', [
            'date_from' => $day,
            'date_to' => $day,
            'academic_year_id' => $academicYear->id,
            'student_breakdown_per_page' => 10,
            'student_breakdown_page' => 1,
        ]);

        $page1->assertStatus(200)
            ->assertJsonPath('student_breakdown_meta.total', 2)
            ->assertJsonPath('student_breakdown_meta.per_page', 10)
            ->assertJsonPath('student_breakdown_meta.last_page', 1)
            ->assertJsonPath('student_breakdown_meta.current_page', 1)
            ->assertJsonCount(2, 'student_breakdown');

        $first = $page1->json('student_breakdown.0');
        $this->assertArrayHasKey('father_name', $first);
        $this->assertArrayHasKey('card_number', $first);
        $this->assertArrayHasKey('building_room', $first);
        $this->assertArrayHasKey('residency', $first);

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/totals-report', [
            'date_from' => $day,
            'date_to' => $day,
            'academic_year_id' => $academicYear->id,
            'student_breakdown_per_page' => 10,
            'student_breakdown_page' => 50,
        ])
            ->assertStatus(200)
            ->assertJsonPath('student_breakdown_meta.current_page', 1)
            ->assertJsonCount(2, 'student_breakdown');
    }

    /** @test */
    public function attendance_report_filters_by_attendance_session_id_and_rejects_other_school_session(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $schoolA = $this->getUserSchool($user);
        $schoolB = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolA->id,
        ]);

        $academicYear = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolA->id,
        ]);

        $academicYearB = AcademicYear::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
        ]);

        $student = Student::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolA->id,
        ]);

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $schoolA->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        $sessionOk = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolA->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
        ]);

        $sessionWrongSchool = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $schoolB->id,
            'class_id' => null,
            'academic_year_id' => $academicYearB->id,
        ]);

        $record = AttendanceRecord::create([
            'attendance_session_id' => $sessionOk->id,
            'organization_id' => $organization->id,
            'school_id' => $schoolA->id,
            'student_id' => $student->id,
            'status' => 'present',
            'entry_method' => 'manual',
            'marked_at' => now(),
            'marked_by' => $user->id,
        ]);

        $day = $sessionOk->session_date->toDateString();

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/report', [
            'attendance_session_id' => $sessionWrongSchool->id,
            'date_from' => $day,
            'date_to' => $day,
            'per_page' => 25,
        ])->assertStatus(404);

        $this->jsonAs($user, 'GET', '/api/attendance-sessions/report', [
            'attendance_session_id' => $sessionOk->id,
            'date_from' => $day,
            'date_to' => $day,
            'per_page' => 25,
        ])
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $record->id]);
    }

    /** @test */
    public function user_can_crud_attendance_round_names_with_school_isolation(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);
        $otherSchool = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $create = $this->jsonAs($user, 'POST', '/api/attendance-round-names', [
            'name' => 'Morning',
            'order_index' => 1,
            'is_active' => true,
        ]);

        $create->assertStatus(201)->assertJsonPath('name', 'Morning');
        $roundId = (string) $create->json('id');

        $this->jsonAs($user, 'GET', '/api/attendance-round-names')
            ->assertStatus(200)
            ->assertJsonFragment(['id' => $roundId, 'name' => 'Morning']);

        $this->jsonAs($user, 'PUT', "/api/attendance-round-names/{$roundId}", [
            'name' => 'After lunch',
            'order_index' => 2,
            'is_active' => true,
        ])->assertStatus(200)->assertJsonPath('name', 'After lunch');

        // Simulate another school context and ensure the round cannot be accessed there.
        DB::table('profiles')->where('id', $user->id)->update(['default_school_id' => $otherSchool->id]);
        $this->jsonAs($user, 'GET', '/api/attendance-round-names')
            ->assertStatus(200)
            ->assertJsonMissing(['id' => $roundId]);

        DB::table('profiles')->where('id', $user->id)->update(['default_school_id' => $school->id]);
        $this->jsonAs($user, 'DELETE', "/api/attendance-round-names/{$roundId}")
            ->assertStatus(204);
    }

    /** @test */
    public function attendance_session_create_rejects_inactive_round_name_and_persists_selected_round_label(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $inactiveRound = $this->createAttendanceRoundName($organization->id, $school->id, [
            'name' => 'Inactive round',
            'order_index' => 1,
            'is_active' => false,
        ]);

        $this->jsonAs($user, 'POST', '/api/attendance-sessions', [
            'class_id' => $class->id,
            'session_date' => now()->toDateString(),
            'method' => 'manual',
            'attendance_round_name_id' => $inactiveRound->id,
        ])->assertStatus(422);

        $activeRound = $this->createAttendanceRoundName($organization->id, $school->id, [
            'name' => 'Morning Shift',
            'order_index' => 2,
            'is_active' => true,
        ]);

        $response = $this->jsonAs($user, 'POST', '/api/attendance-sessions', [
            'class_id' => $class->id,
            'session_date' => now()->toDateString(),
            'method' => 'manual',
            'attendance_round_name_id' => $activeRound->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('attendance_round_name_id', $activeRound->id)
            ->assertJsonPath('session_label', 'Morning Shift');
    }

    /** @test */
    public function attendance_session_update_requires_valid_round_name_selection(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $class = ClassModel::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $roundA = $this->createAttendanceRoundName($organization->id, $school->id, [
            'name' => 'Morning',
            'order_index' => 1,
            'is_active' => true,
        ]);
        $roundB = $this->createAttendanceRoundName($organization->id, $school->id, [
            'name' => 'Evening',
            'order_index' => 2,
            'is_active' => true,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'attendance_round_name_id' => $roundA->id,
            'session_label' => 'Morning',
            'status' => 'open',
        ]);

        $this->jsonAs($user, 'PUT', "/api/attendance-sessions/{$session->id}", [
            'attendance_round_name_id' => '00000000-0000-0000-0000-000000000000',
        ])->assertStatus(422);

        $this->jsonAs($user, 'PUT', "/api/attendance-sessions/{$session->id}", [
            'attendance_round_name_id' => $roundB->id,
            'remarks' => 'Updated',
        ])
            ->assertStatus(200)
            ->assertJsonPath('attendance_round_name_id', $roundB->id)
            ->assertJsonPath('session_label', 'Evening');
    }

    /** @test */
    public function deleting_session_soft_deletes_related_rows_and_excludes_them_from_attendance_pages(): void
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

        StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'active',
            'is_boarder' => false,
        ]);

        $round = $this->createAttendanceRoundName($organization->id, $school->id, [
            'name' => 'Delete Flow Round',
            'order_index' => 1,
        ]);

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'session_date' => now()->toDateString(),
            'attendance_round_name_id' => $round->id,
            'session_label' => $round->name,
            'status' => 'open',
        ]);

        $pivotPayload = [
            'organization_id' => $organization->id,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        if (Schema::hasColumn('attendance_session_classes', 'school_id')) {
            $pivotPayload['school_id'] = $school->id;
        }
        $session->classes()->attach($class->id, $pivotPayload);

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

        $this->jsonAs($user, 'DELETE', "/api/attendance-sessions/{$session->id}")
            ->assertStatus(204);

        $this->assertSoftDeleted('attendance_sessions', ['id' => $session->id]);
        $this->assertSoftDeleted('attendance_records', ['id' => $record->id]);
        $this->assertDatabaseMissing('attendance_session_classes', [
            'attendance_session_id' => $session->id,
            'class_id' => $class->id,
            'deleted_at' => null,
        ]);

        $this->jsonAs($user, 'GET', '/api/attendance-sessions')
            ->assertStatus(200)
            ->assertJsonMissing(['id' => $session->id]);

        $report = $this->jsonAs($user, 'GET', '/api/attendance-sessions/report', [
            'date_from' => $session->session_date->toDateString(),
            'date_to' => $session->session_date->toDateString(),
        ])->assertStatus(200);

        $this->assertSame(0, (int) $report->json('total'));

        $totals = $this->jsonAs($user, 'GET', '/api/attendance-sessions/totals-report', [
            'date_from' => $session->session_date->toDateString(),
            'date_to' => $session->session_date->toDateString(),
        ])->assertStatus(200);

        $this->assertSame(0, (int) $totals->json('totals.total_records'));
        $recentSessions = $totals->json('recent_sessions') ?? [];
        $recentIds = array_map(static fn ($row) => (string) ($row['id'] ?? ''), $recentSessions);
        $this->assertNotContains($session->id, $recentIds);
    }

    /** @test */
    public function attendance_generate_report_validates_student_type(): void
    {
        $user = $this->authenticate();

        $this->jsonAs($user, 'POST', '/api/attendance-sessions/generate-report', [
            'report_type' => 'pdf',
            'report_variant' => 'totals',
            'student_type' => 'not-a-valid-type',
        ])->assertStatus(422);
    }

    private function createAttendanceRoundName(string $organizationId, string $schoolId, array $overrides = []): AttendanceRoundName
    {
        return AttendanceRoundName::create(array_merge([
            'organization_id' => $organizationId,
            'school_id' => $schoolId,
            'name' => 'Round '.substr((string) now()->timestamp, -3),
            'order_index' => 1,
            'is_active' => true,
        ], $overrides));
    }
}
