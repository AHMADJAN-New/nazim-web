<?php

namespace Tests\Feature;

use App\Models\Building;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\ResidencyType;
use App\Models\Room;
use App\Models\SchoolBranding;
use App\Models\StudentAdmission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\PermissionRegistrar;
use Tests\Feature\Concerns\CreatesSchoolData;
use Tests\TestCase;

class StudentAdmissionBoardingRoomTest extends TestCase
{
    use CreatesSchoolData;
    use RefreshDatabase;

    private function createUserWithAdmissionUpdatePermission(Organization $organization, SchoolBranding $school)
    {
        $user = $this->createUser(
            [],
            ['organization_id' => $organization->id, 'default_school_id' => $school->id],
            $organization,
            $school,
            null,
            ['withRole' => false]
        );

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $permission = Permission::firstOrCreate([
            'name' => 'student_admissions.read',
            'guard_name' => 'web',
            'organization_id' => $organization->id,
        ]);

        setPermissionsTeamId($organization->id);
        $user->givePermissionTo($permission);
        setPermissionsTeamId(null);

        return $user;
    }

    #[Test]
    public function saving_clears_room_id_when_not_boarder(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);

        $building = Building::create([
            'building_name' => 'Hostel',
            'school_id' => $school->id,
        ]);

        $room = Room::create([
            'room_number' => '201',
            'building_id' => $building->id,
            'school_id' => $school->id,
        ]);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $cay = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear);
        $student = $this->createStudentForSchool($organization, $school);

        $admission = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $cay->id,
            'admission_year' => (string) now()->year,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'admitted',
            'is_boarder' => true,
            'room_id' => $room->id,
        ]);

        $this->assertSame($room->id, $admission->fresh()->room_id);

        $admission->is_boarder = false;
        $admission->save();

        $this->assertNull($admission->fresh()->room_id);
    }

    #[Test]
    public function put_residency_type_with_day_code_clears_room_and_boarding(): void
    {
        $organization = Organization::factory()->create();
        $school = SchoolBranding::factory()->create(['organization_id' => $organization->id]);
        $user = $this->createUserWithAdmissionUpdatePermission($organization, $school);

        $night = ResidencyType::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Night',
            'code' => 'night',
            'description' => 'Night',
            'is_active' => true,
        ]);

        $day = ResidencyType::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'name' => 'Day',
            'code' => 'day',
            'description' => 'Day',
            'is_active' => true,
        ]);

        $building = Building::create([
            'building_name' => 'Hostel B',
            'school_id' => $school->id,
        ]);

        $room = Room::create([
            'room_number' => '301',
            'building_id' => $building->id,
            'school_id' => $school->id,
        ]);

        $academicYear = $this->createAcademicYearForSchool($organization, $school);
        $class = $this->createClassForSchool($organization, $school);
        $cay = $this->createClassAcademicYearForSchool($organization, $school, $class, $academicYear);
        $student = $this->createStudentForSchool($organization, $school);

        $admission = StudentAdmission::create([
            'organization_id' => $organization->id,
            'school_id' => $school->id,
            'student_id' => $student->id,
            'academic_year_id' => $academicYear->id,
            'class_id' => $class->id,
            'class_academic_year_id' => $cay->id,
            'residency_type_id' => $night->id,
            'admission_year' => (string) now()->year,
            'admission_date' => now()->toDateString(),
            'enrollment_status' => 'admitted',
            'is_boarder' => true,
            'room_id' => $room->id,
        ]);

        $response = $this->jsonAs($user, 'PUT', "/api/student-admissions/{$admission->id}", [
            'residency_type_id' => $day->id,
        ]);

        $response->assertOk();
        $admission->refresh();
        $this->assertFalse($admission->is_boarder);
        $this->assertNull($admission->room_id);
        $this->assertSame($day->id, $admission->residency_type_id);
    }
}
