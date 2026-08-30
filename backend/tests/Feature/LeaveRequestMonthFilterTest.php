<?php

namespace Tests\Feature;

use App\Models\LeaveRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class LeaveRequestMonthFilterTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    #[Test]
    public function leave_history_month_filter_includes_requests_overlapping_selected_month(): void
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

        $overlappingLeave = LeaveRequest::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'leave_type' => 'sick',
            'start_date' => '2026-01-20',
            'end_date' => '2026-02-10',
            'reason' => 'Medical leave spanning months',
            'status' => 'approved',
            'created_by' => $user->id,
        ]);

        LeaveRequest::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'leave_type' => 'personal',
            'start_date' => '2026-03-01',
            'end_date' => '2026-03-05',
            'reason' => 'March only leave',
            'status' => 'approved',
            'created_by' => $user->id,
        ]);

        $response = $this->jsonAs($user, 'GET', '/api/leave-requests', [
            'month' => 2,
            'year' => 2026,
            'per_page' => 25,
        ]);

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($overlappingLeave->id, $ids, 'Leave starting in January but ending in February must appear in February history');
        $this->assertCount(1, $ids, 'Only the overlapping leave should match February 2026');
    }
}
