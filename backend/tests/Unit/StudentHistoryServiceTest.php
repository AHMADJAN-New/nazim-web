<?php

namespace Tests\Unit;

use App\Models\Organization;
use App\Models\SchoolBranding;
use App\Services\StudentHistoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class StudentHistoryServiceTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    #[Test]
    public function student_status_uses_current_academic_year_admission_not_latest_by_date(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $previousYear = $this->createAcademicYearForSchool($organization, $school, [
            'name' => '2023-2024',
            'start_date' => '2023-01-01',
            'end_date' => '2023-12-31',
            'is_current' => false,
        ]);

        $currentYear = $this->createAcademicYearForSchool($organization, $school, [
            'name' => '2024-2025',
            'start_date' => '2024-01-01',
            'end_date' => '2024-12-31',
            'is_current' => true,
        ]);

        $class = $this->createClassForSchool($organization, $school);
        $previousCay = $this->createClassAcademicYearForSchool($organization, $school, $class, $previousYear);
        $currentCay = $this->createClassAcademicYearForSchool($organization, $school, $class, $currentYear, [
            'section_name' => 'B',
        ]);

        $student = $this->createStudentForSchool($organization, $school, [
            'full_name' => 'History Status Student',
            'student_status' => 'inactive',
        ]);

        // Later admission date in a past year — must not drive displayed status.
        $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $student,
            $previousYear,
            $class,
            $previousCay,
            [
                'admission_date' => '2023-11-15',
                'enrollment_status' => 'inactive',
            ]
        );

        $this->createStudentAdmissionForSchool(
            $organization,
            $school,
            $student,
            $currentYear,
            $class,
            $currentCay,
            [
                'admission_date' => '2024-03-01',
                'enrollment_status' => 'active',
            ]
        );

        $service = app(StudentHistoryService::class);
        $info = $service->getStudentBasicInfo($student->id, $organization->id);

        $this->assertNotNull($info);
        $this->assertSame('active', $info['status']);
        $this->assertSame('active', $info['currentEnrollmentStatus']);
        $this->assertSame('2024-2025', $info['currentClass']['academicYear']);
    }
}
