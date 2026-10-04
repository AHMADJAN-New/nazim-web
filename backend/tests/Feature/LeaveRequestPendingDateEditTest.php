<?php

namespace Tests\Feature;

use App\Models\LeaveRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class LeaveRequestPendingDateEditTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    #[Test]
    public function pending_leave_dates_can_be_updated(): void
    {
        [$user, $leave] = $this->createLeave('pending');

        $response = $this->jsonAs($user, 'PUT', "/api/leave-requests/{$leave->id}", [
            'start_date' => '2026-10-06',
            'end_date' => '2026-10-08',
        ]);

        $response->assertOk()
            ->assertJsonPath('start_date', '2026-10-06T00:00:00.000000Z')
            ->assertJsonPath('end_date', '2026-10-08T00:00:00.000000Z');
    }

    #[Test]
    public function approved_leave_dates_cannot_be_updated(): void
    {
        [$user, $leave] = $this->createLeave('approved');

        $response = $this->jsonAs($user, 'PUT', "/api/leave-requests/{$leave->id}", [
            'start_date' => '2026-10-06',
            'end_date' => '2026-10-08',
        ]);

        $response->assertStatus(409);
        $this->assertDatabaseHas('leave_requests', [
            'id' => $leave->id,
            'start_date' => '2026-10-04',
            'end_date' => '2026-10-05',
        ]);
    }

    /**
     * @return array{0: \App\Models\User, 1: LeaveRequest}
     */
    private function createLeave(string $status): array
    {
        $user = $this->authenticate();
        $organization = $this->getUserOrganization($user);
        $school = $this->getUserSchool($user);
        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $student = $this->createStudentForSchool($organization, $school);

        $leave = LeaveRequest::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $academicYear->id,
            'leave_type' => 'full_day',
            'start_date' => '2026-10-04',
            'end_date' => '2026-10-05',
            'reason' => 'Family travel',
            'status' => $status,
            'approved_by' => $status === 'approved' ? $user->id : null,
            'approved_at' => $status === 'approved' ? now() : null,
            'created_by' => $user->id,
        ]);

        return [$user, $leave];
    }
}
