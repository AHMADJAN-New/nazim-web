<?php

namespace Tests\Feature;

use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\LeaveRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class AttendanceSessionLeaveSyncTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    #[Test]
    public function open_session_show_syncs_approved_leave_into_attendance_records(): void
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $student = $this->createStudentForSchool($organization, $school);

        $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $student,
            $academicYear,
            $class,
            $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear)
        );

        $sessionDate = '2026-02-15';

        $session = AttendanceSession::factory()->create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'created_by' => $user->id,
            'session_date' => $sessionDate,
            'status' => 'open',
            'method' => 'manual',
        ]);

        LeaveRequest::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'leave_type' => 'personal',
            'start_date' => '2026-02-10',
            'end_date' => '2026-02-20',
            'reason' => 'Family event',
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
            'created_by' => $user->id,
        ]);

        $this->assertDatabaseMissing('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
        ]);

        $response = $this->jsonAs($user, 'GET', "/api/attendance-sessions/{$session->id}");
        $response->assertStatus(200);

        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => 'leave',
            'organization_id' => $organization->id,
            'school_id' => $school->id,
        ]);

        $record = AttendanceRecord::where('attendance_session_id', $session->id)
            ->where('student_id', $student->id)
            ->first();

        $this->assertNotNull($record);
        $this->assertSame('Family event', $record->note);
    }
}
